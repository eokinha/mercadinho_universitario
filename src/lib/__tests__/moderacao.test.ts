import { test } from "node:test";
import assert from "node:assert/strict";
import { decisaoVettly, mensagemModeracao, motivosEmTexto, statusDoErro, textoValido } from "../moderacao.ts";

test("decisaoVettly: allow sem sinalização aprova e guarda o decisionId", () => {
  assert.deepEqual(decisaoVettly({ action: "allow", flagged: false, decisionId: "dec_1", categories: [] }), {
    decisao: "aprovado",
    id: "dec_1",
    motivos: [],
  });
});

test("decisaoVettly: block recusa e devolve só as categorias que dispararam", () => {
  const r = decisaoVettly({
    action: "block",
    flagged: true,
    decisionId: "dec_2",
    categories: [
      { category: "harassment", score: 0.92, threshold: 0.6, triggered: true },
      { category: "sexual", score: 0.01, threshold: 0.7, triggered: false },
      { category: "harassment", score: 0.92, threshold: 0.6, triggered: true },
    ],
  });
  assert.deepEqual(r, { decisao: "recusado", id: "dec_2", motivos: ["harassment"] });
});

test("decisaoVettly: sinalizado, flag ou formato estranho fica pendente", () => {
  assert.equal(decisaoVettly({ action: "allow", flagged: true }).decisao, "pendente");
  assert.deepEqual(decisaoVettly({ action: "flag", categories: [{ category: "spam", triggered: true }] }).motivos, ["spam"]);
  assert.equal(decisaoVettly(null).decisao, "pendente");
  assert.equal(decisaoVettly("allow").decisao, "pendente");
  assert.equal(decisaoVettly({ action: "allow", decisionId: 7 }).id, null);
});

test("motivosEmTexto: traduz categorias e junta com vírgula e 'e'", () => {
  assert.equal(motivosEmTexto(["harassment"]), "ofensa ou assédio");
  assert.equal(motivosEmTexto(["harassment", "hate_speech", "scam"]).split(" e ").length > 1, true);
  assert.match(motivosEmTexto(["harassment", "hate_speech"]), /^ofensa ou assédio e discurso de ódio$/);
  assert.equal(motivosEmTexto(["hate", "hate_speech"]), "discurso de ódio");
  assert.equal(motivosEmTexto([]), "conteúdo contra as regras do Circular");
  assert.equal(motivosEmTexto(["desconhecida"]), "conteúdo contra as regras do Circular");
});

test("mensagemModeracao: aprovação e recusa explicam o motivo", () => {
  assert.match(mensagemModeracao("pergunta", "aprovado"), /^Sua pergunta passou na moderação automática.*publicada\.$/);
  const recusa = mensagemModeracao("avaliacao", "recusado", ["scam"]);
  assert.match(recusa, /^Seu comentário não foi publicado/);
  assert.match(recusa, /indício de golpe/);
  assert.match(recusa, /Nada foi salvo/);
  assert.match(mensagemModeracao("resposta", "pendente", ["spam"]), /revisão da equipe porque pode conter spam/);
  assert.match(mensagemModeracao("resposta", "pendente"), /^Sua resposta foi para a revisão da equipe e aparece/);
});

test("statusDoErro: SQLSTATE das RPCs vira status HTTP", () => {
  assert.equal(statusDoErro("42501"), 401);
  assert.equal(statusDoErro("PT403"), 403);
  assert.equal(statusDoErro("PT404"), 404);
  assert.equal(statusDoErro("PT429"), 429);
  assert.equal(statusDoErro("23514"), 400);
  assert.equal(statusDoErro(undefined), 500);
});

test("textoValido: exige texto com 2 até o máximo de caracteres", () => {
  assert.equal(textoValido("  Ainda tem?  ", 500), "Ainda tem?");
  assert.equal(textoValido("a", 500), null);
  assert.equal(textoValido("x".repeat(501), 500), null);
  assert.equal(textoValido(42, 500), null);
});
