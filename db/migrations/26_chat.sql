-- Migração 26: chat em tempo real (Supabase Realtime Broadcast + Postgres), WhatsApp opcional,
-- retenção de conteúdo e registros de acesso (Marco Civil)
--
-- 1. WhatsApp deixa de ser obrigatório: publicar não exige telefone, o vendedor pode apagar o número
--    com anúncio ativo e a avaliação vale para quem chamou no WhatsApp ou abriu conversa no chat.
--    anuncio_leitura() e perfil_leitura() devolvem tem_whatsapp (o botão só aparece com número).
-- 2. conversas / mensagens: uma conversa por anúncio e comprador; escrita e leitura só por RPC.
--    O Postgres é a fonte da verdade; um trigger publica cada mensagem por realtime.send() em canais
--    privados:
--      conversa:{uuid}            mensagens, leitura e bloqueio (só o banco publica)
--      conversa:{uuid}:digitando  "digitando…" (os dois participantes publicam)
--      usuario:{id}               novas mensagens e não lidas do aluno (Navbar e lista)
--    A autorização dos canais é RLS em realtime.messages (pode_usar_topico_realtime).
-- 3. Sem moderação: qualquer participante denuncia uma mensagem (alvo_tipo 'mensagem'). A denúncia guarda
--    uma cópia da conversa até aquele momento (privado.denuncia_conversa). O admin não tem acesso às
--    tabelas do chat: só lê essa cópia por admin_ler_conversa_denunciada(), e cada leitura fica auditada.
-- 4. Retenção (prazos em privado.config, job diário do pg_cron):
--      conversa sem mensagem nova há 30 dias -> apagada (exceto com denúncia aberta)
--      conta excluída -> conteúdo some do site na hora; a cópia em privado.conteudo_retido dura 30 dias
--      denúncia de mensagem resolvida/descartada -> cópia da conversa apagada 30 dias depois
--      registros de acesso (IP, data e hora; Marco Civil, art. 15) -> 180 dias (mínimo legal de 6 meses)

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Prazos de retenção
-- ---------------------------------------------------------------------------

INSERT INTO privado.config (chave, valor) VALUES
  ('retencao_conteudo_dias', '30'),
  ('retencao_registros_acesso_dias', '180')
ON CONFLICT (chave) DO NOTHING;

CREATE OR REPLACE FUNCTION privado.dias_retencao(p_chave text)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = privado
AS $$
  SELECT valor::int FROM privado.config WHERE chave = p_chave;
$$;
REVOKE ALL ON FUNCTION privado.dias_retencao(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) WhatsApp opcional
-- ---------------------------------------------------------------------------

-- Igual à versão da migração 18, sem a exigência de WhatsApp para publicar
CREATE OR REPLACE FUNCTION public.exigir_vendedor_verificado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_validada BOOLEAN;
  v_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.renovado_em := now();
  ELSIF NEW.renovado_em IS DISTINCT FROM OLD.renovado_em
     OR (NEW.status = 'ativo' AND OLD.status IS DISTINCT FROM 'ativo') THEN
    NEW.renovado_em := now();
  END IF;

  IF NEW.status = 'vendido' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'vendido' THEN
      NEW.vendido_em := now();
    ELSE
      NEW.vendido_em := OLD.vendido_em;
    END IF;
  ELSE
    NEW.vendido_em := NULL;
  END IF;

  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.destaque := FALSE;
  ELSE
    NEW.destaque := OLD.destaque;
  END IF;

  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ativo') THEN
    SELECT u.matricula_validada, u.status INTO v_validada, v_status FROM public.meu_usuario() u;

    IF v_status IS DISTINCT FROM 'ativo' THEN
      RAISE EXCEPTION 'Sua conta está bloqueada. Fale com o suporte.' USING ERRCODE = '42501';
    END IF;
    IF NOT COALESCE(v_validada, FALSE) THEN
      RAISE EXCEPTION 'Valide sua matrícula para publicar anúncios' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Igual à versão anterior, sem o bloqueio de apagar o WhatsApp com anúncio ativo
CREATE OR REPLACE FUNCTION public.proteger_status_loja()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'A loja é criada automaticamente no cadastro' USING ERRCODE = '42501';
  END IF;

  NEW.slug := OLD.slug;
  NEW.usuario_id := OLD.usuario_id;
  NEW.criado_em := OLD.criado_em;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    OLD.status IN ('ativo', 'pausado') AND NEW.status IN ('ativo', 'pausado')
  ) THEN
    RAISE EXCEPTION 'Alteração de status da loja não permitida' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Avaliação: mesma regra (registro em interesses), que agora nasce também ao abrir conversa no chat
CREATE OR REPLACE FUNCTION public.avaliar_vendedor(p_loja_id integer, p_nota integer, p_comentario text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_dono INT;
  v_comentario TEXT := NULLIF(btrim(COALESCE(p_comentario, '')), '');
  v_status TEXT;
  v_id BIGINT;
BEGIN
  SELECT usuario_id INTO v_dono FROM public.lojas WHERE id = p_loja_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.' USING ERRCODE = 'PT404';
  END IF;
  IF v_dono = v_usuario THEN
    RAISE EXCEPTION 'Você não pode avaliar o próprio perfil.' USING ERRCODE = 'PT403';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.interesses WHERE usuario_id = v_usuario AND loja_id = p_loja_id) THEN
    RAISE EXCEPTION 'Só quem já falou com este vendedor pelo Circular (chat ou WhatsApp) pode avaliar.' USING ERRCODE = 'PT403';
  END IF;
  IF p_nota IS NULL OR p_nota NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Escolha uma nota de 1 a 5.' USING ERRCODE = '22023';
  END IF;

  v_status := CASE WHEN v_comentario IS NULL THEN 'aprovado' ELSE 'pendente' END;

  INSERT INTO public.avaliacoes (loja_id, autor_id, nota, comentario, status, moderado_em)
  VALUES (p_loja_id, v_usuario, p_nota, v_comentario, v_status, CASE WHEN v_status = 'aprovado' THEN now() END)
  ON CONFLICT (loja_id, autor_id) DO UPDATE
    SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, status = EXCLUDED.status,
        moderacao_id = NULL, moderado_em = EXCLUDED.moderado_em, atualizado_em = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;

