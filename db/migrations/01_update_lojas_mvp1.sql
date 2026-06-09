-- Migração para Fase 1 do MVP: Customização da Loja
ALTER TABLE public.lojas 
ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS instagram_url VARCHAR,
ADD COLUMN IF NOT EXISTS tiktok_url VARCHAR,
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR,
ADD COLUMN IF NOT EXISTS locais_entrega TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cor_tema VARCHAR DEFAULT '#9A2FD6';

-- Criar índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_lojas_slug ON public.lojas(slug);
