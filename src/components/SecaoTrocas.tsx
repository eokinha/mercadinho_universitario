import { useState, useRef } from "react";
import Link from "next/link";
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

  return (
    <section
      id="trocas"
      className="py-12 bg-linear-to-b from-[#FBFBFB] via-[#FFF8F9] to-white border-t border-gray-200/80 scroll-mt-20 relative overflow-hidden"
    >
      {/* Elementos visuais de iluminação e sustentabilidade */}
      <div className="absolute -top-32 right-10 w-96 h-96 bg-[#FF385C]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. ÁREA DE MANIFESTO: ECONOMIA CIRCULAR NO CAMPUS */}
      <div className="max-w-6xl mx-auto px-4 mb-10 relative z-10">
        <div className="bg-white border border-gray-200/90 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
          {/* Brilho decorativo sutil de fundo */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-64 h-64 bg-[#FF385C]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Texto de Impacto */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
                <span className="text-base leading-none">♻️</span>
                <span>Economia Circular no Campus</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                Não compre novo. <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF385C] to-rose-600">
                  Faça o campus circular.
                </span>
              </h2>

              <p className="text-gray-600 text-sm sm:text-base mt-3 leading-relaxed">
                O <strong>Mercadinho Universitário</strong> vai muito além da compra e venda.
                Livros que você já usou, apostilas de matérias cursadas, calculadoras e jalecos
                têm enorme valor para quem está começando o semestre. Ao trocar, você economiza 100%,
                desocupa espaço e fortalece a comunidade acadêmica.
              </p>

              {/* Badges de Destaque / Estatísticas */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 w-full pt-4 border-t border-gray-100">
                <div className="bg-gray-50/80 rounded-xl p-3 text-center border border-gray-100">
                  <span className="text-lg sm:text-xl font-black text-emerald-600 block">
                    R$ 0
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500 font-medium">
                    Custo de troca
                  </span>
                </div>
                <div className="bg-gray-50/80 rounded-xl p-3 text-center border border-gray-100">
                  <span className="text-lg sm:text-xl font-black text-[#FF385C] block">
                    +300
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500 font-medium">
                    Trocas no campus
                  </span>
                </div>
                <div className="bg-gray-50/80 rounded-xl p-3 text-center border border-gray-100">
                  <span className="text-lg sm:text-xl font-black text-gray-900 block">
                    100%
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500 font-medium">
                    Sem taxas
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Pilares Visuais da Economia Circular */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="bg-linear-to-r from-emerald-50/50 to-white border border-emerald-100 rounded-2xl p-4 flex items-start gap-3.5 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xl font-bold">
                  💰
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Economia Real de 100%
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                    Livros de R$ 300 e calculadoras caras podem ser obtidos sem tirar 1 real da mesada ou bolsa.
                  </p>
                </div>
              </div>

              <div className="bg-linear-to-r from-rose-50/50 to-white border border-rose-100 rounded-2xl p-4 flex items-start gap-3.5 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-[#FFE7EB] text-[#FF385C] flex items-center justify-center shrink-0 text-xl font-bold">
                  🌱
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Sustentabilidade Universitária
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                    Dê vida útil estendida a apostilas e materiais, evitando o descarte no lixo das repúblicas.
                  </p>
                </div>
              </div>

              <div className="bg-linear-to-r from-blue-50/50 to-white border border-blue-100 rounded-2xl p-4 flex items-start gap-3.5 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xl font-bold">
                  🤝
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Comunidade & Apoio Mútuo
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                    Quem já passou pela matéria ajuda os calouros com materiais recomendados e dicas valiosas.
                  </p>
                </div>
              </div>

              {/* Botão de Anunciar Item para Troca */}
              <div className="pt-2">
                <Link
                  href="/minha-loja/produtos/novo"
                  className="w-full bg-[#FF385C] hover:bg-[#e0314f] text-white text-sm font-semibold rounded-xl py-3 px-4 shadow-md shadow-[#FF385C]/25 transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  <span>Anunciar meu desapego para troca</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEÇÃO DE EXIBIÇÃO DE PRODUTOS PARA TROCA (FORMATO IDÊNTICO AO DESTAQUE) */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        {/* Header estilo "Em alta no seu campus - destaques" */}
        <header className="flex items-baseline justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-gray-900 text-xl sm:text-2xl font-bold tracking-tight">
                Trocas no seu campus - &quot;desapegos a custo zero&quot;
              </h2>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Livros, calculadoras e materiais acadêmicos disponíveis para troca direta hoje.
            </p>
          </div>
          <Link
            href="/listagem"
            className="text-[#FF385C] hover:text-[#e0314f] text-sm font-semibold hover:underline hidden sm:inline-block"
          >
            Ver todas as trocas →
          </Link>
        </header>

        {/* Filtros rápidos por categoria acadêmica */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1 shrink-0">
            Filtrar:
          </span>
          <button
            type="button"
            onClick={() => setFiltroAtivo("todos")}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              filtroAtivo === "todos"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todos os itens ({itensExibidos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAtivo("livros")}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              filtroAtivo === "livros"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            📚 Livros & Apostilas
          </button>
          <button
            type="button"
            onClick={() => setFiltroAtivo("tech")}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              filtroAtivo === "tech"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            📱 Calculadoras & Tech
          </button>
          <button
            type="button"
            onClick={() => setFiltroAtivo("materiais")}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold shrink-0 transition ${
              filtroAtivo === "materiais"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🎨 Materiais & Jalecos
          </button>
        </div>
      </div>

      {/* Carrossel de Produtos de Troca com Setas Circulares */}
      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="relative group">
          {/* Seta circular para rolar horizontalmente à esquerda (idêntica ao destaque) */}
          <button
            type="button"
            onClick={() => rolarProdutos("esq")}
            aria-label="Rolar trocas para a esquerda"
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 z-20 transition hover:scale-105 active:scale-95 focus:outline-none"
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

          {/* Seta circular para rolar horizontalmente à direita (idêntica ao destaque) */}
          <button
            type="button"
            onClick={() => rolarProdutos("dir")}
            aria-label="Rolar trocas para a direita"
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 z-20 transition hover:scale-105 active:scale-95 focus:outline-none"
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

          {/* Linha horizontal com os cards de produtos com scroll suave e snap */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1 snap-x snap-mandatory"
          >
            {itensFiltrados.map((produto) => (
              <CardProduto
                key={produto.id}
                produto={produto}
                onAbrir={onAbrirProduto}
                largura="fixa"
                tagBadge="Aceita Troca"
              />
            ))}

            {/* Card CTA de Anunciar Item no Final do Carrossel */}
            <div className="w-48 sm:w-52 shrink-0 snap-start bg-gradient-to-br from-emerald-50 via-white to-rose-50 border-2 border-dashed border-emerald-300 rounded-2xl p-5 flex flex-col justify-center items-center text-center hover:border-emerald-500 transition group">
              <span className="text-4xl mb-2 group-hover:scale-110 transition duration-200">
                🔄
              </span>
              <h4 className="font-bold text-gray-900 text-sm">
                Tem algo para trocar?
              </h4>
              <p className="text-xs text-gray-500 mt-1 mb-4 leading-snug">
                Cadastre livros ou equipamentos parados e combine com estudantes do campus.
              </p>
              <Link
                href="/minha-loja/produtos/novo"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs transition"
              >
                Anunciar para troca
              </Link>
            </div>
          </div>
        </div>

        {/* Botões de Ação Inferiores (semelhante ao catálogo completo) */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/minha-loja/produtos/novo"
            className="bg-[#FF385C] text-white rounded-xl hover:bg-[#e0314f] transition px-7 py-3 font-semibold text-sm shadow-sm flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            <span>Anunciar item para troca</span>
          </Link>
          <Link
            href="/listagem"
            className="border border-gray-300 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition px-7 py-3 font-semibold text-sm shadow-xs"
          >
            Ver catálogo completo
          </Link>
        </div>

        {/* 3. CARTÕES DE PASSOS: COMO FUNCIONA A TROCA NO CAMPUS */}
        <div className="mt-12 pt-8 border-t border-gray-200/80">
          <h3 className="text-center text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">
            Como funciona a troca no Mercadinho?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-[#FFE7EB] text-[#FF385C] flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h4 className="font-bold text-gray-900 text-sm">
                  Publique o que não usa
                </h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tire fotos de livros, calculadoras ou materiais acadêmicos que você não precisa mais neste semestre.
              </p>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h4 className="font-bold text-gray-900 text-sm">
                  Combine no WhatsApp
                </h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Converse diretamente com o colega de faculdade, veja os itens disponíveis e acordem uma troca justa.
              </p>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h4 className="font-bold text-gray-900 text-sm">
                  Encontre no campus
                </h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Faça a troca com total segurança em locais movimentados durante o dia (Biblioteca, RU ou Centro de Vivência).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
