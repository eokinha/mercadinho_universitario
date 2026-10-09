import { supabase as defaultClient } from "@/lib/supabase";
import type {
  Categoria,
  CategoriaComFilhos,
  GrupoCategoria,
  Instituicao,
  Loja,
  LojaModeracao,
  LojaStatus,
  OrdenacaoProdutos,
  Produto,
  ProdutoListagem,
  ProdutoModeracao,
  ProdutoStatus,
  PerfilPublico,
  Usuario,
  UsuarioModeracao,
} from "@/types";
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


interface GetLojasFiltros {
  instituicao_id?: number;
  categoria_id?: number;
}


export async function getLojas(filtros: GetLojasFiltros = {}, client: SupabaseClient = defaultClient): Promise<Loja[]> {
  const { instituicao_id, categoria_id } = filtros;

  const selectClause = categoria_id
    ? "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega, usuarios!inner(instituicoes_id), produtos!inner(categoria_id)"
    : "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega, usuarios!inner(instituicoes_id)";

  let query = client
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
      slug: item.slug,
      instagram_url: item.instagram_url,
      tiktok_url: item.tiktok_url,
      whatsapp: item.whatsapp,
      locais_entrega: item.locais_entrega ?? [],
    });
  }
  return lojas;
}

export async function getLojaById(id: number, client: SupabaseClient = defaultClient): Promise<Loja | null> {
  const { data, error } = await client
    .from("lojas")
    .select(
      "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega"
    )
    .eq("id", id)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return (data as Loja | null) ?? null;
}



export async function getInstituicoes(client: SupabaseClient = defaultClient): Promise<Instituicao[]> {
  const { data, error } = await client
    .from("instituicoes")
    .select("id, nome, cnpj")
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Instituicao[];
}

