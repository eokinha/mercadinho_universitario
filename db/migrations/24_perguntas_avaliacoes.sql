-- Migração 24: perguntas nos anúncios e avaliação do vendedor, com moderação externa (Vettly)
--
-- 1. perguntas: aluno do mesmo campus pergunta no anúncio; o dono responde. Pergunta e resposta
--    nascem 'pendente' e só aparecem para os outros depois de 'aprovado' pela moderação.
-- 2. avaliacoes: nota de 1 a 5 (e comentário opcional) para o vendedor, uma por aluno e vendedor,
--    só de quem já clicou em "Tenho interesse" com ele (registro em interesses). Sem comentário a
--    nota vale na hora; com comentário, espera a moderação.
-- 3. Moderação: a rota /api do Next chama a Vettly e grava o resultado com aplicar_moderacao(),
--    que exige o segredo de servidor (MODERACAO_SEGREDO na Vercel). O banco guarda só o hash
--    (privado.config, fora da API). O valor é gravado à parte, nunca neste arquivo.
-- 4. Fila do admin: o que a Vettly não decidiu (falha, sinalizado) fica 'pendente' para /admin/comentarios.
-- Tudo só por RPC: anon/authenticated não têm privilégio nas tabelas.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Segredo da moderação (só o hash; schema fora da API)
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS privado;
REVOKE ALL ON SCHEMA privado FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS privado.config (
  chave text PRIMARY KEY,
  valor text NOT NULL
);
REVOKE ALL ON privado.config FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Tabelas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.perguntas (
  id bigserial PRIMARY KEY,
  produto_id integer NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  autor_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto text NOT NULL CONSTRAINT perguntas_texto_tamanho CHECK (char_length(btrim(texto)) BETWEEN 2 AND 500),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  moderacao_id text,
  moderado_em timestamptz,
  resposta text CONSTRAINT perguntas_resposta_tamanho CHECK (resposta IS NULL OR char_length(btrim(resposta)) BETWEEN 1 AND 500),
  resposta_status text CHECK (resposta_status IN ('pendente', 'aprovado', 'recusado')),
  resposta_moderacao_id text,
  respondida_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS perguntas_produto_idx ON public.perguntas (produto_id, criado_em);
CREATE INDEX IF NOT EXISTS perguntas_autor_criado_idx ON public.perguntas (autor_id, criado_em);

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id bigserial PRIMARY KEY,
  loja_id integer NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  autor_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nota smallint NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text CONSTRAINT avaliacoes_comentario_tamanho CHECK (comentario IS NULL OR char_length(btrim(comentario)) BETWEEN 2 AND 500),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  moderacao_id text,
  moderado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id, autor_id)
);
CREATE INDEX IF NOT EXISTS avaliacoes_loja_idx ON public.avaliacoes (loja_id, status);

ALTER TABLE public.perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.perguntas, public.avaliacoes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.perguntas_id_seq, public.avaliacoes_id_seq FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Helpers internos
-- ---------------------------------------------------------------------------

