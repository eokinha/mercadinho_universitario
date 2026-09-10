import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useState, useRef } from "react";
import CardProduto from "@/components/CardProduto";
import HeroSection from "@/components/HeroSection";
import ModalProduto from "@/components/ModalProduto";
import SecaoTrocas from "@/components/SecaoTrocas";
import { createServerClient } from "@/lib/supabase";
import { getCategorias, getProdutosFiltrados } from "@/lib/queries";
import type { Categoria, ProdutoListagem } from "@/types";

interface Props {
  produtos: ProdutoListagem[];
  produtosTroca: ProdutoListagem[];
  categorias: Categoria[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = createServerClient(ctx);
  const instituicaoParam = ctx.query.instituicao;
  const instituicaoId =
    typeof instituicaoParam === "string" && /^\d+$/.test(instituicaoParam)
      ? Number(instituicaoParam)
      : undefined;

  const [produtos, produtosTroca, categorias] = await Promise.all([
    getProdutosFiltrados(
      {
        apenasDestaque: true,
        ...(instituicaoId ? { instituicao_id: instituicaoId } : {}),
      },
      supabase
    ).catch(() => []),
    getProdutosFiltrados(
      {
        ordenar: "recentes",
        ...(instituicaoId ? { instituicao_id: instituicaoId } : {}),
      },
      supabase
    ).catch(() => []),
    getCategorias(supabase).catch(() => []),
  ]);

  return {
    props: {
      produtos,
      produtosTroca,
      categorias,
    },
  };
};

export default function Home({ produtos, produtosTroca, categorias }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rolarProdutos = (direcao: "esq" | "dir") => {
    if (scrollRef.current) {
      const scrollAmount = direcao === "dir" ? 360 : -360;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <>
      <HeroSection categorias={categorias} />

      <section id="produtos" className="py-8 scroll-mt-20">
        <header className="max-w-6xl mx-auto px-4 mb-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-gray-900 text-xl sm:text-2xl font-bold tracking-tight">
                Em alta no seu campus - &quot;destaques&quot;
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Os produtos e serviços mais procurados pelos estudantes hoje.
              </p>
            </div>
            <Link
              href="/listagem"
              className="text-[#FF385C] hover:text-[#e0314f] text-sm font-semibold hover:underline hidden sm:inline-block"
            >
              Ver todos →
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 relative">
          {produtos.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200/80 rounded-2xl p-6">
              <span className="text-4xl">🛍️</span>
              <p className="text-gray-700 font-medium mt-3">
                Ainda não há produtos em destaque no campus.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Seja o primeiro a publicar um desapego ou serviço!
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  href="/minha-loja/produtos/novo"
                  className="bg-[#FF385C] text-white rounded-lg hover:bg-[#e0314f] transition px-5 py-2 text-sm font-medium"
                >
                  Anunciar produto
                </Link>
                <Link
                  href="/listagem"
                  className="border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition px-5 py-2 text-sm font-medium"
                >
                  Explorar catálogo
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative group">
              {/* Seta circular para rolar horizontalmente à esquerda */}
              <button
                type="button"
                onClick={() => rolarProdutos("esq")}
                aria-label="Rolar produtos para a esquerda"
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 z-20 transition hover:scale-105 active:scale-95 focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Seta circular para rolar horizontalmente à direita (como na imagem) */}
              <button
                type="button"
                onClick={() => rolarProdutos("dir")}
                aria-label="Rolar produtos para a direita"
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 z-20 transition hover:scale-105 active:scale-95 focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Linha horizontal com os cards de produtos com scroll suave */}
              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1 snap-x snap-mandatory"
              >
                {produtos.map((produto) => (
                  <CardProduto
                    key={produto.id}
                    produto={produto}
                    onAbrir={setProdutoAtivo}
                    largura="fixa"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link
              href="/listagem"
              className="bg-[#FF385C] text-white rounded-xl hover:bg-[#e0314f] transition px-8 py-3 font-semibold text-sm shadow-sm"
            >
              Ver catálogo completo
            </Link>
          </div>
        </div>
      </section>

      {/* Seção dedicada: Feira de Trocas Universitária */}
      <SecaoTrocas
        produtos={produtosTroca}
        onAbrirProduto={setProdutoAtivo}
      />

      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />
    </>
  );
}
