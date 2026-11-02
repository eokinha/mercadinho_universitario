import Link from "next/link";
import { Ban, MessageCircle } from "lucide-react";
import { horarioMensagem } from "@/lib/chat";
import type { ConversaResumo } from "@/types";

interface Props {
  conversas: ConversaResumo[];
  conversaAtivaId?: string;
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";

export default function ListaConversas({ conversas, conversaAtivaId }: Props) {
  if (conversas.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageCircle size={32} strokeWidth={1.75} className="mx-auto text-petroleo" aria-hidden="true" />
        <p className="text-tinta font-semibold mt-3">Nenhuma conversa ainda</p>
        <p className="text-tinta-suave text-sm mt-1">
          Abra um anúncio e toque em Tenho interesse para falar com quem anunciou, sem expor seu telefone.
        </p>
        <Link href="/listagem" className={`inline-block mt-4 text-sm font-semibold text-petroleo hover:underline rounded-controle ${FOCO}`}>
          Ver anúncios do campus
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-borda" aria-label="Suas conversas">
      {conversas.map((c) => {
        const ativa = c.id === conversaAtivaId;
        const temNaoLidas = c.nao_lidas > 0 && !ativa;
        return (
          <li key={c.id}>
            <Link
              href={`/mensagens/${c.id}`}
              aria-current={ativa ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 transition ${ativa ? "bg-petroleo-50" : "hover:bg-pagina"} ${FOCO}`}
            >
              <span className="w-11 h-11 rounded-pill bg-petroleo-50 shrink-0 overflow-hidden flex items-center justify-center">
                {c.outro.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.outro.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-petroleo" aria-hidden="true">
                    {c.outro.nome.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${temNaoLidas ? "font-bold text-tinta" : "font-semibold text-tinta"}`}>
                    {c.outro.nome}
                  </span>
                  {c.ultima && (
                    <span className="text-xs text-tinta-sutil shrink-0">{horarioMensagem(c.ultima.criado_em)}</span>
                  )}
                </span>
                <span className="block text-xs text-tinta-suave truncate">
                  {c.papel === "vendedor" ? "Interessado em " : ""}
                  {c.produto.nome}
                </span>
                <span className="flex items-center justify-between gap-2 mt-0.5">
                  <span className={`text-sm truncate ${temNaoLidas ? "text-tinta font-semibold" : "text-tinta-suave"}`}>
                    {c.bloqueada ? (
                      <span className="inline-flex items-center gap-1">
                        <Ban size={14} strokeWidth={1.75} aria-hidden="true" />
                        Conversa bloqueada
                      </span>
                    ) : (
                      c.ultima && `${c.ultima.minha ? "Você: " : ""}${c.ultima.texto}`
                    )}
                  </span>
                  {temNaoLidas && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-pill bg-acao text-white text-xs font-bold flex items-center justify-center">
                      <span className="sr-only">Não lidas: </span>
                      {c.nao_lidas > 99 ? "99+" : c.nao_lidas}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
