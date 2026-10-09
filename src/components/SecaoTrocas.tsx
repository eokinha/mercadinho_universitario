import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Leaf, Repeat, Users, Wallet } from "lucide-react";
import CardProduto from "@/components/CardProduto";
import type { ProdutoListagem } from "@/types";

interface Props {
  produtos?: ProdutoListagem[];
  onAbrirProduto: (produto: ProdutoListagem) => void;
}

// Itens demonstrativos de troca para quando a base não tiver produtos suficientes
const ITENS_DEMO_TROCA: ProdutoListagem[] = [
  {
    id: -101,
    nome: "Cálculo James Stewart Vol. 1 (8ª Ed.)",
    descricao:
      "Livro em excelente estado de conservação, sem rasuras. Troco por livro de Física Halliday Vol. 1 ou Álgebra Linear.",
    preco: 0,
    imagem_url:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80",
    loja_id: 1,
    loja_nome: "Desapego Poli",
    loja_descricao: "Estudante de Engenharia trocando materiais do ciclo básico",
    loja_contato: "11999999999",
    loja_avatar_url: null,
    categoria_id: 4,
    categoria_nome: "Livros & Apostilas",
    destaque: true,
    aceita_troca: true,
  },
  {
    id: -102,
    nome: "Calculadora Científica Casio FX-82MS",
    descricao:
      "Funcionando perfeitamente com bateria nova. Troco por mouse sem fio ou materiais de desenho técnico.",
    preco: 0,
    imagem_url:
      "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=500&auto=format&fit=crop&q=80",
    loja_id: 1,
    loja_nome: "Gabi - Ciências da Comp.",
    loja_descricao: "Buscando materiais para matérias do 3º semestre",
    loja_contato: "11999999999",
    loja_avatar_url: null,
    categoria_id: 2,
    categoria_nome: "Calculadoras & Tech",
    destaque: true,
    aceita_troca: true,
  },
  {
    id: -103,
    nome: "Apostila Resumida + Exercícios Resolvidos Física I",
    descricao:
      "Material completo encadernado com 150 exercícios resolvidos passo a passo. Troco por apostila de Cálculo II ou Química Geral.",
    preco: 0,
    imagem_url:
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500&auto=format&fit=crop&q=80",
    loja_id: 1,
    loja_nome: "Monitoria de Física",
    loja_descricao: "Materiais de apoio e trocas de estudos",
    loja_contato: "11999999999",
    loja_avatar_url: null,
    categoria_id: 4,
    categoria_nome: "Livros & Apostilas",
    destaque: true,
    aceita_troca: true,
  },
  {
    id: -104,
    nome: "Jaleco Branco 100% Algodão Manga Longa (Tam. M)",
    descricao:
      "Usado apenas um semestre nas aulas de laboratório. Higienizado e impecável. Troco por kit de estiletes/papelaria ou livro de Biologia.",
    preco: 0,
    imagem_url:
      "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80",
    loja_id: 1,
    loja_nome: "Matheus - Farmácia",
    loja_descricao: "Desapego de itens de matérias já cursadas",
    loja_contato: "11999999999",
    loja_avatar_url: null,
    categoria_id: 6,
    categoria_nome: "Materiais de Lab",
    destaque: true,
    aceita_troca: true,
  },
  {
    id: -105,
    nome: "Teclado Mecânico Compacto Switch Blue",
    descricao:
      "Pouquíssimo uso, cabo USB-C destacável. Troco por fone de ouvido ou headset para estudos na biblioteca.",
    preco: 0,
    imagem_url:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80",
    loja_id: 1,
    loja_nome: "Lucas - Sistemas",
    loja_descricao: "Trocando periféricos por itens de estudo",
    loja_contato: "11999999999",
    loja_avatar_url: null,
    categoria_id: 2,
    categoria_nome: "Calculadoras & Tech",
    destaque: true,
    aceita_troca: true,
  },
];

