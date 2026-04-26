import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import CardProduto from "@/components/CardProduto";
import FiltroBarProdutos from "@/components/FiltroBarProdutos";
import ModalProduto from "@/components/ModalProduto";
import { createServerClient } from "@/lib/supabase";
import {
  getCategorias,
  getInstituicoes,
  getProdutosFiltrados,
} from "@/lib/queries";
import type {
  Categoria,
  Instituicao,
  OrdenacaoProdutos,
  ProdutoListagem,
} from "@/types";

interface Props {
  produtos: ProdutoListagem[];
  categorias: Categoria[];
  instituicoes: Instituicao[];
  q: string;
  ordenacao: OrdenacaoProdutos;
  instituicaoSelecionada?: number;
  categoriaSelecionada?: number;
}

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
  const instituicaoSelecionada = parseId(ctx.query.instituicao);
  const categoriaSelecionada = parseId(ctx.query.categoria);
  const ordenacao = parseOrdenacao(ctx.query.ordenar);

  const supabase = createServerClient(ctx);

  const [produtos, categorias, instituicoes] = await Promise.all([
    getProdutosFiltrados({
      ...(q ? { q } : {}),
      ...(instituicaoSelecionada !== undefined && {
        instituicao_id: instituicaoSelecionada,
      }),
      ...(categoriaSelecionada !== undefined && {
        categoria_id: categoriaSelecionada,
      }),
      ordenar: ordenacao,
    }, supabase),
    getCategorias(supabase),
    getInstituicoes(supabase),
  ]);

  return {
    props: {
      produtos,
      categorias,
      instituicoes,
      q,
      ordenacao,
      ...(instituicaoSelecionada !== undefined && { instituicaoSelecionada }),
      ...(categoriaSelecionada !== undefined && { categoriaSelecionada }),
    },
  };
};

type Chave = "q" | "instituicao" | "categoria" | "ordenar";

export default function ListagemPage({
  produtos,
  categorias,
  instituicoes,
  q,
  ordenacao,
  instituicaoSelecionada,
  categoriaSelecionada,
}: Props) {
  const router = useRouter();
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(
    null
  );

  function aplicarFiltro(chave: Chave, valor: string | undefined) {
    const params = new URLSearchParams();

    const novoQ = chave === "q" ? valor : q;
    const novaInstituicao =
      chave === "instituicao"
        ? valor
        : instituicaoSelecionada !== undefined
          ? String(instituicaoSelecionada)
          : undefined;
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

    const query = params.toString();
    router.push(query ? `/listagem?${query}` : "/listagem");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-gray-800 text-2xl font-semibold">
          Todos os produtos
        </h1>
        <p className="text-gray-500 mt-1">
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
        <p className="text-center text-gray-500 py-16">
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

      <ModalProduto
        produto={produtoAtivo}
        onFechar={() => setProdutoAtivo(null)}
      />
    </div>
  );
}
