-- Migração: tela de admin para lojas/produtos + cor de tema padrão alinhada ao tema (#FF385C)

-- 1. Cor de tema --------------------------------------------------------
ALTER TABLE public.lojas ALTER COLUMN cor_tema SET DEFAULT '#FF385C';
UPDATE public.lojas SET cor_tema = '#FF385C' WHERE cor_tema IS NULL OR upper(cor_tema) = '#9A2FD6';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id INT;
  new_store_name TEXT;
BEGIN
  UPDATE public.usuarios SET auth_id = NEW.id
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email);
  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (auth_id, email, nome, sobrenome, status, matricula_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
          NEW.raw_user_meta_data->>'sobrenome', 'ativo', 'pendente')
  RETURNING id INTO new_user_id;

  new_store_name := 'Loja de ' || COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante');

  INSERT INTO public.lojas (usuario_id, nome, descricao, status, slug)
  VALUES (
    new_user_id, new_store_name,
    'Bem-vindo à minha nova Kitanda! Em breve trarei novidades.',
    'ativo',
    'loja-' || lower(replace(COALESCE(NEW.raw_user_meta_data->>'nome', 'estudante'), ' ', '-')) || '-' || new_user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2. Listagem de lojas para o admin (inclui dono e contagem de produtos) --
CREATE OR REPLACE FUNCTION public.admin_listar_lojas()
RETURNS TABLE (
  id INT, nome VARCHAR, slug VARCHAR, status VARCHAR, criado_em TIMESTAMPTZ, avatar_url VARCHAR,
  usuario_id INT, dono_nome TEXT, dono_email VARCHAR, matricula_validada BOOLEAN,
  total_produtos BIGINT, produtos_ativos BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.nome, l.slug, l.status, l.criado_em, l.avatar_url,
         u.id, trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email, u.matricula_validada,
         (SELECT count(*) FROM public.produtos p WHERE p.loja_id = l.id),
         (SELECT count(*) FROM public.produtos p WHERE p.loja_id = l.id AND p.status = 'ativo')
  FROM public.lojas l
  JOIN public.usuarios u ON u.id = l.usuario_id
  ORDER BY l.id DESC;
END;
$$;

-- 3. Moderação de loja --------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_moderar_loja(p_loja_id INT, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('pendente', 'ativo', 'pausado', 'reprovado') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.lojas SET status = p_status WHERE id = p_loja_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja % não encontrada', p_loja_id;
  END IF;
END;
$$;

-- 4. Impulsionar produto (destaque) -------------------------------------
CREATE OR REPLACE FUNCTION public.admin_definir_destaque(p_produto_id INT, p_destaque BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.produtos SET destaque = p_destaque WHERE id = p_produto_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto % não encontrado', p_produto_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_listar_lojas(), public.admin_moderar_loja(INT, TEXT),
  public.admin_definir_destaque(INT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_lojas(), public.admin_moderar_loja(INT, TEXT),
  public.admin_definir_destaque(INT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
