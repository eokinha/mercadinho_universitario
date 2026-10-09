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
  { valor: "ativo", rotulo: "Ativa", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { valor: "pendente", rotulo: "Pendente", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  { valor: "pausado", rotulo: "Pausada", classe: "bg-gray-100 text-gray-600 border-gray-200" },
  { valor: "reprovado", rotulo: "Reprovada", classe: "bg-red-50 text-red-700 border-red-200" },
];

function badgeLoja(status: LojaStatus) {
  const s = STATUS_LOJA.find((x) => x.valor === status) ?? STATUS_LOJA[0];
  return (
    <span className={`inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${s.classe}`}>
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
        <title>Lojas e Destaques • Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-[#F7F7F7] pb-16">
        <div className="bg-white border-b border-gray-200 sticky top-[65px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/painel" className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition">
                ← Meu Painel
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-black text-gray-800">🏪 Lojas e Destaques</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/verificacoes"
                className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Matrículas
              </Link>
              <Link
                href="/admin/imagens"
                className="text-xs font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Imagens
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Moderação de lojas e produtos</h1>
            <p className="text-xs text-gray-500 mt-1">
              Altere o status das lojas e escolha quais produtos ficam impulsionados na home.
            </p>
          </div>

          {notificacao && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs font-semibold border ${
                notificacao.tipo === "sucesso"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {notificacao.texto}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {STATUS_LOJA.map((s) => (
              <div key={s.valor} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lojas {s.rotulo.toLowerCase()}s</p>
                <p className="text-2xl font-black text-gray-800 mt-1">
                  {lojas.filter((l) => l.status === s.valor).length}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(["lojas", "produtos"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAba(a)}
                  className={`text-xs px-4 py-1.5 rounded-full font-bold border transition whitespace-nowrap ${
                    aba === a ? "bg-[#FF385C] border-[#FF385C] text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {a === "lojas" ? `Lojas (${lojas.length})` : `Produtos (${totalDestaques} em destaque)`}
                </button>
              ))}

              <span className="mx-1 h-5 w-px bg-gray-200" />

              {aba === "lojas" ? (
                <select
                  value={filtroLoja}
                  onChange={(e) => setFiltroLoja(e.target.value as LojaStatus | "todos")}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 bg-white"
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
                  className={`text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                    apenasDestaque ? "border-[#FF385C] text-[#FF385C] bg-red-50" : "border-gray-300 text-gray-600"
                  }`}
                >
                  ⭐ Só destaques
                </button>
              )}
            </div>

            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={aba === "lojas" ? "Buscar loja, dono ou e-mail..." : "Buscar produto ou loja..."}
              className="w-full sm:w-72 text-xs px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-[#FF385C] bg-gray-50"
            />
          </div>

          {aba === "lojas" ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Loja</th>
                      <th className="py-3.5 px-4">Dono</th>
                      <th className="py-3.5 px-4">Produtos</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Alterar status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lojasFiltradas.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-800">{l.nome}</div>
                          {l.slug && (
                            <Link href={`/lojas/${l.slug}`} target="_blank" className="text-[11px] text-gray-500 hover:text-[#FF385C]">
                              /lojas/{l.slug} ↗
                            </Link>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-gray-800 font-medium">
                            {l.dono_nome} {l.matricula_validada && <span title="Matrícula verificada">🛡️</span>}
                          </div>
                          <div className="text-[11px] text-gray-500">{l.dono_email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {l.produtos_ativos} ativos / {l.total_produtos}
                        </td>
                        <td className="py-3.5 px-4">{badgeLoja(l.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <select
                            value={l.status}
                            disabled={processando === `loja-${l.id}`}
                            onChange={(e) => handleStatusLoja(l, e.target.value as LojaStatus)}
                            className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 bg-white disabled:opacity-50"
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
                <p className="text-center text-xs text-gray-500 py-10">Nenhuma loja encontrada com este filtro.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtosFiltrados.map((p) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3 flex gap-3 hover:shadow-md transition">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {p.imagem_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{p.nome}</p>
                    <p className="text-[11px] text-gray-500 truncate">{p.loja_nome}</p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      {p.preco > 0 ? `R$ ${p.preco.toFixed(2).replace(".", ",")}` : "Troca"}
                      {p.status === "pausado" && <span className="ml-2 text-[10px] text-gray-500">(pausado)</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={processando === `produto-${p.id}`}
                    onClick={() => handleDestaque(p)}
                    title={p.destaque ? "Remover dos destaques" : "Impulsionar na home"}
                    className={`self-center text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                      p.destaque
                        ? "bg-[#FF385C] hover:bg-[#e0314f] text-white"
                        : "border border-gray-300 text-gray-600 hover:border-[#FF385C] hover:text-[#FF385C]"
                    }`}
                  >
                    {p.destaque ? "⭐ Destaque" : "Impulsionar"}
                  </button>
                </div>
              ))}
              {produtosFiltrados.length === 0 && (
                <p className="col-span-full text-center text-xs text-gray-500 py-10">Nenhum produto encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
