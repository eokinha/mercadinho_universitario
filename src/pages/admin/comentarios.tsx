import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { MessageSquare } from "lucide-react";
import Estrelas from "@/components/Estrelas";
import { createServerClient } from "@/lib/supabase";
import { getConteudoParaModeracao, moderarConteudo } from "@/lib/queries";
import type { ConteudoModeracao, StatusModeracao, TipoConteudoModerado } from "@/types";

interface Props {
  itensIniciais: ConteudoModeracao[];
}

// Fila de perguntas, respostas e comentários de avaliação que a Vettly não decidiu (falhou ou só sinalizou)
// e os recusados pela equipe nos últimos 30 dias. O que a Vettly recusa não é gravado. Só admin (middleware + RPC).
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const itensIniciais = await getConteudoParaModeracao(serverSupabase);
  return { props: { itensIniciais } };
};

const TIPOS: Record<TipoConteudoModerado, string> = {
  pergunta: "Pergunta",
  resposta: "Resposta",
  avaliacao: "Avaliação",
};

const FILTROS: { valor: StatusModeracao; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Em análise" },
  { valor: "recusado", rotulo: "Recusados" },
  { valor: "aprovado", rotulo: "Aprovados agora" },
];

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `min-h-[44px] px-3 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition disabled:opacity-50 ${FOCO}`;

export default function AdminComentariosPage({ itensIniciais }: Props) {
  const [itens, setItens] = useState<ConteudoModeracao[]>(itensIniciais);
  const [filtro, setFiltro] = useState<StatusModeracao>("pendente");
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const filtrados = useMemo(() => itens.filter((i) => i.status === filtro), [itens, filtro]);

  async function handleDecidir(item: ConteudoModeracao, status: "aprovado" | "recusado") {
    const chave = `${item.tipo}-${item.id}`;
    setProcessando(chave);
    setErro(null);
    try {
      await moderarConteudo(item.tipo, item.id, status);
      setItens((prev) => prev.map((i) => (i.tipo === item.tipo && i.id === item.id ? { ...i, status } : i)));
    } catch (err) {
      setErro((err as { message?: string })?.message || "Erro ao moderar.");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <>
      <Head>
        <title>Comentários • Admin Circular</title>
      </Head>

      <div className="min-h-screen bg-pagina pb-16">
        <div className="bg-superficie border-b border-borda sticky top-[69px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-tinta flex items-center gap-1.5">
              <MessageSquare size={16} strokeWidth={1.75} aria-hidden="true" />
              Comentários
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/denuncias"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Denúncias
              </Link>
              <Link
                href="/admin/verificacoes"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Matrículas
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-petroleo tracking-tight">Perguntas e avaliações</h1>
          <p className="text-sm text-tinta-suave mt-1 mb-6">
            A moderação automática (Vettly) aprova na hora, e o que ela recusa nem chega a ser salvo. Aqui ficam os
            que ela não decidiu (falha ou conteúdo sinalizado) e os que a equipe recusou nos últimos 30 dias.
          </p>

          <div role="tablist" aria-label="Status da moderação" className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                role="tab"
                aria-selected={filtro === f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`px-4 min-h-[44px] rounded-pill text-sm font-semibold border shrink-0 transition ${FOCO} ${
                  filtro === f.valor
                    ? "bg-petroleo border-petroleo text-white"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                }`}
              >
                {f.rotulo} ({itens.filter((i) => i.status === f.valor).length})
              </button>
            ))}
          </div>

          {erro && <p role="alert" className="mb-4 p-3 rounded-card bg-perigo-50 text-perigo text-sm">{erro}</p>}

          {filtrados.length === 0 ? (
            <p className="text-center text-sm text-tinta-suave py-12">Nada aqui.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtrados.map((item) => {
                const chave = `${item.tipo}-${item.id}`;
                return (
                  <li key={chave} className="bg-superficie border border-borda rounded-card p-4 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-petroleo-50 text-petroleo">
                        {TIPOS[item.tipo]}
                      </span>
                      {item.nota !== null && <Estrelas nota={item.nota} tamanho={14} />}
                      <span className="text-xs text-tinta-suave">{new Date(item.criado_em).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-xs text-tinta-suave">{item.contexto}</p>
                    {item.texto && <p className="text-tinta text-sm whitespace-pre-line">{item.texto}</p>}
                    <p className="text-xs text-tinta-suave">
                      Por {item.autor_nome ?? "conta excluída"}
                      {item.autor_email ? ` · ${item.autor_email}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-borda">
                      <Link href={item.link} target="_blank" className={`${BOTAO_SECUNDARIO} inline-flex items-center`}>
                        Ver página
                      </Link>
                      {item.status !== "aprovado" && (
                        <button type="button" disabled={processando === chave} onClick={() => handleDecidir(item, "aprovado")} className={BOTAO_SECUNDARIO}>
                          Aprovar
                        </button>
                      )}
                      {item.status !== "recusado" && (
                        <button type="button" disabled={processando === chave} onClick={() => handleDecidir(item, "recusado")} className={BOTAO_SECUNDARIO}>
                          Recusar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
