import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  lerParametros, cadastrarTamanhosPadrao, pendentesTamanhosPadrao, cadastrarMarcasPadraoVeiculos, pendentesMarcasPadraoVeiculos,
  cadastrarTiposOcorrenciaPadrao, pendentesTiposOcorrenciaPadrao, cadastrarTamanhosPadraoFerramentas, pendentesPadraoFerramentas,
  adicionarTipoOcorrenciaVeiculo,
} from "../src/lib/parametros-base.ts";
import { TIPOS_OCORRENCIA_VEICULO_PADRAO } from "../src/lib/veiculos-padrao.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

test("Cadastrar padrão só grava o que foi escolhido item a item (decisão 294)", () => {
  const s = storage();
  // O padrão já vem cadastrado: tira três tamanhos, três marcas e dois grupos de ferramenta para o Cadastrar padrão ter o que oferecer.
  const d = lerParametros(s);
  d.tamanhos = d.tamanhos.slice(3);
  d.marcasVeiculo = d.marcasVeiculo.slice(3);
  for (const g of d.gruposFerramenta.slice(0, 2)) delete d.tamanhosGrupoFerramenta[g.id];
  d.gruposFerramenta = d.gruposFerramenta.slice(2);
  s.setItem("gemape-demo-parametros-base", JSON.stringify(d));
  const antes = lerParametros(s).tamanhos.length;
  const faltam = pendentesTamanhosPadrao(s).map((t) => t.nome);
  assert.ok(faltam.length >= 2);
  assert.equal(cadastrarTamanhosPadrao(s, [faltam[0]]), 1);
  assert.equal(lerParametros(s).tamanhos.length, antes + 1);
  assert.equal(pendentesTamanhosPadrao(s).length, faltam.length - 1);
  assert.equal(cadastrarTamanhosPadrao(s, []), 0);

  const marcas = pendentesMarcasPadraoVeiculos(s).map((m) => m.nome);
  assert.ok(marcas.length >= 2);
  assert.deepEqual(cadastrarMarcasPadraoVeiculos(s, [marcas[1]]), { marcas: 1 });
  assert.equal(pendentesMarcasPadraoVeiculos(s).length, marcas.length - 1);

  const grupos = pendentesPadraoFerramentas(s);
  assert.ok(grupos.length >= 2);
  const r = cadastrarTamanhosPadraoFerramentas(s, [grupos[0].nome]);
  assert.ok(r.grupos + r.tamanhos > 0);
  assert.equal(pendentesPadraoFerramentas(s).length, grupos.length - 1);
});

test("tipos de ocorrência: lista só os que faltam, com a descrição, e cadastra só os escolhidos", () => {
  const s = storage();
  adicionarTipoOcorrenciaVeiculo("Furto", "Minha descrição", s);
  const faltam = pendentesTiposOcorrenciaPadrao(s);
  assert.equal(faltam.length, TIPOS_OCORRENCIA_VEICULO_PADRAO.length - 1);
  assert.ok(faltam.every((t) => t.itens.length === 1));
  assert.equal(cadastrarTiposOcorrenciaPadrao([faltam[0].nome], s), 1);
  assert.equal(cadastrarTiposOcorrenciaPadrao(["Furto"], s), 0);
  assert.equal(lerParametros(s).tiposOcorrenciaVeiculo.find((t) => t.nome === "Furto").descricao, "Minha descrição");
});

test("os quatro botões Cadastrar padrão abrem a seleção item a item, sem implantar direto", () => {
  for (const f of [
    "components/parametros/SubgruposFerramenta.tsx", "components/parametros/TamanhosMedidasPainel.tsx",
    "components/parametros/VeiculosListasParametros.tsx", "routes/_authenticated/cadastros/gerais/categorias.tsx",
  ]) {
    const s = ler(f);
    assert.match(s, /<CadastrarPadraoSelecionado/, f);
    assert.doesNotMatch(s, /cadastrar(TamanhosPadraoFerramentas|TamanhosPadrao|MarcasPadraoVeiculos|PadraoVeiculos)\(\)/, `${f}: não implanta o padrão direto`);
  }
  const janela = ler("components/parametros/CadastrarPadraoSelecionado.tsx");
  assert.match(janela, /if \(!\(await confirmarTexto\(/);
  assert.match(janela, /disabled=\{marcados\.length === 0\}/);
  assert.doesNotMatch(janela, /Marcar todos/);
});