-- anuncio_leitura (migração 22) + tem_whatsapp
CREATE OR REPLACE FUNCTION public.anuncio_leitura(p_id integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meu_id INT;
  v_meu_campus INT;
  v_produto public.produtos%ROWTYPE;
  v_loja public.lojas%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_categoria TEXT;
  v_instituicao TEXT;
  v_eh_dono BOOLEAN;
  v_disponivel BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver anúncios' USING ERRCODE = '42501';
  END IF;
  v_meu_id := public.meu_usuario_id();
  v_meu_campus := public.meu_campus_id();

  SELECT * INTO v_produto FROM public.produtos WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_loja FROM public.lojas WHERE id = v_produto.loja_id;
  SELECT * INTO v_usuario FROM public.usuarios WHERE id = v_loja.usuario_id;

  v_eh_dono := COALESCE(v_loja.usuario_id = v_meu_id, FALSE);
  v_disponivel := v_produto.status = 'ativo'
    AND v_produto.renovado_em > now() - interval '60 days'
    AND v_loja.status = 'ativo';

  IF NOT v_disponivel AND NOT v_eh_dono THEN
    RETURN jsonb_build_object(
      'disponivel', FALSE,
      'eh_dono', FALSE,
      'anuncio', jsonb_build_object('id', v_produto.id, 'nome', v_produto.nome),
      'loja', CASE WHEN v_loja.status = 'ativo'
        THEN jsonb_build_object('slug', v_loja.slug, 'nome', v_loja.nome) END
    );
  END IF;

  SELECT nome INTO v_categoria FROM public.categorias WHERE id = v_produto.categoria_id;
  SELECT nome INTO v_instituicao FROM public.instituicoes WHERE id = v_usuario.instituicoes_id;

  RETURN jsonb_build_object(
    'disponivel', v_disponivel,
    'eh_dono', v_eh_dono,
    'mesmo_campus', COALESCE(v_usuario.instituicoes_id = v_meu_campus, FALSE),
    'tem_whatsapp', COALESCE(length(v_loja.contato) >= 12, FALSE),
    'codigo_compartilhamento', v_loja.codigo_compartilhamento,
    'favoritado', EXISTS (SELECT 1 FROM public.favoritos f WHERE f.usuario_id = v_meu_id AND f.produto_id = v_produto.id),
    'anuncio', jsonb_build_object(
      'id', v_produto.id,
      'nome', v_produto.nome,
      'descricao', v_produto.descricao,
      'preco', v_produto.preco,
      'imagem_url', v_produto.imagem_url,
      'categoria_id', v_produto.categoria_id,
      'categoria_nome', v_categoria,
      'aceita_troca', v_produto.aceita_troca,
      'destaque', v_produto.destaque,
      'status', v_produto.status,
      'criado_em', v_produto.criado_em,
      'renovado_em', v_produto.renovado_em
    ),
    'loja', jsonb_build_object(
      'id', v_loja.id,
      'slug', v_loja.slug,
      'nome', v_loja.nome,
      'descricao', v_loja.descricao,
      'avatar_url', v_loja.avatar_url,
      'locais_entrega', COALESCE(to_jsonb(v_loja.locais_entrega), '[]'::jsonb),
      'verificada', v_usuario.matricula_status = 'verificado',
      'instituicao_nome', v_instituicao
    ),
    'outros', COALESCE((
      SELECT jsonb_agg(o ORDER BY (o->>'criado_em') DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'loja_id', p.loja_id,
          'nome', p.nome,
          'descricao', p.descricao,
          'preco', p.preco,
          'imagem_url', p.imagem_url,
          'categoria_id', p.categoria_id,
          'categoria_nome', c.nome,
          'loja_nome', v_loja.nome,
          'loja_descricao', v_loja.descricao,
          'loja_avatar_url', v_loja.avatar_url,
          'destaque', p.destaque,
          'aceita_troca', p.aceita_troca,
          'loja_verificada', v_usuario.matricula_status = 'verificado',
          'criado_em', p.criado_em
        ) AS o
        FROM public.produtos p
        JOIN public.categorias c ON c.id = p.categoria_id
        WHERE p.loja_id = v_loja.id
          AND p.id <> v_produto.id
          AND p.status = 'ativo'
          AND p.renovado_em > now() - interval '60 days'
          AND v_loja.status = 'ativo'
        ORDER BY p.criado_em DESC
        LIMIT 8
      ) s
    ), '[]'::jsonb)
  );
END;
$$;

-- perfil_leitura (migração 21) + tem_whatsapp
CREATE OR REPLACE FUNCTION public.perfil_leitura(p_id_ou_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meu_campus INT;
  v_meu_id INT;
  v_loja public.lojas%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_instituicao TEXT;
  v_eh_dono BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver perfis' USING ERRCODE = '42501';
  END IF;
  v_meu_campus := public.meu_campus_id();
  v_meu_id := public.meu_usuario_id();

  IF p_id_ou_slug ~ '^[0-9]{1,9}$' THEN
    SELECT * INTO v_loja FROM public.lojas WHERE id = p_id_ou_slug::int AND status = 'ativo';
  ELSE
    SELECT * INTO v_loja FROM public.lojas WHERE slug = p_id_ou_slug AND status = 'ativo';
  END IF;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_usuario FROM public.usuarios WHERE id = v_loja.usuario_id;
  SELECT nome INTO v_instituicao FROM public.instituicoes WHERE id = v_usuario.instituicoes_id;
  v_eh_dono := v_loja.usuario_id = v_meu_id;

  RETURN jsonb_build_object(
    'mesmo_campus', COALESCE(v_usuario.instituicoes_id = v_meu_campus, FALSE),
    'eh_dono', COALESCE(v_eh_dono, FALSE),
    'tem_whatsapp', COALESCE(length(v_loja.contato) >= 12, FALSE),
    'codigo_compartilhamento', v_loja.codigo_compartilhamento,
    'perfil', jsonb_build_object(
      'id', v_loja.id,
      'usuario_id', v_loja.usuario_id,
      'nome', v_loja.nome,
      'descricao', COALESCE(v_loja.descricao, ''),
      'status', v_loja.status,
      'criado_em', v_loja.criado_em,
      'avatar_url', v_loja.avatar_url,
      'capa_url', v_loja.capa_url,
      'slug', v_loja.slug,
      'instagram_url', v_loja.instagram_url,
      'tiktok_url', v_loja.tiktok_url,
      'locais_entrega', COALESCE(to_jsonb(v_loja.locais_entrega), '[]'::jsonb),
      'usuario_criado_em', v_usuario.criado_em,
      'matricula_status', v_usuario.matricula_status,
      'instituicao_nome', v_instituicao
    ),
    'produtos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'loja_id', p.loja_id,
        'nome', p.nome,
        'descricao', p.descricao,
        'preco', p.preco,
        'imagem_url', p.imagem_url,
        'categoria_id', p.categoria_id,
        'categoria_nome', c.nome,
        'loja_nome', v_loja.nome,
        'loja_descricao', v_loja.descricao,
        'loja_avatar_url', v_loja.avatar_url,
        'destaque', p.destaque,
        'aceita_troca', p.aceita_troca,
        'loja_verificada', v_usuario.matricula_status = 'verificado'
      ) ORDER BY p.criado_em DESC)
      FROM public.produtos p
      JOIN public.categorias c ON c.id = p.categoria_id
      WHERE p.loja_id = v_loja.id
        AND p.status = 'ativo'
        AND p.renovado_em > now() - interval '60 days'
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Tabelas do chat
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id integer REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome text NOT NULL,                 -- cópia: o anúncio pode ser apagado
  loja_id integer NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  comprador_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  vendedor_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  ultima_mensagem_em timestamptz NOT NULL DEFAULT now(),
  bloqueada_por integer REFERENCES public.usuarios(id) ON DELETE SET NULL,
  oculta_comprador_em timestamptz,            -- "apagar conversa" de um lado; volta com mensagem nova
  oculta_vendedor_em timestamptz,
  CONSTRAINT conversas_participantes_distintos CHECK (comprador_id <> vendedor_id),
  CONSTRAINT conversas_produto_comprador_unico UNIQUE (produto_id, comprador_id)
);
CREATE INDEX IF NOT EXISTS conversas_comprador_idx ON public.conversas (comprador_id, ultima_mensagem_em DESC);
CREATE INDEX IF NOT EXISTS conversas_vendedor_idx ON public.conversas (vendedor_id, ultima_mensagem_em DESC);
CREATE INDEX IF NOT EXISTS conversas_ultima_idx ON public.conversas (ultima_mensagem_em);

