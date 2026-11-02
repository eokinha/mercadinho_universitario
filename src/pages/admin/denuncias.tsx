import { useMemo, useState } from "react";
import Head from "next/head";
import { useConfirmacao } from "@/components/ModalConfirmacao";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getConversaDenunciada, getDenunciasParaModeracao, moderarConteudo, resolverDenuncia } from "@/lib/queries";
import type { AlvoDenuncia, ConversaDenunciada, DenunciaModeracao, DenunciaStatus, MotivoDenuncia } from "@/types";
import { Flag, MessageCircle, MessageSquare, Package } from "lucide-react";

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

// Três filas: anúncios e perfis, comentários (migração 25) e mensagens do chat (migração 26)
type Grupo = "posts" | "comentarios" | "mensagens";
const GRUPOS: { valor: Grupo; rotulo: string; Icone: typeof Flag }[] = [
  { valor: "posts", rotulo: "Anúncios e perfis", Icone: Package },
  { valor: "comentarios", rotulo: "Comentários", Icone: MessageSquare },
  { valor: "mensagens", rotulo: "Mensagens", Icone: MessageCircle },
];
const grupoDe = (alvo: AlvoDenuncia): Grupo =>
  alvo === "anuncio" || alvo === "perfil" ? "posts" : alvo === "mensagem" ? "mensagens" : "comentarios";

const TIPO_ALVO: Record<AlvoDenuncia, string> = {
  anuncio: "Anúncio",
  perfil: "Perfil",
  pergunta: "Pergunta",
  resposta: "Resposta",
  avaliacao: "Avaliação",
  mensagem: "Mensagem do chat",
};

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `min-h-[44px] px-3 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition disabled:opacity-50 ${FOCO}`;

