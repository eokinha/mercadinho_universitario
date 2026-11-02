// Utilitários das rotas de API: só POST com JSON (bloqueia formulário de outro site com o cookie do aluno)
// e erro do banco devolvido com o status e a mensagem amigável da RPC.
import type { NextApiRequest, NextApiResponse } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { statusDoErro } from "@/lib/moderacao";

export function aceitaPostJson(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ erro: "Método não permitido." });
    return false;
  }
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) {
    res.status(415).json({ erro: "Envie os dados em JSON." });
    return false;
  }
  return true;
}

export function responderErroBanco(res: NextApiResponse, error: { code?: string; message?: string }) {
  const status = statusDoErro(error.code);
  const erro =
    status === 500
      ? "Não foi possível enviar agora. Tente de novo."
      : status === 401
        ? "Faça login para continuar."
        : error.message || "Não foi possível enviar.";
  if (status === 500) console.error("Erro do banco", error.code, error.message);
  res.status(status).json({ erro, codigo: error.code });
}

// Antes de chamar a Vettly: sem login não gasta moderação (a RPC também recusaria depois)
export async function exigirLogin(client: SupabaseClient, res: NextApiResponse): Promise<boolean> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    res.status(401).json({ erro: "Faça login para continuar.", codigo: "42501" });
    return false;
  }
  return true;
}
