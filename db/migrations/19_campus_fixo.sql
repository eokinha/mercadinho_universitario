-- Migração 19: cada aluno fica no campus do próprio e-mail
--
-- 1. Cadastro só com domínio de instituição cadastrada (instituicoes.dominios); o campus nasce
--    do domínio no signup e o aluno não altera instituicoes_id.
-- 2. Catálogo só para logados e só do próprio campus (RLS). Visitante (anon) não lê
--    produtos, lojas nem usuarios.
-- 3. Perfil de outro campus abre em modo leitura pela RPC perfil_leitura (um perfil por vez,
--    sem listagem). Contato e favoritos exigem o mesmo campus; denúncia continua livre.
-- 4. Trocar o e-mail troca o campus: o pedido só é aceito para domínio cadastrado e, na
--    confirmação, o campus é recalculado e os anúncios ativos são pausados.
-- 5. Backfill: campus recalculado pelo domínio (quem tem domínio desconhecido mantém o atual).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Cadastro e campus pelo domínio
-- ---------------------------------------------------------------------------

-- Espelho: validarEmailUniversitario/instituicaoDoEmail (src/lib/validacoes.ts)
CREATE OR REPLACE FUNCTION public.email_cadastro_permitido(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.instituicao_por_email(p_email) IS NOT NULL;
$$;
REVOKE EXECUTE ON FUNCTION public.email_cadastro_permitido(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id INT;
  new_store_name TEXT;
  v_termos TIMESTAMPTZ := CASE WHEN NEW.raw_user_meta_data->>'termos_aceitos' = 'true' THEN now() END;
  v_campus INT := public.instituicao_por_email(NEW.email);
BEGIN
  IF v_campus IS NULL THEN
    RAISE EXCEPTION 'Cadastro permitido apenas com e-mail de faculdade participante' USING ERRCODE = '23514';
  END IF;

  -- Linha legada com o mesmo e-mail: vincula, mas sem herdar admin nem verificação
  UPDATE public.usuarios
  SET auth_id = NEW.id,
      termos_aceitos_em = COALESCE(v_termos, termos_aceitos_em),
      is_admin = FALSE,
      matricula_validada = FALSE,
      matricula_status = 'pendente',
      instituicoes_id = v_campus
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email);
  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (auth_id, email, nome, sobrenome, status, matricula_status, termos_aceitos_em, instituicoes_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
          NEW.raw_user_meta_data->>'sobrenome', 'ativo', 'pendente', v_termos, v_campus)
  RETURNING id INTO new_user_id;

  new_store_name := left(trim(COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante') || ' ' ||
                              COALESCE(NEW.raw_user_meta_data->>'sobrenome', '')), 80);

  INSERT INTO public.lojas (usuario_id, nome, descricao, status, slug)
  VALUES (new_user_id, new_store_name, 'Aluno na Circular.', 'ativo', 'aluno-' || new_user_id);

  RETURN NEW;
END;
$$;

-- O aluno não escolhe campus: sai o privilégio de coluna e o trigger preserva o valor
REVOKE UPDATE (instituicoes_id) ON public.usuarios FROM authenticated;

CREATE OR REPLACE FUNCTION public.proteger_colunas_usuarios()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := FALSE;
    NEW.matricula_validada := FALSE;
    NEW.matricula_status := 'pendente';
    NEW.status := 'ativo';
    NEW.termos_aceitos_em := NULL;
    NEW.auth_id := auth.uid();
    NEW.email := COALESCE(auth.jwt() ->> 'email', NEW.email);
    NEW.instituicoes_id := public.instituicao_por_email(NEW.email);
    RETURN NEW;
  END IF;

  NEW.is_admin := OLD.is_admin;
  NEW.auth_id := OLD.auth_id;
  NEW.email := OLD.email;
  NEW.status := OLD.status;
  NEW.termos_aceitos_em := OLD.termos_aceitos_em;
  NEW.criado_em := OLD.criado_em;
  NEW.instituicoes_id := OLD.instituicoes_id;
  NEW.matricula_validada := OLD.matricula_validada AND NEW.matricula_validada;
  IF NEW.matricula_status IS DISTINCT FROM OLD.matricula_status
     AND NEW.matricula_status <> 'pendente' THEN
    NEW.matricula_status := OLD.matricula_status;
  END IF;

  IF NEW.matricula_validada THEN
    NEW.matricula := OLD.matricula;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Helpers de campus (SECURITY DEFINER: evitam recursão usuarios <-> lojas nas políticas)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.meu_campus_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT instituicoes_id FROM public.usuarios WHERE auth_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.campus_do_usuario(p_usuario_id integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT instituicoes_id FROM public.usuarios WHERE id = p_usuario_id;
$$;

CREATE OR REPLACE FUNCTION public.campus_da_loja(p_loja_id integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.instituicoes_id
  FROM public.lojas l JOIN public.usuarios u ON u.id = l.usuario_id
  WHERE l.id = p_loja_id;
$$;

CREATE OR REPLACE FUNCTION public.campus_do_produto(p_produto_id integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.campus_da_loja(loja_id) FROM public.produtos WHERE id = p_produto_id;
$$;

REVOKE EXECUTE ON FUNCTION public.meu_campus_id(), public.campus_do_usuario(integer),
  public.campus_da_loja(integer), public.campus_do_produto(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_campus_id(), public.campus_do_usuario(integer),
  public.campus_da_loja(integer), public.campus_do_produto(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Catálogo: só logados, só o próprio campus
-- ---------------------------------------------------------------------------

REVOKE SELECT ON public.produtos, public.lojas, public.usuarios FROM anon;

DROP POLICY IF EXISTS lojas_select_ativas ON public.lojas;
DROP POLICY IF EXISTS lojas_select_campus ON public.lojas;
CREATE POLICY lojas_select_campus ON public.lojas FOR SELECT TO authenticated
  USING (status = 'ativo' AND public.campus_do_usuario(usuario_id) = (SELECT public.meu_campus_id()));

DROP POLICY IF EXISTS produtos_select_de_lojas_ativas ON public.produtos;
DROP POLICY IF EXISTS produtos_select_campus ON public.produtos;
CREATE POLICY produtos_select_campus ON public.produtos FOR SELECT TO authenticated
  USING (
    status = 'ativo'
    AND renovado_em > now() - interval '60 days'
    AND EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = produtos.loja_id AND l.status = 'ativo')
    AND public.campus_da_loja(loja_id) = (SELECT public.meu_campus_id())
  );

DROP POLICY IF EXISTS usuarios_read_publico ON public.usuarios;
CREATE POLICY usuarios_read_publico ON public.usuarios FOR SELECT TO authenticated
  USING (public.usuario_publico(id) AND instituicoes_id = (SELECT public.meu_campus_id()));

-- Favoritar só anúncio do próprio campus (remover continua livre)
DROP POLICY IF EXISTS favoritos_owner_manage ON public.favoritos;
CREATE POLICY favoritos_owner_manage ON public.favoritos FOR ALL TO authenticated
  USING (usuario_id = (SELECT public.meu_usuario_id()))
  WITH CHECK (
    usuario_id = (SELECT public.meu_usuario_id())
    AND public.campus_do_produto(produto_id) = (SELECT public.meu_campus_id())
  );

-- ---------------------------------------------------------------------------
-- 4) Contato só com vendedor do mesmo campus
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.contato_vendedor(p_loja_id integer, p_produto_id integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_status TEXT;
  v_campus INT;
  v_contato TEXT;
  v_dono INT;
  v_produto INT := p_produto_id;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para falar com o vendedor' USING ERRCODE = '42501';
  END IF;
  SELECT status, instituicoes_id INTO v_status, v_campus FROM public.usuarios WHERE id = v_usuario;
  IF v_status IS DISTINCT FROM 'ativo' THEN
    RAISE EXCEPTION 'Sua conta está bloqueada. Fale com o suporte.' USING ERRCODE = 'PT403';
  END IF;

  SELECT contato, usuario_id INTO v_contato, v_dono
  FROM public.lojas WHERE id = p_loja_id AND status = 'ativo';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_dono = v_usuario THEN
    RETURN NULLIF(v_contato, '');
  END IF;

  IF v_campus IS NULL OR public.campus_do_usuario(v_dono) IS DISTINCT FROM v_campus THEN
    RAISE EXCEPTION 'Este aluno é de outro campus. O contato é só entre alunos da mesma faculdade.' USING ERRCODE = 'PT403';
  END IF;

  -- Anti-raspagem: até 30 vendedores diferentes por 24h (voltar a um vendedor já contatado não conta)
  IF NOT EXISTS (
       SELECT 1 FROM public.interesses
       WHERE usuario_id = v_usuario AND loja_id = p_loja_id AND criado_em > now() - interval '1 day'
     )
     AND (
       SELECT count(DISTINCT loja_id) FROM public.interesses
       WHERE usuario_id = v_usuario AND criado_em > now() - interval '1 day'
     ) >= 30 THEN
    RAISE EXCEPTION 'Você abriu contato com muitos vendedores hoje. Tente de novo amanhã.' USING ERRCODE = 'PT429';
  END IF;

  IF v_produto IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.produtos WHERE id = v_produto AND loja_id = p_loja_id
  ) THEN
    v_produto := NULL;
  END IF;

  INSERT INTO public.interesses (loja_id, produto_id, usuario_id) VALUES (p_loja_id, v_produto, v_usuario);
  RETURN NULLIF(v_contato, '');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Perfil em modo leitura (qualquer campus, um perfil por vez)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.perfil_leitura(p_id_ou_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meu_campus INT;
  v_loja public.lojas%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_instituicao TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver perfis' USING ERRCODE = '42501';
  END IF;
  v_meu_campus := public.meu_campus_id();

  IF p_id_ou_slug ~ '^[0-9]{1,9}$' THEN
    SELECT * INTO v_loja FROM public.lojas WHERE id = p_id_ou_slug::int AND status = 'ativo';
  ELSE
    SELECT * INTO v_loja FROM public.lojas WHERE slug = p_id_ou_slug AND status = 'ativo';
  END IF;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_usuario FROM public.usuarios WHERE id = v_loja.usuario_id;
  SELECT nome INTO v_instituicao FROM public.instituicoes WHERE id = v_usuario.instituicoes_id;

  RETURN jsonb_build_object(
    'mesmo_campus', COALESCE(v_usuario.instituicoes_id = v_meu_campus, FALSE),
    'perfil', jsonb_build_object(
      'id', v_loja.id,
      'usuario_id', v_loja.usuario_id,
      'nome', v_loja.nome,
      'descricao', COALESCE(v_loja.descricao, ''),
      'status', v_loja.status,
      'criado_em', v_loja.criado_em,
      'avatar_url', v_loja.avatar_url,
      'capa_url', v_loja.capa_url,
      'slug', v_loja.slug,
      'instagram_url', v_loja.instagram_url,
      'tiktok_url', v_loja.tiktok_url,
      'locais_entrega', COALESCE(to_jsonb(v_loja.locais_entrega), '[]'::jsonb),
      'usuario_nome', v_usuario.nome,
      'usuario_sobrenome', v_usuario.sobrenome,
      'usuario_criado_em', v_usuario.criado_em,
      'matricula_status', v_usuario.matricula_status,
      'instituicao_nome', v_instituicao
    ),
    'produtos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'loja_id', p.loja_id,
        'nome', p.nome,
        'descricao', p.descricao,
        'preco', p.preco,
        'imagem_url', p.imagem_url,
        'categoria_id', p.categoria_id,
        'categoria_nome', c.nome,
        'loja_nome', v_loja.nome,
        'loja_descricao', v_loja.descricao,
        'loja_avatar_url', v_loja.avatar_url,
        'destaque', p.destaque,
        'aceita_troca', p.aceita_troca,
        'loja_verificada', v_usuario.matricula_status = 'verificado'
      ) ORDER BY p.criado_em DESC)
      FROM public.produtos p
      JOIN public.categorias c ON c.id = p.categoria_id
      WHERE p.loja_id = v_loja.id
        AND p.status = 'ativo'
        AND p.renovado_em > now() - interval '60 days'
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.perfil_leitura(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfil_leitura(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Trocar o e-mail troca o campus
-- ---------------------------------------------------------------------------

-- Pedido de troca (auth.updateUser({ email })): só para domínio de faculdade participante
CREATE OR REPLACE FUNCTION public.validar_troca_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.email_change, '') <> ''
     AND NEW.email_change IS DISTINCT FROM OLD.email_change
     AND NOT public.email_cadastro_permitido(NEW.email_change) THEN
    RAISE EXCEPTION 'Use o e-mail de uma faculdade participante do Circular' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validar_troca_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_email_change_requested ON auth.users;
CREATE TRIGGER on_auth_email_change_requested
  BEFORE UPDATE OF email_change ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validar_troca_email();

-- E-mail confirmado: sincroniza usuarios.email e o campus; mudou de campus, pausa os anúncios
-- (o aluno revisa preço e locais de encontro antes de reativar no novo campus).
-- O novo e-mail foi confirmado e é de domínio cadastrado, então a verificação continua valendo;
-- sem domínio conhecido (só por ação manual no Auth), perde a verificação.
CREATE OR REPLACE FUNCTION public.sincronizar_email_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campus INT := public.instituicao_por_email(NEW.email);
  v_usuario INT;
  v_campus_antigo INT;
BEGIN
  SELECT id, instituicoes_id INTO v_usuario, v_campus_antigo FROM public.usuarios WHERE auth_id = NEW.id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.usuarios
  SET email = NEW.email,
      instituicoes_id = v_campus,
      matricula_validada = CASE WHEN v_campus IS NULL THEN FALSE ELSE matricula_validada END,
      matricula_status = CASE WHEN v_campus IS NULL THEN 'pendente' ELSE matricula_status END
  WHERE id = v_usuario;

  IF v_campus IS DISTINCT FROM v_campus_antigo THEN
    UPDATE public.produtos SET status = 'pausado'
    WHERE status = 'ativo'
      AND loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = v_usuario);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sincronizar_email_usuario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_email_changed ON auth.users;
CREATE TRIGGER on_auth_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sincronizar_email_usuario();

-- ---------------------------------------------------------------------------
-- 7) Backfill: campus pelo domínio do e-mail
-- ---------------------------------------------------------------------------

-- Domínio desconhecido (contas antigas, testers *@example.com): mantém o campus atual
UPDATE public.usuarios u
SET instituicoes_id = public.instituicao_por_email(u.email)
WHERE public.instituicao_por_email(u.email) IS NOT NULL
  AND u.instituicoes_id IS DISTINCT FROM public.instituicao_por_email(u.email);

COMMIT;