export default function AdminDenunciasPage({ denunciasIniciais }: Props) {
  const [denuncias, setDenuncias] = useState<DenunciaModeracao[]>(denunciasIniciais);
  const [grupo, setGrupo] = useState<Grupo>("posts");
  const [filtro, setFiltro] = useState<DenunciaStatus>("aberta");
  const [processando, setProcessando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { confirmar, modalConfirmacao } = useConfirmacao();
  // Cópias de conversas abertas pelo admin (cada abertura fica registrada no banco)
  const [conversas, setConversas] = useState<Record<number, ConversaDenunciada>>({});

  const doGrupo = useMemo(() => denuncias.filter((d) => grupoDe(d.alvo_tipo) === grupo), [denuncias, grupo]);
  const filtradas = useMemo(() => doGrupo.filter((d) => d.status === filtro), [doGrupo, filtro]);

  // Tira o comentário do site (fica recusado) e resolve a denúncia
  async function handleRemoverComentario(denuncia: DenunciaModeracao) {
    const id = denuncia.alvo_tipo === "avaliacao" ? denuncia.avaliacao_id : denuncia.pergunta_id;
    if (!id || denuncia.alvo_tipo === "anuncio" || denuncia.alvo_tipo === "perfil" || denuncia.alvo_tipo === "mensagem") return;
    const ok = await confirmar({
      titulo: "Remover comentário?",
      mensagem: "O comentário sai do site e a denúncia fica resolvida. O autor não é avisado.",
      rotuloConfirmar: "Remover comentário",
      perigo: true,
    });
    if (!ok) return;
    setProcessando(denuncia.id);
    setErro(null);
    try {
      await moderarConteudo(denuncia.alvo_tipo, id, "recusado");
      await resolverDenuncia(denuncia.id, "resolvida");
      setDenuncias((prev) =>
        prev.map((d) =>
          d.alvo_tipo === denuncia.alvo_tipo && (d.pergunta_id ?? d.avaliacao_id) === id
            ? { ...d, comentario_no_ar: false, status: d.id === denuncia.id ? "resolvida" : d.status }
            : d
        )
      );
    } catch (err) {
      setErro((err as { message?: string })?.message || "Erro ao remover o comentário.");
    } finally {
      setProcessando(null);
    }
  }

  async function handleVerConversa(denuncia: DenunciaModeracao) {
    if (conversas[denuncia.id]) {
      setConversas((prev) => {
        const resto = { ...prev };
        delete resto[denuncia.id];
        return resto;
      });
      return;
    }
    setProcessando(denuncia.id);
    setErro(null);
    try {
      const conversa = await getConversaDenunciada(denuncia.id);
      setConversas((prev) => ({ ...prev, [denuncia.id]: conversa }));
    } catch (err) {
      setErro((err as { message?: string })?.message || "Erro ao abrir a conversa.");
    } finally {
      setProcessando(null);
    }
  }

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
                href="/admin/comentarios"
                className="text-xs font-semibold text-tinta-suave hover:text-tinta px-3 py-1.5 rounded-controle border border-borda hover:bg-pagina transition"
              >
                Comentários
              </Link>
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
            {grupo === "posts"
              ? "Para tirar algo do ar, reprove a loja em Lojas ou bloqueie o aluno em Matrículas. Depois marque a denúncia como resolvida."
              : grupo === "comentarios"
                ? "Remover comentário tira a pergunta, resposta ou avaliação do site e resolve a denúncia. O texto denunciado fica guardado aqui."
                : "A equipe só lê conversas denunciadas, pela cópia feita no momento da denúncia, e cada leitura fica registrada. Para agir, bloqueie o aluno em Matrículas. A cópia é apagada 30 dias depois de a denúncia ser resolvida ou descartada."}
          </p>

          <div role="tablist" aria-label="Tipo de denúncia" className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {GRUPOS.map(({ valor, rotulo, Icone }) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={grupo === valor}
                onClick={() => setGrupo(valor)}
                className={`px-4 min-h-[44px] rounded-controle text-sm font-semibold border shrink-0 inline-flex items-center gap-1.5 transition ${FOCO} ${
                  grupo === valor
                    ? "bg-petroleo-50 border-petroleo text-petroleo"
                    : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                }`}
              >
                <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
                {rotulo} ({denuncias.filter((d) => grupoDe(d.alvo_tipo) === valor && d.status === "aberta").length} abertas)
              </button>
            ))}
          </div>

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
                {s.rotulo} ({doGrupo.filter((d) => d.status === s.valor).length})
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
                    <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-petroleo-50 text-petroleo">
                      {TIPO_ALVO[d.alvo_tipo]}
                    </span>
                    <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-perigo-50 text-perigo">
                      {MOTIVOS[d.motivo]}
                    </span>
                    {d.comentario_no_ar === false && (
                      <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-pagina text-tinta-suave">
                        Fora do ar
                      </span>
                    )}
                    <span className="text-xs text-tinta-suave">
                      {new Date(d.criado_em).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-tinta font-semibold">{d.alvo_descricao}</p>
                  {d.conteudo && (
                    <blockquote className="border-l-4 border-borda-controle bg-pagina rounded-controle px-3 py-2 text-sm text-tinta whitespace-pre-line">
                      {d.conteudo}
                    </blockquote>
                  )}
                  {d.detalhes && <p className="text-sm text-tinta-suave whitespace-pre-line">{d.detalhes}</p>}
                  {conversas[d.id] && <TranscricaoConversa conversa={conversas[d.id]} />}
                  <p className="text-xs text-tinta-suave">
                    Enviada por {d.denunciante_nome ?? "conta excluída"}
                    {d.denunciante_email ? ` · ${d.denunciante_email}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-borda">
                    {d.link && (
                      <Link href={d.link} target="_blank" className={`${BOTAO_SECUNDARIO} inline-flex items-center`}>
                        {d.produto_id ? "Ver anúncio" : "Ver perfil"}
                      </Link>
                    )}
                    {d.alvo_tipo === "mensagem" && d.tem_conversa && (
                      <button type="button" disabled={processando === d.id} onClick={() => handleVerConversa(d)} className={BOTAO_SECUNDARIO}>
                        {conversas[d.id] ? "Fechar conversa" : "Ver conversa"}
                      </button>
                    )}
                    {d.comentario_no_ar && (
                      <button type="button" disabled={processando === d.id} onClick={() => handleRemoverComentario(d)} className={BOTAO_SECUNDARIO}>
                        Remover comentário
                      </button>
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
      {modalConfirmacao}
    </>
  );
}

// Cópia da conversa: participantes (nome e e-mail, só para a equipe) e mensagens, com a denunciada em destaque
function TranscricaoConversa({ conversa }: { conversa: ConversaDenunciada }) {
  const nomes = new Map(conversa.participantes.map((p) => [p.usuario_id, p]));
  return (
    <div className="border border-borda rounded-card bg-pagina p-3 flex flex-col gap-3">
      <ul className="text-xs text-tinta-suave flex flex-col gap-0.5">
        {conversa.participantes.map((p) => (
          <li key={p.usuario_id}>
            <span className="font-semibold text-tinta">{p.papel === "comprador" ? "Comprador" : "Vendedor"}:</span>{" "}
            {p.nome} ({p.nome_publico ?? "sem perfil"}) · {p.email}
          </li>
        ))}
        <li>Cópia feita em {new Date(conversa.copiada_em).toLocaleString("pt-BR")}</li>
      </ul>
      <ol className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
        {conversa.mensagens.map((m) => {
          const autor = nomes.get(m.autor_id);
          const denunciada = m.id === conversa.mensagem_denunciada_id;
          return (
            <li
              key={m.id}
              className={`rounded-controle px-3 py-2 text-sm ${denunciada ? "bg-perigo-50 border border-perigo" : "bg-superficie border border-borda"}`}
            >
              <p className="text-xs text-tinta-suave">
                <span className="font-semibold text-tinta">{autor?.nome_publico ?? autor?.nome ?? "Conta excluída"}</span>
                {" · "}
                {new Date(m.criado_em).toLocaleString("pt-BR")}
                {denunciada && <span className="font-semibold text-perigo"> · mensagem denunciada</span>}
              </p>
              <p className="text-tinta whitespace-pre-wrap break-words mt-0.5">{m.texto}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
