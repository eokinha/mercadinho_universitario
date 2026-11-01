// Logo da faculdade exibido na Navbar ao lado do Circular, pelo domínio de e-mail da instituição.
// Faculdade nova: salvar o arquivo em public/faculdades/ e adicionar o domínio aqui.
// Sem logo, a Navbar mostra o nome curto (nomeCurtoFaculdade).
const LOGOS_POR_DOMINIO: Record<string, string> = {
  "unijorge.edu.br": "/faculdades/unijorge.svg",
  "unijorge.com.br": "/faculdades/unijorge.svg",
};

export function logoDaFaculdade(dominios: string[] | null | undefined): string | null {
  for (const dominio of dominios ?? []) {
    const logo = LOGOS_POR_DOMINIO[dominio.trim().toLowerCase()];
    if (logo) return logo;
  }
  return null;
}

// "Centro Universitário Jorge Amado (Unijorge)" → "Unijorge"; sem sigla entre parênteses, o nome inteiro
export function nomeCurtoFaculdade(nome: string): string {
  const sigla = nome.match(/\(([^()]+)\)\s*$/);
  return (sigla ? sigla[1] : nome).trim();
}
