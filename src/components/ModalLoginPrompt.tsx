import Link from "next/link";

interface ModalLoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalLoginPrompt({ isOpen, onClose }: ModalLoginPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Fechar"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-[#9A2FD6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#9A2FD6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso restrito</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Para ver detalhes dos produtos e entrar em contato com os vendedores, você precisa estar logado na Kitanda Universitária.
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-[#9A2FD6] text-white font-semibold py-3 rounded-lg hover:bg-[#821bbd] transition"
            >
              Entrar agora
            </Link>
            <Link
              href="/cadastro"
              className="block w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
