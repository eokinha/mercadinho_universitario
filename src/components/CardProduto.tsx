import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Heart, ImageOff, Repeat, ShoppingBag } from "lucide-react";
import SeloVerificado from "@/components/SeloVerificado";
import type { ProdutoListagem } from "@/types";

interface Props {
  produto: ProdutoListagem;
  onAbrir: (produto: ProdutoListagem) => void;
  largura?: "fixa" | "fluida";
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function CardProduto({ produto, onAbrir, largura = "fixa" }: Props) {
  const [favorito, setFavorito] = useState(false);

  const soTroca = produto.preco === 0;
  const aceitaTroca = produto.aceita_troca || soTroca;

  const larguraClasses = largura === "fluida" ? "w-full" : "w-48 sm:w-52 shrink-0 snap-start";

  const handleFavoritar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorito(!favorito);
  };

  return (
    <article
      className={`${larguraClasses} group bg-superficie border border-borda rounded-card overflow-hidden hover:shadow-hover transition duration-200 flex flex-col`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onAbrir(produto)}
          className="w-full text-left flex flex-col focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          <div className="aspect-[4/3] sm:aspect-square bg-pagina overflow-hidden relative">
            {produto.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="w-full h-full object-cover group-transition duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-tinta-sutil">
                <ImageOff size={32} strokeWidth={1.75} aria-hidden="true" />
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={handleFavoritar}
          aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={favorito}
          className="absolute top-2 right-2 w-11 h-11 rounded-pill bg-superficie/90 flex items-center justify-center text-tinta-suave hover:text-perigo transition z-10 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          <Heart
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className={favorito ? "fill-perigo text-perigo" : ""}
          />
        </button>
      </div>

      <div className="px-3.5 pt-3 pb-3 flex-1 flex flex-col gap-1.5 cursor-pointer" onClick={() => onAbrir(produto)}>
        <div className="flex flex-wrap gap-1.5">
          {!soTroca && (
            <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-petroleo-50 text-petroleo inline-flex items-center gap-1">
              <ShoppingBag size={14} strokeWidth={1.75} aria-hidden="true" />
              Comprar
            </span>
          )}
          {aceitaTroca && (
            <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-troca-50 text-troca-texto inline-flex items-center gap-1">
              <Repeat size={14} strokeWidth={1.75} aria-hidden="true" />
              Trocar
            </span>
          )}
          {produto.destaque && (
            <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-acao-50 text-acao-hover">
              Impulsionado
            </span>
          )}
        </div>

        <h3 className="text-tinta font-semibold text-sm line-clamp-2 leading-snug">{produto.nome}</h3>

        <p className="text-tinta font-bold text-base tracking-tight">
          {soTroca ? "Só troca" : formatarPreco(produto.preco)}
        </p>
      </div>

      <Link
        href={`/perfil/${produto.loja_id}`}
        className="border-t border-borda px-3.5 py-2.5 min-h-[44px] flex items-center gap-2 hover:bg-pagina transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:-outline-offset-2"
        aria-label={`Ver perfil de ${produto.loja_nome}`}
      >
        <span className="w-6 h-6 rounded-pill bg-petroleo-50 shrink-0 overflow-hidden">
          {produto.loja_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.loja_avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-xs font-bold text-petroleo">
              {produto.loja_nome.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-tinta-suave text-xs truncate">{produto.loja_nome}</span>
          {produto.loja_verificada && <SeloVerificado />}
        </span>
        <ChevronRight size={16} strokeWidth={1.75} className="text-tinta-sutil shrink-0" aria-hidden="true" />
      </Link>
    </article>
  );
}
