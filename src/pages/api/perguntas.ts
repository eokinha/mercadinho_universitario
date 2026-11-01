// POST /api/perguntas { produtoId, texto }: modera na Vettly e só então grava (RPC criar_pergunta).
// Recusada não é gravada; aprovada é publicada; sem decisão clara fica para a equipe.
import type { NextApiRequest, NextApiResponse } from "next";
import { aceitaPostJson, exigirLogin, responderErroBanco } from "@/lib/api-rotas";
import { mensagemModeracao, moderarTexto, publicarAprovado, textoValido } from "@/lib/moderacao";
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
  if (!(await exigirLogin(supabase, res))) return;

  const moderacao = await moderarTexto(texto);
  if (moderacao.decisao === "recusado") {
    return res.status(200).json({ id: null, status: "recusado", mensagem: mensagemModeracao("pergunta", "recusado", moderacao.motivos) });
  }

  const { data, error } = await supabase.rpc("criar_pergunta", { p_produto_id: produtoId, p_texto: texto });
  if (error) return responderErroBanco(res, error);

  const id = Number(data);
  const status = await publicarAprovado(supabase, "pergunta", id, moderacao);
  return res.status(200).json({ id, status, mensagem: mensagemModeracao("pergunta", status, moderacao.motivos) });
}
