-- Migração: ajustes apontados pelo Security Advisor + regra de status da loja
-- 1) handle_new_user é função de trigger: não deve ser chamável via /rpc
-- 2) search_path fixo no trigger de proteção de usuarios
-- 3) Dono só alterna a loja entre ativo/pausado; reprovar/reativar loja
--    reprovada fica com o admin (antes o dono podia se reativar via API)

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.proteger_colunas_usuarios() SET search_path = public;

CREATE OR REPLACE FUNCTION public.proteger_status_loja()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('ativo', 'pausado', 'pendente') THEN
      NEW.status := 'pendente';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    OLD.status IN ('ativo', 'pausado') AND NEW.status IN ('ativo', 'pausado')
  ) THEN
    RAISE EXCEPTION 'Alteração de status da loja não permitida' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_status_loja ON public.lojas;
CREATE TRIGGER proteger_status_loja
  BEFORE INSERT OR UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.proteger_status_loja();
