-- Migração: texto padrão da loja criada no cadastro segue a marca Circular
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

  new_store_name := trim(COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante') || ' ' ||
                         COALESCE(NEW.raw_user_meta_data->>'sobrenome', ''));

  INSERT INTO public.lojas (usuario_id, nome, descricao, status, slug)
  VALUES (
    new_user_id, new_store_name,
    'Aluno na Circular.',
    'ativo',
    'aluno-' || new_user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

UPDATE public.lojas SET descricao = 'Aluno na Circular.'
WHERE descricao = 'Bem-vindo à minha nova Kitanda! Em breve trarei novidades.';
