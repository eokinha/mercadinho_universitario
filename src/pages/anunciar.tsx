import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { createServerClient, supabase } from "@/lib/supabase";
import { getOrCreatePerfilEstudante, getCategoriasArvore } from "@/lib/queries";
import { uploadImagemProduto } from "@/lib/storage";
import type { CategoriaComFilhos, Loja } from "@/types";

interface Props {
  loja: Loja;
  categorias: CategoriaComFilhos[];
}

const LOCAIS_SUGERIDOS = [
  "RU Central",
  "Biblioteca Universitária",
  "Centro de Vivência",
  "Centro Acadêmico (CA)",
  "Entrada Principal do Campus",
  "Bloco de Aulas",
];

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  // Modo de pré-visualização para testes de UI
  if (!user && (ctx.query.preview === "1" || process.env.NODE_ENV === "development" && ctx.query.demo === "1")) {
    const categorias = await getCategoriasArvore(serverSupabase);
    const mockLoja: Loja = {
      id: 1,
      usuario_id: 1,
      nome: "Estudante Demo",
      descricao: "Desapegando de livros e materiais no campus",
      contato: "(31) 99999-0000",
      whatsapp: "(31) 99999-0000",
      status: "ativo",
      criado_em: new Date().toISOString(),
      avatar_url: null,
      capa_url: null,
      slug: "estudante-demo",
      instagram_url: null,
      tiktok_url: null,
      locais_entrega: ["RU Central", "Biblioteca Universitária"],
      cor_tema: "#FF385C",
    };
    return {
      props: {
        loja: mockLoja,
        categorias,
      },
    };
  }

  if (!user) {
    return {
      redirect: {
        destination: `/login?msg=${encodeURIComponent("Faça login para anunciar um desapego ou troca.")}`,
        permanent: false,
      },
    };
  }

  try {
    const loja = await getOrCreatePerfilEstudante(user.id, serverSupabase, user.email);
    const categorias = await getCategoriasArvore(serverSupabase);

    return {
      props: {
        loja,
        categorias,
      },
    };
  } catch (error) {
    console.error("Erro ao carregar/criar perfil de estudante:", error);
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
};

