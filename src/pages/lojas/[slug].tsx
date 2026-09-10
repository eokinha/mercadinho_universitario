import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string;
  return {
    redirect: {
      destination: `/perfil/${slug}`,
      permanent: false,
    },
  };
};

export default function LojaRedirect() {
  return null;
}
