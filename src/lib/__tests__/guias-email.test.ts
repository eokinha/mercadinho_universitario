import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIAS_POR_DOMINIO, dominioDoEmail, guiaDaInstituicao, guiaDoEmail } from "../guias-email.ts";

test("dominioDoEmail normaliza e tolera e-mail sem @", () => {
  assert.equal(dominioDoEmail("  Ana@UNIJORGE.edu.br "), "unijorge.edu.br");
  assert.equal(dominioDoEmail("sem-arroba"), "");
});

test("guiaDoEmail casa domínio exato e subdomínio", () => {
  assert.equal(guiaDoEmail("ana@unijorge.edu.br")?.provedor, "microsoft");
  assert.equal(guiaDoEmail("ana@alunos.estacio.br")?.provedor, "microsoft");
  assert.equal(guiaDoEmail("ana@ucsal.br")?.provedor, "google");
});

test("guiaDoEmail não casa domínio parecido nem desconhecido", () => {
  assert.equal(guiaDoEmail("ana@falsoestacio.br"), null);
  assert.equal(guiaDoEmail("ana@gmail.com"), null);
  assert.equal(guiaDoEmail(""), null);
});

test("guiaDaInstituicao usa o primeiro domínio com guia", () => {
  assert.equal(guiaDaInstituicao(["desconhecido.br", "UCSAL.br"])?.provedor, "google");
  assert.equal(guiaDaInstituicao(["ufmg.br"]), null);
  assert.equal(guiaDaInstituicao(null), null);
});

test("domínios dos guias estão em minúsculas e sem @", () => {
  for (const d of Object.keys(GUIAS_POR_DOMINIO)) {
    assert.equal(d, d.toLowerCase().trim());
    assert.ok(!d.includes("@"));
  }
});
