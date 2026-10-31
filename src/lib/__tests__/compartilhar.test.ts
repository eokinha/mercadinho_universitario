import { test } from "node:test";
import assert from "node:assert/strict";
import { lojaDoDestino, urlCompartilhamentoLoja } from "../compartilhar.ts";

test("urlCompartilhamentoLoja monta o link do QR com código e utm", () => {
  assert.equal(
    urlCompartilhamentoLoja("https://circular.eokinha.com.br/", "ana-costa", "5a6461f0ac39"),
    "https://circular.eokinha.com.br/perfil/ana-costa?c=5a6461f0ac39&utm_source=qr&utm_medium=qrcode"
  );
});

test("lojaDoDestino lê slug e código do next do login", () => {
  assert.deepEqual(lojaDoDestino("/perfil/ana-costa?c=5a6461f0ac39&utm_source=qr"), {
    slug: "ana-costa",
    codigo: "5a6461f0ac39",
  });
  assert.deepEqual(lojaDoDestino("/perfil/aluno-24?c=0123456789ab"), { slug: "aluno-24", codigo: "0123456789ab" });
});

test("lojaDoDestino recusa o que não é link de QR válido", () => {
  assert.equal(lojaDoDestino("/perfil/ana-costa"), null);
  assert.equal(lojaDoDestino("/perfil/ana-costa?c=curto"), null);
  assert.equal(lojaDoDestino("/perfil/ana-costa?c=ZZZZZZZZZZZZ"), null);
  assert.equal(lojaDoDestino("/listagem?c=5a6461f0ac39"), null);
  assert.equal(lojaDoDestino("/perfil/a/b?c=5a6461f0ac39"), null);
  assert.equal(lojaDoDestino("//evil.com/perfil/x?c=5a6461f0ac39"), null);
  assert.equal(lojaDoDestino("https://evil.com/perfil/x?c=5a6461f0ac39"), null);
  assert.equal(lojaDoDestino(undefined), null);
  assert.equal(lojaDoDestino(["/perfil/x?c=5a6461f0ac39"]), null);
});
