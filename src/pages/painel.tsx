import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { createServerClient, supabase } from "@/lib/supabase";
import {
  getOrCreatePerfilEstudante,
  getProdutosPrivados,
  getProdutosFavoritos,
  atualizarStatusProduto,
  deletarProduto,
  updateLoja,
  toggleFavorito,
  getInstituicoes,
  getUsuarioByIdOrEmail,
  verificarMatriculaInstantanea,
  solicitarVerificacaoMatricula,
} from "@/lib/queries";
import { uploadImagemLoja } from "@/lib/storage";
import { validarEmailUniversitario } from "@/lib/validacoes";
import CardProduto from "@/components/CardProduto";
import ModalProduto from "@/components/ModalProduto";
import type { Loja, Produto, ProdutoListagem, Instituicao, Usuario } from "@/types";

interface Props {
  loja: Loja;
  produtosIniciais: Produto[];
  favoritosIniciais: ProdutoListagem[];
  userEmail: string;
  usuarioInicial: Usuario | null;
  instituicoes: Instituicao[];
}

const LOCAIS_SUGERIDOS = [
  "RU Central",
  "Biblioteca Universitária",
  "Centro de Vivência",
  "Centro Acadêmico (CA)",
  "Entrada Principal do Campus",
  "Bloco de Aulas",
];

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  // Modo de pré-visualização para testes de UI
  if (!user && (ctx.query.preview === "1" || process.env.NODE_ENV === "development" && ctx.query.demo === "1")) {
    const mockLoja: Loja = {
      id: 1,
      usuario_id: 1,
      nome: "Lucas Silva",
      descricao: "Estudante de Engenharia desapegando e trocando livros e eletrônicos no campus",
      contato: "(31) 99999-0001",
      whatsapp: "(31) 99999-0001",
      status: "ativo",
      criado_em: "2026-04-26T00:14:02.38628+00:00",
      avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=LucasSilva&backgroundColor=ff385c",
      capa_url: null,
      slug: "lucas-silva",
      instagram_url: "@lucas_eng",
      tiktok_url: null,
      locais_entrega: ["RU Central", "Biblioteca Universitária", "Centro de Vivência"],
      cor_tema: "#FF385C",
    };
    const produtosIniciais = await getProdutosPrivados(1, serverSupabase);
    const favoritosIniciais = await getProdutosFavoritos(1, serverSupabase);
    const instituicoes = await getInstituicoes(serverSupabase);
    const mockStatus = ((ctx.query.status as any) || "verificado") as "verificado" | "pendente" | "rejeitado";

    const mockUsuario: Usuario = {
      id: 1,
      nome: "Lucas",
      sobrenome: "Silva",
      email: "lucas.silva@aluno.ufmg.br",
      password: "",
      telefone: "(31) 99999-0001",
      cpf: "11122233344",
      matricula: "2024019283",
      matricula_validada: mockStatus === "verificado",
      matricula_status: mockStatus,
      instituicoes_id: 1,
      status: "ativo",
    };

    return {
      props: {
        loja: mockLoja,
        produtosIniciais,
        favoritosIniciais,
        userEmail: "lucas.silva@aluno.ufmg.br",
        usuarioInicial: mockUsuario,
        instituicoes,
      },
    };
  }

  if (!user) {
    return {
      redirect: {
        destination: `/login?msg=${encodeURIComponent("Faça login para acessar seu painel.")}`,
        permanent: false,
      },
    };
  }

  try {
    const loja = await getOrCreatePerfilEstudante(user.id, serverSupabase, user.email);
    const produtosIniciais = await getProdutosPrivados(loja.id, serverSupabase);
    const favoritosIniciais = await getProdutosFavoritos(loja.usuario_id, serverSupabase);
    const usuarioInicial = await getUsuarioByIdOrEmail(user.email || user.id, serverSupabase);
    const instituicoes = await getInstituicoes(serverSupabase);

    return {
      props: {
        loja,
        produtosIniciais,
        favoritosIniciais,
        userEmail: user.email || "",
        usuarioInicial,
        instituicoes,
      },
    };
  } catch (err) {
    console.error("Erro ao carregar dados do painel:", err);
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
};

