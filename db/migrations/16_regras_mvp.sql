-- Migração: regras de negócio para o MVP (ver docs/auditoria-mvp.md)
-- slug único, loja sem insert/delete pelo dono, campus pelo domínio do e-mail, limites do Storage,
-- preço, WhatsApp obrigatório, pausa ao perder verificação, contato só logado, bloqueio de usuário,
-- vendido/expiração, denúncias, interesses, termos e exclusão de conta.

-- 1. Slug imutável pelo dono (a unicidade já vem do índice idx_lojas_slug_unique) ----
ALTER TABLE public.lojas ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.lojas ADD CONSTRAINT lojas_slug_formato CHECK (
  slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND slug !~ '^[0-9]+$' AND length(slug) BETWEEN 3 AND 60
);
ALTER TABLE public.lojas ADD CONSTRAINT lojas_contato_digitos CHECK (
  contato IS NULL OR contato ~ '^[0-9]{0,15}$'
);

CREATE OR REPLACE FUNCTION public.proteger_status_loja()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'A loja é criada automaticamente no cadastro' USING ERRCODE = '42501';
  END IF;

  NEW.slug := OLD.slug;
  NEW.usuario_id := OLD.usuario_id;
  NEW.criado_em := OLD.criado_em;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    OLD.status IN ('ativo', 'pausado') AND NEW.status IN ('ativo', 'pausado')
  ) THEN
    RAISE EXCEPTION 'Alteração de status da loja não permitida' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(length(NEW.contato), 0) < 12 AND COALESCE(length(OLD.contato), 0) >= 12
     AND EXISTS (SELECT 1 FROM public.produtos WHERE loja_id = NEW.id AND status = 'ativo') THEN
    RAISE EXCEPTION 'Pause seus anúncios ativos antes de remover o WhatsApp' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Dono só lê e edita a própria loja -----------------------------------
DROP POLICY IF EXISTS lojas_owner_manage ON public.lojas;
CREATE POLICY lojas_owner_select ON public.lojas FOR SELECT TO authenticated
  USING (usuario_id = (SELECT public.meu_usuario_id()));
CREATE POLICY lojas_owner_update ON public.lojas FOR UPDATE TO authenticated
  USING (usuario_id = (SELECT public.meu_usuario_id()))
  WITH CHECK (usuario_id = (SELECT public.meu_usuario_id()));
REVOKE INSERT, DELETE ON public.lojas FROM anon, authenticated;

-- Loja completa (com telefone) do usuário logado
CREATE OR REPLACE FUNCTION public.minha_loja()
RETURNS SETOF public.lojas
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.lojas WHERE usuario_id = public.meu_usuario_id();
$$;

-- 3. Instituição definida pelo domínio do e-mail --------------------------
ALTER TABLE public.instituicoes ADD COLUMN IF NOT EXISTS dominios text[] NOT NULL DEFAULT '{}';
UPDATE public.instituicoes SET dominios = '{ufmg.br}'
  WHERE nome = 'Universidade Federal de Minas Gerais' AND dominios = '{}';
UPDATE public.instituicoes SET dominios = '{pucminas.br}'
  WHERE nome = 'Pontifícia Universidade Católica de Minas Gerais' AND dominios = '{}';

