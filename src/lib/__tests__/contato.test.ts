import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarTelefone, linkWhatsapp, normalizarTelefone } from "../contato.ts";

test("normalizarTelefone adiciona DDI 55 a números com DDD", () => {
  assert.equal(normalizarTelefone("(31) 98765-1234"), "5531987651234");
  assert.equal(normalizarTelefone("3132221234"), "553132221234");
});

test("normalizarTelefone mantém número que já tem DDI", () => {
  assert.equal(normalizarTelefone("+55 31 98765-1234"), "5531987651234");
});

test("linkWhatsapp gera wa.me só com dígitos", () => {
  assert.equal(linkWhatsapp("(31) 98765-1234"), "https://wa.me/5531987651234");
});

test("formatarTelefone exibe com DDI e máscara", () => {
  assert.equal(formatarTelefone("5531987651234"), "+55 (31) 98765-1234");
  assert.equal(formatarTelefone("553132221234"), "+55 (31) 3222-1234");
});

test("formatarTelefone devolve o valor original se for curto demais", () => {
  assert.equal(formatarTelefone("1234"), "1234");
});
