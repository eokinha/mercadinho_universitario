import Link from "next/link";
import { Eye, Repeat, X } from "lucide-react";
import SeloVerificado from "@/components/SeloVerificado";
import BotaoContato from "@/components/BotaoContato";
import BotaoDenunciar from "@/components/BotaoDenunciar";
import { useEffect } from "react";
import type { ProdutoListagem } from "@/types";

interface Props {
  produto: ProdutoListagem | null;
  onFechar: () => void;
  // Anúncio de outro campus: dá para ver, mas não contatar (contato_vendedor também barra)
  somenteLeitura?: boolean;
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default function ModalProduto({ produto, onFechar, somenteLeitura = false }: Props) {
  useEffect(() => {
    if (!produto) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onFechar();
    }

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", handleKey);
    };
  }, [produto, onFechar]);

  if (!produto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do produto ${produto.nome}`}
      onClick={onFechar}
      className="fixed inset-0 z-50 bg-tinta/50 flex items-center justify-center px-4 py-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-superficie rounded-card shadow-flutuante max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 w-11 h-11 rounded-pill bg-superficie/90 border border-borda text-tinta-suave hover:text-tinta transition flex items-center justify-center focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="aspect-square w-full h-full bg-pagina">
            {produto.imagem_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="p-6 flex flex-col gap-4">
            <div>
              <span className="inline-block text-tinta-suave text-xs uppercase tracking-wide">
                {produto.categoria_nome}
              </span>
              <h2 className="text-petroleo text-2xl font-bold mt-1">
                {produto.nome}
              </h2>
              <p className="text-tinta text-xl font-bold mt-2">
                {produto.preco === 0 ? "Só troca" : formatarPreco(produto.preco)}
              </p>
              {(produto.aceita_troca || produto.preco === 0) && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-pill text-xs font-semibold px-2.5 py-1 bg-troca-50 text-troca-texto">
                  <Repeat size={14} strokeWidth={1.75} aria-hidden="true" />
                  Aceita troca
                </span>
              )}
            </div>

            {produto.descricao && (
              <p className="text-tinta-suave text-sm leading-relaxed">
                {produto.descricao}
              </p>
            )}

            <div className="border-t border-borda pt-4">
              <span className="text-tinta-sutil text-xs uppercase tracking-wide">
                Anunciado por
              </span>
              <div className="mt-1 flex items-center gap-3">
                <span className="w-10 h-10 rounded-pill bg-petroleo-50 shrink-0 overflow-hidden">
                  {produto.loja_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={produto.loja_avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center font-bold text-petroleo bg-petroleo-50 text-sm">
                      {produto.loja_nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-tinta font-semibold truncate">
                      {produto.loja_nome}
                    </h3>
                    {produto.loja_verificada && (
                      <SeloVerificado />
                    )}
                  </div>
                  {produto.loja_descricao && (
                    <p className="text-tinta-suave text-sm line-clamp-2">
                      {produto.loja_descricao}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col sm:flex-row sm:items-start gap-2">
              <Link
                href={`/perfil/${produto.loja_id}`}
                className="bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle transition px-4 py-2.5 min-h-[44px] font-semibold inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
              >
                Ver perfil
              </Link>
              {somenteLeitura ? (
                <p className="flex-1 inline-flex items-start gap-2 text-sm text-tinta-suave bg-pagina rounded-controle px-3 py-2.5">
                  <Eye size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
                  Anúncio de outro campus. O contato é só entre alunos da mesma faculdade.
                </p>
              ) : (
                <BotaoContato
                  lojaId={produto.loja_id}
                  produtoId={produto.id}
                  mensagem={`Olá! Vi "${produto.nome}" na Circular e tenho interesse.`}
                  rotulo="Tenho interesse"
                  className="w-full bg-acao text-white rounded-controle hover:bg-acao-hover transition px-4 py-2.5 min-h-[44px] font-semibold inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
                />
              )}
            </div>

            <BotaoDenunciar key={produto.id} lojaId={produto.loja_id} produtoId={produto.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
