import Link from "next/link";
import { SearchX } from "lucide-react";

// O título vem de tituloDaRota("/404") no _app
export default function PaginaNaoEncontrada() {
  return (
    <section className="max-w-xl mx-auto px-4 py-16 text-center">
      <SearchX size={40} strokeWidth={1.75} className="mx-auto text-petroleo" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-petroleo tracking-tight mt-4">Página não encontrada</h1>
      <p className="text-tinta-suave text-sm mt-2">
        O endereço pode estar errado ou a página saiu do ar. Se veio de um anúncio, ele pode ter sido removido.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto bg-acao text-white rounded-controle hover:bg-acao-hover transition px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          Ir para o início
        </Link>
        <Link
          href="/ajuda"
          className="w-full sm:w-auto bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle transition px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          Ver a ajuda
        </Link>
      </div>
    </section>
  );
}
