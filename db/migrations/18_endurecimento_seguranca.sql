-- Migração 18: endurecimento de segurança (auditoria + pentest de 2026-10-31)
--
-- 1. Grants mínimos para anon/authenticated (a RLS continua sendo a barreira principal;
--    isto é defesa em profundidade). Colunas internas de usuarios (auth_id, status, is_admin)
--    deixam de ser legíveis por select: o middleware usa a RPC is_admin().
-- 2. contato_vendedor: conta bloqueada não obtém telefones; limite anti-raspagem de
--    30 vendedores diferentes por 24h.
-- 3. handle_new_user: cadastro só com e-mail acadêmico (espelho de validarEmailUniversitario);
--    vincular linha legada pelo e-mail não herda admin nem verificação.
-- 4. Limites de tamanho/formato (textos, @ do Instagram/TikTok, CPF, telefone).
-- 5. URLs de imagem só do Storage do próprio projeto, na pasta da própria loja/produto.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.categorias, public.instituicoes FROM anon, authenticated;
GRANT SELECT ON public.categorias, public.instituicoes TO anon, authenticated;

REVOKE ALL ON public.usuarios FROM anon, authenticated;
GRANT SELECT (id, nome, sobrenome, instituicoes_id, matricula_status, matricula_validada, criado_em)
  ON public.usuarios TO anon, authenticated;
-- Só o que o app grava (solicitarVerificacaoMatricula, salvarOnboarding); o trigger
-- proteger_colunas_usuarios continua barrando auto-verificação.
GRANT UPDATE (matricula, matricula_status, matricula_validada, instituicoes_id)
  ON public.usuarios TO authenticated;

REVOKE ALL ON public.lojas FROM anon, authenticated;
GRANT SELECT (id, usuario_id, nome, descricao, status, criado_em, avatar_url, capa_url, slug,
              instagram_url, tiktok_url, locais_entrega)
  ON public.lojas TO anon, authenticated;
GRANT UPDATE (nome, descricao, contato, whatsapp, status, avatar_url, capa_url,
              instagram_url, tiktok_url, locais_entrega)
  ON public.lojas TO authenticated;

REVOKE ALL ON public.produtos FROM anon, authenticated;
GRANT SELECT ON public.produtos TO anon, authenticated;
GRANT INSERT (loja_id, nome, descricao, preco, categoria_id, aceita_troca, status, imagem_url)
  ON public.produtos TO authenticated;
GRANT UPDATE (nome, descricao, preco, categoria_id, aceita_troca, status, imagem_url, renovado_em)
  ON public.produtos TO authenticated;
GRANT DELETE ON public.produtos TO authenticated;

REVOKE ALL ON public.favoritos FROM anon, authenticated;
GRANT SELECT, DELETE ON public.favoritos TO authenticated;
GRANT INSERT (usuario_id, produto_id) ON public.favoritos TO authenticated;

REVOKE ALL ON public.denuncias, public.interesses FROM anon, authenticated;

-- O trigger roda como o usuário (SECURITY INVOKER) e não lê mais usuarios.status/auth_id
-- direto: usa meu_usuario() (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.exigir_vendedor_verificado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_validada BOOLEAN;
  v_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.renovado_em := now();
  ELSIF NEW.renovado_em IS DISTINCT FROM OLD.renovado_em
     OR (NEW.status = 'ativo' AND OLD.status IS DISTINCT FROM 'ativo') THEN
    NEW.renovado_em := now();
  END IF;

  IF NEW.status = 'vendido' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'vendido' THEN
      NEW.vendido_em := now();
    ELSE
      NEW.vendido_em := OLD.vendido_em;
    END IF;
  ELSE
    NEW.vendido_em := NULL;
  END IF;

  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.destaque := FALSE;
  ELSE
    NEW.destaque := OLD.destaque;
  END IF;

  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ativo') THEN
    SELECT u.matricula_validada, u.status INTO v_validada, v_status FROM public.meu_usuario() u;

    IF v_status IS DISTINCT FROM 'ativo' THEN
      RAISE EXCEPTION 'Sua conta está bloqueada. Fale com o suporte.' USING ERRCODE = '42501';
    END IF;
    IF NOT COALESCE(v_validada, FALSE) THEN
      RAISE EXCEPTION 'Valide sua matrícula para publicar anúncios' USING ERRCODE = '42501';
    END IF;
    IF NOT public.loja_tem_contato(NEW.loja_id) THEN
      RAISE EXCEPTION 'Cadastre seu WhatsApp no perfil antes de publicar' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) contato_vendedor: bloqueio + anti-raspagem
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS interesses_usuario_criado_em_idx
  ON public.interesses (usuario_id, criado_em);

