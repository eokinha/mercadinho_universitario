import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CardProduto from "@/components/CardProduto";
import FiltroBarProdutos from "@/components/FiltroBarProdutos";
import ModalProduto from "@/components/ModalProduto";
import { createServerClient } from "@/lib/supabase";
import {
  getCategoriasArvore,
  getInstituicoes,
  getMeuUsuario,
  getProdutosFiltrados,
} from "@/lib/queries";
import type {
  CategoriaComFilhos,
  Instituicao,
  OrdenacaoProdutos,
  ProdutoListagem,
} from "@/types";

interface Props {
  produtos: ProdutoListagem[];
  categorias: CategoriaComFilhos[];
  instituicoes: Instituicao[];
  q: string;
  ordenacao: OrdenacaoProdutos;
  instituicaoSelecionada?: number;
  categoriaSelecionada?: number;
  pagina: number;
  temMais: boolean;
}

const POR_PAGINA = 40;

const ORDENACOES_VALIDAS: ReadonlySet<OrdenacaoProdutos> = new Set([
  "recentes",
  "preco_asc",
  "preco_desc",
]);

function parseId(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseOrdenacao(value: string | string[] | undefined): OrdenacaoProdutos {
  if (typeof value === "string" && ORDENACOES_VALIDAS.has(value as OrdenacaoProdutos)) {
    return value as OrdenacaoProdutos;
  }
  return "recentes";
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const q =
    typeof ctx.query.q === "string" ? ctx.query.q.trim() : "";
  const categoriaSelecionada = parseId(ctx.query.categoria);
  const ordenacao = parseOrdenacao(ctx.query.ordenar);
  const pagina = parseId(ctx.query.pagina) ?? 1;

  const supabase = createServerClient(ctx);

  // Sem filtro na URL, abre no campus do aluno logado; "todas" mostra todos os campi
  let instituicaoSelecionada = parseId(ctx.query.instituicao);
  if (ctx.query.instituicao === undefined) {
    const usuario = await getMeuUsuario(supabase).catch(() => null);
    instituicaoSelecionada = usuario?.instituicoes_id ? Number(usuario.instituicoes_id) : undefined;
  }

  const [resultado, categorias, instituicoes] = await Promise.all([
    getProdutosFiltrados({
      ...(q ? { q } : {}),
      ...(instituicaoSelecionada !== undefined && {
        instituicao_id: instituicaoSelecionada,
      }),
      ...(categoriaSelecionada !== undefined && {
        categoria_id: categoriaSelecionada,
      }),
      ordenar: ordenacao,
      limite: POR_PAGINA + 1,
      offset: (pagina - 1) * POR_PAGINA,
    }, supabase),
    getCategoriasArvore(supabase),
    getInstituicoes(supabase),
  ]);

  return {
    props: {
      produtos: resultado.slice(0, POR_PAGINA),
      temMais: resultado.length > POR_PAGINA,
      pagina,
      categorias,
      instituicoes,
      q,
      ordenacao,
      ...(instituicaoSelecionada !== undefined && { instituicaoSelecionada }),
      ...(categoriaSelecionada !== undefined && { categoriaSelecionada }),
    },
  };
};

type Chave = "q" | "instituicao" | "categoria" | "ordenar" | "pagina";

export default function ListagemPage({
  produtos,
  categorias,
  instituicoes,
  q,
  ordenacao,
  instituicaoSelecionada,
  categoriaSelecionada,
  pagina,
  temMais,
}: Props) {
  const router = useRouter();
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(
    null
  );

  function urlComFiltro(chave: Chave, valor: string | undefined): string {
    const params = new URLSearchParams();

    const novoQ = chave === "q" ? valor : q;
    // Instituição sempre explícita na URL, senão a página volta ao campus do aluno
    const novaInstituicao =
      (chave === "instituicao"
        ? valor
        : instituicaoSelecionada !== undefined
          ? String(instituicaoSelecionada)
          : undefined) ?? "todas";
    const novaCategoria =
      chave === "categoria"
        ? valor
        : categoriaSelecionada !== undefined
          ? String(categoriaSelecionada)
          : undefined;
    const novaOrdenacao =
      chave === "ordenar" ? valor : ordenacao !== "recentes" ? ordenacao : undefined;

    if (novoQ) params.set("q", novoQ);
    if (novaInstituicao) params.set("instituicao", novaInstituicao);
    if (novaCategoria) params.set("categoria", novaCategoria);
    if (novaOrdenacao) params.set("ordenar", novaOrdenacao);
    // Mudar qualquer filtro volta para a primeira página
    if (chave === "pagina" && valor && valor !== "1") params.set("pagina", valor);

    return `/listagem?${params.toString()}`;
  }

  function aplicarFiltro(chave: Chave, valor: string | undefined) {
    router.push(urlComFiltro(chave, valor));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-petroleo text-2xl font-bold">
          Todos os produtos
        </h1>
        <p className="text-tinta-suave mt-1">
          Filtre por instituição, categoria ou ordene como preferir.
        </p>
      </header>

      <div className="mb-6">
        <FiltroBarProdutos
          instituicoes={instituicoes}
          categorias={categorias}
          q={q}
          {...(instituicaoSelecionada !== undefined && {
            instituicaoSelecionada,
          })}
          {...(categoriaSelecionada !== undefined && { categoriaSelecionada })}
          ordenacao={ordenacao}
          onAplicarBusca={(novo) => aplicarFiltro("q", novo || undefined)}
          onFiltroInstituicao={(id) =>
            aplicarFiltro("instituicao", id ? String(id) : undefined)
          }
          onFiltroCategoria={(id) =>
            aplicarFiltro("categoria", id ? String(id) : undefined)
          }
          onOrdenacao={(ordem) =>
            aplicarFiltro("ordenar", ordem === "recentes" ? undefined : ordem)
          }
        />
      </div>

      {produtos.length === 0 ? (
        <p className="text-center text-tinta-suave py-16">
          Nenhum produto encontrado.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {produtos.map((produto) => (
            <CardProduto
              key={produto.id}
              produto={produto}
              onAbrir={setProdutoAtivo}
              largura="fluida"
            />
          ))}
        </div>
      )}

      {(pagina > 1 || temMais) && (
        <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-3">
          {pagina > 1 && (
            <Link
              href={urlComFiltro("pagina", String(pagina - 1))}
              className="inline-flex items-center gap-1 min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
            >
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
              Anterior
            </Link>
          )}
          <span className="text-sm text-tinta-suave">Página {pagina}</span>
          {temMais && (
            <Link
              href={urlComFiltro("pagina", String(pagina + 1))}
              className="inline-flex items-center gap-1 min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
            >
              Próxima
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}

      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />
    </div>
  );
}
