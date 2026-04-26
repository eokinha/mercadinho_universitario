-- =====================================================================
-- Mercadinho Universitário — carga fria (seed) de teste
-- Pré-requisito: aplicar antes db/migrations.sql.
-- O arquivo é idempotente: rodar de novo não duplica registros.
-- Cria 1 instituição, 4 categorias, 1 usuário vendedor (matrícula
-- validada), 1 loja ativa "Sebo do Bicho" e 10 livros acadêmicos.
--
-- Imagens (avatar/capa de loja, imagem de produto) entram como NULL.
-- Suba pelos buckets 'lojas' e 'produtos' do Supabase Storage usando a
-- tela provisória em /admin/imagens.
-- =====================================================================

-- 1) Instituição -------------------------------------------------------

INSERT INTO instituicoes (nome, cnpj)
SELECT 'Universidade Federal de Minas Gerais', '17.217.985/0001-04'
WHERE NOT EXISTS (
  SELECT 1 FROM instituicoes WHERE cnpj = '17.217.985/0001-04'
);

-- 2) Categorias --------------------------------------------------------

INSERT INTO categorias (nome)
SELECT v.cat
FROM (VALUES
  ('Computação'),
  ('Matemática'),
  ('Engenharia'),
  ('Física')
) AS v(cat)
WHERE NOT EXISTS (
  SELECT 1 FROM categorias c WHERE c.nome = v.cat
);

-- 3) Usuário vendedor (matrícula validada) -----------------------------

INSERT INTO usuarios (
  nome, sobrenome, email, password, telefone, cpf,
  matricula, matricula_validada, instituicoes_id
)
SELECT
  'Lucas',
  'Silva',
  'lucas.vendedor@example.com',
  'seed-placeholder',
  '(31) 99999-0001',
  '111.222.333-44',
  '20200001',
  TRUE,
  (SELECT id FROM instituicoes WHERE cnpj = '17.217.985/0001-04')
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'lucas.vendedor@example.com'
);

-- 4) Loja "Sebo do Bicho" (status ativo) -------------------------------

INSERT INTO lojas (usuario_id, nome, descricao, contato, status)
SELECT
  u.id,
  'Sebo do Bicho',
  'Livros acadêmicos usados em ótimo estado, com preços de estudante.',
  '5531999990001',
  'ativo'
FROM usuarios u
WHERE u.email = 'lucas.vendedor@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM lojas l
    WHERE l.usuario_id = u.id
      AND l.nome = 'Sebo do Bicho'
  );

-- Idempotente: se a loja foi criada antes do canal WhatsApp existir, atualiza
-- o contato de email para o telefone padrão do seed.
UPDATE lojas
SET contato = '5531999990001'
WHERE nome = 'Sebo do Bicho'
  AND contato = 'lucas.vendedor@example.com';

-- 5) 10 livros acadêmicos ---------------------------------------------

WITH loja_alvo AS (
  SELECT l.id AS loja_id
  FROM lojas l
  JOIN usuarios u ON u.id = l.usuario_id
  WHERE u.email = 'lucas.vendedor@example.com'
    AND l.nome = 'Sebo do Bicho'
),
catalogo (nome, descricao, preco, categoria) AS (
  VALUES
    (
      'Algoritmos: Teoria e Prática',
      'Thomas Cormen, 3ª edição. Capa dura, marcas leves de uso, sem rabiscos.',
      145.00, 'Computação'
    ),
    (
      'Sistemas Operacionais Modernos',
      'Andrew S. Tanenbaum. Edição em português, grifos a lápis no capítulo 1.',
      138.90, 'Computação'
    ),
    (
      'Redes de Computadores e a Internet',
      'Kurose & Ross. 6ª edição, capa flexível, em ótimo estado.',
      125.00, 'Computação'
    ),
    (
      'Engenharia de Software',
      'Ian Sommerville, 9ª edição. Capa um pouco amassada, miolo intacto.',
      115.00, 'Computação'
    ),
    (
      'Estruturas de Dados Usando C',
      'Tenenbaum, Langsam & Augenstein. Edição clássica, alguns grifos.',
      89.90, 'Computação'
    ),
    (
      'Introdução à Programação com Python',
      'Nilo Ney Coutinho Menezes. Edição recente, praticamente novo.',
      49.90, 'Computação'
    ),
    (
      'Cálculo - Volume 1',
      'James Stewart, 7ª edição. Capa em bom estado, exercícios sem resposta.',
      132.50, 'Matemática'
    ),
    (
      'Álgebra Linear com Aplicações',
      'Howard Anton. Edição em português, anotações a lápis nos primeiros capítulos.',
      98.00, 'Matemática'
    ),
    (
      'Física para Cientistas e Engenheiros',
      'Paul A. Tipler. Volume único, capa dura, em ótimo estado.',
      149.00, 'Física'
    ),
    (
      'Mecânica Vetorial para Engenheiros: Estática',
      'Beer, Johnston & Mazurek. 9ª edição, lombada um pouco gasta.',
      79.90, 'Engenharia'
    )
)
INSERT INTO produtos (
  loja_id, nome, descricao, preco, imagem_url, categoria_id
)
SELECT
  la.loja_id,
  c.nome,
  c.descricao,
  c.preco,
  NULL,
  cat.id
FROM catalogo c
CROSS JOIN loja_alvo la
JOIN categorias cat ON cat.nome = c.categoria
WHERE NOT EXISTS (
  SELECT 1 FROM produtos p
  WHERE p.loja_id = la.loja_id
    AND p.nome = c.nome
);

-- 6) Marcar 1 produto por categoria como destaque (idempotente) -------

UPDATE produtos
SET destaque = TRUE
WHERE id IN (
  SELECT DISTINCT ON (categoria_id) id
  FROM produtos
  ORDER BY categoria_id, id
)
AND destaque = FALSE;

-- Recarrega o schema cache do PostgREST após inserções
NOTIFY pgrst, 'reload schema';
