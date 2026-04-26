import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function IconeUsuario({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUserData(authId: string) {
      const { data } = await supabase
        .from("usuarios")
        .select("is_admin, nome")
        .eq("auth_id", authId)
        .maybeSingle();
      
      if (data) {
        setIsAdmin(!!data.is_admin);
        setNomeUsuario(data.nome || "");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsAdmin(false);
        setNomeUsuario("");
      }
    });

    // Fechar menu ao clicar fora
    function handleClickFora(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuAberto(false);
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

        <div className="relative" ref={menuRef}>
          {user ? (
            <>
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="w-10 h-10 rounded-full border border-gray-300 hover:shadow-md transition bg-gray-100 flex items-center justify-center overflow-hidden focus:outline-none"
              >
                <span className="text-sm font-bold text-[#FF385C]">
                  {(nomeUsuario || user.email || "?").charAt(0).toUpperCase()}
                </span>
              </button>

              {menuAberto && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Conta</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{nomeUsuario || user.email}</p>
                  </div>
                  
                  <Link
                    href="/minha-loja"
                    onClick={() => setMenuAberto(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Minha Loja
                  </Link>
                  
                  {isAdmin && (
                    <Link
                      href="/admin/imagens"
                      onClick={() => setMenuAberto(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Painel Admin
                    </Link>
                  )}

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="text-[#FF385C] border border-[#FF385C] px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#FF385C] hover:text-white transition"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
