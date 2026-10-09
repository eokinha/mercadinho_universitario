import { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getUsuariosParaModeracao, moderarMatricula } from "@/lib/queries";
import type { UsuarioModeracao } from "@/types";

interface Props {
  usuariosIniciais: UsuarioModeracao[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const { data: { user } } = await serverSupabase.auth.getUser();

  // Modo de pré-visualização para testes de UI
  if (!user && (process.env.NODE_ENV === "development" && (ctx.query.preview === "1" || ctx.query.demo === "1"))) {
    const mockUsuarios: UsuarioModeracao[] = [
      {
        id: 1,
        nome: "Lucas",
        sobrenome: "Silva",
        email: "lucas.silva@aluno.ufmg.br",
        telefone: "(31) 99999-0001",
        matricula: "2024019283",
        matricula_status: "verificado",
        matricula_validada: true,
        instituicoes_id: 1,
        instituicao_nome: "UFMG - Universidade Federal de Minas Gerais",
        loja_id: 1,
      },
      {
        id: 2,
        nome: "Mariana",
        sobrenome: "Ribeiro",
        email: "mari.ribeiro@gmail.com",
        telefone: "(31) 98888-2233",
        matricula: "2023098124",
        matricula_status: "pendente",
        matricula_validada: false,
        instituicoes_id: 1,
        instituicao_nome: "UFMG - Universidade Federal de Minas Gerais",
        loja_id: 2,
      },
      {
        id: 3,
        nome: "Gabriel",
        sobrenome: "Santos",
        email: "gabriel.santos@usp.br",
        telefone: "(11) 97777-4455",
        matricula: "2022041209",
        matricula_status: "verificado",
        matricula_validada: true,
        instituicoes_id: 2,
        instituicao_nome: "USP - Universidade de São Paulo",
        loja_id: 3,
      },
      {
        id: 4,
        nome: "Camila",
        sobrenome: "Duarte",
        email: "camiladuarte@hotmail.com",
        telefone: "(31) 96666-8899",
        matricula: "9988112",
        matricula_status: "rejeitado",
        matricula_validada: false,
        instituicoes_id: 3,
        instituicao_nome: "PUC Minas",
        loja_id: 4,
      },
      {
        id: 5,
        nome: "Rodrigo",
        sobrenome: "Almeida",
        email: "rodrigo.almeida@aluno.unb.br",
        telefone: "(61) 99123-4567",
        matricula: "2024001920",
        matricula_status: "pendente",
        matricula_validada: false,
        instituicoes_id: 4,
        instituicao_nome: "UnB - Universidade de Brasília",
        loja_id: 5,
      },
    ];

    return {
      props: {
        usuariosIniciais: mockUsuarios,
      },
    };
  }

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const usuariosIniciais = await getUsuariosParaModeracao(serverSupabase);

  return {
    props: {
      usuariosIniciais,
    },
  };
};

export default function AdminVerificacoesPage({ usuariosIniciais }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioModeracao[]>(usuariosIniciais);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendente" | "verificado" | "rejeitado">("pendente");
  const [busca, setBusca] = useState("");
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [notificacao, setNotificacao] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  // Estatísticas
  const total = usuarios.length;
  const pendentes = useMemo(() => usuarios.filter((u) => u.matricula_status === "pendente").length, [usuarios]);
  const verificados = useMemo(() => usuarios.filter((u) => u.matricula_status === "verificado").length, [usuarios]);
  const rejeitados = useMemo(() => usuarios.filter((u) => u.matricula_status === "rejeitado").length, [usuarios]);

  // Filtro dinâmico
  const usuariosFiltrados = useMemo(() => {
    let lista = usuarios;
    if (filtroStatus !== "todos") {
      lista = lista.filter((u) => u.matricula_status === filtroStatus);
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (u) =>
          u.nome.toLowerCase().includes(termo) ||
          u.sobrenome.toLowerCase().includes(termo) ||
          u.email.toLowerCase().includes(termo) ||
          u.matricula.toLowerCase().includes(termo) ||
          (u.instituicao_nome && u.instituicao_nome.toLowerCase().includes(termo))
      );
    }
    return lista;
  }, [usuarios, filtroStatus, busca]);

