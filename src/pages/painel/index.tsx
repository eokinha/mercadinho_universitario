import type { GetServerSideProps } from "next";
import PainelEstudante from "@/components/painel/PainelEstudante";
import { getPainelServerSideProps, type PainelProps } from "@/lib/painel-data";

export const getServerSideProps: GetServerSideProps<PainelProps> = getPainelServerSideProps;

export default function PaginaVisaoGeral(props: PainelProps) {
  return <PainelEstudante {...props} abaAtiva="visao-geral" />;
}
