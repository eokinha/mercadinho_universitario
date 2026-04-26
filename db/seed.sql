-- =====================================================================
-- Mercadinho Universitário — carga fria (seed) de teste
-- Pré-requisito: aplicar antes db/migrations.sql.
-- O arquivo é idempotente: rodar de novo não duplica registros.
-- Cria instituições, categorias, vendedores, lojas e produtos. Inclui
-- bloco extra: +4 lojas, +4 usuários, +5 categorias e +30 produtos
-- diversos (todos os campos preenchíveis, imagens de demonstração).
--
-- Imagens: os blocos de lojas novas e de +30 itens trazem URLs de demonstração
-- (dicebear, placehold, picsum). A loja "Sebo do Bicho" e os 10 primeiros
-- produtos passam a receber capa/avatar/imagens via UPDATE idempotente.
-- Você ainda pode substituir por URLs do Supabase Storage em /admin/imagens.
--
-- Formatos no Postgres: CNPJ em instituicoes = 14 dígitos (sem máscara).
-- CPF em usuarios = 11 dígitos (sem máscara). lojas.contato = WhatsApp com
-- DDI (ex.: 5531999990001).
-- =====================================================================

-- 1) Instituição -------------------------------------------------------

INSERT INTO instituicoes (nome, cnpj)
SELECT 'Universidade Federal de Minas Gerais', '17217985000104'
WHERE NOT EXISTS (
  SELECT 1 FROM instituicoes WHERE cnpj = '17217985000104'
);

INSERT INTO instituicoes (nome, cnpj)
SELECT
  'Pontifícia Universidade Católica de Minas Gerais',
  '61100000000104'
WHERE NOT EXISTS (
  SELECT 1 FROM instituicoes WHERE cnpj = '61100000000104'
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

INSERT INTO categorias (nome)
SELECT v.cat
FROM (VALUES
  ('Alimentos'),
  ('Vestuário'),
  ('Eletrônicos'),
  ('Papelaria'),
  ('Lazer')
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
  '11122233344',
  '20200001',
  TRUE,
  (SELECT id FROM instituicoes WHERE cnpj = '17217985000104')
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'lucas.vendedor@example.com'
);

INSERT INTO usuarios (
  nome, sobrenome, email, password, telefone, cpf,
  matricula, matricula_validada, instituicoes_id
)
SELECT
  'Ana', 'Costa', 'ana.costa@example.com', 'seed-placeholder',
  '(31) 98765-2001', '22233344455', '20200002', TRUE,
  (SELECT id FROM instituicoes WHERE cnpj = '17217985000104')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'ana.costa@example.com');

INSERT INTO usuarios (
  nome, sobrenome, email, password, telefone, cpf,
  matricula, matricula_validada, instituicoes_id
)
SELECT
  'Bruno', 'Mendes', 'bruno.mendes@example.com', 'seed-placeholder',
  '(31) 98765-2002', '33344455566', '20200003', TRUE,
  (SELECT id FROM instituicoes WHERE cnpj = '17217985000104')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'bruno.mendes@example.com');

INSERT INTO usuarios (
  nome, sobrenome, email, password, telefone, cpf,
  matricula, matricula_validada, instituicoes_id
)
SELECT
  'Carlos', 'Ferreira', 'carlos.ferreira@example.com', 'seed-placeholder',
  '(31) 98765-2003', '44455566677', '20200004', TRUE,
  (SELECT id FROM instituicoes WHERE cnpj = '61100000000104')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'carlos.ferreira@example.com');

INSERT INTO usuarios (
  nome, sobrenome, email, password, telefone, cpf,
  matricula, matricula_validada, instituicoes_id
)
SELECT
  'Daniela', 'Rocha', 'daniela.rocha@example.com', 'seed-placeholder',
  '(31) 98765-2004', '55566677788', '20200005', TRUE,
  (SELECT id FROM instituicoes WHERE cnpj = '61100000000104')
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'daniela.rocha@example.com');

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

UPDATE lojas
SET
  avatar_url = COALESCE(
    avatar_url,
    'https://api.dicebear.com/7.x/initials/svg?seed=SeboBicho&backgroundColor=ff385c'
  ),
  capa_url = COALESCE(
    capa_url,
    'https://placehold.co/1200x320/f7f7f7/333333/png?text=Sebo+do+Bicho'
  )
WHERE nome = 'Sebo do Bicho';

INSERT INTO lojas (
  usuario_id, nome, descricao, contato, status, avatar_url, capa_url
)
SELECT
  u.id,
  'Doces de Repositório',
  'Doces caseiros, vitaminas e snacks para a correria entre uma aula e outra.',
  '5531999990002',
  'ativo',
  'https://api.dicebear.com/7.x/initials/svg?seed=DocesRep&backgroundColor=ff385c',
  'https://placehold.co/1200x320/FF385C/ffffff/png?text=Doces+de+Repositorio'
