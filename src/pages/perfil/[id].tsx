import { useState, useMemo } from "react";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getPerfilPublico, getProdutosListagemByLoja } from "@/lib/queries";
import CardProduto from "@/components/CardProduto";
import ModalProduto from "@/components/ModalProduto";
import { linkWhatsapp } from "@/lib/contato";
import type { PerfilPublico, ProdutoListagem } from "@/types";

interface Props {
  perfil: PerfilPublico;
  produtos: ProdutoListagem[];
}

function formatarTempoPlataforma(dataString?: string): string {
  if (!dataString) return "Membro recente";
  try {
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return "Membro do campus";
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `No Mercadinho desde ${meses[data.getMonth()]} de ${data.getFullYear()}`;
  } catch {
    return "Membro do campus";
  }
}

function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.4h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.21-3.75.98 1-3.65-.23-.37a9.5 9.5 0 1 1 17.66-4.93 9.51 9.51 0 0 1-9.48 9.5Zm5.43-7.1c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const idOuSlug = ctx.params?.id as string;
  const supabase = createServerClient(ctx);

  const perfil = await getPerfilPublico(idOuSlug, supabase);

  if (!perfil) {
    return { notFound: true };
  }

  const produtos = await getProdutosListagemByLoja(perfil.id, supabase);

  return {
    props: {
      perfil,
      produtos,
    },
  };
};

