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

// Espelho dos CHECKs da migração 18 (lojas/produtos/usuarios). Mudar os dois juntos.
export const LIMITES_TEXTO = {
  lojaNome: 80,
  nomeExibicao: 60,
  usuarioNome: 40,
  usuarioSobrenome: 60,
  lojaDescricao: 1000,
  whatsapp: 20,
  produtoNome: 120,
  // produtos.descricao aceita 2000; a descrição e o item de troca são gravados juntos (montarDescricao)
  produtoDescricao: 1800,
  itemTroca: 150,
  matricula: 40,
  // Perguntas, respostas e comentário da avaliação (CHECK de 2 a 500 caracteres; migração 24)
  pergunta: 500,
  resposta: 500,
  comentarioAvaliacao: 500,
} as const;

// @ do Instagram/TikTok (espelho de lojas_instagram_formato). Devolve o handle sem "@",
// ou null se não for um @ válido — nunca monte link com valor fora desse formato.
export function handleRedeSocial(valor: string | null | undefined): string | null {
  const handle = (valor ?? "").trim().replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

// O campus do aluno vem do domínio do e-mail (exato ou subdomínio, ex.: aluno.ufmg.br → ufmg.br).
// Espelho de instituicao_por_email (migração 16) e email_cadastro_permitido (migração 19):
// só cadastra quem tem e-mail de instituição listada em instituicoes.dominios.
export function instituicaoDoEmail<T extends { dominios: string[] | null }>(
  email: string,
  instituicoes: T[]
): T | null {
  const dominio = email.toLowerCase().trim().split("@")[1] ?? "";
  if (!dominio) return null;

  let melhor: T | null = null;
  let tamanho = 0;
  for (const inst of instituicoes) {
    for (const bruto of inst.dominios ?? []) {
      const d = bruto.toLowerCase().trim();
      if (d && (dominio === d || dominio.endsWith(`.${d}`)) && d.length > tamanho) {
        melhor = inst;
        tamanho = d.length;
      }
    }
  }
  return melhor;
}

export function validarEmailUniversitario(
  email: string,
  instituicoes: { dominios: string[] | null }[]
): boolean {
  return instituicaoDoEmail(email, instituicoes) !== null;
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

// Nome de exibição (marca opcional): espelho de nome_exibicao_valido (migração 23). Mudar os dois juntos.
// Vazio é válido (usa o nome pessoal). Devolve o problema ou null.
export const TERMOS_RESERVADOS_NOME = ["circular", "admin", "modera", "suporte", "oficial", "equipe"] as const;

export function problemaNomeExibicao(nome: string): string | null {
  const texto = nome.trim();
  if (!texto) return null;
  if (texto.length < 2) return "O nome de exibição precisa ter pelo menos 2 caracteres.";
  if (texto.length > LIMITES_TEXTO.nomeExibicao) {
    return `O nome de exibição pode ter até ${LIMITES_TEXTO.nomeExibicao} caracteres.`;
  }
  const semAcento = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (TERMOS_RESERVADOS_NOME.some((termo) => semAcento.includes(termo))) {
    return "Esse nome usa um termo reservado à equipe do Circular (como Circular, Admin, Suporte ou Oficial).";
  }
  return null;
}
