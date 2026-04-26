import { supabase } from "@/lib/supabase";
import type {
  Categoria,
  GrupoCategoria,
  Instituicao,
  Loja,
  OrdenacaoProdutos,
  Produto,
  ProdutoListagem,
} from "@/types";

interface GetLojasFiltros {
  instituicao_id?: number;
  categoria_id?: number;
}

export async function getLojas(filtros: GetLojasFiltros = {}): Promise<Loja[]> {
  const { instituicao_id, categoria_id } = filtros;

  const selectClause = categoria_id
    ? "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, usuarios!inner(instituicoes_id), produtos!inner(categoria_id)"
    : "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, usuarios!inner(instituicoes_id)";

  let query = supabase
    .from("lojas")
    .select(selectClause)
    .eq("status", "ativo");

  if (instituicao_id) {
    query = query.eq("usuarios.instituicoes_id", instituicao_id);
  }
  if (categoria_id) {
    query = query.eq("produtos.categoria_id", categoria_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  const vistos = new Set<number>();
  const lojas: Loja[] = [];
  for (const item of (data ?? []) as unknown as Loja[]) {
    if (vistos.has(item.id)) continue;
    vistos.add(item.id);
    lojas.push({
      id: item.id,
      usuario_id: item.usuario_id,
      nome: item.nome,
      descricao: item.descricao,
      contato: item.contato,
      status: item.status,
      criado_em: item.criado_em,
      avatar_url: item.avatar_url,
      capa_url: item.capa_url,
    });
  }
  return lojas;
}

export async function getLojaById(id: number): Promise<Loja | null> {
  const { data, error } = await supabase
    .from("lojas")
    .select(
      "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url"
    )
    .eq("id", id)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return (data as Loja | null) ?? null;
}

export async function getCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Categoria[];
}

export async function getInstituicoes(): Promise<Instituicao[]> {
  const { data, error } = await supabase
    .from("instituicoes")
    .select("id, nome, cnpj")
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Instituicao[];
}

export async function getProdutosByLoja(lojaId: number): Promise<Produto[]> {
  const loja = await getLojaById(lojaId);
  if (!loja) return [];

  const { data, error } = await supabase
    .from("produtos")
    .select(
      "id, loja_id, nome, descricao, preco, imagem_url, status, criado_em, categoria_id, destaque"
    )
    .eq("loja_id", lojaId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Produto[];
}

interface LojaJoinRaw {
  id: number;
  nome: string;
  descricao: string | null;
  contato: string;
  status: string;
  avatar_url: string | null;
  capa_url: string | null;
}

interface ProdutoComJoinsRaw {
  id: number;
  loja_id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  categoria_id: number;
  destaque: boolean;
  categorias: { id: number; nome: string } | { id: number; nome: string }[];
  lojas: LojaJoinRaw | LojaJoinRaw[];
}

function pickFirst<T>(value: T | T[]): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function mapearProdutoListagem(
  item: ProdutoComJoinsRaw
): ProdutoListagem | null {
  const categoriaRaw = pickFirst(item.categorias);
  const lojaRaw = pickFirst(item.lojas);
  if (!categoriaRaw || !lojaRaw) return null;

  return {
    id: item.id,
    loja_id: item.loja_id,
    nome: item.nome,
    descricao: item.descricao,
    preco: Number(item.preco),
    imagem_url: item.imagem_url,
    categoria_id: item.categoria_id,
    categoria_nome: categoriaRaw.nome,
    loja_nome: lojaRaw.nome,
    loja_descricao: lojaRaw.descricao,
    loja_contato: lojaRaw.contato,
    loja_avatar_url: lojaRaw.avatar_url,
    destaque: item.destaque,
  };
}

interface GetProdutosAgrupadosOpts {
  q?: string;
  apenasDestaque?: boolean;
}

export async function getProdutosAgrupadosPorCategoria(
  opts: GetProdutosAgrupadosOpts = {}
): Promise<GrupoCategoria[]> {
  let query = supabase
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, contato, status, avatar_url, capa_url)`
    )
    .eq("lojas.status", "ativo")
    .order("nome", { ascending: true });

  if (opts.q) {
    query = query.ilike("nome", `%${opts.q}%`);
  }
  if (opts.apenasDestaque) {
    query = query.eq("destaque", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  const grupos = new Map<number, GrupoCategoria>();

  for (const item of (data ?? []) as unknown as ProdutoComJoinsRaw[]) {
    const produto = mapearProdutoListagem(item);
    if (!produto) continue;

    const grupoExistente = grupos.get(produto.categoria_id);
    if (grupoExistente) {
      grupoExistente.produtos.push(produto);
    } else {
      grupos.set(produto.categoria_id, {
        categoria: { id: produto.categoria_id, nome: produto.categoria_nome },
        produtos: [produto],
      });
    }
  }

  return Array.from(grupos.values()).sort((a, b) =>
    a.categoria.nome.localeCompare(b.categoria.nome, "pt-BR")
  );
}

interface GetProdutosFiltradosOpts {
  q?: string;
  categoria_id?: number;
  instituicao_id?: number;
  ordenar?: OrdenacaoProdutos;
}

export async function getProdutosFiltrados(
  opts: GetProdutosFiltradosOpts = {}
): Promise<ProdutoListagem[]> {
  const { q, categoria_id, instituicao_id, ordenar = "recentes" } = opts;

  let query = supabase
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, criado_em,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, contato, status, avatar_url, capa_url, usuarios!inner(instituicoes_id))`
    )
    .eq("lojas.status", "ativo");

  if (q) query = query.ilike("nome", `%${q}%`);
  if (categoria_id) query = query.eq("categoria_id", categoria_id);
  if (instituicao_id) {
    query = query.eq("lojas.usuarios.instituicoes_id", instituicao_id);
  }

  switch (ordenar) {
    case "preco_asc":
      query = query.order("preco", { ascending: true });
      break;
    case "preco_desc":
      query = query.order("preco", { ascending: false });
      break;
    case "recentes":
    default:
      query = query.order("criado_em", { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw error;

  const produtos: ProdutoListagem[] = [];
  for (const item of (data ?? []) as unknown as ProdutoComJoinsRaw[]) {
    const produto = mapearProdutoListagem(item);
    if (produto) produtos.push(produto);
  }
  return produtos;
}
