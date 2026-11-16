import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { divergencias, quantidadeContada, semContagem, textoFaltam } from "../src/lib/inventario.ts";
import { faixaDaVida, menorParte, parteRestante, parteRestanteDaData, parteRestanteEntreDatas } from "../src/lib/vida-util.ts";
import { temValorInformativo } from "../src/lib/valor-informativo.ts";
import { textoAtualizado } from "../src/lib/carimbo-atualizacao.ts";

const fonte = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("ficha resumida: some 'Não informado', '-', '—', 'R$ 0,00' e vazio; o número 0 fica (saldo zero é informação)", () => {
  for (const v of ["", "  ", "-", "—", "Não informado", "nao informada", "R$ 0,00", "R$ 0", "R$ 0,00", null, undefined]) assert.equal(temValorInformativo(v), false, String(v));
  for (const v of [0, 3, "Ativo", "R$ 10,00", "0 km", "Maria"]) assert.equal(temValorInformativo(v), true, String(v));
});

test("inventário: contagem vazia bloqueia, 0 vale, texto inválido não conta", () => {
  assert.equal(quantidadeContada(""), null);
  assert.equal(quantidadeContada("0"), 0);
  assert.equal(quantidadeContada(" 12 "), 12);
  assert.equal(quantidadeContada("2,5"), 2.5);
  assert.equal(quantidadeContada("-1"), null);
  assert.equal(quantidadeContada("abc"), null);
  const linhas = [{ id: "a", codigo: "1", nome: "Luva", saldo: 10 }, { id: "b", codigo: "2", nome: "Bota", saldo: 4 }, { id: "c", codigo: "3", nome: "Capacete", saldo: 2 }];
  assert.deepEqual(semContagem(linhas, { a: "10", b: "" }).map((l) => l.id), ["b", "c"]);
  assert.equal(textoFaltam(3), "Faltam 3 itens sem contagem informada para avançar.");
  assert.equal(textoFaltam(1), "Falta 1 item sem contagem informada para avançar.");
});

test("inventário: divergências só do que não bate, maior diferença primeiro, sobra positiva e falta negativa", () => {
  const linhas = [{ id: "a", codigo: "1", nome: "Luva", saldo: 10 }, { id: "b", codigo: "2", nome: "Bota", saldo: 4 }, { id: "c", codigo: "3", nome: "Capacete", saldo: 2 }];
  const d = divergencias(linhas, { a: "10", b: "1", c: "4" });
  assert.deepEqual(d.map((x) => [x.id, x.diferenca]), [["b", -3], ["c", 2]]);
});

test("vida útil: proporção do prazo e faixa verde → amarela → vermelha; vale o que vencer primeiro", () => {
  assert.equal(parteRestante(100, 25, 100), 0.75);
  assert.equal(parteRestante(100, 150, 100), 0, "passou do prazo: 0, nunca negativo");
  assert.equal(parteRestante(100, 0, 0), null, "sem prazo, sem barra");
  assert.equal(faixaDaVida(1), "verde");
  assert.equal(faixaDaVida(0.5), "verde");
  assert.equal(faixaDaVida(0.3), "amarela");
  assert.equal(faixaDaVida(0.1), "vermelha");
  const agora = new Date("2026-07-01T12:00:00Z");
  assert.equal(parteRestanteEntreDatas("2026-01-01", "2026-12-31", agora).toFixed(2), "0.50");
  assert.equal(parteRestanteDaData(null, 30, agora), null);
  assert.equal(menorParte(0.8, null, 0.3), 0.3);
  assert.equal(menorParte(null, null), null);
});

test("carimbo: agora mesmo, há N min e, depois de uma hora, a hora da leitura", () => {
  const t = Date.parse("2026-11-13T15:00:00Z");
  assert.equal(textoAtualizado(t, t + 20_000), "Atualizado agora mesmo");
  assert.equal(textoAtualizado(t, t + 5 * 60_000), "Atualizado há 5 min");
  assert.equal(textoAtualizado(t, t + 2 * 3600_000), "Atualizado às 12:00");
});

test("telas ligadas: menu ⋮, foco no primeiro campo, fechamento seguro, carimbo, barra de vida útil e inventário em etapas", () => {
  const d = fonte("src/components/ui/dialog.tsx");
  assert.match(d, /onOpenAutoFocus/);
  assert.match(d, /\(pointer: coarse\)/, "no celular o teclado não sobe sozinho");
  assert.match(d, /Use Cancelar para sair sem salvar/);
  assert.match(d, /"form input, form textarea, form select"/, "só dado de formulário conta; busca numa janela de consulta não trava o fechamento");
  assert.match(d, /retratoDosFormularios\(janela\.current\) === inicial\.current/, "digitar e apagar volta ao começo: a janela fecha");
  assert.match(d, /\[role=combobox\]:not\(\[disabled\]\)/, "o foco respeita a ordem da tela, listas incluídas");
  assert.match(fonte("src/components/GavetaResumo.tsx"), /temValorInformativo/);
  for (const f of ["src/components/modules/EstoqueModulo.tsx", "src/components/modules/EstoqueEpiModulo.tsx", "src/components/modules/DashboardModulo.tsx"]) assert.match(fonte(f), /<CarimboAtualizacao/, f);
  assert.match(fonte("src/components/modules/ManutencaoRevisoes.tsx"), /<BarraVidaUtil/);
  assert.match(fonte("src/components/modules/EstoqueEpiModulo.tsx"), /<BarraVidaUtil/);
  const inv = fonte("src/components/modules/InventarioContagem.tsx");
  assert.match(inv, /<Etapas/);
  assert.match(inv, /disabled=\{!!bloqueio\}/, "Próximo desabilitado com o motivo acima dele");
  assert.doesNotMatch(inv, /\.insert\(|useSalvar|useRegistrar/, "inventário não grava nada");
  assert.match(fonte("src/components/modules/PaginaModulo.tsx"), /value="inventario"[^>]*>\s*<InventarioContagem modulo=\{modulo\} \/>/);
  // Microcopy: nada de Sim / Confirmar genérico nas confirmações.
  assert.doesNotMatch(fonte("src/components/modules/ConfirmarFichaAvulsa.tsx"), />Sim</);
  assert.doesNotMatch(fonte("src/components/parametros/AlertaPainelManutencao.tsx"), />Sim</);
  assert.doesNotMatch(fonte("src/components/modules/SugestaoComprasEpi.tsx"), />\s*Confirmar\s*</);
});
