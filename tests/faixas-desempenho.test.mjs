import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FAIXAS, FAIXAS_PADRAO, descricoesFaixas, faixaDoIndice, faixaDoIndiceDeVeiculos, lerFaixas, lerFaixasDeVeiculos, salvarFaixas, temFaixasProprias, validarFaixas } from "../src/lib/faixas-desempenho.ts";

const faixa = (v) => faixaDoIndice(v)?.faixa ?? null;

test("limites das faixas: verde de 90, amarelo de 70, vermelho abaixo", () => {
  assert.equal(faixa(100), "verde");
  assert.equal(faixa(90), "verde");
  assert.equal(faixa(89.9), "amarelo");
  assert.equal(faixa(70), "amarelo");
  assert.equal(faixa(69.9), "vermelho");
  assert.equal(faixa(0), "vermelho");
});

test("o valor é comparado como aparece na tela (1 casa)", () => {
  assert.equal(faixa(89.95), "verde");
  assert.equal(faixa(89.94), "amarelo");
  assert.equal(faixa(69.95), "amarelo");
  assert.equal(faixa(69.94), "vermelho");
});

test("sem índice não há faixa", () => {
  assert.equal(faixaDoIndice(null), null);
  assert.equal(faixaDoIndice(Number.NaN), null);
});

test("a tabela de faixas traz cor, intervalo, classificação e significado do esquema", () => {
  assert.deepEqual(FAIXAS.map((f) => f.cor), ["Verde", "Amarelo", "Vermelho"]);
  assert.deepEqual(FAIXAS.map((f) => f.intervalo), ["90% a 100%", "70% a 89,9%", "Abaixo de 70%"]);
  assert.deepEqual(FAIXAS.map((f) => f.classificacao), ["Excelente / No prazo", "Atenção / Alerta", "Crítico / Inaceitável"]);
  for (const f of FAIXAS) assert.ok(f.significado.length > 20);
});