-- Códigos PTxxx viram o status HTTP da resposta no PostgREST (BotaoContato mostra a mensagem).
CREATE OR REPLACE FUNCTION public.contato_vendedor(p_loja_id integer, p_produto_id integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_contato TEXT;
  v_dono INT;
  v_produto INT := p_produto_id;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para falar com o vendedor' USING ERRCODE = '42501';
  END IF;
  IF (SELECT status FROM public.usuarios WHERE id = v_usuario) IS DISTINCT FROM 'ativo' THEN
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
-- 3) Cadastro só com e-mail acadêmico (antes a regra existia só no cliente)
-- ---------------------------------------------------------------------------

-- Espelho de validarEmailUniversitario (src/lib/validacoes.ts): sufixos .edu/.edu.br, ".edu."
-- no domínio, unb.br/usp.br, ou domínio de instituição cadastrada (instituicoes.dominios).
CREATE OR REPLACE FUNCTION public.email_cadastro_permitido(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH d AS (SELECT split_part(lower(trim(COALESCE(p_email, ''))), '@', 2) AS dominio)
  SELECT dominio <> '' AND (
    dominio LIKE '%.edu.br' OR dominio LIKE '%.edu' OR dominio LIKE '%.edu.%'
    OR dominio IN ('unb.br', 'usp.br') OR dominio LIKE '%.unb.br' OR dominio LIKE '%.usp.br'
    OR public.instituicao_por_email(p_email) IS NOT NULL
  )
  FROM d;
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
BEGIN
  IF NOT public.email_cadastro_permitido(NEW.email) THEN
    RAISE EXCEPTION 'Cadastro permitido apenas com e-mail institucional' USING ERRCODE = '23514';
  END IF;

  -- Linha legada com o mesmo e-mail: vincula, mas sem herdar admin nem verificação
  -- (o vínculo acontece antes da confirmação do e-mail).
  UPDATE public.usuarios
  SET auth_id = NEW.id,
      termos_aceitos_em = COALESCE(v_termos, termos_aceitos_em),
      is_admin = FALSE,
      matricula_validada = FALSE,
      matricula_status = 'pendente'
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email);
  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (auth_id, email, nome, sobrenome, status, matricula_status, termos_aceitos_em)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
          NEW.raw_user_meta_data->>'sobrenome', 'ativo', 'pendente', v_termos)
  RETURNING id INTO new_user_id;

  new_store_name := left(trim(COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante') || ' ' ||
                              COALESCE(NEW.raw_user_meta_data->>'sobrenome', '')), 80);

  INSERT INTO public.lojas (usuario_id, nome, descricao, status, slug)
  VALUES (new_user_id, new_store_name, 'Aluno na Circular.', 'ativo', 'aluno-' || new_user_id);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Limites de tamanho e formato (espelho: LIMITES_TEXTO em src/lib/validacoes.ts)
-- ---------------------------------------------------------------------------

