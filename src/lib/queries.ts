import { supabase as defaultClient } from "@/lib/supabase";
import type {
  Categoria,
  CategoriaComFilhos,
  DenunciaModeracao,
  DenunciaStatus,
  Instituicao,
  Loja,
  LojaModeracao,
  LojaPublica,
  MotivoDenuncia,
  LojaStatus,
  OrdenacaoProdutos,
  Produto,
  ProdutoListagem,
  ProdutoModeracao,
  ProdutoStatus,
  PerfilPublico,
  Usuario,
  UsuarioModeracao,
  UsuarioStatus,
} from "@/types";
import { inicioValidade } from "@/lib/anuncios";
import { type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// CATEGORIAS
// ---------------------------------------------------------------------------

/**
 * Retorna todas as categorias organizadas em árvore de 2 níveis:
 * categorias pai (parent_id = null) com array de filhos.
 * Fallback seguro: se o banco ainda não tiver parent_id/icone, retorna lista plana.
 */
export async function getCategorias(
  client: SupabaseClient = defaultClient
): Promise<Categoria[]> {
  const { data, error } = await client
    .from("categorias")
    .select("id, nome, parent_id, icone")
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("nome");

  if (error) {
    console.error("[getCategorias] erro:", error);
    return [];
  }
  return (data ?? []) as Categoria[];
}

/**
 * Retorna a árvore hierárquica de categorias (pais com filhos aninhados).
 */
export async function getCategoriasArvore(
  client: SupabaseClient = defaultClient
): Promise<CategoriaComFilhos[]> {
  const todas = await getCategorias(client);
  const pais = todas.filter((c) => !c.parent_id);
  return pais.map((pai) => ({
    ...pai,
    filhos: todas.filter((c) => c.parent_id === pai.id),
  }));
}


// Colunas de lojas legíveis por qualquer um (telefone fica de fora; ver contato_vendedor)
const COLUNAS_LOJA_PUBLICA =
  "id, usuario_id, nome, descricao, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, locais_entrega";

export async function getLojaById(id: number, client: SupabaseClient = defaultClient): Promise<LojaPublica | null> {
  const { data, error } = await client
    .from("lojas")
    .select(COLUNAS_LOJA_PUBLICA)
    .eq("id", id)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return (data as LojaPublica | null) ?? null;
}



export async function getInstituicoes(client: SupabaseClient = defaultClient): Promise<Instituicao[]> {
  const { data, error } = await client
    .from("instituicoes")
    .select("id, nome, cnpj")
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Instituicao[];
}

export async function updateLoja(lojaId: number, updates: Partial<Loja>, client: SupabaseClient = defaultClient): Promise<void> {
  const { error } = await client
    .from("lojas")
    .update(updates)
    .eq("id", lojaId);

  if (error) throw error;
}

// Loja do aluno logado, com telefone (RPC: o telefone não é legível via select).
// A loja nasce no trigger de signup (handle_new_user); o app não cria loja.
export async function getMinhaLoja(
  client: SupabaseClient = defaultClient
): Promise<Loja> {
  const { data, error } = await client.rpc("minha_loja").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Perfil de aluno não encontrado.");
  return data as Loja;
}

const COLUNAS_PRODUTO =
  "id, loja_id, nome, descricao, preco, imagem_url, status, criado_em, categoria_id, destaque, aceita_troca, renovado_em, vendido_em";

export async function criarProduto(
  dados: Pick<Produto, "loja_id" | "nome" | "descricao" | "preco" | "categoria_id" | "aceita_troca">,
  client: SupabaseClient = defaultClient
): Promise<Produto> {
  const { data, error } = await client
    .from("produtos")
    .insert({ ...dados, status: "ativo" })
    .select(COLUNAS_PRODUTO)
    .single();

  if (error) throw error;
  return data as Produto;
}

export async function atualizarProduto(
  produtoId: number,
  dados: Pick<Produto, "nome" | "descricao" | "preco" | "categoria_id" | "aceita_troca">,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client
    .from("produtos")
    .update(dados)
    .eq("id", produtoId);

  if (error) throw error;
}

// O banco grava a data atual em renovado_em (trigger exigir_vendedor_verificado)
export async function renovarProduto(
  produtoId: number,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client
    .from("produtos")
    .update({ renovado_em: new Date().toISOString() })
    .eq("id", produtoId);

  if (error) throw error;
}

export async function getMeuProduto(
  produtoId: number,
  client: SupabaseClient = defaultClient
): Promise<Produto | null> {
  const loja = await getMinhaLoja(client);
  const { data, error } = await client
    .from("produtos")
    .select(COLUNAS_PRODUTO)
    .eq("id", produtoId)
    .eq("loja_id", loja.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Produto | null) ?? null;
}

export async function atualizarStatusProduto(
  produtoId: number,
  status: ProdutoStatus,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client
    .from("produtos")
    .update({ status })
    .eq("id", produtoId);

  if (error) throw error;
}

export async function deletarProduto(
  produtoId: number,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client
    .from("produtos")
    .delete()
    .eq("id", produtoId);

  if (error) throw error;
}

export async function getProdutosPrivados(lojaId: number, client: SupabaseClient = defaultClient): Promise<Produto[]> {
  const { data, error } = await client
    .from("produtos")
    .select(COLUNAS_PRODUTO)
    .eq("loja_id", lojaId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Produto[];
}

export async function getLojaBySlug(slug: string, client: SupabaseClient = defaultClient): Promise<LojaPublica | null> {
  const { data, error } = await client
    .from("lojas")
    .select(COLUNAS_LOJA_PUBLICA)
    .eq("slug", slug)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return (data as LojaPublica | null) ?? null;
}

export async function getPerfilPublico(
  idOuSlug: string | number,
  client: SupabaseClient = defaultClient
): Promise<PerfilPublico | null> {
  const isNumeric = typeof idOuSlug === "number" || /^\d+$/.test(String(idOuSlug));

  // Tenta buscar com dados do usuário e instituição
  try {
    let query = client
      .from("lojas")
      .select(`
        id, usuario_id, nome, descricao, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, locais_entrega,
        usuarios (
          id, nome, sobrenome, matricula_status, criado_em,
          instituicoes ( id, nome )
        )
      `)
      .eq("status", "ativo");

    if (isNumeric) {
      query = query.eq("id", Number(idOuSlug));
    } else {
      query = query.eq("slug", String(idOuSlug));
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      const raw = data as unknown as LojaPublica & {
        usuarios: {
          nome: string;
          sobrenome: string;
          criado_em: string;
          matricula_status: Usuario["matricula_status"];
          instituicoes: { nome: string } | null;
        } | null;
      };
      const usuario = raw.usuarios;
      const instituicao = usuario?.instituicoes;

      return {
        id: raw.id,
        usuario_id: raw.usuario_id,
        nome: raw.nome,
        descricao: raw.descricao || "",
        status: raw.status,
        criado_em: raw.criado_em,
        avatar_url: raw.avatar_url,
        capa_url: raw.capa_url,
        slug: raw.slug,
        instagram_url: raw.instagram_url,
        tiktok_url: raw.tiktok_url,
        locais_entrega: raw.locais_entrega ?? [],
        usuario_nome: usuario?.nome,
        usuario_sobrenome: usuario?.sobrenome,
        usuario_criado_em: usuario?.criado_em,
        matricula_status: usuario?.matricula_status,
        instituicao_nome: instituicao?.nome,
      };
    }
  } catch (err) {
    console.warn("Erro ao buscar perfil completo com joins:", err);
  }

  // Fallback seguro caso o join de usuarios falhe
  let fallbackLoja: LojaPublica | null = null;
  if (isNumeric) {
    fallbackLoja = await getLojaById(Number(idOuSlug), client);
  } else {
    fallbackLoja = await getLojaBySlug(String(idOuSlug), client);
  }

  if (!fallbackLoja) return null;

  return {
    ...fallbackLoja,
  };
}

export async function toggleFavorito(usuarioId: number, produtoId: number, client: SupabaseClient = defaultClient): Promise<boolean> {
  try {
    const { data, error } = await client
      .from("favoritos")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("produto_id", produtoId)
      .maybeSingle();

    if (error) return false;

    if (data) {
      await client.from("favoritos").delete().eq("id", data.id);
      return false;
    } else {
      await client.from("favoritos").insert({ usuario_id: usuarioId, produto_id: produtoId });
      return true;
    }
  } catch {
    return false;
  }
}

export async function getFavoritos(usuarioId: number, client: SupabaseClient = defaultClient): Promise<number[]> {
  try {
    const { data, error } = await client
      .from("favoritos")
      .select("produto_id")
      .eq("usuario_id", usuarioId);

    if (error) return [];
    return (data ?? []).map(f => f.produto_id);
  } catch {
    return [];
  }
}

export async function getProdutosListagemByLoja(lojaId: number, client: SupabaseClient = defaultClient): Promise<ProdutoListagem[]> {
  const { data, error } = await client
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, aceita_troca,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, status, avatar_url, capa_url, usuarios(matricula_status))`
    )
    .eq("loja_id", lojaId)
    .eq("status", "ativo")
    .gt("renovado_em", inicioValidade())
    .eq("lojas.status", "ativo")
    .order("criado_em", { ascending: false });

  if (error) throw error;

  const produtos: ProdutoListagem[] = [];
  for (const item of (data ?? []) as unknown as ProdutoComJoinsRaw[]) {
    const produto = mapearProdutoListagem(item);
    if (produto) produtos.push(produto);
  }
  return produtos;
}

interface UsuarioJoinRaw {
  instituicoes_id?: number;
  matricula_status?: string;
}

interface LojaJoinRaw {
  id: number;
  nome: string;
  descricao: string | null;
  status: string;
  avatar_url: string | null;
  capa_url: string | null;
  usuarios?: UsuarioJoinRaw | UsuarioJoinRaw[];
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
  aceita_troca: boolean;
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

  const usuarioRaw = pickFirst(lojaRaw.usuarios);
  const isVerificado = usuarioRaw?.matricula_status === "verificado";

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
    loja_avatar_url: lojaRaw.avatar_url,
    destaque: item.destaque,
    aceita_troca: item.aceita_troca,
    loja_verificada: isVerificado,
  };
}

export async function getProdutosFavoritos(
  usuarioId: number,
  client: SupabaseClient = defaultClient
): Promise<ProdutoListagem[]> {
  try {
    const idsFavoritos = await getFavoritos(usuarioId, client);
    if (idsFavoritos.length === 0) return [];

    const { data, error } = await client
      .from("produtos")
      .select(
        `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, aceita_troca,
         categorias!inner(id, nome),
         lojas!inner(id, nome, descricao, status, avatar_url, capa_url, usuarios(matricula_status))`
      )
      .in("id", idsFavoritos)
      .eq("status", "ativo")
      .gt("renovado_em", inicioValidade())
      .eq("lojas.status", "ativo");

    if (error) return [];

    const produtos: ProdutoListagem[] = [];
    for (const item of (data ?? []) as unknown as ProdutoComJoinsRaw[]) {
      const produto = mapearProdutoListagem(item);
      if (produto) produtos.push(produto);
    }
    return produtos;
  } catch {
    return [];
  }
}

interface GetProdutosFiltradosOpts {
  q?: string;
  categoria_id?: number;
  instituicao_id?: number;
  ordenar?: OrdenacaoProdutos;
  apenasDestaque?: boolean;
  apenasTroca?: boolean;
  limite?: number;
  offset?: number;
}

export async function getProdutosFiltrados(
  opts: GetProdutosFiltradosOpts = {},
  client: SupabaseClient = defaultClient
): Promise<ProdutoListagem[]> {
  const { q, categoria_id, instituicao_id, ordenar = "recentes", apenasDestaque, apenasTroca, limite = 60, offset = 0 } = opts;

  let query = client
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, aceita_troca, criado_em,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, status, avatar_url, capa_url, usuarios!inner(instituicoes_id, matricula_status))`
    )
    .eq("status", "ativo")
    .gt("renovado_em", inicioValidade())
    .eq("lojas.status", "ativo");

  if (q) query = query.ilike("nome", `%${q}%`);
  if (categoria_id) query = query.eq("categoria_id", categoria_id);
  if (apenasDestaque) query = query.eq("destaque", true);
  if (apenasTroca) query = query.eq("aceita_troca", true);
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

  const { data, error } = await query.order("id", { ascending: false }).range(offset, offset + limite - 1);
  if (error) throw error;

  const produtos: ProdutoListagem[] = [];
  for (const item of (data ?? []) as unknown as ProdutoComJoinsRaw[]) {
    const produto = mapearProdutoListagem(item);
    if (produto) produtos.push(produto);
  }
  return produtos;
}

