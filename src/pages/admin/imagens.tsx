import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";
import { createServerClient } from "@/lib/supabase";
import { getLojasComImagens, getProdutosParaModeracao } from "@/lib/queries";
import type { Loja, ProdutoModeracao } from "@/types";
import {
  uploadImagemLoja,
  uploadImagemProduto,
  type TipoImagemLoja,
} from "@/lib/storage";
import {
  ShieldCheck,
} from "lucide-react";

type LojaAdmin = Pick<Loja, "id" | "nome" | "status" | "avatar_url" | "capa_url">;

interface Props {
  lojas: LojaAdmin[];
  produtos: ProdutoModeracao[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabaseServer = createServerClient(ctx);
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const [lojas, produtos] = await Promise.all([
    getLojasComImagens(supabaseServer),
    getProdutosParaModeracao(supabaseServer),
  ]);

  return { props: { lojas, produtos } };
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
        className={`inline-flex items-center min-h-[44px] cursor-pointer text-sm font-semibold rounded-controle px-4 border transition ${
          carregando
            ? "bg-pagina border-borda text-tinta-suave"
            : "bg-superficie border-borda-controle text-petroleo hover:border-petroleo"
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
      {erro && <p className="text-perigo text-xs mt-1">{erro}</p>}
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
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-petroleo text-2xl font-bold">
            Administração de imagens
          </h1>
          <p className="text-tinta-suave mt-1 text-sm">
            Faça upload de avatar e capa das lojas, e da imagem dos produtos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/verificacoes"
            className="text-xs font-bold text-white bg-troca px-4 py-2 rounded-controle transition flex items-center gap-1.5"
          >
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Moderar Matrículas</span>
          </Link>
        </div>
      </header>

      <div
        role="alert"
        className="mb-8 bg-doacao-50 border border-doacao text-doacao rounded-controle px-4 py-3 text-sm"
      >
        <strong className="font-semibold">Tela provisória.</strong> Não há
        autenticação ainda — qualquer pessoa com acesso à URL pode trocar
        imagens. Substitua por fluxo autenticado quando o login estiver pronto.
      </div>

      <section className="mb-12">
        <h2 className="text-petroleo text-lg font-semibold mb-4">Lojas</h2>

        {lojas.length === 0 ? (
          <p className="text-tinta-suave text-sm">Nenhuma loja cadastrada.</p>
        ) : (
          <div className="grid gap-4">
            {lojas.map((loja) => (
              <article
                key={loja.id}
                className="bg-superficie border border-borda rounded-controle overflow-hidden"
              >
                <div className="relative h-32 bg-petroleo-50">
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
                    <span className="w-16 h-16 rounded-pill bg-pagina ring-4 ring-white overflow-hidden shrink-0">
                      {loja.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={loja.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-tinta-sutil text-xl font-semibold">
                          {loja.nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 pb-1">
                      <h3 className="text-tinta font-semibold truncate">
                        {loja.nome}
                      </h3>
                      <span className="text-tinta-sutil text-xs">
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
        <h2 className="text-petroleo text-lg font-semibold mb-4">Produtos</h2>

        {produtos.length === 0 ? (
          <p className="text-tinta-suave text-sm">Nenhum produto cadastrado.</p>
        ) : (
          <div className="bg-superficie border border-borda rounded-controle overflow-hidden">
            <ul className="divide-y divide-borda">
              {produtos.map((produto) => (
                <li
                  key={produto.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <span className="w-14 h-14 rounded-controle bg-pagina shrink-0 overflow-hidden">
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
                    <p className="text-tinta font-semibold truncate">
                      {produto.nome}
                    </p>
                    <p className="text-tinta-suave text-xs">
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