CREATE TABLE IF NOT EXISTS public.mensagens (
  id bigserial PRIMARY KEY,
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  autor_id integer NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto text NOT NULL CONSTRAINT mensagens_texto_tamanho CHECK (char_length(btrim(texto)) BETWEEN 1 AND 2000),
  cliente_id uuid NOT NULL UNIQUE,            -- gerado no navegador: reenvio não duplica
  criado_em timestamptz NOT NULL DEFAULT now(),
  lida_em timestamptz,
  notificado_em timestamptz                   -- reservado para o push (OneSignal)
);
CREATE INDEX IF NOT EXISTS mensagens_conversa_idx ON public.mensagens (conversa_id, id DESC);
CREATE INDEX IF NOT EXISTS mensagens_nao_lidas_idx ON public.mensagens (conversa_id) WHERE lida_em IS NULL;
CREATE INDEX IF NOT EXISTS mensagens_autor_criado_idx ON public.mensagens (autor_id, criado_em);

ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversas, public.mensagens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mensagens_id_seq FROM PUBLIC, anon, authenticated;

-- Fora da API (schema privado)
CREATE TABLE IF NOT EXISTS privado.registros_acesso (
  id bigserial PRIMARY KEY,
  usuario_id integer,                         -- sem FK: o registro sobrevive à exclusão da conta
  auth_id uuid,
  evento text NOT NULL,
  ip text,
  user_agent text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registros_acesso_criado_idx ON privado.registros_acesso (criado_em);
CREATE INDEX IF NOT EXISTS registros_acesso_usuario_idx ON privado.registros_acesso (usuario_id, criado_em);

CREATE TABLE IF NOT EXISTS privado.conteudo_retido (
  id bigserial PRIMARY KEY,
  usuario_id integer NOT NULL,
  email text,
  nome text,
  conteudo jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS conteudo_retido_expira_idx ON privado.conteudo_retido (expira_em);

CREATE TABLE IF NOT EXISTS privado.denuncia_conversa (
  denuncia_id bigint PRIMARY KEY REFERENCES public.denuncias(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL,
  mensagem_id bigint NOT NULL,                -- a mensagem denunciada (a FK de denuncias some com a conversa)
  participantes jsonb NOT NULL,
  mensagens jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS privado.acessos_admin_chat (
  id bigserial PRIMARY KEY,
  admin_id integer NOT NULL,
  denuncia_id bigint NOT NULL,
  ip text,
  acessado_em timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ALL TABLES IN SCHEMA privado FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA privado FROM PUBLIC, anon, authenticated;

-- Denúncia de mensagem
ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS mensagem_id bigint REFERENCES public.mensagens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversa_id uuid,
  ADD COLUMN IF NOT EXISTS resolvida_em timestamptz;
ALTER TABLE public.denuncias DROP CONSTRAINT IF EXISTS denuncias_alvo_tipo_check;
ALTER TABLE public.denuncias ADD CONSTRAINT denuncias_alvo_tipo_check
  CHECK (alvo_tipo IN ('anuncio', 'perfil', 'pergunta', 'resposta', 'avaliacao', 'mensagem'));
CREATE INDEX IF NOT EXISTS denuncias_conversa_idx ON public.denuncias (conversa_id) WHERE conversa_id IS NOT NULL;
UPDATE public.denuncias SET resolvida_em = criado_em WHERE status <> 'aberta' AND resolvida_em IS NULL;

-- ---------------------------------------------------------------------------
-- 3) Registros de acesso (Marco Civil, art. 15)
-- ---------------------------------------------------------------------------

-- IP do aluno: as RPCs vêm direto do navegador, e o gateway do Supabase repassa os cabeçalhos
CREATE OR REPLACE FUNCTION privado.cabecalho(p_nome text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('request.headers', true), '')::json ->> p_nome;
$$;

CREATE OR REPLACE FUNCTION privado.ip_da_requisicao()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = privado
AS $$
  SELECT left(COALESCE(
    NULLIF(privado.cabecalho('cf-connecting-ip'), ''),
    NULLIF(btrim(split_part(privado.cabecalho('x-forwarded-for'), ',', 1)), ''),
    NULLIF(privado.cabecalho('x-real-ip'), '')
  ), 64);
$$;

-- Grava no máximo um registro por aluno, evento e IP a cada 10 minutos (mensagens seguidas não lotam a tabela)
CREATE OR REPLACE FUNCTION privado.registrar_acesso(p_usuario integer, p_evento text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = privado, public
AS $$
DECLARE
  v_ip TEXT := privado.ip_da_requisicao();
BEGIN
  IF EXISTS (
    SELECT 1 FROM privado.registros_acesso
    WHERE usuario_id = p_usuario AND evento = p_evento AND ip IS NOT DISTINCT FROM v_ip
      AND criado_em > now() - interval '10 minutes'
  ) THEN
    RETURN;
  END IF;
  INSERT INTO privado.registros_acesso (usuario_id, auth_id, evento, ip, user_agent)
  VALUES (p_usuario, auth.uid(), p_evento, v_ip, left(privado.cabecalho('user-agent'), 300));
END;
$$;

REVOKE ALL ON FUNCTION privado.cabecalho(text), privado.ip_da_requisicao(), privado.registrar_acesso(integer, text)
  FROM PUBLIC, anon, authenticated;

-- Chamada pelo navegador ao entrar (login); os eventos do chat são gravados pelas próprias RPCs
CREATE OR REPLACE FUNCTION public.registrar_acesso(p_evento text DEFAULT 'login')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
BEGIN
  IF v_usuario IS NULL OR p_evento NOT IN ('login', 'sessao') THEN
    RETURN;
  END IF;
  PERFORM privado.registrar_acesso(v_usuario, p_evento);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Helpers do chat e autorização dos canais do Realtime
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.participa_da_conversa(p_conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id = p_conversa_id AND public.meu_usuario_id() IN (c.comprador_id, c.vendedor_id)
  );
$$;

-- conversa:{uuid} e conversa:{uuid}:digitando para os participantes; usuario:{id} só para o próprio aluno
CREATE OR REPLACE FUNCTION public.pode_usar_topico_realtime(p_topico text, p_escrita boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partes TEXT[] := string_to_array(COALESCE(p_topico, ''), ':');
  v_uuid CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  IF v_partes[1] = 'conversa' AND v_partes[2] ~ v_uuid THEN
    IF array_length(v_partes, 1) = 2 THEN
      RETURN NOT p_escrita AND public.participa_da_conversa(v_partes[2]::uuid);
    ELSIF array_length(v_partes, 1) = 3 AND v_partes[3] = 'digitando' THEN
      RETURN public.participa_da_conversa(v_partes[2]::uuid);
    END IF;
  ELSIF v_partes[1] = 'usuario' AND array_length(v_partes, 1) = 2 THEN
    RETURN NOT p_escrita AND v_partes[2] = public.meu_usuario_id()::text;
  END IF;
  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS circular_realtime_receber ON realtime.messages;
CREATE POLICY circular_realtime_receber ON realtime.messages
  FOR SELECT TO authenticated
  USING (public.pode_usar_topico_realtime(realtime.topic(), false));

DROP POLICY IF EXISTS circular_realtime_enviar ON realtime.messages;
CREATE POLICY circular_realtime_enviar ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_usar_topico_realtime(realtime.topic(), true));

-- Mensagem em JSON (mesmo formato na RPC e no broadcast)
CREATE OR REPLACE FUNCTION public.mensagem_json(m public.mensagens)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', m.id, 'conversa_id', m.conversa_id, 'autor_id', m.autor_id, 'texto', m.texto,
    'cliente_id', m.cliente_id, 'criado_em', m.criado_em, 'lida_em', m.lida_em
  );
$$;

-- Cabeçalho da conversa visto por v_usuario (lista e tela da conversa)
CREATE OR REPLACE FUNCTION public.conversa_json(c public.conversas, v_usuario integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'papel', CASE WHEN c.comprador_id = v_usuario THEN 'comprador' ELSE 'vendedor' END,
    'produto', jsonb_build_object(
      'id', c.produto_id, 'nome', c.produto_nome, 'imagem_url', p.imagem_url, 'preco', p.preco
    ),
    'outro', jsonb_build_object(
      'loja_id', lo.id, 'nome', lo.nome, 'avatar_url', lo.avatar_url, 'slug', lo.slug,
      'ativo', uo.status = 'ativo'
    ),
    'ultima', (
      SELECT jsonb_build_object('texto', left(m.texto, 140), 'minha', m.autor_id = v_usuario, 'criado_em', m.criado_em)
      FROM public.mensagens m WHERE m.conversa_id = c.id ORDER BY m.id DESC LIMIT 1
    ),
    'nao_lidas', (
      SELECT count(*) FROM public.mensagens m
      WHERE m.conversa_id = c.id AND m.autor_id <> v_usuario AND m.lida_em IS NULL
    ),
    'bloqueada', c.bloqueada_por IS NOT NULL,
    'bloqueada_por_mim', COALESCE(c.bloqueada_por = v_usuario, FALSE),
    'ultima_mensagem_em', c.ultima_mensagem_em
  )
  FROM public.usuarios uo
  JOIN public.lojas lo ON lo.usuario_id = uo.id
  LEFT JOIN public.produtos p ON p.id = c.produto_id
  WHERE uo.id = CASE WHEN c.comprador_id = v_usuario THEN c.vendedor_id ELSE c.comprador_id END;
$$;

REVOKE ALL ON FUNCTION public.mensagem_json(public.mensagens), public.conversa_json(public.conversas, integer)
  FROM PUBLIC, anon, authenticated;

-- Broadcast de cada mensagem nova: tela da conversa e caixa de entrada dos dois participantes
CREATE OR REPLACE FUNCTION public.publicar_mensagem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversa public.conversas%ROWTYPE;
  v_msg JSONB := public.mensagem_json(NEW);
BEGIN
  SELECT * INTO v_conversa FROM public.conversas WHERE id = NEW.conversa_id;
  PERFORM realtime.send(v_msg, 'mensagem', 'conversa:' || NEW.conversa_id, true);
  PERFORM realtime.send(
    jsonb_build_object('conversa_id', NEW.conversa_id, 'mensagem_id', NEW.id, 'autor_id', NEW.autor_id,
                       'texto', left(NEW.texto, 140), 'criado_em', NEW.criado_em),
    'nova_mensagem', 'usuario:' || u, true)
  FROM unnest(ARRAY[v_conversa.comprador_id, v_conversa.vendedor_id]) AS u;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.publicar_mensagem() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mensagens_publicar ON public.mensagens;
CREATE TRIGGER mensagens_publicar AFTER INSERT ON public.mensagens
  FOR EACH ROW EXECUTE FUNCTION public.publicar_mensagem();

-- ---------------------------------------------------------------------------
-- 5) RPCs do chat
-- ---------------------------------------------------------------------------

-- Abre (ou reabre) a conversa do comprador com o vendedor de um anúncio disponível do mesmo campus.
-- Conta como interesse (habilita a avaliação) e entra no limite de 30 vendedores por 24h.
CREATE OR REPLACE FUNCTION public.iniciar_conversa(p_produto_id integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_produto public.produtos%ROWTYPE;
  v_dono INT;
  v_id UUID;
BEGIN
  SELECT * INTO v_produto FROM public.produtos WHERE id = p_produto_id;
  SELECT usuario_id INTO v_dono FROM public.lojas WHERE id = v_produto.loja_id;

  SELECT id INTO v_id FROM public.conversas WHERE produto_id = p_produto_id AND comprador_id = v_usuario;
  IF v_id IS NOT NULL THEN
    UPDATE public.conversas SET oculta_comprador_em = NULL WHERE id = v_id;
    RETURN v_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.produtos p JOIN public.lojas l ON l.id = p.loja_id
    WHERE p.id = p_produto_id AND p.status = 'ativo'
      AND p.renovado_em > now() - interval '60 days' AND l.status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Este anúncio não está mais disponível.' USING ERRCODE = 'PT404';
  END IF;
  IF v_dono = v_usuario THEN
    RAISE EXCEPTION 'Este anúncio é seu.' USING ERRCODE = 'PT403';
  END IF;
  IF public.campus_do_usuario(v_dono) IS DISTINCT FROM public.meu_campus_id() THEN
    RAISE EXCEPTION 'Este aluno é de outro campus. O contato é só entre alunos da mesma faculdade.' USING ERRCODE = 'PT403';
  END IF;
  IF (SELECT status FROM public.usuarios WHERE id = v_dono) IS DISTINCT FROM 'ativo' THEN
    RAISE EXCEPTION 'Este anúncio não está mais disponível.' USING ERRCODE = 'PT404';
  END IF;

  -- Mesmo limite anti-raspagem do contato_vendedor (migração 18)
  IF NOT EXISTS (
       SELECT 1 FROM public.interesses
       WHERE usuario_id = v_usuario AND loja_id = v_produto.loja_id AND criado_em > now() - interval '1 day'
     )
     AND (
       SELECT count(DISTINCT loja_id) FROM public.interesses
       WHERE usuario_id = v_usuario AND criado_em > now() - interval '1 day'
     ) >= 30 THEN
    RAISE EXCEPTION 'Você abriu contato com muitos vendedores hoje. Tente de novo amanhã.' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.conversas (produto_id, produto_nome, loja_id, comprador_id, vendedor_id)
  VALUES (p_produto_id, v_produto.nome, v_produto.loja_id, v_usuario, v_dono)
  ON CONFLICT (produto_id, comprador_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.conversas WHERE produto_id = p_produto_id AND comprador_id = v_usuario;
    RETURN v_id;
  END IF;

  INSERT INTO public.interesses (loja_id, produto_id, usuario_id) VALUES (v_produto.loja_id, p_produto_id, v_usuario);
  PERFORM privado.registrar_acesso(v_usuario, 'chat_conversa');
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enviar_mensagem(p_conversa_id uuid, p_texto text, p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_conversa public.conversas%ROWTYPE;
  v_outro INT;
  v_texto TEXT := btrim(COALESCE(p_texto, ''));
  v_msg public.mensagens%ROWTYPE;
BEGIN
  SELECT * INTO v_conversa FROM public.conversas
  WHERE id = p_conversa_id AND v_usuario IN (comprador_id, vendedor_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'PT404';
  END IF;

  -- Reenvio da mesma mensagem (rede caiu antes da resposta): devolve a que já foi gravada
  SELECT * INTO v_msg FROM public.mensagens WHERE cliente_id = p_cliente_id;
  IF FOUND THEN
    IF v_msg.autor_id <> v_usuario OR v_msg.conversa_id <> p_conversa_id THEN
      RAISE EXCEPTION 'Mensagem inválida.' USING ERRCODE = '22023';
    END IF;
    RETURN public.mensagem_json(v_msg);
  END IF;

  IF v_conversa.bloqueada_por IS NOT NULL THEN
    RAISE EXCEPTION '%', CASE WHEN v_conversa.bloqueada_por = v_usuario
      THEN 'Você bloqueou esta conversa. Desbloqueie para enviar mensagens.'
      ELSE 'Este aluno não recebe mais mensagens nesta conversa.' END
      USING ERRCODE = 'PT403';
  END IF;
  v_outro := CASE WHEN v_conversa.comprador_id = v_usuario THEN v_conversa.vendedor_id ELSE v_conversa.comprador_id END;
  IF (SELECT status FROM public.usuarios WHERE id = v_outro) IS DISTINCT FROM 'ativo' THEN
    RAISE EXCEPTION 'Este aluno não está mais disponível no Circular.' USING ERRCODE = 'PT403';
  END IF;
  IF char_length(v_texto) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'A mensagem precisa ter de 1 a 2000 caracteres.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.mensagens WHERE autor_id = v_usuario AND criado_em > now() - interval '1 minute') >= 20
     OR (SELECT count(*) FROM public.mensagens WHERE autor_id = v_usuario AND criado_em > now() - interval '1 day') >= 500 THEN
    RAISE EXCEPTION 'Você enviou muitas mensagens em pouco tempo. Espere um pouco.' USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.mensagens (conversa_id, autor_id, texto, cliente_id)
  VALUES (p_conversa_id, v_usuario, v_texto, p_cliente_id)
  RETURNING * INTO v_msg;

  UPDATE public.conversas
  SET ultima_mensagem_em = v_msg.criado_em, oculta_comprador_em = NULL, oculta_vendedor_em = NULL
  WHERE id = p_conversa_id;

  PERFORM privado.registrar_acesso(v_usuario, 'chat_mensagem');
  RETURN public.mensagem_json(v_msg);
END;
$$;

-- Caixa de entrada: só conversas com pelo menos uma mensagem e não apagadas pelo próprio aluno
CREATE OR REPLACE FUNCTION public.minhas_conversas()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver suas mensagens' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(x ORDER BY (x->>'ultima_mensagem_em') DESC)
    FROM (
      SELECT public.conversa_json(c, v_usuario) AS x
      FROM public.conversas c
      WHERE ((c.comprador_id = v_usuario AND (c.oculta_comprador_em IS NULL OR c.ultima_mensagem_em > c.oculta_comprador_em))
          OR (c.vendedor_id = v_usuario AND (c.oculta_vendedor_em IS NULL OR c.ultima_mensagem_em > c.oculta_vendedor_em)))
        AND EXISTS (SELECT 1 FROM public.mensagens m WHERE m.conversa_id = c.id)
      ORDER BY c.ultima_mensagem_em DESC
      LIMIT 100
    ) s
    WHERE x IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

-- Tela da conversa: cabeçalho + as 50 últimas mensagens (em ordem de envio)
CREATE OR REPLACE FUNCTION public.conversa_leitura(p_conversa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_conversa public.conversas%ROWTYPE;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para ver suas mensagens' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_conversa FROM public.conversas
  WHERE id = p_conversa_id AND v_usuario IN (comprador_id, vendedor_id);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN public.conversa_json(v_conversa, v_usuario) || jsonb_build_object(
    'meu_id', v_usuario,
    'mensagens', COALESCE((
      SELECT jsonb_agg(public.mensagem_json(m) ORDER BY m.id)
      FROM (SELECT * FROM public.mensagens WHERE conversa_id = p_conversa_id ORDER BY id DESC LIMIT 50) m
    ), '[]'::jsonb),
    'tem_mais', (SELECT count(*) > 50 FROM (SELECT 1 FROM public.mensagens WHERE conversa_id = p_conversa_id LIMIT 51) t)
  );
END;
$$;

-- Paginação: p_antes = mensagens anteriores (50); p_depois = o que chegou desde o último id (reconexão)
CREATE OR REPLACE FUNCTION public.mensagens_da_conversa(p_conversa_id uuid, p_antes bigint DEFAULT NULL, p_depois bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.participa_da_conversa(p_conversa_id) THEN
    RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'PT404';
  END IF;

  IF p_depois IS NOT NULL THEN
    RETURN COALESCE((
      SELECT jsonb_agg(public.mensagem_json(m) ORDER BY m.id)
      FROM (SELECT * FROM public.mensagens WHERE conversa_id = p_conversa_id AND id > p_depois ORDER BY id LIMIT 200) m
    ), '[]'::jsonb);
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(public.mensagem_json(m) ORDER BY m.id)
    FROM (
      SELECT * FROM public.mensagens
      WHERE conversa_id = p_conversa_id AND (p_antes IS NULL OR id < p_antes)
      ORDER BY id DESC LIMIT 50
    ) m
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_conversa_lida(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_ate BIGINT;
BEGIN
  IF v_usuario IS NULL OR NOT public.participa_da_conversa(p_conversa_id) THEN
    RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'PT404';
  END IF;

  WITH lidas AS (
    UPDATE public.mensagens SET lida_em = now()
    WHERE conversa_id = p_conversa_id AND autor_id <> v_usuario AND lida_em IS NULL
    RETURNING id
  )
  SELECT max(id) INTO v_ate FROM lidas;

  IF v_ate IS NOT NULL THEN
    PERFORM realtime.send(jsonb_build_object('leitor_id', v_usuario, 'ate_id', v_ate),
                          'lida', 'conversa:' || p_conversa_id, true);
    PERFORM realtime.send(jsonb_build_object('conversa_id', p_conversa_id),
                          'conversa_lida', 'usuario:' || v_usuario, true);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.contar_mensagens_nao_lidas()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.mensagens m
  JOIN public.conversas c ON c.id = m.conversa_id
  WHERE public.meu_usuario_id() IN (c.comprador_id, c.vendedor_id)
    AND m.autor_id <> public.meu_usuario_id()
    AND m.lida_em IS NULL;
$$;

-- "Apagar conversa" só da própria caixa de entrada (volta se chegar mensagem nova)
CREATE OR REPLACE FUNCTION public.ocultar_conversa(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
BEGIN
  UPDATE public.conversas
  SET oculta_comprador_em = CASE WHEN comprador_id = v_usuario THEN now() ELSE oculta_comprador_em END,
      oculta_vendedor_em = CASE WHEN vendedor_id = v_usuario THEN now() ELSE oculta_vendedor_em END
  WHERE id = p_conversa_id AND v_usuario IN (comprador_id, vendedor_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'PT404';
  END IF;
END;
$$;

-- Bloquear: ninguém envia mais nada na conversa; só quem bloqueou desbloqueia
CREATE OR REPLACE FUNCTION public.bloquear_conversa(p_conversa_id uuid, p_bloquear boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_conversa public.conversas%ROWTYPE;
BEGIN
  SELECT * INTO v_conversa FROM public.conversas
  WHERE id = p_conversa_id AND v_usuario IN (comprador_id, vendedor_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversa não encontrada.' USING ERRCODE = 'PT404';
  END IF;

  IF p_bloquear THEN
    IF v_conversa.bloqueada_por IS NULL THEN
      UPDATE public.conversas SET bloqueada_por = v_usuario WHERE id = p_conversa_id;
    END IF;
  ELSIF v_conversa.bloqueada_por = v_usuario THEN
    UPDATE public.conversas SET bloqueada_por = NULL WHERE id = p_conversa_id;
  ELSIF v_conversa.bloqueada_por IS NOT NULL THEN
    RAISE EXCEPTION 'Só quem bloqueou pode desbloquear.' USING ERRCODE = 'PT403';
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('bloqueada_por', (SELECT bloqueada_por FROM public.conversas WHERE id = p_conversa_id)),
    'bloqueio', 'conversa:' || p_conversa_id, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) Denúncia de mensagem e leitura pelo admin (só da cópia da conversa denunciada)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.denunciar_mensagem(p_mensagem_id bigint, p_motivo text, p_detalhes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.exigir_aluno_ativo();
  v_msg public.mensagens%ROWTYPE;
  v_conversa public.conversas%ROWTYPE;
  v_loja_autor public.lojas%ROWTYPE;
  v_denuncia BIGINT;
BEGIN
  IF p_motivo NOT IN ('proibido', 'golpe', 'ofensivo', 'falso', 'outro') THEN
    RAISE EXCEPTION 'Motivo inválido' USING ERRCODE = '22023';
  END IF;

  SELECT m.* INTO v_msg FROM public.mensagens m
  JOIN public.conversas c ON c.id = m.conversa_id
  WHERE m.id = p_mensagem_id AND v_usuario IN (c.comprador_id, c.vendedor_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensagem não encontrada.' USING ERRCODE = 'PT404';
  END IF;
  IF v_msg.autor_id = v_usuario THEN
    RAISE EXCEPTION 'Você não pode denunciar a própria mensagem.' USING ERRCODE = 'PT403';
  END IF;
  IF EXISTS (SELECT 1 FROM public.denuncias WHERE denunciante_id = v_usuario AND mensagem_id = p_mensagem_id AND status = 'aberta') THEN
    RAISE EXCEPTION 'Você já denunciou esta mensagem. A equipe vai analisar.' USING ERRCODE = 'PT429';
  END IF;
  IF (SELECT count(*) FROM public.denuncias
      WHERE denunciante_id = v_usuario AND criado_em > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Você atingiu o limite de denúncias de hoje. Tente amanhã.' USING ERRCODE = 'PT429';
  END IF;

  SELECT * INTO v_conversa FROM public.conversas WHERE id = v_msg.conversa_id;
  SELECT * INTO v_loja_autor FROM public.lojas WHERE usuario_id = v_msg.autor_id;

  INSERT INTO public.denuncias
    (denunciante_id, loja_id, produto_id, mensagem_id, conversa_id, alvo_tipo, alvo_descricao, conteudo, motivo, detalhes)
  VALUES (
    v_usuario, v_loja_autor.id, v_conversa.produto_id, v_msg.id, v_conversa.id, 'mensagem',
    'Mensagem de ' || COALESCE(v_loja_autor.nome, 'aluno') || ' no chat sobre ' || v_conversa.produto_nome,
    left(v_msg.texto, 500), p_motivo, NULLIF(left(trim(COALESCE(p_detalhes, '')), 1000), '')
  )
  RETURNING id INTO v_denuncia;

  -- Cópia da conversa até agora (últimas 500 mensagens): prova que sobrevive à exclusão da conversa ou da conta
  INSERT INTO privado.denuncia_conversa (denuncia_id, conversa_id, mensagem_id, participantes, mensagens)
  SELECT v_denuncia, v_conversa.id, v_msg.id,
    (SELECT jsonb_agg(jsonb_build_object(
        'usuario_id', u.id, 'papel', CASE WHEN u.id = v_conversa.comprador_id THEN 'comprador' ELSE 'vendedor' END,
        'nome', trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), 'email', u.email, 'nome_publico', l.nome))
     FROM public.usuarios u LEFT JOIN public.lojas l ON l.usuario_id = u.id
     WHERE u.id IN (v_conversa.comprador_id, v_conversa.vendedor_id)),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'autor_id', m.autor_id, 'texto', m.texto, 'criado_em', m.criado_em)
                                ORDER BY m.id)
              FROM (SELECT * FROM public.mensagens WHERE conversa_id = v_conversa.id ORDER BY id DESC LIMIT 500) m),
             '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ler_conversa_denunciada(p_denuncia_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copia privado.denuncia_conversa%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_copia FROM privado.denuncia_conversa WHERE denuncia_id = p_denuncia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A conversa desta denúncia não está mais disponível.' USING ERRCODE = 'PT404';
  END IF;

  INSERT INTO privado.acessos_admin_chat (admin_id, denuncia_id, ip)
  VALUES (public.meu_usuario_id(), p_denuncia_id, privado.ip_da_requisicao());

  RETURN jsonb_build_object(
    'participantes', v_copia.participantes,
    'mensagens', v_copia.mensagens,
    'mensagem_denunciada_id', v_copia.mensagem_id,
    'copiada_em', v_copia.criado_em
  );
END;
$$;

-- Resolver/descartar grava resolvida_em (conta o prazo de retenção da cópia da conversa)
CREATE OR REPLACE FUNCTION public.admin_resolver_denuncia(p_denuncia_id bigint, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('aberta', 'resolvida', 'descartada') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  UPDATE public.denuncias
  SET status = p_status, resolvida_em = CASE WHEN p_status = 'aberta' THEN NULL ELSE now() END
  WHERE id = p_denuncia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Denúncia % não encontrada', p_denuncia_id;
  END IF;
END;
$$;

-- Fila do admin: + mensagem_id e se a cópia da conversa ainda existe
DROP FUNCTION IF EXISTS public.admin_listar_denuncias();
CREATE FUNCTION public.admin_listar_denuncias()
RETURNS TABLE(id bigint, motivo text, detalhes text, status text, criado_em timestamptz, alvo_descricao text,
              loja_id integer, produto_id integer, denunciante_nome text, denunciante_email character varying,
              alvo_tipo text, pergunta_id bigint, avaliacao_id bigint, conteudo text, link text,
              comentario_no_ar boolean, mensagem_id bigint, tem_conversa boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.id, d.motivo, d.detalhes, d.status, d.criado_em, d.alvo_descricao, d.loja_id, d.produto_id,
         trim(u.nome || ' ' || COALESCE(u.sobrenome, '')), u.email,
         d.alvo_tipo, d.pergunta_id, d.avaliacao_id, d.conteudo,
         CASE
           WHEN d.produto_id IS NOT NULL THEN '/anuncio/' || d.produto_id
           WHEN d.loja_id IS NOT NULL THEN '/perfil/' || COALESCE(l.slug, d.loja_id::text)
         END,
         CASE d.alvo_tipo
           WHEN 'pergunta' THEN EXISTS (SELECT 1 FROM public.perguntas q WHERE q.id = d.pergunta_id AND q.status = 'aprovado')
           WHEN 'resposta' THEN EXISTS (SELECT 1 FROM public.perguntas q WHERE q.id = d.pergunta_id AND q.resposta_status = 'aprovado')
           WHEN 'avaliacao' THEN EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = d.avaliacao_id AND a.status = 'aprovado')
         END,
         d.mensagem_id,
         EXISTS (SELECT 1 FROM privado.denuncia_conversa dc WHERE dc.denuncia_id = d.id)
  FROM public.denuncias d
  LEFT JOIN public.usuarios u ON u.id = d.denunciante_id
  LEFT JOIN public.lojas l ON l.id = d.loja_id
  ORDER BY (d.status = 'aberta') DESC, d.criado_em DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Exclusão de conta: tudo some do site; cópia guardada 30 dias fora da API
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario INT := public.meu_usuario_id();
  v_auth UUID := auth.uid();
  v_loja INT;
BEGIN
  IF v_usuario IS NULL THEN
    RAISE EXCEPTION 'Faça login para excluir a conta' USING ERRCODE = '42501';
  END IF;
  IF (SELECT is_admin FROM public.usuarios WHERE id = v_usuario) THEN
    RAISE EXCEPTION 'Contas de administrador não podem ser excluídas por aqui';
  END IF;
  SELECT id INTO v_loja FROM public.lojas WHERE usuario_id = v_usuario;

  PERFORM privado.registrar_acesso(v_usuario, 'conta_excluida');

  INSERT INTO privado.conteudo_retido (usuario_id, email, nome, conteudo, expira_em)
  SELECT u.id, u.email, trim(u.nome || ' ' || COALESCE(u.sobrenome, '')),
    jsonb_build_object(
      'perfil', (SELECT jsonb_build_object('id', l.id, 'nome', l.nome, 'slug', l.slug, 'descricao', l.descricao, 'contato', l.contato)
                 FROM public.lojas l WHERE l.id = v_loja),
      'anuncios', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao,
                                                                'preco', p.preco, 'status', p.status, 'criado_em', p.criado_em))
                            FROM public.produtos p WHERE p.loja_id = v_loja), '[]'::jsonb),
      'perguntas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', q.id, 'produto_id', q.produto_id, 'texto', q.texto, 'criado_em', q.criado_em))
                             FROM public.perguntas q WHERE q.autor_id = v_usuario), '[]'::jsonb),
      'respostas', COALESCE((SELECT jsonb_agg(jsonb_build_object('pergunta_id', q.id, 'resposta', q.resposta, 'respondida_em', q.respondida_em))
                             FROM public.perguntas q JOIN public.produtos p ON p.id = q.produto_id
                             WHERE p.loja_id = v_loja AND q.resposta IS NOT NULL), '[]'::jsonb),
      'avaliacoes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'loja_id', a.loja_id, 'nota', a.nota,
                                                                  'comentario', a.comentario, 'criado_em', a.criado_em))
                              FROM public.avaliacoes a WHERE a.autor_id = v_usuario), '[]'::jsonb),
      'conversas', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                                'id', c.id, 'produto_nome', c.produto_nome, 'comprador_id', c.comprador_id,
                                'vendedor_id', c.vendedor_id, 'criado_em', c.criado_em,
                                'mensagens', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'autor_id', m.autor_id,
                                                                                          'texto', m.texto, 'criado_em', m.criado_em)
                                                                      ORDER BY m.id)
                                                       FROM public.mensagens m WHERE m.conversa_id = c.id), '[]'::jsonb)))
                             FROM public.conversas c WHERE v_usuario IN (c.comprador_id, c.vendedor_id)), '[]'::jsonb)
    ),
    now() + make_interval(days => privado.dias_retencao('retencao_conteudo_dias'))
  FROM public.usuarios u WHERE u.id = v_usuario;

  -- Conversas dos dois lados somem junto (mensagens em cascata)
  DELETE FROM public.conversas WHERE v_usuario IN (comprador_id, vendedor_id);
  DELETE FROM public.produtos WHERE loja_id = v_loja;
  DELETE FROM public.lojas WHERE usuario_id = v_usuario;
  DELETE FROM public.usuarios WHERE id = v_usuario;
  DELETE FROM auth.users WHERE id = v_auth;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Limpeza diária (pg_cron)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION privado.limpar_retencao()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, privado