export default function PerfilPublicoPage({ perfil, produtos }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "venda" | "troca">("todos");
  const [busca, setBusca] = useState("");

  const themeColor = perfil.cor_tema || "#FF385C";
  
  // Mensagem personalizada para iniciar contato no WhatsApp
  const mensagemWhatsapp = encodeURIComponent(
    `Olá, ${perfil.nome}! Vi seu perfil no Mercadinho Universitário e gostaria de saber mais sobre seus anúncios.`
  );
  const whatsappUrl = linkWhatsapp(perfil.whatsapp || perfil.contato) + `&text=${mensagemWhatsapp}`;

  const nomeExibicao = perfil.usuario_nome 
    ? `${perfil.usuario_nome} ${perfil.usuario_sobrenome || ""}`.trim()
    : perfil.nome;

  const dataRegistro = perfil.usuario_criado_em || perfil.criado_em;

  // Separa anúncios de venda e troca
  const produtosTroca = useMemo(
    () => produtos.filter((p) => p.preco === 0 || p.nome.toLowerCase().includes("troca") || (p.descricao && p.descricao.toLowerCase().includes("troco"))),
    [produtos]
  );
  
  const produtosVenda = useMemo(
    () => produtos.filter((p) => p.preco > 0),
    [produtos]
  );

  // Filtra produtos de acordo com a aba selecionada e busca
  const produtosFiltrados = useMemo(() => {
    let lista = produtos;
    if (filtroTipo === "troca") lista = produtosTroca;
    if (filtroTipo === "venda") lista = produtosVenda;

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nome.toLowerCase().includes(termo) ||
          (p.descricao && p.descricao.toLowerCase().includes(termo))
      );
    }
    return lista;
  }, [produtos, produtosTroca, produtosVenda, filtroTipo, busca]);

  return (
    <>
      <Head>
        <title>{nomeExibicao} • Perfil no Mercadinho Universitário</title>
        <meta
          name="description"
          content={`Confira os anúncios e itens para troca de ${nomeExibicao} no Mercadinho Universitário.`}
        />
      </Head>

      <div className="min-h-screen bg-[#F8F9FA] pb-16">
        {/* Barra superior de navegação / voltar */}
        <div className="bg-white border-b border-gray-200/80 sticky top-[65px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition"
            >
              <span>←</span>
              <span>Voltar para o início</span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Perfil do Universitário</span>
              <span>•</span>
              <span className="font-semibold text-gray-800">{nomeExibicao}</span>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
          {/* 1. CARD PRINCIPAL DE PERFIL (ESTILO OLX / AIRBNB P2P) */}
          <header className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden shadow-xs mb-8">
            {/* Banner de Capa */}
            <div
              className="relative h-36 sm:h-48 md:h-56 w-full overflow-hidden"
              style={{
                background: perfil.capa_url
                  ? "transparent"
                  : `linear-gradient(135deg, ${themeColor}15 0%, #180a1010 100%)`,
              }}
            >
              {perfil.capa_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={perfil.capa_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-end p-6 justify-end opacity-20">
                  <span className="text-8xl select-none">🎓</span>
                </div>
              )}
            </div>

            {/* Conteúdo do Perfil */}
            <div className="px-6 sm:px-8 pb-8 pt-0 relative">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
                
                {/* Avatar com badge */}
                <div className="flex items-end gap-5">
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-white border-4 border-white shadow-lg overflow-hidden shrink-0">
                      {perfil.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={perfil.avatar_url}
                          alt={nomeExibicao}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-4xl font-black">
                          {nomeExibicao.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Selo de ativo / online */}
                    <span
                      className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                      title="Estudante ativo na plataforma"
                    />
                  </div>

                  {/* Nome e Instituição */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                        {nomeExibicao}
                      </h1>
                      
                      {/* Selo Estudante Verificado Dinâmico */}
                      {perfil.matricula_status === "verificado" ? (
                        <span
                          className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full"
                          title="Matrícula universitária ativa e verificada"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-emerald-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Aluno Verificado</span>
                        </span>
                      ) : perfil.matricula_status === "pendente" ? (
                        <span
                          className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          title="Comprovante de matrícula em processo de verificação"
                        >
                          <span>⏳ Matrícula em Análise</span>
                        </span>
                      ) : null}
                    </div>

                    <p className="text-gray-500 text-sm mt-0.5 flex items-center gap-1.5 font-medium">
                      <span>🎓</span>
                      <span>
                        {perfil.instituicao_nome
                          ? `Estudante na ${perfil.instituicao_nome}`
                          : "Universitário no campus"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Botões de Contato */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  {perfil.instagram_url && (
                    <Link
                      href={`https://instagram.com/${perfil.instagram_url.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-2xl border border-gray-200 text-gray-500 hover:text-pink-600 hover:border-pink-200 bg-white transition shadow-xs"
                      title="Instagram do estudante"
                    >
                      <IconeInstagram className="w-5 h-5" />
                    </Link>
                  )}

                  <Link
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-sm transition hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
                  >
                    <IconeWhatsapp className="w-5 h-5" />
                    <span>Conversar no WhatsApp</span>
                  </Link>
                </div>
              </div>

              {/* Bio / Apresentação do Estudante */}
              {perfil.descricao && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-700 text-sm leading-relaxed max-w-3xl">
                    {perfil.descricao}
                  </p>
                </div>
              )}

              {/* Badges de Confiança no estilo OLX */}
              <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3">
                  <span className="text-xs text-gray-400 block font-medium">Tempo de casa</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                    <span>📅</span>
                    <span>{formatarTempoPlataforma(dataRegistro)}</span>
                  </span>
                </div>

                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3">
                  <span className="text-xs text-gray-400 block font-medium">Anúncios ativos</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                    <span>📦</span>
                    <span>{produtos.length} {produtos.length === 1 ? "item publicado" : "itens publicados"}</span>
                  </span>
                </div>

                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3">
                  <span className="text-xs text-gray-400 block font-medium">Disponíveis para troca</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <span>🔄</span>
                    <span>{produtosTroca.length} {produtosTroca.length === 1 ? "item aceita troca" : "itens aceitam troca"}</span>
                  </span>
                </div>

                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3">
                  <span className="text-xs text-gray-400 block font-medium">Atendimento</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                    <span>⚡</span>
                    <span>Responde via WhatsApp</span>
                  </span>
                </div>
              </div>

              {/* Locais habituais de encontro no campus */}
              {perfil.locais_entrega && perfil.locais_entrega.length > 0 && (
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Locais de encontro no campus:
                  </span>
                  {perfil.locais_entrega.map((local) => (
                    <span
                      key={local}
                      className="text-xs font-medium px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition"
                    >
                      📍 {local}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* 2. GRADE DE ANÚNCIOS DO USUÁRIO COM FILTROS */}
          <section id="anuncios" className="scroll-mt-20">
            {/* Header com Abas e Busca */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              {/* Abas */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2 sm:pb-0 sm:border-none">
                <button
                  type="button"
                  onClick={() => setFiltroTipo("todos")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                    filtroTipo === "todos"
                      ? "bg-[#FF385C] text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Todos ({produtos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo("venda")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 ${
                    filtroTipo === "venda"
                      ? "bg-[#FF385C] text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>🏷️</span>
                  <span>À Venda ({produtosVenda.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo("troca")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 ${
                    filtroTipo === "troca"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>🔄</span>
                  <span>Aceita Troca ({produtosTroca.length})</span>
                </button>
              </div>

              {/* Campo de busca nos anúncios */}
              {produtos.length > 4 && (
                <div className="w-full sm:w-64">
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar nos anúncios..."
                    className="w-full text-xs px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-[#FF385C] bg-white"
                  />
                </div>
              )}
            </div>

            {/* Lista dos Produtos */}
            {produtosFiltrados.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center my-6">
                <span className="text-4xl block mb-2">📦</span>
                <p className="text-gray-700 font-bold text-base">
                  Nenhum anúncio encontrado nesta categoria.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {busca ? "Tente buscar por outro termo." : "O estudante ainda não cadastrou itens com este filtro."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {produtosFiltrados.map((produto) => {
                  return (
                    <CardProduto
                      key={produto.id}
                      produto={produto}
                      onAbrir={setProdutoAtivo}
                      largura="fluida"
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. DICA DE SEGURANÇA UNIVERSITÁRIA (ESTILO OLX) */}
          <div className="mt-12 bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0 font-bold">
                🛡️
              </span>
              <div>
                <h4 className="text-gray-900 font-bold text-sm">
                  Dica de negociação segura no campus
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  Combine o encontro em locais movimentados (Biblioteca, RU ou Centro de Vivência) e confira o estado do material antes de concluir.
                </p>
              </div>
            </div>

            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF385C] hover:text-[#e0314f] text-xs font-bold hover:underline shrink-0"
            >
              Falar com {nomeExibicao} →
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Produto */}
      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />
    </>
  );
}
