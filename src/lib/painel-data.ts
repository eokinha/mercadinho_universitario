import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { createServerClient } from "@/lib/supabase";
import {
  getInstituicoes,
  getOrCreatePerfilEstudante,
  getProdutosFavoritos,
  getProdutosPrivados,
  getMeuUsuario,
} from "@/lib/queries";
import { ABAS_PAINEL, PAGINAS_PAINEL, type AbaPainel } from "@/lib/painel-routes";
import type { Instituicao, Loja, Produto, ProdutoListagem, Usuario } from "@/types";

export interface PainelProps {
  loja: Loja;
  produtosIniciais: Produto[];
  favoritosIniciais: ProdutoListagem[];
  userEmail: string;
  usuarioInicial: Usuario | null;
  instituicoes: Instituicao[];
}

function redirecionarAbaLegada(ctx: GetServerSidePropsContext): GetServerSidePropsResult<PainelProps> | null {
  const abaLegada = typeof ctx.query.aba === "string" ? ctx.query.aba : null;
  if (!abaLegada || abaLegada === "visao-geral") return null;

  const destino = ABAS_PAINEL.includes(abaLegada as AbaPainel)
    ? PAGINAS_PAINEL[abaLegada as AbaPainel].href
    : PAGINAS_PAINEL["visao-geral"].href;
  const params = new URLSearchParams();

  Object.entries(ctx.query).forEach(([chave, valor]) => {
    if (chave !== "aba" && typeof valor === "string") {
      params.set(chave, valor);
    }
  });

  const query = params.toString();
  return {
    redirect: {
      destination: `${destino}${query ? `?${query}` : ""}`,
      permanent: false,
    },
  };
}

export async function getPainelServerSideProps(
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<PainelProps>> {
  const redirectLegado = redirecionarAbaLegada(ctx);
  if (redirectLegado) return redirectLegado;

  const serverSupabase = createServerClient(ctx);
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  // Modo de pré-visualização para testes de UI
  if (
    !user &&
    process.env.NODE_ENV === "development" && (ctx.query.preview === "1" || ctx.query.demo === "1")
  ) {
    const mockLoja: Loja = {
      id: 1,
      usuario_id: 1,
      nome: "Lucas Silva",
      descricao: "Estudante de Engenharia desapegando e trocando livros e eletrônicos no campus",
      contato: "(31) 99999-0001",
      whatsapp: "(31) 99999-0001",
      status: "ativo",
      criado_em: "2026-04-26T00:14:02.38628+00:00",
      avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=LucasSilva&backgroundColor=ff385c",
      capa_url: null,
      slug: "lucas-silva",
      instagram_url: "@lucas_eng",
      tiktok_url: null,
      locais_entrega: ["RU Central", "Biblioteca Universitária", "Centro de Vivência"],
      cor_tema: "#FF385C",
    };
    const produtosIniciais = await getProdutosPrivados(1, serverSupabase);
    const favoritosIniciais = await getProdutosFavoritos(1, serverSupabase);
    const instituicoes = await getInstituicoes(serverSupabase);
    const statusSolicitado = typeof ctx.query.status === "string" ? ctx.query.status : "verificado";
    const mockStatus: Usuario["matricula_status"] =
      statusSolicitado === "pendente" || statusSolicitado === "rejeitado"
        ? statusSolicitado
        : "verificado";

    const mockUsuario: Usuario = {
      id: 1,
      nome: "Lucas",
      sobrenome: "Silva",
      email: "lucas.silva@aluno.ufmg.br",
      password: "",
      telefone: "(31) 99999-0001",
      cpf: "11122233344",
      matricula: "2024019283",
      matricula_validada: mockStatus === "verificado",
      matricula_status: mockStatus,
      instituicoes_id: 1,
      status: "ativo",
      is_admin: false,
    };

    return {
      props: {
        loja: mockLoja,
        produtosIniciais,
        favoritosIniciais,
        userEmail: "lucas.silva@aluno.ufmg.br",
        usuarioInicial: mockUsuario,
        instituicoes,
      },
    };
  }

  if (!user) {
    return {
      redirect: {
        destination: `/login?msg=${encodeURIComponent("Faça login para acessar seu painel.")}`,
        permanent: false,
      },
    };
  }

  try {
    const loja = await getOrCreatePerfilEstudante(serverSupabase);
    const produtosIniciais = await getProdutosPrivados(loja.id, serverSupabase);
    const favoritosIniciais = await getProdutosFavoritos(loja.usuario_id, serverSupabase);
    const usuarioInicial = await getMeuUsuario(serverSupabase);
    const instituicoes = await getInstituicoes(serverSupabase);

    return {
      props: {
        loja,
        produtosIniciais,
        favoritosIniciais,
        userEmail: user.email || "",
        usuarioInicial,
        instituicoes,
      },
    };
  } catch (err) {
    console.error("Erro ao carregar dados do painel:", err);
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
}
