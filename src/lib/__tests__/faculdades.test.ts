import { test } from "node:test";
import assert from "node:assert/strict";
import { logoDaFaculdade, nomeCurtoFaculdade } from "../faculdades.ts";

test("logoDaFaculdade acha o logo por qualquer domínio da instituição", () => {
  assert.equal(logoDaFaculdade(["unijorge.edu.br", "unijorge.com.br"]), "/faculdades/unijorge.svg");
  assert.equal(logoDaFaculdade(["outro.br", " UNIJORGE.COM.BR "]), "/faculdades/unijorge.svg");
});

test("logoDaFaculdade sem logo cadastrado devolve null", () => {
  assert.equal(logoDaFaculdade(["ufmg.br"]), null);
  assert.equal(logoDaFaculdade([]), null);
  assert.equal(logoDaFaculdade(null), null);
});

test("nomeCurtoFaculdade usa a sigla entre parênteses", () => {
  assert.equal(nomeCurtoFaculdade("Centro Universitário Jorge Amado (Unijorge)"), "Unijorge");
  assert.equal(nomeCurtoFaculdade("Universidade Católica do Salvador (UCSal)"), "UCSal");
  assert.equal(nomeCurtoFaculdade("Estácio"), "Estácio");
});
