import { Star } from "lucide-react";

interface Props {
  nota: number; // 0 a 5 (a média é arredondada para a estrela inteira mais próxima)
  tamanho?: number;
}

// Só exibição; para escolher a nota, ver o seletor em SecaoAvaliacoes
export default function Estrelas({ nota, tamanho = 16 }: Props) {
  const cheias = Math.round(nota);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Nota ${formatarNota(nota)} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={tamanho}
          strokeWidth={1.75}
          aria-hidden="true"
          className={i <= cheias ? "fill-doacao text-doacao" : "text-borda-controle"}
        />
      ))}
    </span>
  );
}

export function formatarNota(nota: number): string {
  return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
