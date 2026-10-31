import { useEffect } from "react";
import { Heart, HeartOff, TriangleAlert } from "lucide-react";

export type TipoAvisoFavorito = "salvo" | "removido" | "erro";

interface Props {
  aviso: TipoAvisoFavorito | null;
  chave: number; // muda a cada clique: reinicia o tempo do aviso
  onSumir: () => void;
}

const TEXTOS: Record<TipoAvisoFavorito, string> = {
  salvo: "Salvo nos favoritos",
  removido: "Removido dos favoritos",
  erro: "Não deu para salvar. Tente de novo.",
};

const DURACAO_MS = 2500;

// Confirmação curta sobre a foto do anúncio depois de tocar no coração (card e página do anúncio).
// A região aria-live fica sempre montada para o leitor de tela anunciar a mudança.
export default function AvisoFavorito({ aviso, chave, onSumir }: Props) {
  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(onSumir, DURACAO_MS);
    return () => clearTimeout(timer);
  }, [aviso, chave, onSumir]);

  const Icone = aviso === "erro" ? TriangleAlert : aviso === "removido" ? HeartOff : Heart;

  return (
    <span aria-live="polite" className="absolute inset-x-0 bottom-2 px-2 flex justify-center pointer-events-none z-10">
      {aviso && (
        <span
          key={chave}
          className={`inline-flex items-center gap-1.5 rounded-pill text-xs font-semibold px-2.5 py-1 shadow-flutuante ${
            aviso === "erro" ? "bg-perigo-50 text-perigo" : "bg-superficie text-tinta"
          }`}
        >
          <Icone
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className={aviso === "salvo" ? "fill-perigo text-perigo" : ""}
          />
          {TEXTOS[aviso]}
        </span>
      )}
    </span>
  );
}
