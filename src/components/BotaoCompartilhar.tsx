import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, QrCode, Share2, X } from "lucide-react";
import { slugDoNome, urlCompartilhamentoAnuncio, urlCompartilhamentoLoja } from "@/lib/compartilhar";

interface AnuncioCompartilhado {
  id: number;
  nome: string;
  precoTexto: string; // "R$ 450,00" ou "Só troca"
  imagemUrl: string | null;
}

interface Props {
  tipo: "loja" | "anuncio";
  codigo: string;
  nomeLoja: string;
  ehDono: boolean; // muda só os textos ("meu perfil" / "o perfil de X")
  slug?: string; // obrigatório para tipo "loja"
  anuncio?: AnuncioCompartilhado; // obrigatório para tipo "anuncio"
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition ${FOCO}`;

// Cores do canvas vêm dos tokens do @theme (o canvas não lê classes do Tailwind)
function corDoTema(token: string, padrao: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return valor || padrao;
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Storage responde com CORS liberado; sem isso o canvas não exporta
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cortar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

interface Cartao {
  url: string;
  titulo: string;
  legenda: string;
  foto: string | null;
}

// Cartão em PNG com o QR code, o título e a legenda (e a foto do anúncio, se houver), bom para imprimir
async function gerarCartao({ url, titulo, legenda, foto }: Cartao, comFoto = true): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  const tinta = corDoTema("--color-tinta", "#000000");
  const petroleo = corDoTema("--color-petroleo", "#000000");
  const fundo = corDoTema("--color-superficie", "#ffffff");

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, { width: 960, margin: 2, errorCorrectionLevel: "M", color: { dark: tinta, light: fundo } });

  const cartao = document.createElement("canvas");
  cartao.width = 1080;
  cartao.height = 1320;
  const ctx = cartao.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, cartao.width, cartao.height);
  ctx.drawImage(qr, 60, 40, 960, 960);

  const fonte = getComputedStyle(document.body).fontFamily || "sans-serif";
  const imagem = comFoto && foto ? await carregarImagem(foto) : null;

  if (imagem) {
    // Foto quadrada à esquerda (recorte central), texto alinhado à esquerda ao lado
    const lado = Math.min(imagem.width, imagem.height);
    ctx.drawImage(imagem, (imagem.width - lado) / 2, (imagem.height - lado) / 2, lado, lado, 80, 1030, 220, 220);
    ctx.textAlign = "left";
    ctx.fillStyle = tinta;
    ctx.font = `700 50px ${fonte}`;
    ctx.fillText(cortar(titulo, 26), 340, 1115);
    ctx.fillStyle = petroleo;
    ctx.font = `600 36px ${fonte}`;
    ctx.fillText(cortar(legenda, 36), 340, 1185);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = tinta;
    ctx.font = `700 56px ${fonte}`;
    ctx.fillText(cortar(titulo, 32), cartao.width / 2, 1100);
    ctx.fillStyle = petroleo;
    ctx.font = `600 40px ${fonte}`;
    ctx.fillText(cortar(legenda, 44), cartao.width / 2, 1180);
  }

  try {
    return cartao.toDataURL("image/png");
  } catch (err) {
    // Foto sem CORS "suja" o canvas: refaz o cartão sem ela
    if (imagem) return gerarCartao({ url, titulo, legenda, foto }, false);
    throw err;
  }
}

// Mesmo modal para loja (perfil público) e anúncio (/anuncio/[id]), para qualquer aluno logado
export default function BotaoCompartilhar({ tipo, codigo, nomeLoja, ehDono, slug, anuncio }: Props) {
  const [aberto, setAberto] = useState(false);
  const [imagem, setImagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [link, setLink] = useState("");

  const ehAnuncio = tipo === "anuncio" && anuncio;
  const rotulo = ehAnuncio ? "Compartilhar anúncio" : ehDono ? "Compartilhar meu perfil" : "Compartilhar perfil";
  const tituloModal = ehAnuncio ? "Compartilhar anúncio" : ehDono ? "QR code do seu perfil" : `Compartilhar o perfil de ${nomeLoja}`;
  const descricao = ehAnuncio
    ? "Mande o link ou o QR code. Quem abrir vê o anúncio depois de entrar com o e-mail da faculdade."
    : ehDono
      ? "Cole no mural, no grupo da turma ou na sua bio. Quem escanear vê seus anúncios depois de entrar com o e-mail da faculdade."
      : "Mande para um colega pelo link ou pelo QR code. Ele vê os anúncios depois de entrar com o e-mail da faculdade.";
  const nomeBase = ehAnuncio ? anuncio.nome : nomeLoja;
  const arquivo = `qr-${ehAnuncio ? "anuncio" : "loja"}-${slugDoNome(nomeBase) || "circular"}.png`;

  const fechar = useCallback(() => setAberto(false), []);

  async function abrir() {
    setAberto(true);
    setCopiado(false);
    if (imagem) return;
    setErro(null);
    const origem = window.location.origin;
    const url = ehAnuncio
      ? urlCompartilhamentoAnuncio(origem, anuncio.id, anuncio.nome, codigo)
      : urlCompartilhamentoLoja(origem, slug ?? "", codigo);
    setLink(url);
    try {
      setImagem(
        await gerarCartao(
          ehAnuncio
            ? { url, titulo: anuncio.nome, legenda: `${anuncio.precoTexto} · ${nomeLoja}`, foto: anuncio.imagemUrl }
            : { url, titulo: nomeLoja, legenda: "Anúncios no Circular · Deixa Circular.", foto: null }
        )
      );
    } catch {
      setErro("Não foi possível gerar o QR code. Tente de novo.");
    }
  }

  useEffect(() => {
    if (!aberto) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") fechar();
    }
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener("keydown", handleKey);
    };
  }, [aberto, fechar]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setErro("Não deu para copiar. Selecione o link abaixo e copie manualmente.");
    }
  }

  async function compartilhar() {
    const texto = ehAnuncio
      ? `Olha esse anúncio no Circular: ${anuncio.nome} (${anuncio.precoTexto})`
      : ehDono
        ? `Confira meus anúncios no Circular: ${nomeLoja}`
        : `Confira os anúncios de ${nomeLoja} no Circular`;
    if (navigator.share) {
      try {
        await navigator.share({ title: nomeBase, text: texto, url: link });
      } catch {
        // Usuário cancelou o compartilhamento: nada a fazer
      }
      return;
    }
    const janela = window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`, "_blank");
    if (janela) janela.opener = null;
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`${ehDono && !ehAnuncio ? "w-full" : "flex-1"} md:w-auto md:flex-none ${BOTAO_SECUNDARIO}`}
      >
        <QrCode size={18} strokeWidth={1.75} aria-hidden="true" />
        {rotulo}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-compartilhar"
          onClick={fechar}
          className="fixed inset-0 z-50 bg-tinta/50 flex items-center justify-center px-4 py-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-superficie rounded-card shadow-flutuante w-full max-w-sm max-h-[90vh] overflow-y-auto relative p-6"
          >
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar"
              className={`absolute top-3 right-3 w-11 h-11 rounded-pill border border-borda text-tinta-suave hover:text-tinta transition flex items-center justify-center ${FOCO}`}
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>

            <h2 id="titulo-compartilhar" className="text-petroleo text-lg font-bold pr-12">
              {tituloModal}
            </h2>
            <p className="text-tinta-suave text-sm mt-1">{descricao}</p>

            <div className="mt-4 aspect-[1080/1320] w-full bg-pagina rounded-card overflow-hidden flex items-center justify-center">
              {imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagem} alt={`QR code de ${nomeBase}`} className="w-full h-full object-contain" />
              ) : (
                !erro && <p className="text-sm text-tinta-suave">Gerando QR code…</p>
              )}
            </div>

            {erro && (
              <p role="alert" className="mt-3 text-sm text-perigo">
                {erro}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <a
                href={imagem ?? undefined}
                download={arquivo}
                aria-disabled={!imagem}
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-controle bg-acao hover:bg-acao-hover text-white text-sm font-semibold transition ${FOCO} ${
                  imagem ? "" : "pointer-events-none opacity-60"
                }`}
              >
                <Download size={18} strokeWidth={1.75} aria-hidden="true" />
                Baixar QR code
              </a>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copiarLink} disabled={!link} className={BOTAO_SECUNDARIO}>
                  {copiado ? (
                    <Check size={18} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Copy size={18} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {copiado ? "Copiado" : "Copiar link"}
                </button>
                <button type="button" onClick={compartilhar} disabled={!link} className={BOTAO_SECUNDARIO}>
                  <Share2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  Compartilhar
                </button>
              </div>
            </div>

            {link && <p className="mt-3 text-xs text-tinta-sutil break-all select-all">{link}</p>}
          </div>
        </div>
      )}
    </>
  );
}
