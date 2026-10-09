import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatarCPF,
  formatarTelefone,
  validarCPF,
  validarEmail,
  validarEmailUniversitario,
} from "../validacoes.ts";

test("validarCPF aceita CPF válido com ou sem máscara", () => {
  assert.equal(validarCPF("529.982.247-25"), true);
  assert.equal(validarCPF("52998224725"), true);
});

test("validarCPF rejeita dígito verificador errado, repetidos e tamanho inválido", () => {
  assert.equal(validarCPF("529.982.247-26"), false);
  assert.equal(validarCPF("111.111.111-11"), false);
  assert.equal(validarCPF("123"), false);
});

test("formatarCPF aplica máscara e corta excesso", () => {
  assert.equal(formatarCPF("52998224725"), "529.982.247-25");
  assert.equal(formatarCPF("5299822472599"), "529.982.247-25");
});

test("formatarTelefone formata fixo e celular", () => {
  assert.equal(formatarTelefone("3132221234"), "(31) 3222-1234");
  assert.equal(formatarTelefone("31987651234"), "(31) 98765-1234");
});

test("validarEmail", () => {
  assert.equal(validarEmail("ana@ufmg.br"), true);
  assert.equal(validarEmail("ana@"), false);
  assert.equal(validarEmail("ana ufmg.br"), false);
});

test("validarEmailUniversitario reconhece domínios acadêmicos", () => {
  assert.equal(validarEmailUniversitario("ana@aluno.ufmg.br"), true);
  assert.equal(validarEmailUniversitario("ana@puc.edu.br"), true);
  assert.equal(validarEmailUniversitario("ana@mit.edu"), true);
  assert.equal(validarEmailUniversitario("2250108793@unijorge.com.br"), true);
  assert.equal(validarEmailUniversitario("ANA@USP.BR"), true);
});

test("validarEmailUniversitario aceita subdomínio aluno.", () => {
  assert.equal(validarEmailUniversitario("ana@aluno.faculdade.com.br"), true);
});

test("validarEmailUniversitario não aceita domínio que só termina parecido", () => {
  assert.equal(validarEmailUniversitario("ana@fakeusp.br"), false);
  assert.equal(validarEmailUniversitario("ana@meualuno.com"), false);
  assert.equal(validarEmailUniversitario("usp.br"), false);
});

test("validarEmailUniversitario rejeita e-mails comuns", () => {
  assert.equal(validarEmailUniversitario("ana@gmail.com"), false);
  assert.equal(validarEmailUniversitario("ana@outlook.com"), false);
});
