interface Props {
  variante?: "completa" | "simbolo";
  cor?: "petroleo" | "branco";
  className?: string;
}

// Símbolo inline e texto em HTML: o nome usa a Plus Jakarta Sans carregada pelo next/font
export default function Logo({ variante = "completa", cor = "petroleo", className = "" }: Props) {
  const corClasse = cor === "branco" ? "text-white" : "text-petroleo";

  return (
    <span className={`inline-flex items-center gap-2 ${corClasse} ${className}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="h-8 w-8 shrink-0">
        <path
          d="M75.5 24.5A36 36 0 1 0 75.5 75.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path d="M62 73L88 88L90 59Z" fill="currentColor" />
      </svg>
      {variante === "completa" ? (
        <span className="text-2xl font-bold tracking-tight">Circular</span>
      ) : (
        <span className="sr-only">Circular</span>
      )}
    </span>
  );
}
