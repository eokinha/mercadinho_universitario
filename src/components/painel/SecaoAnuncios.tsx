import { useState, useMemo } from "react";
import Link from "next/link";
import { Camera, Package, Pause, Play, Repeat, Trash2 } from "lucide-react";
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

  const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
  const FILTROS = [
    { id: "todos" as const, rotulo: `Todos (${totalProdutos})` },
    { id: "ativos" as const, rotulo: `Ativos (${produtosAtivos.length})` },
    { id: "pausados" as const, rotulo: `Pausados (${produtosPausados.length})` },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filtrar anúncios">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroStatus(f.id)}
              aria-pressed={filtroStatus === f.id}
              className={`px-4 min-h-[44px] rounded-pill text-sm font-semibold transition border ${FOCO} ${
                filtroStatus === f.id
                  ? "bg-petroleo border-petroleo text-white"
                  : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        <Link href="/anunciar" className={`text-petroleo text-sm font-semibold hover:underline self-start sm:self-auto rounded-controle ${FOCO}`}>
          Anunciar outro item
        </Link>
      </div>

      {produtosFiltrados.length === 0 ? (
        <div className="bg-superficie border border-dashed border-borda-controle rounded-card p-12 text-center my-6">
          <Package size={40} strokeWidth={1.75} className="mx-auto mb-2 text-petroleo" aria-hidden="true" />
          <p className="text-tinta font-semibold text-base">Nenhum anúncio neste filtro.</p>
          <p className="text-tinta-suave text-sm mt-1 mb-5">
            Anuncie livros, calculadoras ou materiais que você não usa mais.
          </p>
          <Link
            href="/anunciar"
            className={`inline-flex items-center gap-2 bg-acao hover:bg-acao-hover text-white px-4 py-2.5 min-h-[44px] rounded-controle text-sm font-semibold transition ${FOCO}`}
          >
            Anunciar item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {produtosFiltrados.map((produto) => {
            const isTroca = produto.aceita_troca || produto.preco === 0;
            const ativo = isAtivo(produto);

            return (
              <div key={produto.id} className="bg-superficie border border-borda rounded-card p-4 flex flex-col sm:flex-row gap-4 hover:shadow-hover transition">
                <div className="w-full sm:w-28 h-28 rounded-controle bg-pagina overflow-hidden shrink-0">
                  {produto.imagem_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-tinta-sutil">
                      <Camera size={24} strokeWidth={1.75} aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <span
                        className={`rounded-pill text-xs font-semibold px-2.5 py-1 ${
                          ativo ? "bg-petroleo-50 text-petroleo" : "bg-doacao-50 text-doacao"
                        }`}
                      >
                        {ativo ? "Ativo" : "Pausado"}
                      </span>
                      {isTroca && (
                        <span className="inline-flex items-center gap-1 rounded-pill text-xs font-semibold px-2.5 py-1 bg-troca-50 text-troca-texto">
                          <Repeat size={14} strokeWidth={1.75} aria-hidden="true" />
                          Trocar
                        </span>
                      )}
                    </div>
                    <h3 className="text-tinta font-semibold text-sm leading-snug line-clamp-1">{produto.nome}</h3>
                    <p className="text-tinta font-bold text-sm mt-1">
                      {produto.preco === 0 ? "Só troca" : formatarPreco(produto.preco)}
                    </p>
                    {produto.descricao && (
                      <p className="text-tinta-suave text-sm mt-1 line-clamp-2">{produto.descricao}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-borda flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(produto)}
                      className={`min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-petroleo rounded-controle ${FOCO}`}
                    >
                      {ativo ? (
                        <Pause size={16} strokeWidth={1.75} aria-hidden="true" />
                      ) : (
                        <Play size={16} strokeWidth={1.75} aria-hidden="true" />
                      )}
                      {ativo ? "Pausar" : "Reativar"}
                    </button>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => onExcluir(produto.id)}
                        className={`min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-perigo rounded-controle ${FOCO}`}
                      >
                        <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                        Excluir
                      </button>
                      <Link
                        href={`/perfil/${lojaId}`}
                        className={`min-h-[44px] inline-flex items-center text-sm font-semibold text-petroleo hover:underline rounded-controle ${FOCO}`}
                      >
                        Ver anúncio
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