/* =========================================================================
   FUNÇÕES DE VERIFICAÇÃO ACADÊMICA & MODERAÇÃO
   ========================================================================= */

// Dados completos do usuário logado (RPC: colunas pessoais não são legíveis via select)
export async function getMeuUsuario(
  client: SupabaseClient = defaultClient
): Promise<Usuario | null> {
  const { data, error } = await client.rpc("meu_usuario").maybeSingle();
  if (error) throw error;
  return (data as Usuario | null) ?? null;
}

export async function solicitarVerificacaoMatricula(
  usuarioId: number,
  dados: { matricula: string; instituicoes_id?: number },
  client: SupabaseClient = defaultClient
): Promise<void> {
  const updates: Record<string, string | number | boolean> = {
    matricula: dados.matricula.trim(),
    matricula_status: "pendente",
    matricula_validada: false,
  };
  if (dados.instituicoes_id) {
    updates.instituicoes_id = dados.instituicoes_id;
  }

  const { error } = await client
    .from("usuarios")
    .update(updates)
    .eq("id", usuarioId);

  if (error) throw error;
}

// Dados mínimos do usuário logado para o Navbar (layout global, carregado no cliente)
export async function getResumoUsuarioNavbar(
  client: SupabaseClient = defaultClient
): Promise<{ is_admin: boolean; nome: string; instituicoes_id: number | null; loja_id: number | null } | null> {
  const usuario = await getMeuUsuario(client);
  if (!usuario) return null;

  const { data: loja, error } = await client
    .from("lojas")
    .select("id")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (error) throw error;

  return {
    is_admin: !!usuario.is_admin,
    nome: usuario.nome || "",
    instituicoes_id: usuario.instituicoes_id ? Number(usuario.instituicoes_id) : null,
    loja_id: loja?.id ?? null,
  };
}