FROM usuarios u
WHERE u.email = 'ana.costa@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM lojas l WHERE l.usuario_id = u.id AND l.nome = 'Doces de Repositório'
  );

INSERT INTO lojas (
  usuario_id, nome, descricao, contato, status, avatar_url, capa_url
)
SELECT
  u.id,
  'Brechó do Campus',
  'Roupas, calçados e acessórios em bom estado e preço de estudante.',
  '5531999990003',
  'ativo',
  'https://api.dicebear.com/7.x/initials/svg?seed=BrechoCampus&backgroundColor=222222',
  'https://placehold.co/1200x320/e5e5e5/333333/png?text=Brecho+do+Campus'
FROM usuarios u
WHERE u.email = 'bruno.mendes@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM lojas l WHERE l.usuario_id = u.id AND l.nome = 'Brechó do Campus'
  );

INSERT INTO lojas (
  usuario_id, nome, descricao, contato, status, avatar_url, capa_url
)
SELECT
  u.id,
  'InfoLab Usados',
  'Periféricos, cabos, adaptadores e pequena eletrônica testada na hora.',
  '5531999990004',
  'ativo',
  'https://api.dicebear.com/7.x/initials/svg?seed=InfoLab&backgroundColor=1a73e8',
  'https://placehold.co/1200x320/1a73e8/ffffff/png?text=InfoLab+Usados'
FROM usuarios u
WHERE u.email = 'carlos.ferreira@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM lojas l WHERE l.usuario_id = u.id AND l.nome = 'InfoLab Usados'
  );

INSERT INTO lojas (
  usuario_id, nome, descricao, contato, status, avatar_url, capa_url
)
SELECT
  u.id,
  'Papéis & Canetas',
  'Papelaria completa, cadernos, mochilas básicas e material para cálculo.',
  '5531999990005',
  'ativo',
  'https://api.dicebear.com/7.x/initials/svg?seed=PapeisCanetas&backgroundColor=10b981',
  'https://placehold.co/1200x320/10b981/ffffff/png?text=Papeis+%26+Canetas'
FROM usuarios u
WHERE u.email = 'daniela.rocha@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM lojas l WHERE l.usuario_id = u.id AND l.nome = 'Papéis & Canetas'
  );

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
  loja_id, nome, descricao, preco, imagem_url, categoria_id, status, destaque, criado_em
)
SELECT
  la.loja_id,
  c.nome,
  c.descricao,
  c.preco,
  'https://picsum.photos/seed/mercLiv' || md5(c.nome) || '/400/300',
  cat.id,
  TRUE,
  FALSE,
  NOW() - (INTERVAL '1 day' * (abs(hashtext(c.nome::text)) % 50))
FROM catalogo c
CROSS JOIN loja_alvo la
JOIN categorias cat ON cat.nome = c.categoria
WHERE NOT EXISTS (
  SELECT 1 FROM produtos p
  WHERE p.loja_id = la.loja_id
    AND p.nome = c.nome
);

-- Imagens de demonstração para os 10 livros em instalações antigas (imagem nula)
UPDATE produtos p
SET imagem_url = 'https://picsum.photos/seed/mercLiv' || md5(p.nome) || '/400/300'
FROM lojas l
WHERE p.loja_id = l.id
  AND l.nome = 'Sebo do Bicho'
  AND p.imagem_url IS NULL;

-- 5b) +30 produtos diversos (novas lojas, todos os campos preenchidos)-

INSERT INTO produtos (
  loja_id, nome, descricao, preco, imagem_url, categoria_id, status, destaque, criado_em
)
SELECT
  l.id,
  d.nome,
  d.descricao,
  d.preco,
  'https://picsum.photos/seed/merc' || d.ordem::text || '/400/300',
  cat.id,
  TRUE,
  FALSE,
  NOW() - (d.ordem * INTERVAL '4 hours')
