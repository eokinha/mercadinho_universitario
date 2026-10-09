-- Carga fria da Circular (ambiente de dev)
-- Re-tematiza os 5 alunos de teste (*@example.com) e recria os anúncios deles.
-- Imagens são preenchidas depois pelo script de imagens (fotos CC0 do Openverse).
-- Idempotente: pode ser executada de novo.

BEGIN;

-- Corrige nome de subcategoria gravado com encoding quebrado
UPDATE public.categorias SET nome = 'Utensílios de Cozinha' WHERE nome = 'Utenspara Cozinha';

UPDATE public.usuarios SET nome = 'Lucas', sobrenome = 'Silva', instituicoes_id = 1 WHERE id = 1;
UPDATE public.lojas SET nome = 'Lucas Silva', slug = 'lucas-silva', descricao = 'Engenharia Mecânica, 7º período na UFMG. Repassando o material do ciclo básico que me salvou nas provas.', contato = '5531999990001', whatsapp = '5531999990001', locais_entrega = ARRAY['Biblioteca Universitária', 'Bloco de Aulas', 'RU Central'], avatar_url = NULL, capa_url = NULL, status = 'ativo' WHERE id = 1;
UPDATE public.usuarios SET nome = 'Ana', sobrenome = 'Costa', instituicoes_id = 1 WHERE id = 2;
UPDATE public.lojas SET nome = 'Ana Costa', slug = 'ana-costa', descricao = 'Medicina, 5º período na UFMG. Material de anatomia e semiologia bem cuidado, sem rabiscos.', contato = '5531999990002', whatsapp = '5531999990002', locais_entrega = ARRAY['Centro de Vivência', 'Biblioteca Universitária'], avatar_url = NULL, capa_url = NULL, status = 'ativo' WHERE id = 2;
UPDATE public.usuarios SET nome = 'Bruno', sobrenome = 'Mendes', instituicoes_id = 1 WHERE id = 3;
UPDATE public.lojas SET nome = 'Bruno Mendes', slug = 'bruno-mendes', descricao = 'Arquitetura e Urbanismo na UFMG. Formando este semestre e desapegando do ateliê.', contato = '5531999990003', whatsapp = '5531999990003', locais_entrega = ARRAY['Entrada Principal do Campus', 'Centro Acadêmico (CA)'], avatar_url = NULL, capa_url = NULL, status = 'ativo' WHERE id = 3;
UPDATE public.usuarios SET nome = 'Carlos', sobrenome = 'Ferreira', instituicoes_id = 2 WHERE id = 4;
UPDATE public.lojas SET nome = 'Carlos Ferreira', slug = 'carlos-ferreira', descricao = 'Ciência da Computação na PUC Minas. Periféricos testados e livros de programação. Topo troca por hardware.', contato = '5531999990004', whatsapp = '5531999990004', locais_entrega = ARRAY['Bloco de Aulas', 'Centro de Vivência'], avatar_url = NULL, capa_url = NULL, status = 'ativo' WHERE id = 4;
UPDATE public.usuarios SET nome = 'Daniela', sobrenome = 'Rocha', instituicoes_id = 2 WHERE id = 5;
UPDATE public.lojas SET nome = 'Daniela Rocha', slug = 'daniela-rocha', descricao = 'Direito, 8º período na PUC Minas. Mudando de república: livros, códigos e coisas da casa.', contato = '5531999990005', whatsapp = '5531999990005', locais_entrega = ARRAY['Biblioteca Universitária', 'RU Central'], avatar_url = NULL, capa_url = NULL, status = 'ativo' WHERE id = 5;

DELETE FROM public.favoritos WHERE produto_id IN (SELECT id FROM public.produtos WHERE loja_id IN (1,2,3,4,5));
DELETE FROM public.produtos WHERE loja_id IN (1,2,3,4,5);

