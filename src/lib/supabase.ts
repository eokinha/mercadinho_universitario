import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const rawKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!/^https?:\/\//.test(rawUrl)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida. Configure o .env.local com a URL do projeto Supabase."
  );
}

if (!rawKey) {
  throw new Error(
    "Chave do Supabase ausente. Configure NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (nova) ou NEXT_PUBLIC_SUPABASE_ANON_KEY (legada) no .env.local."
  );
}

export const supabase = createClient(rawUrl, rawKey);
