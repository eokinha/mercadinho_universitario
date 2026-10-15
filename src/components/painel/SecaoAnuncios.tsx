import { useState, useMemo } from "react";
import Link from "next/link";
import { Camera, CircleCheck, Package, Pause, Pencil, Play, RefreshCw, Repeat, Trash2 } from "lucide-react";
import { anuncioExpirado, DIAS_VALIDADE_ANUNCIO } from "@/lib/anuncios";
import type { Produto, ProdutoStatus } from "@/types";

interface Props {
  produtos: Produto[];
  lojaId: number;
  onStatus: (produto: Produto, status: ProdutoStatus) => void;
  onRenovar: (produto: Produto) => void;
  onExcluir: (produtoId: number) => void;
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

type Filtro = "todos" | "ativos" | "pausados" | "vendidos";

const ROTULO_STATUS: Record<ProdutoStatus, { texto: string; classe: string }> = {
  ativo: { texto: "Ativo", classe: "bg-petroleo-50 text-petroleo" },
  pausado: { texto: "Pausado", classe: "bg-doacao-50 text-doacao" },
  vendido: { texto: "Vendido", classe: "bg-troca-50 text-troca-texto" },
};

export default function SecaoAnuncios({ produtos, lojaId, onStatus, onRenovar, onExcluir }: Props) {
  const [filtroStatus, setFiltroStatus] = useState<Filtro>("todos");

  const porStatus = useMemo(
    () => ({
      ativos: produtos.filter((p) => p.status === "ativo"),
      pausados: produtos.filter((p) => p.status === "pausado"),
      vendidos: produtos.filter((p) => p.status === "vendido"),
    }),
    [produtos]
  );

  const produtosFiltrados = filtroStatus === "todos" ? produtos : porStatus[filtroStatus];

  const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
  const BOTAO_ACAO = `min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold rounded-controle ${FOCO}`;
  const FILTROS = [
    { id: "todos" as const, rotulo: `Todos (${produtos.length})` },
    { id: "ativos" as const, rotulo: `Ativos (${porStatus.ativos.length})` },
    { id: "pausados" as const, rotulo: `Pausados (${porStatus.pausados.length})` },
    { id: "vendidos" as const, rotulo: `Vendidos (${porStatus.vendidos.length})` },
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
              className={`px-4 min-h-[44px] rounded-pill text-sm font-semibold transition border shrink-0 ${FOCO} ${
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
            const ativo = produto.status === "ativo";
            const expirado = ativo && anuncioExpirado(produto.renovado_em);
            const rotulo = ROTULO_STATUS[produto.status];

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
                      <span className={`rounded-pill text-xs font-semibold px-2.5 py-1 ${rotulo.classe}`}>
                        {rotulo.texto}
                      </span>
                      {expirado && (
                        <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-perigo-50 text-perigo">
                          Expirado
                        </span>
                      )}
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
                    {expirado ? (
                      <p className="text-perigo text-sm mt-1">
                        Fora do catálogo: sem renovação há mais de {DIAS_VALIDADE_ANUNCIO} dias.
                      </p>
                    ) : (
                      produto.descricao && (
                        <p className="text-tinta-suave text-sm mt-1 line-clamp-2">{produto.descricao}</p>
                      )
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-borda flex flex-wrap items-center gap-x-4 gap-y-1">
                    {expirado ? (
                      <button type="button" onClick={() => onRenovar(produto)} className={`${BOTAO_ACAO} text-petroleo`}>
                        <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                        Renovar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStatus(produto, ativo ? "pausado" : "ativo")}
                        className={`${BOTAO_ACAO} text-petroleo`}
                      >
                        {ativo ? (
                          <Pause size={16} strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Play size={16} strokeWidth={1.75} aria-hidden="true" />
                        )}
                        {ativo ? "Pausar" : "Reativar"}
                      </button>
                    )}

                    {produto.status !== "vendido" && (
                      <button type="button" onClick={() => onStatus(produto, "vendido")} className={`${BOTAO_ACAO} text-petroleo`}>
                        <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                        Vendido
                      </button>
                    )}

                    <Link href={`/anunciar?editar=${produto.id}`} className={`${BOTAO_ACAO} text-petroleo`}>
                      <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                      Editar
                    </Link>

                    <button type="button" onClick={() => onExcluir(produto.id)} className={`${BOTAO_ACAO} text-perigo`}>
                      <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                      Excluir
                    </button>

                    {ativo && !expirado && (
                      <Link
                        href={`/perfil/${lojaId}`}
                        className={`min-h-[44px] inline-flex items-center text-sm font-semibold text-petroleo hover:underline rounded-controle ${FOCO}`}
                      >
                        Ver anúncio
                      </Link>
                    )}
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
