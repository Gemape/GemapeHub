import { test } from "node:test";
import assert from "node:assert/strict";

import { editarEpiCatalogo } from "../src/lib/epi-catalogo.ts";

const base = () => ({
  epis_catalogo: [
    { id: "c1", codigo_sku: "EPI-0001", nome: "Luva de raspa", categoria: "Luva", subcategoria_id: "s1", unidade_id: null, unidade_medida: null, tamanho_id: "t-p", estoque_minimo: 5 },
    { id: "c2", codigo_sku: "EPI-0002", nome: "Luva de raspa", categoria: "Luva", subcategoria_id: "s1", unidade_id: null, unidade_medida: null, tamanho_id: "t-m", estoque_minimo: 3 },
    { id: "c3", codigo_sku: "EPI-0003", nome: "Capacete", categoria: "Capacete", subcategoria_id: "s2", unidade_id: "u1", unidade_medida: "Un", tamanho_id: null, estoque_minimo: 2 },
  ],
  epis: [
    { id: "e1", catalogo_id: "c1", empresa_id: "a", estoque_atual: 0, estoque_minimo: 5, nome: "Luva de raspa", tamanhos_selecionados: ["t-p"] },
    { id: "e2", catalogo_id: "c2", empresa_id: "a", estoque_atual: 0, estoque_minimo: 3, nome: "Luva de raspa", tamanhos_selecionados: ["t-m"] },
    { id: "e3", catalogo_id: "c3", empresa_id: "a", estoque_atual: 4, estoque_minimo: 2, nome: "Capacete", tamanhos_selecionados: [] },
  ],
  movimentacoes: [],
  enderecamentos: [],
});
const v = (extra) => ({ nome: "Luva de raspa", estoque_minimo: 5, ...extra });

test("sem saldo nem histórico, o tamanho pode mudar e vai ao estoque das empresas", () => {
  const d = base();
  const r = editarEpiCatalogo(d, "c1", v({ tamanho_id: "t-g", tamanhosPermitidos: ["t-p", "t-m", "t-g"] }));
  assert.equal(r.erro, undefined);
  assert.equal(d.epis_catalogo[0].tamanho_id, "t-g");
  assert.deepEqual(d.epis[0].tamanhos_selecionados, ["t-g"]);
  assert.equal(d.epis_catalogo[0].codigo_sku, "EPI-0001");
});

test("tamanho repetido na mesma descrição ou fora da subcategoria é recusado, sem gravar nada", () => {
  const d = base();
  assert.match(editarEpiCatalogo(d, "c1", v({ tamanho_id: "t-m" })).erro, /já está cadastrado neste tamanho/i);
  assert.match(editarEpiCatalogo(d, "c1", v({ tamanho_id: "t-x", tamanhosPermitidos: ["t-p"] })).erro, /não associado/i);
  assert.equal(d.epis_catalogo[0].tamanho_id, "t-p");
});

test("com saldo ou histórico, subcategoria, unidade e tamanho ficam travados", () => {
  const d = base();
  const r = editarEpiCatalogo(d, "c3", { nome: "Capacete", estoque_minimo: 2, subcategoria: { id: "s9", nome: "Outro" } }, undefined);
  assert.match(r.erro, /saldo/i);
  assert.equal(d.epis_catalogo[2].subcategoria_id, "s2");
  const h = base();
  h.movimentacoes.push({ id: "m1", item_id: "e1" });
  assert.match(editarEpiCatalogo(h, "c1", v({ tamanho_id: "t-g" })).erro, /hist[óo]rico/i);
});

test("mudar subcategoria e unidade vale para todos os tamanhos da descrição e exige tamanhos permitidos", () => {
  const d = base();
  assert.match(
    editarEpiCatalogo(d, "c1", v({ subcategoria: { id: "s7", nome: "Luva Nova" }, tamanhosPermitidos: ["t-p"] })).erro,
    /não associado/i,
  );
  const r = editarEpiCatalogo(d, "c1", v({ subcategoria: { id: "s7", nome: "Luva Nova" }, unidade: { id: "u2", nome: "Par" }, tamanhosPermitidos: ["t-p", "t-m"] }));
  assert.equal(r.erro, undefined);
  for (const i of [0, 1]) {
    assert.equal(d.epis_catalogo[i].subcategoria_id, "s7");
    assert.equal(d.epis_catalogo[i].categoria, "Luva Nova");
    assert.equal(d.epis_catalogo[i].unidade_medida, "Par");
  }
  assert.equal(d.epis[1].categoria, "Luva Nova");
  assert.equal(d.epis_catalogo[2].subcategoria_id, "s2");
});

