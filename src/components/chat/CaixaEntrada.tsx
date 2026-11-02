import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import ListaConversas from "@/components/chat/ListaConversas";
import { assinarUsuario } from "@/lib/chat-realtime";
import { getMinhasConversas } from "@/lib/queries";
import type { ConversaResumo } from "@/types";

interface Props {
  conversasIniciais: ConversaResumo[];
  meuId: number;
  conversaAtivaId?: string;
  children?: ReactNode; // a conversa aberta (no celular, ocupa a tela no lugar da lista)
}

// Lista de conversas + conversa aberta. Os dados iniciais vêm do getServerSideProps; depois, cada
// mensagem nova no canal usuario:{id} recarrega a lista (exceção à regra de não buscar dados no
// componente, como a Navbar: é atualização em tempo real, não carga inicial).
export default function CaixaEntrada({ conversasIniciais, meuId, conversaAtivaId, children }: Props) {
  const [conversas, setConversas] = useState(conversasIniciais);
  const [iniciaisAnteriores, setIniciaisAnteriores] = useState(conversasIniciais);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ao trocar de conversa a página traz a lista nova do servidor
  if (iniciaisAnteriores !== conversasIniciais) {
    setIniciaisAnteriores(conversasIniciais);
    setConversas(conversasIniciais);
  }

  useEffect(() => {
    const recarregar = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        getMinhasConversas().then(setConversas).catch(() => undefined);
      }, 300);
    };
    const canal = assinarUsuario(meuId, {
      onNovaMensagem: recarregar,
      onConversaLida: recarregar,
      onSincronizar: recarregar,
    });
    return () => {
      canal.sair();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [meuId]);

  return (
    <div className="max-w-6xl mx-auto sm:px-4 sm:py-6">
      <div className="bg-superficie sm:border sm:border-borda sm:rounded-card overflow-hidden grid grid-cols-1 lg:grid-cols-[22rem_1fr] h-[calc(100dvh-4.5rem)] sm:h-[calc(100dvh-7.5rem)] min-h-[28rem]">
        <section
          aria-label="Conversas"
          className={`border-r border-borda flex-col min-h-0 ${conversaAtivaId ? "hidden lg:flex" : "flex"}`}
        >
          <h1 className="px-4 py-4 border-b border-borda text-petroleo text-lg font-bold">Mensagens</h1>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ListaConversas conversas={conversas} conversaAtivaId={conversaAtivaId} />
          </div>
        </section>

        <section aria-label="Conversa" className={`min-h-0 ${conversaAtivaId ? "flex flex-col" : "hidden lg:flex"}`}>
          {children ?? (
            <div className="m-auto text-center p-8 max-w-sm">
              <MessageCircle size={36} strokeWidth={1.75} className="mx-auto text-petroleo" aria-hidden="true" />
              <p className="text-tinta font-semibold mt-3">Escolha uma conversa</p>
              <p className="text-tinta-suave text-sm mt-1">
                As conversas do chat ficam aqui, sem expor o número de ninguém.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