export async function salvarOnboarding(
  usuarioId: number,
  dados: { instituicoes_id: number; matricula?: string },
  client: SupabaseClient = defaultClient
): Promise<void> {
  const updates: Record<string, string | number | boolean> = { instituicoes_id: dados.instituicoes_id };
  if (dados.matricula?.trim()) {
    updates.matricula = dados.matricula.trim();
    updates.matricula_status = "pendente";
  }

  const { error } = await client
    .from("usuarios")
    .update(updates)
    .eq("id", usuarioId);

  if (error) throw error;
}

export async function verificarMatriculaInstantanea(
  matriculaOpcional?: string,
  client: SupabaseClient = defaultClient
): Promise<{ success: boolean; message: string }> {
  // O banco confere o e-mail confirmado do Auth e define a instituição pelo domínio
  const { data: verificado, error } = await client.rpc("verificar_matricula_por_email", {
    p_matricula: matriculaOpcional?.trim() || null,
  });

  if (error) throw error;

  if (!verificado) {
    return {
      success: false,
      message: "Seu e-mail não é de uma instituição parceira ou ainda não foi confirmado. Envie sua matrícula para verificação manual.",
    };
  }

  return {
    success: true,
    message: "Parabéns! Seu vínculo acadêmico foi confirmado e o selo Aluno Verificado já está ativo em todos os seus anúncios!",
  };
}

