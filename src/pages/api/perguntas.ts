// POST /api/perguntas { produtoId, texto }: cria a pergunta (RPC criar_pergunta) e manda para a moderação
import type { NextApiRequest, NextApiResponse } from "next";
import { aceitaPostJson, responderErroBanco } from "@/lib/api-rotas";
import { mensagemModeracao, registrarModeracao, textoValido } from "@/lib/moderacao";
import { createApiClient } from "@/lib/supabase";
import { LIMITES_TEXTO } from "@/lib/validacoes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!aceitaPostJson(req, res)) return;
  const produtoId = Number(req.body?.produtoId);
  const texto = textoValido(req.body?.texto, LIMITES_TEXTO.pergunta);
  if (!Number.isInteger(produtoId) || produtoId <= 0 || !texto) {
    return res.status(400).json({ erro: `Escreva a pergunta com 2 a ${LIMITES_TEXTO.pergunta} caracteres.` });
  }

  const supabase = createApiClient(req, res);
  const { data, error } = await supabase.rpc("criar_pergunta", { p_produto_id: produtoId, p_texto: texto });
  if (error) return responderErroBanco(res, error);

  const id = Number(data);
  const status = await registrarModeracao(supabase, "pergunta", id, texto);
  return res.status(200).json({ id, status, mensagem: mensagemModeracao("pergunta", status) });
}
