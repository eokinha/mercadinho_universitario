import type { GetServerSideProps } from "next";
import CaixaEntrada from "@/components/chat/CaixaEntrada";
import { urlLogin } from "@/lib/avisos-login";
import { createServerClient } from "@/lib/supabase";
import { getMeuUsuario, getMinhasConversas } from "@/lib/queries";
import type { ConversaResumo } from "@/types";

interface Props {
  conversas: ConversaResumo[];
  meuId: number;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const supabase = createServerClient(ctx);
  const usuario = await getMeuUsuario(supabase).catch(() => null);
  if (!usuario) {
    return { redirect: { destination: urlLogin("mensagens", "/mensagens"), permanent: false } };
  }
  const conversas = await getMinhasConversas(supabase);
  return { props: { conversas, meuId: usuario.id } };
};

export default function PaginaMensagens({ conversas, meuId }: Props) {
  return <CaixaEntrada conversasIniciais={conversas} meuId={meuId} />;
}
