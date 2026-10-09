import Link from "next/link";
import CardProduto from "@/components/CardProduto";
import type { ProdutoListagem } from "@/types";
import {
  Heart,
  X,
} from "lucide-react";

interface Props {
  favoritos: ProdutoListagem[];
  onAbrir: (produto: ProdutoListagem) => void;
  onRemover: (produtoId: number) => void;
}

export default function SecaoFavoritos({ favoritos, onAbrir, onRemover }: Props) {
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-bold text-petroleo">
            Itens que você salvou
          </h2>
          <p className="text-sm text-tinta-suave mt-0.5">
            Fale com quem anunciou pelo WhatsApp para combinar a compra ou a troca.
          </p>
        </div>
      </div>

      {favoritos.length === 0 ? (
        <div className="bg-superficie border border-dashed border-borda-controle rounded-card p-12 text-center my-6">
          <Heart size={40} strokeWidth={1.75} className="mx-auto mb-2 text-petroleo" aria-hidden="true" />
          <p className="text-tinta font-semibold text-base">
            Você ainda não salvou nenhum item.
          </p>
          <p className="text-tinta-suave text-sm mt-1 mb-5">
            Toque no coração de um anúncio para salvá-lo aqui.
          </p>
          <Link
            href="/listagem"
            className="inline-flex items-center gap-2 bg-superficie text-petroleo border border-borda-controle hover:border-petroleo px-4 py-2.5 min-h-[44px] rounded-controle text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            Ver anúncios
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favoritos.map((produto) => (
            <div key={produto.id} className="relative group">
              <CardProduto
                produto={produto}
                onAbrir={onAbrir}
                largura="fluida"
              />
              <button
                type="button"
                onClick={() => onRemover(produto.id)}
                aria-label={`Remover ${produto.nome} dos favoritos`}
                className="absolute top-2 left-2 min-h-[44px] inline-flex items-center gap-1 bg-superficie/90 border border-borda-controle text-perigo text-xs font-semibold px-3 rounded-pill transition z-20 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
              >
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
