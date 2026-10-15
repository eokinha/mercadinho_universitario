-- Migração: instituições privadas de Salvador com os domínios de e-mail usados na verificação automática.
-- CNPJ passa a ser opcional (a instituição é identificada pelo domínio); UNIQUE continua valendo quando preenchido.

ALTER TABLE public.instituicoes ALTER COLUMN cnpj DROP NOT NULL;

INSERT INTO public.instituicoes (nome, dominios)
SELECT v.nome, v.dominios
FROM (VALUES
  ('Universidade Salvador (UNIFACS)', '{unifacs.br}'::text[]),
  ('Universidade Católica do Salvador (UCSal)', '{ucsal.br}'::text[]),
  ('Centro Universitário Jorge Amado (Unijorge)', '{unijorge.edu.br,unijorge.com.br}'::text[]),
  ('Centro Universitário UniFTC', '{uniftc.edu.br}'::text[]),
  ('Estácio', '{estacio.br}'::text[]),
  ('Centro Universitário Maurício de Nassau (UNINASSAU)', '{uninassau.edu.br}'::text[]),
  ('Centro Universitário Ruy Barbosa (UniRuy)', '{uniruy.edu.br}'::text[]),
  ('Centro Universitário SENAI CIMATEC', '{senaicimatec.com.br}'::text[]),
  ('Escola Bahiana de Medicina e Saúde Pública', '{bahiana.edu.br}'::text[]),
  ('FGN', '{fgn.edu.br}'::text[])
) AS v(nome, dominios)
WHERE NOT EXISTS (SELECT 1 FROM public.instituicoes i WHERE i.nome = v.nome);
