import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnvSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  return { url, key };
}

function createSupabaseOrThrow(): SupabaseClient {
  const { url, key } = getEnvSupabase();

  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida. " +
        "Defina a URL pública do projeto (https://...supabase.co) " +
        "em .env.local (dev) e em Vercel: Project → Settings → Environment Variables " +
        "(incluindo o ambiente usado no build, ex.: Production e Preview)."
    );
  }

  if (!key) {
    throw new Error(
      "Chave do Supabase ausente. " +
        "Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) " +
        "em .env.local (dev) e na Vercel (mesmas variáveis, disponíveis no build)."
    );
  }

  return createClient(url, key);
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createSupabaseOrThrow();
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
