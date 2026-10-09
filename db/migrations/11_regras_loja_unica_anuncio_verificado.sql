-- Migração: regras de negócio revisadas
-- 1) Uma loja (perfil vendedor) por estudante
-- 2) Só estudante com matrícula validada publica/reativa anúncio (admin passa livre)
-- 3) "Aceita troca" ganha coluna própria; destaque = impulsionado na home

ALTER TABLE public.lojas DROP CONSTRAINT IF EXISTS lojas_usuario_id_key;
ALTER TABLE public.lojas ADD CONSTRAINT lojas_usuario_id_key UNIQUE (usuario_id);

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS aceita_troca BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.exigir_vendedor_verificado()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Vendedor não se impulsiona sozinho
  IF TG_OP = 'INSERT' THEN
    NEW.destaque := FALSE;
  ELSE
    NEW.destaque := OLD.destaque;
  END IF;

  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ativo')
     AND NOT COALESCE((SELECT matricula_validada FROM public.usuarios WHERE auth_id = auth.uid()), FALSE) THEN
    RAISE EXCEPTION 'Valide sua matrícula para publicar anúncios' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exigir_vendedor_verificado ON public.produtos;
CREATE TRIGGER exigir_vendedor_verificado
  BEFORE INSERT OR UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.exigir_vendedor_verificado();

NOTIFY pgrst, 'reload schema';
