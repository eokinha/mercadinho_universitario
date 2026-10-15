export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

export function formatarCPF(v: string): string {
  v = v.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatarTelefone(v: string): string {
  v = v.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function validarEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Só uma dica no cadastro. Quem decide a verificação é o banco: o domínio precisa estar em
// instituicoes.dominios (instituicao_por_email, migração 16).
const SUFIXOS_ACADEMICOS = [".edu.br", ".edu"];
// Domínios de instituições cadastradas que não terminam em .edu/.edu.br (ver instituicoes.dominios)
const DOMINIOS_ACADEMICOS = [
  "unb.br",
  "usp.br",
  "ufmg.br",
  "pucminas.br",
  "unijorge.com.br",
  "unifacs.br",
  "ucsal.br",
  "estacio.br",
  "senaicimatec.com.br",
];

export function validarEmailUniversitario(email: string): boolean {
  const dominio = email.toLowerCase().trim().split("@")[1] ?? "";
  if (!dominio) return false;

  return (
    SUFIXOS_ACADEMICOS.some((sufixo) => dominio.endsWith(sufixo)) ||
    dominio.includes(".edu.") ||
    DOMINIOS_ACADEMICOS.some((d) => dominio === d || dominio.endsWith(`.${d}`))
  );
}

// Espelho da política de senha do Supabase Auth (Authentication → Providers → Email):
// mínimo de 8 caracteres, com minúscula, maiúscula e número. Mudar os dois juntos.
export const SENHA_TAMANHO_MINIMO = 8;
export const DICA_SENHA = "Mínimo de 8 caracteres, com letra maiúscula, minúscula e número.";

// Devolve o que falta na senha, ou null se ela atende à regra
export function problemaSenha(senha: string): string | null {
  if (senha.length < SENHA_TAMANHO_MINIMO) return `A senha precisa ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`;
  if (!/[a-z]/.test(senha)) return "A senha precisa ter pelo menos uma letra minúscula.";
  if (!/[A-Z]/.test(senha)) return "A senha precisa ter pelo menos uma letra maiúscula.";
  if (!/[0-9]/.test(senha)) return "A senha precisa ter pelo menos um número.";
  return null;
}