AS $$
DECLARE
  v_conteudo INTERVAL := make_interval(days => privado.dias_retencao('retencao_conteudo_dias'));
  v_acesso INTERVAL := make_interval(days => privado.dias_retencao('retencao_registros_acesso_dias'));
BEGIN
  -- Conversa parada há mais de 30 dias (a não ser que tenha denúncia aberta)
  DELETE FROM public.conversas c
  WHERE c.ultima_mensagem_em < now() - v_conteudo
    AND NOT EXISTS (SELECT 1 FROM public.denuncias d WHERE d.conversa_id = c.id AND d.status = 'aberta');

  DELETE FROM privado.conteudo_retido WHERE expira_em < now();

  -- Denúncia de mensagem tratada há mais de 30 dias: apaga a cópia da conversa e o texto denunciado
  DELETE FROM privado.denuncia_conversa dc
  USING public.denuncias d
  WHERE d.id = dc.denuncia_id AND d.status <> 'aberta' AND d.resolvida_em < now() - v_conteudo;
  UPDATE public.denuncias SET conteudo = NULL
  WHERE alvo_tipo = 'mensagem' AND status <> 'aberta' AND resolvida_em < now() - v_conteudo AND conteudo IS NOT NULL;

  DELETE FROM privado.registros_acesso WHERE criado_em < now() - v_acesso;
  DELETE FROM privado.acessos_admin_chat WHERE acessado_em < now() - v_acesso;
