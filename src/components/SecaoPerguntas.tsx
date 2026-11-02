import { useState } from "react";
import { MessageCircleQuestion, Trash2 } from "lucide-react";
import BotaoDenunciar from "@/components/BotaoDenunciar";
import { useConfirmacao } from "@/components/ModalConfirmacao";
import { enviarPergunta, enviarResposta, excluirMeuComentario } from "@/lib/queries";
import { LIMITES_TEXTO } from "@/lib/validacoes";
import type { PerguntaAnuncio, StatusModeracao } from "@/types";

interface Props {
  produtoId: number;
  perguntasIniciais: PerguntaAnuncio[];
  ehDono: boolean;
  podePerguntar: boolean; // aluno do mesmo campus, anúncio disponível e não é o dono
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition disabled:opacity-50 ${FOCO}`;
const BOTAO_APAGAR = `self-start min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-suave hover:text-perigo hover:underline rounded-controle disabled:opacity-50 ${FOCO}`;
// Quantas perguntas aparecem antes do "Ver mais"
const LIMITE_INICIAL = 3;
const CAMPO = `w-full px-3 py-2 rounded-controle border border-borda-controle bg-superficie text-sm text-tinta resize-y ${FOCO}`;

function formatarData(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  return isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function SeloStatus({ status, tipo }: { status: StatusModeracao; tipo: "Pergunta" | "Resposta" }) {
  if (status === "aprovado") return null;
  const recusado = status === "recusado";
  return (
    <span
      className={`rounded-pill text-xs font-semibold px-2.5 py-1 ${recusado ? "bg-perigo-50 text-perigo" : "bg-doacao-50 text-doacao"}`}
    >
      {recusado ? `${tipo} não publicada` : `${tipo} em análise`}
    </span>
  );
}

function FormResposta({ pergunta, onRespondida }: { pergunta: PerguntaAnuncio; onRespondida: (p: PerguntaAnuncio) => void }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await enviarResposta(pergunta.id, texto);
      // Recusada pela moderação: nada foi gravado; o motivo aparece e o texto fica para revisar
      if (r.status === "recusado" || r.id === null) {
        setErro(r.mensagem);
        return;
      }
      onRespondida({ ...pergunta, resposta: texto.trim(), resposta_status: r.status, respondida_em: new Date().toISOString() });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={`self-start ${BOTAO_SECUNDARIO}`}>
        {pergunta.resposta_status === "recusado" ? "Escrever outra resposta" : "Responder"}
      </button>
    );
  }

  return (
    <form onSubmit={handleEnviar} className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-tinta">
        Sua resposta
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITES_TEXTO.resposta}
          rows={2}
          required
          className={`mt-1 font-normal ${CAMPO}`}
        />
      </label>
      {erro && (
        <p role="alert" className="text-perigo text-sm">
          {erro}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setAberto(false)} className={BOTAO_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={enviando || texto.trim().length < 2} className={BOTAO_SECUNDARIO}>
          {enviando ? "Enviando…" : "Enviar resposta"}
        </button>
      </div>
    </form>
  );
}

export default function SecaoPerguntas({ produtoId, perguntasIniciais, ehDono, podePerguntar }: Props) {
  const [perguntas, setPerguntas] = useState<PerguntaAnuncio[]>(perguntasIniciais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const visiveis = mostrarTodas ? perguntas : perguntas.slice(0, LIMITE_INICIAL);
  const ocultas = perguntas.length - visiveis.length;

  async function handlePerguntar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setAviso(null);
    try {
      const r = await enviarPergunta(produtoId, texto);
      // Recusada pela moderação: nada foi gravado; o motivo aparece e o texto fica para revisar
      if (r.status === "recusado" || r.id === null) {
        setErro(r.mensagem);
        return;
      }
      const id = r.id;
      setPerguntas((prev) => [
        {
          id,
          texto: texto.trim(),
          autor_nome: "Você",
          criado_em: new Date().toISOString(),
          minha: true,
          status: r.status,
          resposta: null,
          resposta_status: null,
          respondida_em: null,
        },
        ...prev,
      ]);
      setTexto("");
      setAviso(r.mensagem);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  function atualizarPergunta(atualizada: PerguntaAnuncio) {
    setPerguntas((prev) => prev.map((p) => (p.id === atualizada.id ? atualizada : p)));
  }

  // Autor apaga a própria pergunta (a resposta vai junto); o dono apaga a própria resposta
  const [apagando, setApagando] = useState<number | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const { confirmar, modalConfirmacao } = useConfirmacao();
  async function handleApagar(p: PerguntaAnuncio, tipo: "pergunta" | "resposta") {
    const ok = await confirmar(
      tipo === "pergunta"
        ? {
            titulo: "Apagar sua pergunta?",
            mensagem: "A resposta do vendedor também some.",
            rotuloConfirmar: "Apagar pergunta",
            perigo: true,
          }
        : {
            titulo: "Apagar sua resposta?",
            mensagem: "A pergunta volta a ficar sem resposta.",
            rotuloConfirmar: "Apagar resposta",
            perigo: true,
          }
    );
    if (!ok) return;
    setApagando(p.id);
    setErroLista(null);
    try {
      await excluirMeuComentario(tipo, p.id);
      if (tipo === "pergunta") {
        setPerguntas((prev) => prev.filter((x) => x.id !== p.id));
      } else {
        atualizarPergunta({ ...p, resposta: null, resposta_status: null, respondida_em: null });
      }
    } catch (err) {
      setErroLista((err as { message?: string })?.message || "Não foi possível apagar. Tente de novo.");
    } finally {
      setApagando(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="perguntas-anuncio">
      <h2 id="perguntas-anuncio" className="text-petroleo text-xl font-bold flex items-center gap-2">
        <MessageCircleQuestion size={22} strokeWidth={1.75} aria-hidden="true" />
        Perguntas ao vendedor
      </h2>

      {podePerguntar && (
        <form onSubmit={handlePerguntar} className="mt-4 bg-superficie border border-borda rounded-card p-4 flex flex-col gap-3">
          <label className="text-sm font-semibold text-tinta">
            Pergunte antes de chamar no WhatsApp
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={LIMITES_TEXTO.pergunta}
              rows={2}
              required
              placeholder="Ex.: Ainda está disponível? Aceita troca por uma calculadora?"
              className={`mt-1 font-normal ${CAMPO}`}
            />
          </label>
          <p className="text-xs text-tinta-suave">
            As perguntas passam por moderação automática antes de aparecer. Não escreva telefone nem dados pessoais.
          </p>
          {erro && (
            <p role="alert" className="text-perigo text-sm">
              {erro}
            </p>
          )}
          {aviso && (
            <p role="status" className="text-sm text-petroleo">
              {aviso}
            </p>
          )}
          <button type="submit" disabled={enviando || texto.trim().length < 2} className={`self-end ${BOTAO_SECUNDARIO}`}>
            {enviando ? "Enviando…" : "Perguntar"}
          </button>
        </form>
      )}

      {erroLista && (
        <p role="alert" className="mt-4 text-perigo text-sm">
          {erroLista}
        </p>
      )}

      {perguntas.length === 0 ? (
        <p className="mt-4 text-sm text-tinta-suave">
          {ehDono ? "Quando alguém perguntar sobre este anúncio, você responde aqui." : "Ainda não há perguntas sobre este anúncio."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visiveis.map((p) => (
            <li key={p.id} className="bg-superficie border border-borda rounded-card p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-tinta text-sm font-semibold whitespace-pre-line">{p.texto}</p>
                  {p.minha && <SeloStatus status={p.status} tipo="Pergunta" />}
                </div>
                <p className="text-xs text-tinta-suave">
                  {p.autor_nome ?? "Aluno"} · {formatarData(p.criado_em)}
                </p>
              </div>

              {p.resposta && (
                <div className="bg-pagina rounded-controle p-3 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-petroleo">Resposta do vendedor</span>
                    {ehDono && p.resposta_status && <SeloStatus status={p.resposta_status} tipo="Resposta" />}
                  </div>
                  <p className="text-sm text-tinta whitespace-pre-line">{p.resposta}</p>
                  {ehDono ? (
                    <button type="button" disabled={apagando === p.id} onClick={() => handleApagar(p, "resposta")} className={BOTAO_APAGAR}>
                      <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                      Apagar resposta
                    </button>
                  ) : (
                    p.resposta_status === "aprovado" && (
                      <BotaoDenunciar key={`r-${p.id}`} comentario={{ tipo: "resposta", id: p.id }} />
                    )
                  )}
                </div>
              )}

              {ehDono && p.status === "aprovado" && (!p.resposta_status || p.resposta_status === "recusado") && (
                <FormResposta pergunta={p} onRespondida={atualizarPergunta} />
              )}

              {p.minha ? (
                <button type="button" disabled={apagando === p.id} onClick={() => handleApagar(p, "pergunta")} className={BOTAO_APAGAR}>
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  Apagar pergunta
                </button>
              ) : (
                p.status === "aprovado" && <BotaoDenunciar key={`p-${p.id}`} comentario={{ tipo: "pergunta", id: p.id }} />
              )}
            </li>
          ))}
        </ul>
      )}

      {perguntas.length > LIMITE_INICIAL && (
        <button
          type="button"
          onClick={() => setMostrarTodas(!mostrarTodas)}
          aria-expanded={mostrarTodas}
          className={`mt-3 ${BOTAO_SECUNDARIO}`}
        >
          {mostrarTodas ? "Ver menos" : `Ver mais ${ocultas} ${ocultas === 1 ? "pergunta" : "perguntas"}`}
        </button>
      )}
      {modalConfirmacao}
    </section>
  );
}
