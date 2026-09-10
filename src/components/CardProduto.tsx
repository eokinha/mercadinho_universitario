import Link from "next/link";
import { useState } from "react";
import type { ProdutoListagem } from "@/types";

interface Props {
  produto: ProdutoListagem;
  onAbrir: (produto: ProdutoListagem) => void;
  largura?: "fixa" | "fluida";
  tagBadge?: string;
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function CardProduto({
  produto,
  onAbrir,
  largura = "fixa",
  tagBadge = "Parcele sem juros",
}: Props) {
  const [favorito, setFavorito] = useState(false);

  const larguraClasses =
    largura === "fluida"
      ? "w-full"
      : "w-48 sm:w-52 shrink-0 snap-start";

  const handleFavoritar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorito(!favorito);
  };

  return (
    <article
      className={`${larguraClasses} group bg-white border border-gray-200/80 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onAbrir(produto)}
          className="w-full text-left flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF385C]"
        >
          <div className="aspect-[4/3] sm:aspect-square bg-gray-100 overflow-hidden relative">
            {produto.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                <svg
                  className="w-10 h-10 stroke-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Botão flutuante de favoritar (coração) */}
        <button
          type="button"
          onClick={handleFavoritar}
          aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:scale-110 active:scale-95 transition z-10 focus:outline-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={favorito ? "#EF4444" : "none"}
            stroke={favorito ? "#EF4444" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>
      </div>

      <div
        className="px-3.5 pt-2.5 pb-3 flex-1 flex flex-col cursor-pointer"
        onClick={() => onAbrir(produto)}
      >
        <h3 className="text-gray-900 font-medium text-sm line-clamp-2 leading-snug">
          {produto.nome}
        </h3>

        {/* Tag estilo marketplace com tom coral ou esmeralda para troca */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
              tagBadge.toLowerCase().includes("troca")
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                : "bg-[#FFE7EB] text-[#FF385C]"
            }`}
          >
            {tagBadge.toLowerCase().includes("troca") && <span>🔄</span>}
            <span>{tagBadge}</span>
          </span>
        </div>

        {/* Preço em destaque */}
        <div className="mt-2 flex items-baseline gap-2">
          {produto.preco === 0 ? (
            <p className="text-emerald-700 font-extrabold text-base tracking-tight flex items-center gap-1.5">
              <span>Troca Direta</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                R$ 0
              </span>
            </p>
          ) : (
            <>
              <p className="text-gray-900 font-bold text-base tracking-tight">
                {formatarPreco(produto.preco)}
              </p>
              {produto.preco > 50 && (
                <span className="text-gray-400 text-xs line-through">
                  {formatarPreco(Math.round(produto.preco * 1.2))}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <Link
        href={`/perfil/${produto.loja_id}`}
        className="border-t border-gray-100 px-3.5 py-2 flex items-center gap-2 hover:bg-gray-50 transition"
        aria-label={`Ver perfil de ${produto.loja_nome}`}
      >
        <span className="w-5 h-5 rounded-full bg-gray-100 shrink-0 overflow-hidden">
          {produto.loja_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.loja_avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 bg-gray-200">
              {produto.loja_nome.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="text-gray-600 text-xs truncate flex-1 font-normal flex items-center gap-1 min-w-0">
          <span className="truncate">{produto.loja_nome}</span>
          {produto.loja_verificada && (
            <svg
              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-label="Aluno Verificado"
            >
              <title>Aluno Verificado</title>
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 text-gray-400 shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </article>
  );
}

