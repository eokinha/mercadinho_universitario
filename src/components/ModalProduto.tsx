import Link from "next/link";
import { Repeat, X } from "lucide-react";
import SeloVerificado from "@/components/SeloVerificado";
import { useEffect } from "react";
import { linkWhatsapp } from "@/lib/contato";
import type { ProdutoListagem } from "@/types";

interface Props {
  produto: ProdutoListagem | null;
  onFechar: () => void;
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.4h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.21-3.75.98 1-3.65-.23-.37a9.5 9.5 0 1 1 17.66-4.93 9.51 9.51 0 0 1-9.48 9.5Zm5.43-7.1c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export default function ModalProduto({ produto, onFechar }: Props) {
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

  const whatsapp = linkWhatsapp(produto.loja_contato);

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

            <div className="mt-auto flex flex-col sm:flex-row gap-2">
              <Link
                href={`/perfil/${produto.loja_id}`}
                className="bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle transition px-4 py-2.5 min-h-[44px] font-semibold inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
              >
                Ver perfil
              </Link>
              <Link
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-acao text-white rounded-controle hover:bg-acao-hover transition px-4 py-2.5 min-h-[44px] font-semibold flex-1 inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
              >
                <IconeWhatsapp className="w-4 h-4" />
                Tenho interesse
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
