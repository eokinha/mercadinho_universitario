// Mensagens exibidas no topo do /login. A URL só carrega o código (?aviso=contato):
// texto livre na URL permitia forjar avisos ("sua conta foi suspensa, ligue para...").
export const AVISOS_LOGIN = {
  contato: "Entre na sua conta para falar com o vendedor.",
  catalogo: "Entre com o e-mail da sua faculdade para ver os anúncios do seu campus.",
  // Link do QR code: o login troca pelo nome público do perfil quando o código confere (ver login.tsx)
  loja: "Entre com o e-mail da sua faculdade para ver o perfil que compartilharam com você.",
  anuncio: "Entre com o e-mail da sua faculdade para ver o anúncio que compartilharam com você.",
  denuncia: "Entre na sua conta para enviar a denúncia.",
  painel: "Faça login para acessar seu painel.",
  mensagens: "Entre na sua conta para ver suas mensagens.",
  anunciar: "Faça login para anunciar um desapego ou troca.",
  cadastro:
    "Cadastro realizado! Enviamos um link de confirmação para o seu e-mail; confirme antes de entrar (veja também o spam).",
} as const;

export type AvisoLogin = keyof typeof AVISOS_LOGIN;

export function mensagemAvisoLogin(codigo: unknown): string | null {
  if (typeof codigo !== "string" || !Object.hasOwn(AVISOS_LOGIN, codigo)) return null;
  return AVISOS_LOGIN[codigo as AvisoLogin];
}

export function urlLogin(aviso: AvisoLogin, next?: string): string {
  const params = new URLSearchParams({ aviso });
  if (next) params.set("next", next);
  return `/login?${params.toString()}`;
}
