// Moderação de perguntas, respostas e comentários de avaliação pela Vettly (migração 24).
// Só roda no servidor (rotas de src/pages/api): usa VETTLY_API_KEY, VETTLY_POLICY_ID e MODERACAO_SEGREDO.
// Sem resposta clara da Vettly (falha, chave ausente, conteúdo só sinalizado), o texto fica 'pendente'
// e vai para a fila de /admin/comentarios.
import type { SupabaseClient } from "@supabase/supabase-js";

export type DecisaoModeracao = "aprovado" | "recusado" | "pendente";
export type TipoModerado = "pergunta" | "resposta" | "avaliacao";

const URL_VETTLY = "https://api.vettly.dev/v1/check";
const TEMPO_LIMITE_MS = 8000;

// Interpreta a resposta do POST /v1/check: "allow" sem sinalização aprova, "block" recusa,
// qualquer outra coisa (ex.: "flag", formato inesperado) fica para a equipe decidir
export function decisaoVettly(resposta: unknown): { decisao: DecisaoModeracao; id: string | null } {
  if (!resposta || typeof resposta !== "object") return { decisao: "pendente", id: null };
  const r = resposta as { action?: unknown; flagged?: unknown; decisionId?: unknown };
  const id = typeof r.decisionId === "string" ? r.decisionId : null;
  if (r.action === "block") return { decisao: "recusado", id };
  if (r.action === "allow" && r.flagged !== true) return { decisao: "aprovado", id };
  return { decisao: "pendente", id };
}

// Mensagem mostrada ao aluno depois de enviar
export function mensagemModeracao(tipo: TipoModerado, decisao: DecisaoModeracao): string {
  const nome = tipo === "pergunta" ? "Sua pergunta" : tipo === "resposta" ? "Sua resposta" : "Sua avaliação";
  if (decisao === "aprovado") return `${nome} foi publicada.`;
  if (decisao === "recusado") {
    return `${nome} não foi publicada porque parece ir contra as regras do Circular (ofensa, golpe ou conteúdo proibido).`;
  }
  return `${nome} está em análise e aparece para os outros alunos assim que for aprovada.`;
}

export async function moderarTexto(texto: string): Promise<{ decisao: DecisaoModeracao; id: string | null }> {
  const chave = process.env.VETTLY_API_KEY;
  const politica = process.env.VETTLY_POLICY_ID;
  if (!chave || !politica) return { decisao: "pendente", id: null };

  try {
    const resposta = await fetch(URL_VETTLY, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: texto, policyId: politica, contentType: "text", language: "pt" }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) {
      console.error("Vettly respondeu", resposta.status);
      return { decisao: "pendente", id: null };
    }
    return decisaoVettly(await resposta.json());
  } catch (err) {
    console.error("Falha ao chamar a Vettly", err);
    return { decisao: "pendente", id: null };
  }
}

// Modera o texto e grava o resultado no banco (RPC aplicar_moderacao, que exige o segredo do servidor)
export async function registrarModeracao(
  client: SupabaseClient,
  tipo: TipoModerado,
  id: number,
  texto: string
): Promise<DecisaoModeracao> {
  const { decisao, id: decisaoId } = await moderarTexto(texto);
  if (decisao === "pendente") return "pendente";

  const { error } = await client.rpc("aplicar_moderacao", {
    p_segredo: process.env.MODERACAO_SEGREDO ?? null,
    p_tipo: tipo,
    p_id: id,
    p_aprovado: decisao === "aprovado",
    p_moderacao_id: decisaoId,
  });
  if (error) {
    console.error("Falha ao gravar a moderação", error.message);
    return "pendente";
  }
  return decisao;
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
