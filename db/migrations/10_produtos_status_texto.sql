-- Migração: produtos.status passa de boolean para texto ('ativo' | 'pausado'),
-- como o código já usa. TRUE → 'ativo', FALSE → 'pausado'.
-- Leitura pública passa a exigir produto ativo (o dono continua vendo os pausados).

DROP POLICY IF EXISTS "produtos_select_de_lojas_ativas" ON public.produtos;
DROP POLICY IF EXISTS "produtos_public_read" ON public.produtos;

ALTER TABLE public.produtos ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.produtos
  ALTER COLUMN status TYPE VARCHAR
  USING (CASE WHEN status IS FALSE THEN 'pausado' ELSE 'ativo' END);
ALTER TABLE public.produtos
  ALTER COLUMN status SET DEFAULT 'ativo',
  ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_status_check;
ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_status_check CHECK (status IN ('ativo', 'pausado'));

CREATE POLICY "produtos_select_de_lojas_ativas" ON public.produtos FOR SELECT
  USING (status = 'ativo' AND EXISTS (
    SELECT 1 FROM public.lojas l WHERE l.id = produtos.loja_id AND l.status = 'ativo'
  ));

NOTIFY pgrst, 'reload schema';
