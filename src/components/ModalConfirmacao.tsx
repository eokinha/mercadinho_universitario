import { useCallback, useEffect, useId, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  rotuloConfirmar: string;
  perigo?: boolean; // ação destrutiva: botão em vermelho e ícone de alerta
}

interface Props extends Partial<OpcoesConfirmacao> {
  aberto: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Confirmação dentro do site no lugar do confirm() do navegador. Usa <dialog> nativo:
// foco preso no modal, Esc cancela e o foco volta para quem abriu.
export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = "Confirmar",
  perigo = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idMensagem = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={idMensagem}
      // Esc: o navegador fecharia sozinho; quem decide é o estado
      onCancel={(e) => {
        e.preventDefault();
        onCancelar();
      }}
      // Clique no fundo escuro (fora do conteúdo) cancela
      onClick={(e) => {
        if (e.target === ref.current) onCancelar();
      }}
      className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-sm p-0 bg-superficie text-tinta rounded-card shadow-flutuante backdrop:bg-tinta/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {perigo && (
            <span className="w-10 h-10 shrink-0 rounded-pill bg-perigo-50 text-perigo flex items-center justify-center">
              <TriangleAlert size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-lg font-bold text-petroleo">
              {titulo}
            </h2>
            <p id={idMensagem} className="mt-1 text-sm text-tinta-suave">
              {mensagem}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {/* Primeiro no DOM: recebe o foco ao abrir, então Enter sem querer não confirma */}
          <button
            type="button"
            autoFocus
            onClick={onCancelar}
            className="min-h-[44px] px-4 py-2.5 text-sm font-semibold bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white rounded-controle transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 ${
              perigo ? "bg-perigo hover:opacity-90" : "bg-acao hover:bg-acao-hover"
            }`}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// Uso: const { confirmar, modalConfirmacao } = useConfirmacao();
//      if (!(await confirmar({ titulo, mensagem, rotuloConfirmar, perigo: true }))) return;
//      ... e renderizar {modalConfirmacao} no JSX do componente.
export function useConfirmacao() {
  const [pedido, setPedido] = useState<(OpcoesConfirmacao & { responder: (ok: boolean) => void }) | null>(null);

  const confirmar = useCallback(
    (opcoes: OpcoesConfirmacao) => new Promise<boolean>((resolve) => setPedido({ ...opcoes, responder: resolve })),
    []
  );

  function responder(ok: boolean) {
    pedido?.responder(ok);
    setPedido(null);
  }

  const modalConfirmacao = (
    <ModalConfirmacao
      aberto={pedido !== null}
      titulo={pedido?.titulo}
      mensagem={pedido?.mensagem}
      rotuloConfirmar={pedido?.rotuloConfirmar}
      perigo={pedido?.perigo}
      onConfirmar={() => responder(true)}
      onCancelar={() => responder(false)}
    />
  );

  return { confirmar, modalConfirmacao };
}
