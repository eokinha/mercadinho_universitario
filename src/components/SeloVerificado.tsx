import { ShieldCheck } from "lucide-react";

interface Props {
  tamanho?: "sm" | "md";
}

// Selo do design system: ShieldCheck + "Verificado", sempre ao lado do nome
export default function SeloVerificado({ tamanho = "sm" }: Props) {
  const icone = tamanho === "sm" ? 14 : 16;
  return (
    <span
      className={`inline-flex items-center gap-1 text-petroleo font-semibold shrink-0 ${
        tamanho === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      <ShieldCheck size={icone} strokeWidth={1.75} aria-hidden="true" />
      Verificado
    </span>
  );
}
