import { test } from "node:test";
import assert from "node:assert/strict";

import {
  agruparEpis,
  duplicadoNoCatalogo,
  filtrarGrupos,
  montarClonagemEpi,
  montarNovoEpi,
  normalizarDescricao,
  sincronizarEstoqueEpis,
  tamanhosLivres,
} from "../src/lib/epi-catalogo.ts";

const catalogo = [
  { id: "c1", codigo_sku: "EPI-0001", nome: "Luva de raspa", categoria: "Luvas", subcategoria_id: "sub-luva", unidade_id: "u-par", unidade_medida: "Par", tamanho_id: "t-p", estoque_minimo: 5, status: "Ativo" },
  { id: "c2", codigo_sku: "EPI-0002", nome: "  luva  de RASPA ", categoria: "Luvas", subcategoria_id: "sub-luva", unidade_id: "u-par", unidade_medida: "Par", tamanho_id: "t-m", estoque_minimo: 3, status: "Ativo" },
  { id: "c3", codigo_sku: "EPI-0003", nome: "Capacete", categoria: "Capacete", subcategoria_id: "sub-cap", unidade_id: null, unidade_medida: null, tamanho_id: null, estoque_minimo: 2, status: "Ativo" },
];
const associados = [{ id: "t-p", rotulo: "P" }, { id: "t-m", rotulo: "M" }, { id: "t-g", rotulo: "G" }];

test("a descrição é comparada sem acento, caixa e espaços repetidos", () => {
  assert.equal(normalizarDescricao("  Luvá  de   RASPA "), "luva de raspa");
});

test("a lista agrupa os tamanhos de uma mesma descrição, em ordem de código", () => {
  const grupos = agruparEpis(catalogo);
  assert.equal(grupos.length, 2);
  const luvas = grupos.find((g) => g.nome === "Luva de raspa");
  assert.deepEqual(luvas.itens.map((i) => i.codigo_sku), ["EPI-0001", "EPI-0002"]);
});

test("a busca por palavra-chave acha por código, descrição, subcategoria e tamanho", () => {
  const grupos = agruparEpis(catalogo);
  const rotulo = (id) => ({ "t-p": "P", "t-m": "M" })[id] ?? "";
  assert.equal(filtrarGrupos(grupos, "epi-0003", rotulo).length, 1);
  assert.equal(filtrarGrupos(grupos, "raspa luvas", rotulo).length, 1);
  assert.equal(filtrarGrupos(grupos, "raspa M", rotulo)[0].itens.length, 2);
  assert.equal(filtrarGrupos(grupos, "", rotulo).length, 2);
  assert.equal(filtrarGrupos(grupos, "inexistente", rotulo).length, 0);
});

test("detecta o mesmo EPI no mesmo tamanho", () => {
  assert.equal(duplicadoNoCatalogo(catalogo, "LUVA DE RASPA", "t-p"), true);
  assert.equal(duplicadoNoCatalogo(catalogo, "Luva de raspa", "t-g"), false);
  assert.equal(duplicadoNoCatalogo(catalogo, "Capacete", null), true);
});

test("o Clonar só oferece tamanhos ainda não cadastrados para a descrição", () => {
  assert.deepEqual(tamanhosLivres(catalogo, "Luva de raspa", associados).map((t) => t.id), ["t-g"]);
  assert.deepEqual(tamanhosLivres(catalogo, "Bota", associados).length, 3);
});

const base = {
  nome: "Óculos de proteção", subcategoria: { id: "sub-ocu", nome: "Óculos" }, unidade: { id: "u-un", nome: "Unidade" },
  tamanhoId: "t-u", minimo: "4", catalogo, codigo: "EPI-0004", pedeTamanho: true,
};

test("Novo EPI monta o registro do catálogo sem empresa e com o mínimo", () => {
  const novo = montarNovoEpi(base);
  assert.equal(novo.codigo_sku, "EPI-0004");
  assert.equal(novo.nome, "Óculos de proteção");
  assert.equal(novo.estoque_minimo, 4);
  assert.equal(novo.tamanho_id, "t-u");
  assert.ok(!("empresa_id" in novo));
});

test("Novo EPI recusa descrição já cadastrada, mínimo inválido e falta de tamanho", () => {
  assert.throws(() => montarNovoEpi({ ...base, nome: "Luva de raspa" }), /Clonar/);
  assert.throws(() => montarNovoEpi({ ...base, minimo: "" }), /mínimo/i);
  assert.throws(() => montarNovoEpi({ ...base, minimo: "-1" }), /mínimo/i);
  assert.throws(() => montarNovoEpi({ ...base, minimo: "2,5" }), /mínimo/i);
  assert.throws(() => montarNovoEpi({ ...base, tamanhoId: null }), /tamanho/i);
  assert.throws(() => montarNovoEpi({ ...base, nome: "   " }), /descrição/i);
  assert.equal(montarNovoEpi({ ...base, tamanhoId: null, pedeTamanho: false }).tamanho_id, null);
});

test("Clonar copia descrição, subcategoria e unidade, com código novo e tamanho novo", () => {
  const clone = montarClonagemEpi({ origem: catalogo[0], tamanhoId: "t-g", minimo: "6", catalogo, codigo: "EPI-0004" });
  assert.equal(clone.nome, "Luva de raspa");
  assert.equal(clone.subcategoria_id, "sub-luva");
  assert.equal(clone.unidade_id, "u-par");
  assert.equal(clone.codigo_sku, "EPI-0004");
  assert.equal(clone.tamanho_id, "t-g");
  assert.equal(clone.estoque_minimo, 6);
  assert.ok(!("estoque_atual" in clone));
});

