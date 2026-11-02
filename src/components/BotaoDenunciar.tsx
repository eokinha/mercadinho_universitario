import { useState } from "react";
import { useRouter } from "next/router";
import { Flag } from "lucide-react";
import { denunciar, denunciarComentario } from "@/lib/queries";
import { urlLogin } from "@/lib/avisos-login";
import type { MotivoDenuncia, TipoConteudoModerado } from "@/types";

interface Props {
  lojaId?: number;
  produtoId?: number;
  comentario?: { tipo: TipoConteudoModerado; id: number }; // denuncia uma pergunta, resposta ou avaliação
}

const MOTIVOS: { valor: MotivoDenuncia; rotulo: string }[] = [
  { valor: "proibido", rotulo: "Item proibido (ver Termos de Uso)" },
  { valor: "golpe", rotulo: "Golpe ou tentativa de fraude" },
  { valor: "falso", rotulo: "Anúncio falso ou enganoso" },
  { valor: "ofensivo", rotulo: "Conteúdo ofensivo" },
  { valor: "outro", rotulo: "Outro motivo" },
];

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";

export default function BotaoDenunciar({ lojaId, produtoId, comentario }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia>(comentario ? "ofensivo" : "proibido");
  const [detalhes, setDetalhes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      if (comentario) {
        await denunciarComentario({ tipo: comentario.tipo, id: comentario.id, motivo, detalhes });
      } else if (lojaId) {
        await denunciar({ lojaId, produtoId, motivo, detalhes });
      }
      setEnviado(true);
    } catch (err) {
      if ((err as { code?: string })?.code === "42501") {
        router.push(urlLogin("denuncia", router.asPath));
        return;
      }
      setErro((err as { message?: string })?.message || "Não foi possível enviar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <p role="status" className="text-sm text-tinta-suave">
        Denúncia enviada. A equipe da Circular vai analisar.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={`self-start min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-perigo hover:underline rounded-controle ${FOCO}`}
      >
        <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
        {comentario ? "Denunciar" : produtoId ? "Denunciar anúncio" : "Denunciar perfil"}
      </button>
    );
  }

  return (
    <form onSubmit={handleEnviar} className="bg-perigo-50 rounded-card p-4 flex flex-col gap-3">
      <label className="text-sm font-semibold text-tinta">
        Qual o problema?
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value as MotivoDenuncia)}
          className={`mt-1 w-full min-h-[44px] px-3 rounded-controle border border-borda-controle bg-superficie text-sm font-normal ${FOCO}`}
        >
          {MOTIVOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-semibold text-tinta">
        Detalhes (opcional)
        <textarea
          value={detalhes}
          onChange={(e) => setDetalhes(e.target.value)}
          maxLength={1000}
          rows={3}
          className={`mt-1 w-full px-3 py-2 rounded-controle border border-borda-controle bg-superficie text-sm font-normal resize-y ${FOCO}`}
        />
      </label>
      {erro && (
        <p role="alert" className="text-perigo text-sm">
          {erro}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setAberto(false)}
          className={`min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo ${FOCO}`}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className={`min-h-[44px] px-4 rounded-controle border border-perigo bg-superficie text-perigo text-sm font-semibold disabled:opacity-50 ${FOCO}`}
        >
          {enviando ? "Enviando…" : "Enviar denúncia"}
        </button>
      </div>
    </form>
  );
}
