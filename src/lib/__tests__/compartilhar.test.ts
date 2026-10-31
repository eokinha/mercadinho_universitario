import { test } from "node:test";
import assert from "node:assert/strict";
import {
  caminhoAnuncio,
  destinoCompartilhado,
  idDoAnuncio,
  slugDoNome,
  urlCompartilhamentoAnuncio,
  urlCompartilhamentoLoja,
} from "../compartilhar.ts";

test("urlCompartilhamentoLoja monta o link do QR com código e utm", () => {
  assert.equal(
    urlCompartilhamentoLoja("https://circular.eokinha.com.br/", "ana-costa", "5a6461f0ac39"),
    "https://circular.eokinha.com.br/perfil/ana-costa?c=5a6461f0ac39&utm_source=qr&utm_medium=qrcode"
  );
});

test("slugDoNome tira acentos, símbolos e limita o tamanho", () => {
  assert.equal(slugDoNome("Calculadora HP 50g (usada)"), "calculadora-hp-50g-usada");
  assert.equal(slugDoNome("Atlas de Anatomia Humana — Sobotta"), "atlas-de-anatomia-humana-sobotta");
  assert.equal(slugDoNome("Água de coco: 1 litro!"), "agua-de-coco-1-litro");
  assert.equal(slugDoNome("!!!"), "");
  assert.ok(slugDoNome("a".repeat(30) + " " + "b".repeat(40)).length <= 60);
  assert.ok(!slugDoNome("a".repeat(59) + " bcd").endsWith("-"));
});

test("caminhoAnuncio usa id e nome; sem nome aproveitável fica só o id", () => {
  assert.equal(caminhoAnuncio(89, "Calculadora HP 50g"), "/anuncio/89-calculadora-hp-50g");
  assert.equal(caminhoAnuncio(89, "!!!"), "/anuncio/89");
});

test("urlCompartilhamentoAnuncio monta o link do anúncio com código", () => {
  assert.equal(
    urlCompartilhamentoAnuncio("https://circular.eokinha.com.br", 89, "Calculadora HP 50g", "5a6461f0ac39"),
    "https://circular.eokinha.com.br/anuncio/89-calculadora-hp-50g?c=5a6461f0ac39&utm_source=qr&utm_medium=qrcode"
  );
});

test("idDoAnuncio aceita id com ou sem nome e recusa o resto", () => {
  assert.equal(idDoAnuncio("89-calculadora-hp-50g"), 89);
  assert.equal(idDoAnuncio("89"), 89);
  assert.equal(idDoAnuncio("0"), null);
  assert.equal(idDoAnuncio("abc"), null);
  assert.equal(idDoAnuncio("89-Com Espaço"), null);
  assert.equal(idDoAnuncio("1234567890"), null);
  assert.equal(idDoAnuncio(["89"]), null);
  assert.equal(idDoAnuncio(undefined), null);
});

test("destinoCompartilhado lê links de loja e de anúncio do next do login", () => {
  assert.deepEqual(destinoCompartilhado("/perfil/ana-costa?c=5a6461f0ac39&utm_source=qr"), {
    tipo: "loja",
    slug: "ana-costa",
    codigo: "5a6461f0ac39",
  });
  assert.deepEqual(destinoCompartilhado("/anuncio/89-calculadora-hp-50g?c=5a6461f0ac39"), {
    tipo: "anuncio",
    id: 89,
    codigo: "5a6461f0ac39",
  });
  assert.deepEqual(destinoCompartilhado("/anuncio/89?c=0123456789ab"), { tipo: "anuncio", id: 89, codigo: "0123456789ab" });
});

test("destinoCompartilhado recusa o que não é link compartilhado válido", () => {
  assert.equal(destinoCompartilhado("/perfil/ana-costa"), null);
  assert.equal(destinoCompartilhado("/anuncio/89-calculadora"), null);
  assert.equal(destinoCompartilhado("/perfil/ana-costa?c=curto"), null);
  assert.equal(destinoCompartilhado("/anuncio/abc?c=5a6461f0ac39"), null);
  assert.equal(destinoCompartilhado("/listagem?c=5a6461f0ac39"), null);
  assert.equal(destinoCompartilhado("/perfil/a/b?c=5a6461f0ac39"), null);
  assert.equal(destinoCompartilhado("//evil.com/perfil/x?c=5a6461f0ac39"), null);
  assert.equal(destinoCompartilhado("https://evil.com/anuncio/1?c=5a6461f0ac39"), null);
  assert.equal(destinoCompartilhado(undefined), null);
});
