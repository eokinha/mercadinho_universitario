import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Heart, LayoutGrid, Repeat, ShieldCheck, ShoppingBag } from "lucide-react";
import { iconeParaCategoria } from "@/lib/icones-categoria";
import type { Categoria } from "@/types";

interface Props {
  categorias?: Categoria[];
}

// Categorias padrão caso ainda não haja categorias cadastradas no banco
const CATEGORIAS_PADRAO = [
  { id: 1, nome: "Livros & Material Acadêmico" },
  { id: 2, nome: "Tecnologia & Eletrônicos" },
  { id: 3, nome: "Material de Curso" },
  { id: 4, nome: "Moda & Brechó" },
  { id: 5, nome: "Moradia & Casa" },
  { id: 6, nome: "Alimentação & Bebidas" },
  { id: 7, nome: "Papelaria & Arte" },
  { id: 8, nome: "Serviços" },
];

const SLIDES = [
  {
    rotulo: "Deixa Circular.",
    titulo: "Negocie com quem estuda com você",
    texto: "Só alunos com matrícula verificada anunciam. Combine a entrega no seu campus, direto com o colega.",
    cta: { href: "/listagem", texto: "Explorar anúncios" },
    Icone: ShieldCheck,
  },
  {
    rotulo: "Economia comunitária",
    titulo: "O que você não usa, outro aluno precisa",
    texto: "Livros, calculadoras, jalecos e materiais de curso circulam entre colegas em vez de ficarem parados.",
    cta: { href: "/anunciar", texto: "Anunciar um item" },
    Icone: ShoppingBag,
  },
  {
    rotulo: "Modo Trocar",
    titulo: "Troque material com outros alunos",
    texto: "Anuncie o que você tem e diga o que procura. Se houver diferença em dinheiro, vocês combinam entre si.",
    cta: { href: "#trocas", texto: "Ver trocas" },
    Icone: Repeat,
  },
];

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";

