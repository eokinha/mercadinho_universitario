import type { GetServerSideProps } from "next";

// Rota antiga: a aprovação manual de matrícula saiu (migração 27); a moderação de contas fica em /admin/contas
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: "/admin/contas", permanent: false },
});

export default function AdminVerificacoesRedirect() {
  return null;
}
