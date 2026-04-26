import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getLojaByAuthId, getProdutosPrivados } from "@/lib/queries";
import { uploadImagemLoja, uploadImagemProduto } from "@/lib/storage";
import type { Loja, Produto } from "@/types";

interface Props {
  loja: Loja | null;
  produtos: Produto[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = createServerClient(ctx);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const loja = await getLojaByAuthId(user.id);
  const produtos = loja ? await getProdutosPrivados(loja.id) : [];

  return {
    props: {
      loja,
      produtos,
    },
  };
};

function UploadButton({ label, onUpload, id }: { label: string; onUpload: (file: File) => Promise<void>; id: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label htmlFor={id} className="cursor-pointer bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition inline-block">
        {loading ? "Enviando..." : label}
      </label>
      <input id={id} type="file" className="hidden" onChange={handleChange} accept="image/*" disabled={loading} />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function MinhaLojaPage({ loja, produtos }: Props) {
  const router = useRouter();

  async function refresh() {
    router.replace(router.asPath);
  }

  if (!loja) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Você ainda não tem uma loja</h1>
        <p className="text-gray-500 mb-8">Para começar a vender, você precisa solicitar a criação de uma loja.</p>
        <Link href="/contato" className="bg-[#FF385C] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#e0314f] transition">
          Falar com administrador
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Minha Loja</h1>
        <p className="text-gray-500">Gerencie sua loja e seus produtos.</p>
      </header>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="h-48 bg-gray-200 relative">
          {loja.capa_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={loja.capa_url} alt="Capa" className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-4 right-4">
            <UploadButton
              id="upload-capa"
              label="Trocar Capa"
              onUpload={async (file) => {
                await uploadImagemLoja(loja.id, "capa", file);
                refresh();
              }}
            />
          </div>
        </div>
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-4 flex items-end gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white shadow-md border-4 border-white overflow-hidden">
              {loja.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={loja.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400">
                  {loja.nome.charAt(0)}
                </div>
              )}
            </div>
            <div className="pb-2">
              <h2 className="text-xl font-bold text-gray-800">{loja.nome}</h2>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                loja.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {loja.status.toUpperCase()}
              </span>
            </div>
            <div className="ml-auto pb-2">
              <UploadButton
                id="upload-avatar"
                label="Trocar Logo"
                onUpload={async (file) => {
                  await uploadImagemLoja(loja.id, "avatar", file);
                  refresh();
                }}
              />
            </div>
          </div>
          <p className="text-gray-600 mb-4">{loja.descricao}</p>
          <div className="flex gap-4">
             <Link href={`/lojas/${loja.id}`} className="text-[#FF385C] font-medium hover:underline">Ver página pública</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Meus Produtos</h2>
          <Link href="/minha-loja/produtos/novo" className="bg-[#FF385C] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e0314f] transition">
            + Novo Produto
          </Link>
        </div>

        {produtos.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-400">Você ainda não cadastrou nenhum produto.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {produtos.map((produto) => (
              <div key={produto.id} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4 items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {produto.imagem_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{produto.nome}</h3>
                  <p className="text-gray-500 text-sm">R$ {Number(produto.preco).toFixed(2)}</p>
                </div>
                <UploadButton
                  id={`upload-produto-${produto.id}`}
                  label="Imagem"
                  onUpload={async (file) => {
                    await uploadImagemProduto(produto.id, file);
                    refresh();
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
