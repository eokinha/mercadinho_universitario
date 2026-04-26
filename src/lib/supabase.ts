import { createBrowserClient, createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr";
import { type GetServerSidePropsContext } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * Cliente para uso no Browser (lado do cliente).
 */
export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Cliente singleton para uso rápido no browser
export const supabase = createClient();

/**
 * Cliente para uso no Servidor (getServerSideProps).
 */
export const createServerClient = (context: GetServerSidePropsContext) => {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
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
