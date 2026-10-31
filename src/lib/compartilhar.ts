// Link do QR code da loja: /perfil/{slug}?c={código}&utm_source=qr
// O código (lojas.codigo_compartilhamento, migração 20) deixa o login mostrar o nome da loja ao
// visitante sem permitir listar alunos pelos slugs. utm_* faz o Google Analytics contar as visitas do QR.

export const PARAM_CODIGO = "c";

const SLUG = /^[A-Za-z0-9_-]{1,80}$/;
const CODIGO = /^[0-9a-f]{12}$/;

export function urlCompartilhamentoLoja(origem: string, slug: string, codigo: string): string {
  const params = new URLSearchParams({ [PARAM_CODIGO]: codigo, utm_source: "qr", utm_medium: "qrcode" });
  return `${origem.replace(/\/+$/, "")}/perfil/${encodeURIComponent(slug)}?${params.toString()}`;
}

// Extrai slug e código de um caminho interno (o "next" do login). Qualquer outra coisa: null.
export function lojaDoDestino(destino: unknown): { slug: string; codigo: string } | null {
  if (typeof destino !== "string" || !/^\/(?![/\\])/.test(destino)) return null;
  let url: URL;
  try {
    url = new URL(destino, "https://circular.local");
  } catch {
    return null;
  }
  const partes = url.pathname.match(/^\/perfil\/([^/]+)$/);
  if (!partes) return null;
  const slug = decodeURIComponent(partes[1]);
  const codigo = url.searchParams.get(PARAM_CODIGO) ?? "";
  return SLUG.test(slug) && CODIGO.test(codigo) ? { slug, codigo } : null;
}
