// Moderação de contas (migração 27): situação da conta e textos usados em /admin/contas e no painel do aluno.
// Suspensão = status 'bloqueado' com bloqueado_ate; bloqueio = 'bloqueado' sem prazo.

export type Situacao = "ativa" | "suspensa" | "bloqueada";

// Opções de prazo da suspensão na tela do admin (o banco aceita de 1 a 90 dias)
export const DIAS_SUSPENSAO = [1, 3, 7, 15, 30] as const;

// Motivo da suspensão/bloqueio: o aluno vê no painel. Espelho do CHECK e da RPC admin_moderar_conta
export const MOTIVO_MODERACAO = { minimo: 5, maximo: 300 } as const;

export function situacaoDaConta(status: string, bloqueadoAte: string | null): Situacao {
  if (status !== "bloqueado") return "ativa";
  return bloqueadoAte ? "suspensa" : "bloqueada";
}

// "12/11/2026 às 14:30" no fuso do campus (Bahia)
export function formatarPrazo(iso: string): string {
  const data = new Date(iso);
  if (isNaN(data.getTime())) return "";
  const dia = data.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" });
  const hora = data.toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

export function motivoValido(texto: string): boolean {
  const t = texto.trim();
  return t.length >= MOTIVO_MODERACAO.minimo && t.length <= MOTIVO_MODERACAO.maximo;
}

const ACOES: Record<string, string> = {
  suspender: "Suspensa",
  bloquear: "Bloqueada",
  reativar: "Reativada",
  fim_suspensao: "Fim da suspensão",
};

export function rotuloAcaoConta(acao: string): string {
  return ACOES[acao] ?? acao;
}
