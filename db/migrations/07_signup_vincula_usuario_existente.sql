-- Migração: no signup, se já existe linha em usuarios com o mesmo e-mail
-- (ex.: vendedores do seed), apenas vincula auth_id em vez de duplicar usuário/loja.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id INT;
  new_store_name TEXT;
BEGIN
  UPDATE public.usuarios SET auth_id = NEW.id
  WHERE auth_id IS NULL AND lower(email) = lower(NEW.email);
  IF FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (auth_id, email, nome, sobrenome, status, matricula_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
          NEW.raw_user_meta_data->>'sobrenome', 'ativo', 'pendente')
  RETURNING id INTO new_user_id;

  new_store_name := 'Loja de ' || COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante');

  INSERT INTO public.lojas (usuario_id, nome, descricao, status, cor_tema, slug)
  VALUES (
    new_user_id, new_store_name,
    'Bem-vindo à minha nova Kitanda! Em breve trarei novidades.',
    'ativo', '#9A2FD6',
    'loja-' || lower(replace(COALESCE(NEW.raw_user_meta_data->>'nome', 'estudante'), ' ', '-')) || '-' || floor(random() * 1000)::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
