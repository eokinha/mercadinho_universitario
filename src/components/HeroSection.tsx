import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="min-h-[calc(100vh-65px)] flex items-center justify-center bg-gradient-to-b from-[#FFF5F7] to-[#F7F7F7] px-4">
      <div className="max-w-3xl text-center">
        <h1 className="text-gray-800 text-4xl md:text-6xl font-semibold leading-tight">
          Encontre tudo que precisa
        </h1>
        <p className="text-gray-500 text-lg md:text-xl mt-4">
          Sem sair da rotina. Livros, materiais e muito mais — direto de quem
          estuda com você.
        </p>

        <div className="mt-10 flex items-center justify-center">
          <Link
            href="#produtos"
            className="bg-[#9A2FD6] text-white rounded-lg hover:bg-[#821bbd] transition px-8 py-3 font-medium"
          >
            Ver produtos
          </Link>
        </div>

        <Link
          href="#produtos"
          aria-label="Rolar para os produtos"
          className="mt-16 inline-flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 animate-bounce"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