export async function moderarMatricula(
  usuarioId: number,
  status: "verificado" | "rejeitado",
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.rpc("admin_moderar_matricula", {
    p_usuario_id: usuarioId,
    p_status: status,
  });

  if (error) throw error;
}

export async function getUsuariosParaModeracao(
  client: SupabaseClient = defaultClient
): Promise<UsuarioModeracao[]> {
  const { data, error } = await client.rpc("admin_listar_usuarios");
  if (error) throw error;

  return ((data ?? []) as UsuarioModeracao[]).map((u) => ({
    ...u,
    telefone: u.telefone || "",
    matricula: u.matricula || "",
    matricula_status: u.matricula_status || "pendente",
    instituicao_nome: u.instituicao_nome ?? undefined,
    loja_id: u.loja_id ?? undefined,
    status: u.status || "ativo",
  }));
}

export async function getLojasParaModeracao(
  client: SupabaseClient = defaultClient
): Promise<LojaModeracao[]> {
  const { data, error } = await client.rpc("admin_listar_lojas");
  if (error) throw error;

  return ((data ?? []) as LojaModeracao[]).map((l) => ({
    ...l,
    total_produtos: Number(l.total_produtos),
    produtos_ativos: Number(l.produtos_ativos),
    produtos_vendidos: Number(l.produtos_vendidos),
    total_interesses: Number(l.total_interesses),
  }));
}

