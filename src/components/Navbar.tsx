import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getResumoUsuarioNavbar } from "@/lib/queries";
import { PAGINAS_PAINEL } from "@/lib/painel-routes";
import Logo from "@/components/Logo";
import { Flag, GraduationCap, Image as ImageIcon, LogOut, Plus, ShieldCheck, Store, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  // Campus fixo do aluno (vem do domínio do e-mail; não há seletor)
  const [campusNome, setCampusNome] = useState<string | null>(null);
  const [lojaId, setLojaId] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Carregar dados da sessão do usuário
  useEffect(() => {
    async function fetchUserData(authId?: string) {
      if (!authId) return;
      const data = await getResumoUsuarioNavbar().catch(() => null);

      if (data) {
        setIsAdmin(data.is_admin);
        setNomeUsuario(data.nome);
        setCampusNome(data.instituicao_nome);
        setLojaId(data.loja_id);

        // Sem campus (e-mail de faculdade não participante): onboarding explica e oferece a troca
        const isAuthPage =
          router.pathname === "/login" ||
          router.pathname === "/cadastro" ||
          router.pathname === "/onboarding" ||
          router.pathname === "/confirmar-email" ||
          router.pathname === "/painel/perfil";

        if (!data.instituicoes_id && !isAuthPage) {
          router.push("/onboarding");
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) fetchUserData(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        fetchUserData(session.user.id);
      } else {
        setIsAdmin(false);
        setNomeUsuario("");
        setCampusNome(null);
        setLojaId(null);
      }
    });

    // Fechar menus ao clicar fora
    function handleClickFora(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuAberto(false);
    router.push("/login");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = termo.trim();

    const params = new URLSearchParams();
    if (q) params.set("q", q);

    router.push(`/listagem?${params.toString()}`);
    setTermo("");
  }

  return (
    <header className="bg-superficie border-b border-borda sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <Link
          href="/"
          aria-label="Circular — página inicial"
          className="shrink-0 rounded-controle focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          <span className="hidden sm:block">
            <Logo />
          </span>
          <span className="sm:hidden">
            <Logo variante="simbolo" />
          </span>
        </Link>

        {/* Barra central: busca no catálogo do campus + campus fixo (só logados) */}
        {user ? (
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2 max-w-xl sm:mx-2">
            <form onSubmit={handleSubmit} className="flex-1 min-w-0" role="search">
              <input
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder={campusNome ? "Buscar no seu campus" : "Buscar"}
                aria-label="Buscar anúncios do seu campus"
                className="w-full rounded-pill border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 px-4 py-2 min-h-[44px] text-sm text-tinta placeholder:text-tinta-sutil transition bg-superficie"
              />
            </form>

            {campusNome && (
              <span
                title={`Seu campus: ${campusNome}`}
                className="hidden md:inline-flex shrink-0 items-center gap-1.5 min-h-[44px] px-3 rounded-pill bg-petroleo-50 text-petroleo text-xs font-semibold max-w-[190px]"
              >
                <GraduationCap size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{campusNome}</span>
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Ações e Menu do Usuário */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && (
            <Link
              href="/anunciar"
              aria-label="Anunciar"
              className="inline-flex items-center gap-1.5 bg-acao hover:bg-acao-hover text-white text-sm font-semibold px-4 py-2.5 min-h-[44px] rounded-controle transition shrink-0 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
            >
              <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="hidden sm:inline">Anunciar</span>
            </Link>
          )}

          {/* Menu do Usuário */}
          <div className="relative shrink-0" ref={menuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setMenuAberto(!menuAberto)}
                  aria-label="Menu da conta"
                  className="w-11 h-11 rounded-pill border border-borda-controle hover:border-petroleo transition bg-petroleo-50 flex items-center justify-center overflow-hidden focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
                >
                  <span className="text-sm font-bold text-petroleo">
                    {(nomeUsuario || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                </button>

                {menuAberto && (
                  <div className="absolute right-0 mt-2 w-56 bg-superficie border border-borda rounded-card shadow-flutuante py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-borda mb-1">
                      <p className="text-xs text-tinta-sutil uppercase font-bold tracking-wider">
                        Conta do Estudante
                      </p>
                      <p className="text-sm font-semibold text-tinta truncate">
                        {nomeUsuario || user.email}
                      </p>
                      {campusNome && (
                        <p className="text-xs text-tinta-suave truncate flex items-center gap-1 mt-0.5">
                          <GraduationCap size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span>{campusNome}</span>
                        </p>
                      )}
                    </div>

                    {Object.values(PAGINAS_PAINEL).map((pagina) => (
                      <Link
                        key={pagina.id}
                        href={pagina.href}
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-tinta hover:bg-pagina transition"
                      >
                        <pagina.icon size={18} strokeWidth={1.75} className="text-tinta-suave" aria-hidden="true" />
                        <span className="font-semibold">{pagina.label}</span>
                      </Link>
                    ))}

                    {lojaId && (
                      <Link
                        href={`/perfil/${lojaId}`}
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-petroleo hover:bg-petroleo-50 font-semibold transition"
                      >
                        <UserRound size={18} strokeWidth={1.75} aria-hidden="true" />
                        <span>Ver perfil público</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <>
                        <Link
                          href="/admin/verificacoes"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-petroleo hover:bg-petroleo-50 font-semibold transition"
                        >
                          <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
                          <span>Moderar Matrículas</span>
                        </Link>
                        <Link
                          href="/admin/lojas"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-petroleo hover:bg-petroleo-50 font-semibold transition"
                        >
                          <Store size={18} strokeWidth={1.75} aria-hidden="true" />
                          <span>Lojas e Destaques</span>
                        </Link>
                        <Link
                          href="/admin/imagens"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-petroleo hover:bg-petroleo-50 transition"
                        >
                          <ImageIcon size={18} strokeWidth={1.75} aria-hidden="true" />
                          <span>Painel Imagens</span>
                        </Link>
                        <Link
                          href="/admin/denuncias"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-petroleo hover:bg-petroleo-50 font-semibold transition"
                        >
                          <Flag size={18} strokeWidth={1.75} aria-hidden="true" />
                          <span>Denúncias</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-borda mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-perigo hover:bg-perigo-50 transition"
                      >
                        <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1 sm:gap-3">
                <Link
                  href="/login"
                  className="text-petroleo hover:underline text-sm font-semibold transition px-2 min-h-[44px] inline-flex items-center"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="hidden sm:inline-flex bg-superficie text-petroleo border border-borda-controle hover:border-petroleo px-4 py-2.5 min-h-[44px] items-center rounded-controle text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
