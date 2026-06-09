-- Migração Fase 2: Favoritos e Verificação
-- 1. Tabela de Favoritos
CREATE TABLE IF NOT EXISTS public.favoritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id INT REFERENCES public.usuarios(id) ON DELETE CASCADE,
    produto_id INT REFERENCES public.produtos(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, produto_id)
);

-- 2. Habilitar RLS para Favoritos
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoritos_owner_manage" ON public.favoritos FOR ALL
    USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));

-- 3. Função para verificar se usuário é verificado (baseado no e-mail)
-- Nota: Esta lógica pode ser disparada por um trigger ou atualizada manualmente
-- Por enquanto, vamos adicionar a coluna matricula_status se não existir
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS matricula_status VARCHAR DEFAULT 'pendente' CHECK (matricula_status IN ('pendente', 'verificado', 'rejeitado'));
