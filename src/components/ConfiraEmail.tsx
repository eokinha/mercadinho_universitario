import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MailCheck, Search } from "lucide-react";
import GuiaEmail from "@/components/GuiaEmail";
import { PROVEDORES, REMETENTE_CIRCULAR, dominioDoEmail, guiaDoEmail } from "@/lib/guias-email";

interface Props {
  email: string;
  motivo: "cadastro" | "senha";
  onReenviar: () => Promise<void>; // lança erro se o envio falhar
  onCorrigirEmail: () => void;
}

// O Supabase Auth recusa reenvio para o mesmo e-mail antes de ~60 s
const ESPERA_REENVIO_S = 60;

const botaoSecundario =
  "w-full bg-superficie text-petroleo border border-borda-controle hover:border-petroleo rounded-controle font-semibold py-2.5 text-sm min-h-[44px] transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2";

// Tela depois de enviar o link (cadastro ou recuperação de senha): leva o aluno até o e-mail da faculdade
export default function ConfiraEmail({ email, motivo, onReenviar, onCorrigirEmail }: Props) {
  const guia = guiaDoEmail(email);
  const provedor = guia ? PROVEDORES[guia.provedor] : null;
  const pastas = provedor ? provedor.pastas : ["Spam ou Lixo Eletrônico"];
  const [espera, setEspera] = useState(ESPERA_REENVIO_S);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function handleReenviar() {
    setEnviando(true);
    setMensagem(null);
    try {
      await onReenviar();
      setMensagem({ tipo: "ok", texto: "Enviamos um novo link. Use sempre o e-mail mais recente." });
      setEspera(ESPERA_REENVIO_S);
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível reenviar agora. Aguarde um minuto e tente de novo." });
    } finally {
      setEnviando(false);
    }
  }

  const acao = motivo === "cadastro" ? "confirmar sua conta" : "criar uma nova senha";

  return (
    <div>
      <div className="w-16 h-16 bg-petroleo-50 text-petroleo rounded-pill flex items-center justify-center mx-auto mb-4">
        <MailCheck size={32} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-petroleo text-center mb-2">Confira seu e-mail da faculdade</h2>
      <p className="text-sm text-tinta-suave text-center mb-6">
        Enviamos um link para <strong className="text-tinta break-all">{email}</strong>. Abra o e-mail e toque no
        botão para {acao}.
      </p>

      {provedor ? (
        <a
          href={provedor.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-acao text-white font-semibold py-3 rounded-controle hover:bg-acao-hover transition inline-flex items-center justify-center gap-2 min-h-[44px] text-sm focus-visible:outline-2 focus-visible:outline-petroleo focus-visible:outline-offset-2"
        >
          Abrir o {provedor.nome}
          <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
        </a>
      ) : null}

      <div className="mt-6 p-4 bg-pagina rounded-controle border border-borda text-sm text-tinta-suave">
        <p className="font-semibold text-tinta flex items-center gap-2 mb-2">
          <Search size={16} strokeWidth={1.75} className="text-petroleo" aria-hidden="true" />
          Não está na caixa de entrada?
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Pode levar alguns minutos para chegar.</li>
          <li>Veja {pastas.join(" e ")}.</li>
          <li>
            Pesquise por <strong className="text-tinta">Circular</strong> ou{" "}
            <span className="break-all">{REMETENTE_CIRCULAR}</span>.
          </li>
        </ul>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMostrarGuia((v) => !v)}
          aria-expanded={mostrarGuia}
          className="text-sm text-petroleo font-semibold hover:underline min-h-[44px]"
        >
          {mostrarGuia ? "Esconder passo a passo" : "Não sei abrir meu e-mail da faculdade"}
        </button>
        {mostrarGuia && (
          <div className="mt-2">
            <GuiaEmail guia={guia} dominios={dominioDoEmail(email) ? [dominioDoEmail(email)] : []} />
          </div>
        )}
      </div>

      {mensagem && (
        <div
          role={mensagem.tipo === "erro" ? "alert" : "status"}
          className={`mt-4 p-3 text-sm rounded-controle border ${
            mensagem.tipo === "erro" ? "bg-perigo-50 text-perigo border-perigo" : "bg-petroleo-50 text-petroleo border-petroleo"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <button type="button" onClick={handleReenviar} disabled={enviando || espera > 0} className={botaoSecundario}>
          {enviando ? "Reenviando..." : espera > 0 ? `Reenviar link em ${espera}s` : "Reenviar link"}
        </button>
        <button type="button" onClick={onCorrigirEmail} className={botaoSecundario}>
          Digitei o e-mail errado
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-tinta-suave">
        {motivo === "cadastro" ? (
          <>
            Já confirmou?{" "}
            <Link href="/login" className="text-petroleo font-semibold hover:underline">
              Entrar
            </Link>
            {" · "}
          </>
        ) : null}
        <Link href="/ajuda#nao-chegou" className="text-petroleo font-semibold hover:underline">
          Precisa de ajuda?
        </Link>
      </p>
    </div>
  );
}
