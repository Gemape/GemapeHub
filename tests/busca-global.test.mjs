import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buscarGlobal } from "../src/lib/busca-global.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const fontes = {
  empregados: [
    { id: "e1", nome: "João da Silva", matricula: "A-1234", empresa_id: "emp1", ativo: true },
    { id: "e2", nome: "Maria Souza", matricula: "5678", ativo: false },
  ],
  veiculos: [{ id: "v1", placa: "ABC1D23", marca: "Fiat", modelo: "Strada" }, { id: "v2", placa: "XYZ-9876", marca: "VW", modelo: "Gol" }],
  epis: [{ id: "p1", nome: "Luva de raspa", codigo_sku: "EPI-0007", ca: "34.567" }, { id: "p2", nome: "Capacete", codigo_sku: "EPI-0008", status: "Inativo" }],
  uniformes: [{ id: "u1", nome: "Camisa polo", codigo_sku: "UNI-01" }],
  ferramentas: [{ id: "f1", nome: "Furadeira 04", codigo_sku: "FER-0004" }],
};
const titulos = (g) => g.flatMap((x) => x.itens.map((i) => i.titulo));

test("acha por nome (início das palavras, sem acento), matrícula, placa e código, agrupado por módulo", () => {
  assert.deepEqual(buscarGlobal("joao si", fontes).map((g) => g.modulo), ["Empregados"]);
  assert.deepEqual(titulos(buscarGlobal("a1234", fontes)), ["João da Silva"], "matrícula sem hífen");
  assert.deepEqual(titulos(buscarGlobal("abc-1d23", fontes)), ["Placa ABC1D23"], "placa com hífen e minúscula");
  assert.deepEqual(titulos(buscarGlobal("epi 0007", fontes)), ["Luva de raspa"], "código com espaço");
  assert.deepEqual(titulos(buscarGlobal("34567", fontes)), ["Luva de raspa"], "CA do EPI");
  assert.deepEqual(buscarGlobal("fer", fontes).map((g) => g.modulo), ["Ferramentas"]);
});

test("item inativo fica de fora; menos de 2 caracteres não busca; sem acerto devolve vazio", () => {
  assert.deepEqual(buscarGlobal("capacete", fontes), []);
  assert.deepEqual(buscarGlobal("a", fontes), []);
  assert.deepEqual(buscarGlobal("   ", fontes), []);
  assert.deepEqual(buscarGlobal("zzzz", fontes), []);
});

test("cada resultado leva à tela do item, não à lista do módulo", () => {
  const d = (t) => buscarGlobal(t, fontes)[0].itens[0].destino;
  assert.deepEqual(d("joao"), { url: "/epi", search: { aba: "historico", empresa: "emp1", empregado: "e1" } });
  assert.deepEqual(d("abc1d23"), { url: "/veiculos", search: { aba: "frota", extrato: "v1" } });
  assert.deepEqual(d("luva"), { url: "/epi", search: { aba: "estoque", q: "EPI-0007" } });
  assert.deepEqual(d("polo"), { url: "/uniformes", search: { aba: "estoque", q: "UNI-01" } });
  assert.deepEqual(d("furadeira"), { url: "/ferramentas", search: { aba: "estoque", q: "FER-0004", item: "f1" } });
});

test("o rótulo diz para onde o resultado vai", () => {
  const a = (t) => buscarGlobal(t, fontes)[0].itens[0].acao;
  assert.equal(a("luva"), "EPI — abrir na lista");
  assert.equal(a("polo"), "Uniforme — abrir na lista");
  assert.equal(a("furadeira"), "Abrir extrato");
});

test("módulo sem fonte (sem permissão) não aparece; há no máximo 5 por módulo", () => {
  assert.deepEqual(buscarGlobal("silva", { ...fontes, empregados: undefined }), []);
  const muitos = { empregados: Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, nome: `Pedro ${i}` })) };
  assert.equal(buscarGlobal("pedro", muitos)[0].itens.length, 5);
});

test("o cabeçalho de todas as telas tem a busca global, aberta por Ctrl+K ou pelo ícone, com permissão por módulo", () => {
  const rota = ler("routes/_authenticated/route.tsx");
  const busca = ler("components/layout/BuscaGlobal.tsx");
  assert.match(rota, /<BuscaGlobal \/>/);
  assert.match(busca, /\(e\.ctrlKey \|\| e\.metaKey\)[\s\S]*?"k"/);
  assert.match(busca, /aria-label="Buscar em todo o sistema \(Ctrl\+K\)"/);
  assert.match(busca, /<Dialog open=\{aberta\} onOpenChange=\{setAberta\}>/, "Esc fecha pelo diálogo");
  for (const caminho of ["/veiculos", "/uniformes", "/ferramentas"]) assert.match(busca, new RegExp(`podeVerCaminho\\("${caminho}"`));
  assert.match(busca, /podeVerCaminho\("\/epi", \{ aba: "historico" \}\)/);
});

test("o Estoque abre filtrado pelo item (q) e a ferramenta abre o extrato (item)", () => {
  assert.match(ler("routes/_authenticated/epi.tsx"), /search\["q"\]/);
  assert.match(ler("routes/_authenticated/uniformes.tsx"), /search\["q"\]/);
  assert.match(ler("routes/_authenticated/ferramentas.tsx"), /search\["item"\]/);
  const pagina = ler("components/modules/PaginaModulo.tsx");
  assert.match(pagina, /buscaInicial: q/);
  assert.match(pagina, /abrirItem: item/);
  assert.match(ler("components/modules/EstoqueModulo.tsx"), /useState\(buscaInicial\)/);
  assert.match(ler("components/modules/EstoqueEpiModulo.tsx"), /useState\(buscaInicial\)/);
});
