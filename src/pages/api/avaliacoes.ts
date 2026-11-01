// POST /api/avaliacoes { lojaId, nota, comentario? }: avalia o vendedor (RPC avaliar_vendedor).
// Sem comentário a nota vale na hora; com comentário, vai para a moderação.
import type { NextApiRequest, NextApiResponse } from "next";
import { aceitaPostJson, responderErroBanco } from "@/lib/api-rotas";
import { mensagemModeracao, registrarModeracao, textoValido, type DecisaoModeracao } from "@/lib/moderacao";
import { createApiClient } from "@/lib/supabase";
import { LIMITES_TEXTO } from "@/lib/validacoes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!aceitaPostJson(req, res)) return;
  const lojaId = Number(req.body?.lojaId);
  const nota = Number(req.body?.nota);
  const bruto = typeof req.body?.comentario === "string" ? req.body.comentario.trim() : "";
  const comentario = bruto ? textoValido(bruto, LIMITES_TEXTO.comentarioAvaliacao) : null;
  if (!Number.isInteger(lojaId) || lojaId <= 0 || !Number.isInteger(nota) || nota < 1 || nota > 5) {
    return res.status(400).json({ erro: "Escolha uma nota de 1 a 5." });
  }
  if (bruto && !comentario) {
    return res.status(400).json({ erro: `O comentário pode ter de 2 a ${LIMITES_TEXTO.comentarioAvaliacao} caracteres.` });
  }

  const supabase = createApiClient(req, res);
  const { data, error } = await supabase.rpc("avaliar_vendedor", { p_loja_id: lojaId, p_nota: nota, p_comentario: comentario });
  if (error) return responderErroBanco(res, error);

  const resultado = data as { id: number; status: DecisaoModeracao };
  const id = Number(resultado.id);
  const status = comentario ? await registrarModeracao(supabase, "avaliacao", id, comentario) : resultado.status;
  return res.status(200).json({ id, status, mensagem: mensagemModeracao("avaliacao", status) });
}
