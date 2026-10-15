// Anúncio some do catálogo se não for renovado neste prazo.
// Espelho da política produtos_select_de_lojas_ativas (migração 16) — mudar os dois juntos.
export const DIAS_VALIDADE_ANUNCIO = 60;

const DIA_MS = 24 * 60 * 60 * 1000;

export function inicioValidade(agora: Date = new Date()): string {
  return new Date(agora.getTime() - DIAS_VALIDADE_ANUNCIO * DIA_MS).toISOString();
}

export function anuncioExpirado(renovadoEm: string, agora: Date = new Date()): boolean {
  return new Date(renovadoEm).getTime() <= agora.getTime() - DIAS_VALIDADE_ANUNCIO * DIA_MS;
}

export type Modalidade = "venda" | "troca" | "ambos";

export function modalidadeDoAnuncio(preco: number, aceitaTroca: boolean): Modalidade {
  if (!aceitaTroca) return "venda";
  return preco > 0 ? "ambos" : "troca";
}

// O item desejado na troca fica no fim da descrição
const MARCADOR_TROCA = "\n\n[Aceita Troca]: Busca em troca por: ";

export function montarDescricao(descricao: string, itemTroca: string): string {
  const base = descricao.trim();
  const troca = itemTroca.trim();
  if (!troca) return base;
  return `${base}${MARCADOR_TROCA}${troca}`;
}

export function separarDescricao(descricaoCompleta: string | null): { descricao: string; itemTroca: string } {
  const texto = descricaoCompleta ?? "";
  const i = texto.lastIndexOf(MARCADOR_TROCA);
  if (i === -1) return { descricao: texto, itemTroca: "" };
  return { descricao: texto.slice(0, i), itemTroca: texto.slice(i + MARCADOR_TROCA.length) };
}