export default function AnunciarPage({ loja, categorias }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modalidade: venda | troca | ambos
  const [modalidade, setModalidade] = useState<"venda" | "troca" | "ambos">("troca");

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [itemTrocaDesejado, setItemTrocaDesejado] = useState("");
  const [categoriaPaiId, setCategoriaPaiId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [locaisSelecionados, setLocaisSelecionados] = useState<string[]>(
    loja.locais_entrega && loja.locais_entrega.length > 0
      ? loja.locais_entrega
      : ["RU Central", "Biblioteca Universitária"]
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function toggleLocal(local: string) {
    if (locaisSelecionados.includes(local)) {
      setLocaisSelecionados(locaisSelecionados.filter((l) => l !== local));
    } else {
      setLocaisSelecionados([...locaisSelecionados, local]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações
    if (!nome.trim()) {
      setError("Por favor, informe o título do anúncio.");
      setLoading(false);
      return;
    }

    // Validação: precisa de categoria (pai ou sub)
    const catFinal = categoriaId || categoriaPaiId;
    if (!catFinal) {
      setError("Selecione uma categoria para o item.");
      setLoading(false);
      return;
    }

    let precoFinal = 0;
    if (modalidade === "venda" || modalidade === "ambos") {
      const parsed = parseFloat(preco.replace(",", "."));
      if (isNaN(parsed) || parsed < 0) {
        setError("Informe um preço válido para venda.");
        setLoading(false);
        return;
      }
      precoFinal = parsed;
    }

    try {
      // Monta descrição enriquecida com notas de troca se aplicável
      let descricaoCompleta = descricao.trim();
      if ((modalidade === "troca" || modalidade === "ambos") && itemTrocaDesejado.trim()) {
        descricaoCompleta = `${descricaoCompleta}\n\n[Aceita Troca]: Busca em troca por: ${itemTrocaDesejado.trim()}`;
      }

      // 1. Cadastrar produto
      const { data: produto, error: createError } = await supabase
        .from("produtos")
        .insert({
          loja_id: loja.id,
          nome: nome.trim(),
          descricao: descricaoCompleta,
          preco: precoFinal,
          categoria_id: parseInt(categoriaId || categoriaPaiId),
          status: "ativo",
          destaque: modalidade === "troca" || modalidade === "ambos",
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Upload de imagem se houver
      if (imageFile && produto) {
        await uploadImagemProduto(produto.id, imageFile);
      }

      // 3. Atualizar locais habituais de entrega do perfil se mudou
      if (locaisSelecionados.length > 0) {
        await supabase
          .from("lojas")
          .update({ locais_entrega: locaisSelecionados })
          .eq("id", loja.id);
      }

      router.push("/painel?aba=anuncios&sucesso=1");
    } catch (err: any) {
      console.error("Erro ao cadastrar anúncio:", err);
      setError(err?.message || "Ocorreu um erro ao publicar seu anúncio. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Publicar Anúncio ou Troca • Mercadinho Universitário</title>
      </Head>

      <div className="min-h-screen bg-[#F8F9FA] py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4">
          {/* Navegação superior */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/painel"
              className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition"
            >
              <span>←</span>
              <span>Voltar ao Meu Painel</span>
            </Link>

            <span className="text-xs text-gray-400 font-medium">
              Anunciante: <strong>{loja.nome}</strong>
            </span>
          </div>

          <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
            {/* Cabeçalho */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE7EB] text-[#FF385C] text-xs font-bold uppercase tracking-wider mb-2">
                <span>📢</span>
                <span>Desapego Universitário</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                O que você quer anunciar?
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Desapegue de livros, materiais acadêmicos ou serviços para outros estudantes do campus.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-2xl border border-red-100 flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-bold">Atenção</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. SELETOR DE MODALIDADE (VENDA / TROCA / AMBOS) */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Tipo de Anúncio *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Opção Troca */}
                  <button
                    type="button"
                    onClick={() => setModalidade("troca")}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      modalidade === "troca"
                        ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div>
                      <span className="text-xl mb-1 block">🔄</span>
                      <p className="font-bold text-sm text-gray-900 leading-tight">
                        Apenas Troca
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Custo R$ 0. Troque por outro material de estudo.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full w-fit">
                      Economia Circular
                    </span>
                  </button>

                  {/* Opção Venda */}
                  <button
                    type="button"
                    onClick={() => setModalidade("venda")}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      modalidade === "venda"
                        ? "border-[#FF385C] bg-rose-50/40 ring-2 ring-[#FF385C]/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div>
                      <span className="text-xl mb-1 block">🏷️</span>
                      <p className="font-bold text-sm text-gray-900 leading-tight">
                        Somente Venda
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Defina um preço e receba pagamento direto.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full w-fit">
                      Pagamento Direto
                    </span>
                  </button>

                  {/* Opção Ambos */}
                  <button
                    type="button"
                    onClick={() => setModalidade("ambos")}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      modalidade === "ambos"
                        ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div>
                      <span className="text-xl mb-1 block">🔁</span>
                      <p className="font-bold text-sm text-gray-900 leading-tight">
                        Venda ou Troca
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                        Aceita tanto dinheiro quanto troca equivalente.
                      </p>
                    </div>
                    <span className="inline-block mt-2 text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full w-fit">
                      Mais Flexível
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. CAMPOS DE VALOR E TROCA CONDICIONAIS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 border border-gray-100 rounded-2xl p-4">
                {/* Preço em R$ */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Preço (R$) {modalidade !== "troca" && "*"}
                  </label>
                  {modalidade === "troca" ? (
                    <div className="h-10 flex items-center px-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 text-sm font-semibold">
                      <span>R$ 0,00 (Troca Direta)</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        required
                        value={preco}
                        onChange={(e) => setPreco(e.target.value)}
                        placeholder="Ex: 45.00"
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm font-semibold bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* O que busca em troca */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {modalidade === "troca"
                      ? "O que você busca em troca? *"
                      : "Aceita trocar por quê? (Opcional)"}
                  </label>
                  <input
                    type="text"
                    required={modalidade === "troca"}
                    value={itemTrocaDesejado}
                    onChange={(e) => setItemTrocaDesejado(e.target.value)}
                    placeholder="Ex: Livro de Física 1, mouse ou jaleco"
                    className="w-full h-10 px-3 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-xs sm:text-sm bg-white"
                  />
                </div>
              </div>

              {/* 3. TÍTULO DO PRODUTO */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Título do Anúncio *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Livro Cálculo James Stewart Vol. 1 (8ª Ed.)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white"
                />
              </div>

              {/* 4. CATEGORIA — seletor em cascata de 2 níveis */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Categoria *
                </label>

                {/* Nível 1: Categoria pai */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {categorias.map((pai) => (
                    <button
                      key={pai.id}
                      type="button"
                      onClick={() => {
                        setCategoriaPaiId(String(pai.id));
                        setCategoriaId(""); // reset subcategoria
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition ${
                        categoriaPaiId === String(pai.id)
                          ? "border-[#FF385C] bg-rose-50 text-[#FF385C] ring-1 ring-[#FF385C]/30"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <span className="text-base shrink-0">{pai.icone ?? "🏷️"}</span>
                      <span className="leading-tight text-xs sm:text-sm">{pai.nome}</span>
                    </button>
                  ))}
                </div>

                {/* Nível 2: Subcategorias (se existirem) */}
                {categoriaPaiId && (() => {
                  const pai = categorias.find((c) => String(c.id) === categoriaPaiId);
                  if (!pai || !pai.filhos || pai.filhos.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                        <span>↳</span>
                        <span>Subcategoria de {pai.nome}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pai.filhos.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setCategoriaId(String(sub.id))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                              categoriaId === String(sub.id)
                                ? "border-[#FF385C] bg-[#FF385C] text-white"
                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            <span>{sub.icone ?? ""}</span>
                            <span>{sub.nome}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 5. DESCRIÇÃO */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Descrição detalhada
                </label>
                <textarea
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o estado de conservação, marcas de uso, edição ou motivo do desapego..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-[#FF385C] focus:outline-none text-sm bg-white resize-y"
                />
              </div>

              {/* 6. UPLOAD DE FOTO */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Foto do Item
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-gray-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50 shrink-0">
                      <span className="text-2xl mb-1">📷</span>
                      <span className="text-[11px] font-medium">Sem foto</span>
                    </div>
                  )}

                  <div className="flex-1 w-full">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white font-semibold text-xs text-gray-700 cursor-pointer transition shadow-2xs">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-500"
                      >
                        <path
                          fillRule="evenodd"
                          d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-3.22-3.22a.75.75 0 00-1.06 0L9.47 12.59 7.03 10.15a.75.75 0 00-1.06 0L2.5 11.06zm10.75-4.56a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{imagePreview ? "Trocar imagem" : "Escolher foto do produto"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Formatos aceitos: JPG, PNG ou WebP. Tamanho máximo: 3 MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* 7. LOCAIS DE ENCONTRO NO CAMPUS */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Locais sugeridos para entrega no campus
                </label>
                <p className="text-xs text-gray-500 mb-2.5">
                  Selecione os pontos de encontro mais práticos para você encontrar o colega:
                </p>
                <div className="flex flex-wrap gap-2">
                  {LOCAIS_SUGERIDOS.map((local) => {
                    const ativo = locaisSelecionados.includes(local);
                    return (
                      <button
                        key={local}
                        type="button"
                        onClick={() => toggleLocal(local)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                          ativo
                            ? "bg-gray-900 border-gray-900 text-white font-bold"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span>{ativo ? "✓" : "+"}</span>
                        <span>{local}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <Link
                  href="/painel"
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-sm font-bold px-7 py-2.5 rounded-xl shadow-md shadow-[#FF385C]/25 transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publicando...</span>
                    </>
                  ) : (
                    <>
                      <span>Publicar Anúncio</span>
                      <span>🚀</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
