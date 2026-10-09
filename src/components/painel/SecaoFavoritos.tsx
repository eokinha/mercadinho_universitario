import Link from "next/link";
import CardProduto from "@/components/CardProduto";
import type { ProdutoListagem } from "@/types";

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
          <h2 className="text-lg font-black text-gray-900">
            Itens que você salvou no campus
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Fale com o anunciante via WhatsApp para negociar a compra ou troca.
          </p>
        </div>
      </div>

      {favoritos.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center my-6">
          <span className="text-4xl block mb-2">❤️</span>
          <p className="text-gray-800 font-bold text-base">
            Você ainda não favoritou nenhum item.
          </p>
          <p className="text-gray-400 text-xs mt-1 mb-5">
            Explore o catálogo ou a Feira de Trocas e clique no coração para salvar o que gostar.
          </p>
          <Link
            href="/listagem"
            className="inline-flex items-center gap-2 bg-[#FF385C] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#e0314f] transition shadow-xs"
          >
            Explorar produtos
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
                className="absolute top-2 left-2 bg-white/90 border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full hover:text-[#FF385C] hover:shadow-md transition z-20"
                title="Remover dos favoritos"
              >
                ✕ Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
