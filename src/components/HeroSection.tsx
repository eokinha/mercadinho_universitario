import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Categoria } from "@/types";

interface Props {
  categorias?: Categoria[];
}

// Categorias padrão caso ainda não haja categorias cadastradas no banco
const CATEGORIAS_PADRAO = [
  { id: 1, nome: "Livros & Material Acadêmico", icone: "📚" },
  { id: 2, nome: "Tecnologia & Eletrônicos",   icone: "💻" },
  { id: 3, nome: "Material de Curso",           icone: "🔬" },
  { id: 4, nome: "Moda & Brechó",               icone: "👕" },
  { id: 5, nome: "Moradia & Casa",              icone: "🏠" },
  { id: 6, nome: "Alimentação & Bebidas",       icone: "🍕" },
  { id: 7, nome: "Papelaria & Arte",            icone: "🎨" },
  { id: 8, nome: "Serviços",                    icone: "🔧" },
];

// Mapeamento de ícones por palavras-chave do nome da categoria
function iconeParaCategoria(nome: string, iconeDb?: string): string {
  if (iconeDb && iconeDb !== "🏷️") return iconeDb;
  const n = nome.toLowerCase();
  if (n.includes("livro") || n.includes("acadêm") || n.includes("apostila")) return "📚";
  if (n.includes("tecnolog") || n.includes("eletrôn")) return "💻";
  if (n.includes("material de curso") || n.includes("curso")) return "🔬";
  if (n.includes("moda") || n.includes("brechó") || n.includes("roupa")) return "👕";
  if (n.includes("moradia") || n.includes("casa")) return "🏠";
  if (n.includes("aliment") || n.includes("bebida") || n.includes("comida")) return "🍕";
  if (n.includes("papelaria") || n.includes("arte")) return "🎨";
  if (n.includes("serviço")) return "🔧";
  if (n.includes("troca")) return "🔄";
  if (n.includes("celular")) return "📱";
  if (n.includes("odontolog")) return "🦷";
  if (n.includes("medic") || n.includes("enferm")) return "🩺";
  if (n.includes("engenharia") || n.includes("exatas")) return "⚙️";
  if (n.includes("arquitetura")) return "🏗️";
  if (n.includes("agronomi") || n.includes("veterinária")) return "🌱";
  if (n.includes("direito")) return "⚖️";
  if (n.includes("comunicação") || n.includes("jornalism")) return "🎭";
  if (n.includes("música") || n.includes("artes")) return "🎵";
  return "🏷️";
}

