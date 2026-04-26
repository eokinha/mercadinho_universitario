import Link from "next/link";
import CardProduto from "@/components/CardProduto";
import type { Categoria, ProdutoListagem } from "@/types";

interface Props {
  categoria: Categoria;
  produtos: ProdutoListagem[];
  onProdutoClick: (produto: ProdutoListagem) => void;
  verMaisHref?: string;
}

export default function CarrosselCategoria({
  categoria,
  produtos,
  onProdutoClick,
  verMaisHref,
}: Props) {
  return (
    <section className="mb-10">
      <div className="max-w-6xl mx-auto px-4 flex items-baseline justify-between mb-3">
        <h2 className="text-gray-800 text-lg font-semibold">{categoria.nome}</h2>
        {verMaisHref ? (
          <Link
            href={verMaisHref}
            className="text-[#FF385C] text-sm font-medium hover:underline"
          >
            Ver mais →
          </Link>
        ) : (
          <span className="text-gray-400 text-xs">
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
