import { useState } from "react";
import { useRouter } from "next/router";
import { MessageCircle } from "lucide-react";
import { iniciarConversa } from "@/lib/queries";
import { urlLogin } from "@/lib/avisos-login";

interface Props {
  produtoId: number;
  rotulo: string;
  className: string;
}

// Abre (ou reabre) a conversa do chat com o vendedor do anúncio. O banco registra o interesse
// (vale para a avaliação) e aplica o mesmo limite diário de vendedores do WhatsApp.
export default function BotaoConversar({ produtoId, rotulo, className }: Props) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setCarregando(true);
    setErro(null);
    try {
      const conversaId = await iniciarConversa(produtoId);
      await router.push(`/mensagens/${conversaId}`);
    } catch (err) {
      const { code, message } = (err as { code?: string; message?: string }) ?? {};
      if (code === "42501") {
        router.push(urlLogin("contato", router.asPath));
        return;
      }
      // PT403 = conta bloqueada ou outro campus; PT404 = anúncio saiu do ar; PT429 = limite diário
      setErro(code?.startsWith("PT") && message ? message : "Não foi possível abrir a conversa. Tente de novo.");
      setCarregando(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-1">
      <button type="button" onClick={handleClick} disabled={carregando} className={`${className} disabled:opacity-60`}>
        <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
        {carregando ? "Abrindo…" : rotulo}
      </button>
      {erro && (
        <p role="alert" className="text-perigo text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}