-- Aluno logado com conta ativa (lança erro amigável caso contrário)
CREATE OR REPLACE FUNCTION public.exigir_aluno_ativo()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para continuar' USING ERRCODE = '42501';
  END IF;
  IF (SELECT status FROM public.usuarios WHERE id = v_usuario) IS DISTINCT FROM 'ativo' THEN
    RAISE EXCEPTION 'Sua conta está bloqueada. Fale com o suporte.' USING ERRCODE = 'PT403';
  END IF;
  RETURN v_usuario;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.exigir_aluno_ativo() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Perguntas e respostas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.criar_pergunta(p_produto_id integer, p_texto text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_dono INT;
  v_id BIGINT;
BEGIN
  SELECT l.usuario_id INTO v_dono
  FROM public.produtos p JOIN public.lojas l ON l.id = p.loja_id
  WHERE p.id = p_produto_id
    AND p.status = 'ativo'
    AND p.renovado_em > now() - interval '60 days'
    AND l.status = 'ativo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este anúncio não está mais disponível.' USING ERRCODE = 'PT404';
  END IF;
  IF v_dono = v_usuario THEN
    RAISE EXCEPTION 'Você não pode perguntar no próprio anúncio.' USING ERRCODE = 'PT403';
  END IF;
  IF public.campus_do_usuario(v_dono) IS DISTINCT FROM public.meu_campus_id() THEN
    RAISE EXCEPTION 'Só alunos do mesmo campus podem perguntar.' USING ERRCODE = 'PT403';
  END IF;
  IF (SELECT count(*) FROM public.perguntas
      WHERE autor_id = v_usuario AND criado_em > now() - interval '1 day') >= 20 THEN
    RAISE EXCEPTION 'Você fez muitas perguntas hoje. Tente de novo amanhã.' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.perguntas (produto_id, autor_id, texto)
  VALUES (p_produto_id, v_usuario, btrim(p_texto))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.responder_pergunta(p_pergunta_id bigint, p_texto text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_pergunta public.perguntas%ROWTYPE;
BEGIN
  SELECT q.* INTO v_pergunta
  FROM public.perguntas q
  JOIN public.produtos p ON p.id = q.produto_id
  JOIN public.lojas l ON l.id = p.loja_id
  WHERE q.id = p_pergunta_id AND l.usuario_id = v_usuario;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pergunta não encontrada.' USING ERRCODE = 'PT404';
  END IF;
  IF v_pergunta.status <> 'aprovado' THEN
    RAISE EXCEPTION 'Esta pergunta não está publicada.' USING ERRCODE = 'PT403';
  END IF;
  IF v_pergunta.resposta_status IN ('pendente', 'aprovado') THEN
    RAISE EXCEPTION 'Esta pergunta já foi respondida.' USING ERRCODE = 'PT403';
  END IF;

  UPDATE public.perguntas
  SET resposta = btrim(p_texto), resposta_status = 'pendente', resposta_moderacao_id = NULL, respondida_em = now()
  WHERE id = p_pergunta_id;
END;
$$;

-- Perguntas do anúncio: as aprovadas para todos; as próprias (qualquer status) para o autor;
-- a resposta só aparece aprovada, exceto para o dono, que vê a dele em análise
CREATE OR REPLACE FUNCTION public.perguntas_do_anuncio(p_produto_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_dono INT;
  v_visivel BOOLEAN;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver as perguntas' USING ERRCODE = '42501';
  END IF;
  SELECT l.usuario_id,
         p.status = 'ativo' AND p.renovado_em > now() - interval '60 days' AND l.status = 'ativo'
    INTO v_dono, v_visivel
  FROM public.produtos p JOIN public.lojas l ON l.id = p.loja_id
  WHERE p.id = p_produto_id;
  IF NOT FOUND OR (NOT v_visivel AND v_dono <> v_usuario) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id,
      'texto', q.texto,
      'autor_nome', la.nome,
      'criado_em', q.criado_em,
      'minha', q.autor_id = v_usuario,
      'status', CASE WHEN q.autor_id = v_usuario THEN q.status ELSE 'aprovado' END,
      'resposta', CASE WHEN q.resposta_status = 'aprovado' OR v_dono = v_usuario THEN q.resposta END,
      'resposta_status', CASE WHEN v_dono = v_usuario THEN q.resposta_status
                              WHEN q.resposta_status = 'aprovado' THEN 'aprovado' END,
      'respondida_em', CASE WHEN q.resposta_status = 'aprovado' OR v_dono = v_usuario THEN q.respondida_em END
    ) ORDER BY q.criado_em DESC)
    FROM public.perguntas q
    JOIN public.usuarios ua ON ua.id = q.autor_id
    LEFT JOIN public.lojas la ON la.usuario_id = q.autor_id
    WHERE q.produto_id = p_produto_id
      AND (q.status = 'aprovado' AND ua.status = 'ativo' OR q.autor_id = v_usuario)
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Avaliação do vendedor
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.avaliar_vendedor(p_loja_id integer, p_nota integer, p_comentario text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_dono INT;
  v_comentario TEXT := NULLIF(btrim(COALESCE(p_comentario, '')), '');
  v_status TEXT;
  v_id BIGINT;
BEGIN
  SELECT usuario_id INTO v_dono FROM public.lojas WHERE id = p_loja_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.' USING ERRCODE = 'PT404';
  END IF;
  IF v_dono = v_usuario THEN
    RAISE EXCEPTION 'Você não pode avaliar o próprio perfil.' USING ERRCODE = 'PT403';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.interesses WHERE usuario_id = v_usuario AND loja_id = p_loja_id) THEN
    RAISE EXCEPTION 'Só quem já chamou este vendedor no WhatsApp pelo Circular pode avaliar.' USING ERRCODE = 'PT403';
  END IF;
  IF p_nota IS NULL OR p_nota NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Escolha uma nota de 1 a 5.' USING ERRCODE = '22023';
  END IF;

  v_status := CASE WHEN v_comentario IS NULL THEN 'aprovado' ELSE 'pendente' END;

  INSERT INTO public.avaliacoes (loja_id, autor_id, nota, comentario, status, moderado_em)
  VALUES (p_loja_id, v_usuario, p_nota, v_comentario, v_status, CASE WHEN v_status = 'aprovado' THEN now() END)
  ON CONFLICT (loja_id, autor_id) DO UPDATE
    SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, status = EXCLUDED.status,
        moderacao_id = NULL, moderado_em = EXCLUDED.moderado_em, atualizado_em = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;

-- Média e avaliações publicadas do vendedor, a avaliação do próprio aluno e se ele pode avaliar
CREATE OR REPLACE FUNCTION public.avaliacoes_do_vendedor(p_loja_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_dono INT;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver as avaliações' USING ERRCODE = '42501';
  END IF;
  SELECT usuario_id INTO v_dono FROM public.lojas WHERE id = p_loja_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'media', (SELECT round(avg(a.nota)::numeric, 1) FROM public.avaliacoes a
              JOIN public.usuarios u ON u.id = a.autor_id
              WHERE a.loja_id = p_loja_id AND a.status = 'aprovado' AND u.status = 'ativo'),
    'total', (SELECT count(*) FROM public.avaliacoes a
              JOIN public.usuarios u ON u.id = a.autor_id
              WHERE a.loja_id = p_loja_id AND a.status = 'aprovado' AND u.status = 'ativo'),
    'pode_avaliar', v_dono <> v_usuario
      AND EXISTS (SELECT 1 FROM public.interesses WHERE usuario_id = v_usuario AND loja_id = p_loja_id),
    'minha', (SELECT jsonb_build_object('nota', a.nota, 'comentario', a.comentario, 'status', a.status)
              FROM public.avaliacoes a WHERE a.loja_id = p_loja_id AND a.autor_id = v_usuario),
    'avaliacoes', COALESCE((
      SELECT jsonb_agg(x ORDER BY (x->>'criado_em') DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', a.id,
          'nota', a.nota,
          'comentario', a.comentario,
          'autor_nome', la.nome,
          'criado_em', a.atualizado_em
        ) AS x
        FROM public.avaliacoes a
        JOIN public.usuarios u ON u.id = a.autor_id
        LEFT JOIN public.lojas la ON la.usuario_id = a.autor_id
        WHERE a.loja_id = p_loja_id AND a.status = 'aprovado' AND u.status = 'ativo'
          AND a.autor_id <> v_usuario
        ORDER BY a.atualizado_em DESC
        LIMIT 30
      ) s
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Resultado da moderação (rota do servidor, com o segredo) e fila do admin
-- ---------------------------------------------------------------------------

-- p_tipo: 'pergunta' | 'resposta' | 'avaliacao'. Só muda o que ainda está 'pendente'.
CREATE OR REPLACE FUNCTION public.aplicar_moderacao(
  p_segredo text, p_tipo text, p_id bigint, p_aprovado boolean, p_moderacao_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_status TEXT := CASE WHEN p_aprovado THEN 'aprovado' ELSE 'recusado' END;
BEGIN
  SELECT valor INTO v_hash FROM privado.config WHERE chave = 'moderacao_segredo_sha256';
  IF v_hash IS NULL OR p_segredo IS NULL
     OR encode(extensions.digest(p_segredo, 'sha256'), 'hex') <> v_hash THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF p_tipo = 'pergunta' THEN
    UPDATE public.perguntas SET status = v_status, moderacao_id = p_moderacao_id, moderado_em = now()
    WHERE id = p_id AND status = 'pendente';
  ELSIF p_tipo = 'resposta' THEN
    UPDATE public.perguntas SET resposta_status = v_status, resposta_moderacao_id = p_moderacao_id
    WHERE id = p_id AND resposta_status = 'pendente';
  ELSIF p_tipo = 'avaliacao' THEN
    UPDATE public.avaliacoes SET status = v_status, moderacao_id = p_moderacao_id, moderado_em = now()
    WHERE id = p_id AND status = 'pendente';
  ELSE
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
END;
$$;

-- Fila do admin: pendentes (a moderação externa falhou ou sinalizou) e recusados dos últimos 30 dias
CREATE OR REPLACE FUNCTION public.admin_listar_moderacao()
RETURNS TABLE (
  tipo text, id bigint, texto text, status text, criado_em timestamptz,
  autor_nome text, autor_email character varying, contexto text, nota smallint, link text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT 'pergunta'::text, q.id, q.texto, q.status, q.criado_em,
           trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email,
           ('Pergunta no anúncio: ' || p.nome)::text, NULL::smallint, ('/anuncio/' || p.id)::text
    FROM public.perguntas q
    JOIN public.usuarios u ON u.id = q.autor_id
    JOIN public.produtos p ON p.id = q.produto_id
    WHERE q.status = 'pendente' OR (q.status = 'recusado' AND q.criado_em > now() - interval '30 days')
    UNION ALL
    SELECT 'resposta'::text, q.id, q.resposta, q.resposta_status, q.respondida_em,
           trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email,
           ('Resposta à pergunta "' || left(q.texto, 80) || '" em ' || p.nome)::text, NULL::smallint, ('/anuncio/' || p.id)::text
    FROM public.perguntas q
    JOIN public.produtos p ON p.id = q.produto_id
    JOIN public.lojas l ON l.id = p.loja_id
    JOIN public.usuarios u ON u.id = l.usuario_id
    WHERE q.resposta_status = 'pendente' OR (q.resposta_status = 'recusado' AND q.respondida_em > now() - interval '30 days')
    UNION ALL
    SELECT 'avaliacao'::text, a.id, a.comentario, a.status, a.atualizado_em,
           trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email,
           ('Avaliação de ' || l.nome)::text, a.nota, ('/perfil/' || COALESCE(l.slug, l.id::text))::text
    FROM public.avaliacoes a
    JOIN public.usuarios u ON u.id = a.autor_id
    JOIN public.lojas l ON l.id = a.loja_id
    WHERE a.status = 'pendente' OR (a.status = 'recusado' AND a.atualizado_em > now() - interval '30 days')
  ) f
  ORDER BY (f.status = 'pendente') DESC, f.criado_em DESC;
END;
$$;

-- Decisão manual do admin (aprova ou recusa, inclusive o que a Vettly recusou)
CREATE OR REPLACE FUNCTION public.admin_moderar_conteudo(p_tipo text, p_id bigint, p_aprovado boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT := CASE WHEN p_aprovado THEN 'aprovado' ELSE 'recusado' END;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_tipo = 'pergunta' THEN
    UPDATE public.perguntas SET status = v_status, moderacao_id = 'admin', moderado_em = now() WHERE id = p_id;
  ELSIF p_tipo = 'resposta' THEN
    UPDATE public.perguntas SET resposta_status = v_status, resposta_moderacao_id = 'admin'
    WHERE id = p_id AND resposta IS NOT NULL;
  ELSIF p_tipo = 'avaliacao' THEN
    UPDATE public.avaliacoes SET status = v_status, moderacao_id = 'admin', moderado_em = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Permissões
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.criar_pergunta(integer, text),
  public.responder_pergunta(bigint, text),
  public.perguntas_do_anuncio(integer),
  public.avaliar_vendedor(integer, integer, text),
  public.avaliacoes_do_vendedor(integer),
  public.aplicar_moderacao(text, text, bigint, boolean, text),
  public.admin_listar_moderacao(),
  public.admin_moderar_conteudo(text, bigint, boolean)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.criar_pergunta(integer, text),
  public.responder_pergunta(bigint, text),
  public.perguntas_do_anuncio(integer),
  public.avaliar_vendedor(integer, integer, text),
  public.avaliacoes_do_vendedor(integer),
  public.aplicar_moderacao(text, text, bigint, boolean, text),
  public.admin_listar_moderacao(),
  public.admin_moderar_conteudo(text, bigint, boolean)
TO authenticated;

COMMIT;
