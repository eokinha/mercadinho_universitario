import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatarCPF,
  formatarTelefone,
  handleRedeSocial,
  problemaSenha,
  validarCPF,
  validarEmail,
  instituicaoDoEmail,
  validarEmailUniversitario,
} from "../validacoes.ts";

test("validarCPF aceita CPF válido com ou sem máscara", () => {
  assert.equal(validarCPF("529.982.247-25"), true);
  assert.equal(validarCPF("52998224725"), true);
});

test("validarCPF rejeita dígito verificador errado, repetidos e tamanho inválido", () => {
  assert.equal(validarCPF("529.982.247-26"), false);
  assert.equal(validarCPF("111.111.111-11"), false);
  assert.equal(validarCPF("123"), false);
});

test("formatarCPF aplica máscara e corta excesso", () => {
  assert.equal(formatarCPF("52998224725"), "529.982.247-25");
  assert.equal(formatarCPF("5299822472599"), "529.982.247-25");
});

test("formatarTelefone formata fixo e celular", () => {
  assert.equal(formatarTelefone("3132221234"), "(31) 3222-1234");
  assert.equal(formatarTelefone("31987651234"), "(31) 98765-1234");
});

test("validarEmail", () => {
  assert.equal(validarEmail("ana@ufmg.br"), true);
  assert.equal(validarEmail("ana@"), false);
  assert.equal(validarEmail("ana ufmg.br"), false);
});

const INSTITUICOES = [
  { id: 1, nome: "UFMG", dominios: ["ufmg.br"] },
  { id: 2, nome: "PUC Minas", dominios: ["pucminas.br"] },
  { id: 3, nome: "Unijorge", dominios: ["unijorge.edu.br", "unijorge.com.br"] },
  { id: 4, nome: "Estácio", dominios: ["estacio.br"] },
  { id: 5, nome: "Sem domínio", dominios: null },
];

test("instituicaoDoEmail acha o campus pelo domínio exato ou subdomínio", () => {
  assert.equal(instituicaoDoEmail("ana@ufmg.br", INSTITUICOES)?.id, 1);
  assert.equal(instituicaoDoEmail("ana@aluno.ufmg.br", INSTITUICOES)?.id, 1);
  assert.equal(instituicaoDoEmail("ANA@SGA.PUCMINAS.BR", INSTITUICOES)?.id, 2);
  assert.equal(instituicaoDoEmail("2250108793@unijorge.com.br", INSTITUICOES)?.id, 3);
  assert.equal(instituicaoDoEmail("ana@alunos.estacio.br", INSTITUICOES)?.id, 4);
});

test("instituicaoDoEmail prefere o domínio mais específico", () => {
  const lista = [
    { id: 1, dominios: ["ufmg.br"] },
    { id: 2, dominios: ["icex.ufmg.br"] },
  ];
  assert.equal(instituicaoDoEmail("ana@icex.ufmg.br", lista)?.id, 2);
  assert.equal(instituicaoDoEmail("ana@ufmg.br", lista)?.id, 1);
});

test("validarEmailUniversitario recusa domínio fora das instituições cadastradas", () => {
  assert.equal(validarEmailUniversitario("ana@puc.edu.br", INSTITUICOES), false);
  assert.equal(validarEmailUniversitario("ana@mit.edu", INSTITUICOES), false);
  assert.equal(validarEmailUniversitario("ana@gmail.com", INSTITUICOES), false);
  assert.equal(validarEmailUniversitario("ana@outlook.com", INSTITUICOES), false);
});

test("validarEmailUniversitario não aceita domínio que só termina parecido", () => {
  assert.equal(validarEmailUniversitario("ana@fakeufmg.br", INSTITUICOES), false);
  assert.equal(validarEmailUniversitario("ufmg.br", INSTITUICOES), false);
  assert.equal(validarEmailUniversitario("", INSTITUICOES), false);
});

test("problemaSenha aceita senha com 8+ caracteres, maiúscula, minúscula e número", () => {
  assert.equal(problemaSenha("Circular2026"), null);
});

test("problemaSenha aponta o que falta", () => {
  assert.match(problemaSenha("Ab1") ?? "", /8 caracteres/);
  assert.match(problemaSenha("CIRCULAR2026") ?? "", /minúscula/);
  assert.match(problemaSenha("circular2026") ?? "", /maiúscula/);
  assert.match(problemaSenha("CircularUfmg") ?? "", /número/);
});

test("handleRedeSocial aceita só @ válido (nunca domínio ou caminho)", () => {
  assert.equal(handleRedeSocial("@lucas.silva_1"), "lucas.silva_1");
  assert.equal(handleRedeSocial("lucas"), "lucas");
  assert.equal(handleRedeSocial(".evil.example/login"), null);
  assert.equal(handleRedeSocial("evil.com/x"), null);
  assert.equal(handleRedeSocial("https://instagram.com/x"), null);
  assert.equal(handleRedeSocial(""), null);
  assert.equal(handleRedeSocial(null), null);
  assert.equal(handleRedeSocial("a".repeat(31)), null);
});

test("problemaNomeExibicao aceita vazio e marcas comuns", async () => {
  const { problemaNomeExibicao } = await import("../validacoes.ts");
  assert.equal(problemaNomeExibicao(""), null);
  assert.equal(problemaNomeExibicao("   "), null);
  assert.equal(problemaNomeExibicao("Bia Doces"), null);
  assert.equal(problemaNomeExibicao("MK Labs - Soluções em Tecnologia"), null);
});

test("problemaNomeExibicao recusa curto, longo e termos reservados (com ou sem acento)", async () => {
  const { problemaNomeExibicao } = await import("../validacoes.ts");
  assert.match(problemaNomeExibicao("A") ?? "", /2 caracteres/);
  assert.match(problemaNomeExibicao("a".repeat(61)) ?? "", /60 caracteres/);
  assert.match(problemaNomeExibicao("Equipe Circular") ?? "", /reservado/);
  assert.match(problemaNomeExibicao("Suporte Técnico") ?? "", /reservado/);
  assert.match(problemaNomeExibicao("Moderação do campus") ?? "", /reservado/);
  assert.match(problemaNomeExibicao("ADMINISTRADOR") ?? "", /reservado/);
});
