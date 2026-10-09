import Link from "next/link";
import CardProduto from "@/components/CardProduto";
import type { Categoria, ProdutoListagem } from "@/types";

interface Props {
  categoria: Categoria;
  produtos: ProdutoListagem[];
  onProdutoClick: (produto: ProdutoListagem) => void;
  verMaisHref?: string;
  onVerMaisClick?: () => void;
}

export default function CarrosselCategoria({
  categoria,
  produtos,
  onProdutoClick,
  verMaisHref,
  onVerMaisClick,
}: Props) {
  return (
    <section className="mb-10">
      <div className="max-w-6xl mx-auto px-4 flex items-baseline justify-between mb-3">
        <h2 className="text-petroleo text-lg font-bold">{categoria.nome}</h2>
        {verMaisHref ? (
          <Link
            href={verMaisHref}
            className="text-petroleo text-sm font-semibold hover:underline"
          >
            Ver mais
          </Link>
        ) : onVerMaisClick ? (
          <button
            onClick={onVerMaisClick}
            className="text-petroleo text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            Ver mais
          </button>
        ) : (
          <span className="text-tinta-sutil text-xs">
            {produtos.length} {produtos.length === 1 ? "item" : "itens"}
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2">
        <div className="flex gap-4 px-4 md:px-8 w-max">
          {produtos.map((produto) => (
            <CardProduto
              key={produto.id}
              produto={produto}
              onAbrir={onProdutoClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
