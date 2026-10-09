import { useState, useMemo } from "react";
import Link from "next/link";
import type { Produto } from "@/types";

interface Props {
  produtos: Produto[];
  lojaId: number;
  onToggleStatus: (produto: Produto) => void;
  onExcluir: (produtoId: number) => void;
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

const isAtivo = (p: Produto) => p.status === "ativo";

export default function SecaoAnuncios({ produtos, lojaId, onToggleStatus, onExcluir }: Props) {
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "pausados">("todos");

  const totalProdutos = produtos.length;
  const produtosAtivos = useMemo(() => produtos.filter(isAtivo), [produtos]);
  const produtosPausados = useMemo(() => produtos.filter((p) => !isAtivo(p)), [produtos]);

  const produtosFiltrados = useMemo(() => {
    if (filtroStatus === "ativos") return produtosAtivos;
    if (filtroStatus === "pausados") return produtosPausados;
    return produtos;
  }, [produtos, produtosAtivos, produtosPausados, filtroStatus]);

  return (
    <div>
      {/* Filtros de Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setFiltroStatus("todos")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filtroStatus === "todos"
                ? "bg-[#FF385C] text-white shadow-xs"
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
            const isTroca = produto.aceita_troca || produto.preco === 0;

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
                      onClick={() => onToggleStatus(produto)}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
                    >
                      {isAtivo(produto) ? "⏸️ Pausar" : "▶️ Reativar"}
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onExcluir(produto.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                      >
                        Excluir
                      </button>

                      <Link
                        href={`/perfil/${lojaId}`}
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
  );
}
