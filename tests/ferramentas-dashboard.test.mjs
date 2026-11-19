import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  indicadoresDeFerramentas, interpretacoesDeFerramentas, ocorrenciaDaFerramentaParaPrazo, situacaoDasOcorrenciasNaColuna, situacaoDaVistoriaNaColuna,
} from "../src/lib/ferramentas-dashboard.ts";

const prazos = { iniciar: 2, finalizar: 5 };
const hoje = "2026-11-19";
const aberta = (data) => ocorrenciaDaFerramentaParaPrazo({ data }, undefined);
const encerrada = (data, em) => ocorrenciaDaFerramentaParaPrazo({ data }, { situacao: "Encerrada", atualizadaEm: `${em}T12:00:00-03:00`, encerradaEm: `${em}T12:00:00-03:00` });

test("vistorias: em dia ÷ (em dia + vencidas); pendente e sem plano não entram na conta", () => {
  const r = indicadoresDeFerramentas({ vistorias: ["Em dia", "Em dia", "Vencida", "Pendente", "Sem escalonamento"], ocorrencias: [], hoje, prazos });
  assert.equal(r.vistorias.pct, 66.7);
  assert.match(r.vistorias.detalhe, /2 de 3/);
  assert.equal(r.ocorrencias.pct, null);
  assert.equal(r.conformidadeGeral.pct, 66.7);
});

test("ocorrências: encerrada no prazo conta a favor; aberta vencida e encerrada fora do prazo contam contra; aberta no prazo não entra", () => {
  const r = indicadoresDeFerramentas({
    vistorias: [],
    ocorrencias: [encerrada("2026-11-10", "2026-11-12"), aberta("2026-11-01"), aberta("2026-11-19"), encerrada("2026-10-01", "2026-11-18")],
    hoje, prazos,
  });
  assert.match(r.ocorrencias.detalhe, /de 3 ocorrências/);
  assert.equal(r.ocorrencias.pct, 33.3);
});

test("a conformidade geral junta vistorias e ocorrências", () => {
  const r = indicadoresDeFerramentas({ vistorias: ["Em dia", "Vencida"], ocorrencias: [encerrada("2026-11-10", "2026-11-12")], hoje, prazos });
  assert.equal(r.conformidadeGeral.pct, 66.7);
  assert.match(r.conformidadeGeral.detalhe, /2 de 3 tarefas/);
});

test("as colunas da lista: vistoria e ocorrências viram verde, amarelo ou vermelho", () => {
  assert.deepEqual(situacaoDaVistoriaNaColuna("Em dia"), { situacao: "em_dia", quantidade: 0 });
  assert.equal(situacaoDaVistoriaNaColuna("Pendente").situacao, "proximo");
  assert.equal(situacaoDaVistoriaNaColuna("Vencida").situacao, "vencida");
  assert.equal(situacaoDaVistoriaNaColuna("Sem escalonamento"), null);
  assert.equal(situacaoDasOcorrenciasNaColuna([], hoje, prazos).situacao, "em_dia");
  assert.deepEqual(situacaoDasOcorrenciasNaColuna([aberta("2026-11-01")], hoje, prazos), { situacao: "vencida", quantidade: 1 });
  assert.equal(situacaoDasOcorrenciasNaColuna([encerrada("2026-11-01", "2026-11-02")], hoje, prazos).situacao, "em_dia");
});

test("a interpretação traz os quatro indicadores com a leitura da faixa", () => {
  const ind = indicadoresDeFerramentas({ vistorias: ["Em dia", "Em dia", "Em dia", "Em dia", "Em dia", "Em dia", "Em dia", "Em dia", "Em dia", "Em dia"], ocorrencias: [], hoje, prazos });
  const itens = interpretacoesDeFerramentas(ind, { pct: null, faixa: null });
  assert.deepEqual(itens.map((i) => i.titulo), ["Conformidade geral (SLA)", "Vistorias periódicas em dia", "Ocorrências tratadas no prazo", "Estoque acima do mínimo"]);
  assert.equal(itens[1].faixa, "verde");
  assert.match(itens[2].leitura, /Nenhuma ocorrência/);
});

test("Veículos chama o menu inicial de Dashboard e o Dashboard de Ferramentas usa o padrão da Frota", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /\{ aba: "frota", titulo: "Dashboard"/);
  const dash = readFileSync("src/components/modules/DashboardFerramentas.tsx", "utf8");
  assert.match(dash, /Cartao/);
  assert.match(dash, /EtiquetaVencimento/);
  assert.match(dash, /BarraDeFiltros/);
  assert.match(dash, /InterpretacaoFrota/);
});
