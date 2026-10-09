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
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

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
        apenasTroca: true,
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

      <section id="produtos" className="py-8 scroll-mt-32">
        <header className="max-w-6xl mx-auto px-4 mb-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-petroleo text-xl sm:text-2xl font-bold tracking-tight">
                Impulsionados no seu campus
              </h2>
              <p className="text-tinta-suave text-sm mt-0.5">
                Anúncios em destaque de alunos verificados.
              </p>
            </div>
            <Link
              href="/listagem"
              className="text-petroleo text-sm font-semibold hover:underline hidden sm:inline-block"
            >
              Ver todos
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 relative">
          {produtos.length === 0 ? (
            <div className="text-center py-16 bg-superficie border border-borda rounded-card p-6">
              <ShoppingBag size={40} strokeWidth={1.75} className="mx-auto text-petroleo" aria-hidden="true" />
              <p className="text-tinta font-semibold mt-3">
                Ainda não há anúncios em destaque no seu campus.
              </p>
              <p className="text-tinta-suave text-sm mt-1">
                Enquanto isso, veja todos os anúncios ou publique o seu.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  href="/anunciar"
                  className="bg-acao text-white rounded-controle hover:bg-acao-hover transition px-4 py-2.5 min-h-[44px] inline-flex items-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
                >
                  Anunciar item
                </Link>
                <Link
                  href="/listagem"
                  className="bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle transition px-5 py-2 text-sm font-semibold"
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
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-superficie shadow-flutuante border border-borda flex items-center justify-center text-petroleo z-20 transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
              >
                <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>

              {/* Seta circular para rolar horizontalmente à direita (como na imagem) */}
              <button
                type="button"
                onClick={() => rolarProdutos("dir")}
                aria-label="Rolar produtos para a direita"
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-superficie shadow-flutuante border border-borda flex items-center justify-center text-petroleo z-20 transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
              >
                <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
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
              className="bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle transition px-4 py-2.5 min-h-[44px] inline-flex items-center font-semibold text-sm focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
            >
              Ver todos os anúncios
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