test("Clonar exige tamanho diferente, ainda não cadastrado, e o mínimo", () => {
  assert.throws(() => montarClonagemEpi({ origem: catalogo[0], tamanhoId: "t-p", minimo: "1", catalogo, codigo: "EPI-0004" }), /já está cadastrado/);
  assert.throws(() => montarClonagemEpi({ origem: catalogo[0], tamanhoId: "t-m", minimo: "1", catalogo, codigo: "EPI-0004" }), /já está cadastrado/);
  assert.throws(() => montarClonagemEpi({ origem: catalogo[0], tamanhoId: "", minimo: "1", catalogo, codigo: "EPI-0004" }), /tamanho/i);
  assert.throws(() => montarClonagemEpi({ origem: catalogo[0], tamanhoId: "t-g", minimo: "", catalogo, codigo: "EPI-0004" }), /mínimo/i);
});

test("o estoque por empresa nasce do catálogo, uma vez por empresa, sem mexer em saldo", () => {
  let n = 0;
  const dados = {
    empresas: [{ id: "e1" }, { id: "e2" }],
    epis_catalogo: [catalogo[0]],
    epis: [{ id: "legado", empresa_id: "e1", codigo_sku: "EPI-0009", nome: "Antigo", estoque_atual: 7 }],
  };
  const mudou = sincronizarEstoqueEpis(dados, () => `n${++n}`, "2026-10-02");
  assert.equal(mudou, true);
  const novos = dados.epis.filter((e) => e.catalogo_id === "c1");
  assert.deepEqual(novos.map((e) => e.empresa_id).sort(), ["e1", "e2"]);
  assert.equal(novos[0].estoque_atual, 0);
  assert.equal(novos[0].estoque_minimo, 5);
  assert.deepEqual(novos[0].tamanhos_selecionados, ["t-p"]);
  assert.equal(novos[0].codigo_sku, "EPI-0001");
  assert.equal(dados.epis.find((e) => e.id === "legado").estoque_atual, 7);
  // Segunda rodada não duplica e não zera o saldo.
  novos[0].estoque_atual = 9;
  assert.equal(sincronizarEstoqueEpis(dados, () => `n${++n}`, "2026-10-02"), false);
  assert.equal(dados.epis.filter((e) => e.catalogo_id === "c1").length, 2);
  assert.equal(dados.epis.find((e) => e.id === novos[0].id).estoque_atual, 9);
  // Empresa nova recebe o estoque do catálogo; descrição editada chega às linhas.
  dados.empresas.push({ id: "e3" });
  dados.epis_catalogo[0] = { ...catalogo[0], nome: "Luva de raspa reforçada" };
  assert.equal(sincronizarEstoqueEpis(dados, () => `n${++n}`, "2026-10-02"), true);
  assert.equal(dados.epis.filter((e) => e.catalogo_id === "c1").length, 3);
  assert.ok(dados.epis.filter((e) => e.catalogo_id === "c1").every((e) => e.nome === "Luva de raspa reforçada"));
});

test("o tamanho escolhido precisa estar entre os associados à subcategoria", () => {
  assert.throws(() => montarNovoEpi({ ...base, tamanhosPermitidos: ["t-p"] }), /não associado/);
  assert.equal(montarNovoEpi({ ...base, tamanhosPermitidos: ["t-u"] }).tamanho_id, "t-u");
  assert.throws(() => montarClonagemEpi({ origem: catalogo[0], tamanhoId: "t-xx", minimo: "1", catalogo, codigo: "EPI-0004", tamanhosPermitidos: ["t-g"] }), /não associado/);
  assert.equal(montarClonagemEpi({ origem: catalogo[0], tamanhoId: "t-g", minimo: "1", catalogo, codigo: "EPI-0004", tamanhosPermitidos: ["t-g"] }).tamanho_id, "t-g");
});

test("a busca também acha pela categoria e unidade de cada tamanho, que aparecem em cada linha (decisão 96)", () => {
  const mistos = [
    { ...catalogo[0], id: "m1", codigo_sku: "EPI-0010", nome: "Luva mista", categoria: "Luvas", unidade_medida: "Par" },
    { ...catalogo[0], id: "m2", codigo_sku: "EPI-0011", nome: "Luva mista", categoria: "Proteção das mãos", unidade_medida: "Unidade", tamanho_id: "t-m" },
  ];
  const grupos = agruparEpis(mistos);
  const rotulo = () => "";
  assert.equal(filtrarGrupos(grupos, "proteção mãos", rotulo).length, 1);
  assert.equal(filtrarGrupos(grupos, "unidade", rotulo).length, 1);
});

test("Clonar pelo formulário de novo aceita a mesma descrição em outro tamanho e uma descrição nova (dec 138)", () => {
  const luva = { nome: "Luva de raspa", subcategoria: { id: "sub-luva", nome: "Luvas" }, unidade: { id: "u-par", nome: "Par" }, minimo: "5", catalogo, codigo: "EPI-0004", pedeTamanho: true, clonando: true };
  assert.equal(montarNovoEpi({ ...luva, tamanhoId: "t-g" }).tamanho_id, "t-g"); // mesma descrição, outro tamanho
  assert.throws(() => montarNovoEpi({ ...luva, tamanhoId: "t-p" }), /já está cadastrado neste tamanho/);
  assert.throws(() => montarNovoEpi({ ...luva, tamanhoId: "t-g", unidade: { id: "u-un", nome: "Unidade" } }), /outra subcategoria ou unidade/);
  assert.equal(montarNovoEpi({ ...luva, nome: "Luva de vaqueta", tamanhoId: "t-p" }).nome, "Luva de vaqueta"); // descrição editada = item novo
  assert.throws(() => montarNovoEpi({ ...luva, tamanhoId: "t-g", clonando: false }), /Clonar/); // Novo comum continua recusando
});
