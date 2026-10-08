import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  adicionarTamanhoGrupoFerramenta, cadastrarTamanhosPadraoFerramentas, lerParametros, removerListaFerramenta,
  removerTamanhoGrupoFerramenta,
} from "../src/lib/parametros-base.ts";
import { TAMANHOS_FERRAMENTAS_PADRAO } from "../src/lib/tamanhos-ferramentas-padrao.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const grupo = (s, nome) => lerParametros(s).gruposFerramenta.find((g) => g.nome.toLowerCase() === nome.toLowerCase());

test("a planilha tem 16 colunas e os tamanhos transcritos (dec 117)", () => {
  assert.equal(TAMANHOS_FERRAMENTAS_PADRAO.length, 16);
  const de = (g) => TAMANHOS_FERRAMENTAS_PADRAO.find((x) => x.grupo === g).tamanhos;
  assert.equal(de("Chave boca").length, 15);
  assert.equal(de("Chave estria").length, 16);
  assert.deepEqual(de("Torx"), ["T10", "T15", "T20", "T27", "T30", "T40", "T45", "T50"]);
  assert.deepEqual(de("Chave Allen"), ["1,5", "2", "2,5", "3", "4", "5", "6", "8", "10"]);
});

test("cadastrar tamanhos padrão cria os grupos que faltam e é repetível sem duplicar", () => {
  const s = memoria();
  const r = cadastrarTamanhosPadraoFerramentas(s);
  assert.equal(r.grupos, 4); // Chave, Torx, Luva e Canhão Torx
  const total = TAMANHOS_FERRAMENTAS_PADRAO.reduce((n, g) => n + g.tamanhos.length, 0);
  assert.equal(r.tamanhos, total);
  const dados = lerParametros(s);
  assert.equal(dados.tamanhosGrupoFerramenta[grupo(s, "Alicates").id].length, 9);
  assert.equal(dados.tamanhosGrupoFerramenta[grupo(s, "Chave Philips").id], undefined);
  assert.deepEqual(cadastrarTamanhosPadraoFerramentas(s), { grupos: 0, tamanhos: 0 });
});

test("incluir e excluir tamanho de um grupo; repetido e vazio são recusados", () => {
  const s = memoria();
  const lima = grupo(s, "Lima").id;
  assert.equal(adicionarTamanhoGrupoFerramenta(lima, "  Triangular ", s), "Triangular");
  assert.throws(() => adicionarTamanhoGrupoFerramenta(lima, "triangular", s), /já existe/i);
  assert.throws(() => adicionarTamanhoGrupoFerramenta(lima, "  ", s), /informe/i);
  assert.throws(() => adicionarTamanhoGrupoFerramenta("x", "1", s), /não encontrad|encontr/i);
  removerTamanhoGrupoFerramenta(lima, "Triangular", s);
  assert.deepEqual(lerParametros(s).tamanhosGrupoFerramenta[lima], []);
});

test("excluir o grupo leva os tamanhos dele; dados antigos sem o campo abrem normalmente", () => {
  const s = memoria();
  const lima = grupo(s, "Lima").id;
  adicionarTamanhoGrupoFerramenta(lima, "Chata", s);
  removerListaFerramenta("gruposFerramenta", lima, s);
  assert.equal(lerParametros(s).tamanhosGrupoFerramenta[lima], undefined);
  const antigo = memoria();
  antigo.setItem("gemape-demo-parametros-base", JSON.stringify({ categorias: [] }));
  assert.deepEqual(lerParametros(antigo).tamanhosGrupoFerramenta, {});
});

test("a tela de Parâmetros Específicos de Ferramentas mostra os tamanhos por ferramenta", () => {
  const rota = readFileSync("src/routes/_authenticated/cadastros/gerais/categorias.tsx", "utf8");
  assert.match(rota, /<TamanhosPorFerramenta dados=\{dados\}/);
  const tela = readFileSync("src/components/parametros/TamanhosPorFerramenta.tsx", "utf8");
  assert.match(tela, /Novo tamanho/);
  assert.match(tela, /Cadastrar tamanhos padrão/);
});
