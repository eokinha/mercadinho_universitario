-- 23: nome pessoal x nome de exibição (uma conta = um perfil)
--
-- Antes: lojas.nome era texto livre ("Nome de exibição") e usuarios.nome/sobrenome não podiam ser
-- corrigidos pelo aluno. O perfil público mostrava o nome pessoal; cards e anúncios, o da loja.
--
-- Agora:
--  * usuarios.nome/sobrenome = nome pessoal; o aluno corrige no painel. Não é mais legível por
--    select de outros alunos (só pela RPC meu_usuario() e pelas RPCs de admin).
--  * lojas.nome_exibicao = nome de exibição opcional (marca, ex.: "Bia Doces"), editável pelo aluno.
--  * lojas.nome = nome público, calculado pelo banco: nome_exibicao ou, sem ele, nome + sobrenome.
--    O aluno não grava lojas.nome direto; todo o app continua lendo lojas.nome.
--  * Desbloquear aluno volta o perfil para 'ativo' (antes ficava 'pausado' sem tela para reativar).

-- Nome de exibição: 2 a 60 caracteres e sem termos que imitem a equipe do site.
-- Espelho: problemaNomeExibicao em src/lib/validacoes.ts — mudar os dois juntos.
CREATE OR REPLACE FUNCTION public.nome_exibicao_valido(p_nome text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT p_nome IS NULL OR (
    char_length(trim(p_nome)) BETWEEN 2 AND 60
    AND lower(translate(p_nome, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'))
      !~ '(circular|admin|modera|suporte|oficial|equipe)'
  );
$$;

ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS nome_exibicao varchar(60);
ALTER TABLE public.lojas DROP CONSTRAINT IF EXISTS lojas_nome_exibicao_valido;
ALTER TABLE public.lojas ADD CONSTRAINT lojas_nome_exibicao_valido CHECK (public.nome_exibicao_valido(nome_exibicao));

-- Nome pessoal: limites espelhados em LIMITES_TEXTO (usuarioNome/usuarioSobrenome)
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_nome_tamanho;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_nome_tamanho
  CHECK (char_length(trim(nome)) BETWEEN 1 AND 40 AND char_length(COALESCE(sobrenome, '')) <= 60);

-- Nome público de um aluno: nome de exibição ou nome + sobrenome
CREATE OR REPLACE FUNCTION public.nome_publico(p_usuario_id integer, p_nome_exibicao text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT left(COALESCE(
    NULLIF(trim(p_nome_exibicao), ''),
    (SELECT trim(u.nome || ' ' || COALESCE(u.sobrenome, '')) FROM public.usuarios u WHERE u.id = p_usuario_id),
    'Estudante'
  ), 80);
$$;
REVOKE ALL ON FUNCTION public.nome_publico(integer, text) FROM PUBLIC, anon, authenticated;

-- lojas.nome sempre calculado (insert do signup, edição do aluno, admin)
CREATE OR REPLACE FUNCTION public.definir_nome_publico_loja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.nome_exibicao := NULLIF(trim(NEW.nome_exibicao), '');
  NEW.nome := public.nome_publico(NEW.usuario_id, NEW.nome_exibicao);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS definir_nome_publico_loja ON public.lojas;
CREATE TRIGGER definir_nome_publico_loja
  BEFORE INSERT OR UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.definir_nome_publico_loja();

-- Corrigiu o nome pessoal: o nome público acompanha (se não houver nome de exibição)
CREATE OR REPLACE FUNCTION public.sincronizar_nome_loja()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.lojas SET nome = nome WHERE usuario_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sincronizar_nome_loja ON public.usuarios;
CREATE TRIGGER sincronizar_nome_loja
  AFTER UPDATE OF nome, sobrenome ON public.usuarios
  FOR EACH ROW
  WHEN (OLD.nome IS DISTINCT FROM NEW.nome OR OLD.sobrenome IS DISTINCT FROM NEW.sobrenome)
  EXECUTE FUNCTION public.sincronizar_nome_loja();

-- Grants: o aluno grava o nome de exibição (não o nome público) e corrige o próprio nome pessoal;
-- o nome pessoal de outros alunos deixa de sair por select
REVOKE UPDATE (nome) ON public.lojas FROM authenticated;
GRANT UPDATE (nome_exibicao) ON public.lojas TO authenticated;
GRANT UPDATE (nome, sobrenome) ON public.usuarios TO authenticated;
REVOKE SELECT (nome, sobrenome) ON public.usuarios FROM anon, authenticated;

-- Signup: nome e sobrenome cortados nos limites novos (o resto igual à migração 19)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_user_id INT;
  v_nome TEXT := left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''), 'Estudante'), 40);
  v_sobrenome TEXT := left(NULLIF(trim(NEW.raw_user_meta_data->>'sobrenome'), ''), 60);
  v_termos TIMESTAMPTZ := CASE WHEN NEW.raw_user_meta_data->>'termos_aceitos' = 'true' THEN now() END;
  v_campus INT := public.instituicao_por_email(NEW.email);
BEGIN
  IF v_campus IS NULL THEN
    RAISE EXCEPTION 'Cadastro permitido apenas com e-mail de faculdade participante' USING ERRCODE = '23514';
  END IF;

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
  VALUES (NEW.id, NEW.email, v_nome, v_sobrenome, 'ativo', 'pendente', v_termos, v_campus)
  RETURNING id INTO new_user_id;

  -- lojas.nome é calculado pelo trigger definir_nome_publico_loja
  INSERT INTO public.lojas (usuario_id, nome, descricao, status, slug)
  VALUES (new_user_id, v_nome, 'Aluno na Circular.', 'ativo', 'aluno-' || new_user_id);

  RETURN NEW;
END;
$function$;

-- Perfil público: sem o nome pessoal (o título usa perfil.nome, o nome público)
CREATE OR REPLACE FUNCTION public.perfil_leitura(p_id_ou_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_meu_campus INT;
  v_meu_id INT;
  v_loja public.lojas%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_instituicao TEXT;
  v_eh_dono BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver perfis' USING ERRCODE = '42501';
  END IF;
  v_meu_campus := public.meu_campus_id();
  v_meu_id := public.meu_usuario_id();

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
  v_eh_dono := v_loja.usuario_id = v_meu_id;

  RETURN jsonb_build_object(
    'mesmo_campus', COALESCE(v_usuario.instituicoes_id = v_meu_campus, FALSE),
    'eh_dono', COALESCE(v_eh_dono, FALSE),
    'codigo_compartilhamento', v_loja.codigo_compartilhamento,
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
$function$;

-- Desbloquear: o perfil volta ao ar (os anúncios continuam pausados até o aluno reativar)
CREATE OR REPLACE FUNCTION public.admin_definir_status_usuario(p_usuario_id integer, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    UPDATE public.lojas SET status = 'ativo' WHERE usuario_id = p_usuario_id AND status IN ('reprovado', 'pausado');
  END IF;
END;
$function$;

-- Backfill: quem já tinha mudado o nome da loja (diferente do nome pessoal e do padrão antigo
-- "Loja de …") passa a ter esse texto como nome de exibição, se for válido
UPDATE public.lojas l
SET nome_exibicao = trim(l.nome)
FROM public.usuarios u
WHERE u.id = l.usuario_id
  AND lower(trim(l.nome)) <> lower(trim(u.nome || ' ' || COALESCE(u.sobrenome, '')))
  AND l.nome !~* '^loja de '
  AND public.nome_exibicao_valido(trim(l.nome));

-- Recalcula o nome público de todos
UPDATE public.lojas SET nome = nome;