-- Domínio exato ou subdomínio (aluno.ufmg.br → ufmg.br); o mais específico vence
CREATE OR REPLACE FUNCTION public.instituicao_por_email(p_email text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH d AS (SELECT split_part(lower(trim(p_email)), '@', 2) AS dominio)
  SELECT i.id
  FROM public.instituicoes i
  CROSS JOIN d
  CROSS JOIN LATERAL unnest(i.dominios) AS dom
  WHERE d.dominio <> ''
    AND (d.dominio = lower(dom) OR right(d.dominio, length(dom) + 1) = '.' || lower(dom))
  ORDER BY length(dom) DESC
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.verificar_matricula_por_email(text, integer);
DROP FUNCTION IF EXISTS public.email_academico(text);

CREATE FUNCTION public.verificar_matricula_por_email(p_matricula text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_instituicao INT;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;

  v_instituicao := public.instituicao_por_email(v_email);
  IF v_email IS NULL OR v_instituicao IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.usuarios
  SET matricula_status = 'verificado',
      matricula_validada = TRUE,
      matricula = COALESCE(NULLIF(trim(p_matricula), ''), matricula),
      instituicoes_id = v_instituicao
  WHERE auth_id = auth.uid() AND status = 'ativo';

  RETURN FOUND;
END;
$$;

-- 11. Status do usuário (ativo | bloqueado) e aceite dos termos -----------
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_status_check CHECK (status IN ('ativo', 'bloqueado'));
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz;

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
    RETURN NEW;
  END IF;

  NEW.is_admin := OLD.is_admin;
  NEW.auth_id := OLD.auth_id;
  NEW.email := OLD.email;
  NEW.status := OLD.status;
  NEW.termos_aceitos_em := OLD.termos_aceitos_em;
  NEW.criado_em := OLD.criado_em;
  NEW.matricula_validada := OLD.matricula_validada AND NEW.matricula_validada;
  IF NEW.matricula_status IS DISTINCT FROM OLD.matricula_status
     AND NEW.matricula_status <> 'pendente' THEN
    NEW.matricula_status := OLD.matricula_status;
  END IF;

  -- Verificado não troca de campus nem de matrícula; para mudar, pede nova verificação
  IF NEW.matricula_validada THEN
    NEW.instituicoes_id := OLD.instituicoes_id;
    NEW.matricula := OLD.matricula;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Perder a verificação pausa os anúncios -------------------------------
CREATE OR REPLACE FUNCTION public.pausar_anuncios_sem_verificacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.matricula_validada AND NOT NEW.matricula_validada THEN
    UPDATE public.produtos SET status = 'pausado'
    WHERE status = 'ativo'
      AND loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pausar_anuncios_sem_verificacao ON public.usuarios;
CREATE TRIGGER pausar_anuncios_sem_verificacao
  AFTER UPDATE OF matricula_validada ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.pausar_anuncios_sem_verificacao();

CREATE OR REPLACE FUNCTION public.admin_definir_status_usuario(p_usuario_id integer, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('ativo', 'bloqueado') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;
  IF p_usuario_id = public.meu_usuario_id() THEN
    RAISE EXCEPTION 'Você não pode bloquear a própria conta';
  END IF;

  UPDATE public.usuarios SET status = p_status WHERE id = p_usuario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário % não encontrado', p_usuario_id;
  END IF;

  IF p_status = 'bloqueado' THEN
    UPDATE public.lojas SET status = 'reprovado' WHERE usuario_id = p_usuario_id;
    UPDATE public.produtos SET status = 'pausado'
    WHERE status = 'ativo'
      AND loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = p_usuario_id);
  ELSE
    -- O aluno reativa a loja e os anúncios por conta própria
    UPDATE public.lojas SET status = 'pausado' WHERE usuario_id = p_usuario_id AND status = 'reprovado';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_listar_usuarios();
CREATE FUNCTION public.admin_listar_usuarios()
RETURNS TABLE(id integer, nome character varying, sobrenome character varying, email character varying,
              telefone character varying, matricula character varying, matricula_status character varying,
              matricula_validada boolean, instituicoes_id integer, instituicao_nome character varying,
              loja_id integer, status character varying)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.nome, u.sobrenome, u.email, u.telefone, u.matricula,
         u.matricula_status, u.matricula_validada, u.instituicoes_id,
         i.nome, (SELECT l.id FROM public.lojas l WHERE l.usuario_id = u.id ORDER BY l.id LIMIT 1),
         u.status
  FROM public.usuarios u
  LEFT JOIN public.instituicoes i ON i.id = u.instituicoes_id
  ORDER BY u.id DESC;
END;
$$;

-- 4. Storage: só imagens de até 3 MB --------------------------------------
UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('lojas', 'produtos');

-- 5. Preço e status vendido / expiração -----------------------------------
ALTER TABLE public.produtos ADD CONSTRAINT produtos_preco_valido CHECK (
  preco >= 0 AND (preco > 0 OR aceita_troca)
);
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_status_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_status_check CHECK (status IN ('ativo', 'pausado', 'vendido'));
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS renovado_em timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS vendido_em timestamptz;

-- Trigger roda como o usuário; o telefone não é legível por ele, então a checagem fica num helper
CREATE OR REPLACE FUNCTION public.loja_tem_contato(p_loja_id integer)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT length(contato) >= 12 FROM public.lojas WHERE id = p_loja_id), FALSE);
$$;

