import { test } from "node:test";
import assert from "node:assert/strict";
import { TITULO_PADRAO, tituloDaRota } from "../titulos.ts";

test("tituloDaRota devolve o título da rota conhecida", () => {
  assert.equal(tituloDaRota("/login"), "Entrar • Circular");
  assert.equal(tituloDaRota("/listagem"), "Anúncios do seu campus • Circular");
  assert.equal(tituloDaRota("/admin/imagens"), "Imagens • Admin Circular");
});

test("tituloDaRota usa o padrão em rota sem título (nunca a URL)", () => {
  assert.equal(tituloDaRota("/"), TITULO_PADRAO);
  assert.equal(tituloDaRota("/anuncio/[id]"), TITULO_PADRAO);
  assert.equal(tituloDaRota("/qualquer-coisa"), TITULO_PADRAO);
});
