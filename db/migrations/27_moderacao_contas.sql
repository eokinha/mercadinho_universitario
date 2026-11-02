-- Migração 27: moderação de contas (substitui a aprovação manual de matrícula na tela do admin)
--
-- A matrícula já é verificada pelo e-mail da faculdade, então /admin/verificacoes vira /admin/contas:
-- a equipe modera contas existentes em vez de aprovar matrículas.
--
-- 1. usuarios.bloqueado_ate: NULL com status 'bloqueado' = bloqueio sem prazo; com data = suspensão.
--    usuarios.moderacao_motivo: motivo que o próprio aluno vê no painel (até 300 caracteres).
--    Sem GRANT: só saem pelas RPCs.
-- 2. moderacoes_conta: histórico (quem, o quê, por quê, até quando). Só via RPC.
-- 3. admin_moderar_conta(p_usuario_id, p_acao, p_motivo, p_dias): 'suspender' (1 a 90 dias),
--    'bloquear' (sem prazo) ou 'reativar'. Motivo obrigatório para suspender e bloquear.
--    Não modera a própria conta nem a de outro admin. Tirar do ar = loja 'reprovado' e anúncios ativos pausados;
--    reativar = loja 'ativo' (os anúncios ficam pausados até o aluno reativar), como já era no bloqueio.
-- 4. privado.encerrar_suspensoes(): pg_cron de hora em hora reativa quem passou do prazo e registra no histórico.
-- 5. admin_listar_usuarios() ganha criado_em, bloqueado_ate, moderacao_motivo, anúncios ativos e denúncias abertas
--    contra o aluno; admin_historico_conta(p_usuario_id) devolve o histórico.
-- 6. minha_situacao_conta(): status, prazo e motivo para o aviso do painel do próprio aluno.
-- 7. exigir_aluno_ativo() diz até quando a conta está suspensa.
-- admin_definir_status_usuario sai (a tela usa admin_moderar_conta). admin_moderar_matricula continua no banco,
-- sem tela.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Colunas novas em usuarios
-- ---------------------------------------------------------------------------
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderacao_motivo TEXT;

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_moderacao_motivo_tamanho;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_moderacao_motivo_tamanho
  CHECK (moderacao_motivo IS NULL OR char_length(moderacao_motivo) <= 300);

-- ---------------------------------------------------------------------------
-- 2) Histórico de moderação
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderacoes_conta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  admin_id INT REFERENCES public.usuarios(id) ON DELETE SET NULL, -- NULL = automático (fim da suspensão)
  acao TEXT NOT NULL CHECK (acao IN ('suspender', 'bloquear', 'reativar', 'fim_suspensao')),
  motivo TEXT CHECK (motivo IS NULL OR char_length(motivo) <= 300),
  ate TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderacoes_conta_usuario_idx ON public.moderacoes_conta (usuario_id, criado_em DESC);
