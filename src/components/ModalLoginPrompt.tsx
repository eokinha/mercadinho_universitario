import Link from "next/link";

interface ModalLoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalLoginPrompt({ isOpen, onClose }: ModalLoginPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/50 backdrop-blur-sm">
      <div className="bg-superficie rounded-card shadow-flutuante max-w-sm w-full p-8 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-tinta-sutil hover:text-tinta-suave transition"
          aria-label="Fechar"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-petroleo-50 rounded-pill flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-petroleo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-petroleo mb-2">Acesso restrito</h2>
          <p className="text-tinta-suave mb-6 text-sm">
            Para ver detalhes dos produtos e entrar em contato com os vendedores, você precisa estar logado na Circular.
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition"
            >
              Entrar agora
            </Link>
            <Link
              href="/cadastro"
              className="block w-full border border-borda-controle text-tinta font-semibold py-3 rounded-controle hover:bg-pagina transition"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
