import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anuncioExpirado,
  inicioValidade,
  modalidadeDoAnuncio,
  montarDescricao,
  motivoForaDoAr,
  separarDescricao,
} from "../anuncios.ts";

const agora = new Date("2026-10-14T12:00:00.000Z");

test("motivoForaDoAr explica ao dono por que o anúncio saiu do ar", () => {
  const recente = "2026-10-01T12:00:00.000Z";
  const antigo = "2026-07-01T12:00:00.000Z";
  assert.equal(motivoForaDoAr("vendido", recente, agora), "marcado como vendido");
  assert.equal(motivoForaDoAr("pausado", antigo, agora), "pausado");
  assert.equal(motivoForaDoAr("ativo", antigo, agora), "vencido (passou de 60 dias sem renovar)");
  // ativo e dentro do prazo: só sai do ar se a loja foi pausada ou reprovada
  assert.equal(motivoForaDoAr("ativo", recente, agora), "fora do ar porque sua loja não está ativa");
});

test("anuncioExpirado usa o prazo de 60 dias", () => {
  assert.equal(anuncioExpirado("2026-10-01T12:00:00.000Z", agora), false);
  assert.equal(anuncioExpirado("2026-08-16T12:00:01.000Z", agora), false);
  assert.equal(anuncioExpirado("2026-08-15T12:00:00.000Z", agora), true);
});

test("inicioValidade é 60 dias antes de agora", () => {
  assert.equal(inicioValidade(agora), "2026-08-15T12:00:00.000Z");
});

test("modalidadeDoAnuncio deriva de preço e troca", () => {
  assert.equal(modalidadeDoAnuncio(50, false), "venda");
  assert.equal(modalidadeDoAnuncio(50, true), "ambos");
  assert.equal(modalidadeDoAnuncio(0, true), "troca");
});

test("montarDescricao e separarDescricao são inversas", () => {
  const completa = montarDescricao("Livro conservado", "Calculadora HP");
  assert.deepEqual(separarDescricao(completa), { descricao: "Livro conservado", itemTroca: "Calculadora HP" });
});

test("montarDescricao sem item de troca mantém só a descrição", () => {
  assert.equal(montarDescricao("  Livro  ", "  "), "Livro");
  assert.deepEqual(separarDescricao("Livro"), { descricao: "Livro", itemTroca: "" });
  assert.deepEqual(separarDescricao(null), { descricao: "", itemTroca: "" });
});
