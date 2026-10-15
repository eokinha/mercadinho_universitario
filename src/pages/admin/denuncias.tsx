import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getDenunciasParaModeracao, resolverDenuncia } from "@/lib/queries";
import type { DenunciaModeracao, DenunciaStatus, MotivoDenuncia } from "@/types";
import { Flag } from "lucide-react";

interface Props {
  denunciasIniciais: DenunciaModeracao[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const serverSupabase = createServerClient(ctx);
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const denunciasIniciais = await getDenunciasParaModeracao(serverSupabase);
  return { props: { denunciasIniciais } };
};

const MOTIVOS: Record<MotivoDenuncia, string> = {
  proibido: "Item proibido",
  golpe: "Golpe ou fraude",
  falso: "Anúncio falso",
  ofensivo: "Conteúdo ofensivo",
  outro: "Outro",
};

const STATUS: { valor: DenunciaStatus; rotulo: string; classe: string }[] = [
  { valor: "aberta", rotulo: "Abertas", classe: "bg-perigo-50 text-perigo" },
  { valor: "resolvida", rotulo: "Resolvidas", classe: "bg-troca-50 text-troca-texto" },
  { valor: "descartada", rotulo: "Descartadas", classe: "bg-pagina text-tinta-suave" },
];

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `min-h-[44px] px-3 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition disabled:opacity-50 ${FOCO}`;

export default function AdminDenunciasPage({ denunciasIniciais }: Props) {
  const [denuncias, setDenuncias] = useState<DenunciaModeracao[]>(denunciasIniciais);
  const [filtro, setFiltro] = useState<DenunciaStatus>("aberta");
  const [processando, setProcessando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const filtradas = useMemo(() => denuncias.filter((d) => d.status === filtro), [denuncias, filtro]);

  async function handleStatus(denuncia: DenunciaModeracao, status: DenunciaStatus) {
    setProcessando(denuncia.id);
    setErro(null);
    try {
      await resolverDenuncia(denuncia.id, status);
      setDenuncias((prev) => prev.map((d) => (d.id === denuncia.id ? { ...d, status } : d)));
    } catch (err) {
      setErro((err as { message?: string })?.message || "Erro ao atualizar a denúncia.");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <>
      <Head>
        <title>Denúncias • Admin Circular</title>
      </Head>

      <div className="min-h-screen bg-pagina pb-16">
        <div className="bg-superficie border-b border-borda sticky top-[69px] z-20">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-tinta flex items-center gap-1.5">
              <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
              Denúncias
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/verificacoes"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Matrículas
              </Link>
              <Link
                href="/admin/lojas"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Lojas
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-petroleo tracking-tight">Denúncias</h1>
          <p className="text-sm text-tinta-suave mt-1 mb-6">
            Para tirar algo do ar, reprove a loja em Lojas ou bloqueie o aluno em Matrículas. Depois marque a denúncia como resolvida.
          </p>

          <div role="tablist" aria-label="Status das denúncias" className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {STATUS.map((s) => (
              <button
                key={s.valor}
                type="button"
                role="tab"
                aria-selected={filtro === s.valor}
                onClick={() => setFiltro(s.valor)}
                className={`px-4 min-h-[44px] rounded-pill text-sm font-semibold border shrink-0 transition ${FOCO} ${
                  filtro === s.valor
                    ? "bg-petroleo border-petroleo text-white"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                }`}
              >
                {s.rotulo} ({denuncias.filter((d) => d.status === s.valor).length})
              </button>
            ))}
          </div>

          {erro && (
            <p role="alert" className="mb-4 p-3 rounded-card bg-perigo-50 text-perigo text-sm">{erro}</p>
          )}

          {filtradas.length === 0 ? (
            <p className="text-center text-sm text-tinta-suave py-12">Nenhuma denúncia aqui.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filtradas.map((d) => (
                <li key={d.id} className="bg-superficie border border-borda rounded-card p-4 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-perigo-50 text-perigo">
                      {MOTIVOS[d.motivo]}
                    </span>
                    <span className="text-xs text-tinta-suave">
                      {new Date(d.criado_em).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-tinta font-semibold">{d.alvo_descricao}</p>
                  {d.detalhes && <p className="text-sm text-tinta-suave whitespace-pre-line">{d.detalhes}</p>}
                  <p className="text-xs text-tinta-suave">
                    Enviada por {d.denunciante_nome ?? "conta excluída"}
                    {d.denunciante_email ? ` · ${d.denunciante_email}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-borda">
                    {d.loja_id && (
                      <Link href={`/perfil/${d.loja_id}`} target="_blank" className={`${BOTAO_SECUNDARIO} inline-flex items-center`}>
                        Ver perfil
                      </Link>
                    )}
                    {d.status === "aberta" ? (
                      <>
                        <button type="button" disabled={processando === d.id} onClick={() => handleStatus(d, "resolvida")} className={BOTAO_SECUNDARIO}>
                          Marcar como resolvida
                        </button>
                        <button type="button" disabled={processando === d.id} onClick={() => handleStatus(d, "descartada")} className={BOTAO_SECUNDARIO}>
                          Descartar
                        </button>
                      </>
                    ) : (
                      <button type="button" disabled={processando === d.id} onClick={() => handleStatus(d, "aberta")} className={BOTAO_SECUNDARIO}>
                        Reabrir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