  async function handleAcao(usuarioId: number, novoStatus: "verificado" | "rejeitado") {
    setProcessandoId(usuarioId);
    setNotificacao(null);
    try {
      await moderarMatricula(usuarioId, novoStatus);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuarioId
            ? { ...u, matricula_status: novoStatus, matricula_validada: novoStatus === "verificado" }
            : u
        )
      );
      setNotificacao({
        tipo: "sucesso",
        texto: novoStatus === "verificado" ? "Matrícula aprovada com sucesso!" : "Matrícula rejeitada.",
      });
    } catch (err: any) {
      setNotificacao({ tipo: "erro", texto: err?.message || "Erro ao moderar matrícula." });
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <>
      <Head>
        <title>Moderação de Matrículas • Painel Admin</title>
      </Head>

      <div className="min-h-screen bg-[#F8F9FA] pb-16">
        {/* Top Header Admin */}
        <div className="bg-white border-b border-gray-200 sticky top-[65px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/painel"
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
              >
                <span>←</span>
                <span>Meu Painel</span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Moderação de Matrículas</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/lojas"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Lojas e Destaques
              </Link>
              <Link
                href="/admin/imagens"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                Gerenciar Imagens
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Verificação de Vínculo Acadêmico
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Avalie e aprove solicitações de matrícula para conceder o selo oficial <strong>Aluno Verificado 🛡️</strong>.
            </p>
          </div>

          {notificacao && (
            <div
              className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                notificacao.tipo === "sucesso"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              <span>{notificacao.tipo === "sucesso" ? "✓" : "⚠️"}</span>
              <span>{notificacao.texto}</span>
            </div>
          )}

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total de Alunos</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{total}</p>
            </div>
            <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-2xl p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pendentes</p>
              <p className="text-2xl font-black text-amber-700 mt-1">{pendentes}</p>
            </div>
            <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-2xl p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Verificados</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{verificados}</p>
            </div>
            <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rejeitados</p>
              <p className="text-2xl font-black text-gray-600 mt-1">{rejeitados}</p>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-white border border-gray-200/90 rounded-2xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFiltroStatus("pendente")}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  filtroStatus === "pendente"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>⏳ Pendentes ({pendentes})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("verificado")}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  filtroStatus === "verificado"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>✓ Verificados ({verificados})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("rejeitado")}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  filtroStatus === "rejeitado"
                    ? "bg-gray-800 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>Rejeitados ({rejeitados})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("todos")}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  filtroStatus === "todos"
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>Todos ({total})</span>
              </button>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por aluno, email, matrícula..."
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-[#FF385C] bg-gray-50"
              />
            </div>
          </div>

          {/* Tabela de Estudantes */}
          {usuariosFiltrados.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-12 text-center">
              <span className="text-4xl block mb-2">🎉</span>
              <h3 className="text-base font-bold text-gray-800">
                Nenhum estudante encontrado com este filtro!
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Todas as solicitações de matrícula nesta seção estão em dia.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Estudante</th>
                      <th className="py-3.5 px-4">Instituição</th>
                      <th className="py-3.5 px-4">Matrícula</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Ações de Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usuariosFiltrados.map((u) => {
                      const isProcessing = processandoId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">
                              {u.nome} {u.sobrenome}
                            </div>
                            <div className="text-gray-400 text-[11px]">{u.email}</div>
                            {u.telefone && (
                              <div className="text-gray-400 text-[10px]">{u.telefone}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-gray-700 font-medium">
                              {u.instituicao_nome || "— Não informada"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.matricula ? (
                              <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-mono text-xs">
                                {u.matricula}
                              </code>
                            ) : (
                              <span className="text-gray-400 italic">Não informada</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.matricula_status === "verificado" ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                <span>✓</span>
                                <span>Verificado</span>
                              </span>
                            ) : u.matricula_status === "pendente" ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                <span>⏳</span>
                                <span>Pendente</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                                <span>✕</span>
                                <span>Rejeitado</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {u.loja_id && (
                                <Link
                                  href={`/perfil/${u.loja_id}`}
                                  target="_blank"
                                  className="text-gray-500 hover:text-gray-800 text-[11px] font-semibold px-2 py-1 rounded hover:bg-gray-100 transition mr-1"
                                >
                                  Ver perfil ↗
                                </Link>
                              )}

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAcao(u.id, "verificado")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1"
                                title="Aprovar matrícula e conceder selo Aluno Verificado"
                              >
                                <span>✓</span>
                                <span>Aprovar</span>
                              </button>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAcao(u.id, "rejeitado")}
                                className="bg-white border border-gray-300 hover:border-red-400 hover:text-red-600 text-gray-700 font-semibold text-xs px-2.5 py-1.5 rounded-xl transition disabled:opacity-50"
                                title="Rejeitar solicitação"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
