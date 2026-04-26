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
