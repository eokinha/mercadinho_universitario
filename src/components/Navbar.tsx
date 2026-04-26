import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";

const ehDev = process.env.NODE_ENV !== "production";

export default function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = termo.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}#produtos` : "/#produtos");
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="text-[#FF385C] font-bold text-lg whitespace-nowrap"
        >
          Mercadinho Universitário
        </Link>

        <form onSubmit={handleSubmit} className="flex-1 flex justify-center">
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar lojas e produtos"
            className="w-full max-w-md rounded-full border border-gray-300 focus:border-[#FF385C] focus:outline-none px-5 py-2 text-sm text-gray-800 placeholder-gray-400"
          />
        </form>

        {ehDev && (
          <Link
            href="/admin/imagens"
            className="text-gray-500 hover:text-gray-800 text-sm whitespace-nowrap"
          >
            Admin
          </Link>
        )}

        <button
          type="button"
          aria-label="Perfil"
          className="w-10 h-10 rounded-full border border-gray-300 hover:shadow-md transition bg-gray-100"
        />
      </div>
    </header>
  );
}
