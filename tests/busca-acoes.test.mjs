import assert from "node:assert/strict";
import test from "node:test";

import { buscarRegistros } from "../src/lib/busca-acoes.ts";
import { chavePagina, empurrarPagina, guardarRolagem, lerSessao, paginaAnterior, recuarPara, registrarNaSessao, vizinhosNaLista } from "../src/lib/navegacao-contextual.ts";

const dados = {
  empregados: [
    { id: "e1", nome: "João Silva", empresa_id: "emp1", matricula: "L1P2", cpf: "12345678901", ativo: true },
    { id: "e2", nome: "Joana Dias", empresa_id: "emp1", ativo: false, data_demissao: "2026-10-01" },
  ],
  epis: [{ id: "i1", nome: "Bota de Segurança", codigo_sku: "EPI-0007", ca: "34567", estoque_atual: 18 }, { id: "i2", nome: "Luva", codigo_sku: "EPI-0002", ca: "11111", estoque_atual: 3, status: "Inativo" }],
};

test("busca de ações: empregado traz ver ficha, entregar e devolver; desligado não recebe entrega", () => {
  const [r] = buscarRegistros("joao si", dados);
  assert.equal(r.titulo, "João Silva");
  assert.deepEqual(r.acoes.map((a) => a.rotulo), ["Ver ficha", "+ Entregar EPI", "Registrar devolução"]);
  assert.equal(r.acoes[1].search.empregado, "e1");
  assert.equal(r.acoes[2].search.modo, "devolucao", "devolução abre a tela já no modo devolução");
  assert.equal(r.acoes[1].search.modo, undefined);
  const desligado = buscarRegistros("joana", dados)[0];
  assert.deepEqual(desligado.acoes.map((a) => a.rotulo), ["Ver ficha", "Registrar devolução"]);
});

test("busca de ações: CA e código acham o EPI com saldo e entrada; item inativo fica de fora", () => {
  const porCa = buscarRegistros("CA 34567", dados);
  assert.equal(porCa.length, 1);
  assert.deepEqual(porCa[0].acoes.map((a) => a.rotulo), ["Ver saldo (18 un)", "Dar entrada"]);
  assert.equal(buscarRegistros("epi-0007", dados)[0].titulo, "Bota de Segurança");
  assert.equal(buscarRegistros("luva", dados).length, 0);
  assert.equal(buscarRegistros("j", dados).length, 0, "um caractere só não busca");
  assert.equal(buscarRegistros("12345678", dados)[0].titulo, "João Silva", "CPF por número");
  assert.equal(buscarRegistros("123.456.78", dados)[0].titulo, "João Silva", "CPF digitado com pontuação");
  assert.equal(buscarRegistros("CA 34.567", dados)[0].titulo, "Bota de Segurança", "CA com pontuação");
  assert.equal(buscarRegistros("ca-34567", dados)[0].titulo, "Bota de Segurança");
  assert.equal(buscarRegistros("L1P2", dados)[0].titulo, "João Silva", "matrícula");
});

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)) }; };

test("navegação: pilha de telas, voltar para a anterior e rolagem guardada", () => {
  const s = mem();
  empurrarPagina(s, "u", { rotulo: "Histórico", url: "/epi", search: { aba: "historico" } });
  guardarRolagem(s, "u", chavePagina("/epi", { aba: "historico" }), 640.4);
  empurrarPagina(s, "u", { rotulo: "Ficha", url: "/epi-ficha", search: { epi: "i1" } });
  const atual = chavePagina("/epi-ficha", { epi: "i1" });
  const ant = paginaAnterior(s, "u", atual);
  assert.equal(ant.rotulo, "Histórico");
  assert.equal(ant.rolagem, 640);
  recuarPara(s, "u", ant.chave);
  assert.equal(paginaAnterior(s, "u", ant.chave), null, "depois de voltar não há mais atrás");
  empurrarPagina(s, "u", { rotulo: "Ficha: Bota", url: "/epi-ficha", search: { epi: "i1" } });
  empurrarPagina(s, "u", { rotulo: "Ficha: Bota Nº 42", url: "/epi-ficha", search: { epi: "i1" } });
  assert.equal(paginaAnterior(s, "u", atual).rotulo, "Histórico", "o rótulo novo da mesma tela não cria entrada repetida");
  assert.equal(paginaAnterior(mem(), "u", atual), null);
  assert.equal(paginaAnterior(undefined, "u", atual), null, "sem armazenamento não quebra");
});

test("navegação: linha do tempo guarda os 10 últimos sem repetir e a vizinhança fica na lista", () => {
  const s = mem();
  for (let n = 1; n <= 12; n++) registrarNaSessao(s, "u", { tipo: "Colaborador", rotulo: `E${n}`, url: "/epi", search: { empregado: `e${n}` } });
  registrarNaSessao(s, "u", { tipo: "Colaborador", rotulo: "E5", url: "/epi", search: { empregado: "e5" } });
  const l = lerSessao(s, "u");
  assert.equal(l.length, 10);
  assert.equal(l[0].rotulo, "E5");
  assert.equal(l.filter((x) => x.rotulo === "E5").length, 1);
  const ids = ["a", "b", "c"];
  assert.deepEqual(vizinhosNaLista(ids.map((id) => ({ id })), "b"), { anterior: { id: "a" }, proximo: { id: "c" }, posicao: 2, total: 3 });
  assert.equal(vizinhosNaLista([{ id: "a" }, { id: "b" }], "a").anterior, null);
  assert.equal(vizinhosNaLista([{ id: "a" }], "a"), null);
  assert.equal(vizinhosNaLista([{ id: "a" }, { id: "b" }], "zz"), null);
});
