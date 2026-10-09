import type { GetServerSideProps } from "next";

// Rota antiga: a gestão da loja vive no painel do estudante
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/painel",
      permanent: false,
    },
  };
};

export default function MinhaLojaRedirect() {
  return null;
}
