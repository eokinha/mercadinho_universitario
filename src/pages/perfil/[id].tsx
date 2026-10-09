import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  Clock,
  GraduationCap,
  MapPin,
  Package,
  Repeat,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import SeloVerificado from "@/components/SeloVerificado";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { createServerClient } from "@/lib/supabase";
import { getPerfilPublico, getProdutosListagemByLoja } from "@/lib/queries";
import CardProduto from "@/components/CardProduto";
import ModalProduto from "@/components/ModalProduto";
import { linkWhatsapp } from "@/lib/contato";
import type { PerfilPublico, ProdutoListagem } from "@/types";

interface Props {
  perfil: PerfilPublico;
  produtos: ProdutoListagem[];
}

function formatarTempoPlataforma(dataString?: string): string {
  if (!dataString) return "Membro recente";
  try {
    const data = new Date(dataString);
    if (isNaN(data.getTime())) return "Membro do campus";
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `Desde ${meses[data.getMonth()].toLowerCase()} de ${data.getFullYear()}`;
  } catch {
    return "Membro do campus";
  }
}

function IconeWhatsapp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.4h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.21-3.75.98 1-3.65-.23-.37a9.5 9.5 0 1 1 17.66-4.93 9.51 9.51 0 0 1-9.48 9.5Zm5.43-7.1c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const idOuSlug = ctx.params?.id as string;
  const supabase = createServerClient(ctx);

  const perfil = await getPerfilPublico(idOuSlug, supabase);

  if (!perfil) {
    return { notFound: true };
  }

  const produtos = await getProdutosListagemByLoja(perfil.id, supabase);

  return {
    props: {
      perfil,
      produtos,
    },
  };
};

