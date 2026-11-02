import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface Props {
  tamanho?: "sm" | "md";
}

const LARGURA_BALAO = 256;

// Selo do design system: só o ShieldCheck, ao lado do nome. Tocar abre um balão explicando o que significa.
// O balão é `fixed` para não ser cortado por cards com overflow-hidden; fecha ao tocar fora, rolar ou Esc.
// Não colocar dentro de <a> ou <button> (botão dentro de link é HTML inválido).
export default function SeloVerificado({ tamanho = "sm" }: Props) {
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const balaoRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const aberto = posicao !== null;

  function alternar() {
    if (aberto || !botaoRef.current) {
      setPosicao(null);
      return;
    }
    const r = botaoRef.current.getBoundingClientRect();
    const margem = 16;
    const left = Math.min(Math.max(margem, r.left + r.width / 2 - LARGURA_BALAO / 2), window.innerWidth - LARGURA_BALAO - margem);
    setPosicao({ top: r.bottom + 8, left: Math.max(margem, left) });
  }

  useEffect(() => {
    if (!aberto) return;
    function fechar() {
      setPosicao(null);
    }
    function aoClicar(e: PointerEvent) {
      const alvo = e.target as Node;
      if (!balaoRef.current?.contains(alvo) && !botaoRef.current?.contains(alvo)) fechar();
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        fechar();
        botaoRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("pointerdown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          alternar();
        }}
        aria-label="Aluno verificado. O que significa?"
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        className={`relative z-10 inline-flex items-center justify-center shrink-0 text-petroleo rounded-pill hover:bg-petroleo-50 transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
          tamanho === "sm" ? "w-6 h-6 -m-1" : "w-8 h-8 -m-1.5"
        }`}
      >
        <ShieldCheck size={tamanho === "sm" ? 16 : 20} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {posicao && (
        <div
          ref={balaoRef}
          id={id}
          role="dialog"
          aria-label="Aluno verificado"
          style={{ top: posicao.top, left: posicao.left, width: LARGURA_BALAO }}
          className="fixed z-50 bg-superficie border border-borda rounded-card shadow-hover p-3 text-left font-normal"
        >
          <p className="flex items-center gap-1.5 text-sm font-bold text-petroleo">
            <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            Aluno verificado
          </p>
          <p className="mt-1 text-xs text-tinta leading-relaxed">
            A matrícula deste aluno foi confirmada pelo e-mail da faculdade ou pela equipe do Circular. Só alunos
            verificados podem anunciar.
          </p>
          <Link href="/ajuda#verificado" className="mt-2 inline-block text-xs font-semibold text-petroleo hover:underline">
            Saiba mais
          </Link>
        </div>
      )}
    </>
  );
}
