import { test } from "node:test";
import assert from "node:assert/strict";
import { contagemNoRange, sha1Hex } from "../senha-vazada.ts";

test("sha1Hex gera o hash em maiúsculas", async () => {
  assert.equal(await sha1Hex("password"), "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");
});

test("contagemNoRange acha o sufixo e ignora o preenchimento", () => {
  const resposta = "003D68EB55068C33ACE09247EE4C639306B:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0";
  assert.equal(contagemNoRange(resposta, "1e4c9b93f3f0682250b6cf8331b7ee68fd8"), 9545824);
  assert.equal(contagemNoRange(resposta, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"), 0);
  assert.equal(contagemNoRange(resposta, "0000000000000000000000000000000000A"), 0);
  assert.equal(contagemNoRange("", "ABC"), 0);
});
