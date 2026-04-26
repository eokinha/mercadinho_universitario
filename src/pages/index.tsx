import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useState, useEffect } from "react";
import CarrosselCategoria from "@/components/CarrosselCategoria";
import HeroSection from "@/components/HeroSection";
import ModalProduto from "@/components/ModalProduto";
import ModalLoginPrompt from "@/components/ModalLoginPrompt";
import { createServerClient, supabase } from "@/lib/supabase";
import { getProdutosAgrupadosPorCategoria } from "@/lib/queries";
import type { GrupoCategoria, ProdutoListagem } from "@/types";
import type { User } from "@supabase/supabase-js";

interface Props {
  grupos: GrupoCategoria[];
  q: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const q = typeof ctx.query.q === "string" ? ctx.query.q.trim() : "";
  const supabase = createServerClient(ctx);

  const grupos = await getProdutosAgrupadosPorCategoria({
    apenasDestaque: true,
    ...(q ? { q } : {}),
  }, supabase);

  return {
    props: {
      grupos,
      q,
    },
  };
};

export default function Home({ grupos, q }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleProdutoClick(produto: ProdutoListagem) {
    if (!user) {
      setShowLoginPrompt(true);
    } else {
      setProdutoAtivo(produto);
    }
  }

  return (
    <>
      <HeroSection />

      <section id="produtos" className="py-12 scroll-mt-20">
        <header className="max-w-6xl mx-auto px-4 mb-6">
          <h2 className="text-gray-800 text-2xl font-semibold">
            Produtos em destaque
          </h2>
          {q ? (
            <p className="text-gray-500 mt-1">
              Resultados para <span className="font-medium">{q}</span> entre os
              destaques.
            </p>
          ) : (
            <p className="text-gray-500 mt-1">
              Itens impulsionados pelos vendedores, organizados por categoria.
            </p>
          )}
        </header>

        {grupos.length === 0 ? (
          <div className="max-w-6xl mx-auto px-4 text-center py-12">
            <p className="text-gray-500">
              {q
                ? "Nenhum produto em destaque corresponde à sua busca."
                : "Ainda não há produtos em destaque. Veja todos no nosso catálogo."}
            </p>
          </div>
        ) : (
          grupos.map((grupo) => (
            <CarrosselCategoria
              key={grupo.categoria.id}
              categoria={grupo.categoria}
              produtos={grupo.produtos}
              onProdutoClick={handleProdutoClick}
              verMaisHref={user ? `/listagem?categoria=${grupo.categoria.id}` : undefined}
              onVerMaisClick={!user ? () => setShowLoginPrompt(true) : undefined}
            />
          ))
        )}

        <div className="max-w-6xl mx-auto px-4 mt-8 flex justify-center">
          {user ? (
            <Link
              href="/listagem"
              className="bg-[#FF385C] text-white rounded-lg hover:bg-[#e0314f] transition px-8 py-3 font-medium"
            >
              Ver todos os produtos
            </Link>
          ) : (
            <button
              onClick={() => setShowLoginPrompt(true)}
              className="bg-[#FF385C] text-white rounded-lg hover:bg-[#e0314f] transition px-8 py-3 font-medium"
            >
              Ver todos os produtos
            </button>
          )}
        </div>
      </section>

      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />

      <ModalLoginPrompt 
        isOpen={showLoginPrompt} 
        onClose={() => setShowLoginPrompt(false)} 
      />
    </>
  );
}
