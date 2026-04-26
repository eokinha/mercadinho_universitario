import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  uploadImagemLoja,
  uploadImagemProduto,
  type TipoImagemLoja,
} from "@/lib/storage";

interface LojaAdmin {
  id: number;
  nome: string;
  status: string;
  avatar_url: string | null;
  capa_url: string | null;
}

interface ProdutoAdmin {
  id: number;
  nome: string;
  preco: number;
  imagem_url: string | null;
  loja_nome: string;
}

interface Props {
  lojas: LojaAdmin[];
  produtos: ProdutoAdmin[];
}

interface LojaJoinRaw {
  nome: string;
}

interface ProdutoLojaRaw {
  id: number;
  nome: string;
  preco: number;
  imagem_url: string | null;
  lojas: LojaJoinRaw | LojaJoinRaw[] | null;
}

function pickFirst<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const { data: lojasData, error: lojasError } = await supabase
    .from("lojas")
    .select("id, nome, status, avatar_url, capa_url")
    .order("id", { ascending: true });
  if (lojasError) throw lojasError;

  const { data: produtosData, error: produtosError } = await supabase
    .from("produtos")
    .select("id, nome, preco, imagem_url, lojas!inner(nome)")
    .order("id", { ascending: true });
  if (produtosError) throw produtosError;

  const produtos: ProdutoAdmin[] = [];
  for (const item of (produtosData ?? []) as unknown as ProdutoLojaRaw[]) {
    const loja = pickFirst(item.lojas);
    produtos.push({
      id: item.id,
      nome: item.nome,
      preco: Number(item.preco),
      imagem_url: item.imagem_url,
      loja_nome: loja?.nome ?? "—",
    });
  }

  return {
    props: {
      lojas: (lojasData ?? []) as LojaAdmin[],
      produtos,
    },
  };
};

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

interface UploadInputProps {
  id: string;
  label: string;
  onUpload: (file: File) => Promise<void>;
}

function UploadInput({ id, label, onUpload }: UploadInputProps) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setErro(null);
    setCarregando(true);
    try {
      await onUpload(file);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setCarregando(false);
      event.target.value = "";
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={`inline-block cursor-pointer text-sm rounded-lg px-3 py-1.5 transition ${
          carregando
            ? "bg-gray-200 text-gray-500"
            : "bg-[#FF385C] text-white hover:bg-[#e0314f]"
        }`}
      >
        {carregando ? "Enviando…" : label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
        disabled={carregando}
      />
      {erro && <p className="text-red-600 text-xs mt-1">{erro}</p>}
    </div>
  );
}

export default function AdminImagensPage({ lojas, produtos }: Props) {
  const router = useRouter();

  async function recarregar() {
    await router.replace(router.asPath, undefined, { scroll: false });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-gray-800 text-2xl font-semibold">
          Administração de imagens
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Faça upload de avatar e capa das lojas, e da imagem dos produtos.
        </p>
      </header>

      <div
        role="alert"
        className="mb-8 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm"
      >
        <strong className="font-semibold">Tela provisória.</strong> Não há
        autenticação ainda — qualquer pessoa com acesso à URL pode trocar
        imagens. Substitua por fluxo autenticado quando o login estiver pronto.
      </div>

      <section className="mb-12">
        <h2 className="text-gray-800 text-lg font-semibold mb-4">Lojas</h2>

        {lojas.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma loja cadastrada.</p>
        ) : (
          <div className="grid gap-4">
            {lojas.map((loja) => (
              <article
                key={loja.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <div className="relative h-32 bg-gradient-to-br from-[#FF385C]/20 via-pink-100 to-orange-100">
                  {loja.capa_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={loja.capa_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="px-4 pb-4">
                  <div className="-mt-8 mb-3 flex items-end gap-3">
                    <span className="w-16 h-16 rounded-full bg-gray-100 ring-4 ring-white shadow-sm overflow-hidden shrink-0">
                      {loja.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={loja.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-semibold">
                          {loja.nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 pb-1">
                      <h3 className="text-gray-800 font-medium truncate">
                        {loja.nome}
                      </h3>
                      <span className="text-gray-400 text-xs">
                        #{loja.id} · {loja.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {(["avatar", "capa"] as TipoImagemLoja[]).map((tipo) => (
                      <UploadInput
                        key={tipo}
                        id={`loja-${loja.id}-${tipo}`}
                        label={`Trocar ${tipo}`}
                        onUpload={async (file) => {
                          await uploadImagemLoja(loja.id, tipo, file);
                          await recarregar();
                        }}
                      />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-gray-800 text-lg font-semibold mb-4">Produtos</h2>

        {produtos.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum produto cadastrado.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {produtos.map((produto) => (
                <li
                  key={produto.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <span className="w-14 h-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                    {produto.imagem_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={produto.imagem_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-800 font-medium truncate">
                      {produto.nome}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {produto.loja_nome} · {formatarPreco(produto.preco)}
                    </p>
                  </div>
                  <UploadInput
                    id={`produto-${produto.id}`}
                    label="Trocar imagem"
                    onUpload={async (file) => {
                      await uploadImagemProduto(produto.id, file);
                      await recarregar();
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
