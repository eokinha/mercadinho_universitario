import { test } from "node:test";
import assert from "node:assert/strict";
import {
  horarioMensagem,
  mesclarMensagens,
  rotuloDia,
  topicoConversa,
  topicoDigitando,
  topicoUsuario,
  ultimoIdConfirmado,
  type MensagemTela,
} from "../chat.ts";

function msg(id: number, cliente: string, extra: Partial<MensagemTela> = {}): MensagemTela {
  return {
    id,
    conversa_id: "c",
    autor_id: 1,
    texto: `m${id}`,
    cliente_id: cliente,
    criado_em: `2026-11-01T12:00:0${Math.abs(id) % 10}.000Z`,
    lida_em: null,
    ...extra,
  };
}

test("tópicos seguem o formato autorizado no banco (pode_usar_topico_realtime)", () => {
  assert.equal(topicoConversa("abc"), "conversa:abc");
  assert.equal(topicoDigitando("abc"), "conversa:abc:digitando");
  assert.equal(topicoUsuario(7), "usuario:7");
});

test("mesclarMensagens não duplica a mensagem que chega pela RPC e pelo Realtime", () => {
  const lista = mesclarMensagens([msg(1, "a")], [msg(2, "b"), msg(2, "b")]);
  assert.deepEqual(lista.map((m) => m.id), [1, 2]);
});

test("mesclarMensagens troca a provisória pela confirmada e mantém a ordem por id", () => {
  const provisoria = msg(-5, "x", { pendente: true });
  const lista = mesclarMensagens([msg(3, "a"), provisoria], [msg(4, "x"), msg(2, "b")]);
  assert.deepEqual(lista.map((m) => m.id), [2, 3, 4]);
  assert.equal(lista[2].pendente, undefined);
});

test("mesclarMensagens não deixa a provisória sobrescrever a confirmada", () => {
  const lista = mesclarMensagens([msg(4, "x")], [msg(-1, "x", { pendente: true })]);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, 4);
});

test("pendentes e com falha ficam no fim", () => {
  const lista = mesclarMensagens(
    [msg(-9, "p", { pendente: true, criado_em: "2026-11-01T12:00:01.000Z" }), msg(1, "a")],
    [msg(-8, "f", { falhou: true, criado_em: "2026-11-01T12:00:02.000Z" })]
  );
  assert.deepEqual(lista.map((m) => m.cliente_id), ["a", "p", "f"]);
});

test("ultimoIdConfirmado ignora provisórias", () => {
  assert.equal(ultimoIdConfirmado([msg(3, "a"), msg(-1, "b", { pendente: true })]), 3);
  assert.equal(ultimoIdConfirmado([msg(-1, "b", { pendente: true })]), null);
});

test("rotuloDia e horarioMensagem tratam hoje, ontem e datas inválidas", () => {
  const agora = new Date(2026, 10, 1, 15, 0);
  assert.equal(rotuloDia(new Date(2026, 10, 1, 9, 0).toISOString(), agora), "Hoje");
  assert.equal(rotuloDia(new Date(2026, 9, 31, 9, 0).toISOString(), agora), "Ontem");
  assert.equal(horarioMensagem(new Date(2026, 9, 31, 9, 0).toISOString(), agora), "ontem");
  assert.equal(horarioMensagem("data ruim", agora), "");
});
