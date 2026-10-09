-- Migração: remove recursão entre políticas de lojas e usuarios
-- (lojas → usuarios → lojas). Os helpers SECURITY DEFINER leem sem passar pelo RLS.

CREATE OR REPLACE FUNCTION public.meu_usuario_id()
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.usuario_tem_loja_ativa(p_usuario_id INT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lojas WHERE usuario_id = p_usuario_id AND status = 'ativo');
$$;

DROP POLICY IF EXISTS "usuarios_read_if_dono_loja_ativa" ON public.usuarios;
CREATE POLICY "usuarios_read_if_dono_loja_ativa" ON public.usuarios FOR SELECT
  USING (public.usuario_tem_loja_ativa(id));

DROP POLICY IF EXISTS "lojas_owner_manage" ON public.lojas;
CREATE POLICY "lojas_owner_manage" ON public.lojas FOR ALL
  USING (usuario_id = (SELECT public.meu_usuario_id()));

DROP POLICY IF EXISTS "produtos_owner_manage" ON public.produtos;
CREATE POLICY "produtos_owner_manage" ON public.produtos FOR ALL
  USING (loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = (SELECT public.meu_usuario_id())));

DROP POLICY IF EXISTS "favoritos_owner_manage" ON public.favoritos;
CREATE POLICY "favoritos_owner_manage" ON public.favoritos FOR ALL
  USING (usuario_id = (SELECT public.meu_usuario_id()));

DROP POLICY IF EXISTS "owner_write_lojas" ON storage.objects;
CREATE POLICY "owner_write_lojas" ON storage.objects FOR ALL
  USING (bucket_id = 'lojas' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.lojas WHERE usuario_id = (SELECT public.meu_usuario_id())));

DROP POLICY IF EXISTS "owner_write_produtos" ON storage.objects;
CREATE POLICY "owner_write_produtos" ON storage.objects FOR ALL
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM public.produtos p JOIN public.lojas l ON l.id = p.loja_id
    WHERE l.usuario_id = (SELECT public.meu_usuario_id())));

REVOKE EXECUTE ON FUNCTION public.meu_usuario_id(), public.usuario_tem_loja_ativa(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meu_usuario_id(), public.usuario_tem_loja_ativa(INT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