test("o painel usa as faixas nos cartões, na tabela e na legenda", () => {
  const src = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(src, /faixaDoIndice\(/);
  assert.match(src, /ValorComFaixa/);
  assert.match(src, /LegendaFaixas/);
  assert.match(src, /Faixas de desempenho/);
});

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("faixas configuráveis (dec 199): padrão 90 e 70, grava, muda a faixa do índice e o texto do intervalo", () => {
  const s = memoria();
  assert.deepEqual(lerFaixas(s), FAIXAS_PADRAO);
  const nova = { ...FAIXAS_PADRAO, limiteVerde: 95, limiteAmarelo: 80, verde: { classificacao: "Ótimo", significado: "Tudo certo." } };
  salvarFaixas(nova, s);
  assert.deepEqual(lerFaixas(s), nova);
  assert.equal(faixaDoIndice(94, lerFaixas(s))?.faixa, "amarelo");
  assert.equal(faixaDoIndice(95, lerFaixas(s))?.faixa, "verde");
  assert.equal(faixaDoIndice(79.9, lerFaixas(s))?.faixa, "vermelho");
  assert.deepEqual(descricoesFaixas(nova).map((f) => f.intervalo), ["95% a 100%", "80% a 94,9%", "Abaixo de 80%"]);
  assert.equal(descricoesFaixas(nova)[0].classificacao, "Ótimo");
});

test("faixas inválidas são recusadas sem mexer no que estava salvo, e leitura ruim volta ao padrão", () => {
  const s = memoria();
  salvarFaixas({ ...FAIXAS_PADRAO, limiteVerde: 85 }, s);
  for (const ruim of [
    { ...FAIXAS_PADRAO, limiteAmarelo: 90 },
    { ...FAIXAS_PADRAO, limiteAmarelo: 95 },
    { ...FAIXAS_PADRAO, limiteVerde: 101 },
    { ...FAIXAS_PADRAO, limiteAmarelo: 0 },
    { ...FAIXAS_PADRAO, limiteVerde: 90.5 },
    { ...FAIXAS_PADRAO, verde: { classificacao: "  ", significado: "x" } },
    { ...FAIXAS_PADRAO, vermelho: { classificacao: "x", significado: "" } },
    { ...FAIXAS_PADRAO, amarelo: { classificacao: "x".repeat(61), significado: "x" } },
  ]) {
    assert.ok(validarFaixas(ruim));
    assert.throws(() => salvarFaixas(ruim, s));
  }
  assert.equal(lerFaixas(s).limiteVerde, 85);
  for (const ruim of ["abc", "", "{", "null", "[]", '{"limiteVerde":50,"limiteAmarelo":60}', '{"limiteVerde":"90"}']) assert.deepEqual(lerFaixas({ getItem: () => ruim, setItem: () => {} }), FAIXAS_PADRAO);
  const bloqueado = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
  assert.deepEqual(lerFaixas(bloqueado), FAIXAS_PADRAO);
  assert.throws(() => salvarFaixas(FAIXAS_PADRAO, bloqueado), /Não foi possível guardar/);
});

test("as faixas são definidas em Parâmetros Específicos de Veículos", () => {
  const tela = readFileSync(new URL("../src/components/parametros/IndicadoresViagens.tsx", import.meta.url), "utf8");
  assert.match(tela, /Verde a partir de/);
  assert.match(tela, /Amarelo a partir de/);
  assert.match(tela, /Significado prático para a gestão/);
  assert.match(tela, /Restaurar padrão/);
});

test("salvar faixas tira os espaços das pontas dos textos", () => {
  const s = memoria();
  salvarFaixas({ ...FAIXAS_PADRAO, verde: { classificacao: "  Ótimo  ", significado: " Tudo certo. " } }, s);
  assert.deepEqual(lerFaixas(s).verde, { classificacao: "Ótimo", significado: "Tudo certo." });
});

test("com a caixa desmarcada, o dias digitado no campo travado não impede salvar e o valor salvo vale", () => {
  const tela = readFileSync(new URL("../src/components/parametros/IndicadoresViagens.tsx", import.meta.url), "utf8");
  assert.match(tela, /const validoMecanico = !mecanicoAplica \|\| prazoValido\(digitadoMecanico\)/);
  assert.match(tela, /const validoPcm = !pcmAplica \|\| prazoValido\(digitadoPcm\)/);
  const painel = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(painel, /Indicador desligado em Parâmetros/);
});

test("as faixas de Viagens e as de Veículos são independentes; Veículos começa como cópia da de Viagens (decisão 350)", () => {
  const s = memoria();
  const viagens = { ...FAIXAS_PADRAO, limiteVerde: 95, limiteAmarelo: 80 };
  salvarFaixas(viagens, s);
  assert.deepEqual(lerFaixasDeVeiculos(s), viagens, "sem a sua própria, Veículos usa uma cópia da de Viagens");
  const veiculos = { ...FAIXAS_PADRAO, limiteVerde: 85, limiteAmarelo: 60 };
  salvarFaixas(veiculos, s, "veiculos");
  assert.deepEqual(lerFaixas(s), viagens, "salvar as de Veículos não muda as de Viagens");
  assert.deepEqual(lerFaixasDeVeiculos(s), veiculos);
  salvarFaixas({ ...FAIXAS_PADRAO, limiteVerde: 99, limiteAmarelo: 90 }, s);
  assert.deepEqual(lerFaixasDeVeiculos(s), veiculos, "e salvar as de Viagens não muda as de Veículos");
  assert.equal(faixaDoIndice(88, veiculos).faixa, "verde");
  assert.equal(faixaDoIndice(88, viagens).faixa, "amarelo");
});

test("os indicadores de veículos leem as faixas de Veículos e os de Viagens, as de Viagens", () => {
  for (const f of ["components/modules/ChecklistPainelMensal.tsx", "components/modules/ChecklistResultadosPainel.tsx", "components/modules/GraficosVeiculos.tsx"]) {
    const t = readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.match(t, /faixaDoIndiceDeVeiculos\(/, f);
    assert.doesNotMatch(t, /[^a-zA-Z]faixaDoIndice\(/, f);
  }
  for (const f of ["lib/frota-indicadores.ts", "lib/manutencao-indicadores.ts", "lib/ocorrencias-indicadores.ts"]) assert.match(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8"), /lerFaixasDeVeiculos\(\)/, f);
  const viagens = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(viagens, /DeVeiculos/, "Viagens segue com as faixas de Viagens");
});

test("sem faixas próprias gravadas, o Salvar de Veículos fica liberado para gravar a cópia (decisão 350)", () => {
  const s = memoria();
  assert.equal(temFaixasProprias("veiculos", s), false);
  salvarFaixas(FAIXAS_PADRAO, s, "veiculos");
  assert.equal(temFaixasProprias("veiculos", s), true);
  assert.equal(temFaixasProprias("viagens", s), false);
  assert.match(readFileSync(new URL("../src/components/parametros/IndicadoresViagens.tsx", import.meta.url), "utf8"), /const igual = propria && JSON\.stringify\(config\) === JSON\.stringify\(salva\)/);
});
