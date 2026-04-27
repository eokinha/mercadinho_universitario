import Link from "next/link";
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
  }).format(valor);
}

export default function CardProduto({
  produto,
  onAbrir,
  largura = "fixa",
}: Props) {
  const larguraClasses =
    largura === "fluida"
      ? "w-full"
      : "w-44 md:w-52 shrink-0 snap-start";

  return (
    <article
      className={`${larguraClasses} bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition flex flex-col`}
    >
      <button
        type="button"
        onClick={() => onAbrir(produto)}
        className="text-left flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF385C]"
      >
        <div className="aspect-square bg-gray-100">
          {produto.imagem_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="px-3 py-2 flex-1">
          <h3 className="text-gray-800 font-medium text-sm truncate">
            {produto.nome}
          </h3>
          <Link
            href={`/listagem?categoria=${produto.categoria_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mt-0.5 hover:text-[#FF385C] transition-colors inline-block"
          >
            {produto.categoria_nome}
          </Link>
          <p className="text-[#FF385C] font-semibold text-sm mt-1">
            {formatarPreco(produto.preco)}
          </p>
        </div>
      </button>

      <Link
        href={`/lojas/${produto.loja_id}`}
        className="border-t border-gray-100 px-3 py-2 flex items-center gap-2 hover:bg-gray-50 transition"
        aria-label={`Visitar loja ${produto.loja_nome}`}
      >
        <span className="w-6 h-6 rounded-full bg-gray-100 shrink-0 overflow-hidden">
          {produto.loja_avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.loja_avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </span>
        <span className="text-gray-500 text-xs truncate flex-1">
          {produto.loja_nome}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-gray-400 shrink-0"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </article>
  );
}