ALTER TABLE public.lojas
  ADD CONSTRAINT lojas_nome_tamanho CHECK (char_length(nome) <= 80),
  ADD CONSTRAINT lojas_descricao_tamanho CHECK (descricao IS NULL OR char_length(descricao) <= 1000),
  ADD CONSTRAINT lojas_whatsapp_tamanho CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 20),
  ADD CONSTRAINT lojas_locais_entrega_tamanho CHECK (
    locais_entrega IS NULL
    OR (cardinality(locais_entrega) <= 10 AND char_length(array_to_string(locais_entrega, '')) <= 500)
  ),
  -- Só o @ (sem domínio): o perfil monta o link https://instagram.com/<handle>
  ADD CONSTRAINT lojas_instagram_formato CHECK (
    instagram_url IS NULL OR instagram_url = '' OR instagram_url ~ '^@?[A-Za-z0-9._]{1,30}$'
  ),
  ADD CONSTRAINT lojas_tiktok_formato CHECK (
    tiktok_url IS NULL OR tiktok_url = '' OR tiktok_url ~ '^@?[A-Za-z0-9._]{2,24}$'
  ),
  ADD CONSTRAINT lojas_urls_imagem_tamanho CHECK (
    char_length(COALESCE(avatar_url, '')) <= 500 AND char_length(COALESCE(capa_url, '')) <= 500
  );

ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_nome_tamanho CHECK (char_length(nome) <= 120),
  ADD CONSTRAINT produtos_descricao_tamanho CHECK (descricao IS NULL OR char_length(descricao) <= 2000),
  ADD CONSTRAINT produtos_imagem_url_tamanho CHECK (imagem_url IS NULL OR char_length(imagem_url) <= 500);

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_matricula_tamanho CHECK (matricula IS NULL OR char_length(matricula) <= 40),
  ADD CONSTRAINT usuarios_cpf_formato CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  ADD CONSTRAINT usuarios_telefone_formato CHECK (telefone IS NULL OR telefone ~ '^[0-9()+ .-]{8,20}$');

-- ---------------------------------------------------------------------------
-- 5) URLs de imagem: só o Storage do próprio projeto, na pasta da própria loja/produto
-- ---------------------------------------------------------------------------

-- O host vem do "iss" do JWT da sessão (https://<projeto>.supabase.co/auth/v1), que é a mesma
-- URL usada pelo cliente para o Storage. Impede pixel de rastreamento e imagens fora da moderação.
CREATE OR REPLACE FUNCTION public.url_imagem_valida(p_url text, p_bucket text, p_pasta text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_host TEXT := substring(auth.jwt() ->> 'iss' FROM '^https://([a-z0-9.-]+)/');
  v_host_re TEXT;
BEGIN
  IF p_url IS NULL OR p_url = '' THEN
    RETURN TRUE;
  END IF;
  v_host_re := COALESCE(replace(v_host, '.', '\.'), '[a-z0-9]+\.supabase\.co');
  RETURN p_url ~ ('^https://' || v_host_re || '/storage/v1/object/public/' || p_bucket || '/'
                  || p_pasta || '/[A-Za-z0-9._-]+(\?v=[0-9]+)?$');
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_imagens_loja()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NOT public.url_imagem_valida(NEW.avatar_url, 'lojas', NEW.id::text))
     OR (NEW.capa_url IS DISTINCT FROM OLD.capa_url AND NOT public.url_imagem_valida(NEW.capa_url, 'lojas', NEW.id::text)) THEN
    RAISE EXCEPTION 'Imagem inválida: envie o arquivo pelo upload do site' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_imagem_produto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.imagem_url IS DISTINCT FROM OLD.imagem_url)
     AND NOT public.url_imagem_valida(NEW.imagem_url, 'produtos', NEW.id::text) THEN
    RAISE EXCEPTION 'Imagem inválida: envie o arquivo pelo upload do site' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_imagens_loja ON public.lojas;
CREATE TRIGGER validar_imagens_loja
  BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.validar_imagens_loja();

DROP TRIGGER IF EXISTS validar_imagem_produto ON public.produtos;
CREATE TRIGGER validar_imagem_produto
  BEFORE INSERT OR UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.validar_imagem_produto();

COMMIT;
