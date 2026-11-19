import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SEM_GRUPO_FERRAMENTA, descricaoDaBaixaDefinitiva, ehDoGrupo, erroDaBaixaEmLote, erroDaTransferenciaEmLote, grupoDaFerramenta, gruposDasFerramentas,
} from "../src/lib/movimentacoes-grupo-caixa.ts";

test("os grupos não se repetem por maiúscula ou acento e vêm em ordem; sem grupo entra com o nome padrão", () => {
  const fs = [{ grupo_ferramenta: "Chave L" }, { grupo_ferramenta: " chave l " }, { grupo_ferramenta: "Alicate" }, { grupo_ferramenta: null }, {}];
  assert.deepEqual(gruposDasFerramentas(fs), ["Alicate", "Chave L", SEM_GRUPO_FERRAMENTA]);
  assert.equal(grupoDaFerramenta({ grupo_ferramenta: "  " }), SEM_GRUPO_FERRAMENTA);
  assert.equal(ehDoGrupo({ grupo_ferramenta: "chave l" }, "Chave L"), true);
  assert.equal(ehDoGrupo({ grupo_ferramenta: "Alicate" }, "Chave L"), false);
  assert.equal(ehDoGrupo({ grupo_ferramenta: "Alicate" }, ""), false);
});

const sel = (extra = {}) => ({ nome: "Chave L 8mm", quantidade: 1, disponivel: 2, saldoEstoque: 5, ...extra });

test("a baixa em lote pede seleção, motivo, data e respeita o guardado e o saldo do estoque", () => {
  const ok = { selecionadas: [sel()], motivo: "Perda", data: "2026-11-19" };
  assert.equal(erroDaBaixaEmLote(ok), null);
  assert.match(erroDaBaixaEmLote({ ...ok, selecionadas: [] }), /Marque ao menos uma/);
  assert.match(erroDaBaixaEmLote({ ...ok, motivo: "" }), /motivo/);
  assert.match(erroDaBaixaEmLote({ ...ok, data: "" }), /data/);
  assert.match(erroDaBaixaEmLote({ ...ok, selecionadas: [sel({ quantidade: Number.NaN })] }), /quantidade/);
  assert.match(erroDaBaixaEmLote({ ...ok, selecionadas: [sel({ quantidade: 3 })] }), /Só 2 .* guardada/);
  assert.match(erroDaBaixaEmLote({ ...ok, selecionadas: [sel({ quantidade: 2, disponivel: 4, saldoEstoque: 1 })] }), /estoque tem 1/);
});

test("a descrição da ocorrência da baixa diz a ferramenta, a caixa, o motivo, o portador e a tratativa", () => {
  const t = descricaoDaBaixaDefinitiva({ ferramenta: "Chave L 8mm", quantidade: 2, caixa: "CX-0001", motivo: "Perda", data: "2026-11-19", portador: "Ana", observacao: " caiu " });
  assert.match(t, /2 × Chave L 8mm da caixa CX-0001 em 19\/11\/2026/);
  assert.match(t, /Motivo: Perda/);
  assert.match(t, /Portador da caixa: Ana/);
  assert.match(t, /Observação: caiu/);
  assert.match(t, /apurar a responsabilidade/);
  assert.match(descricaoDaBaixaDefinitiva({ ferramenta: "X", quantidade: 1, caixa: "CX-1", motivo: "Perda", data: "2026-11-19" }), /não tinha portador/);
});

test("a transferência em lote confere origem, destino, seleção, duplicidade no destino e ferramenta com empregado", () => {
  const s = (extra = {}) => ({ nome: "Chave", comEmpregado: 0, jaNoDestino: false, quantidade: 2, disponivel: 2, ...extra });
  const ok = { origemId: "a", destinoId: "b", selecionadas: [s()] };
  assert.equal(erroDaTransferenciaEmLote(ok), null);
  assert.match(erroDaTransferenciaEmLote({ ...ok, origemId: "" }), /origem/);
  assert.match(erroDaTransferenciaEmLote({ ...ok, destinoId: "" }), /destino/);
  assert.match(erroDaTransferenciaEmLote({ ...ok, destinoId: "a" }), /outra/);
  assert.match(erroDaTransferenciaEmLote({ ...ok, selecionadas: [] }), /Marque ao menos uma/);
  assert.match(erroDaTransferenciaEmLote({ ...ok, selecionadas: [s({ comEmpregado: 1 })] }), /com empregado/);
  assert.match(erroDaTransferenciaEmLote({ ...ok, selecionadas: [s({ jaNoDestino: true })] }), /já está na caixa de destino/);
  assert.match(erroDaTransferenciaEmLote({ ...ok, selecionadas: [s({ disponivel: 1 })] }), /1 já saiu por baixa/);
});

test("as telas ligam grupo, termo, ocorrência e a visão de Transferência", () => {
  const dir = "src/components/modules/";
  const entrega = readFileSync(`${dir}FerramentasEntregaCaixa.tsx`, "utf8");
  assert.match(entrega, /gruposDasFerramentas/);
  assert.match(entrega, /abrirTermoDeRecebimento/);
  assert.match(readFileSync("src/lib/termo-recebimento-caixa.ts", "utf8"), /montarTermoResponsabilidadeHtml/);
  const baixa = readFileSync(`${dir}FerramentasBaixaCaixa.tsx`, "utf8");
  assert.doesNotMatch(baixa, /Dar baixa/);
  assert.match(baixa, /type="checkbox"|Checkbox/);
  assert.match(baixa, /descricaoDaBaixaDefinitiva/);
  assert.match(baixa, /Realizar tratativa/);
  const mov = readFileSync(`${dir}FerramentasMovimentacoes.tsx`, "utf8");
  assert.match(mov, /FerramentasTransferenciaCaixa/);
  assert.match(mov, /Transferência/);
});
