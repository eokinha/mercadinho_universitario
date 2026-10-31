export interface Instituicao {
  id: number;
  nome: string;
  cnpj: string | null;
  dominios: string[] | null; // domínios de e-mail que definem o campus do aluno
}

export type UsuarioStatus = "ativo" | "bloqueado";

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
  status: UsuarioStatus;
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

// Loja como aparece para outros alunos: o telefone só sai pela RPC contato_vendedor
export type LojaPublica = Omit<Loja, "contato" | "whatsapp">;

export type ProdutoStatus = "ativo" | "pausado" | "vendido";

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
  renovado_em: string;
  vendido_em: string | null;
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
  status: UsuarioStatus;
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
  produtos_vendidos: number;
  total_interesses: number;
}

export type MotivoDenuncia = "proibido" | "golpe" | "ofensivo" | "falso" | "outro";
export type DenunciaStatus = "aberta" | "resolvida" | "descartada";

export interface DenunciaModeracao {
  id: number;
  motivo: MotivoDenuncia;
  detalhes: string | null;
  status: DenunciaStatus;
  criado_em: string;
  alvo_descricao: string;
  loja_id: number | null;
  produto_id: number | null;
  denunciante_nome: string | null;
  denunciante_email: string | null;
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

export interface PerfilPublico extends LojaPublica {
  usuario_nome?: string;
  usuario_sobrenome?: string;
  usuario_criado_em?: string;
  matricula_status?: "pendente" | "verificado" | "rejeitado";
  instituicao_nome?: string;
}

// Perfil aberto pela RPC perfil_leitura: de outro campus (mesmoCampus = false) é só leitura
export interface PerfilLeitura {
  perfil: PerfilPublico;
  produtos: ProdutoListagem[];
  mesmoCampus: boolean;
  ehDono: boolean;
  // Vai no link do QR code da loja (src/lib/compartilhar.ts); qualquer aluno logado pode compartilhar
  codigoCompartilhamento: string | null;
}

// Nome da loja e da faculdade mostrados no login para quem chegou pelo QR code
export interface ResumoLojaCompartilhada {
  loja_nome: string;
  instituicao_nome: string | null;
}

// Página do anúncio (RPC anuncio_leitura, migração 22)
export interface AnuncioDetalhe {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: number;
  categoria_nome: string | null;
  aceita_troca: boolean;
  destaque: boolean;
  status: ProdutoStatus;
  criado_em: string;
  renovado_em: string;
}

export interface LojaDoAnuncio {
  id: number;
  slug: string | null;
  nome: string;
  descricao: string | null;
  avatar_url: string | null;
  locais_entrega: string[];
  verificada: boolean;
  instituicao_nome: string | null;
}

// "ok": página completa (de outro campus, só leitura; o dono vê o próprio anúncio em qualquer estado).
// "indisponivel": vendido, pausado ou vencido, visto por quem não é dono.
export type AnuncioLeitura =
  | {
      estado: "ok";
      disponivel: boolean;
      ehDono: boolean;
      mesmoCampus: boolean;
      codigoCompartilhamento: string | null;
      favoritado: boolean;
      anuncio: AnuncioDetalhe;
      loja: LojaDoAnuncio;
      outros: ProdutoListagem[];
    }
  | { estado: "indisponivel"; nome: string; loja: { slug: string | null; nome: string } | null };

// Prévia de anúncio para o login e o WhatsApp (link compartilhado com código)
export interface ResumoAnuncioCompartilhado {
  anuncio_nome: string;
  preco: number;
  aceita_troca: boolean;
  imagem_url: string | null;
  loja_nome: string;
  instituicao_nome: string | null;
}