ALTER TABLE public.moderacoes_conta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderacoes_conta FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Aplicar o status (interno) e a RPC do admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION privado.aplicar_status_conta(
  p_usuario_id INT, p_status TEXT, p_ate TIMESTAMPTZ, p_motivo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuarios
  SET status = p_status,
      bloqueado_ate = CASE WHEN p_status = 'bloqueado' THEN p_ate END,
      moderacao_motivo = CASE WHEN p_status = 'bloqueado' THEN p_motivo END
  WHERE id = p_usuario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado.' USING ERRCODE = 'PT404';
  END IF;

  IF p_status = 'bloqueado' THEN
    UPDATE public.lojas SET status = 'reprovado' WHERE usuario_id = p_usuario_id;
    UPDATE public.produtos SET status = 'pausado'
    WHERE status = 'ativo'
      AND loja_id IN (SELECT id FROM public.lojas WHERE usuario_id = p_usuario_id);
  ELSE
    UPDATE public.lojas SET status = 'ativo'
    WHERE usuario_id = p_usuario_id AND status IN ('reprovado', 'pausado');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION privado.aplicar_status_conta(INT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_moderar_conta(
  p_usuario_id INT, p_acao TEXT, p_motivo TEXT DEFAULT NULL, p_dias INT DEFAULT NULL
)
RETURNS TIMESTAMPTZ -- fim da suspensão (NULL nos outros casos)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin INT := public.meu_usuario_id();
  v_motivo TEXT := NULLIF(trim(COALESCE(p_motivo, '')), '');
  v_ate TIMESTAMPTZ;
  v_alvo public.usuarios%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_acao NOT IN ('suspender', 'bloquear', 'reativar') THEN
    RAISE EXCEPTION 'Ação inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_alvo FROM public.usuarios WHERE id = p_usuario_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado.' USING ERRCODE = 'PT404';
  END IF;
  IF p_usuario_id = v_admin THEN
    RAISE EXCEPTION 'Você não pode moderar a própria conta.' USING ERRCODE = 'PT403';
  END IF;
  IF v_alvo.is_admin THEN
    RAISE EXCEPTION 'Contas da equipe não são moderadas por aqui.' USING ERRCODE = 'PT403';
  END IF;

  IF p_acao IN ('suspender', 'bloquear') THEN
    IF v_motivo IS NULL OR char_length(v_motivo) < 5 OR char_length(v_motivo) > 300 THEN
      RAISE EXCEPTION 'Escreva o motivo (de 5 a 300 caracteres). O aluno vê esse texto no painel.' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_acao = 'suspender' THEN
    IF p_dias IS NULL OR p_dias < 1 OR p_dias > 90 THEN
      RAISE EXCEPTION 'A suspensão vai de 1 a 90 dias.' USING ERRCODE = '22023';
    END IF;
    v_ate := now() + make_interval(days => p_dias);
    PERFORM privado.aplicar_status_conta(p_usuario_id, 'bloqueado', v_ate, v_motivo);
  ELSIF p_acao = 'bloquear' THEN
    PERFORM privado.aplicar_status_conta(p_usuario_id, 'bloqueado', NULL, v_motivo);
  ELSE
    IF v_alvo.status = 'ativo' THEN
      RAISE EXCEPTION 'A conta já está ativa.' USING ERRCODE = '22023';
    END IF;
    PERFORM privado.aplicar_status_conta(p_usuario_id, 'ativo', NULL, NULL);
  END IF;

  INSERT INTO public.moderacoes_conta (usuario_id, admin_id, acao, motivo, ate)
  VALUES (p_usuario_id, v_admin, p_acao, v_motivo, v_ate);

  RETURN v_ate;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Fim automático da suspensão
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION privado.encerrar_suspensoes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id INT;
  v_total INT := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM public.usuarios
    WHERE status = 'bloqueado' AND bloqueado_ate IS NOT NULL AND bloqueado_ate <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM privado.aplicar_status_conta(v_id, 'ativo', NULL, NULL);
    INSERT INTO public.moderacoes_conta (usuario_id, admin_id, acao) VALUES (v_id, NULL, 'fim_suspensao');
    v_total := v_total + 1;
  END LOOP;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION privado.encerrar_suspensoes() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Listagem e histórico para o admin
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_listar_usuarios();
CREATE FUNCTION public.admin_listar_usuarios()
RETURNS TABLE (
  id INT, nome VARCHAR, sobrenome VARCHAR, email VARCHAR, telefone VARCHAR, matricula VARCHAR,
  matricula_status VARCHAR, matricula_validada BOOLEAN, instituicoes_id INT, instituicao_nome VARCHAR,
  loja_id INT, status VARCHAR, is_admin BOOLEAN, criado_em TIMESTAMPTZ, bloqueado_ate TIMESTAMPTZ,
  moderacao_motivo TEXT, anuncios_ativos INT, denuncias_abertas INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.nome, u.sobrenome, u.email, u.telefone, u.matricula,
         u.matricula_status, u.matricula_validada, u.instituicoes_id, i.nome,
         l.id, u.status, u.is_admin, u.criado_em, u.bloqueado_ate, u.moderacao_motivo,
         (SELECT count(*)::INT FROM public.produtos p WHERE p.loja_id = l.id AND p.status = 'ativo'),
         -- Denúncias abertas contra o aluno: anúncio, perfil, resposta e mensagem guardam a loja dele;
         -- pergunta e avaliação, o autor do comentário
         (SELECT count(*)::INT FROM public.denuncias d
          WHERE d.status = 'aberta' AND (
            (d.alvo_tipo IN ('anuncio', 'perfil', 'resposta', 'mensagem') AND d.loja_id = l.id)
            OR (d.alvo_tipo = 'pergunta' AND EXISTS (
                  SELECT 1 FROM public.perguntas q WHERE q.id = d.pergunta_id AND q.autor_id = u.id))
            OR (d.alvo_tipo = 'avaliacao' AND EXISTS (
                  SELECT 1 FROM public.avaliacoes a WHERE a.id = d.avaliacao_id AND a.autor_id = u.id))
          ))
  FROM public.usuarios u
  LEFT JOIN public.instituicoes i ON i.id = u.instituicoes_id
  LEFT JOIN LATERAL (SELECT lj.id FROM public.lojas lj WHERE lj.usuario_id = u.id ORDER BY lj.id LIMIT 1) l ON TRUE
  ORDER BY u.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_historico_conta(p_usuario_id INT)
RETURNS TABLE (id BIGINT, acao TEXT, motivo TEXT, ate TIMESTAMPTZ, criado_em TIMESTAMPTZ, admin_nome TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.id, m.acao, m.motivo, m.ate, m.criado_em,
         CASE WHEN m.admin_id IS NULL THEN NULL ELSE trim(a.nome || ' ' || COALESCE(a.sobrenome, '')) END
  FROM public.moderacoes_conta m
  LEFT JOIN public.usuarios a ON a.id = m.admin_id
  WHERE m.usuario_id = p_usuario_id
  ORDER BY m.criado_em DESC
  LIMIT 50;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Situação da própria conta (aviso no painel)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.minha_situacao_conta()
RETURNS TABLE (status VARCHAR, bloqueado_ate TIMESTAMPTZ, moderacao_motivo TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.status, u.bloqueado_ate, u.moderacao_motivo
  FROM public.usuarios u
  WHERE u.auth_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 7) Mensagem de conta fora do ar com o prazo da suspensão
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.exigir_aluno_ativo()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_status TEXT;
  v_ate TIMESTAMPTZ;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para continuar' USING ERRCODE = '42501';
  END IF;
  SELECT u.status, u.bloqueado_ate INTO v_status, v_ate FROM public.usuarios u WHERE u.id = v_usuario;
  IF v_status IS DISTINCT FROM 'ativo' THEN
    IF v_ate IS NOT NULL THEN
      RAISE EXCEPTION 'Sua conta está suspensa até %. Veja o motivo no seu painel.',
        to_char(v_ate AT TIME ZONE 'America/Bahia', 'DD/MM/YYYY "às" HH24:MI') USING ERRCODE = 'PT403';
    END IF;
    RAISE EXCEPTION 'Sua conta está bloqueada. Veja o motivo no seu painel.' USING ERRCODE = 'PT403';
  END IF;
  RETURN v_usuario;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Permissões
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_definir_status_usuario(INT, TEXT);

REVOKE ALL ON FUNCTION
  public.admin_moderar_conta(INT, TEXT, TEXT, INT),
  public.admin_listar_usuarios(),
  public.admin_historico_conta(INT),
  public.minha_situacao_conta()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.admin_moderar_conta(INT, TEXT, TEXT, INT),
  public.admin_listar_usuarios(),
  public.admin_historico_conta(INT),
  public.minha_situacao_conta()
TO authenticated;

COMMIT;

-- Fim da suspensão de hora em hora (fora da transação, como na migração 26)
SELECT cron.schedule('circular-fim-suspensoes', '7 * * * *', $$SELECT privado.encerrar_suspensoes()$$);
