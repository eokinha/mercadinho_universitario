// Senhas vazadas via Have I Been Pwned (Pwned Passwords), com k-anonimato: só os 5 primeiros
// caracteres do SHA-1 saem do navegador; a comparação do resto é local.
// Substitui a proteção do Supabase Auth, que exige plano pago. Roda só no cliente
// (cadastro e redefinição de senha); se a API falhar, não bloqueia ninguém.
// O domínio está liberado no connect-src da CSP (next.config.ts).
const API_PWNED = "https://api.pwnedpasswords.com/range/";
const TEMPO_LIMITE_MS = 4000;

export const MENSAGEM_SENHA_VAZADA =
  "Esta senha já apareceu em vazamentos de dados e é fácil de adivinhar. Escolha outra.";

export async function sha1Hex(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Resposta da API: linhas "SUFIXO:CONTAGEM" (contagem 0 = preenchimento do Add-Padding)
export function contagemNoRange(resposta: string, sufixo: string): number {
  const alvo = sufixo.toUpperCase();
  for (const linha of resposta.split(/\r?\n/)) {
    const [suf, contagem] = linha.trim().split(":");
    if (suf?.toUpperCase() === alvo) return Number(contagem) || 0;
  }
  return 0;
}

export async function senhaVazada(senha: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(senha);
    const resposta = await fetch(`${API_PWNED}${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) return false;
    return contagemNoRange(await resposta.text(), hash.slice(5)) > 0;
  } catch {
    return false;
  }
}
