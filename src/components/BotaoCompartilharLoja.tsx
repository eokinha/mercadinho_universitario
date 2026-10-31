import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, QrCode, Share2, X } from "lucide-react";
import { urlCompartilhamentoLoja } from "@/lib/compartilhar";

interface Props {
  slug: string;
  codigo: string;
  nomeLoja: string;
  ehDono: boolean; // muda só os textos: "minha loja" para o dono, "a loja de X" para quem está vendo
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";
const BOTAO_SECUNDARIO = `inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-controle border border-borda-controle bg-superficie text-petroleo text-sm font-semibold hover:border-petroleo transition ${FOCO}`;

// Cores do canvas vêm dos tokens do @theme (o canvas não lê classes do Tailwind)
function corDoTema(token: string, padrao: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return valor || padrao;
}

// Cartão em PNG: QR code com o nome da loja e a marca embaixo, em resolução boa para imprimir
async function gerarCartaoQr(url: string, nomeLoja: string, ehDono: boolean): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  const tinta = corDoTema("--color-tinta", "#000000");
  const petroleo = corDoTema("--color-petroleo", "#000000");
  const fundo = corDoTema("--color-superficie", "#ffffff");

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, {
    width: 960,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: tinta, light: fundo },
  });

  const cartao = document.createElement("canvas");
  cartao.width = 1080;
  cartao.height = 1320;
  const ctx = cartao.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, cartao.width, cartao.height);
  ctx.drawImage(qr, 60, 40, 960, 960);

  const fonte = getComputedStyle(document.body).fontFamily || "sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = tinta;
  ctx.font = `700 56px ${fonte}`;
  const nome = nomeLoja.length > 32 ? `${nomeLoja.slice(0, 31)}…` : nomeLoja;
  ctx.fillText(nome, cartao.width / 2, 1100);
  ctx.fillStyle = petroleo;
  ctx.font = `600 40px ${fonte}`;
  ctx.fillText(`${ehDono ? "Minha loja" : "Loja"} no Circular · Deixa Circular.`, cartao.width / 2, 1180);

  return cartao.toDataURL("image/png");
}

function nomeArquivo(nomeLoja: string): string {
  const base = nomeLoja
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `qr-loja-${base || "circular"}.png`;
}

// Perfil público: o dono divulga a própria loja; os demais alunos compartilham a loja que estão vendo
export default function BotaoCompartilharLoja({ slug, codigo, nomeLoja, ehDono }: Props) {
  const [aberto, setAberto] = useState(false);
  const [imagem, setImagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [link, setLink] = useState("");

  const fechar = useCallback(() => setAberto(false), []);

  async function abrir() {
    setAberto(true);
    setCopiado(false);
    if (imagem) return;
    setErro(null);
    const url = urlCompartilhamentoLoja(window.location.origin, slug, codigo);
    setLink(url);
    try {
      setImagem(await gerarCartaoQr(url, nomeLoja, ehDono));
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
    const texto = ehDono
      ? `Confira minha loja no Circular: ${nomeLoja}`
      : `Confira a loja de ${nomeLoja} no Circular`;
    if (navigator.share) {
      try {
        await navigator.share({ title: nomeLoja, text: texto, url: link });
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
      <button type="button" onClick={abrir} className={`${ehDono ? "w-full" : "flex-1"} md:w-auto md:flex-none ${BOTAO_SECUNDARIO}`}>
        <QrCode size={18} strokeWidth={1.75} aria-hidden="true" />
        {ehDono ? "Compartilhar minha loja" : "Compartilhar loja"}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-compartilhar-loja"
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

            <h2 id="titulo-compartilhar-loja" className="text-petroleo text-lg font-bold pr-12">
              {ehDono ? "QR code da sua loja" : `Compartilhar a loja de ${nomeLoja}`}
            </h2>
            <p className="text-tinta-suave text-sm mt-1">
              {ehDono
                ? "Cole no mural, no grupo da turma ou na sua bio. Quem escanear vê seus anúncios depois de entrar com o e-mail da faculdade."
                : "Mande para um colega pelo link ou pelo QR code. Ele vê os anúncios depois de entrar com o e-mail da faculdade."}
            </p>

            <div className="mt-4 aspect-[1080/1320] w-full bg-pagina rounded-card overflow-hidden flex items-center justify-center">
              {imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagem} alt={`QR code da loja ${nomeLoja}`} className="w-full h-full object-contain" />
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
                download={nomeArquivo(nomeLoja)}
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
