-- Migração 22: página própria do anúncio (/anuncio/{id}-{nome})
--
-- 1. anuncio_leitura(p_id): o anúncio, a loja, o campus e até 8 outros anúncios da loja, para
--    qualquer aluno logado (de outro campus a página fica só leitura, como o perfil). Anúncio
--    vendido, pausado ou vencido volta com disponivel = false e só o necessário para a página
--    "não está mais disponível"; o dono vê o próprio anúncio inteiro em qualquer estado.
-- 2. resumo_anuncio_compartilhado(p_id, p_codigo): nome, preço e foto para o login e a prévia do
--    WhatsApp, liberado para visitante só com o código da loja dona do anúncio (os ids são
--    sequenciais; sem o código não dá para listar anúncios).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Página do anúncio
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.anuncio_leitura(p_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meu_id INT;
  v_meu_campus INT;
  v_produto public.produtos%ROWTYPE;
  v_loja public.lojas%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_categoria TEXT;
  v_instituicao TEXT;
  v_eh_dono BOOLEAN;
  v_disponivel BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver anúncios' USING ERRCODE = '42501';
  END IF;
  v_meu_id := public.meu_usuario_id();
  v_meu_campus := public.meu_campus_id();

  SELECT * INTO v_produto FROM public.produtos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_loja FROM public.lojas WHERE id = v_produto.loja_id;
  SELECT * INTO v_usuario FROM public.usuarios WHERE id = v_loja.usuario_id;

  v_eh_dono := COALESCE(v_loja.usuario_id = v_meu_id, FALSE);
  v_disponivel := v_produto.status = 'ativo'
    AND v_produto.renovado_em > now() - interval '60 days'
    AND v_loja.status = 'ativo';

  IF NOT v_disponivel AND NOT v_eh_dono THEN
    RETURN jsonb_build_object(
      'disponivel', FALSE,
      'eh_dono', FALSE,
      'anuncio', jsonb_build_object('id', v_produto.id, 'nome', v_produto.nome),
      'loja', CASE WHEN v_loja.status = 'ativo'
        THEN jsonb_build_object('slug', v_loja.slug, 'nome', v_loja.nome) END
    );
  END IF;

  SELECT nome INTO v_categoria FROM public.categorias WHERE id = v_produto.categoria_id;
  SELECT nome INTO v_instituicao FROM public.instituicoes WHERE id = v_usuario.instituicoes_id;

  RETURN jsonb_build_object(
    'disponivel', v_disponivel,
    'eh_dono', v_eh_dono,
    'mesmo_campus', COALESCE(v_usuario.instituicoes_id = v_meu_campus, FALSE),
    'codigo_compartilhamento', v_loja.codigo_compartilhamento,
    'favoritado', EXISTS (SELECT 1 FROM public.favoritos f WHERE f.usuario_id = v_meu_id AND f.produto_id = v_produto.id),
    'anuncio', jsonb_build_object(
      'id', v_produto.id,
      'nome', v_produto.nome,
      'descricao', v_produto.descricao,
      'preco', v_produto.preco,
      'imagem_url', v_produto.imagem_url,
      'categoria_id', v_produto.categoria_id,
      'categoria_nome', v_categoria,
      'aceita_troca', v_produto.aceita_troca,
      'destaque', v_produto.destaque,
      'status', v_produto.status,
      'criado_em', v_produto.criado_em,
      'renovado_em', v_produto.renovado_em
    ),
    'loja', jsonb_build_object(
      'id', v_loja.id,
      'slug', v_loja.slug,
      'nome', v_loja.nome,
      'descricao', v_loja.descricao,
      'avatar_url', v_loja.avatar_url,
      'locais_entrega', COALESCE(to_jsonb(v_loja.locais_entrega), '[]'::jsonb),
      'verificada', v_usuario.matricula_status = 'verificado',
      'instituicao_nome', v_instituicao
    ),
    'outros', COALESCE((
      SELECT jsonb_agg(o ORDER BY (o->>'criado_em') DESC)
      FROM (
        SELECT jsonb_build_object(
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
          'loja_verificada', v_usuario.matricula_status = 'verificado',
          'criado_em', p.criado_em
        ) AS o
        FROM public.produtos p
        JOIN public.categorias c ON c.id = p.categoria_id
        WHERE p.loja_id = v_loja.id
          AND p.id <> v_produto.id
          AND p.status = 'ativo'
          AND p.renovado_em > now() - interval '60 days'
          AND v_loja.status = 'ativo'
        ORDER BY p.criado_em DESC
        LIMIT 8
      ) s
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.anuncio_leitura(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anuncio_leitura(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Resumo para o login e a prévia do WhatsApp (visitante com o link compartilhado)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resumo_anuncio_compartilhado(p_id integer, p_codigo text)
RETURNS TABLE (
  anuncio_nome text,
  preco numeric,
  aceita_troca boolean,
  imagem_url text,
  loja_nome text,
  instituicao_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.nome::text, p.preco, p.aceita_troca, p.imagem_url::text, l.nome::text, i.nome::text
  FROM public.produtos p
  JOIN public.lojas l ON l.id = p.loja_id
  JOIN public.usuarios u ON u.id = l.usuario_id
  LEFT JOIN public.instituicoes i ON i.id = u.instituicoes_id
  WHERE p.id = p_id
    AND l.codigo_compartilhamento = p_codigo
    AND p.status = 'ativo'
    AND p.renovado_em > now() - interval '60 days'
    AND l.status = 'ativo'
    AND u.status = 'ativo';
$$;
REVOKE EXECUTE ON FUNCTION public.resumo_anuncio_compartilhado(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resumo_anuncio_compartilhado(integer, text) TO anon, authenticated;

COMMIT;
