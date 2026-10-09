import { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getUsuariosParaModeracao, moderarMatricula } from "@/lib/queries";
import type { UsuarioModeracao } from "@/types";
import {
  Check,
  CircleCheck,
  Clock,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

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
    } catch (err) {
      setNotificacao({ tipo: "erro", texto: (err as { message?: string })?.message || "Erro ao moderar matrícula." });
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <>
      <Head>
        <title>Matrículas • Admin Circular</title>
      </Head>

      <div className="min-h-screen bg-pagina pb-16">
        {/* Top Header Admin */}
        <div className="bg-superficie border-b border-borda sticky top-[69px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/painel"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta flex items-center gap-1 transition"
              >
                <span></span>
                <span>Meu Painel</span>
              </Link>
              <span className="text-tinta-sutil">|</span>
              <span className="text-sm font-bold text-tinta flex items-center gap-1.5">
                <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Moderação de Matrículas</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/lojas"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Lojas e Destaques
              </Link>
              <Link
                href="/admin/imagens"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Gerenciar Imagens
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-petroleo tracking-tight">
              Verificação de Vínculo Acadêmico
            </h1>
            <p className="text-xs text-tinta-suave mt-1">
              Avalie e aprove solicitações de matrícula para conceder o selo oficial <strong>Aluno Verificado</strong>.
            </p>
          </div>

          {notificacao && (
            <div
              className={`mb-6 p-4 rounded-card text-xs font-semibold flex items-center gap-2 ${
                notificacao.tipo === "sucesso"
                  ? "bg-troca-50 text-troca-texto"
                  : "bg-perigo-50 text-perigo"
              }`}
            >
              <span>{notificacao.tipo === "sucesso" ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />}</span>
              <span>{notificacao.texto}</span>
            </div>
          )}

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-superficie border border-borda rounded-card p-4">
              <p className="text-xs font-bold text-tinta-sutil uppercase tracking-wider">Total de Alunos</p>
              <p className="text-2xl font-bold text-tinta mt-1">{total}</p>
            </div>
            <div className="bg-superficie border border-doacao bg-doacao-50 rounded-card p-4">
              <p className="text-xs font-bold text-doacao uppercase tracking-wider">Pendentes</p>
              <p className="text-2xl font-bold text-doacao mt-1">{pendentes}</p>
            </div>
            <div className="bg-superficie border border-troca bg-troca-50 rounded-card p-4">
              <p className="text-xs font-bold text-troca-texto uppercase tracking-wider">Verificados</p>
              <p className="text-2xl font-bold text-troca-texto mt-1">{verificados}</p>
            </div>
            <div className="bg-superficie border border-borda rounded-card p-4">
              <p className="text-xs font-bold text-tinta-sutil uppercase tracking-wider">Rejeitados</p>
              <p className="text-2xl font-bold text-tinta-suave mt-1">{rejeitados}</p>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-superficie border border-borda rounded-card p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFiltroStatus("pendente")}
                className={`text-sm px-4 min-h-[44px] rounded-pill font-semibold border transition whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
                  filtroStatus === "pendente"
                    ? "bg-doacao border-doacao text-white"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                }`}
              >
                <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Pendentes ({pendentes})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("verificado")}
                className={`text-sm px-4 min-h-[44px] rounded-pill font-semibold border transition whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
                  filtroStatus === "verificado"
                    ? "bg-troca border-troca text-white"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                }`}
              >
                <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Verificados ({verificados})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("rejeitado")}
                className={`text-sm px-4 min-h-[44px] rounded-pill font-semibold border transition whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
                  filtroStatus === "rejeitado"
                    ? "bg-tinta-suave border-tinta-suave text-white"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                }`}
              >
                <span>Rejeitados ({rejeitados})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus("todos")}
                className={`text-sm px-4 min-h-[44px] rounded-pill font-semibold border transition whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
                  filtroStatus === "todos"
                    ? "bg-petroleo border-petroleo text-white"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
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
                className="w-full text-xs px-3.5 py-2 rounded-controle border border-borda focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 focus:border-petroleo bg-pagina"
              />
            </div>
          </div>

          {/* Tabela de Estudantes */}
          {usuariosFiltrados.length === 0 ? (
            <div className="bg-superficie border border-dashed border-borda rounded-card p-12 text-center">
              <CircleCheck size={40} strokeWidth={1.75} className="mx-auto mb-2" aria-hidden="true" />
              <h3 className="text-base font-bold text-tinta">
                Nenhum estudante encontrado com este filtro!
              </h3>
              <p className="text-xs text-tinta-sutil mt-1">
                Todas as solicitações de matrícula nesta seção estão em dia.
              </p>
            </div>
          ) : (
            <div className="bg-superficie border border-borda rounded-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pagina border-b border-borda text-tinta-sutil uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Estudante</th>
                      <th className="py-3.5 px-4">Instituição</th>
                      <th className="py-3.5 px-4">Matrícula</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Ações de Moderação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {usuariosFiltrados.map((u) => {
                      const isProcessing = processandoId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-pagina transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-tinta">
                              {u.nome} {u.sobrenome}
                            </div>
                            <div className="text-tinta-sutil text-xs">{u.email}</div>
                            {u.telefone && (
                              <div className="text-tinta-sutil text-xs">{u.telefone}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-tinta font-semibold">
                              {u.instituicao_nome || "— Não informada"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.matricula ? (
                              <code className="bg-pagina text-tinta px-2 py-0.5 rounded font-mono text-xs">
                                {u.matricula}
                              </code>
                            ) : (
                              <span className="text-tinta-sutil italic">Não informada</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.matricula_status === "verificado" ? (
                              <span className="inline-flex items-center gap-1 bg-troca-50 text-troca-texto text-xs font-bold px-2.5 py-0.5 rounded-pill">
                                <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                                <span>Verificado</span>
                              </span>
                            ) : u.matricula_status === "pendente" ? (
                              <span className="inline-flex items-center gap-1 bg-doacao-50 text-doacao text-xs font-bold px-2.5 py-0.5 rounded-pill">
                                <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                                <span>Pendente</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-pagina text-tinta-suave border border-borda text-xs font-semibold px-2.5 py-0.5 rounded-pill">
                                <X size={16} strokeWidth={1.75} aria-hidden="true" />
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
                                  className="text-tinta-suave hover:text-tinta text-xs font-semibold px-2 py-1 rounded hover:bg-pagina transition mr-1"
                                >
                                  Ver perfil
                                </Link>
                              )}

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAcao(u.id, "verificado")}
                                className="bg-troca text-white font-bold text-xs px-3 py-1.5 rounded-controle transition disabled:opacity-50 flex items-center gap-1"
                                title="Aprovar matrícula e conceder selo Aluno Verificado"
                              >
                                <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                                <span>Aprovar</span>
                              </button>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAcao(u.id, "rejeitado")}
                                className="bg-superficie border border-borda-controle hover:border-perigo hover:text-perigo text-tinta font-semibold text-xs px-2.5 py-1.5 rounded-controle transition disabled:opacity-50"
                                title="Rejeitar solicitação"
                              >
                                <X size={16} strokeWidth={1.75} aria-hidden="true" /> </button>
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
