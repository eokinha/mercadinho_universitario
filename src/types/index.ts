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
  matricula_status: "pendente" | "verificado" | "rejeitado";
  instituicoes_id: number;
  status: string;
  is_admin: boolean;
}

export interface Favorito {
  id: string;
  usuario_id: number;
  produto_id: number;
  criado_em: string;
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
  slug: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  locais_entrega: string[];
}

export type ProdutoStatus = "ativo" | "pausado";

export interface Produto {
  id: number;
  loja_id: number;
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string | null;
  status: ProdutoStatus;
  criado_em: string;
  categoria_id: number;
  destaque: boolean;
  aceita_troca: boolean;
}

export interface Categoria {
  id: number;
  nome: string;
  parent_id?: number | null;
  icone?: string;
}

export interface CategoriaComFilhos extends Categoria {
  filhos: Categoria[];
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
  aceita_troca: boolean;
  loja_verificada?: boolean;
}

export interface UsuarioModeracao {
  id: number;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  matricula: string;
  matricula_status: "pendente" | "verificado" | "rejeitado";
  matricula_validada: boolean;
  instituicoes_id: number | null;
  instituicao_nome?: string;
  loja_id?: number;
}

export interface LojaModeracao {
  id: number;
  nome: string;
  slug: string | null;
  status: LojaStatus;
  criado_em: string;
  avatar_url: string | null;
  usuario_id: number;
  dono_nome: string;
  dono_email: string;
  matricula_validada: boolean;
  total_produtos: number;
  produtos_ativos: number;
}

export interface ProdutoModeracao {
  id: number;
  nome: string;
  preco: number;
  imagem_url: string | null;
  status: ProdutoStatus;
  destaque: boolean;
  loja_id: number;
  loja_nome: string;
}

export interface GrupoCategoria {
  categoria: Categoria;
  produtos: ProdutoListagem[];
}

export type OrdenacaoProdutos = "recentes" | "preco_asc" | "preco_desc";

export interface PerfilPublico {
  id: number;
  usuario_id: number;
  nome: string;
  descricao: string;
  contato: string;
  status: LojaStatus;
  criado_em: string;
  avatar_url: string | null;
  capa_url: string | null;
  slug: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp: string | null;
  locais_entrega: string[];
  usuario_nome?: string;
  usuario_sobrenome?: string;
  usuario_criado_em?: string;
  matricula_status?: "pendente" | "verificado" | "rejeitado";
  instituicao_nome?: string;
}