export default function HeroSection({ categorias = [] }: Props) {
  const [slideAtual, setSlideAtual] = useState(0);
  const [menuCategoriasAberto, setMenuCategoriasAberto] = useState(false);
  const scrollCategoriasRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalSlides = 3;

  // Auto-play suave do carrossel principal
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  // Fechar dropdown de categorias ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuCategoriasAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const rolarCategorias = (direcao: "esq" | "dir") => {
    if (scrollCategoriasRef.current) {
      const scrollAmount = direcao === "dir" ? 280 : -280;
      scrollCategoriasRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const proximoSlide = () => {
    setSlideAtual((prev) => (prev + 1) % totalSlides);
  };

  const slideAnterior = () => {
    setSlideAtual((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Filtra somente categorias PAI (sem parent_id) para a navbar
  const categoriasPai = categorias.filter((c) => !c.parent_id);
  // Exclui "Trocas" da barra de abas (tem atalho dedicado)
  const listaAbas = (categoriasPai.length > 0 ? categoriasPai : CATEGORIAS_PADRAO)
    .filter((c) => !c.nome.toLowerCase().includes("troca"))
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      icone: iconeParaCategoria(c.nome, c.icone),
    }));

  return (
    <div className="w-full bg-[#F7F7F7] pb-4">
      {/* 1. BARRA SUPERIOR DE CATEGORIAS E ATALHOS RÁPIDOS */}
      <section className="bg-white border-b border-gray-200/80 sticky top-[65px] z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 h-14 relative">
          
          {/* Botão Dropdown "Categorias" com ícone de 4 pontos coloridos */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuCategoriasAberto(!menuCategoriasAberto)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition focus:outline-none"
            >
              <span className="grid grid-cols-2 gap-0.5 w-4 h-4 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF385C]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </span>
              <span>Categorias</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  menuCategoriasAberto ? "rotate-180" : ""
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Menu flutuante de categorias */}
            {menuCategoriasAberto && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Todas as Categorias
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  <Link
                    href="/listagem"
                    onClick={() => setMenuCategoriasAberto(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[#FF385C] transition"
                  >
                    <span>🛍️</span>
                    <span className="font-medium">Ver tudo</span>
                  </Link>
                  <Link
                    href="#trocas"
                    onClick={() => setMenuCategoriasAberto(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[#FF385C] transition"
                  >
                    <span>🔄</span>
                    <span className="font-medium">Feira de Trocas</span>
                  </Link>
                  {listaAbas.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/listagem?categoria=${cat.id}`}
                      onClick={() => setMenuCategoriasAberto(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50 hover:text-[#FF385C] transition"
                    >
                      <span>{cat.icone}</span>
                      <span>{cat.nome}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Atalho: Favoritos (Coração) */}
          <Link
            href="/listagem"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition shrink-0"
          >
            <span className="text-[#FF385C] text-sm">❤️</span>
            <span className="font-medium">Favoritos</span>
          </Link>

          {/* Atalho: Cupons (%) */}
          <Link
            href="/listagem"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition shrink-0"
          >
            <span className="text-[#FF385C] font-bold text-xs bg-[#FFE7EB] rounded px-1">%</span>
            <span className="font-medium">Cupons</span>
          </Link>

          {/* Atalho: Seção de Troca (🔄) */}
          <Link
            href="#trocas"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition shrink-0"
          >
            <span className="text-[#FF385C] text-sm">🔄</span>
            <span className="font-medium font-semibold text-[#FF385C]">Trocas</span>
          </Link>

          {/* Separador vertical sutil */}
          <div className="w-px h-6 bg-gray-200 shrink-0 mx-1 hidden sm:block" />

          {/* Abas horizontais de categorias roláveis */}
          <div
            ref={scrollCategoriasRef}
            className="flex-1 flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth pl-2"
          >
            {/* Aba "Tudo" - ativa por padrão */}
            <Link
              href="/listagem"
              className="flex items-center gap-1.5 py-4 border-b-2 border-gray-900 text-gray-900 font-semibold text-sm shrink-0 whitespace-nowrap"
            >
              <span>🛍️</span>
              <span>Tudo</span>
            </Link>

            {/* Aba rápida para Trocas */}
            <Link
              href="#trocas"
              className="flex items-center gap-1.5 py-4 border-b-2 border-transparent hover:border-[#FF385C] text-gray-600 hover:text-[#FF385C] text-sm shrink-0 whitespace-nowrap transition-colors font-medium"
            >
              <span className="text-base">🔄</span>
              <span>Feira de Trocas</span>
            </Link>

            {listaAbas.map((cat) => (
              <Link
                key={cat.id}
                href={`/listagem?categoria=${cat.id}`}
                className="flex items-center gap-1.5 py-4 border-b-2 border-transparent hover:border-[#FF385C] text-gray-600 hover:text-[#FF385C] text-sm shrink-0 whitespace-nowrap transition-colors"
              >
                <span className="text-base">{cat.icone}</span>
                <span>{cat.nome}</span>
              </Link>
            ))}
          </div>

          {/* Botão circular de avançar categorias para a direita */}
          <button
            type="button"
            onClick={() => rolarCategorias("dir")}
            aria-label="Rolar categorias para frente"
            className="w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 shadow-xs shrink-0 transition hover:scale-105 active:scale-95 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </section>

      {/* 2. CARROSSEL HERO PRINCIPAL (BANNER ESCURO ESTILO CENTRAL DE PROTEÇÃO) */}
      <section className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="relative group">
          {/* Seta esquerda flutuante */}
          <button
            type="button"
            onClick={slideAnterior}
            aria-label="Slide anterior"
            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 z-20 transition hover:scale-105 active:scale-95 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Seta direita flutuante */}
          <button
            type="button"
            onClick={proximoSlide}
            aria-label="Próximo slide"
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 z-20 transition hover:scale-105 active:scale-95 focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Conteúdo do Banner com tema escuro e iluminação avermelhada/coral */}
          <div className="w-full bg-gradient-to-r from-[#170910] via-[#240C16] to-[#361120] text-white rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 relative overflow-hidden shadow-xl border border-rose-950/50 min-h-[260px] md:min-h-[290px] flex flex-col justify-between">
            
            {/* Brilho de fundo / iluminação atmosférica */}
            <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#FF385C]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 -bottom-20 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* SLIDE 0: Central de Proteção & Segurança no Campus (Fiel à imagem) */}
            {slideAtual === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center z-10 animate-in fade-in duration-300">
                {/* Lado Esquerdo: Moldura com cantos estilizados */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-[#FFA6B5]">
                      mercadinho
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  <div className="relative border-x-2 border-transparent px-4 py-2 my-1">
                    {/* Cantoneiras estilizadas ┌ ┐ e └ ┘ */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase px-3 py-1">
                      CENTRAL <br />
                      DE PROTEÇÃO
                    </h2>
                  </div>
                </div>

                {/* Centro: Elementos flutuantes de dados/cards */}
                <div className="hidden md:flex md:col-span-4 justify-center items-center relative">
                  {/* Card flutuante 1: Categorias mais buscadas */}
                  <div className="absolute -left-4 top-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-2.5 shadow-lg text-xs w-36 transform -rotate-3 hover:rotate-0 transition">
                    <p className="text-[10px] text-gray-300 font-medium">Mais buscados</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">📚</span>
                      <div>
                        <p className="font-bold text-white leading-tight">Livros & Trocas</p>
                        <p className="text-[9px] text-emerald-400">1.4k buscas</p>
                      </div>
                    </div>
                  </div>

                  {/* Círculo central com avatar/ícone */}
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#FF385C] to-rose-400 p-1 shadow-2xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#180A10] flex flex-col items-center justify-center text-center p-2">
                      <span className="text-3xl">🛡️</span>
                      <span className="text-[10px] font-bold text-rose-200 mt-0.5">100% Campus</span>
                    </div>
                  </div>

                  {/* Card flutuante 2: Monitoramento em tempo real */}
                  <div className="absolute -right-4 bottom-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-2.5 shadow-lg text-xs w-40 transform rotate-2 hover:rotate-0 transition">
                    <p className="text-[10px] text-gray-300 font-medium">Negociação direta</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="w-16 h-4 flex items-end gap-0.5">
                        <span className="w-2 h-2 bg-emerald-400 rounded-xs" />
                        <span className="w-2 h-3 bg-emerald-400 rounded-xs" />
                        <span className="w-2 h-2 bg-emerald-400 rounded-xs" />
                        <span className="w-2 h-4 bg-emerald-400 rounded-xs" />
                        <span className="w-2 h-3.5 bg-emerald-300 rounded-xs" />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400">98% Segura</span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Chamada e Botão CTA Coral */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
                    Segurança para nós não é opcional. Negocie direto com colegas do seu próprio campus.
                  </p>
                  
                  <div className="mt-4 sm:mt-5 flex items-center gap-3">
                    <Link
                      href="/listagem"
                      className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-semibold rounded-full px-6 py-2.5 shadow-lg shadow-[#FF385C]/40 transition hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Dicas de segurança</span>
                    </Link>

                    <Link
                      href="#produtos"
                      className="text-xs text-rose-200 hover:text-white underline underline-offset-2 transition"
                    >
                      Ver produtos
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 1: Crie sua Loja Universitária */}
            {slideAtual === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center z-10 animate-in fade-in duration-300">
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#FFA6B5] mb-1">
                    Empreendedorismo Universitário
                  </span>
                  <div className="relative border-x-2 border-transparent px-4 py-2 my-1">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase px-3 py-1">
                      ABRA SUA LOJA <br />
                      NO CAMPUS
                    </h2>
                  </div>
                </div>

                <div className="hidden md:flex md:col-span-4 justify-center items-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-amber-500 to-[#FF385C] p-1 shadow-2xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#180A10] flex flex-col items-center justify-center text-center p-2">
                      <span className="text-3xl">🏪</span>
                      <span className="text-[10px] font-bold text-amber-300 mt-0.5">Zero Taxas</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
                    Desapegue de livros, eletrônicos ou venda doces e serviços para os colegas da sua faculdade.
                  </p>
                  <div className="mt-4 sm:mt-5">
                    <Link
                      href="/painel"
                      className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-semibold rounded-full px-6 py-2.5 shadow-lg shadow-[#FF385C]/40 transition hover:scale-105 active:scale-95 inline-block"
                    >
                      Criar minha loja grátis
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: Feira de Trocas Universitária & Economia Circular */}
            {slideAtual === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center z-10 animate-in fade-in duration-300">
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 mb-1">
                    Economia Circular
                  </span>
                  <div className="relative border-x-2 border-transparent px-4 py-2 my-1">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase px-3 py-1">
                      FEIRA DE <br />
                      TROCAS
                    </h2>
                  </div>
                </div>

                <div className="hidden md:flex md:col-span-4 justify-center items-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-[#FF385C] p-1 shadow-2xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#180A10] flex flex-col items-center justify-center text-center p-2">
                      <span className="text-3xl">🔄</span>
                      <span className="text-[10px] font-bold text-emerald-300 mt-0.5">Sem Custo</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left">
                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-normal">
                    Troque livros, apostilas, calculadoras e materiais acadêmicos direto com outros estudantes do campus.
                  </p>
                  <div className="mt-4 sm:mt-5 flex items-center gap-3">
                    <Link
                      href="#trocas"
                      className="bg-[#FF385C] hover:bg-[#e0314f] text-white text-xs sm:text-sm font-semibold rounded-full px-6 py-2.5 shadow-lg shadow-[#FF385C]/40 transition hover:scale-105 active:scale-95 inline-block"
                    >
                      Explorar trocas
                    </Link>
                    <Link
                      href="/anunciar"
                      className="text-xs text-rose-200 hover:text-white underline underline-offset-2 transition"
                    >
                      Anunciar troca
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Paginação inferior do banner (barras indicadoras) */}
            <div className="flex items-center justify-center gap-2 pt-4 z-10">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSlideAtual(idx)}
                  aria-label={`Ir para o slide ${idx + 1}`}
                  className={`h-1 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
                    slideAtual === idx
                      ? "w-8 bg-[#FF385C]"
                      : "w-6 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FAIXA SUTIL DE COMUNICADO / PUBLICIDADE (Como na referência) */}
      <section className="max-w-6xl mx-auto px-4 mt-2 mb-2">
        <div className="w-full bg-[#EEEEEE]/80 border border-gray-200/60 rounded-xl py-3 px-4 text-center">
          <p className="text-xs text-gray-500 tracking-wide flex items-center justify-center gap-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF385C]" />
            <span>
              <strong>Dica de Segurança no Campus:</strong> Combine a entrega em locais movimentados durante o dia (RU, Biblioteca ou Centro de Vivência).
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