export default function HeroSection({ categorias = [] }: Props) {
  const [slideAtual, setSlideAtual] = useState(0);
  const [menuCategoriasAberto, setMenuCategoriasAberto] = useState(false);
  const scrollCategoriasRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalSlides = SLIDES.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideAtual((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuCategoriasAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const rolarCategorias = () => {
    scrollCategoriasRef.current?.scrollBy({ left: 280, behavior: "smooth" });
  };

  // Só categorias PAI; "Trocas" tem atalho próprio
  const categoriasPai = categorias.filter((c) => !c.parent_id);
  const listaAbas = (categoriasPai.length > 0 ? categoriasPai : CATEGORIAS_PADRAO)
    .filter((c) => !c.nome.toLowerCase().includes("troca"))
    .map((c) => ({ id: c.id, nome: c.nome, Icone: iconeParaCategoria(c.nome) }));

  const slide = SLIDES[slideAtual];

  return (
    <div className="w-full bg-pagina pb-4">
      {/* Barra de categorias */}
      <section className="bg-superficie border-b border-borda sticky top-[69px] z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 h-14 relative">
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuCategoriasAberto(!menuCategoriasAberto)}
              aria-expanded={menuCategoriasAberto}
              className={`flex items-center gap-2 px-3 min-h-[44px] rounded-controle text-sm font-semibold text-tinta hover:bg-pagina transition ${FOCO}`}
            >
              <LayoutGrid size={18} strokeWidth={1.75} className="text-petroleo" aria-hidden="true" />
              <span>Categorias</span>
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className={`text-tinta-sutil transition-transform duration-200 ${menuCategoriasAberto ? "rotate-180" : ""}`}
              />
            </button>

            {menuCategoriasAberto && (
              <div className="absolute left-0 mt-2 w-64 bg-superficie border border-borda rounded-card shadow-flutuante py-2 z-50">
                <div className="max-h-72 overflow-y-auto py-1">
                  <Link
                    href="/listagem"
                    onClick={() => setMenuCategoriasAberto(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-tinta hover:bg-petroleo-50 hover:text-petroleo transition"
                  >
                    <ShoppingBag size={18} strokeWidth={1.75} aria-hidden="true" />
                    Ver tudo
                  </Link>
                  <Link
                    href="#trocas"
                    onClick={() => setMenuCategoriasAberto(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-tinta hover:bg-troca-50 hover:text-troca-texto transition"
                  >
                    <Repeat size={18} strokeWidth={1.75} aria-hidden="true" />
                    Trocas
                  </Link>
                  {listaAbas.map(({ id, nome, Icone }) => (
                    <Link
                      key={id}
                      href={`/listagem?categoria=${id}`}
                      onClick={() => setMenuCategoriasAberto(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-tinta hover:bg-petroleo-50 hover:text-petroleo transition"
                    >
                      <Icone size={18} strokeWidth={1.75} aria-hidden="true" />
                      {nome}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/painel/favoritos"
            className={`hidden sm:flex items-center gap-1.5 px-3 min-h-[44px] rounded-controle text-sm font-semibold text-tinta hover:bg-pagina transition shrink-0 ${FOCO}`}
          >
            <Heart size={18} strokeWidth={1.75} className="text-perigo" aria-hidden="true" />
            Favoritos
          </Link>

          <div className="w-px h-6 bg-borda shrink-0 mx-1 hidden sm:block" />

          <div
            ref={scrollCategoriasRef}
            className="flex-1 flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth pl-2"
          >
            <Link
              href="#trocas"
              className="flex items-center gap-1.5 py-4 border-b-2 border-transparent hover:border-troca text-troca-texto text-sm font-semibold shrink-0 whitespace-nowrap transition-colors"
            >
              <Repeat size={16} strokeWidth={1.75} aria-hidden="true" />
              Trocas
            </Link>

            {listaAbas.map(({ id, nome, Icone }) => (
              <Link
                key={id}
                href={`/listagem?categoria=${id}`}
                className="flex items-center gap-1.5 py-4 border-b-2 border-transparent hover:border-petroleo text-tinta-suave text-sm shrink-0 whitespace-nowrap transition-colors"
              >
                <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
                {nome}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={rolarCategorias}
            aria-label="Mostrar mais categorias"
            className={`w-11 h-11 rounded-pill border border-borda-controle bg-superficie hover:border-petroleo flex items-center justify-center text-tinta-suave shrink-0 transition ${FOCO}`}
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSlideAtual((prev) => (prev - 1 + totalSlides) % totalSlides)}
            aria-label="Slide anterior"
            className={`absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-superficie shadow-flutuante border border-borda flex items-center justify-center text-petroleo z-20 transition ${FOCO}`}
          >
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setSlideAtual((prev) => (prev + 1) % totalSlides)}
            aria-label="Próximo slide"
            className={`absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-superficie shadow-flutuante border border-borda flex items-center justify-center text-petroleo z-20 transition ${FOCO}`}
          >
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <div
            className="w-full bg-petroleo-900 text-white rounded-card p-6 sm:p-10 min-h-[260px] flex flex-col justify-between gap-6"
            aria-live="polite"
          >
            <div key={slideAtual} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 flex flex-col gap-3 text-center md:text-left">
                <span className="text-sm font-semibold text-white/80">{slide.rotulo}</span>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">{slide.titulo}</h2>
                <p className="text-base text-white/80 leading-relaxed max-w-xl mx-auto md:mx-0">{slide.texto}</p>
                <div className="mt-2">
                  <Link
                    href={slide.cta.href}
                    className="inline-flex items-center gap-2 bg-superficie text-petroleo font-semibold rounded-controle px-4 py-2.5 min-h-[44px] hover:bg-petroleo-50 transition focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    {slide.cta.texto}
                    <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="hidden md:flex md:col-span-4 justify-center">
                <div className="w-32 h-32 rounded-pill bg-petroleo flex items-center justify-center">
                  <slide.Icone size={56} strokeWidth={1.75} aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.titulo}
                  type="button"
                  onClick={() => setSlideAtual(idx)}
                  aria-label={`Ir para o slide ${idx + 1}`}
                  aria-current={slideAtual === idx}
                  className="h-11 px-1 flex items-center focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span
                    className={`block h-1 rounded-pill transition-all duration-300 ${
                      slideAtual === idx ? "w-8 bg-white" : "w-6 bg-white/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dica de segurança */}
      <section className="max-w-6xl mx-auto px-4 mt-2 mb-2">
        <div className="w-full bg-petroleo-50 rounded-controle py-3 px-4 flex items-center justify-center gap-2 text-sm text-petroleo">
          <ShieldCheck size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Dica de segurança:</strong> combine a entrega em locais movimentados
            durante o dia, como o RU, a biblioteca ou o centro de vivência.
          </p>
        </div>
      </section>
    </div>
  );
}
