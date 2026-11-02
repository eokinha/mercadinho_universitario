import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarPrazo, motivoValido, rotuloAcaoConta, situacaoDaConta } from "../contas.ts";

test("situacaoDaConta: ativa, suspensa (com prazo) e bloqueada (sem prazo)", () => {
  assert.equal(situacaoDaConta("ativo", null), "ativa");
  assert.equal(situacaoDaConta("ativo", "2026-11-09T12:00:00Z"), "ativa");
  assert.equal(situacaoDaConta("bloqueado", "2026-11-09T12:00:00Z"), "suspensa");
  assert.equal(situacaoDaConta("bloqueado", null), "bloqueada");
});

test("formatarPrazo: data e hora no fuso da Bahia", () => {
  assert.equal(formatarPrazo("2026-11-09T15:30:00Z"), "09/11/2026 às 12:30");
  assert.equal(formatarPrazo("data ruim"), "");
});

test("motivoValido: de 5 a 300 caracteres depois do trim", () => {
  assert.equal(motivoValido("  oi  "), false);
  assert.equal(motivoValido("Golpe com PIX"), true);
  assert.equal(motivoValido("x".repeat(300)), true);
  assert.equal(motivoValido("x".repeat(301)), false);
});

test("rotuloAcaoConta: ações do histórico em português", () => {
  assert.equal(rotuloAcaoConta("suspender"), "Suspensa");
  assert.equal(rotuloAcaoConta("fim_suspensao"), "Fim da suspensão");
  assert.equal(rotuloAcaoConta("outra"), "outra");
});
