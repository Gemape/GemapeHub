import test from "node:test";
import assert from "node:assert/strict";
import * as m from "../src/lib/menu-parametros.ts";

const abasDe = {
  epi: [...m.ABAS_EPI, ...m.ABAS_EPI_RELATORIOS],
  uniforme: [...m.ABAS_UNIFORME, ...m.ABAS_UNIFORME_RELATORIOS],
  ferramenta: m.ABAS_FERRAMENTA,
  veiculo: m.ABAS_VEICULO,
  viagem: m.ABAS_VIAGEM,
  equipamento: m.ABAS_EQUIPAMENTO,
};

test("toda aba de módulo tem a sua própria descrição, diferente da das outras (decisão 424)", () => {
  for (const [modulo, abas] of Object.entries(abasDe)) {
    const textos = abas.map((a) => m.descricaoDaAba(modulo, a.aba, ""));
    for (const [i, t] of textos.entries()) assert.ok(t.length > 20, `${modulo}/${abas[i].aba} sem descrição`);
    assert.equal(new Set(textos).size, textos.length, `${modulo}: textos repetidos`);
  }
});