export async function getLojaByAuthId(
  client: SupabaseClient = defaultClient
): Promise<Loja | null> {
  const usuario = await getMeuUsuario(client);
  if (!usuario) return null;

  const { data: loja, error: lojaError } = await client
    .from("lojas")
    .select("id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (lojaError) throw lojaError;
  return (loja as Loja | null) ?? null;
}

export async function updateLoja(lojaId: number, updates: Partial<Loja>, client: SupabaseClient = defaultClient): Promise<void> {
  const { error } = await client
    .from("lojas")
    .update(updates)
    .eq("id", lojaId);

  if (error) throw error;
}

export async function getOrCreatePerfilEstudante(
  client: SupabaseClient = defaultClient
): Promise<Loja> {
  // A linha em 'usuarios' é criada pelo trigger de signup (handle_new_user)
  const usuario = await getMeuUsuario(client);
  if (!usuario) {
    throw new Error("Cadastro do estudante não encontrado.");
  }

  // Verifica se já tem registro de loja/perfil
  const { data: lojaExistente, error: lojaError } = await client
    .from("lojas")
    .select(
      "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega"
    )
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (lojaError) throw lojaError;

  if (lojaExistente) {
    return lojaExistente as Loja;
  }

  // Cria perfil de estudante ativo automaticamente sem fricção
  const nomeCompleto = `${usuario.nome || "Estudante"} ${usuario.sobrenome || ""}`.trim();
  const slugGerado = `${(usuario.nome || "estudante").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${usuario.id}`;

  const { data: novaLoja, error: insertError } = await client
    .from("lojas")
    .insert({
      usuario_id: usuario.id,
      nome: nomeCompleto,
      descricao: "Estudante desapegando e trocando materiais no campus",
      contato: usuario.telefone || "",
      whatsapp: usuario.telefone || "",
      status: "ativo",
      slug: slugGerado,
      locais_entrega: ["RU Central", "Biblioteca"],
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return novaLoja as Loja;
}

export async function criarProduto(
  dados: Pick<Produto, "loja_id" | "nome" | "descricao" | "preco" | "categoria_id" | "aceita_troca">,
  client: SupabaseClient = defaultClient
): Promise<Produto> {
  const { data, error } = await client
    .from("produtos")
    .insert({ ...dados, status: "ativo" })
    .select("id, loja_id, nome, descricao, preco, imagem_url, status, criado_em, categoria_id, destaque, aceita_troca")
    .single();

  if (error) throw error;
  return data as Produto;
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
    .select("id, loja_id, nome, descricao, preco, imagem_url, status, criado_em, categoria_id, destaque, aceita_troca")
    .eq("loja_id", lojaId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Produto[];
}

export async function getLojaBySlug(slug: string, client: SupabaseClient = defaultClient): Promise<Loja | null> {
  const { data, error } = await client
    .from("lojas")
    .select(
      "id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega"
    )
    .eq("slug", slug)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return (data as Loja | null) ?? null;
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
        id, usuario_id, nome, descricao, contato, status, criado_em, avatar_url, capa_url, slug, instagram_url, tiktok_url, whatsapp, locais_entrega,
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
      const raw = data as unknown as Loja & {
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
        contato: raw.contato || "",
        status: raw.status,
        criado_em: raw.criado_em,
        avatar_url: raw.avatar_url,
        capa_url: raw.capa_url,
        slug: raw.slug,
        instagram_url: raw.instagram_url,
        tiktok_url: raw.tiktok_url,
        whatsapp: raw.whatsapp,
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
  let fallbackLoja: Loja | null = null;
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

export async function getProdutosByLoja(lojaId: number, client: SupabaseClient = defaultClient): Promise<Produto[]> {
  const loja = await getLojaById(lojaId, client);
  if (!loja) return [];

  const { data, error } = await client
    .from("produtos")
    .select(
      "id, loja_id, nome, descricao, preco, imagem_url, status, criado_em, categoria_id, destaque, aceita_troca"
    )
    .eq("loja_id", lojaId)
    .order("criado_em", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Produto[];
}

export async function getProdutosListagemByLoja(lojaId: number, client: SupabaseClient = defaultClient): Promise<ProdutoListagem[]> {
  const { data, error } = await client
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, aceita_troca,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, contato, status, avatar_url, capa_url, usuarios(matricula_status))`
    )
    .eq("loja_id", lojaId)
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
  contato: string;
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
    loja_contato: lojaRaw.contato,
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
         lojas!inner(id, nome, descricao, contato, status, avatar_url, capa_url, usuarios(matricula_status))`
      )
      .in("id", idsFavoritos);

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

interface GetProdutosAgrupadosOpts {
  q?: string;
  apenasDestaque?: boolean;
}

export async function getProdutosAgrupadosPorCategoria(
  opts: GetProdutosAgrupadosOpts = {},
  client: SupabaseClient = defaultClient
): Promise<GrupoCategoria[]> {
  let query = client
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, aceita_troca,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, contato, status, avatar_url, capa_url, usuarios(matricula_status))`
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
  apenasDestaque?: boolean;
  apenasTroca?: boolean;
}

export async function getProdutosFiltrados(
  opts: GetProdutosFiltradosOpts = {},
  client: SupabaseClient = defaultClient
): Promise<ProdutoListagem[]> {
  const { q, categoria_id, instituicao_id, ordenar = "recentes", apenasDestaque, apenasTroca } = opts;

  let query = client
    .from("produtos")
    .select(
      `id, nome, descricao, preco, imagem_url, loja_id, categoria_id, destaque, aceita_troca, criado_em,
       categorias!inner(id, nome),
       lojas!inner(id, nome, descricao, contato, status, avatar_url, capa_url, usuarios!inner(instituicoes_id, matricula_status))`
    )
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

  const { data, error } = await query;
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
  instituicoes_id?: number,
  client: SupabaseClient = defaultClient
): Promise<{ success: boolean; message: string }> {
  // A checagem do domínio do e-mail acontece no banco, com o e-mail confirmado do Auth
  const { data: verificado, error } = await client.rpc("verificar_matricula_por_email", {
    p_matricula: matriculaOpcional?.trim() || null,
    p_instituicoes_id: instituicoes_id ?? null,
  });

  if (error) throw error;

  if (!verificado) {
    return {
      success: false,
      message: "Seu e-mail cadastrado não possui um domínio acadêmico reconhecido (.edu.br, .edu, ufmg.br, usp.br, etc.) ou ainda não foi confirmado. Use a verificação manual por matrícula.",
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
