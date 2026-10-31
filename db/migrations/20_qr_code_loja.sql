-- Migração 20: QR code da loja
--
-- 1. Cada loja tem um código secreto de compartilhamento (vai no link do QR). Não é legível por
--    select; o dono recebe pela minha_loja() e pela perfil_leitura().
-- 2. resumo_loja_compartilhada(slug, código): nome da loja e da faculdade para o login mostrar
--    "Entre para ver a loja de X". Liberada para visitante, mas só com o código certo, para não
--    permitir listar alunos pelos slugs sequenciais (aluno-1, aluno-2, ...).
-- 3. perfil_leitura passa a dizer se quem vê é o dono (botão "Compartilhar minha loja").

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Código de compartilhamento
-- ---------------------------------------------------------------------------

ALTER TABLE public.lojas
  ADD COLUMN IF NOT EXISTS codigo_compartilhamento text
    NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lojas_codigo_compartilhamento_key') THEN
    ALTER TABLE public.lojas
      ADD CONSTRAINT lojas_codigo_compartilhamento_key UNIQUE (codigo_compartilhamento);
  END IF;
END $$;

-- Grants de lojas são por coluna (migração 18): a coluna nova fica fora de SELECT e UPDATE.

-- ---------------------------------------------------------------------------
-- 2) Resumo da loja para o login (visitante com o link do QR)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resumo_loja_compartilhada(p_slug text, p_codigo text)
RETURNS TABLE (loja_nome text, instituicao_nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.nome::text, i.nome::text
  FROM public.lojas l
  JOIN public.usuarios u ON u.id = l.usuario_id
  LEFT JOIN public.instituicoes i ON i.id = u.instituicoes_id
  WHERE l.slug = p_slug
    AND l.codigo_compartilhamento = p_codigo
    AND l.status = 'ativo'
    AND u.status = 'ativo';
$$;
REVOKE EXECUTE ON FUNCTION public.resumo_loja_compartilhada(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resumo_loja_compartilhada(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) perfil_leitura: eh_dono e, só para o dono, o código
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
    'codigo_compartilhamento', CASE WHEN v_eh_dono THEN v_loja.codigo_compartilhamento END,
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

COMMIT;