export default function SecaoTrocas({ produtos = [], onAbrirProduto }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filtroAtivo, setFiltroAtivo] = useState("todos");

  const rolarProdutos = (direcao: "esq" | "dir") => {
    if (scrollRef.current) {
      const scrollAmount = direcao === "dir" ? 360 : -360;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Se houver produtos no banco, mescla ou utiliza eles; senão, usa a lista demonstrativa
  const itensExibidos =
    produtos.length >= 3
      ? produtos
      : [...produtos, ...ITENS_DEMO_TROCA.slice(0, 5 - produtos.length)];

  // Filtro por tipo rápido
  const itensFiltrados = itensExibidos.filter((p) => {
    if (filtroAtivo === "todos") return true;
    if (filtroAtivo === "livros")
      return (
        p.categoria_nome.toLowerCase().includes("livro") ||
        p.nome.toLowerCase().includes("livro") ||
        p.nome.toLowerCase().includes("cálculo") ||
        p.nome.toLowerCase().includes("apostila")
      );
    if (filtroAtivo === "tech")
      return (
        p.categoria_nome.toLowerCase().includes("tech") ||
        p.categoria_nome.toLowerCase().includes("comp") ||
        p.nome.toLowerCase().includes("calculadora") ||
        p.nome.toLowerCase().includes("teclado")
      );
    if (filtroAtivo === "materiais")
      return (
        p.categoria_nome.toLowerCase().includes("papel") ||
        p.categoria_nome.toLowerCase().includes("lab") ||
        p.nome.toLowerCase().includes("jaleco")
      );
    return true;
  });

  const FILTROS = [
    { id: "todos", rotulo: `Todos (${itensExibidos.length})` },
    { id: "livros", rotulo: "Livros e apostilas" },
    { id: "tech", rotulo: "Calculadoras e tecnologia" },
    { id: "materiais", rotulo: "Materiais e jalecos" },
  ];

  const PILARES = [
    { Icone: Wallet, titulo: "Economize", texto: "Livros e calculadoras caros circulam entre colegas em vez de serem comprados novos." },
    { Icone: Leaf, titulo: "Menos descarte", texto: "Apostilas e materiais ganham mais vida útil em vez de irem para o lixo." },
    { Icone: Users, titulo: "Apoio entre colegas", texto: "Quem já passou pela matéria repassa o material para quem está começando." },
  ];

  const PASSOS = [
    { titulo: "Publique o que não usa", texto: "Fotografe livros, calculadoras ou materiais que você não precisa mais neste semestre." },
    { titulo: "Combine no WhatsApp", texto: "Fale direto com o colega e acertem uma troca justa. Diferença em dinheiro, se houver, fica entre vocês." },
    { titulo: "Encontre no campus", texto: "Faça a troca em locais movimentados durante o dia, como a biblioteca, o RU ou o centro de vivência." },
  ];

  const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";

  return (
    <section id="trocas" className="py-12 bg-superficie border-t border-borda scroll-mt-32">
      {/* Manifesto */}
      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="bg-troca-50 rounded-card p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-pill text-xs font-semibold px-2.5 py-1 bg-superficie text-troca-texto">
              <Repeat size={14} strokeWidth={1.75} aria-hidden="true" />
              Modo Trocar
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-petroleo tracking-tight leading-tight">
              Não compre novo. Deixa Circular.
            </h2>
            <p className="text-tinta-suave text-base leading-relaxed">
              Livros que você já usou, apostilas de matérias cursadas, calculadoras e jalecos têm valor para quem
              está começando o semestre. Trocando, você libera espaço e ajuda a comunidade do seu campus.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3">
            {PILARES.map(({ Icone, titulo, texto }) => (
              <div key={titulo} className="bg-superficie rounded-card p-4 flex items-start gap-3">
                <span className="w-10 h-10 rounded-controle bg-troca-50 text-troca-texto flex items-center justify-center shrink-0">
                  <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-tinta text-sm">{titulo}</h3>
                  <p className="text-sm text-tinta-suave mt-0.5 leading-snug">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Itens para troca */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <header className="flex items-baseline justify-between mb-4 gap-4">
          <div>
            <h2 className="text-petroleo text-xl sm:text-2xl font-bold tracking-tight">Trocas no seu campus</h2>
            <p className="text-tinta-suave text-sm mt-0.5">
              Livros, calculadoras e materiais disponíveis para troca direta.
            </p>
          </div>
          <Link href="/listagem" className={`text-petroleo text-sm font-semibold hover:underline hidden sm:inline-block rounded-controle ${FOCO}`}>
            Ver todas as trocas
          </Link>
        </header>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Filtrar trocas">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroAtivo(f.id)}
              aria-pressed={filtroAtivo === f.id}
              className={`px-4 min-h-[44px] rounded-pill text-sm font-semibold shrink-0 transition border ${FOCO} ${
                filtroAtivo === f.id
                  ? "bg-troca border-troca text-white"
                  : "bg-superficie border-borda-controle text-tinta-suave hover:border-troca"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => rolarProdutos("esq")}
            aria-label="Rolar trocas para a esquerda"
            className={`absolute -left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-superficie shadow-flutuante border border-borda flex items-center justify-center text-petroleo z-20 transition ${FOCO}`}
          >
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => rolarProdutos("dir")}
            aria-label="Rolar trocas para a direita"
            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-pill bg-superficie shadow-flutuante border border-borda flex items-center justify-center text-petroleo z-20 transition ${FOCO}`}
          >
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>

          <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1 snap-x snap-mandatory">
            {itensFiltrados.map((produto) => (
              <CardProduto key={produto.id} produto={produto} onAbrir={onAbrirProduto} largura="fixa" />
            ))}

            <div className="w-48 sm:w-52 shrink-0 snap-start bg-troca-50 border-2 border-dashed border-troca rounded-card p-5 flex flex-col justify-center items-center text-center gap-2">
              <Repeat size={32} strokeWidth={1.75} className="text-troca-texto" aria-hidden="true" />
              <h4 className="font-semibold text-tinta text-sm">Tem algo para trocar?</h4>
              <p className="text-sm text-tinta-suave leading-snug">
                Anuncie livros ou equipamentos parados e combine com alunos do campus.
              </p>
              <Link
                href="/anunciar"
                className={`w-full mt-2 bg-troca text-white font-semibold text-sm min-h-[44px] inline-flex items-center justify-center rounded-controle transition ${FOCO}`}
              >
                Anunciar para troca
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/listagem"
            className={`bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle px-4 py-2.5 min-h-[44px] inline-flex items-center font-semibold text-sm transition ${FOCO}`}
          >
            Ver todos os anúncios
          </Link>
        </div>

        {/* Como funciona */}
        <div className="mt-12 pt-8 border-t border-borda">
          <h3 className="text-center text-lg font-bold text-petroleo mb-6">Como funciona a troca na Circular</h3>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="bg-superficie border border-borda rounded-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-pill bg-petroleo-50 text-petroleo flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </span>
                  <h4 className="font-semibold text-tinta text-sm">{passo.titulo}</h4>
                </div>
                <p className="text-sm text-tinta-suave leading-relaxed">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
