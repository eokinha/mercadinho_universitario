import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef, useMemo, useSyncExternalStore, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getInstituicoes, getResumoUsuarioNavbar } from "@/lib/queries";
import { PAGINAS_PAINEL } from "@/lib/painel-routes";
import Logo from "@/components/Logo";
import { Check, ChevronDown, Globe, GraduationCap, Image as ImageIcon, LogOut, Plus, Search, ShieldCheck, Store, UserRound, X } from "lucide-react";
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

        {/* Barra Central: Busca + Seletor de Universidades */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 max-w-xl sm:mx-2">
          {/* Input de Busca de Produtos */}
          <form onSubmit={handleSubmit} className="flex-1 min-w-0" role="search">
            <input
              type="search"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar anúncios"
              className="w-full rounded-pill border border-borda-controle focus:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 px-4 py-2 min-h-[44px] text-sm text-tinta placeholder:text-tinta-sutil transition bg-superficie"
            />
          </form>

          {/* Campo de Busca de Universidades (Combobox) */}
          <div className="relative shrink-0" ref={comboboxRef}>
            <button
              type="button"
              onClick={() => setComboboxAberto(!comboboxAberto)}
              className="min-h-[44px] flex items-center gap-1.5 px-3 rounded-pill border border-borda-controle hover:border-petroleo bg-superficie text-xs font-semibold text-tinta transition focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 sm:max-w-[190px]"
              title={
                instituicaoAtivaObj
                  ? `Campus ativo: ${instituicaoAtivaObj.nome}`
                  : "Todas as universidades"
              }
            >
              <GraduationCap size={16} strokeWidth={1.75} className="shrink-0 text-petroleo" aria-hidden="true" />
              <span className="hidden sm:inline truncate text-left font-semibold">
                {instituicaoAtivaObj ? instituicaoAtivaObj.nome : "Todas as faculdades"}
              </span>
              <span className="sr-only sm:hidden">Escolher faculdade</span>
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className={`text-tinta-sutil shrink-0 transition-transform duration-200 ${
                  comboboxAberto ? "rotate-180 text-petroleo" : ""
                }`}
              />
            </button>

            {/* Dropdown Popover do Combobox */}
            {comboboxAberto && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-superficie border border-borda rounded-card shadow-flutuante p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-tinta-sutil uppercase tracking-wider mb-2">
                  <span>Filtrar por Campus</span>
                  <span className="text-xs text-tinta-sutil font-normal">
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
                    className="w-full text-xs px-3 py-2 pl-8 rounded-controle border border-borda-controle focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2 focus:border-petroleo bg-superficie"
                    autoFocus
                  />
                  <Search size={16} strokeWidth={1.75} aria-hidden="true" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tinta-sutil" />
                  {buscaUniversidade && (
                    <button
                      type="button"
                      onClick={() => setBuscaUniversidade("")}
                      aria-label="Limpar busca"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tinta-sutil hover:text-tinta"
                    >
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Opções de Seleção */}
                <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1">
                  {/* Opção "Todas as universidades" */}
                  <button
                    type="button"
                    onClick={() => selecionarInstituicao(null)}
                    className={`w-full text-left px-3 py-2 rounded-controle text-xs font-semibold flex items-center justify-between transition ${
                      instituicaoSelecionada === null
                        ? "bg-petroleo-50 text-petroleo font-bold"
                        : "hover:bg-pagina text-tinta"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>Todas as Universidades (Sem filtro)</span>
                    </span>
                    {instituicaoSelecionada === null && (
                      <Check size={16} strokeWidth={1.75} className="text-petroleo" aria-label="Selecionado" />
                    )}
                  </button>

                  {/* Lista de Instituições */}
                  {instituicoesFiltradas.length === 0 ? (
                    <p className="text-center py-4 text-xs text-tinta-sutil">
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
                          className={`w-full text-left px-3 py-2 rounded-controle text-xs font-semibold flex items-center justify-between gap-2 transition ${
                            isSelecionada
                              ? "bg-petroleo-50 text-petroleo font-bold"
                              : "hover:bg-pagina text-tinta"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{inst.nome}</p>
                            {isCampusUsuario && (
                              <span className="inline-block text-xs font-semibold text-petroleo bg-petroleo-50 px-2 py-0.5 rounded-pill mt-0.5">
                                Seu campus de cadastro
                              </span>
                            )}
                          </div>
                          {isSelecionada && (
                            <Check size={16} strokeWidth={1.75} className="shrink-0 text-petroleo" aria-label="Selecionado" />
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
            aria-label="Anunciar"
            className="inline-flex items-center gap-1.5 bg-acao hover:bg-acao-hover text-white text-sm font-semibold px-4 py-2.5 min-h-[44px] rounded-controle transition shrink-0 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden sm:inline">Anunciar</span>
          </Link>

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
                      {instituicaoAtivaObj && (
                        <p className="text-xs text-tinta-suave truncate flex items-center gap-1 mt-0.5">
                          <GraduationCap size={14} strokeWidth={1.75} aria-hidden="true" />
                          <span>{instituicaoAtivaObj.nome}</span>
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
