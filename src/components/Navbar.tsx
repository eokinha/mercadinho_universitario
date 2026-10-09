import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef, useMemo, useSyncExternalStore, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getInstituicoes, getResumoUsuarioNavbar } from "@/lib/queries";
import { PAGINAS_PAINEL } from "@/lib/painel-routes";
import type { User } from "@supabase/supabase-js";
import type { Instituicao } from "@/types";

export default function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  // Estados do seletor / combobox de universidades
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [instituicaoUsuarioId, setInstituicaoUsuarioId] = useState<number | null>(null);
  // undefined = usuário ainda não escolheu nada no combobox
  const [instituicaoEscolhida, setInstituicaoEscolhida] = useState<number | null | undefined>(undefined);
  const [lojaId, setLojaId] = useState<number | null>(null);
  const [comboboxAberto, setComboboxAberto] = useState(false);
  const [buscaUniversidade, setBuscaUniversidade] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const hasAutoAppliedRef = useRef(false);

  // Carregar lista de instituições cadastradas
  useEffect(() => {
    getInstituicoes(supabase)
      .then(setInstituicoes)
      .catch((err) => console.warn("Erro ao carregar instituições:", err));
  }, []);

  // Carregar dados da sessão do usuário
  useEffect(() => {
    async function fetchUserData(authId?: string) {
      if (!authId) return;
      const data = await getResumoUsuarioNavbar().catch(() => null);

      if (data) {
        setIsAdmin(data.is_admin);
        setNomeUsuario(data.nome);
        setInstituicaoUsuarioId(data.instituicoes_id);
        setLojaId(data.loja_id);

        // Se não tiver instituição e não estiver no onboarding ou login, redireciona
        const isAuthPage =
          router.pathname === "/login" ||
          router.pathname === "/cadastro" ||
          router.pathname === "/onboarding";

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
        setInstituicaoUsuarioId(null);
        setLojaId(null);
      }
    });

    // Fechar menus ao clicar fora
    function handleClickFora(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuAberto(false);
      }
      if (comboboxRef.current && !comboboxRef.current.contains(target)) {
        setComboboxAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, [router]);

  // Instituição selecionada: URL -> escolha no combobox -> perfil do usuário -> localStorage
  const instituicaoUrl = router.query.instituicao ? Number(router.query.instituicao) : null;
  const instituicaoArmazenada = useSyncExternalStore(
    () => () => {},
    () => {
      const stored = localStorage.getItem("mercadinho_instituicao_id");
      return stored && /^\d+$/.test(stored) ? Number(stored) : null;
    },
    () => null
  );
  const instituicaoSelecionada =
    instituicaoUrl ??
    (instituicaoEscolhida !== undefined
      ? instituicaoEscolhida
      : instituicaoUsuarioId ?? instituicaoArmazenada);

  // Auto-aplica na URL da Home/Listagem o campus do perfil (uma vez por sessão)
  useEffect(() => {
    if (instituicaoUrl || !instituicaoUsuarioId || hasAutoAppliedRef.current) return;
    hasAutoAppliedRef.current = true;

    if (router.pathname === "/" || router.pathname === "/listagem") {
      const params = new URLSearchParams(window.location.search);
      params.set("instituicao", String(instituicaoUsuarioId));
      router.replace(`${router.pathname}?${params.toString()}`, undefined, { shallow: false });
    }
  }, [instituicaoUrl, instituicaoUsuarioId, router]);

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
    if (instituicaoSelecionada) params.set("instituicao", String(instituicaoSelecionada));

    router.push(`/listagem?${params.toString()}`);
    setTermo("");
  }

  // Ação ao selecionar uma instituição no combobox
  function selecionarInstituicao(id: number | null) {
    setInstituicaoEscolhida(id);
    if (id) {
      localStorage.setItem("mercadinho_instituicao_id", String(id));
    } else {
      localStorage.removeItem("mercadinho_instituicao_id");
    }

    setComboboxAberto(false);
    setBuscaUniversidade("");

    // Atualiza a URL na página atual ou redireciona
    if (router.pathname === "/listagem") {
      const params = new URLSearchParams(window.location.search);
      if (id) {
        params.set("instituicao", String(id));
      } else {
        params.delete("instituicao");
      }
      router.push(`/listagem?${params.toString()}`);
    } else if (router.pathname === "/") {
      if (id) {
        router.push(`/?instituicao=${id}`);
      } else {
        router.push("/");
      }
    } else {
      if (id) {
        router.push(`/listagem?instituicao=${id}`);
      }
    }
  }

  // Filtragem dinâmica de universidades dentro do combobox
  const instituicoesFiltradas = useMemo(() => {
    if (!buscaUniversidade.trim()) return instituicoes;
    const termoBusca = buscaUniversidade.toLowerCase();
    return instituicoes.filter((i) => i.nome.toLowerCase().includes(termoBusca));
  }, [instituicoes, buscaUniversidade]);

  // Objeto da instituição atualmente ativa
  const instituicaoAtivaObj = useMemo(() => {
    if (!instituicaoSelecionada) return null;
    return instituicoes.find((i) => i.id === instituicaoSelecionada) || null;
  }, [instituicoes, instituicaoSelecionada]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-[#FF385C] font-bold text-base sm:text-lg shrink-0"
        >
          Mercadinho Universitário
        </Link>

        {/* Barra Central: Busca + Seletor de Universidades */}
        <div className="flex-1 flex items-center justify-center gap-2 max-w-xl mx-2">
          {/* Input de Busca de Produtos */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-[120px]">
            <input
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full rounded-[12px] border border-gray-300 focus:border-[#FF385C] focus:outline-none px-3.5 sm:px-4 py-2 text-xs sm:text-sm text-gray-800 placeholder-gray-400 text-left transition bg-gray-50/50 hover:bg-white focus:bg-white"
            />
          </form>

          {/* Campo de Busca de Universidades (Combobox) */}
          <div className="relative shrink-0" ref={comboboxRef}>
            <button
              type="button"
              onClick={() => setComboboxAberto(!comboboxAberto)}
              className="h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 rounded-[12px] border border-gray-300 hover:border-gray-400 bg-white text-xs font-semibold text-gray-700 transition focus:outline-none focus:border-[#FF385C] max-w-[125px] sm:max-w-[190px] shadow-2xs"
              title={
                instituicaoAtivaObj
                  ? `Campus ativo: ${instituicaoAtivaObj.nome}`
                  : "Todas as universidades"
              }
            >
              <span className="text-sm shrink-0">🎓</span>
              <span className="truncate text-left font-medium">
                {instituicaoAtivaObj ? instituicaoAtivaObj.nome : "Todas as Faculdades"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
                  comboboxAberto ? "rotate-180 text-[#FF385C]" : ""
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown Popover do Combobox */}
            {comboboxAberto && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <span>Filtrar por Campus</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {instituicoes.length} faculdades
                  </span>
                </div>

                {/* Input de Busca de Universidade */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={buscaUniversidade}
                    onChange={(e) => setBuscaUniversidade(e.target.value)}
                    placeholder="Buscar faculdade ou sigla..."
                    className="w-full text-xs px-3 py-2 pl-8 rounded-xl border border-gray-200 focus:outline-none focus:border-[#FF385C] bg-gray-50 focus:bg-white"
                    autoFocus
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    🔍
                  </span>
                  {buscaUniversidade && (
                    <button
                      type="button"
                      onClick={() => setBuscaUniversidade("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Opções de Seleção */}
                <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1">
                  {/* Opção "Todas as universidades" */}
                  <button
                    type="button"
                    onClick={() => selecionarInstituicao(null)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                      instituicaoSelecionada === null
                        ? "bg-[#FFE7EB] text-[#FF385C] font-bold"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>🌐</span>
                      <span>Todas as Universidades (Sem filtro)</span>
                    </span>
                    {instituicaoSelecionada === null && (
                      <span className="text-sm font-bold text-[#FF385C]">✓</span>
                    )}
                  </button>

                  {/* Lista de Instituições */}
                  {instituicoesFiltradas.length === 0 ? (
                    <p className="text-center py-4 text-xs text-gray-400">
                      Nenhuma universidade encontrada com este termo.
                    </p>
                  ) : (
                    instituicoesFiltradas.map((inst) => {
                      const isSelecionada = instituicaoSelecionada === inst.id;
                      const isCampusUsuario = instituicaoUsuarioId === inst.id;

                      return (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => selecionarInstituicao(inst.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition ${
                            isSelecionada
                              ? "bg-[#FFE7EB] text-[#FF385C] font-bold"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{inst.nome}</p>
                            {isCampusUsuario && (
                              <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded mt-0.5">
                                Seu campus de cadastro 🏠
                              </span>
                            )}
                          </div>
                          {isSelecionada && (
                            <span className="shrink-0 text-sm font-bold text-[#FF385C]">✓</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ações e Menu do Usuário */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/anunciar"
            className="inline-flex items-center gap-1.5 bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-semibold px-3 sm:px-3.5 py-2 rounded-xl transition shadow-2xs hover:shadow-xs shrink-0"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span className="hidden sm:inline">Anunciar</span>
          </Link>

          {/* Menu do Usuário */}
          <div className="relative shrink-0" ref={menuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setMenuAberto(!menuAberto)}
                  className="w-10 h-10 rounded-full border border-gray-300 hover:shadow-md transition bg-gray-100 flex items-center justify-center overflow-hidden focus:outline-none"
                >
                  <span className="text-sm font-bold text-[#FF385C]">
                    {(nomeUsuario || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                </button>

                {menuAberto && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Conta do Estudante
                      </p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {nomeUsuario || user.email}
                      </p>
                      {instituicaoAtivaObj && (
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <span>🎓</span>
                          <span>{instituicaoAtivaObj.nome}</span>
                        </p>
                      )}
                    </div>

                    {Object.values(PAGINAS_PAINEL).map((pagina) => (
                      <Link
                        key={pagina.id}
                        href={pagina.href}
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <span className="text-base">{pagina.icon}</span>
                        <span className="font-medium">{pagina.label}</span>
                      </Link>
                    ))}

                    {lojaId && (
                      <Link
                        href={`/perfil/${lojaId}`}
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#FF385C] hover:bg-[#FFE7EB]/50 font-medium transition"
                      >
                        <span className="text-base">👤</span>
                        <span>Ver perfil público</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <>
                        <Link
                          href="/admin/verificacoes"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 font-medium transition"
                        >
                          <span className="text-base">🛡️</span>
                          <span>Moderar Matrículas</span>
                        </Link>
                        <Link
                          href="/admin/lojas"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#FF385C] hover:bg-red-50 font-medium transition"
                        >
                          <span className="text-base">🏪</span>
                          <span>Lojas e Destaques</span>
                        </Link>
                        <Link
                          href="/admin/imagens"
                          onClick={() => setMenuAberto(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 transition"
                        >
                          <span className="text-base">🖼️</span>
                          <span>Painel Imagens</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <span className="text-base">🚪</span>
                        <span>Sair</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm font-semibold transition px-2"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="bg-[#FF385C] border border-[#FF385C] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold text-white hover:bg-[#e0314f] transition shadow-xs"
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