END;
$$;
REVOKE ALL ON FUNCTION privado.limpar_retencao() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9) Permissões
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION
  public.registrar_acesso(text),
  public.participa_da_conversa(uuid),
  public.pode_usar_topico_realtime(text, boolean),
  public.iniciar_conversa(integer),
  public.enviar_mensagem(uuid, text, uuid),
  public.minhas_conversas(),
  public.conversa_leitura(uuid),
  public.mensagens_da_conversa(uuid, bigint, bigint),
  public.marcar_conversa_lida(uuid),
  public.contar_mensagens_nao_lidas(),
  public.ocultar_conversa(uuid),
  public.bloquear_conversa(uuid, boolean),
  public.denunciar_mensagem(bigint, text, text),
  public.admin_ler_conversa_denunciada(bigint),
  public.admin_resolver_denuncia(bigint, text),
  public.admin_listar_denuncias(),
  public.avaliar_vendedor(integer, integer, text),
  public.excluir_minha_conta()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.registrar_acesso(text),
  public.participa_da_conversa(uuid),
  public.pode_usar_topico_realtime(text, boolean),
  public.iniciar_conversa(integer),
  public.enviar_mensagem(uuid, text, uuid),
  public.minhas_conversas(),
  public.conversa_leitura(uuid),
  public.mensagens_da_conversa(uuid, bigint, bigint),
  public.marcar_conversa_lida(uuid),
  public.contar_mensagens_nao_lidas(),
  public.ocultar_conversa(uuid),
  public.bloquear_conversa(uuid, boolean),
  public.denunciar_mensagem(bigint, text, text),
  public.admin_ler_conversa_denunciada(bigint),
  public.admin_resolver_denuncia(bigint, text),
  public.admin_listar_denuncias(),
  public.avaliar_vendedor(integer, integer, text),
  public.excluir_minha_conta()
TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- 10) Agenda da limpeza (fora da transação: a extensão precisa existir antes do schedule)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('circular-retencao', '17 6 * * *', $$SELECT privado.limpar_retencao()$$);
