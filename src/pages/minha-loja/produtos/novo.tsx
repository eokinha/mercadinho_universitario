import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/anunciar",
      permanent: false,
    },
  };
};

export default function NovoProdutoRedirect() {
  return null;
}
