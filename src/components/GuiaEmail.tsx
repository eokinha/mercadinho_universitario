import { AtSign, Globe, KeyRound, LifeBuoy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PROVEDORES, type GuiaFaculdade } from "@/lib/guias-email";

interface Props {
  guia: GuiaFaculdade | null;
  dominios?: string[]; // para dizer "termina em @..." quando não há formato confirmado
}

interface Passo {
  icone: LucideIcon;
  conteudo: React.ReactNode;
}

const linkClass = "text-petroleo font-semibold hover:underline";

// Passo a passo para entrar no e-mail da faculdade (texto + ícones; prints entram depois)
export default function GuiaEmail({ guia, dominios = [] }: Props) {
  const provedor = guia ? PROVEDORES[guia.provedor] : null;
  const terminacao = dominios.map((d) => `@${d}`).join(" ou ");

  const passos: Passo[] = [
    {
      icone: Globe,
      conteudo: provedor ? (
        <>
          Abra o{" "}
          <a href={provedor.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {provedor.nome}
          </a>{" "}
          no navegador ou o app {provedor.app} no celular.
        </>
      ) : (
        <>
          Abra o e-mail da faculdade. A maioria usa o{" "}
          <a href={PROVEDORES.microsoft.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Outlook
          </a>{" "}
          ou o{" "}
          <a href={PROVEDORES.google.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Gmail
          </a>
          ; o portal do aluno costuma ter um atalho.
        </>
      ),
    },
    {
      icone: AtSign,
      conteudo: guia?.formatoEndereco ? (
        <>
          Entre com o e-mail completo, no formato <strong className="text-tinta">{guia.formatoEndereco}</strong>.
        </>
      ) : (
        <>
          Entre com o e-mail completo que a faculdade te deu
          {terminacao ? (
            <>
              , terminado em <strong className="text-tinta">{terminacao}</strong>
            </>
          ) : null}
          . Ele aparece no portal do aluno e no e-mail de boas-vindas da matrícula.
        </>
      ),
    },
    {
      icone: KeyRound,
      conteudo:
        guia?.primeiroAcesso ??
        "Use a senha da faculdade, em geral a mesma do portal do aluno. No primeiro acesso, pode ser pedido para trocar a senha e cadastrar seu celular.",
    },
    {
      icone: LifeBuoy,
      conteudo:
        guia?.suporte ??
        "Não conseguiu entrar? A secretaria ou o suporte de TI da faculdade redefinem a senha do seu e-mail.",
    },
  ];

  return (
    <ol className="space-y-3">
      {passos.map(({ icone: Icone, conteudo }, i) => (
        <li key={i} className="flex gap-3 text-sm text-tinta-suave">
          <span className="w-8 h-8 shrink-0 rounded-pill bg-petroleo-50 text-petroleo flex items-center justify-center">
            <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="pt-1.5">
            <span className="sr-only">Passo {i + 1}: </span>
            {conteudo}
          </span>
        </li>
      ))}
    </ol>
  );
}
