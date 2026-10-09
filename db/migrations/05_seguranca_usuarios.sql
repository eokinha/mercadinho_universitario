-- Migração: endurecimento de segurança da tabela usuarios
-- 1) Usuário não pode se autoverificar nem se promover a admin
-- 2) Dados pessoais (email, cpf, telefone, matrícula, password) não ficam
--    legíveis pela API para outros usuários
-- 3) Verificação por e-mail e moderação passam a rodar no banco (RPC)

-- 1. Helper: o usuário logado é admin? ---------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.usuarios WHERE auth_id = auth.uid()),
    FALSE
  );
$$;

-- 2. Trigger que protege colunas sensíveis ------------------------------
-- Só se aplica a chamadas diretas da API (roles anon/authenticated).
-- Funções SECURITY DEFINER (trigger de signup, RPCs abaixo) rodam como o
-- dono e passam livremente.
CREATE OR REPLACE FUNCTION public.proteger_colunas_usuarios()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := FALSE;
    NEW.matricula_validada := FALSE;
    NEW.matricula_status := 'pendente';
    NEW.auth_id := auth.uid();
    NEW.email := COALESCE(auth.jwt() ->> 'email', NEW.email);
    RETURN NEW;
  END IF;

  NEW.is_admin := OLD.is_admin;
  NEW.auth_id := OLD.auth_id;
  NEW.email := OLD.email;
  -- Usuário só pode "rebaixar" a própria validação (ex.: ao reenviar matrícula)
  NEW.matricula_validada := OLD.matricula_validada AND NEW.matricula_validada;
  IF NEW.matricula_status IS DISTINCT FROM OLD.matricula_status
     AND NEW.matricula_status <> 'pendente' THEN
    NEW.matricula_status := OLD.matricula_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_colunas_usuarios ON public.usuarios;
CREATE TRIGGER proteger_colunas_usuarios
  BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.proteger_colunas_usuarios();

-- 3. Leitura: só colunas públicas pela API ------------------------------
DROP POLICY IF EXISTS "public_profile_read" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_read_own" ON public.usuarios;
CREATE POLICY "usuarios_read_own" ON public.usuarios FOR SELECT
  TO authenticated
  USING (auth_id = (SELECT auth.uid()));
-- "usuarios_read_if_dono_loja_ativa" continua valendo para os joins do catálogo.

REVOKE SELECT ON public.usuarios FROM anon, authenticated;
GRANT SELECT (id, auth_id, nome, sobrenome, instituicoes_id, matricula_status,
              matricula_validada, status, is_admin, criado_em)
  ON public.usuarios TO anon, authenticated;

-- 4. Dados completos do próprio usuário ---------------------------------
CREATE OR REPLACE FUNCTION public.meu_usuario()
RETURNS TABLE (
  id INT, nome VARCHAR, sobrenome VARCHAR, email VARCHAR, telefone VARCHAR,
  cpf VARCHAR, matricula VARCHAR, matricula_validada BOOLEAN,
  matricula_status VARCHAR, instituicoes_id INT, status VARCHAR, is_admin BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.nome, u.sobrenome, u.email, u.telefone, u.cpf::varchar, u.matricula,
         u.matricula_validada, u.matricula_status, u.instituicoes_id, u.status, u.is_admin
  FROM public.usuarios u
  WHERE u.auth_id = auth.uid();
$$;

-- 5. Verificação instantânea por e-mail acadêmico -----------------------
-- O e-mail vem do auth.users (confirmado), não do que o cliente envia.
CREATE OR REPLACE FUNCTION public.verificar_matricula_por_email(
  p_matricula TEXT DEFAULT NULL,
  p_instituicoes_id INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;

  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mesma regra de src/lib/validacoes.ts (validarEmailUniversitario)
  IF NOT (
    v_email LIKE '%.edu.br' OR v_email LIKE '%.edu' OR v_email LIKE '%aluno.'
    OR v_email LIKE '%unb.br' OR v_email LIKE '%usp.br' OR v_email LIKE '%ufmg.br'
    OR v_email LIKE '%unijorge.com.br' OR v_email LIKE '%.edu.%'
  ) THEN
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

-- 6. Moderação (somente admin) ------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_moderar_matricula(
  p_usuario_id INT,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('verificado', 'rejeitado') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.usuarios
  SET matricula_status = p_status,
      matricula_validada = (p_status = 'verificado')
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário % não encontrado', p_usuario_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_listar_usuarios()
RETURNS TABLE (
  id INT, nome VARCHAR, sobrenome VARCHAR, email VARCHAR, telefone VARCHAR,
  matricula VARCHAR, matricula_status VARCHAR, matricula_validada BOOLEAN,
  instituicoes_id INT, instituicao_nome VARCHAR, loja_id INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.nome, u.sobrenome, u.email, u.telefone, u.matricula,
         u.matricula_status, u.matricula_validada, u.instituicoes_id,
         i.nome, (SELECT l.id FROM public.lojas l WHERE l.usuario_id = u.id ORDER BY l.id LIMIT 1)
  FROM public.usuarios u
  LEFT JOIN public.instituicoes i ON i.id = u.instituicoes_id
  ORDER BY u.id DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.meu_usuario(), public.verificar_matricula_por_email(TEXT, INT),
  public.admin_moderar_matricula(INT, TEXT), public.admin_listar_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_usuario(), public.verificar_matricula_por_email(TEXT, INT),
  public.admin_moderar_matricula(INT, TEXT), public.admin_listar_usuarios() TO authenticated;

NOTIFY pgrst, 'reload schema';
