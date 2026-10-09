import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { atualizarStatusProduto, deletarProduto, toggleFavorito } from "@/lib/queries";
import type { PainelProps } from "@/lib/painel-data";
import { PAGINAS_PAINEL, type AbaPainel } from "@/lib/painel-routes";
import ModalProduto from "@/components/ModalProduto";
import SecaoAnuncios from "@/components/painel/SecaoAnuncios";
import SecaoFavoritos from "@/components/painel/SecaoFavoritos";
import SecaoPerfil from "@/components/painel/SecaoPerfil";
import type { Loja, Produto, ProdutoListagem, ProdutoStatus, Usuario } from "@/types";

export default function PainelEstudante({
  loja: lojaInicial,
  produtosIniciais,
  favoritosIniciais,
  userEmail,
  usuarioInicial,
  instituicoes,
  abaAtiva,
}: PainelProps & { abaAtiva: AbaPainel }) {
  const router = useRouter();

  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais);
  const [favoritos, setFavoritos] = useState<ProdutoListagem[]>(favoritosIniciais);
  const [matriculaStatus, setMatriculaStatus] = useState<Usuario["matricula_status"]>(
    usuarioInicial?.matricula_status || "pendente"
  );

  // Estado para Modal de detalhes de favorito
  const [produtoAtivoModal, setProdutoAtivoModal] = useState<ProdutoListagem | null>(null);

  // Estatísticas do estudante
  const totalProdutos = produtos.length;
  const produtosAtivos = produtos.filter((p) => p.status === "ativo");
  const produtosPausados = produtos.filter((p) => p.status !== "ativo");

  // Alternar status do anúncio (Pausar / Reativar)
  async function handleToggleStatus(produto: Produto) {
    const novoStatus: ProdutoStatus = produto.status === "ativo" ? "pausado" : "ativo";
    try {
      await atualizarStatusProduto(produto.id, novoStatus);
      setProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, status: novoStatus } : p))
      );
    } catch (err) {
      alert((err as { message?: string })?.message || "Não foi possível atualizar o status do produto.");
    }
  }

  // Excluir anúncio
  async function handleExcluir(produtoId: number) {
    if (!confirm("Tem certeza que deseja excluir este anúncio permanentemente?")) return;

    try {
      await deletarProduto(produtoId);
      setProdutos((prev) => prev.filter((p) => p.id !== produtoId));
    } catch {
      alert("Não foi possível excluir o anúncio.");
    }
  }

  // Remover de favoritos
  async function handleRemoverFavorito(produtoId: number) {
    try {
      await toggleFavorito(loja.usuario_id, produtoId);
      setFavoritos((prev) => prev.filter((p) => p.id !== produtoId));
    } catch {
      alert("Erro ao remover favorito.");
    }
  }

  return (
    <>
      <Head>
        <title>{PAGINAS_PAINEL[abaAtiva].title} • Mercadinho Universitário</title>
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
                      <Link
                        href={PAGINAS_PAINEL.perfil.href}
                        className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-0.5 rounded-full transition flex items-center gap-1"
                        title="Clique para verificar seu vínculo acadêmico"
                      >
                        <span>⚠️ Não Verificado</span>
                        <span className="text-xs text-[#FF385C]">Verificar →</span>
                      </Link>
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

            {/* Páginas do Painel */}
            <nav
              aria-label="Seções do painel"
              className="mt-8 flex items-center gap-4 border-b border-gray-100 overflow-x-auto no-scrollbar"
            >
              {Object.values(PAGINAS_PAINEL).map((pagina) => {
                const ativa = abaAtiva === pagina.id;
                const quantidade =
                  pagina.id === "anuncios"
                    ? totalProdutos
                    : pagina.id === "favoritos"
                      ? favoritos.length
                      : null;

                return (
                  <Link
                    key={pagina.id}
                    href={pagina.href}
                    aria-current={ativa ? "page" : undefined}
                    className={`pb-3 font-bold text-xs sm:text-sm transition flex items-center gap-2 border-b-2 shrink-0 ${
                      ativa
                        ? "border-[#FF385C] text-[#FF385C]"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span>{pagina.icon}</span>
                    <span>
                      {pagina.label}
                      {quantidade !== null ? ` (${quantidade})` : ""}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Notificação de sucesso ao cadastrar anúncio */}
        {abaAtiva === "anuncios" && router.query.sucesso && (
          <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-2">
                <span>🎉</span>
                <span>Anúncio publicado com sucesso! Ele já está disponível no campus.</span>
              </div>
              <button
                type="button"
                onClick={() => router.replace(PAGINAS_PAINEL.anuncios.href, undefined, { shallow: true })}
                className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
          {abaAtiva === "visao-geral" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900">Visão geral</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Acompanhe sua conta e acesse rapidamente cada área do painel.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href={PAGINAS_PAINEL.anuncios.href}
                  className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs transition hover:border-gray-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-gray-700">Meus anúncios</span>
                    <span className="text-xl">📦</span>
                  </div>
                  <strong className="block text-3xl font-black text-gray-900 mt-4">{totalProdutos}</strong>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {produtosAtivos.length} ativo{produtosAtivos.length === 1 ? "" : "s"} · {produtosPausados.length} pausado{produtosPausados.length === 1 ? "" : "s"}
                  </span>
                </Link>

                <Link
                  href={PAGINAS_PAINEL.favoritos.href}
                  className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs transition hover:border-gray-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-gray-700">Meus favoritos</span>
                    <span className="text-xl">❤️</span>
                  </div>
                  <strong className="block text-3xl font-black text-gray-900 mt-4">{favoritos.length}</strong>
                  <span className="text-xs text-gray-500 mt-1 block">itens salvos para ver depois</span>
                </Link>

                <Link
                  href={PAGINAS_PAINEL.perfil.href}
                  className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs transition hover:border-gray-300 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-gray-700">Meu perfil</span>
                    <span className="text-xl">👤</span>
                  </div>
                  <strong className="block text-lg font-black text-gray-900 mt-4">
                    {matriculaStatus === "verificado"
                      ? "Perfil verificado"
                      : matriculaStatus === "pendente"
                        ? "Verificação em análise"
                        : "Verificação pendente"}
                  </strong>
                  <span className="text-xs text-gray-500 mt-2 block">Atualize seus dados e seu perfil público</span>
                </Link>
              </div>

              <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                <h3 className="text-base font-black text-gray-900">Ações rápidas</h3>
                <p className="text-xs text-gray-500 mt-1">Continue gerenciando sua atividade no Mercadinho Universitário.</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <Link
                    href="/anunciar"
                    className="inline-flex items-center justify-center gap-2 bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-xs transition"
                  >
                    <span>+ Publicar anúncio</span>
                  </Link>
                  <Link
                    href={PAGINAS_PAINEL.perfil.href}
                    className="inline-flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition"
                  >
                    <span>Editar perfil</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === "anuncios" && (
            <SecaoAnuncios
              produtos={produtos}
              lojaId={loja.id}
              onToggleStatus={handleToggleStatus}
              onExcluir={handleExcluir}
            />
          )}

          {abaAtiva === "favoritos" && (
            <SecaoFavoritos
              favoritos={favoritos}
              onAbrir={setProdutoAtivoModal}
              onRemover={handleRemoverFavorito}
            />
          )}

          {abaAtiva === "perfil" && (
            <SecaoPerfil
              loja={loja}
              usuario={usuarioInicial}
              userEmail={userEmail}
              instituicoes={instituicoes}
              matriculaStatus={matriculaStatus}
              onLojaAtualizada={(alteracoes) => setLoja((prev) => ({ ...prev, ...alteracoes }))}
              onMatriculaStatus={setMatriculaStatus}
            />
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
