-- Migração: remove a cor de tema por loja — todas as lojas seguem a identidade Circular.
-- Aplicada após o deploy do código sem cor_tema (commit 71a61b4).
ALTER TABLE public.lojas DROP COLUMN IF EXISTS cor_tema;

NOTIFY pgrst, 'reload schema';
