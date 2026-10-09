-- Migração: regra de e-mail acadêmico compara só o domínio (parte após @)
-- Espelha src/lib/validacoes.ts (validarEmailUniversitario):
--   termina em .edu.br/.edu, contém .edu., começa com aluno.,
--   ou é (sub)domínio exato de unb.br, usp.br, ufmg.br, unijorge.com.br
-- Antes '%aluno.' nunca casava e '%usp.br' aceitava 'fakeusp.br'.

CREATE OR REPLACE FUNCTION public.email_academico(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  WITH d AS (SELECT split_part(lower(trim(p_email)), '@', 2) AS dominio)
  SELECT dominio <> '' AND (
    dominio LIKE '%.edu.br' OR dominio LIKE '%.edu'
    OR dominio LIKE '%.edu.%'
    OR dominio LIKE 'aluno.%'
    OR dominio IN ('unb.br', 'usp.br', 'ufmg.br', 'unijorge.com.br')
    OR dominio LIKE '%.unb.br' OR dominio LIKE '%.usp.br'
    OR dominio LIKE '%.ufmg.br' OR dominio LIKE '%.unijorge.com.br'
  )
  FROM d;
$$;

CREATE OR REPLACE FUNCTION public.verificar_matricula_por_email(
  p_matricula TEXT DEFAULT NULL,
  p_instituicoes_id INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;

  IF v_email IS NULL OR NOT public.email_academico(v_email) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.usuarios
  SET matricula_status = 'verificado',
      matricula_validada = TRUE,
      matricula = COALESCE(NULLIF(trim(p_matricula), ''), matricula),
      instituicoes_id = COALESCE(p_instituicoes_id, instituicoes_id)
  WHERE auth_id = auth.uid();

  RETURN FOUND;
END;
$$;
