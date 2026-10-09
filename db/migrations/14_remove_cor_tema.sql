-- Migração: remove a cor de tema por loja — todas as lojas seguem a identidade Circular.
-- Aplicar SÓ DEPOIS que o código sem cor_tema estiver em produção
-- (versões antigas do app ainda selecionam a coluna).
ALTER TABLE public.lojas DROP COLUMN IF EXISTS cor_tema;

NOTIFY pgrst, 'reload schema';
