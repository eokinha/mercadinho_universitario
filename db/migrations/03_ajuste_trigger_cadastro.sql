-- Ajuste no Trigger para suportar cadastro simplificado
-- Removemos o COALESCE que forçava strings vazias, permitindo que campos fiquem como NULL
-- Isso evita erro de duplicidade (UNIQUE) quando múltiplos usuários não preenchem CPF ou Telefone

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
    NEW.raw_user_meta_data->>'sobrenome',
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'matricula',
    (NEW.raw_user_meta_data->>'instituicoes_id')::INT,
    'ativo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