FROM (
  SELECT * FROM (VALUES
    (1, 'Bolo de pote sabor limão',
     'Fabricação caseira; consumir em até 4 dias refrigerado.',
     12.50, 'Alimentos', 'Doces de Repositório'),
    (2, 'Barra de cereal integral',
     '12 unidades, baixo açúcar, ideal para lanche na biblioteca.',
     3.90, 'Alimentos', 'Doces de Repositório'),
    (3, 'Brownie de chocolate',
     'Fatia generosa, ingredientes de confeitaria.',
     8.00, 'Lazer', 'Doces de Repositório'),
    (4, 'Pão de queijo 12 unidades',
     'Congelado; levar em marmita térmica.',
     18.00, 'Alimentos', 'Doces de Repositório'),
    (5, 'Vitamina frutas vermelhas 400ml',
     'Preparada na hora (leve copo retornável).',
     10.00, 'Alimentos', 'Doces de Repositório'),
    (6, 'Suco natural 500ml',
     'Laranja ou abacaxi; sem açúcar adicionado.',
     6.00, 'Alimentos', 'Doces de Repositório'),
    (7, 'Mix de frutas secas 200g',
     'Castanhas, uva passa e damasco; embalagem zipada.',
     14.00, 'Lazer', 'Doces de Repositório'),
    (8, 'Café especial moído 250g',
     'Torra média; perfeito para moka ou prensa francesa.',
     32.00, 'Alimentos', 'Doces de Repositório'),
    (9, 'Camiseta básica preta tamanho M',
     'Algodão penteado; lavada e sem manchas.',
     25.00, 'Vestuário', 'Brechó do Campus'),
    (10, 'Calça jeans semi-nova',
     'Modelo skinny, cintura 40, barra original.',
     80.00, 'Vestuário', 'Brechó do Campus'),
    (11, 'Moletom com capuz cinza',
     'Tamanho G, forro leve, zíper frontal Ok.',
     90.00, 'Vestuário', 'Brechó do Campus'),
    (12, 'Tênis esportivo usado',
     'Número 42, solado com desgaste leve ainda para treino.',
     70.00, 'Lazer', 'Brechó do Campus'),
    (13, 'Mochila escolar',
     'Dois bolsos frontais, alças acolchoadas.',
     45.00, 'Vestuário', 'Brechó do Campus'),
    (14, 'Boné bordado universitário',
     'Ajuste de velcro, cor azul marinho.',
     30.00, 'Lazer', 'Brechó do Campus'),
    (15, 'Jaqueta corta-vento',
     'Impermeável leve, tamanho P, ideal para bike.',
     85.00, 'Vestuário', 'Brechó do Campus'),
    (16, 'Tênis casual branco',
     'Número 40, couro sintético com pequenos riscos.',
     99.00, 'Lazer', 'Brechó do Campus'),
    (17, 'Mouse Logitech USB',
     'Modelo básico óptico; testado em Windows e Mac.',
     45.00, 'Eletrônicos', 'InfoLab Usados'),
    (18, 'Teclado mecânico switch blue',
     'Layout ABNT2, retroiluminação vermelha, cabo destacável.',
     220.00, 'Computação', 'InfoLab Usados'),
    (19, 'Webcam 720p',
     'Clip para monitor, microfone embutido funcional.',
     80.00, 'Eletrônicos', 'InfoLab Usados'),
    (20, 'Cabo HDMI 2m',
     'Versão 1.4, revestimento reforçado near tip.',
     25.00, 'Eletrônicos', 'InfoLab Usados'),
    (21, 'Pen drive 32GB USB 3.0',
     'Chave alça; formatado exFAT, smart verificado.',
     40.00, 'Computação', 'InfoLab Usados'),
    (22, 'Fone de ouvido com fio',
     'P2 estéreo, cabo 1,2m, almofadas espuma novas.',
     15.00, 'Eletrônicos', 'InfoLab Usados'),
    (23, 'Hub USB 3 portas + leitor SD',
     'Alimentação por barramento; leve e portátil.',
     60.00, 'Computação', 'InfoLab Usados'),
    (24, 'Caderno universitário 200 folhas',
     'Capa dura, pautado, margem vermelha padrão.',
     32.00, 'Papelaria', 'Papéis & Canetas'),
    (25, 'Lápis preto 2B caixa 12 unidades',
     'Marca Faber-Castell, uso em provas e desenho técnico.',
     18.00, 'Papelaria', 'Papéis & Canetas'),
    (26, 'Mochila de lona básica',
     'Alça dupla, bolso lateral para garrafa.',
     120.00, 'Papelaria', 'Papéis & Canetas'),
    (27, 'Pilhas alcalinas AA 4 unidades',
     'Marca conhecida, vencimento 2027.',
     12.00, 'Papelaria', 'Papéis & Canetas'),
    (28, 'Papel pautado A4 500 folhas',
     '75g, branco, pacote fechado.',
     45.00, 'Papelaria', 'Papéis & Canetas'),
    (29, 'Post-it bloco 5 cores',
     '5 x 5 cm, adesivo reposicionável.',
     22.00, 'Papelaria', 'Papéis & Canetas'),
    (30, 'Calculadora científica',
     'Funções trig e estat básica; pilhas inclusas. Similar Casio.',
     55.00, 'Matemática', 'Papéis & Canetas')
  ) AS t(ordem, nome, descricao, preco, categoria, loja_nome)
) d
JOIN lojas l ON l.nome = d.loja_nome
JOIN categorias cat ON cat.nome = d.categoria
WHERE NOT EXISTS (
  SELECT 1 FROM produtos p
  WHERE p.loja_id = l.id
    AND p.nome = d.nome
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
