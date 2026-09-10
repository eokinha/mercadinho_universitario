import { createBrowserClient, createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr";
import { type GetServerSidePropsContext } from "next";

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
    return (_client as any)[prop];
  },
});

/**
 * Cliente para uso no Servidor (getServerSideProps).
 */
export const createServerClient = (context: GetServerSidePropsContext) => {
  const { url, key } = getSupabaseEnv();
  return createSupabaseServerClient(url, key, {
    cookies: {
      get(name: string) {
        return context.req.cookies[name];
      },
      set(name: string, value: string, _options: CookieOptions) {
        context.res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
      },
      remove(name: string, _options: CookieOptions) {
        context.res.setHeader("Set-Cookie", `${name}=; Path=/; HttpOnly; Max-Age=0`);
      },
    },
  });
};

