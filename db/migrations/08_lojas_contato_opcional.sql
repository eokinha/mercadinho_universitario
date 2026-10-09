-- Migração: contato da loja é opcional (a loja criada no signup ainda não tem telefone).
-- Sem isso o trigger handle_new_user falha em bancos legados.
ALTER TABLE public.lojas ALTER COLUMN contato DROP NOT NULL;