export default function PerfilPublicoPage({ perfil, produtos }: Props) {
  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoListagem | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "venda" | "troca">("todos");
  const [busca, setBusca] = useState("");

  // Mensagem personalizada para iniciar contato no WhatsApp
  const mensagemWhatsapp = encodeURIComponent(
    `Olá, ${perfil.nome}! Vi seu perfil na Circular e quero saber mais sobre seus anúncios.`
  );
  const whatsappUrl = linkWhatsapp(perfil.whatsapp || perfil.contato) + `?text=${mensagemWhatsapp}`;

  const nomeExibicao = perfil.usuario_nome 
    ? `${perfil.usuario_nome} ${perfil.usuario_sobrenome || ""}`.trim()
    : perfil.nome;

  const dataRegistro = perfil.usuario_criado_em || perfil.criado_em;

  // Separa anúncios de venda e troca
  const produtosTroca = useMemo(
    () => produtos.filter((p) => p.aceita_troca || p.preco === 0),
    [produtos]
  );
  
  const produtosVenda = useMemo(
    () => produtos.filter((p) => p.preco > 0),
    [produtos]
  );

  // Filtra produtos de acordo com a aba selecionada e busca
  const produtosFiltrados = useMemo(() => {
    let lista = produtos;
    if (filtroTipo === "troca") lista = produtosTroca;
    if (filtroTipo === "venda") lista = produtosVenda;

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nome.toLowerCase().includes(termo) ||
          (p.descricao && p.descricao.toLowerCase().includes(termo))
      );
    }
    return lista;
  }, [produtos, produtosTroca, produtosVenda, filtroTipo, busca]);

  const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
  const ABAS = [
    { id: "todos" as const, rotulo: `Todos (${produtos.length})`, Icone: null, ativa: "bg-petroleo border-petroleo" },
    { id: "venda" as const, rotulo: `Comprar (${produtosVenda.length})`, Icone: ShoppingBag, ativa: "bg-petroleo border-petroleo" },
    { id: "troca" as const, rotulo: `Trocar (${produtosTroca.length})`, Icone: Repeat, ativa: "bg-troca border-troca" },
  ];

  return (
    <>
      <Head>
        <title>{`${nomeExibicao} • Circular`}</title>
        <meta name="description" content={`Anúncios e itens para troca de ${nomeExibicao} na Circular.`} />
      </Head>

      <div className="min-h-screen bg-pagina pb-16">
        <div className="max-w-6xl mx-auto px-4 pt-6 sm:pt-8">
          <Link href="/" className={`inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-petroleo hover:underline rounded-controle mb-2 ${FOCO}`}>
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            Voltar para o início
          </Link>

          <header className="bg-superficie border border-borda rounded-card overflow-hidden mb-8">
            <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-petroleo-50">
              {perfil.capa_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfil.capa_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="px-6 sm:px-8 pb-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 mb-6">
                <div className="flex items-end gap-5">
                  <div className="w-28 h-28 rounded-pill bg-superficie border-4 border-white overflow-hidden shrink-0">
                    {perfil.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={perfil.avatar_url} alt={nomeExibicao} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-petroleo-50 text-petroleo text-4xl font-bold">
                        {nomeExibicao.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-petroleo tracking-tight">{nomeExibicao}</h1>
                      {perfil.matricula_status === "verificado" ? (
                        <SeloVerificado tamanho="md" />
                      ) : perfil.matricula_status === "pendente" ? (
                        <span className="inline-flex items-center gap-1 rounded-pill text-xs font-semibold px-2.5 py-1 bg-doacao-50 text-doacao">
                          <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                          Matrícula em análise
                        </span>
                      ) : null}
                    </div>
                    <p className="text-tinta-suave text-sm mt-1 flex items-center gap-1.5">
                      <GraduationCap size={16} strokeWidth={1.75} aria-hidden="true" />
                      {perfil.instituicao_nome ? `Aluno da ${perfil.instituicao_nome}` : "Aluno no campus"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {perfil.instagram_url && (
                    <Link
                      href={`https://instagram.com/${perfil.instagram_url.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className={`w-11 h-11 inline-flex items-center justify-center rounded-controle border border-borda-controle text-petroleo hover:border-petroleo bg-superficie transition ${FOCO}`}
                    >
                      <IconeInstagram className="w-5 h-5" />
                    </Link>
                  )}
                  <Link
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 md:flex-none bg-acao hover:bg-acao-hover text-white font-semibold text-sm px-4 py-2.5 min-h-[44px] rounded-controle transition inline-flex items-center justify-center gap-2 ${FOCO}`}
                  >
                    <IconeWhatsapp className="w-5 h-5" />
                    Falar no WhatsApp
                  </Link>
                </div>
              </div>

              {perfil.descricao && (
                <p className="mt-4 pt-4 border-t border-borda text-tinta text-sm leading-relaxed max-w-3xl">{perfil.descricao}</p>
              )}

              <dl className="mt-6 pt-5 border-t border-borda grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { Icone: Calendar, rotulo: "Na Circular", valor: formatarTempoPlataforma(dataRegistro), cor: "text-tinta" },
                  { Icone: Package, rotulo: "Anúncios ativos", valor: `${produtos.length}`, cor: "text-tinta" },
                  { Icone: Repeat, rotulo: "Aceitam troca", valor: `${produtosTroca.length}`, cor: "text-troca-texto" },
                ].map(({ Icone, rotulo, valor, cor }) => (
                  <div key={rotulo} className="bg-pagina rounded-card p-3">
                    <dt className="text-xs text-tinta-suave font-semibold">{rotulo}</dt>
                    <dd className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${cor}`}>
                      <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>

              {perfil.locais_entrega && perfil.locais_entrega.length > 0 && (
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-tinta-suave">Locais de encontro:</span>
                  {perfil.locais_entrega.map((local) => (
                    <span key={local} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-petroleo-50 text-petroleo rounded-pill">
                      <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
                      {local}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          <section id="anuncios" className="scroll-mt-32">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div role="tablist" aria-label="Tipo de anúncio" className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {ABAS.map(({ id, rotulo, Icone, ativa }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={filtroTipo === id}
                    onClick={() => setFiltroTipo(id)}
                    className={`px-4 min-h-[44px] rounded-pill text-sm font-semibold transition border flex items-center gap-1.5 shrink-0 ${FOCO} ${
                      filtroTipo === id ? `${ativa} text-white` : "bg-superficie border-borda-controle text-tinta-suave hover:border-petroleo"
                    }`}
                  >
                    {Icone && <Icone size={16} strokeWidth={1.75} aria-hidden="true" />}
                    {rotulo}
                  </button>
                ))}
              </div>

              {produtos.length > 4 && (
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nos anúncios"
                  aria-label="Buscar nos anúncios"
                  className={`w-full sm:w-64 text-sm px-4 min-h-[44px] rounded-pill border border-borda-controle focus:border-petroleo bg-superficie placeholder:text-tinta-sutil ${FOCO}`}
                />
              )}
            </div>

            {produtosFiltrados.length === 0 ? (
              <div className="bg-superficie border border-dashed border-borda-controle rounded-card p-12 text-center my-6">
                <Package size={40} strokeWidth={1.75} className="mx-auto mb-2 text-petroleo" aria-hidden="true" />
                <p className="text-tinta font-semibold text-base">Nenhum anúncio neste filtro.</p>
                <p className="text-tinta-suave text-sm mt-1">
                  {busca ? "Tente buscar por outro termo." : "Escolha outro filtro para ver mais anúncios."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {produtosFiltrados.map((produto) => (
                  <CardProduto key={produto.id} produto={produto} onAbrir={setProdutoAtivo} largura="fluida" />
                ))}
              </div>
            )}
          </section>

          <div className="mt-12 bg-petroleo-50 rounded-card p-5 flex items-start gap-3 text-petroleo">
            <ShieldCheck size={22} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-sm">Negocie com segurança</h2>
              <p className="text-sm mt-0.5">
                Combine o encontro em locais movimentados, como a biblioteca, o RU ou o centro de vivência, e confira o
                estado do item antes de fechar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ModalProduto produto={produtoAtivo} onFechar={() => setProdutoAtivo(null)} />
    </>
  );
}
