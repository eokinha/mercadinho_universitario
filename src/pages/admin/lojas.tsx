import { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import {
  getLojasParaModeracao,
  getProdutosParaModeracao,
  moderarLoja,
  definirDestaque,
} from "@/lib/queries";
import type { LojaModeracao, LojaStatus, ProdutoModeracao } from "@/types";
import {
  Package,
  ShieldCheck,
  Star,
  Store,
} from "lucide-react";

interface Props {
  lojasIniciais: LojaModeracao[];
  produtosIniciais: ProdutoModeracao[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const [lojasIniciais, produtosIniciais] = await Promise.all([
    getLojasParaModeracao(serverSupabase),
    getProdutosParaModeracao(serverSupabase),
  ]);

  return { props: { lojasIniciais, produtosIniciais } };
};

const STATUS_LOJA: { valor: LojaStatus; rotulo: string; classe: string }[] = [
  { valor: "ativo", rotulo: "Ativa", classe: "bg-troca-50 text-troca-texto border-troca" },
  { valor: "pendente", rotulo: "Pendente", classe: "bg-doacao-50 text-doacao border-doacao" },
  { valor: "pausado", rotulo: "Pausada", classe: "bg-pagina text-tinta-suave border-borda" },
  { valor: "reprovado", rotulo: "Reprovada", classe: "bg-perigo-50 text-perigo border-perigo" },
];

function badgeLoja(status: LojaStatus) {
  const s = STATUS_LOJA.find((x) => x.valor === status) ?? STATUS_LOJA[0];
  return (
    <span className={`inline-flex text-xs font-bold px-2.5 py-0.5 rounded-pill border ${s.classe}`}>
      {s.rotulo}
    </span>
  );
}

export default function AdminLojasPage({ lojasIniciais, produtosIniciais }: Props) {
  const [aba, setAba] = useState<"lojas" | "produtos">("lojas");
  const [lojas, setLojas] = useState<LojaModeracao[]>(lojasIniciais);
  const [produtos, setProdutos] = useState<ProdutoModeracao[]>(produtosIniciais);
  const [filtroLoja, setFiltroLoja] = useState<LojaStatus | "todos">("todos");
  const [apenasDestaque, setApenasDestaque] = useState(false);
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState<string | null>(null);
  const [notificacao, setNotificacao] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const termo = busca.trim().toLowerCase();

  const lojasFiltradas = useMemo(() => {
    return lojas.filter(
      (l) =>
        (filtroLoja === "todos" || l.status === filtroLoja) &&
        (!termo ||
          l.nome.toLowerCase().includes(termo) ||
          l.dono_nome.toLowerCase().includes(termo) ||
          l.dono_email.toLowerCase().includes(termo))
    );
  }, [lojas, filtroLoja, termo]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(
      (p) =>
        (!apenasDestaque || p.destaque) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.loja_nome.toLowerCase().includes(termo))
    );
  }, [produtos, apenasDestaque, termo]);

  const totalDestaques = produtos.filter((p) => p.destaque).length;

  async function handleStatusLoja(loja: LojaModeracao, status: LojaStatus) {
    if (status === loja.status) return;
    if (status === "reprovado" && !confirm(`Reprovar a loja "${loja.nome}"? Ela some do catálogo.`)) return;

    setProcessando(`loja-${loja.id}`);
    setNotificacao(null);
    try {
      await moderarLoja(loja.id, status);
      setLojas((prev) => prev.map((l) => (l.id === loja.id ? { ...l, status } : l)));
      setNotificacao({ tipo: "sucesso", texto: `Loja "${loja.nome}" atualizada.` });
    } catch (err) {
      setNotificacao({ tipo: "erro", texto: (err as { message?: string })?.message || "Erro ao atualizar a loja." });
    } finally {
      setProcessando(null);
    }
  }

  async function handleDestaque(produto: ProdutoModeracao) {
    const novo = !produto.destaque;
    setProcessando(`produto-${produto.id}`);
    setNotificacao(null);
    try {
      await definirDestaque(produto.id, novo);
      setProdutos((prev) => prev.map((p) => (p.id === produto.id ? { ...p, destaque: novo } : p)));
      setNotificacao({
        tipo: "sucesso",
        texto: novo ? `"${produto.nome}" impulsionado na home.` : `"${produto.nome}" removido dos destaques.`,
      });
    } catch (err) {
      setNotificacao({ tipo: "erro", texto: (err as { message?: string })?.message || "Erro ao atualizar o destaque." });
    } finally {
      setProcessando(null);
    }
  }

  return (
    <>
      <Head>
        <title>Lojas e destaques • Admin Circular</title>
      </Head>

      <div className="min-h-screen bg-pagina pb-16">
        <div className="bg-superficie border-b border-borda sticky top-[69px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/painel" className="text-xs font-semibold text-tinta-suave hover:text-tinta transition">
                Meu Painel
              </Link>
              <span className="text-tinta-sutil">|</span>
              <span className="text-sm font-bold text-tinta"><Store size={16} strokeWidth={1.75} aria-hidden="true" /> Lojas e Destaques</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/verificacoes"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Matrículas
              </Link>
              <Link
                href="/admin/imagens"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Imagens
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-petroleo tracking-tight">Moderação de lojas e produtos</h1>
            <p className="text-xs text-tinta-suave mt-1">
              Altere o status das lojas e escolha quais produtos ficam impulsionados na home.
            </p>
          </div>

          {notificacao && (
            <div
              className={`mb-6 p-4 rounded-controle text-xs font-semibold border ${
                notificacao.tipo === "sucesso"
                  ? "bg-troca-50 text-troca-texto border-troca"
                  : "bg-perigo-50 text-perigo border-perigo"
              }`}
            >
              {notificacao.texto}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {STATUS_LOJA.map((s) => (
              <div key={s.valor} className="bg-superficie border border-borda rounded-controle p-4">
                <p className="text-xs font-bold text-tinta-suave uppercase tracking-wider">Lojas {s.rotulo.toLowerCase()}s</p>
                <p className="text-2xl font-bold text-tinta mt-1">
                  {lojas.filter((l) => l.status === s.valor).length}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-superficie border border-borda rounded-controle p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(["lojas", "produtos"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAba(a)}
                  className={`text-xs px-4 py-1.5 rounded-pill font-bold border transition whitespace-nowrap ${
                    aba === a ? "bg-petroleo border-petroleo text-white" : "border-borda-controle text-tinta-suave hover:border-petroleo"
                  }`}
                >
                  {a === "lojas" ? `Lojas (${lojas.length})` : `Produtos (${totalDestaques} em destaque)`}
                </button>
              ))}

              <span className="mx-1 h-5 w-px bg-pagina" />

              {aba === "lojas" ? (
                <select
                  value={filtroLoja}
                  onChange={(e) => setFiltroLoja(e.target.value as LojaStatus | "todos")}
                  className="text-xs px-3 py-1.5 rounded-pill border border-borda-controle text-tinta-suave bg-superficie"
                >
                  <option value="todos">Todos os status</option>
                  {STATUS_LOJA.map((s) => (
                    <option key={s.valor} value={s.valor}>{s.rotulo}</option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setApenasDestaque((v) => !v)}
                  className={`text-xs px-3 py-1.5 rounded-pill border transition whitespace-nowrap ${
                    apenasDestaque ? "border-petroleo text-petroleo bg-perigo-50" : "border-borda-controle text-tinta-suave"
                  }`}
                >
                  <Star size={16} strokeWidth={1.75} aria-hidden="true" /> Só destaques
                </button>
              )}
            </div>

            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={aba === "lojas" ? "Buscar loja, dono ou e-mail..." : "Buscar produto ou loja..."}
              className="w-full sm:w-72 text-xs px-4 py-2 rounded-pill border border-borda focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 focus:border-petroleo bg-pagina"
            />
          </div>

          {aba === "lojas" ? (
            <div className="bg-superficie border border-borda rounded-controle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pagina border-b border-borda text-tinta-suave uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Loja</th>
                      <th className="py-3.5 px-4">Dono</th>
                      <th className="py-3.5 px-4">Produtos</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Alterar status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {lojasFiltradas.map((l) => (
                      <tr key={l.id} className="hover:bg-pagina transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-tinta">{l.nome}</div>
                          {l.slug && (
                            <Link href={`/lojas/${l.slug}`} target="_blank" className="text-xs text-tinta-suave hover:text-petroleo">
                              /lojas/{l.slug}
                            </Link>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-tinta font-semibold">
                            {l.dono_nome} {l.matricula_validada && <span title="Matrícula verificada"><ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" /></span>}
                          </div>
                          <div className="text-xs text-tinta-suave">{l.dono_email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-tinta-suave">
                          {l.produtos_ativos} ativos / {l.total_produtos}
                        </td>
                        <td className="py-3.5 px-4">{badgeLoja(l.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={l.status}
                            disabled={processando === `loja-${l.id}`}
                            onChange={(e) => handleStatusLoja(l, e.target.value as LojaStatus)}
                            className="text-xs px-3 py-1.5 rounded-pill border border-borda-controle text-tinta bg-superficie disabled:opacity-50"
                          >
                            {STATUS_LOJA.map((s) => (
                              <option key={s.valor} value={s.valor}>{s.rotulo}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lojasFiltradas.length === 0 && (
                <p className="text-center text-xs text-tinta-suave py-10">Nenhuma loja encontrada com este filtro.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtosFiltrados.map((p) => (
                <div key={p.id} className="bg-superficie border border-borda rounded-controle p-3 flex gap-3 hover:shadow-hover transition">
                  <div className="w-16 h-16 rounded-controle bg-pagina overflow-hidden flex-shrink-0">
                    {p.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl"><Package size={16} strokeWidth={1.75} aria-hidden="true" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-tinta truncate">{p.nome}</p>
                    <p className="text-xs text-tinta-suave truncate">{p.loja_nome}</p>
                    <p className="text-xs text-tinta mt-0.5">
                      {p.preco > 0 ? `R$ ${p.preco.toFixed(2).replace(".", ",")}` : "Troca"}
                      {p.status === "pausado" && <span className="ml-2 text-xs text-tinta-suave">(pausado)</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={processando === `produto-${p.id}`}
                    onClick={() => handleDestaque(p)}
                    title={p.destaque ? "Remover dos destaques" : "Impulsionar na home"}
                    aria-pressed={p.destaque}
                    className={`self-center text-sm font-semibold px-3 min-h-[44px] inline-flex items-center gap-1.5 rounded-controle border transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
                      p.destaque
                        ? "bg-acao-50 border-acao-hover text-acao-hover"
                        : "bg-superficie border-borda-controle text-petroleo hover:border-petroleo"
                    }`}
                  >
                    <Star size={16} strokeWidth={1.75} className={p.destaque ? "fill-acao-hover" : ""} aria-hidden="true" />
                    {p.destaque ? "Impulsionado" : "Impulsionar"}
                  </button>
                </div>
              ))}
              {produtosFiltrados.length === 0 && (
                <p className="col-span-full text-center text-xs text-tinta-suave py-10">Nenhum produto encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
