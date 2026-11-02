import Head from "next/head";
import type { GetServerSideProps } from "next";
import CaixaEntrada from "@/components/chat/CaixaEntrada";
import ConversaChat from "@/components/chat/ConversaChat";
import { urlLogin } from "@/lib/avisos-login";
import { createServerClient } from "@/lib/supabase";
import { getConversaLeitura, getMinhasConversas } from "@/lib/queries";
import type { ConversaLeitura, ConversaResumo } from "@/types";

interface Props {
  conversa: ConversaLeitura;
  conversas: ConversaResumo[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = String(ctx.params?.id ?? "").toLowerCase();
  if (!UUID.test(id)) return { notFound: true };

  const supabase = createServerClient(ctx);
  try {
    const [conversa, conversas] = await Promise.all([getConversaLeitura(id, supabase), getMinhasConversas(supabase)]);
    // Conversa de outra pessoa ou apagada pela limpeza de 30 dias
    if (!conversa) return { notFound: true };
    return { props: { conversa, conversas } };
  } catch (err) {
    if ((err as { code?: string })?.code === "42501") {
      return { redirect: { destination: urlLogin("mensagens", `/mensagens/${id}`), permanent: false } };
    }
    throw err;
  }
};

export default function PaginaConversa({ conversa, conversas }: Props) {
  return (
    <>
      <Head>
        <title>{`${conversa.outro.nome} • Mensagens • Circular`}</title>
      </Head>
      <CaixaEntrada conversasIniciais={conversas} meuId={conversa.meu_id} conversaAtivaId={conversa.id}>
        <ConversaChat key={conversa.id} inicial={conversa} />
      </CaixaEntrada>
    </>
  );
}
