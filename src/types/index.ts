export interface Instituicao {
  id: number;
  nome: string;
  cnpj: string;
}

export interface Usuario {
  id: number;
  nome: string;
  sobrenome: string;
  email: string;
  password: string;
  telefone: string;
  cpf: string;
  matricula: string;
  matricula_validada: boolean;
  instituicoes_id: number;
  status: string;
}

export type LojaStatus = "pendente" | "ativo" | "pausado" | "reprovado";

export interface Loja {
  id: number;
  usuario_id: number;
  nome: string;
  descricao: string;
  contato: string;
  status: LojaStatus;
  criado_em: string;
  avatar_url: string | null;
  capa_url: string | null;
}

export interface Produto {
  id: number;
  loja_id: number;
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string | null;
  status: string;
  criado_em: string;
  categoria_id: number;
  destaque: boolean;
}

export interface Categoria {
  id: number;
  nome: string;
}

export interface ProdutoListagem {
  id: number;
  loja_id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: number;
  categoria_nome: string;
  loja_nome: string;
  loja_descricao: string | null;
  loja_contato: string;
  loja_avatar_url: string | null;
  destaque: boolean;
}

export interface GrupoCategoria {
  categoria: Categoria;
  produtos: ProdutoListagem[];
}

export type OrdenacaoProdutos = "recentes" | "preco_asc" | "preco_desc";
