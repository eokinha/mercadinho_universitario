import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useState } from "react";
import CardProduto from "@/components/CardProduto";
import HeroSection from "@/components/HeroSection";
import ModalProduto from "@/components/ModalProduto";
import { createServerClient } from "@/lib/supabase";
import { getProdutosFiltrados } from "@/lib/queries";
import type { ProdutoListagem } from "@/types";

interface Props {
  produtos: ProdutoListagem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = createServerClient(ctx);

  const produtos = await getProdutosFiltrados({
    apenasDestaque: true,
  }, supabase);

  return {
    props: {
      produtos,
    },
  };
};

export default function Home({ produtos }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);

  return (
    <>
      <HeroSection />

      <section id="produtos" className="py-12 scroll-mt-20">
        <header className="max-w-6xl mx-auto px-4 mb-8">
          <h2 className="text-gray-800 text-2xl font-semibold">
            Produtos em destaque
          </h2>
          <p className="text-gray-500 mt-1">
            Confira os itens em alta no Mercadinho Universitário.
          </p>
        </header>

        <div className="max-w-6xl mx-auto px-4">
          {produtos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Ainda não há produtos em destaque. Veja todos no nosso catálogo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {produtos.map((produto) => (
                <CardProduto
                  key={produto.id}
                  produto={produto}
                  onAbrir={setProdutoAtivo}
                  largura="fluida"
                />
              ))}
            </div>
          )}

          <div className="mt-12 flex justify-center">
            <Link
              href="/listagem"
              className="bg-[#FF385C] text-white rounded-lg hover:bg-[#e0314f] transition px-8 py-3 font-medium shadow-sm"
            >
              Ver catálogo completo
            </Link>
          </div>
        </div>
      </section>

      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />
    </>
  );
}
