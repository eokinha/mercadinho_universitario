-- Migração: Criação Automática de Loja para novos usuários
-- Esta função é disparada sempre que um novo usuário se cadastra via Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id INT;
  new_store_name TEXT;
BEGIN
  -- 1. Insere o usuário na tabela pública e captura o ID serial
  INSERT INTO public.usuarios (
    auth_id,
    email,
    nome,
    sobrenome,
    status,
    matricula_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
    NEW.raw_user_meta_data->>'sobrenome',
    'ativo',
    'pendente'
  )
  RETURNING id INTO new_user_id;

  -- 2. Define um nome padrão para a loja
  new_store_name := 'Loja de ' || COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante');

  -- 3. Cria a loja automaticamente para este usuário
  INSERT INTO public.lojas (
    usuario_id,
    nome,
    descricao,
    status,
    cor_tema,
    slug
  )
  VALUES (
    new_user_id,
    new_store_name,
    'Bem-vindo à minha nova Kitanda! Em breve trarei novidades.',
    'ativo',
    '#9A2FD6',
    'loja-' || lower(replace(COALESCE(NEW.raw_user_meta_data->>'nome', 'estudante'), ' ', '-')) || '-' || floor(random() * 1000)::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
