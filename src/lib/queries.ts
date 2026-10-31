import { supabase as defaultClient } from "@/lib/supabase";
import type {
  AnuncioDetalhe,
  AnuncioLeitura,
  Categoria,
  CategoriaComFilhos,
  DenunciaModeracao,
  DenunciaStatus,
  Instituicao,
  Loja,
  LojaModeracao,
  MotivoDenuncia,
  LojaStatus,
  OrdenacaoProdutos,
  Produto,
  ProdutoListagem,
  ProdutoModeracao,
  ProdutoStatus,
  PerfilLeitura,
  PerfilPublico,
  LojaDoAnuncio,
  ResumoAnuncioCompartilhado,
  ResumoLojaCompartilhada,
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


export async function getInstituicoes(client: SupabaseClient = defaultClient): Promise<Instituicao[]> {
  const { data, error } = await client
    .from("instituicoes")
    .select("id, nome, cnpj, dominios")
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

// Perfil de qualquer campus (RPC; exige login). De outro campus a página fica só leitura:
// contato e favoritos são barrados no banco (contato_vendedor, política de favoritos).
export async function getPerfilLeitura(
  idOuSlug: string,
  client: SupabaseClient = defaultClient
): Promise<PerfilLeitura | null> {
  const { data, error } = await client.rpc("perfil_leitura", { p_id_ou_slug: idOuSlug });
  if (error) throw error;
  if (!data) return null;

  const raw = data as {
    perfil: PerfilPublico;
    produtos: ProdutoListagem[];
    mesmo_campus: boolean;
    eh_dono?: boolean;
    codigo_compartilhamento?: string | null;
  };
  return {
    perfil: { ...raw.perfil, locais_entrega: raw.perfil.locais_entrega ?? [] },
    produtos: (raw.produtos ?? []).map((p) => ({ ...p, preco: Number(p.preco) })),
    mesmoCampus: raw.mesmo_campus,
    ehDono: raw.eh_dono ?? false,
    codigoCompartilhamento: raw.codigo_compartilhamento ?? null,
  };
}

// Visitante vindo do QR code: nome da loja e da faculdade, só com o código certo (RPC, migração 20)
export async function getResumoLojaCompartilhada(
  slug: string,
  codigo: string,
  client: SupabaseClient = defaultClient
): Promise<ResumoLojaCompartilhada | null> {
  const { data, error } = await client
    .rpc("resumo_loja_compartilhada", { p_slug: slug, p_codigo: codigo })
    .maybeSingle();
  if (error) throw error;
  return (data as ResumoLojaCompartilhada | null) ?? null;
}

// Página do anúncio (RPC; exige login). null = anúncio não existe.
export async function getAnuncioLeitura(
  id: number,
  client: SupabaseClient = defaultClient
): Promise<AnuncioLeitura | null> {
  const { data, error } = await client.rpc("anuncio_leitura", { p_id: id });
  if (error) throw error;
  if (!data) return null;

  const raw = data as {
    disponivel: boolean;
    eh_dono: boolean;
    mesmo_campus?: boolean;
    codigo_compartilhamento?: string | null;
    favoritado?: boolean;
    anuncio: AnuncioDetalhe;
    loja: (LojaDoAnuncio & { locais_entrega?: string[] }) | { slug: string | null; nome: string } | null;
    outros?: ProdutoListagem[];
  };

  if (!raw.disponivel && !raw.eh_dono) {
    return { estado: "indisponivel", nome: raw.anuncio.nome, loja: raw.loja ? { slug: raw.loja.slug, nome: raw.loja.nome } : null };
  }

  const loja = raw.loja as LojaDoAnuncio;
  return {
    estado: "ok",
    disponivel: raw.disponivel,
    ehDono: raw.eh_dono,
    mesmoCampus: raw.mesmo_campus ?? false,
    codigoCompartilhamento: raw.codigo_compartilhamento ?? null,
    favoritado: raw.favoritado ?? false,
    anuncio: { ...raw.anuncio, preco: Number(raw.anuncio.preco) },
    loja: { ...loja, locais_entrega: loja.locais_entrega ?? [] },
    outros: (raw.outros ?? []).map((p) => ({ ...p, preco: Number(p.preco) })),
  };
}

// Visitante com link compartilhado de anúncio: nome, preço e foto, só com o código da loja (RPC, migração 22)
export async function getResumoAnuncioCompartilhado(
  id: number,
  codigo: string,
  client: SupabaseClient = defaultClient
): Promise<ResumoAnuncioCompartilhado | null> {
  const { data, error } = await client
    .rpc("resumo_anuncio_compartilhado", { p_id: id, p_codigo: codigo })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const resumo = data as ResumoAnuncioCompartilhado;
  return { ...resumo, preco: Number(resumo.preco) };
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
  campus_id?: number;
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
  const { q, categoria_id, campus_id, ordenar = "recentes", apenasDestaque, apenasTroca, limite = 60, offset = 0 } = opts;

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
  // A RLS já limita ao campus do aluno; o filtro explícito cobre o admin (que lê tudo)
  if (campus_id) {
    query = query.eq("lojas.usuarios.instituicoes_id", campus_id);
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

// O campus não entra aqui: vem do domínio do e-mail (migração 19)
export async function solicitarVerificacaoMatricula(
  usuarioId: number,
  matricula: string,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client
    .from("usuarios")
    .update({ matricula: matricula.trim(), matricula_status: "pendente", matricula_validada: false })
    .eq("id", usuarioId);

  if (error) throw error;
}

// Dados mínimos do usuário logado para o Navbar (layout global, carregado no cliente)
export async function getResumoUsuarioNavbar(
  client: SupabaseClient = defaultClient
): Promise<{
  is_admin: boolean;
  nome: string;
  instituicoes_id: number | null;
  instituicao_nome: string | null;
  loja_id: number | null;
} | null> {
  const usuario = await getMeuUsuario(client);
  if (!usuario) return null;

  const [{ data: loja, error }, { data: instituicao, error: erroInstituicao }] = await Promise.all([
    client.from("lojas").select("id").eq("usuario_id", usuario.id).maybeSingle(),
    usuario.instituicoes_id
      ? client.from("instituicoes").select("nome").eq("id", usuario.instituicoes_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (error) throw error;
  if (erroInstituicao) throw erroInstituicao;

  return {
    is_admin: !!usuario.is_admin,
    nome: usuario.nome || "",
    instituicoes_id: usuario.instituicoes_id ? Number(usuario.instituicoes_id) : null,
    instituicao_nome: (instituicao as { nome: string } | null)?.nome ?? null,
    loja_id: loja?.id ?? null,
  };
}

// Troca de e-mail = troca de campus. O Supabase envia o link ao novo endereço
// (template db/emails/trocar-email.html); o banco recusa domínio fora de instituicoes.dominios
// e, na confirmação, recalcula o campus e pausa os anúncios (migração 19).
export async function solicitarTrocaEmail(
  novoEmail: string,
  client: SupabaseClient = defaultClient
): Promise<void> {
  const { error } = await client.auth.updateUser(
    { email: novoEmail.trim().toLowerCase() },
    { emailRedirectTo: `${window.location.origin}/confirmar-email` }
  );
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
