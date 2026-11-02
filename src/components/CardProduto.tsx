import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronRight, Heart, ImageOff, Repeat, ShoppingBag } from "lucide-react";
import AvisoFavorito, { type TipoAvisoFavorito } from "@/components/AvisoFavorito";
import SeloVerificado from "@/components/SeloVerificado";
import { caminhoAnuncio } from "@/lib/compartilhar";
import { definirFavorito } from "@/lib/queries";
import type { ProdutoListagem } from "@/types";

interface Props {
  produto: ProdutoListagem;
  largura?: "fixa" | "fluida";
  favoritado?: boolean; // estado inicial (ids vindos de getMeusFavoritosIds na página)
  podeFavoritar?: boolean; // false em anúncio de outro campus: o banco não aceita
  onFavoritoAlterado?: (produtoId: number, favoritado: boolean) => void;
}

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

// O card leva à página do anúncio (/anuncio/{id}-{nome})
export default function CardProduto({
  produto,
  largura = "fixa",
  favoritado = false,
  podeFavoritar = true,
  onFavoritoAlterado,
}: Props) {
  const [favorito, setFavorito] = useState(favoritado);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<TipoAvisoFavorito | null>(null);
  const [chaveAviso, setChaveAviso] = useState(0);
  const limparAviso = useCallback(() => setAviso(null), []);
  const href = caminhoAnuncio(produto.id, produto.nome);

  const soTroca = produto.preco === 0;
  const aceitaTroca = produto.aceita_troca || soTroca;

  const larguraClasses = largura === "fluida" ? "w-full" : "w-48 sm:w-52 shrink-0 snap-start";

  // Muda na hora e grava no banco; se o banco recusar, volta ao estado anterior
  async function handleFavoritar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (salvando) return;
    const novo = !favorito;
    setFavorito(novo);
    setSalvando(true);
    try {
      await definirFavorito(produto.id, novo);
      setAviso(novo ? "salvo" : "removido");
      onFavoritoAlterado?.(produto.id, novo);
    } catch {
      setFavorito(!novo);
      setAviso("erro");
    } finally {
      setSalvando(false);
      setChaveAviso((c) => c + 1);
    }
  }

  return (
    <article
      className={`${larguraClasses} group bg-superficie border border-borda rounded-card overflow-hidden hover:shadow-hover transition duration-200 flex flex-col`}
    >
      <div className="relative">
        <Link
          href={href}
          aria-label={produto.nome}
          className="w-full text-left flex flex-col focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          <div className="aspect-[4/3] sm:aspect-square bg-pagina overflow-hidden relative">
            {produto.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="w-full h-full object-cover group-transition duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-tinta-sutil">
                <ImageOff size={32} strokeWidth={1.75} aria-hidden="true" />
              </div>
            )}
          </div>
        </Link>

        {podeFavoritar && (
          <button
            type="button"
            onClick={handleFavoritar}
            disabled={salvando}
            aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            aria-pressed={favorito}
            className="absolute top-2 right-2 w-11 h-11 rounded-pill bg-superficie/90 flex items-center justify-center text-tinta-suave hover:text-perigo transition z-10 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
          >
            <Heart
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              className={favorito ? "fill-perigo text-perigo" : ""}
            />
          </button>
        )}
        <AvisoFavorito aviso={aviso} chave={chaveAviso} onSumir={limparAviso} />
      </div>

      <Link href={href} tabIndex={-1} className="px-3.5 pt-3 pb-3 flex-1 flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          {!soTroca && (
            <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-petroleo-50 text-petroleo inline-flex items-center gap-1">
              <ShoppingBag size={14} strokeWidth={1.75} aria-hidden="true" />
              Comprar
            </span>
          )}
          {aceitaTroca && (
            <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-troca-50 text-troca-texto inline-flex items-center gap-1">
              <Repeat size={14} strokeWidth={1.75} aria-hidden="true" />
              Trocar
            </span>
          )}
          {produto.destaque && (
            <span className="rounded-pill text-xs font-semibold px-2.5 py-1 bg-acao-50 text-acao-hover">
              Impulsionado
            </span>
          )}
        </div>

        <h3 className="text-tinta font-semibold text-sm line-clamp-2 leading-snug">{produto.nome}</h3>

        <p className="text-tinta font-bold text-base tracking-tight">
          {soTroca ? "Só troca" : formatarPreco(produto.preco)}
        </p>
      </Link>

      {/* O link cobre a linha toda (after:inset-0); o selo fica fora dele, por cima, porque é um botão */}
      <div className="relative border-t border-borda px-3.5 py-2.5 min-h-[44px] flex items-center gap-2 hover:bg-pagina transition has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-petroleo has-[a:focus-visible]:-outline-offset-2">
        <span className="w-6 h-6 rounded-pill bg-petroleo-50 shrink-0 overflow-hidden">
          {produto.loja_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.loja_avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-xs font-bold text-petroleo">
              {produto.loja_nome.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-1.5">
          <Link
            href={`/perfil/${produto.loja_id}`}
            aria-label={`Ver perfil de ${produto.loja_nome}`}
            className="text-tinta-suave text-xs truncate outline-none after:absolute after:inset-0"
          >
            {produto.loja_nome}
          </Link>
          {produto.loja_verificada && <SeloVerificado />}
        </span>
        <ChevronRight size={16} strokeWidth={1.75} className="text-tinta-sutil shrink-0" aria-hidden="true" />
      </div>
    </article>
  );
}
