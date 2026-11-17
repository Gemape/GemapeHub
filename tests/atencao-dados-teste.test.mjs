import assert from "node:assert/strict";
import test from "node:test";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { pendenciasDeHoje } from "../src/lib/atencao-hoje.ts";
import { prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import { listarEquipamentos } from "../src/lib/equipamentos-demo.ts";
import { lerPrazos } from "../src/lib/prazo-viagens.ts";
import { lerManutencoesEq, lerOcorrenciasEq } from "../src/lib/registros-equipamento.ts";
import { listarRelatorios, relatorioPorDespesa } from "../src/lib/relatorios-viagens.ts";
import { listarRespostas } from "../src/lib/respostas-despesas.ts";
import { dadosDoLancamento } from "../src/lib/viagens.ts";

// Os dados de teste têm de acender cada cartão de "O que precisa da sua atenção hoje" (EPI, uniformes, ferramentas, viagens e equipamentos).
test("dados de teste: todos os grupos de atenção de hoje têm ao menos um item", () => {
  const agora = new Date("2026-10-22T12:00:00-03:00");
  const m = new Map();
  const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
  assert.equal(prepararDadosDeTeste(s, base, agora), "aplicado");
  const d = JSON.parse(s.getItem("gemape-demo-dados"));
  const hoje = "2026-10-22";
  const relatorios = relatorioPorDespesa(listarRelatorios(s));
  const prazos = lerPrazos(s);
  const grupos = pendenciasDeHoje({
    hoje,
    empregados: d.empregados, epis: d.epis, uniformes: d.uniformes, ferramentas: d.ferramentas,
    movsEpi: d.movimentacoes.filter((x) => x.modulo === "epi"), movsFerramenta: d.movimentacoes.filter((x) => x.modulo === "ferramenta"),
    equipamentos: {
      nomes: new Map(listarEquipamentos(s).map((e) => [e.id, e.nome])),
      ordens: lerManutencoesEq(s), ocorrencias: lerOcorrenciasEq(s),
    },
    viagens: {
      prazoDias: prazos.pcm,
      despesasEmAberto: listarRespostas(s).filter((r) => !relatorios.has(r.id)).map((r) => ({ id: r.id, tecnico: dadosDoLancamento(r).tecnico ?? "Sem técnico", registradaEm: r.data })),
    },
  });
  for (const g of grupos) {
    if (/^(abaixo|minimo)-/.test(g.id)) continue; // os níveis de estoque (abaixo / no mínimo) dependem dos dados; a soma é conferida à parte
    assert.ok(g.itens.length > 0, `o grupo "${g.titulo}" ficou vazio nos dados de teste`);
  }
  assert.equal(grupos.length, 11);
});
