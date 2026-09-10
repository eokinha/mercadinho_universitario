-- ===================================================================
-- Migração 009 — Reestruturação de Categorias com Hierarquia de 2 Níveis
-- Mercadinho Universitário
--
-- Como executar: Cole no SQL Editor do Supabase e clique em RUN.
-- Idempotente: pode ser executado mais de uma vez com segurança.
-- ===================================================================

-- 1. Adicionar colunas de hierarquia e ícone
ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categorias(id),
  ADD COLUMN IF NOT EXISTS icone VARCHAR(10) DEFAULT '🏷️';

-- 2. Inserir categorias PAI (parent_id = NULL)
INSERT INTO categorias (nome, icone, parent_id) VALUES
  ('Livros & Material Acadêmico', '📚', NULL),
  ('Tecnologia & Eletrônicos',    '💻', NULL),
  ('Material de Curso',           '🔬', NULL),
  ('Moda & Brechó',               '👕', NULL),
  ('Moradia & Casa',              '🏠', NULL),
  ('Alimentação & Bebidas',       '🍕', NULL),
  ('Papelaria & Arte',            '🎨', NULL),
  ('Serviços',                    '🔧', NULL),
  ('Trocas',                      '🔄', NULL)
ON CONFLICT DO NOTHING;

-- 3. Migrar produtos das categorias antigas para as novas
UPDATE produtos SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Alimentação & Bebidas' AND parent_id IS NULL LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias WHERE nome IN ('Alimentos'));

UPDATE produtos SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Moda & Brechó' AND parent_id IS NULL LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias WHERE nome IN ('Vestuário'));

UPDATE produtos SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Tecnologia & Eletrônicos' AND parent_id IS NULL LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias WHERE nome IN ('Eletrônicos'));

UPDATE produtos SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Papelaria & Arte' AND parent_id IS NULL LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias WHERE nome IN ('Papelaria'));

UPDATE produtos SET categoria_id = (SELECT id FROM categorias WHERE nome = 'Material de Curso' AND parent_id IS NULL LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias WHERE nome IN ('Computação','Matemática','Engenharia','Física','Lazer') AND parent_id IS NULL);

-- 4. Remover categorias antigas
DELETE FROM categorias
WHERE nome IN ('Computação','Matemática','Engenharia','Física','Alimentos','Vestuário','Eletrônicos','Papelaria','Lazer')
AND parent_id IS NULL;

-- 5. Subcategorias: Livros & Material Acadêmico
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Livros & Material Acadêmico' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Livros Didáticos','📖'),('Apostilas & Resumos','📝'),('Cadernos Usados','📓'),('Literatura & Paradidáticos','📗')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

-- 6. Subcategorias: Tecnologia & Eletrônicos
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Tecnologia & Eletrônicos' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Computadores & Notebooks','💻'),('Celulares & Smartphones','📱'),('Calculadoras Científicas','🔢'),('Periféricos','🖱️'),('Componentes Eletrônicos','🔌')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

-- 7. Subcategorias: Material de Curso
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Material de Curso' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Odontologia','🦷'),('Medicina & Enfermagem','🩺'),('Química, Farmácia & Biomedicina','🧪'),
  ('Engenharia & Tecnologia (Exatas)','⚙️'),('Arquitetura & Design','🏗️'),('Agronomia & Veterinária','🌱'),
  ('Direito','⚖️'),('Comunicação & Publicidade','🎭'),('Música & Artes Cênicas','🎵')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

-- 8. Subcategorias: Serviços
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Serviços' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Aulas Particulares & Monitoria','🎓'),('Revisão de TCC & Textos','✍️'),('Design & Criação','🖥️'),
  ('Programação & Suporte','💾'),('Fotografia & Vídeo','📷'),('Outros Serviços','🔧')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

-- 9. Subcategorias: Moda & Brechó
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Moda & Brechó' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Roupas Femininas','👗'),('Roupas Masculinas','👔'),('Calçados','👟'),('Acessórios','🎒'),('Uniformes & Jalecos','🥼')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

-- 10. Subcategorias: Moradia & Casa
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Moradia & Casa' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Móveis & Decoração','🛋️'),('Eletrodomésticos Pequenos','🔌'),('Utensílios de Cozinha','🍳'),('Cama, Mesa & Banho','🛏️')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

-- 11. Subcategorias: Alimentação & Bebidas
WITH pai AS (SELECT id FROM categorias WHERE nome = 'Alimentação & Bebidas' AND parent_id IS NULL LIMIT 1)
INSERT INTO categorias (nome, icone, parent_id) SELECT v.nome, v.icone, pai.id FROM pai, (VALUES
  ('Refeições & Marmitas','🍱'),('Doces & Salgados','🍰'),('Bebidas','🧃'),('Fitness & Natural','🥗')
) AS v(nome, icone) ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
