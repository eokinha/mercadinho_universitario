-- Migração 25: autor apaga o próprio comentário e qualquer aluno denuncia comentários
--
-- 1. excluir_meu_comentario(p_tipo, p_id): o autor apaga a pergunta (com a resposta junto) ou a avaliação;
--    o dono do anúncio apaga a própria resposta (a pergunta volta a ficar sem resposta).
-- 2. denuncias ganha alvo_tipo (anuncio | perfil | pergunta | resposta | avaliacao), pergunta_id,
--    avaliacao_id e conteudo (cópia do texto denunciado, que fica como prova mesmo se o autor apagar).
-- 3. denunciar_comentario(p_tipo, p_id, p_motivo, p_detalhes): só comentário publicado, de outra pessoa,
--    uma denúncia aberta por aluno e comentário; o limite de 10 denúncias por dia é o mesmo de denunciar().
-- 4. denunciar() passa a gravar alvo_tipo; admin_listar_denuncias() devolve o tipo, o texto e o link,
--    para a fila do admin separar anúncios/perfis de comentários.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Autor apaga o próprio comentário
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.excluir_meu_comentario(p_tipo text, p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para continuar' USING ERRCODE = '42501';
  END IF;

  IF p_tipo = 'pergunta' THEN
    DELETE FROM public.perguntas WHERE id = p_id AND autor_id = v_usuario;
  ELSIF p_tipo = 'resposta' THEN
    UPDATE public.perguntas q
    SET resposta = NULL, resposta_status = NULL, resposta_moderacao_id = NULL, respondida_em = NULL
    FROM public.produtos p JOIN public.lojas l ON l.id = p.loja_id
    WHERE q.id = p_id AND p.id = q.produto_id AND l.usuario_id = v_usuario AND q.resposta IS NOT NULL;
  ELSIF p_tipo = 'avaliacao' THEN
    DELETE FROM public.avaliacoes WHERE id = p_id AND autor_id = v_usuario;
  ELSE
    RAISE EXCEPTION 'Tipo inválido' USING ERRCODE = '22023';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentário não encontrado.' USING ERRCODE = 'PT404';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Denúncias de comentários
-- ---------------------------------------------------------------------------

ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS alvo_tipo text NOT NULL DEFAULT 'anuncio',
  ADD COLUMN IF NOT EXISTS pergunta_id bigint REFERENCES public.perguntas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avaliacao_id bigint REFERENCES public.avaliacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conteudo text;

-- Denúncias antigas: o texto do alvo diz se era anúncio ou perfil (produto_id some se o anúncio for apagado)
UPDATE public.denuncias SET alvo_tipo = 'perfil' WHERE alvo_descricao LIKE 'Perfil:%';

ALTER TABLE public.denuncias DROP CONSTRAINT IF EXISTS denuncias_alvo_tipo_check;
ALTER TABLE public.denuncias ADD CONSTRAINT denuncias_alvo_tipo_check
  CHECK (alvo_tipo IN ('anuncio', 'perfil', 'pergunta', 'resposta', 'avaliacao'));
ALTER TABLE public.denuncias DROP CONSTRAINT IF EXISTS denuncias_conteudo_tamanho;
ALTER TABLE public.denuncias ADD CONSTRAINT denuncias_conteudo_tamanho CHECK (conteudo IS NULL OR length(conteudo) <= 500);
CREATE INDEX IF NOT EXISTS denuncias_denunciante_criado_idx ON public.denuncias (denunciante_id, criado_em);

-- denunciar() (anúncio ou perfil) agora grava o tipo do alvo; o resto é igual à migração 16
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

  INSERT INTO public.denuncias (denunciante_id, loja_id, produto_id, alvo_tipo, alvo_descricao, motivo, detalhes)
  VALUES (
    v_usuario, p_loja_id, CASE WHEN v_produto IS NULL THEN NULL ELSE p_produto_id END,
    CASE WHEN v_produto IS NULL THEN 'perfil' ELSE 'anuncio' END,
    CASE WHEN v_produto IS NULL THEN 'Perfil: ' || v_loja ELSE 'Anúncio: ' || v_produto || ' (' || v_loja || ')' END,
    p_motivo, NULLIF(left(trim(COALESCE(p_detalhes, '')), 1000), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.denunciar_comentario(p_tipo text, p_id bigint, p_motivo text, p_detalhes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_autor INT;
  v_loja_id INT;
  v_produto_id INT;
  v_pergunta_id BIGINT;
  v_avaliacao_id BIGINT;
  v_conteudo TEXT;
  v_descricao TEXT;
BEGIN
  IF p_motivo NOT IN ('proibido', 'golpe', 'ofensivo', 'falso', 'outro') THEN
    RAISE EXCEPTION 'Motivo inválido' USING ERRCODE = '22023';
  END IF;

  IF p_tipo = 'pergunta' THEN
    SELECT q.autor_id, p.loja_id, p.id, q.id, q.texto,
           'Pergunta de ' || COALESCE(la.nome, 'aluno') || ' no anúncio ' || p.nome
      INTO v_autor, v_loja_id, v_produto_id, v_pergunta_id, v_conteudo, v_descricao
    FROM public.perguntas q
    JOIN public.produtos p ON p.id = q.produto_id
    LEFT JOIN public.lojas la ON la.usuario_id = q.autor_id
    WHERE q.id = p_id AND q.status = 'aprovado';
  ELSIF p_tipo = 'resposta' THEN
    SELECT l.usuario_id, p.loja_id, p.id, q.id, q.resposta,
           'Resposta de ' || l.nome || ' no anúncio ' || p.nome
      INTO v_autor, v_loja_id, v_produto_id, v_pergunta_id, v_conteudo, v_descricao
    FROM public.perguntas q
    JOIN public.produtos p ON p.id = q.produto_id
    JOIN public.lojas l ON l.id = p.loja_id
    WHERE q.id = p_id AND q.resposta_status = 'aprovado';
  ELSIF p_tipo = 'avaliacao' THEN
    SELECT a.autor_id, a.loja_id, NULL, NULL, a.id, COALESCE(a.comentario, 'Nota ' || a.nota || ' sem comentário'),
           'Avaliação de ' || COALESCE(la.nome, 'aluno') || ' no perfil de ' || l.nome
      INTO v_autor, v_loja_id, v_produto_id, v_pergunta_id, v_avaliacao_id, v_conteudo, v_descricao
    FROM public.avaliacoes a
    JOIN public.lojas l ON l.id = a.loja_id
    LEFT JOIN public.lojas la ON la.usuario_id = a.autor_id
    WHERE a.id = p_id AND a.status = 'aprovado';
  ELSE
    RAISE EXCEPTION 'Tipo inválido' USING ERRCODE = '22023';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentário não encontrado.' USING ERRCODE = 'PT404';
  END IF;
  IF v_autor = v_usuario THEN
    RAISE EXCEPTION 'Você não pode denunciar o próprio comentário.' USING ERRCODE = 'PT403';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.denuncias
    WHERE denunciante_id = v_usuario AND alvo_tipo = p_tipo AND status = 'aberta'
      AND COALESCE(pergunta_id, avaliacao_id) = p_id
  ) THEN
    RAISE EXCEPTION 'Você já denunciou este comentário. A equipe vai analisar.' USING ERRCODE = 'PT429';
  END IF;
  IF (SELECT count(*) FROM public.denuncias
      WHERE denunciante_id = v_usuario AND criado_em > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Você atingiu o limite de denúncias de hoje. Tente amanhã.' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.denuncias
    (denunciante_id, loja_id, produto_id, pergunta_id, avaliacao_id, alvo_tipo, alvo_descricao, conteudo, motivo, detalhes)
  VALUES (
    v_usuario, v_loja_id, v_produto_id, v_pergunta_id, v_avaliacao_id, p_tipo, v_descricao, left(v_conteudo, 500),
    p_motivo, NULLIF(left(trim(COALESCE(p_detalhes, '')), 1000), '')
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Fila do admin com o tipo do alvo, o texto denunciado e o link
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_listar_denuncias();
CREATE FUNCTION public.admin_listar_denuncias()
RETURNS TABLE(id bigint, motivo text, detalhes text, status text, criado_em timestamptz, alvo_descricao text,
              loja_id integer, produto_id integer, denunciante_nome text, denunciante_email character varying,
              alvo_tipo text, pergunta_id bigint, avaliacao_id bigint, conteudo text, link text,
              comentario_no_ar boolean)
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
         trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email,
         d.alvo_tipo, d.pergunta_id, d.avaliacao_id, d.conteudo,
         CASE
           WHEN d.produto_id IS NOT NULL THEN '/anuncio/' || d.produto_id
           WHEN d.loja_id IS NOT NULL THEN '/perfil/' || COALESCE(l.slug, d.loja_id::text)
         END,
         -- Comentário denunciado ainda aparece no site? (o autor pode ter apagado; o admin pode ter removido)
         CASE d.alvo_tipo
           WHEN 'pergunta' THEN EXISTS (SELECT 1 FROM public.perguntas q WHERE q.id = d.pergunta_id AND q.status = 'aprovado')
           WHEN 'resposta' THEN EXISTS (SELECT 1 FROM public.perguntas q WHERE q.id = d.pergunta_id AND q.resposta_status = 'aprovado')
           WHEN 'avaliacao' THEN EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = d.avaliacao_id AND a.status = 'aprovado')
         END
  FROM public.denuncias d
  LEFT JOIN public.usuarios u ON u.id = d.denunciante_id
  LEFT JOIN public.lojas l ON l.id = d.loja_id
  ORDER BY (d.status = 'aberta') DESC, d.criado_em DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) avaliacoes_do_vendedor: 'minha' passa a trazer o id (para o aluno apagar a própria avaliação)
-- ---------------------------------------------------------------------------

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
    'minha', (SELECT jsonb_build_object('id', a.id, 'nota', a.nota, 'comentario', a.comentario, 'status', a.status)
              FROM public.avaliacoes a WHERE a.loja_id = p_loja_id AND a.autor_id = v_usuario),
    'avaliacoes', COALESCE((
      SELECT jsonb_agg(x ORDER BY (x->>'criado_em') DESC)
      FROM (
        SELECT jsonb_build_object('id', a.id, 'nota', a.nota, 'comentario', a.comentario,
                                  'autor_nome', la.nome, 'criado_em', a.atualizado_em) AS x
        FROM public.avaliacoes a
        JOIN public.usuarios u ON u.id = a.autor_id
        LEFT JOIN public.lojas la ON la.usuario_id = a.autor_id
        WHERE a.loja_id = p_loja_id AND a.status = 'aprovado' AND u.status = 'ativo' AND a.autor_id <> v_usuario
        ORDER BY a.atualizado_em DESC
        LIMIT 30
      ) s
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Permissões
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.excluir_meu_comentario(text, bigint),
  public.denunciar_comentario(text, bigint, text, text),
  public.denunciar(integer, integer, text, text),
  public.admin_listar_denuncias()
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.excluir_meu_comentario(text, bigint),
  public.denunciar_comentario(text, bigint, text, text),
  public.denunciar(integer, integer, text, text),
  public.admin_listar_denuncias()
TO authenticated;

COMMIT;
