import { useState } from "react";
import { Star } from "lucide-react";
import Estrelas, { formatarNota } from "@/components/Estrelas";
import { enviarAvaliacao } from "@/lib/queries";
import { LIMITES_TEXTO } from "@/lib/validacoes";
import type { ResumoAvaliacoes } from "@/types";

interface Props {
  lojaId: number;
  nomeVendedor: string;
  resumoInicial: ResumoAvaliacoes;
  ehDono: boolean;
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition disabled:opacity-50 ${FOCO}`;
const ROTULOS_NOTA = ["", "Ruim", "Regular", "Boa", "Muito boa", "Excelente"];

function formatarData(iso: string): string {
  const data = new Date(iso);
  return isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function SecaoAvaliacoes({ lojaId, nomeVendedor, resumoInicial, ehDono }: Props) {
  const [resumo, setResumo] = useState(resumoInicial);
  const [nota, setNota] = useState(resumoInicial.minha?.nota ?? 0);
  const [comentario, setComentario] = useState(resumoInicial.minha?.comentario ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function handleAvaliar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setAviso(null);
    try {
      const r = await enviarAvaliacao(lojaId, nota, comentario);
      setResumo((prev) => ({ ...prev, minha: { nota, comentario: comentario.trim() || null, status: r.status } }));
      setAviso(r.mensagem);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="avaliacoes-vendedor">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="avaliacoes-vendedor" className="text-petroleo text-xl font-bold">
          Avaliações
        </h2>
        {resumo.media !== null && resumo.total > 0 ? (
          <p className="flex items-center gap-2 text-sm text-tinta-suave">
            <span className="text-tinta text-lg font-bold">{formatarNota(resumo.media)}</span>
            <Estrelas nota={resumo.media} />
            <span>
              ({resumo.total} {resumo.total === 1 ? "avaliação" : "avaliações"})
            </span>
          </p>
        ) : (
          <p className="text-sm text-tinta-suave">Ainda sem avaliações.</p>
        )}
      </div>

      {resumo.pode_avaliar ? (
        <form onSubmit={handleAvaliar} className="mt-4 bg-superficie border border-borda rounded-card p-4 flex flex-col gap-3">
          <fieldset>
            <legend className="text-sm font-semibold text-tinta">
              {resumo.minha ? "Sua avaliação" : `Como foi negociar com ${nomeVendedor}?`}
            </legend>
            <div role="radiogroup" aria-label="Nota de 1 a 5" className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={nota === i}
                  aria-label={`${i} de 5: ${ROTULOS_NOTA[i]}`}
                  onClick={() => setNota(i)}
                  className={`w-11 h-11 rounded-controle flex items-center justify-center hover:bg-pagina transition ${FOCO}`}
                >
                  <Star
                    size={24}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={i <= nota ? "fill-doacao text-doacao" : "text-borda-controle"}
                  />
                </button>
              ))}
              {nota > 0 && <span className="ml-2 text-sm text-tinta-suave">{ROTULOS_NOTA[nota]}</span>}
            </div>
          </fieldset>
          <label className="text-sm font-semibold text-tinta">
            Comentário (opcional)
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={LIMITES_TEXTO.comentarioAvaliacao}
              rows={2}
              placeholder="Ex.: Combinou rápido e o item estava como no anúncio."
              className={`mt-1 w-full px-3 py-2 rounded-controle border border-borda-controle bg-superficie text-sm font-normal text-tinta resize-y ${FOCO}`}
            />
          </label>
          <p className="text-xs text-tinta-suave">
            Sem comentário, a nota vale na hora. O comentário passa por moderação automática antes de aparecer.
          </p>
          {resumo.minha && resumo.minha.status !== "aprovado" && !aviso && (
            <p className="text-sm text-doacao">
              {resumo.minha.status === "pendente"
                ? "Sua avaliação está em análise."
                : "Sua última avaliação não foi publicada. Você pode enviar outra."}
            </p>
          )}
          {erro && (
            <p role="alert" className="text-perigo text-sm">
              {erro}
            </p>
          )}
          {aviso && (
            <p role="status" className="text-sm text-petroleo">
              {aviso}
            </p>
          )}
          <button type="submit" disabled={enviando || nota === 0} className={`self-end ${BOTAO_SECUNDARIO}`}>
            {enviando ? "Enviando…" : resumo.minha ? "Atualizar avaliação" : "Enviar avaliação"}
          </button>
        </form>
      ) : (
        !ehDono && (
          <p className="mt-3 text-sm text-tinta-suave">
            Só quem chamou {nomeVendedor} no WhatsApp pelo Circular pode avaliar.
          </p>
        )
      )}

      {resumo.avaliacoes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {resumo.avaliacoes.map((a) => (
            <li key={a.id} className="bg-superficie border border-borda rounded-card p-4 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Estrelas nota={a.nota} tamanho={14} />
                <span className="text-xs text-tinta-suave">
                  {a.autor_nome ?? "Aluno"} · {formatarData(a.criado_em)}
                </span>
              </div>
              {a.comentario && <p className="text-sm text-tinta whitespace-pre-line">{a.comentario}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
