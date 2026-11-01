// POST /api/respostas { perguntaId, texto }: o dono do anúncio responde. Modera na Vettly antes de gravar
// (RPC responder_pergunta); resposta recusada não é gravada e o dono pode escrever outra.
import type { NextApiRequest, NextApiResponse } from "next";
import { aceitaPostJson, exigirLogin, responderErroBanco } from "@/lib/api-rotas";
import { mensagemModeracao, moderarTexto, publicarAprovado, textoValido } from "@/lib/moderacao";
import { createApiClient } from "@/lib/supabase";
import { LIMITES_TEXTO } from "@/lib/validacoes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!aceitaPostJson(req, res)) return;
  const perguntaId = Number(req.body?.perguntaId);
  const texto = textoValido(req.body?.texto, LIMITES_TEXTO.resposta);
  if (!Number.isInteger(perguntaId) || perguntaId <= 0 || !texto) {
    return res.status(400).json({ erro: `Escreva a resposta com 2 a ${LIMITES_TEXTO.resposta} caracteres.` });
  }

  const supabase = createApiClient(req, res);
  if (!(await exigirLogin(supabase, res))) return;

  const moderacao = await moderarTexto(texto);
  if (moderacao.decisao === "recusado") {
    return res.status(200).json({ id: null, status: "recusado", mensagem: mensagemModeracao("resposta", "recusado", moderacao.motivos) });
  }

  const { error } = await supabase.rpc("responder_pergunta", { p_pergunta_id: perguntaId, p_texto: texto });
  if (error) return responderErroBanco(res, error);

  const status = await publicarAprovado(supabase, "resposta", perguntaId, moderacao);
  return res.status(200).json({ id: perguntaId, status, mensagem: mensagemModeracao("resposta", status, moderacao.motivos) });
}
