import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin(authId: string) {
      const { data } = await supabase
        .from("usuarios")
        .select("is_admin")
        .eq("auth_id", authId)
        .maybeSingle();
      setIsAdmin(!!data?.is_admin);
    }

    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkAdmin(session.user.id);
    });

    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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

        <nav className="hidden md:flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin/imagens"
              className="text-gray-500 hover:text-gray-800 text-sm font-medium"
            >
              Admin
            </Link>
          )}

          {user ? (
            <>
              <Link
                href="/minha-loja"
                className="text-gray-500 hover:text-gray-800 text-sm font-medium"
              >
                Minha Loja
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 text-sm font-medium"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-[#FF385C] border border-[#FF385C] px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#FF385C] hover:text-white transition"
            >
              Entrar
            </Link>
          )}
        </nav>

        <Link
          href={user ? "/perfil" : "/login"}
          aria-label="Perfil"
          className="w-10 h-10 rounded-full border border-gray-300 hover:shadow-md transition bg-gray-100 flex items-center justify-center overflow-hidden"
        >
           {user ? (
             <span className="text-xs font-bold text-gray-500">{user.email?.charAt(0).toUpperCase()}</span>
           ) : (
             <div className="w-5 h-5 text-gray-400" />
           )}
        </Link>
      </div>
    </header>
  );
}
