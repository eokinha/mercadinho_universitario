import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useState } from "react";
import CardProduto from "@/components/CardProduto";
import ModalProduto from "@/components/ModalProduto";
import { createServerClient } from "@/lib/supabase";
import { formatarTelefone, linkWhatsapp } from "@/lib/contato";
import { getLojaById, getProdutosListagemByLoja } from "@/lib/queries";
import type { Loja, ProdutoListagem } from "@/types";

interface Props {
  loja: Loja;
  produtos: ProdutoListagem[];
}

function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.4h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.21-3.75.98 1-3.65-.23-.37a9.5 9.5 0 1 1 17.66-4.93 9.51 9.51 0 0 1-9.48 9.5Zm5.43-7.1c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const idParam = ctx.params?.id;
  const id = typeof idParam === "string" ? Number(idParam) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return { notFound: true };
  }

  const supabase = createServerClient(ctx);

  const loja = await getLojaById(id, supabase);
  if (!loja || loja.status !== "ativo") {
    return { notFound: true };
  }

  const produtos = await getProdutosListagemByLoja(id, supabase);

  return { props: { loja, produtos } };
};

export default function LojaPage({ loja, produtos }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);
  const whatsapp = linkWhatsapp(loja.contato);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-[#FF385C]/20 via-pink-100 to-orange-100">
          {loja.capa_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={loja.capa_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 mb-4 flex items-end gap-4">
            <span className="w-24 h-24 rounded-full bg-gray-100 ring-4 ring-white z-20 shadow-sm overflow-hidden shrink-0">
              {loja.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loja.avatar_url}
                  alt={`Avatar de ${loja.nome}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
                  {loja.nome.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
          </div>

          <h1 className="text-gray-800 text-2xl font-semibold">{loja.nome}</h1>
          {loja.descricao && (
            <p className="text-gray-500 mt-2">{loja.descricao}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <Link
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#FF385C] text-white rounded-lg hover:bg-[#e0314f] transition px-4 py-2 font-medium inline-flex items-center gap-2"
            >
              <IconeWhatsapp className="w-4 h-4" />
              Falar no WhatsApp
            </Link>
          </div>
        </div>
      </header>

      <h2 className="text-gray-800 text-lg font-semibold mb-6">Produtos</h2>

      {produtos.length === 0 ? (
        <p className="text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-xl">
          Esta loja ainda não tem produtos ativos.
        </p>
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

      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />
    </div>
  );
}
