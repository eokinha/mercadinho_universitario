-- Migração: alinha um banco criado antes do setup_completo.sql
-- (usuarios sem auth_id/is_admin/status, sem trigger de signup, políticas provisórias).
-- Idempotente. Rodar antes das migrações 01..05.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

-- Com Supabase Auth, senha/telefone/cpf são opcionais na tabela
ALTER TABLE public.usuarios
  ALTER COLUMN password DROP NOT NULL,
  ALTER COLUMN telefone DROP NOT NULL,
  ALTER COLUMN cpf DROP NOT NULL;

-- Vincula linhas existentes ao Auth pelo e-mail
UPDATE public.usuarios u SET auth_id = a.id
FROM auth.users a
WHERE u.auth_id IS NULL AND lower(a.email) = lower(u.email);

-- Trigger de signup (a função handle_new_user é definida em 03/04)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (auth_id, email, nome, sobrenome, status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
          NEW.raw_user_meta_data->>'sobrenome', 'ativo');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Usuários do Auth que ainda não têm linha em usuarios
INSERT INTO public.usuarios (auth_id, email, nome, status)
SELECT a.id, a.email, COALESCE(a.raw_user_meta_data->>'nome', 'Estudante'), 'ativo'
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.auth_id = a.id);

-- Helper de admin (redefinido igual em 05)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.usuarios WHERE auth_id = auth.uid()),
    FALSE
  );
$$;

-- Políticas de usuarios / lojas / produtos ------------------------------
DROP POLICY IF EXISTS "usuarios_select_basico" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_read_if_dono_loja_ativa" ON public.usuarios;
CREATE POLICY "usuarios_read_if_dono_loja_ativa" ON public.usuarios FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lojas l WHERE l.usuario_id = usuarios.id AND l.status = 'ativo'));

DROP POLICY IF EXISTS "user_update_own" ON public.usuarios;
CREATE POLICY "user_update_own" ON public.usuarios FOR UPDATE
  USING (auth_id = (SELECT auth.uid()))
  WITH CHECK (auth_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "lojas_owner_manage" ON public.lojas;
CREATE POLICY "lojas_owner_manage" ON public.lojas FOR ALL
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "produtos_owner_manage" ON public.produtos;
CREATE POLICY "produtos_owner_manage" ON public.produtos FOR ALL
  USING (loja_id IN (SELECT id FROM public.lojas WHERE usuario_id IN
    (SELECT id FROM public.usuarios WHERE auth_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "lojas_admin_manage" ON public.lojas;
CREATE POLICY "lojas_admin_manage" ON public.lojas FOR ALL
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "produtos_admin_manage" ON public.produtos;
CREATE POLICY "produtos_admin_manage" ON public.produtos FOR ALL
  USING ((SELECT public.is_admin()));

-- Storage: troca as políticas provisórias abertas pelas de dono ---------
DROP POLICY IF EXISTS "tmp write lojas" ON storage.objects;
DROP POLICY IF EXISTS "tmp write produtos" ON storage.objects;
DROP POLICY IF EXISTS "owner_write_lojas" ON storage.objects;
DROP POLICY IF EXISTS "owner_write_produtos" ON storage.objects;
DROP POLICY IF EXISTS "admin_write_imagens" ON storage.objects;

CREATE POLICY "admin_write_imagens" ON storage.objects FOR ALL
  USING (bucket_id IN ('lojas', 'produtos') AND (SELECT public.is_admin()));

CREATE POLICY "owner_write_lojas" ON storage.objects FOR ALL
  USING (bucket_id = 'lojas' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.lojas WHERE usuario_id IN
      (SELECT id FROM public.usuarios WHERE auth_id = (SELECT auth.uid()))
  ));

CREATE POLICY "owner_write_produtos" ON storage.objects FOR ALL
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.produtos WHERE loja_id IN (
      SELECT id FROM public.lojas WHERE usuario_id IN
        (SELECT id FROM public.usuarios WHERE auth_id = (SELECT auth.uid()))
    )
  ));

NOTIFY pgrst, 'reload schema';
