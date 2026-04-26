import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient, supabase } from "@/lib/supabase";
import { getLojaByAuthId, getCategorias } from "@/lib/queries";
import { uploadImagemProduto } from "@/lib/storage";
import type { Categoria } from "@/types";

interface Props {
  lojaId: number;
  categorias: Categoria[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const loja = await getLojaByAuthId(user.id);
  if (!loja) {
    return { redirect: { destination: "/minha-loja", permanent: false } };
  }

  const categorias = await getCategorias();

  return {
    props: {
      lojaId: loja.id,
      categorias,
    },
  };
};

export default function NovoProdutoPage({ lojaId, categorias }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria_id: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Criar o produto
      const { data: produto, error: createError } = await supabase
        .from("produtos")
        .insert({
          loja_id: lojaId,
          nome: formData.nome,
          descricao: formData.descricao,
          preco: parseFloat(formData.preco),
          categoria_id: parseInt(formData.categoria_id),
          status: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Upload da imagem se houver
      if (imageFile && produto) {
        await uploadImagemProduto(produto.id, imageFile);
      }

      router.push("/minha-loja");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar produto");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none transition";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <header className="mb-8">
          <Link href="/minha-loja" className="text-sm text-gray-400 hover:text-[#FF385C] mb-2 inline-block">
            ← Voltar para Minha Loja
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Cadastrar Novo Produto</h1>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
            <input
              type="text"
              required
              className={inputClass}
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              rows={3}
              className={inputClass}
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                className={inputClass}
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                required
                className={inputClass}
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Produto</label>
            <input
              type="file"
              accept="image/*"
              className={inputClass}
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-gray-400 mt-1">Formatos aceitos: JPG, PNG, WebP. Máx 3MB.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF385C] text-white font-semibold py-3 rounded-lg hover:bg-[#e0314f] transition disabled:opacity-50 mt-4"
          >
            {loading ? "Cadastrando..." : "Cadastrar Produto"}
          </button>
        </form>
      </div>
    </div>
  );
}