export async function getProdutosParaModeracao(
  client: SupabaseClient = defaultClient
): Promise<ProdutoModeracao[]> {
  const { data, error } = await client
    .from("produtos")
    .select("id, nome, preco, imagem_url, status, destaque, loja_id, lojas(nome)")
    .order("destaque", { ascending: false })
    .order("criado_em", { ascending: false });

  if (error) throw error;

  type ProdutoComLoja = Omit<ProdutoModeracao, "loja_nome"> & { lojas: { nome: string } | null };
  return ((data ?? []) as unknown as ProdutoComLoja[]).map((p) => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco),
    imagem_url: p.imagem_url,
    status: p.status,
    destaque: p.destaque,
    loja_id: p.loja_id,
    loja_nome: p.lojas?.nome ?? "—",
  }));
}

export async function moderarLoja(
  lojaId: number,
  status: LojaStatus,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.rpc("admin_moderar_loja", { p_loja_id: lojaId, p_status: status });
  if (error) throw error;
}

export async function definirDestaque(
  produtoId: number,
  destaque: boolean,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.rpc("admin_definir_destaque", { p_produto_id: produtoId, p_destaque: destaque });
  if (error) throw error;
}

export async function getLojasComImagens(
  client: SupabaseClient = defaultClient
): Promise<Pick<Loja, "id" | "nome" | "status" | "avatar_url" | "capa_url">[]> {
  const { data, error } = await client
    .from("lojas")
    .select("id, nome, status, avatar_url, capa_url")
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/* =========================================================================
   CONTATO, DENÚNCIAS, CONTA E BLOQUEIO
   ========================================================================= */

// Telefone do vendedor (exige login; o banco registra o interesse). null = vendedor sem WhatsApp.
export async function getContatoVendedor(
  lojaId: number,
  produtoId?: number,
  client: SupabaseClient = defaultClient
): Promise<string | null> {
  const { data, error } = await client.rpc("contato_vendedor", {
    p_loja_id: lojaId,
    p_produto_id: produtoId ?? null,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function denunciar(
  dados: { lojaId: number; produtoId?: number; motivo: MotivoDenuncia; detalhes?: string },
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.rpc("denunciar", {
    p_loja_id: dados.lojaId,
    p_produto_id: dados.produtoId ?? null,
    p_motivo: dados.motivo,
    p_detalhes: dados.detalhes?.trim() || null,
  });
  if (error) throw error;
}

// Apaga produtos, loja, usuário e login. Imagens são removidas antes (removerImagensDaConta).
export async function excluirMinhaConta(client: SupabaseClient = defaultClient): Promise<void> {
  const { error } = await client.rpc("excluir_minha_conta");
  if (error) throw error;
}

export async function definirStatusUsuario(
  usuarioId: number,
  status: UsuarioStatus,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.rpc("admin_definir_status_usuario", { p_usuario_id: usuarioId, p_status: status });
  if (error) throw error;
}

export async function getDenunciasParaModeracao(
  client: SupabaseClient = defaultClient
): Promise<DenunciaModeracao[]> {
  const { data, error } = await client.rpc("admin_listar_denuncias");
  if (error) throw error;
  return ((data ?? []) as DenunciaModeracao[]).map((d) => ({ ...d, id: Number(d.id) }));
}

export async function resolverDenuncia(
  denunciaId: number,
  status: DenunciaStatus,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.rpc("admin_resolver_denuncia", { p_denuncia_id: denunciaId, p_status: status });
  if (error) throw error;
}