export default function PainelPage({
  loja: lojaInicial,
  produtosIniciais,
  favoritosIniciais,
  userEmail,
  usuarioInicial,
  instituicoes,
}: Props) {
  const router = useRouter();
  const abaAtiva = (router.query.aba as string) || "anuncios";

  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais);
  const [favoritos, setFavoritos] = useState<ProdutoListagem[]>(favoritosIniciais);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "pausados">("todos");

  // Estado do Usuário e Verificação Acadêmica
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioInicial);
  const [matriculaStatus, setMatriculaStatus] = useState<"pendente" | "verificado" | "rejeitado">(
    usuarioInicial?.matricula_status || "pendente"
  );
  const [matriculaInput, setMatriculaInput] = useState(usuarioInicial?.matricula || "");
  const [instituicaoSelecionada, setInstituicaoSelecionada] = useState<number | "">(
    usuarioInicial?.instituicoes_id || ""
  );
  const [verificandoInstantaneo, setVerificandoInstantaneo] = useState(false);
  const [enviandoMatricula, setEnviandoMatricula] = useState(false);
  const [mensagemVerificacao, setMensagemVerificacao] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const emailEhUniversitario = useMemo(() => {
    return validarEmailUniversitario(userEmail || usuario?.email || "");
  }, [userEmail, usuario?.email]);

  // Estado para Modal de detalhes de favorito
  const [produtoAtivoModal, setProdutoAtivoModal] = useState<ProdutoListagem | null>(null);

  // Estados de edição de perfil
  const [nome, setNome] = useState(loja.nome);
  const [descricao, setDescricao] = useState(loja.descricao || "");
  const [whatsapp, setWhatsapp] = useState(loja.whatsapp || loja.contato || "");
  const [locais, setLocais] = useState<string[]>(loja.locais_entrega || []);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [mensagemPerfil, setMensagemPerfil] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Handlers de Verificação Acadêmica
  async function handleValidacaoInstantanea() {
    if (!usuario) return;
    setVerificandoInstantaneo(true);
    setMensagemVerificacao(null);
    try {
      const res = await verificarMatriculaInstantanea(
        usuario.id,
        matriculaInput,
        instituicaoSelecionada ? Number(instituicaoSelecionada) : undefined
      );
      if (res.success) {
        setMatriculaStatus("verificado");
        setMensagemVerificacao({ tipo: "sucesso", texto: res.message });
      } else {
        setMensagemVerificacao({ tipo: "erro", texto: res.message });
      }
    } catch (err: any) {
      setMensagemVerificacao({ tipo: "erro", texto: err?.message || "Erro ao validar matrícula." });
    } finally {
      setVerificandoInstantaneo(false);
    }
  }

  async function handleSubmeterMatricula(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    if (!matriculaInput.trim()) {
      setMensagemVerificacao({ tipo: "erro", texto: "Informe o número da matrícula." });
      return;
    }
    setEnviandoMatricula(true);
    setMensagemVerificacao(null);
    try {
      await solicitarVerificacaoMatricula(usuario.id, {
        matricula: matriculaInput,
        instituicoes_id: instituicaoSelecionada ? Number(instituicaoSelecionada) : undefined,
      });
      setMatriculaStatus("pendente");
      setMensagemVerificacao({
        tipo: "sucesso",
        texto: "Matrícula enviada para análise da moderação! Em breve seu selo Aluno Verificado será ativado.",
      });
    } catch (err: any) {
      setMensagemVerificacao({ tipo: "erro", texto: err?.message || "Erro ao enviar matrícula." });
    } finally {
      setEnviandoMatricula(false);
    }
  }

  // Estatísticas do estudante
  const totalProdutos = produtos.length;
  const isAtivo = (p: Produto) => p.status === "ativo" || (p.status as unknown) === true;
  const produtosAtivos = useMemo(() => produtos.filter(isAtivo), [produtos]);
  const produtosPausados = useMemo(() => produtos.filter((p) => !isAtivo(p)), [produtos]);

  const produtosFiltrados = useMemo(() => {
    if (filtroStatus === "ativos") return produtosAtivos;
    if (filtroStatus === "pausados") return produtosPausados;
    return produtos;
  }, [produtos, produtosAtivos, produtosPausados, filtroStatus]);

  function mudarAba(aba: string) {
    router.push(`/painel?aba=${aba}`, undefined, { shallow: true });
  }

  // Alternar status do anúncio (Pausar / Reativar)
  async function handleToggleStatus(produto: Produto) {
    const ativo = isAtivo(produto);
    const novoStatus = ativo ? "pausado" : "ativo";
    try {
      await atualizarStatusProduto(produto.id, novoStatus);
      setProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, status: novoStatus } : p))
      );
    } catch (err) {
      alert("Não foi possível atualizar o status do produto.");
    }
  }

  // Excluir anúncio
  async function handleExcluir(produtoId: number) {
    if (!confirm("Tem certeza que deseja excluir este anúncio permanentemente?")) return;

    try {
      await deletarProduto(produtoId);
      setProdutos((prev) => prev.filter((p) => p.id !== produtoId));
    } catch (err) {
      alert("Não foi possível excluir o anúncio.");
    }
  }

  // Remover de favoritos
  async function handleRemoverFavorito(produtoId: number) {
    try {
      await toggleFavorito(loja.usuario_id, produtoId);
      setFavoritos((prev) => prev.filter((p) => p.id !== produtoId));
    } catch (err) {
      alert("Erro ao remover favorito.");
    }
  }

  // Upload de avatar
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setAvatarUploading(true);

    try {
      const url = await uploadImagemLoja(loja.id, "avatar", file);
      setLoja((prev) => ({ ...prev, avatar_url: url }));
      setMensagemPerfil({ tipo: "sucesso", texto: "Foto de perfil atualizada com sucesso!" });
    } catch (err: any) {
      setMensagemPerfil({ tipo: "erro", texto: err?.message || "Erro ao enviar imagem." });
    } finally {
      setAvatarUploading(false);
    }
  }

  // Toggle local de entrega no campus
  function toggleLocal(local: string) {
    if (locais.includes(local)) {
      setLocais(locais.filter((l) => l !== local));
    } else {
      setLocais([...locais, local]);
    }
  }

  // Salvar alterações no perfil
  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    setMensagemPerfil(null);

    try {
      await updateLoja(loja.id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        whatsapp: whatsapp.trim(),
        contato: whatsapp.trim(),
        locais_entrega: locais,
      });

      setLoja((prev) => ({
        ...prev,
        nome: nome.trim(),
        descricao: descricao.trim(),
        whatsapp: whatsapp.trim(),
        contato: whatsapp.trim(),
        locais_entrega: locais,
      }));

      setMensagemPerfil({ tipo: "sucesso", texto: "Perfil universitário atualizado com sucesso!" });
    } catch (err: any) {
      setMensagemPerfil({ tipo: "erro", texto: err?.message || "Erro ao salvar alterações." });
    } finally {
      setSalvandoPerfil(false);
    }
  }

  return (
    <>
      <Head>
        <title>Meu Painel • Mercadinho Universitário</title>
      </Head>

      <div className="min-h-screen bg-[#F8F9FA] pb-16">
        {/* Cabeçalho do Painel */}
        <div className="bg-white border-b border-gray-200/80">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {loja.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={loja.avatar_url}
                        alt={loja.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-[#FF385C]">
                        {loja.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      {loja.nome}
                    </h1>
                    {matriculaStatus === "verificado" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Aluno Verificado</span>
                      </span>
                    ) : matriculaStatus === "pendente" ? (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⏳ Matrícula em Análise
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => mudarAba("perfil")}
                        className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-0.5 rounded-full transition flex items-center gap-1"
                        title="Clique para verificar seu vínculo acadêmico"
                      >
                        <span>⚠️ Não Verificado</span>
                        <span className="text-xs text-[#FF385C]">Verificar →</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{userEmail}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                    <Link
                      href={`/perfil/${loja.id}`}
                      className="text-[#FF385C] hover:text-[#e0314f] font-semibold flex items-center gap-1 hover:underline"
                    >
                      <span>Ver meu perfil público</span>
                      <span>↗</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Botão de Anunciar */}
              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href="/anunciar"
                  className="w-full sm:w-auto bg-[#FF385C] hover:bg-[#e0314f] text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-[#FF385C]/25 transition hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  <span>+ Novo Anúncio</span>
                </Link>
              </div>
            </div>

            {/* Abas do Painel */}
            <div className="mt-8 flex items-center gap-4 border-b border-gray-100 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => mudarAba("anuncios")}
                className={`pb-3 font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 shrink-0 ${
                  abaAtiva === "anuncios"
                    ? "border-[#FF385C] text-[#FF385C]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>📦</span>
                <span>Meus Anúncios ({totalProdutos})</span>
              </button>

              <button
                type="button"
                onClick={() => mudarAba("favoritos")}
                className={`pb-3 font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 shrink-0 ${
                  abaAtiva === "favoritos"
                    ? "border-[#FF385C] text-[#FF385C]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>❤️</span>
                <span>Meus Favoritos ({favoritos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => mudarAba("perfil")}
                className={`pb-3 font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 shrink-0 ${
                  abaAtiva === "perfil"
                    ? "border-[#FF385C] text-[#FF385C]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>👤</span>
                <span>Meu Perfil Universitário</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notificação de sucesso ao cadastrar anúncio */}
        {router.query.sucesso && (
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-2">
                <span>🎉</span>
                <span>Anúncio publicado com sucesso! Ele já está disponível no campus.</span>
              </div>
              <button
                type="button"
                onClick={() => router.replace("/painel?aba=anuncios", undefined, { shallow: true })}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
          {/* ================= ABA 1: MEUS ANÚNCIOS ================= */}
          {abaAtiva === "anuncios" && (
            <div>
              {/* Filtros de Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("todos")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      filtroStatus === "todos"
                        ? "bg-gray-900 text-white shadow-xs"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Todos ({totalProdutos})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("ativos")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      filtroStatus === "ativos"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Ativos ({produtosAtivos.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus("pausados")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      filtroStatus === "pausados"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Pausados ({produtosPausados.length})</span>
                  </button>
                </div>

                <Link
                  href="/anunciar"
                  className="text-[#FF385C] hover:text-[#e0314f] text-xs font-bold hover:underline self-start sm:self-auto"
                >
                  + Anunciar outro item
                </Link>
              </div>

              {/* Lista de Anúncios */}
              {produtosFiltrados.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center my-6">
                  <span className="text-4xl block mb-2">📦</span>
                  <p className="text-gray-800 font-bold text-base">
                    Você ainda não tem anúncios nesta categoria.
                  </p>
                  <p className="text-gray-400 text-xs mt-1 mb-5">
                    Desapegue de livros, calculadoras ou materiais que você não usa mais.
                  </p>
                  <Link
                    href="/anunciar"
                    className="inline-flex items-center gap-2 bg-[#FF385C] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#e0314f] transition shadow-xs"
                  >
                    Publicar primeiro anúncio
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {produtosFiltrados.map((produto) => {
                    const isTroca = produto.preco === 0 || produto.nome.toLowerCase().includes("troca");

                    return (
                      <div
                        key={produto.id}
                        className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-4 hover:border-gray-300 transition"
                      >
                        {/* Imagem miniatura */}
                        <div className="w-full sm:w-28 h-28 rounded-xl bg-gray-100 overflow-hidden shrink-0 relative">
                          {produto.imagem_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={produto.imagem_url}
                              alt={produto.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                              📷
                            </div>
                          )}
                          <span
                            className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isAtivo(produto)
                                ? "bg-emerald-500 text-white"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {isAtivo(produto) ? "Ativo" : "Pausado"}
                          </span>
                        </div>

                        {/* Detalhes e Ações */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-gray-900 font-bold text-sm leading-snug line-clamp-1">
                                {produto.nome}
                              </h3>
                              {isTroca && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                                  Troca
                                </span>
                              )}
                            </div>

                            <p className="text-gray-900 font-black text-sm mt-1">
                              {produto.preco === 0 ? "Troca Direta (R$ 0)" : formatarPreco(produto.preco)}
                            </p>

                            {produto.descricao && (
                              <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                                {produto.descricao}
                              </p>
                            )}
                          </div>

                          {/* Botões de Ação */}
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(produto)}
                              className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
                            >
                              {isAtivo(produto) ? "⏸️ Pausar" : "▶️ Reativar"}
                            </button>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleExcluir(produto.id)}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                              >
                                Excluir
                              </button>

                              <Link
                                href={`/perfil/${loja.id}`}
                                className="text-xs font-semibold text-[#FF385C] hover:underline"
                              >
                                Ver anúncio →
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 2: MEUS FAVORITOS ================= */}
          {abaAtiva === "favoritos" && (
            <div>
              <div className="mb-6 flex items-baseline justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    Itens que você salvou no campus
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fale com o anunciante via WhatsApp para negociar a compra ou troca.
                  </p>
                </div>
              </div>

              {favoritos.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center my-6">
                  <span className="text-4xl block mb-2">❤️</span>
                  <p className="text-gray-800 font-bold text-base">
                    Você ainda não favoritou nenhum item.
                  </p>
                  <p className="text-gray-400 text-xs mt-1 mb-5">
                    Explore o catálogo ou a Feira de Trocas e clique no coração para salvar o que gostar.
                  </p>
                  <Link
                    href="/listagem"
                    className="inline-flex items-center gap-2 bg-[#FF385C] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#e0314f] transition shadow-xs"
                  >
                    Explorar produtos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favoritos.map((produto) => (
                    <div key={produto.id} className="relative group">
                      <CardProduto
                        produto={produto}
                        onAbrir={setProdutoAtivoModal}
                        largura="fluida"
                        tagBadge={produto.preco === 0 ? "Aceita Troca" : "Parcele sem juros"}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoverFavorito(produto.id)}
                        className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full hover:bg-black transition z-20"
                        title="Remover dos favoritos"
                      >
                        ✕ Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 3: MEU PERFIL ================= */}
          {abaAtiva === "perfil" && (
            <div className="max-w-2xl bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-1">
                Editar Perfil Universitário
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                Essas informações aparecem no seu perfil público para os outros alunos do campus.
              </p>

              {mensagemPerfil && (
                <div
                  className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                    mensagemPerfil.tipo === "sucesso"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <span>{mensagemPerfil.tipo === "sucesso" ? "✓" : "⚠️"}</span>
                  <span>{mensagemPerfil.texto}</span>
                </div>
              )}

              <form onSubmit={handleSalvarPerfil} className="space-y-5">
                {/* Upload Foto de Perfil */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Foto de Perfil
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {loja.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={loja.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-gray-400">
                          {nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:border-gray-400 bg-white font-semibold text-xs text-gray-700 cursor-pointer transition shadow-2xs">
                        <span>{avatarUploading ? "Enviando..." : "Alterar foto"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={avatarUploading}
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Formatos JPG, PNG ou WebP até 3 MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nome de Exibição */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nome de Exibição *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    WhatsApp para Negociação *
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(31) 99999-9999"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Os colegas usam este número para combinar compras e trocas com você.
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Bio / Apresentação
                  </label>
                  <textarea
                    rows={3}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Aluno do 4º semestre de Engenharia desapegando de livros do ciclo básico..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white resize-y"
                  />
                </div>

                {/* Locais de Encontro */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Locais que você costuma entregar no campus
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {LOCAIS_SUGERIDOS.map((local) => {
                      const ativo = locais.includes(local);
                      return (
                        <button
                          key={local}
                          type="button"
                          onClick={() => toggleLocal(local)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                            ativo
                              ? "bg-gray-900 border-gray-900 text-white font-bold"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span>{ativo ? "✓" : "+"}</span>
                          <span>{local}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botão Salvar */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/perfil/${loja.id}`}
                    className="text-xs font-bold text-[#FF385C] hover:underline"
                  >
                    Ver meu perfil público →
                  </Link>

                  <button
                    type="submit"
                    disabled={salvandoPerfil}
                    className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {salvandoPerfil ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>

              {/* Seção de Verificação Acadêmica */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <h3 className="text-base font-black text-gray-900">
                      Verificação de Matrícula & Vínculo
                    </h3>
                  </div>

                  {matriculaStatus === "verificado" ? (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                      <span>✓</span>
                      <span>Aluno Verificado</span>
                    </span>
                  ) : matriculaStatus === "pendente" ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                      <span>⏳</span>
                      <span>Em Análise</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold px-3 py-1 rounded-full">
                      <span>⚠️</span>
                      <span>Não Verificado</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                  O selo <strong>Aluno Verificado 🛡️</strong> confirma seu vínculo ativo com a universidade, gerando confiança imediata para outros estudantes comprarem ou trocarem com você no campus.
                </p>

                {mensagemVerificacao && (
                  <div
                    className={`mb-5 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                      mensagemVerificacao.tipo === "sucesso"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <span>{mensagemVerificacao.tipo === "sucesso" ? "🎉" : "⚠️"}</span>
                    <span>{mensagemVerificacao.texto}</span>
                  </div>
                )}

                {matriculaStatus === "verificado" ? (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 text-emerald-900">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-lg font-bold">
                        🛡️
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950">
                          Sua credencial de estudante está ativa!
                        </h4>
                        <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                          Todos os seus anúncios, vitrine e perfil contam com o selo oficial de Aluno Verificado.
                        </p>
                        {usuario?.matricula && (
                          <p className="text-[11px] text-emerald-700 font-semibold mt-2">
                            Matrícula registrada: {usuario.matricula}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Opção 1: Validação Instantânea por E-mail Institucional */}
                    {emailEhUniversitario && (
                      <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200 rounded-2xl p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              Recomendado & Instantâneo ⚡
                            </span>
                            <h4 className="text-sm font-bold text-gray-900 mt-1">
                              Validar com seu e-mail institucional
                            </h4>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Detectamos que seu e-mail <strong>{userEmail}</strong> pertence a um domínio acadêmico reconhecido.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={verificandoInstantaneo}
                            onClick={handleValidacaoInstantanea}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs shrink-0 disabled:opacity-50"
                          >
                            {verificandoInstantaneo ? "Validando..." : "Validar Agora (1 clique)"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Opção 2: Validação por Matrícula e Faculdade */}
                    <div className="bg-gray-50 border border-gray-200/90 rounded-2xl p-4 sm:p-5">
                      <h4 className="text-xs font-bold text-gray-800 mb-1">
                        {emailEhUniversitario ? "Ou informe sua matrícula para o registro:" : "Informe seus dados acadêmicos para validação:"}
                      </h4>
                      <p className="text-[11px] text-gray-500 mb-4">
                        Envie sua matrícula para que nossa moderação valide seu vínculo acadêmico.
                      </p>

                      <form onSubmit={handleSubmeterMatricula} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                              Sua Faculdade / Campus
                            </label>
                            <select
                              value={instituicaoSelecionada}
                              onChange={(e) => setInstituicaoSelecionada(e.target.value ? Number(e.target.value) : "")}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none bg-white"
                            >
                              <option value="">Selecione sua instituição...</option>
                              {instituicoes.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                              Número da Matrícula Acadêmica *
                            </label>
                            <input
                              type="text"
                              required
                              value={matriculaInput}
                              onChange={(e) => setMatriculaInput(e.target.value)}
                              placeholder="Ex: 2024019283"
                              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={enviandoMatricula || !matriculaInput.trim()}
                            className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
                          >
                            {enviandoMatricula ? "Enviando..." : matriculaStatus === "pendente" ? "Atualizar Dados em Análise" : "Solicitar Verificação de Matrícula"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes de Produto (para favoritos) */}
      <ModalProduto
        produto={produtoAtivoModal}
        onFechar={() => setProdutoAtivoModal(null)}
      />
    </>
  );
}
