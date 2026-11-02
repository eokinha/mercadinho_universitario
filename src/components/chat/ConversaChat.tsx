import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Ban, ChevronLeft, Ellipsis, Flag, RotateCw, Send, ShieldCheck, Trash2, UserX } from "lucide-react";
import BotaoDenunciar from "@/components/BotaoDenunciar";
import { caminhoAnuncio } from "@/lib/compartilhar";
import { horarioMensagem, mesclarMensagens, rotuloDia, ultimoIdConfirmado, type MensagemTela } from "@/lib/chat";
import { assinarConversa } from "@/lib/chat-realtime";
import {
  bloquearConversa,
  enviarMensagem,
  getMensagensDaConversa,
  marcarConversaLida,
  ocultarConversa,
} from "@/lib/queries";
import { LIMITES_TEXTO } from "@/lib/validacoes";
import type { ConversaLeitura } from "@/types";

interface Props {
  inicial: ConversaLeitura;
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle text-sm font-semibold transition ${FOCO}`;

// Identifica a mensagem antes de ela chegar ao banco (reenvio não duplica; HTTPS exige crypto.randomUUID)
function novoClienteId(): string {
  return crypto.randomUUID();
}

// Id negativo da mensagem provisória (some quando o banco confirma)
let proximoIdProvisorio = -1;

function mensagemDeErro(err: unknown): string {
  const { code, message } = (err as { code?: string; message?: string }) ?? {};
  if (code?.startsWith("PT") || code === "22023") return message || "Não foi possível enviar.";
  return "Não foi possível enviar. Confira a conexão e tente de novo.";
}

// Conversa em tempo real: as mensagens chegam pelo canal privado conversa:{id} (src/lib/chat-realtime.ts);
// o envio é sempre pela RPC, que grava e publica. Na conexão (e em cada reconexão) busca o que faltou.
export default function ConversaChat({ inicial }: Props) {
  const router = useRouter();
  const meuId = inicial.meu_id;
  const conversaId = inicial.id;

  const [mensagens, setMensagens] = useState<MensagemTela[]>(inicial.mensagens);
  const [temMais, setTemMais] = useState(inicial.tem_mais);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [bloqueio, setBloqueio] = useState<{ bloqueada: boolean; porMim: boolean }>({
    bloqueada: inicial.bloqueada,
    porMim: inicial.bloqueada_por_mim,
  });
  const [lidaAte, setLidaAte] = useState<number>(() =>
    inicial.mensagens.reduce((maior, m) => (m.autor_id === meuId && m.lida_em && m.id > maior ? m.id : maior), 0)
  );
  const [outroDigitando, setOutroDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [denunciando, setDenunciando] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const mensagensRef = useRef(mensagens);
  const listaRef = useRef<HTMLDivElement>(null);
  const grudadoNoFim = useRef(true);
  const canalRef = useRef<ReturnType<typeof assinarConversa> | null>(null);
  const timerDigitando = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerLida = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Marca como lidas (com um pequeno atraso para agrupar mensagens seguidas), só com a aba visível
  const agendarLeitura = useCallback(() => {
    if (timerLida.current) clearTimeout(timerLida.current);
    timerLida.current = setTimeout(() => {
      if (document.visibilityState === "visible") marcarConversaLida(conversaId).catch(() => undefined);
    }, 400);
  }, [conversaId]);

  useEffect(() => {
    agendarLeitura();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") agendarLeitura();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [agendarLeitura]);

  useEffect(() => {
    const canal = assinarConversa(conversaId, meuId, {
      onMensagem: (m) => {
        setMensagens((atuais) => mesclarMensagens(atuais, [m]));
        if (m.autor_id !== meuId) {
          setOutroDigitando(false);
          agendarLeitura();
        }
      },
      onLida: ({ leitor_id, ate_id }) => {
        if (leitor_id !== meuId) setLidaAte((atual) => Math.max(atual, ate_id));
      },
      onBloqueio: (bloqueadaPor) => {
        setBloqueio({ bloqueada: bloqueadaPor !== null, porMim: bloqueadaPor === meuId });
      },
      onDigitando: () => {
        setOutroDigitando(true);
        if (timerDigitando.current) clearTimeout(timerDigitando.current);
        timerDigitando.current = setTimeout(() => setOutroDigitando(false), 4000);
      },
      onSincronizar: () => {
        const depois = ultimoIdConfirmado(mensagensRef.current) ?? 0;
        getMensagensDaConversa(conversaId, { depois })
          .then((novas) => {
            if (novas.length === 0) return;
            setMensagens((atuais) => mesclarMensagens(atuais, novas));
            if (novas.some((m) => m.autor_id !== meuId)) agendarLeitura();
          })
          .catch(() => undefined);
      },
    });
    canalRef.current = canal;
    return () => {
      canal.sair();
      canalRef.current = null;
      if (timerDigitando.current) clearTimeout(timerDigitando.current);
      if (timerLida.current) clearTimeout(timerLida.current);
    };
  }, [conversaId, meuId, agendarLeitura]);

  useEffect(() => {
    mensagensRef.current = mensagens;
  }, [mensagens]);

  // Rola para o fim quando chega mensagem, se o aluno já estava no fim (não atrapalha quem lê as antigas)
  useEffect(() => {
    const lista = listaRef.current;
    if (lista && grudadoNoFim.current) lista.scrollTop = lista.scrollHeight;
  }, [mensagens, outroDigitando]);

  function aoRolar() {
    const lista = listaRef.current;
    if (!lista) return;
    grudadoNoFim.current = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 80;
  }

  async function carregarAntigas() {
    const primeira = mensagens.find((m) => !m.pendente && !m.falhou);
    if (!primeira) return;
    setCarregandoAntigas(true);
    const lista = listaRef.current;
    const alturaAntes = lista?.scrollHeight ?? 0;
    try {
      const antigas = await getMensagensDaConversa(conversaId, { antes: primeira.id });
      setTemMais(antigas.length === 50);
      grudadoNoFim.current = false;
      setMensagens((atuais) => mesclarMensagens(atuais, antigas));
      // Mantém na tela a mensagem que o aluno estava vendo
      requestAnimationFrame(() => {
        if (lista) lista.scrollTop += lista.scrollHeight - alturaAntes;
      });
    } catch {
      setErroAcao("Não foi possível carregar as mensagens anteriores.");
    } finally {
      setCarregandoAntigas(false);
    }
  }

  async function enviar(conteudo: string, clienteId: string) {
    const provisoria: MensagemTela = {
      id: proximoIdProvisorio--,
      conversa_id: conversaId,
      autor_id: meuId,
      texto: conteudo,
      cliente_id: clienteId,
      criado_em: new Date().toISOString(),
      lida_em: null,
      pendente: true,
    };
    grudadoNoFim.current = true;
    setMensagens((atuais) => mesclarMensagens(atuais.filter((m) => m.cliente_id !== clienteId), [provisoria]));
    try {
      const confirmada = await enviarMensagem(conversaId, conteudo, clienteId);
      setMensagens((atuais) => mesclarMensagens(atuais, [{ ...confirmada, pendente: false, falhou: false }]));
    } catch (err) {
      setErroEnvio(mensagemDeErro(err));
      setMensagens((atuais) =>
        atuais.map((m) => (m.cliente_id === clienteId ? { ...m, pendente: false, falhou: true } : m))
      );
    }
  }

  function handleEnviar(e?: FormEvent) {
    e?.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || bloqueio.bloqueada) return;
    setErroEnvio(null);
    setTexto("");
    enviar(conteudo, novoClienteId());
  }

  // Enter envia; Shift+Enter quebra a linha
  function handleTecla(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleEnviar();
    }
  }

  async function handleBloquear(bloquear: boolean) {
    setMenuAberto(false);
    setErroAcao(null);
    try {
      await bloquearConversa(conversaId, bloquear);
      setBloqueio({ bloqueada: bloquear, porMim: bloquear });
    } catch (err) {
      setErroAcao((err as { message?: string })?.message || "Não foi possível alterar o bloqueio.");
    }
  }

  async function handleApagar() {
    setErroAcao(null);
    try {
      await ocultarConversa(conversaId);
      router.push("/mensagens");
    } catch {
      setErroAcao("Não foi possível apagar a conversa. Tente de novo.");
    }
  }

  const { outro, produto } = inicial;
  const linkProduto = produto.id ? caminhoAnuncio(produto.id, produto.nome) : null;
  const ultimaMinha = [...mensagens].reverse().find((m) => m.autor_id === meuId && !m.pendente && !m.falhou);
  const podeEscrever = !bloqueio.bloqueada && outro.ativo;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cabeçalho: quem é, sobre qual anúncio e o menu da conversa */}
      <div className="border-b border-borda px-3 sm:px-4 py-2.5 flex items-center gap-3">
        <Link
          href="/mensagens"
          aria-label="Voltar para as conversas"
          className={`lg:hidden w-11 h-11 -ml-1 inline-flex items-center justify-center rounded-controle text-petroleo ${FOCO}`}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <span className="w-10 h-10 rounded-pill bg-petroleo-50 shrink-0 overflow-hidden flex items-center justify-center">
          {outro.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={outro.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-petroleo" aria-hidden="true">
              {outro.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          {outro.slug ? (
            <Link href={`/perfil/${outro.slug}`} className={`block font-semibold text-tinta truncate hover:underline rounded-controle ${FOCO}`}>
              {outro.nome}
            </Link>
          ) : (
            <p className="font-semibold text-tinta truncate">{outro.nome}</p>
          )}
          <p className="text-xs text-tinta-suave truncate" aria-live="polite">
            {outroDigitando ? (
              <span className="text-petroleo font-semibold">digitando…</span>
            ) : linkProduto ? (
              <Link href={linkProduto} className="hover:underline">
                {produto.nome}
              </Link>
            ) : (
              <>{produto.nome} (anúncio removido)</>
            )}
          </p>
        </div>
        {produto.imagem_url && linkProduto && (
          <Link href={linkProduto} className={`hidden sm:block w-10 h-10 rounded-controle overflow-hidden shrink-0 ${FOCO}`} aria-label={`Ver anúncio: ${produto.nome}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
          </Link>
        )}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setMenuAberto((v) => !v);
              setConfirmandoApagar(false);
            }}
            aria-label="Opções da conversa"
            aria-expanded={menuAberto}
            className={`w-11 h-11 inline-flex items-center justify-center rounded-controle text-tinta-suave hover:text-petroleo ${FOCO}`}
          >
            <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {menuAberto && (
            <div className="absolute right-0 mt-1 w-60 bg-superficie border border-borda rounded-card shadow-flutuante py-2 z-20">
              {(!bloqueio.bloqueada || bloqueio.porMim) && (
                <button
                  type="button"
                  onClick={() => handleBloquear(!bloqueio.porMim)}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-tinta hover:bg-pagina"
                >
                  <Ban size={18} strokeWidth={1.75} className="text-tinta-suave" aria-hidden="true" />
                  {bloqueio.porMim ? "Desbloquear conversa" : "Bloquear conversa"}
                </button>
              )}
              {confirmandoApagar ? (
                <div className="px-4 py-2.5 text-sm">
                  <p className="text-tinta">Apagar da sua lista? A outra pessoa continua com a conversa.</p>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={handleApagar} className={`min-h-[40px] px-3 rounded-controle border border-perigo text-perigo font-semibold ${FOCO}`}>
                      Apagar
                    </button>
                    <button type="button" onClick={() => setConfirmandoApagar(false)} className={`min-h-[40px] px-3 ${BOTAO_SECUNDARIO}`}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoApagar(true)}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-perigo hover:bg-perigo-50"
                >
                  <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  Apagar conversa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div ref={listaRef} onScroll={aoRolar} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 bg-pagina">
        <div className="max-w-md mx-auto mb-4 bg-petroleo-50 text-petroleo rounded-card px-4 py-3 flex items-start gap-2.5 text-xs">
          <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Seu telefone não aparece aqui. Não envie senhas nem dados bancários, combine o encontro em local movimentado do
            campus e denuncie mensagens abusivas: a equipe recebe uma cópia da conversa para analisar.
          </p>
        </div>

        {temMais && (
          <div className="text-center mb-4">
            <button type="button" onClick={carregarAntigas} disabled={carregandoAntigas} className={`min-h-[40px] px-4 ${BOTAO_SECUNDARIO} disabled:opacity-60`}>
              {carregandoAntigas ? "Carregando…" : "Ver mensagens anteriores"}
            </button>
          </div>
        )}

        {mensagens.length === 0 && (
          <p className="text-center text-sm text-tinta-suave py-8">
            Mande a primeira mensagem para {outro.nome}. Pergunte o que quiser sobre &ldquo;{produto.nome}&rdquo;.
          </p>
        )}

        <ol className="flex flex-col gap-1.5" aria-label="Mensagens">
          {mensagens.map((m, i) => {
            const minha = m.autor_id === meuId;
            const anterior = mensagens[i - 1];
            const novoDia = !anterior || new Date(anterior.criado_em).toDateString() !== new Date(m.criado_em).toDateString();
            const ehUltimaMinha = ultimaMinha?.cliente_id === m.cliente_id;
            return (
              <Fragment key={m.cliente_id}>
                {novoDia && (
                  <li className="text-center my-2" aria-hidden="true">
                    <span className="text-xs font-semibold text-tinta-suave bg-superficie border border-borda rounded-pill px-3 py-1">
                      {rotuloDia(m.criado_em)}
                    </span>
                  </li>
                )}
                <li className={`group flex flex-col ${minha ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-card px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                      minha ? "bg-petroleo text-white" : "bg-superficie border border-borda text-tinta"
                    } ${m.pendente ? "opacity-70" : ""}`}
                  >
                    <span className="sr-only">{minha ? "Você: " : `${outro.nome}: `}</span>
                    {m.texto}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 px-1 text-xs text-tinta-sutil">
                    <span>{horarioMensagem(m.criado_em)}</span>
                    {minha && m.pendente && <span>Enviando…</span>}
                    {minha && m.falhou && (
                      <button
                        type="button"
                        onClick={() => {
                          setErroEnvio(null);
                          enviar(m.texto, m.cliente_id);
                        }}
                        className={`inline-flex items-center gap-1 text-perigo font-semibold hover:underline rounded-controle ${FOCO}`}
                      >
                        <RotateCw size={12} strokeWidth={1.75} aria-hidden="true" />
                        Não enviada. Tentar de novo
                      </button>
                    )}
                    {ehUltimaMinha && <span>{m.id <= lidaAte ? "Lida" : "Enviada"}</span>}
                    {!minha && denunciando !== m.id && (
                      <button
                        type="button"
                        onClick={() => setDenunciando(m.id)}
                        aria-label="Denunciar esta mensagem"
                        className={`inline-flex items-center gap-1 text-tinta-sutil hover:text-perigo opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 rounded-controle ${FOCO}`}
                      >
                        <Flag size={12} strokeWidth={1.75} aria-hidden="true" />
                        Denunciar
                      </button>
                    )}
                  </div>
                  {denunciando === m.id && (
                    <div className="w-full max-w-md mt-1">
                      <BotaoDenunciar mensagemId={m.id} onFechar={() => setDenunciando(null)} />
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      {/* Envio */}
      <div className="border-t border-borda bg-superficie px-3 sm:px-4 py-3">
        {erroAcao && (
          <p role="alert" className="text-perigo text-sm mb-2">
            {erroAcao}
          </p>
        )}
        {!outro.ativo ? (
          <p className="text-sm text-tinta-suave flex items-center gap-2">
            <UserX size={16} strokeWidth={1.75} aria-hidden="true" />
            Este aluno não está mais disponível no Circular.
          </p>
        ) : bloqueio.bloqueada ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-tinta-suave flex items-center gap-2">
              <Ban size={16} strokeWidth={1.75} aria-hidden="true" />
              {bloqueio.porMim
                ? "Você bloqueou esta conversa. Ninguém pode enviar mensagens."
                : "Esta conversa foi bloqueada. Não é possível enviar mensagens."}
            </p>
            {bloqueio.porMim && (
              <button type="button" onClick={() => handleBloquear(false)} className={`min-h-[40px] px-3 ${BOTAO_SECUNDARIO}`}>
                Desbloquear
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="flex items-end gap-2">
            <label htmlFor="campo-mensagem" className="sr-only">
              Mensagem para {outro.nome}
            </label>
            <textarea
              id="campo-mensagem"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (e.target.value.trim()) canalRef.current?.avisarDigitando();
              }}
              onKeyDown={handleTecla}
              maxLength={LIMITES_TEXTO.mensagemChat}
              rows={1}
              placeholder="Escreva uma mensagem"
              className={`flex-1 resize-none max-h-32 min-h-[44px] px-4 py-2.5 rounded-controle border border-borda-controle focus:border-petroleo bg-superficie text-sm text-tinta placeholder:text-tinta-sutil field-sizing-content ${FOCO}`}
            />
            <button
              type="submit"
              disabled={!texto.trim() || !podeEscrever}
              aria-label="Enviar mensagem"
              className={`w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-controle bg-acao hover:bg-acao-hover text-white transition disabled:opacity-50 ${FOCO}`}
            >
              <Send size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </form>
        )}
        {erroEnvio && (
          <p role="alert" className="text-perigo text-sm mt-2">
            {erroEnvio}
          </p>
        )}
      </div>
    </div>
  );
}
