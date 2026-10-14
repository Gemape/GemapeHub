import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { estadoPadrao } from "../src/lib/questionario-despesas.ts";
import { registrarResposta } from "../src/lib/respostas-despesas.ts";
import { dadosDoLancamento } from "../src/lib/viagens.ts";
import { ABAS_VIAGEM, abaDoModulo } from "../src/lib/menu-parametros.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const completas = {
  "q-01": ["Dinheiro"], "q-02": ["Cartão final 0129 – Roberto"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Minas Gerais - MG", "q-06": "Belo Horizonte",
  "q-07": "00001 - Cliente Teste", "q-08": "2026-10-14", "q-09": "Almoço com o cliente", "q-10": "10,50", "q-11": "1.234,56", "q-12": ["comprovante.jpg"], "q-13": "Avulso – técnico não monitorado",
};
const agora = new Date(2026, 9, 14, 8, 5);

test("o menu de Módulos tem Viagens, com o Painel como primeira aba", () => {
  assert.equal(ABAS_VIAGEM[0]?.aba, "painel");
  assert.equal(abaDoModulo("viagem", undefined), "painel");
  assert.equal(abaDoModulo("viagem", "qualquer"), "painel");
  const menu = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");
  assert.match(menu, /titulo: "Viagens", url: "\/viagens"/);
});

test("o lançamento tem estrutura única e flexível: campos não respondidos ficam nulos", () => {
  const e = estadoPadrao();
  const r = registrarResposta(e, completas, memoria(), agora);
  const d = dadosDoLancamento(r);
  assert.equal(d.tipo, "Abastecimento");
  assert.equal(d.dataDespesa, "2026-10-14");
  assert.equal(d.valor, 1234.56);
  assert.equal(d.cliente, "00001 - Cliente Teste");
  assert.equal(d.descricao, "Almoço com o cliente");
  assert.equal(d.tecnico, "Roberto");
  assert.equal(d.tecnicoArea, "Oficina");
  const vazio = dadosDoLancamento({ id: "x", tipo: "Pedágio", data: "2026-10-01", hora: "10:00", itens: [] });
  assert.deepEqual([vazio.valor, vazio.cliente, vazio.descricao, vazio.tecnico, vazio.tecnicoArea, vazio.dataDespesa], [null, null, null, null, null, null]);
});

test("a data da despesa volta para o formato ISO e valor aceita moeda com R$", () => {
  const d = dadosDoLancamento({ id: "x", tipo: "Pedágio", data: "2026-10-01", hora: "10:00", itens: [
    { perguntaId: "q-08", titulo: "Data da despesa", resposta: "05/10/2026" },
    { perguntaId: "q-11", titulo: "Valor da despesa", resposta: "R$ 12,30" },
  ] });
  assert.equal(d.dataDespesa, "2026-10-05");
  assert.equal(d.valor, 12.3);
});

test("o painel mostra um botão por tipo de despesa e abre o formulário daquele tipo, sem sair do módulo", () => {
  const painel = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(painel, /tiposDeDespesa\(/);
  assert.match(painel, /<QuestionarioFormulario[^>]*tipoInicial=\{tipo\}/);
  assert.match(painel, /Voltar ao painel/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/viagens.tsx", import.meta.url), "utf8");
  assert.match(rota, /ViagensPainel/);
});
