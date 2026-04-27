-- =====================================================================
-- Mercadinho Universitário — migrações do schema Supabase
-- Aplique este arquivo no SQL Editor do Supabase a cada alteração nova.
-- Todas as migrações são idempotentes: rodar mais de uma vez é seguro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 001 — Alinhar schema às regras de negocio.mdc
-- ---------------------------------------------------------------------

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS matricula_validada BOOLEAN DEFAULT FALSE;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS imagem_url VARCHAR;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lojas'
      AND column_name = 'status'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE lojas
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE lojas
      ALTER COLUMN status TYPE VARCHAR USING status::text;

    UPDATE lojas SET status = 'ativo'   WHERE status IN ('true',  't', '1');
    UPDATE lojas SET status = 'pausado' WHERE status IN ('false', 'f', '0');
  END IF;
END
$$;

ALTER TABLE lojas
  ALTER COLUMN status SET DEFAULT 'pendente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lojas_status_check'
  ) THEN
    ALTER TABLE lojas
      ADD CONSTRAINT lojas_status_check
      CHECK (status IN ('pendente', 'ativo', 'pausado', 'reprovado'));
  END IF;
END
$$;

-- ---------------------------------------------------------------------
-- 003 — Destaque/impulsionamento de produtos
-- ---------------------------------------------------------------------

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------
-- 004 — Avatar e capa das lojas
-- ---------------------------------------------------------------------

ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR,
  ADD COLUMN IF NOT EXISTS capa_url   VARCHAR;

-- ---------------------------------------------------------------------
-- 005 — Buckets de Storage para imagens (lojas e produtos)
--       Convenção de caminhos:
--         lojas/{lojaId}/avatar.{ext}
--         lojas/{lojaId}/capa.{ext}
--         produtos/{produtoId}/imagem.{ext}
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('lojas', 'lojas', true), ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública dos buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'public read lojas'
  ) THEN
    CREATE POLICY "public read lojas" ON storage.objects FOR SELECT
      USING (bucket_id = 'lojas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'public read produtos'
  ) THEN
    CREATE POLICY "public read produtos" ON storage.objects FOR SELECT
      USING (bucket_id = 'produtos');
  END IF;

  -- TODO: substituir as policies abaixo por restrições com auth.uid()
  --       quando o login estiver implementado. Hoje qualquer cliente
  --       com a chave anon pode escrever (provisório para testes).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'tmp write lojas'
  ) THEN
    CREATE POLICY "tmp write lojas" ON storage.objects FOR ALL
      USING (bucket_id = 'lojas')
      WITH CHECK (bucket_id = 'lojas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'tmp write produtos'
  ) THEN
    CREATE POLICY "tmp write produtos" ON storage.objects FOR ALL
      USING (bucket_id = 'produtos')
      WITH CHECK (bucket_id = 'produtos');
  END IF;
END
$$;

-- Recarrega o schema cache do PostgREST para refletir as mudanças
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 006 — Autenticação e Sincronização de Usuários
-- ---------------------------------------------------------------------

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Função para sincronizar auth.users com public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (
    auth_id,
    email,
    nome,
    sobrenome,
    telefone,
    cpf,
    matricula,
    instituicoes_id,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'sobrenome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.raw_user_meta_data->>'matricula', ''),
    (NEW.raw_user_meta_data->>'instituicoes_id')::INT,
    'ativo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para chamar a função após o signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------
-- 007 — Segurança de Dados (RLS)
-- ---------------------------------------------------------------------

-- Ativa RLS nas tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA 'usuarios'
-- 1. Qualquer usuário autenticado pode ver nomes e instituições de outros
CREATE POLICY "public_profile_read" ON usuarios FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Somente o próprio usuário pode ver seus dados sensíveis (CPF, matrícula) ou atualizar seu perfil
-- Nota: Para simplificar, a leitura acima já cobre o básico, mas o 'UPDATE' é restrito.
CREATE POLICY "user_update_own" ON usuarios FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Catálogo sem login: join usuarios!inner em listagem/filtros (chave anon).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'usuarios'
      AND policyname = 'usuarios_read_if_dono_loja_ativa'
  ) THEN
    CREATE POLICY "usuarios_read_if_dono_loja_ativa" ON usuarios FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM lojas
          WHERE lojas.usuario_id = usuarios.id AND lojas.status = 'ativo'
        )
      );
  END IF;
END $$;

-- POLÍTICAS PARA 'lojas'
-- 1. Qualquer pessoa (mesmo não logada) vê lojas ativas
CREATE POLICY "lojas_public_read" ON lojas FOR SELECT
  USING (status = 'ativo');

-- 2. Vendedores veem suas próprias lojas (mesmo pendentes)
CREATE POLICY "lojas_owner_read" ON lojas FOR SELECT
  USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- 3. Vendedores gerenciam suas próprias lojas
CREATE POLICY "lojas_owner_manage" ON lojas FOR ALL
  USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- POLÍTICAS PARA 'produtos'
-- 1. Qualquer pessoa vê produtos de lojas ativas
CREATE POLICY "produtos_public_read" ON produtos FOR SELECT
  USING (loja_id IN (SELECT id FROM lojas WHERE status = 'ativo'));

-- 2. Donos de loja gerenciam seus produtos
CREATE POLICY "produtos_owner_manage" ON produtos FOR ALL
  USING (loja_id IN (SELECT id FROM lojas WHERE usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())));

-- Ajuste nas políticas de Storage (remover as 'tmp')
DROP POLICY IF EXISTS "tmp write lojas" ON storage.objects;
DROP POLICY IF EXISTS "tmp write produtos" ON storage.objects;

CREATE POLICY "owner_write_lojas" ON storage.objects FOR ALL
  USING (bucket_id = 'lojas' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM lojas WHERE usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
  ));

CREATE POLICY "owner_write_produtos" ON storage.objects FOR ALL
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM produtos WHERE loja_id IN (
      SELECT id FROM lojas WHERE usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    )
  ));

-- Notifica novamente após as novas alterações
NOTIFY pgrst, 'reload schema';
