import { useState } from "react";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getLojaBySlug, getLojaById, getProdutosListagemByLoja } from "@/lib/queries";
import CardProduto from "@/components/CardProduto";
import ModalProduto from "@/components/ModalProduto";
import { linkWhatsapp } from "@/lib/contato";
import type { Loja, ProdutoListagem } from "@/types";

interface Props {
  loja: Loja;
  produtos: ProdutoListagem[];
}

function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.4h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.21-3.75.98 1-3.65-.23-.37a9.5 9.5 0 1 1 17.66-4.93 9.51 9.51 0 0 1-9.48 9.5Zm5.43-7.1c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;
  const supabase = createServerClient(ctx);
  
  // Tenta buscar por slug primeiro
  let loja = await getLojaBySlug(slug, supabase);
  
  // Se não achar por slug e o slug for numérico, tenta buscar por ID
  if (!loja && /^\d+$/.test(slug)) {
    loja = await getLojaById(Number(slug), supabase);
  }

  if (!loja) return { notFound: true };

  const produtos = await getProdutosListagemByLoja(loja.id, supabase);
  return { props: { loja, produtos } };
};

export default function LojaPublicaPage({ loja, produtos }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);
  const themeColor = loja.cor_tema || "#9A2FD6";
  const whatsapp = linkWhatsapp(loja.whatsapp || loja.contato);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="bg-white border border-gray-200 rounded-3xl overflow-hidden mb-8 shadow-sm">
        <div className="relative h-48 md:h-64" style={{ backgroundColor: themeColor + "20" }}>
          {loja.capa_url && <img src={loja.capa_url} alt="" className="w-full h-full object-cover" />}
        </div>
        
        <div className="px-8 pb-8">
          <div className="-mt-12 mb-6 flex flex-col md:flex-row md:items-end gap-6">
            <div className="w-32 h-32 rounded-full bg-white border-4 z-20 shadow-md overflow-hidden shrink-0" style={{ borderColor: themeColor }}>
              {loja.avatar_url ? (
                <img src={loja.avatar_url} alt={loja.nome} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-gray-50">
                  {loja.nome.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-gray-800 text-3xl font-bold">{loja.nome}</h1>
                <span className="bg-blue-50 text-blue-600 p-1 rounded-full" title="Estudante Verificado">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </span>
              </div>
              <p className="text-gray-600 text-lg max-w-2xl">{loja.descricao}</p>
              
              {loja.locais_entrega && loja.locais_entrega.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {loja.locais_entrega.map(local => (
                    <span key={local} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-gray-100 text-gray-500 rounded-md">
                      📍 {local}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {loja.instagram_url && (
                <Link href={`https://instagram.com/${loja.instagram_url.replace('@', '')}`} target="_blank" className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-pink-600 transition">
                   <IconeInstagram className="w-6 h-6" />
                </Link>
              )}
              <Link
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white rounded-xl transition px-6 py-3 font-bold inline-flex items-center gap-2 shadow-md hover:brightness-110"
                style={{ backgroundColor: themeColor }}
              >
                <IconeWhatsapp className="w-5 h-5" />
                WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-8 flex border-b border-gray-100 gap-8">
        <button className="pb-4 border-b-2 font-bold text-gray-800" style={{ borderColor: themeColor }}>Produtos ({produtos.length})</button>
        <button className="pb-4 text-gray-400 font-medium hover:text-gray-600 transition">Avaliações (0)</button>
      </div>

      {produtos.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-3xl border border-dashed border-gray-200">
           <p className="text-gray-400">Esta kitanda ainda não tem produtos expostos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
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
