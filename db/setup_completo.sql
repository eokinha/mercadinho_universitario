-- =====================================================================
-- Mercadinho Universitário — Setup Completo do Banco de Dados
-- Aplique este arquivo no SQL Editor do Supabase para configurar tudo.
-- =====================================================================

-- 1) Extensões (opcional, mas recomendado)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Tabelas Base ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.instituicoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR NOT NULL,
  cnpj VARCHAR(14) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id SERIAL PRIMARY KEY,
  auth_id UUID UNIQUE,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR, -- Armazenado apenas se não usar Supabase Auth (provisório)
  nome VARCHAR NOT NULL,
  sobrenome VARCHAR,
  telefone VARCHAR,
  cpf VARCHAR(11) UNIQUE,
  matricula VARCHAR,
  matricula_validada BOOLEAN DEFAULT FALSE,
  instituicoes_id INT REFERENCES public.instituicoes(id),
  status VARCHAR DEFAULT 'ativo',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lojas (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  contato VARCHAR,
  status VARCHAR DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'pausado', 'reprovado')),
  avatar_url VARCHAR,
  capa_url VARCHAR,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.produtos (
  id SERIAL PRIMARY KEY,
  loja_id INT REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url VARCHAR,
  categoria_id INT REFERENCES public.categorias(id),
  status BOOLEAN DEFAULT TRUE, -- TRUE = disponível, FALSE = indisponível
  destaque BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Buckets de Storage ------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('lojas', 'lojas', true), ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- 4) Função e Trigger para Sincronização de Auth -----------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (
    auth_id,
    email,
    nome,
    sobrenome,
    telefone,
    cpf,
    matricula,
    instituicoes_id,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    COALESCE(NEW.raw_user_meta_data->>'sobrenome', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.raw_user_meta_data->>'matricula', ''),
    (NEW.raw_user_meta_data->>'instituicoes_id')::INT,
    'ativo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Segurança (RLS) ---------------------------------------------------

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários
CREATE POLICY "public_profile_read" ON public.usuarios FOR SELECT
  USING (true); -- Permitir leitura de perfis para facilitar joins

CREATE POLICY "user_update_own" ON public.usuarios FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Políticas para lojas
CREATE POLICY "lojas_public_read" ON public.lojas FOR SELECT
  USING (status = 'ativo');

CREATE POLICY "lojas_owner_read" ON public.lojas FOR SELECT
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

CREATE POLICY "lojas_owner_manage" ON public.lojas FOR ALL
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- Políticas para produtos
CREATE POLICY "produtos_public_read" ON public.produtos FOR SELECT
  USING (loja_id IN (SELECT id FROM public.lojas WHERE status = 'ativo'));

CREATE POLICY "produtos_owner_manage" ON public.produtos FOR ALL
  USING (loja_id IN (SELECT id FROM public.lojas WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())));

-- Políticas para Storage
CREATE POLICY "public read lojas" ON storage.objects FOR SELECT
  USING (bucket_id = 'lojas');

CREATE POLICY "public read produtos" ON storage.objects FOR SELECT
  USING (bucket_id = 'produtos');

CREATE POLICY "owner_write_lojas" ON storage.objects FOR ALL
  USING (bucket_id = 'lojas' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.lojas WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
  ));

CREATE POLICY "owner_write_produtos" ON storage.objects FOR ALL
  USING (bucket_id = 'produtos' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.produtos WHERE loja_id IN (
      SELECT id FROM public.lojas WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    )
  ));

-- 6) Seed Data (Opcional) ----------------------------------------------

-- Instituições
INSERT INTO public.instituicoes (nome, cnpj)
VALUES 
  ('Universidade Federal de Minas Gerais', '17217985000104'),
  ('Pontifícia Universidade Católica de Minas Gerais', '61100000000104')
ON CONFLICT (cnpj) DO NOTHING;

-- Categorias
INSERT INTO public.categorias (nome)
VALUES 
  ('Computação'), ('Matemática'), ('Engenharia'), ('Física'),
  ('Alimentos'), ('Vestuário'), ('Eletrônicos'), ('Papelaria'), ('Lazer')
ON CONFLICT (nome) DO NOTHING;

-- Recarrega o schema cache
NOTIFY pgrst, 'reload schema';