-- 6. Publicar exige verificado, conta ativa e WhatsApp --------------------
CREATE OR REPLACE FUNCTION public.exigir_vendedor_verificado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_validada BOOLEAN;
  v_status TEXT;
BEGIN
  -- Datas controladas pelo banco
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
    SELECT matricula_validada, status INTO v_validada, v_status
    FROM public.usuarios WHERE auth_id = auth.uid();

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

-- Catálogo: produto ativo, loja ativa e renovado nos últimos 60 dias
-- (espelho: DIAS_VALIDADE_ANUNCIO em src/lib/queries.ts)
DROP POLICY IF EXISTS produtos_select_de_lojas_ativas ON public.produtos;
CREATE POLICY produtos_select_de_lojas_ativas ON public.produtos FOR SELECT
  USING (
    status = 'ativo'
    AND renovado_em > now() - interval '60 days'
    AND EXISTS (SELECT 1 FROM public.lojas l WHERE l.id = produtos.loja_id AND l.status = 'ativo')
  );

-- 8. Telefone fora da leitura pública; contato via RPC com registro -------
REVOKE SELECT ON public.lojas FROM anon, authenticated;
GRANT SELECT (id, usuario_id, nome, descricao, status, criado_em, avatar_url, capa_url, slug,
              instagram_url, tiktok_url, locais_entrega)
  ON public.lojas TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.interesses (
  id bigserial PRIMARY KEY,
  loja_id integer NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  produto_id integer REFERENCES public.produtos(id) ON DELETE SET NULL,
  usuario_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interesses_loja_id_idx ON public.interesses (loja_id);
ALTER TABLE public.interesses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interesses FROM anon, authenticated;

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

  SELECT contato, usuario_id INTO v_contato, v_dono
  FROM public.lojas WHERE id = p_loja_id AND status = 'ativo';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_produto IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.produtos WHERE id = v_produto AND loja_id = p_loja_id
  ) THEN
    v_produto := NULL;
  END IF;

  IF v_dono <> v_usuario THEN
    INSERT INTO public.interesses (loja_id, produto_id, usuario_id) VALUES (p_loja_id, v_produto, v_usuario);
  END IF;

  RETURN NULLIF(v_contato, '');
END;
$$;

-- 9. Usuário só é público se tiver anúncio no catálogo --------------------
CREATE OR REPLACE FUNCTION public.usuario_publico(p_usuario_id integer)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lojas l
    JOIN public.produtos p ON p.loja_id = l.id
    WHERE l.usuario_id = p_usuario_id AND l.status = 'ativo' AND p.status = 'ativo'
  );
$$;

DROP POLICY IF EXISTS usuarios_read_if_dono_loja_ativa ON public.usuarios;
CREATE POLICY usuarios_read_publico ON public.usuarios FOR SELECT
  USING (public.usuario_publico(id));
DROP FUNCTION IF EXISTS public.usuario_tem_loja_ativa(integer);

REVOKE SELECT ON public.usuarios FROM anon;
GRANT SELECT (id, nome, sobrenome, instituicoes_id, matricula_status, matricula_validada, criado_em)
  ON public.usuarios TO anon;

