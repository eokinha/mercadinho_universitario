import { test } from "node:test";
import assert from "node:assert/strict";
import { FAQ } from "../faq.ts";

test("ids de seções e perguntas são únicos e servem de âncora", () => {
  const ids = FAQ.flatMap((s) => [s.id, ...s.perguntas.map((p) => p.id)]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("links do FAQ são só caminhos internos", () => {
  for (const p of FAQ.flatMap((s) => s.perguntas)) {
    for (const l of p.links ?? []) assert.match(l.href, /^\/(?![/\\])/);
  }
});

test("as âncoras usadas pelas telas de e-mail existem", () => {
  const ids = new Set(FAQ.flatMap((s) => s.perguntas.map((p) => p.id)));
  assert.ok(ids.has("nao-chegou"));
  assert.ok(ids.has("acessar-email"));
});

test("toda pergunta tem resposta", () => {
  for (const p of FAQ.flatMap((s) => s.perguntas)) {
    assert.ok(p.resposta.length > 0 && p.resposta.every((r) => r.trim().length > 0), p.id);
  }
});
