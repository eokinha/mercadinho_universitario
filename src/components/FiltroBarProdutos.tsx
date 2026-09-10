import type { FormEvent } from "react";
import { useState } from "react";
import type {
  CategoriaComFilhos,
  Instituicao,
  OrdenacaoProdutos,
} from "@/types";

interface Props {
  instituicoes: Instituicao[];
  categorias: CategoriaComFilhos[];
  q: string;
  instituicaoSelecionada?: number;
  categoriaSelecionada?: number;
  ordenacao: OrdenacaoProdutos;
  onAplicarBusca: (q: string) => void;
  onFiltroInstituicao: (id: number | undefined) => void;
  onFiltroCategoria: (id: number | undefined) => void;
  onOrdenacao: (ordem: OrdenacaoProdutos) => void;
}

const pillSelectClass =
  "rounded-[12px] border border-gray-300 text-sm px-4 py-2 hover:border-gray-800 bg-white text-gray-800 focus:outline-none focus:border-gray-800 transition cursor-pointer";

export default function FiltroBarProdutos({
  instituicoes,
  categorias,
  q,
  instituicaoSelecionada,
  categoriaSelecionada,
  ordenacao,
  onAplicarBusca,
  onFiltroInstituicao,
  onFiltroCategoria,
  onOrdenacao,
}: Props) {
  const [termo, setTermo] = useState(q);
  const [prevQ, setPrevQ] = useState(q);

  if (q !== prevQ) {
    setTermo(q);
    setPrevQ(q);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onAplicarBusca(termo.trim());
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar produtos por nome"
          className="w-full rounded-[12px] border border-gray-300 focus:border-[#FF385C] focus:outline-none px-5 py-2 text-sm text-gray-800 placeholder-gray-400 bg-white text-left"
          aria-label="Buscar produtos por nome"
        />
      </form>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Onde"
          value={instituicaoSelecionada ?? ""}
          onChange={(e) =>
            onFiltroInstituicao(
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className={pillSelectClass}
        >
          <option value="">Onde</option>
          {instituicoes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>

        {/* Seletor de categoria hierárquico com optgroup */}
        <select
          aria-label="Categoria"
          value={categoriaSelecionada ?? ""}
          onChange={(e) =>
            onFiltroCategoria(
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className={pillSelectClass}
        >
          <option value="">Categoria</option>
          {categorias.map((pai) =>
            pai.filhos && pai.filhos.length > 0 ? (
              // Categoria pai com subcategorias → optgroup
              <optgroup key={pai.id} label={`${pai.icone ?? ""} ${pai.nome}`}>
                <option value={pai.id}>Todos em {pai.nome}</option>
                {pai.filhos.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.icone ?? ""} {sub.nome}
                  </option>
                ))}
              </optgroup>
            ) : (
              // Categoria sem filhos → option simples
              <option key={pai.id} value={pai.id}>
                {pai.icone ?? ""} {pai.nome}
              </option>
            )
          )}
        </select>

        <select
          aria-label="Ordenar"
          value={ordenacao}
          onChange={(e) => onOrdenacao(e.target.value as OrdenacaoProdutos)}
          className={pillSelectClass}
        >
          <option value="recentes">Mais recentes</option>
          <option value="preco_asc">Menor preço</option>
          <option value="preco_desc">Maior preço</option>
        </select>
      </div>
    </div>
  );
}
