// Moderação de perguntas, respostas e comentários de avaliação pela Vettly (migração 24).
// Só roda no servidor (rotas de src/pages/api): usa VETTLY_API_KEY, VETTLY_POLICY_ID e MODERACAO_SEGREDO.
// O texto é moderado ANTES de gravar: recusado não entra no banco; aprovado é gravado e marcado como
// publicado; sem resposta clara (falha, chave ausente, conteúdo só sinalizado) é gravado 'pendente' e
// vai para a fila de /admin/comentarios.
import type { SupabaseClient } from "@supabase/supabase-js";

export type DecisaoModeracao = "aprovado" | "recusado" | "pendente";
export type TipoModerado = "pergunta" | "resposta" | "avaliacao";

export interface ResultadoVettly {
  decisao: DecisaoModeracao;
  id: string | null;
  motivos: string[]; // categorias que dispararam (ex.: "harassment", "scam")
}

const URL_VETTLY = "https://api.vettly.dev/v1/check";
const TEMPO_LIMITE_MS = 8000;

// Categorias da política da Vettly → motivo mostrado ao aluno
const MOTIVOS: Record<string, string> = {
  harassment: "ofensa ou assédio",
  hate_speech: "discurso de ódio",
  hate: "discurso de ódio",
  sexual: "conteúdo sexual",
  violence: "violência",
  self_harm: "conteúdo sobre automutilação",
  spam: "spam ou propaganda",
  profanity: "palavrões",
  scam: "indício de golpe (como pedido de pagamento adiantado ou dados de cartão)",
  illegal: "atividade ilegal (como drogas, remédio controlado ou falsificação)",
};

// Interpreta a resposta do POST /v1/check: "allow" sem sinalização aprova, "block" recusa,
// qualquer outra coisa (ex.: "flag", formato inesperado) fica para a equipe decidir
export function decisaoVettly(resposta: unknown): ResultadoVettly {
  if (!resposta || typeof resposta !== "object") return { decisao: "pendente", id: null, motivos: [] };
  const r = resposta as { action?: unknown; flagged?: unknown; decisionId?: unknown; categories?: unknown };
  const id = typeof r.decisionId === "string" ? r.decisionId : null;
  const motivos = Array.isArray(r.categories)
    ? r.categories
        .filter((c) => c && typeof c === "object" && (c as { triggered?: unknown }).triggered === true)
        .map((c) => String((c as { category?: unknown }).category ?? ""))
        .filter((c, i, lista) => c && lista.indexOf(c) === i)
    : [];
  if (r.action === "block") return { decisao: "recusado", id, motivos };
  if (r.action === "allow" && r.flagged !== true) return { decisao: "aprovado", id, motivos: [] };
  return { decisao: "pendente", id, motivos };
}

// "ofensa ou assédio e discurso de ódio"; sem categoria conhecida, um motivo genérico
export function motivosEmTexto(motivos: string[]): string {
  const textos = motivos.map((m) => MOTIVOS[m]).filter((t, i, lista): t is string => Boolean(t) && lista.indexOf(t) === i);
  if (textos.length === 0) return "conteúdo contra as regras do Circular";
  if (textos.length === 1) return textos[0];
  return `${textos.slice(0, -1).join(", ")} e ${textos[textos.length - 1]}`;
}

// Mensagem mostrada ao aluno depois de enviar, com o motivo da decisão
export function mensagemModeracao(tipo: TipoModerado, decisao: DecisaoModeracao, motivos: string[] = []): string {
  const nome = tipo === "pergunta" ? "Sua pergunta" : tipo === "resposta" ? "Sua resposta" : "Seu comentário";
  if (decisao === "aprovado") {
    return `${nome} passou na moderação automática: não encontramos ofensa, golpe nem conteúdo proibido. Já está publicad${tipo === "avaliacao" ? "o" : "a"}.`;
  }
  if (decisao === "recusado") {
    return `${nome} não foi publicad${tipo === "avaliacao" ? "o" : "a"} porque a moderação automática identificou ${motivosEmTexto(motivos)}. Nada foi salvo: revise o texto e envie de novo.`;
  }
  const porque = motivos.length > 0 ? ` porque pode conter ${motivosEmTexto(motivos)}` : "";
  return `${nome} foi para a revisão da equipe${porque} e aparece para os outros alunos assim que for aprovad${tipo === "avaliacao" ? "o" : "a"}.`;
}

export async function moderarTexto(texto: string): Promise<ResultadoVettly> {
  const chave = process.env.VETTLY_API_KEY;
  const politica = process.env.VETTLY_POLICY_ID;
  if (!chave || !politica) return { decisao: "pendente", id: null, motivos: [] };

  try {
    const resposta = await fetch(URL_VETTLY, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: texto, policyId: politica, contentType: "text", language: "pt" }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) {
      console.error("Vettly respondeu", resposta.status);
      return { decisao: "pendente", id: null, motivos: [] };
    }
    return decisaoVettly(await resposta.json());
  } catch (err) {
    console.error("Falha ao chamar a Vettly", err);
    return { decisao: "pendente", id: null, motivos: [] };
  }
}

// Depois de gravado como 'pendente', marca como publicado o que a Vettly aprovou
// (RPC aplicar_moderacao, que exige o segredo do servidor). Se falhar, continua pendente.
export async function publicarAprovado(
  client: SupabaseClient,
  tipo: TipoModerado,
  id: number,
  resultado: ResultadoVettly
): Promise<DecisaoModeracao> {
  if (resultado.decisao !== "aprovado") return "pendente";
  const { error } = await client.rpc("aplicar_moderacao", {
    p_segredo: process.env.MODERACAO_SEGREDO ?? null,
    p_tipo: tipo,
    p_id: id,
    p_aprovado: true,
    p_moderacao_id: resultado.id,
  });
  if (error) {
    console.error("Falha ao gravar a moderação", error.message);
    return "pendente";
  }
  return "aprovado";
}

// Erros das RPCs (SQLSTATE) viram status HTTP com a mensagem amigável do banco
export function statusDoErro(codigo: string | undefined): number {
  if (codigo === "42501") return 401;
  if (codigo === "PT403") return 403;
  if (codigo === "PT404") return 404;
  if (codigo === "PT429") return 429;
  if (codigo === "23514" || codigo === "22023") return 400;
  return 500;
}

// Texto livre enviado pelo aluno: string com 2 a `maximo` caracteres depois do trim
export function textoValido(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  return texto.length >= 2 && texto.length <= maximo ? texto : null;
}