INSERT INTO public.produtos (loja_id, nome, descricao, preco, categoria_id, aceita_troca, destaque, status) VALUES
  (1, 'Cálculo Volume 1 — James Stewart (7ª ed.)', 'Capa com marcas de uso, miolo limpo. Poucas marcações a lápis no capítulo de derivadas.', 120, 19, true, true, 'ativo'),
  (1, 'Física 1 — Halliday & Resnick', 'Edição 10. Usado em Física I, todas as páginas inteiras.', 95, 19, true, false, 'ativo'),
  (1, 'Calculadora científica Casio fx-82MS', 'Funcionando perfeitamente, com tampa. Aceita nas provas do ciclo básico.', 55, 25, true, true, 'ativo'),
  (1, 'Calculadora financeira HP 12c', 'Original, com capa de couro. Bateria trocada mês passado.', 210, 25, false, false, 'ativo'),
  (1, 'Kit desenho técnico: esquadros, compasso e escalímetro', 'Usado em Desenho Técnico I. Compasso Trident com estojo.', 60, 31, true, false, 'ativo'),
  (1, 'Apostila de Cálculo 2 com listas resolvidas', 'Resumos e listas resolvidas do professor, encadernadas.', 0, 20, true, false, 'ativo'),
  (1, 'Jaleco de laboratório tamanho M', 'Usado no laboratório de Química Geral, lavado e sem manchas.', 40, 47, true, false, 'ativo'),
  (2, 'Atlas de Anatomia Humana — Netter', '7ª edição, capa dura. Algumas páginas marcadas com post-it removível.', 260, 19, false, true, 'ativo'),
  (2, 'Estetoscópio duplo adulto', 'Pouco uso, olivas extras incluídas.', 180, 29, false, false, 'ativo'),
  (2, 'Jaleco feminino manga longa tamanho P', 'Tecido gabardine, bordado removível.', 70, 47, true, false, 'ativo'),
  (2, 'Guyton — Tratado de Fisiologia Médica', '13ª edição, ótimo estado.', 190, 19, true, false, 'ativo'),
  (2, 'Resumos de Semiologia (impressos)', 'Resumos do 4º período, organizados por sistema. Troco por resumo de Farmacologia.', 0, 20, true, false, 'ativo'),
  (2, 'Esfigmomanômetro aneroide com braçadeira', 'Calibrado este ano, acompanha bolsa.', 90, 29, false, false, 'ativo'),
  (2, 'Luminária de mesa articulada', 'LED, três intensidades. Ótima para estudar à noite.', 45, 48, true, false, 'ativo'),
  (3, 'Prancheta de desenho A3 com régua paralela', 'Régua deslizando sem folga, ideal para os primeiros períodos.', 150, 32, true, true, 'ativo'),
  (3, 'Escalímetro triangular 30 cm', 'Escalas legíveis, sem lascas.', 25, 32, true, false, 'ativo'),
  (3, 'Kit lapiseiras técnicas 0.3, 0.5 e 0.7', 'Lapiseiras de metal com grafites extras.', 50, 57, true, false, 'ativo'),
  (3, 'Neufert — A Arte de Projetar em Arquitetura', '18ª edição, a bíblia do ateliê. Capa um pouco gasta.', 170, 19, false, false, 'ativo'),
  (3, 'Estilete de precisão e base de corte A3', 'Base verde autocicatrizante com poucas marcas. Lâminas extras.', 35, 57, true, false, 'ativo'),
  (3, 'Câmera fotográfica analógica com filme', 'Funcionando, ótima para a disciplina de fotografia. Troco por lente de celular.', 0, 41, true, false, 'ativo'),
  (4, 'Notebook Dell Inspiron i5, 8 GB, SSD 256 GB', 'Bateria segura umas 3 horas. Acompanha carregador original.', 1650, 23, false, true, 'ativo'),
  (4, 'Teclado mecânico ABNT2 switch azul', 'Todas as teclas funcionando, RGB.', 140, 26, true, false, 'ativo'),
  (4, 'Mouse sem fio Logitech', 'Pilha nova, receptor USB incluso.', 45, 26, true, false, 'ativo'),
  (4, 'Monitor 21,5 polegadas Full HD', 'Sem pixel queimado, cabo HDMI incluso.', 420, 23, true, false, 'ativo'),
  (4, 'Algoritmos — Cormen (Teoria e Prática)', '3ª edição em português. Estado de novo.', 150, 19, true, false, 'ativo'),
  (4, 'Arduino Uno com kit de sensores', 'Protoboard, jumpers, LEDs e sensores. Usado em Sistemas Embarcados.', 110, 27, true, false, 'ativo'),
  (4, 'Monitoria de Programação em Python', 'Aulas de 1h na biblioteca para Algoritmos I e Estruturas de Dados.', 40, 37, false, false, 'ativo'),
  (5, 'Vade Mecum Saraiva 2025', 'Usado em um semestre, sem anotações.', 110, 19, true, true, 'ativo'),
  (5, 'Curso de Direito Constitucional — Gilmar Mendes', 'Algumas marcações a marca-texto.', 95, 19, true, false, 'ativo'),
  (5, 'Frigobar 120 litros', 'Funcionando bem, ideal para quarto de república. Retirada no campus combinada.', 380, 49, false, false, 'ativo'),
  (5, 'Bicicleta aro 26 com cadeado', 'Revisada, pneus novos. Perfeita para ir até o campus.', 450, 48, true, false, 'ativo'),
  (5, 'Cafeteira elétrica', 'Faz até 15 xícaras. Funciona normal.', 0, 49, true, false, 'ativo'),
  (5, 'Mochila para notebook', 'Compartimento acolchoado para notebook de até 15,6 polegadas.', 70, 46, true, false, 'ativo'),
  (5, 'Revisão de TCC e ABNT', 'Revisão de formatação ABNT e ortografia para trabalhos de conclusão.', 90, 38, false, false, 'ativo');

COMMIT;
