import { useState } from "react";
import { useRouter } from "next/router";
import { getContatoVendedor } from "@/lib/queries";
import { linkWhatsapp } from "@/lib/contato";
import { urlLogin } from "@/lib/avisos-login";

interface Props {
  lojaId: number;
  produtoId?: number;
  mensagem: string;
  rotulo: string;
  className: string;
}

function IconeWhatsapp() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.49 0 .15 5.34.15 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.43-8.42ZM12.05 21.4h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.21-3.75.98 1-3.65-.23-.37a9.5 9.5 0 1 1 17.66-4.93 9.51 9.51 0 0 1-9.48 9.5Zm5.43-7.1c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.5.07-.77.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.12.56-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

// O telefone só vem do banco no clique (exige login e registra o interesse)
export default function BotaoContato({ lojaId, produtoId, mensagem, rotulo, className }: Props) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setCarregando(true);
    setErro(null);
    try {
      const telefone = await getContatoVendedor(lojaId, produtoId);
      if (!telefone) {
        setErro("Este aluno ainda não cadastrou um WhatsApp.");
        return;
      }
      const url = `${linkWhatsapp(telefone)}?text=${encodeURIComponent(mensagem)}`;
      // "noopener" faria window.open sempre devolver null; zera o opener à mão.
      // Se o navegador bloquear a nova aba, abre na mesma.
      const janela = window.open(url, "_blank");
      if (janela) janela.opener = null;
      else window.location.href = url;
    } catch (err) {
      const { code, message } = (err as { code?: string; message?: string }) ?? {};
      if (code === "42501") {
        router.push(urlLogin("contato", router.asPath));
        return;
      }
      // PT403 = conta bloqueada; PT429 = limite diário de vendedores (contato_vendedor, migração 18)
      if ((code === "PT403" || code === "PT429") && message) {
        setErro(message);
        return;
      }
      setErro("Não foi possível abrir o contato. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-1">
      <button type="button" onClick={handleClick} disabled={carregando} className={`${className} disabled:opacity-60`}>
        <IconeWhatsapp />
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
