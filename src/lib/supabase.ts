import { createBrowserClient, createServerClient as createSupabaseServerClient, serializeCookieHeader } from "@supabase/ssr";
import { type GetServerSidePropsContext, type NextApiRequest, type NextApiResponse } from "next";

const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return { url, key };
};

/**
 * Cliente para uso no Browser (lado do cliente).
 */
export const createClient = () => {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
};

// Cliente singleton para uso rápido no browser (lazy initialization)
let _client: ReturnType<typeof createClient> | null = null;
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient();
    }
    return Reflect.get(_client, prop);
  },
});

/**
 * Cliente para uso no Servidor (getServerSideProps).
 */
export const createServerClient = (context: GetServerSidePropsContext) => {
  const { url, key } = getSupabaseEnv();
  return createSupabaseServerClient(url, key, {
    cookies: {
      getAll() {
        return Object.entries(context.req.cookies).map(([name, value]) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        // Acumula todos os cookies (a sessão pode vir dividida em chunks) e preserva as opções
        context.res.setHeader(
          "Set-Cookie",
          cookiesToSet.map(({ name, value, options }) => serializeCookieHeader(name, value, options))
        );
      },
    },
  });
};

/**
 * Cliente para rotas de API (src/pages/api): usa a sessão do aluno pelos cookies, como no getServerSideProps.
 */
export const createApiClient = (req: NextApiRequest, res: NextApiResponse) =>
  createServerClient({ req, res } as unknown as GetServerSidePropsContext);
