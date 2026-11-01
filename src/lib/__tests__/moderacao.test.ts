import { test } from "node:test";
import assert from "node:assert/strict";
import { decisaoVettly, mensagemModeracao, statusDoErro, textoValido } from "../moderacao.ts";

test("decisaoVettly: allow sem sinalização aprova e guarda o decisionId", () => {
  assert.deepEqual(decisaoVettly({ action: "allow", flagged: false, decisionId: "dec_1" }), { decisao: "aprovado", id: "dec_1" });
});

test("decisaoVettly: block recusa", () => {
  assert.deepEqual(decisaoVettly({ action: "block", flagged: true, decisionId: "dec_2" }), { decisao: "recusado", id: "dec_2" });
});

test("decisaoVettly: sinalizado, flag ou formato estranho fica pendente", () => {
  assert.equal(decisaoVettly({ action: "allow", flagged: true }).decisao, "pendente");
  assert.equal(decisaoVettly({ action: "flag" }).decisao, "pendente");
  assert.equal(decisaoVettly(null).decisao, "pendente");
  assert.equal(decisaoVettly("allow").decisao, "pendente");
  assert.equal(decisaoVettly({ action: "allow", decisionId: 7 }).id, null);
});

test("mensagemModeracao: texto por tipo e decisão", () => {
  assert.equal(mensagemModeracao("pergunta", "aprovado"), "Sua pergunta foi publicada.");
  assert.match(mensagemModeracao("avaliacao", "pendente"), /^Sua avaliação está em análise/);
  assert.match(mensagemModeracao("resposta", "recusado"), /^Sua resposta não foi publicada/);
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
