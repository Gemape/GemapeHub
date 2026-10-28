import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { painelDoMes, resultadosPorResponsavel } from "../src/lib/checklist-painel.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

const previsao = (id, fim, responsavelNome, extra = {}) => ({ id, veiculoId: id, veiculoRotulo: "ABC1D23", periodicidade: "Semanal", inicio: fim, fim, responsavelNome, ...extra });

test("os resultados por responsável contam só os obrigatórios e dão o percentual do que já tem desfecho", () => {
  const hoje = "2026-10-20";
  const previsoes = [
    previsao("a", "2026-10-04", "Ana"), previsao("b", "2026-10-11", "Ana"), previsao("c", "2026-10-25", "Ana"),
    previsao("d", "2026-10-04", "Bruno"), previsao("e", "2026-10-11", "Bruno", { obrigatorio: false }),
    previsao("f", "2026-10-25", ""),
  ];
  const feitos = [{ id: "k1", codigo: "CHK-1", veiculoId: "a", periodicidade: "Semanal", status: "Concluído", data: "2026-10-04", concluidoEm: "2026-10-04T15:00:00Z", responsavelNome: "Ana" }];
  const { linhas } = painelDoMes(null, previsoes, feitos, hoje);
  const r = resultadosPorResponsavel(linhas);
  assert.deepEqual(r.map((x) => x.nome), ["Ana", "Bruno", "Não definido"]);
  const ana = r.find((x) => x.nome === "Ana");
  assert.deepEqual([ana.previstos, ana.realizados, ana.naoRealizados, ana.aVencer, ana.pctNoPrazo], [3, 1, 1, 1, 50]);
  const bruno = r.find((x) => x.nome === "Bruno");
  assert.equal(bruno.previstos, 1, "o opcional não conta");
  assert.equal(bruno.pctNoPrazo, 0);
  assert.equal(r.find((x) => x.nome === "Não definido").pctNoPrazo, null, "sem desfecho não há percentual");
});

test("a tela principal do check list de veículos tem indicadores no topo, resultados dos responsáveis e botões separados para periódico e avulso", () => {
  const modulo = ler("components/modules/ChecklistVeiculoModulo.tsx");
  assert.match(modulo, /<ChecklistResultadosPainel/);
  assert.match(modulo, /setAba\("periodicos"\)/);
  assert.match(modulo, /setAba\("avulsos"\)/);
  assert.match(modulo, /Check list periódico/);
  assert.match(modulo, /Check list avulso/);
  assert.doesNotMatch(modulo, /Situação por veículo/);
  const painel = ler("components/modules/ChecklistResultadosPainel.tsx");
  assert.ok(painel.indexOf("Indicadores gerais de check list") < painel.indexOf("Indicadores · {g}"));
});

test("as listas do periódico e do avulso têm as mesmas colunas, na mesma ordem, e as ações de cada situação", () => {
  const listas = ler("components/modules/ChecklistListasVeiculo.tsx");
  assert.match(listas, /const CABECALHO = \["Prazo", "Veículo", "Periodicidade", "Responsável", "Situação", "Pendências", ""\];/);
  assert.equal(listas.split("CABECALHO.map").length - 1, 2, "as duas listas usam o mesmo cabeçalho");
  // a vencer: Realizar (ou Continuar); realizado: Ver check list; não realizado no prazo: sem ação.
  assert.match(listas, /l\.situacao === "realizado" && l\.checklistId/);
  assert.match(listas, />Ver check list</);
  assert.match(listas, />Realizar</);
  assert.match(listas, /const aberto = l\.situacao === "a_vencer" \|\| \(l\.situacao === "opcional" && l\.fim >= hoje\)/);
  assert.match(listas, /<span className="text-muted-foreground">—<\/span>\}/);
});

import { resumoDeLinhas } from "../src/lib/checklist-painel.ts";
import { GRUPOS_DE_AREA, grupoDeAreaPorNome } from "../src/lib/area-responsaveis.ts";

test("o check list separa os indicadores de técnicos (Oficina) e PCM pela área de cada responsável (decisão 310)", () => {
  // A lista de Veículos vale primeiro; quem não está nela vem da lista de Viagens; sem nenhuma, Sem área.
  const grupoDe = grupoDeAreaPorNome([
    [{ empregadoId: "e1", nome: "Ana Souza", area: "Oficina" }, { empregadoId: "e2", nome: "Bruno Lima", area: "PCM" }],
    [{ empregadoId: "e2", nome: "Bruno Lima", area: "Oficina" }, { empregadoId: "e3", nome: "Carla Dias", area: "Administrativo" }],
  ]);
  assert.deepEqual(["Ana Souza", " bruno lima ", "Carla Dias", "Dora"].map(grupoDe), ["Técnicos", "PCM", "Administrativo", "Sem área"]);
  assert.deepEqual([...GRUPOS_DE_AREA], ["Técnicos", "PCM", "Administrativo", "Sem área"]);

  const hoje = "2026-10-20";
  const previsoes = [
    previsao("a", "2026-10-04", "Ana Souza"), previsao("b", "2026-10-11", "Ana Souza"), previsao("c", "2026-10-04", "Bruno Lima"), previsao("d", "2026-10-25", "Bruno Lima"),
  ];
  const feitos = [{ id: "k1", codigo: "CHK-1", veiculoId: "a", periodicidade: "Semanal", status: "Concluído", data: "2026-10-04", concluidoEm: "2026-10-04T15:00:00Z", responsavelNome: "Ana Souza" }];
  const { linhas, resumo } = painelDoMes(null, previsoes, feitos, hoje);
  const tecnicos = resumoDeLinhas(linhas.filter((l) => grupoDe(l.responsavelNome) === "Técnicos"));
  const pcm = resumoDeLinhas(linhas.filter((l) => grupoDe(l.responsavelNome) === "PCM"));
  assert.deepEqual([tecnicos.previstos, tecnicos.realizados, tecnicos.naoRealizados, tecnicos.pctNoPrazo], [2, 1, 1, 50]);
  assert.deepEqual([pcm.previstos, pcm.realizados, pcm.naoRealizados, pcm.aVencer, pcm.pctNoPrazo], [2, 0, 1, 1, 0]);
  // Os grupos somam o geral, e o geral continua igual ao do painel.
  assert.equal(tecnicos.previstos + pcm.previstos, resumo.previstos);
  assert.deepEqual(resumoDeLinhas(linhas), resumo);
  const painelTela = ler("components/modules/ChecklistResultadosPainel.tsx");
  assert.match(painelTela, /g === "Técnicos" \|\| g === "PCM" \|\| doGrupo\(g\)\.length > 0/);
  assert.match(painelTela, /<Indicadores resumo=\{resumoDeLinhas\(dele\)\}/);
  assert.match(painelTela, /<TabelaDeResponsaveis linhas=\{dele\} \/>/);
});