-- Denúncias ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.denuncias (
  id bigserial PRIMARY KEY,
  denunciante_id integer REFERENCES public.usuarios(id) ON DELETE SET NULL,
  loja_id integer REFERENCES public.lojas(id) ON DELETE SET NULL,
  produto_id integer REFERENCES public.produtos(id) ON DELETE SET NULL,
  alvo_descricao text NOT NULL,
  motivo text NOT NULL CHECK (motivo IN ('proibido', 'golpe', 'ofensivo', 'falso', 'outro')),
  detalhes text CHECK (length(detalhes) <= 1000),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'resolvida', 'descartada')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS denuncias_status_idx ON public.denuncias (status);
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.denuncias FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.denunciar(p_loja_id integer, p_produto_id integer, p_motivo text, p_detalhes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_loja TEXT;
  v_produto TEXT;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para denunciar' USING ERRCODE = '42501';
  END IF;
  IF p_motivo NOT IN ('proibido', 'golpe', 'ofensivo', 'falso', 'outro') THEN
    RAISE EXCEPTION 'Motivo inválido';
  END IF;
  IF (SELECT count(*) FROM public.denuncias
      WHERE denunciante_id = v_usuario AND criado_em > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Você atingiu o limite de denúncias de hoje. Tente amanhã.';
  END IF;

  SELECT nome INTO v_loja FROM public.lojas WHERE id = p_loja_id;
  IF v_loja IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;
  IF p_produto_id IS NOT NULL THEN
    SELECT nome INTO v_produto FROM public.produtos WHERE id = p_produto_id AND loja_id = p_loja_id;
  END IF;

  INSERT INTO public.denuncias (denunciante_id, loja_id, produto_id, alvo_descricao, motivo, detalhes)
  VALUES (
    v_usuario, p_loja_id, CASE WHEN v_produto IS NULL THEN NULL ELSE p_produto_id END,
    CASE WHEN v_produto IS NULL THEN 'Perfil: ' || v_loja ELSE 'Anúncio: ' || v_produto || ' (' || v_loja || ')' END,
    p_motivo, NULLIF(left(trim(COALESCE(p_detalhes, '')), 1000), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_denuncias()
RETURNS TABLE(id bigint, motivo text, detalhes text, status text, criado_em timestamptz, alvo_descricao text,
              loja_id integer, produto_id integer, denunciante_nome text, denunciante_email character varying)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.id, d.motivo, d.detalhes, d.status, d.criado_em, d.alvo_descricao, d.loja_id, d.produto_id,
         trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email
  FROM public.denuncias d
  LEFT JOIN public.usuarios u ON u.id = d.denunciante_id
  ORDER BY (d.status = 'aberta') DESC, d.criado_em DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolver_denuncia(p_denuncia_id bigint, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('aberta', 'resolvida', 'descartada') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.denuncias SET status = p_status WHERE id = p_denuncia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Denúncia % não encontrada', p_denuncia_id;
  END IF;
END;
$$;

-- Métricas na moderação de lojas ------------------------------------------
DROP FUNCTION IF EXISTS public.admin_listar_lojas();
CREATE FUNCTION public.admin_listar_lojas()
RETURNS TABLE(id integer, nome character varying, slug character varying, status character varying,
              criado_em timestamp with time zone, avatar_url character varying, usuario_id integer,
              dono_nome text, dono_email character varying, matricula_validada boolean,
              total_produtos bigint, produtos_ativos bigint, produtos_vendidos bigint, total_interesses bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.nome, l.slug, l.status, l.criado_em, l.avatar_url,
         u.id, trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email, u.matricula_validada,
         (SELECT count(*) FROM public.produtos p WHERE p.loja_id = l.id),
         (SELECT count(*) FROM public.produtos p WHERE p.loja_id = l.id AND p.status = 'ativo'),
         (SELECT count(*) FROM public.produtos p WHERE p.loja_id = l.id AND p.status = 'vendido'),
         (SELECT count(*) FROM public.interesses i WHERE i.loja_id = l.id)
  FROM public.lojas l
  JOIN public.usuarios u ON u.id = l.usuario_id
  ORDER BY l.id DESC;
END;
$$;

-- Termos aceitos no cadastro ----------------------------------------------
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
  UPDATE public.usuarios SET auth_id = NEW.id, termos_aceitos_em = COALESCE(v_termos, termos_aceitos_em)
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email);
  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (auth_id, email, nome, sobrenome, status, matricula_status, termos_aceitos_em)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
          NEW.raw_user_meta_data->>'sobrenome', 'ativo', 'pendente', v_termos)
  RETURNING id INTO new_user_id;

  new_store_name := trim(COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante') || ' ' ||
                         COALESCE(NEW.raw_user_meta_data->>'sobrenome', ''));

  INSERT INTO public.lojas (usuario_id, nome, descricao, status, slug)
  VALUES (new_user_id, new_store_name, 'Aluno na Circular.', 'ativo', 'aluno-' || new_user_id);

  RETURN NEW;
END;
$$;

-- Exclusão da própria conta (imagens são removidas pelo cliente antes) ----
CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_auth UUID := auth.uid();
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para excluir a conta' USING ERRCODE = '42501';
  END IF;
  IF (SELECT is_admin FROM public.usuarios WHERE id = v_usuario) THEN
    RAISE EXCEPTION 'Contas de administrador não podem ser excluídas por aqui';
  END IF;

  DELETE FROM public.produtos WHERE loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = v_usuario);
  DELETE FROM public.lojas WHERE usuario_id = v_usuario;
  DELETE FROM public.usuarios WHERE id = v_usuario;
  DELETE FROM auth.users WHERE id = v_auth;
END;
$$;

-- P3. Políticas que usam helpers só para logados; anon sem EXECUTE --------
DROP POLICY IF EXISTS lojas_admin_manage ON public.lojas;
CREATE POLICY lojas_admin_manage ON public.lojas FOR ALL TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS produtos_admin_manage ON public.produtos;
CREATE POLICY produtos_admin_manage ON public.produtos FOR ALL TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS produtos_owner_manage ON public.produtos;
CREATE POLICY produtos_owner_manage ON public.produtos FOR ALL TO authenticated
  USING (loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = (SELECT public.meu_usuario_id())));

DROP POLICY IF EXISTS favoritos_owner_manage ON public.favoritos;
CREATE POLICY favoritos_owner_manage ON public.favoritos FOR ALL TO authenticated
  USING (usuario_id = (SELECT public.meu_usuario_id()));

DROP POLICY IF EXISTS user_update_own ON public.usuarios;
CREATE POLICY user_update_own ON public.usuarios FOR UPDATE TO authenticated
  USING (auth_id = (SELECT auth.uid()))
  WITH CHECK (auth_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS owner_write_produtos ON storage.objects;
CREATE POLICY owner_write_produtos ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.produtos p JOIN public.lojas l ON l.id = p.loja_id
      WHERE l.usuario_id = (SELECT public.meu_usuario_id())
    )
  );

DROP POLICY IF EXISTS owner_write_lojas ON storage.objects;
CREATE POLICY owner_write_lojas ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'lojas' AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.lojas WHERE usuario_id = (SELECT public.meu_usuario_id())
    )
  );

DROP POLICY IF EXISTS admin_write_imagens ON storage.objects;
CREATE POLICY admin_write_imagens ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('lojas', 'produtos') AND (SELECT public.is_admin()));

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.meu_usuario_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.minha_loja() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.loja_tem_contato(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pausar_anuncios_sem_verificacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verificar_matricula_por_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.contato_vendedor(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.denunciar(integer, integer, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.excluir_minha_conta() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_definir_status_usuario(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_listar_usuarios() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_listar_lojas() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_listar_denuncias() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolver_denuncia(bigint, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_moderar_matricula(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_moderar_loja(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_definir_destaque(integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(), public.meu_usuario_id(), public.minha_loja(), public.loja_tem_contato(integer),
  public.verificar_matricula_por_email(text), public.contato_vendedor(integer, integer),
  public.denunciar(integer, integer, text, text), public.excluir_minha_conta(),
  public.admin_definir_status_usuario(integer, text), public.admin_listar_usuarios(), public.admin_listar_lojas(),
  public.admin_listar_denuncias(), public.admin_resolver_denuncia(bigint, text),
  public.admin_moderar_matricula(integer, text), public.admin_moderar_loja(integer, text),
  public.admin_definir_destaque(integer, boolean)
  TO authenticated;