test("se um dos tamanhos da descrição tem saldo, subcategoria e unidade ficam travadas para todos", () => {
  const d = base();
  d.epis[1].estoque_atual = 2;
  assert.match(editarEpiCatalogo(d, "c1", v({ subcategoria: { id: "s7", nome: "X" }, tamanhosPermitidos: ["t-p", "t-m"] })).erro, /saldo/i);
  assert.equal(d.epis_catalogo[0].subcategoria_id, "s1");
});

test("sem pedir mudança estrutural, a edição de descrição e mínimo segue valendo mesmo com saldo", () => {
  const d = base();
  assert.equal(editarEpiCatalogo(d, "c3", { nome: "Capacete forte", estoque_minimo: 9 }).erro, undefined);
  assert.equal(d.epis_catalogo[2].nome, "Capacete forte");
});

import { moverFicha, salvarFicha, lerFichas, fichaVazia, CAMPOS_FICHA } from "../src/lib/fichas-epi.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const cheia = (t) => Object.fromEntries(CAMPOS_FICHA.map((c) => [c.chave, `${t} ${c.chave}`]));

test("editar a ficha trocando o EPI move a ficha, sem duplicar nem perder", () => {
  const s = memoria();
  salvarFicha("epi-a", cheia("A"), s);
  salvarFicha("epi-b", cheia("B"), s);
  assert.throws(() => moverFicha("epi-a", "epi-b", cheia("A2"), s), /já tem ficha/);
  assert.deepEqual(lerFichas(s).map((f) => f.epiId).sort(), ["epi-a", "epi-b"]);
  moverFicha("epi-a", "epi-c", cheia("A2"), s);
  assert.deepEqual(lerFichas(s).map((f) => f.epiId).sort(), ["epi-b", "epi-c"]);
  assert.equal(lerFichas(s).find((f) => f.epiId === "epi-c").setores, "A2 setores");
  assert.throws(() => moverFicha("epi-c", "epi-d", { ...cheia("X"), setores: "" }, s), /Preencha/);
  assert.ok(lerFichas(s).some((f) => f.epiId === "epi-c"));
});

import { readFileSync } from "node:fs";

test("o Editar de EPI e uniforme usa o formulário completo, sem o texto antigo de campos fixos", () => {
  for (const arq of ["CadastroEpi", "CadastroUniforme"]) {
    const tela = readFileSync(`src/components/modules/${arq}.tsx`, "utf8");
    assert.match(tela, /<EdicaoCatalogoForm/);
    assert.doesNotMatch(tela, /Código, tamanho e subcategoria não mudam/);
  }
  const form = readFileSync("src/components/modules/EdicaoCatalogoForm.tsx", "utf8");
  for (const campo of ["Subcategoria", "Descrição do item", "Unidade", "Tamanho", "Estoque mínimo"]) assert.match(form, new RegExp(campo));
  assert.match(form, /travas_catalogo/);
  assert.doesNotMatch(form, /supabase\.from/);
});

test("a ficha troca o EPI ao editar", () => {
  const ficha = readFileSync("src/routes/_authenticated/epi-ficha.tsx", "utf8");
  assert.match(ficha, /moverFicha\(editandoId, epiSel, conteudo\)/);
});

test("o formulário só envia o que mudou e mantém tamanho e unidade válidos ao trocar a subcategoria", () => {
  const form = readFileSync("src/components/modules/EdicaoCatalogoForm.tsx", "utf8");
  assert.match(form, /trocouUni \? \{ unidade:/);
  assert.match(form, /trocouTam \|\| trocouSub \? \{ tamanho_id/);
  assert.match(form, /function trocarSub/);
  assert.match(form, /enabled: MODO_DEMO/);
});
