import { test } from "node:test";
import assert from "node:assert/strict";
import { AVISOS_LOGIN, mensagemAvisoLogin, urlLogin } from "../avisos-login.ts";

test("mensagemAvisoLogin devolve só mensagens conhecidas", () => {
  assert.equal(mensagemAvisoLogin("contato"), AVISOS_LOGIN.contato);
  assert.equal(mensagemAvisoLogin("Sua conta foi suspensa, ligue para 0800"), null);
  assert.equal(mensagemAvisoLogin("toString"), null);
  assert.equal(mensagemAvisoLogin("__proto__"), null);
  assert.equal(mensagemAvisoLogin(["contato"]), null);
  assert.equal(mensagemAvisoLogin(undefined), null);
});

test("urlLogin monta aviso e next codificados", () => {
  assert.equal(urlLogin("painel"), "/login?aviso=painel");
  assert.equal(urlLogin("contato", "/perfil/1?x=1&y=2"), "/login?aviso=contato&next=%2Fperfil%2F1%3Fx%3D1%26y%3D2");
});
