// Viagens > Painel cabe numa página: as duas listas ficam atrás de botões e rolam por dentro (decisão 396).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(`../src/components/modules/${c}`, import.meta.url), "utf8");

test("o painel mostra uma lista de cada vez, escolhida por botões", () => {
  const p = ler("ViagensPainel.tsx");
  assert.match(p, /useState<"despesas" \| "tecnicos">\("despesas"\)/);
  assert.match(p, /<div hidden=\{visao !== "despesas"\}><ViagensLista/, "a lista fica montada (guarda filtro e marcas)");
  assert.match(p, /\{visao === "tecnicos" && <section/);
  assert.match(p, /aria-pressed=\{visao === "despesas"\}/);
  assert.match(p, /aria-pressed=\{visao === "tecnicos"\}/);
  assert.ok(p.indexOf("{alternador}") < p.indexOf("<GradeDeCartoes"), "os botões ficam no topo, antes dos cartões");
  assert.ok(p.indexOf('aria-labelledby="viagens-questionarios"') > p.indexOf("<ViagensLista"), "os questionários ficam embaixo das listas");
});

test("as duas tabelas rolam por dentro, com o cabeçalho fixo", () => {
  for (const arq of ["ViagensPainel.tsx", "ViagensLista.tsx"]) {
    const t = ler(arq);
    assert.match(t, /max-h-\[max\(6rem,calc\(100dvh-\d+rem\)\)\] flex-col overflow-hidden/, arq);
    assert.match(t, /\[&_th\]:sticky/, arq);
  }
});

test("os cartões de indicadores seguem o desenho da Frota: escopo no título, explicação do cálculo e 7/12 da largura (decisão 398)", () => {
  const p = ler("ViagensPainel.tsx");
  assert.match(p, /<GradeDeCartoes colunas=\{4\} classe="xl:w-7\/12">/);
  assert.equal((p.match(/titulo="Viagens · /g) ?? []).length, 4);
  assert.match(p, /titulo="Viagens · Despesas lançadas no mês" subtitulo=/);
  assert.equal((p.match(/subtitulo="/g) ?? []).length, 4);
  assert.match(p, /grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">/, "os questionários ocupam a largura toda, distribuídos por igual (decisão 401)");
});

test("os botões de questionário são grandes: ícone em cima, nome embaixo, altura mínima de 7 rem (decisão 401)", () => {
  const p = ler("ViagensPainel.tsx");
  assert.match(p, /flex min-h-28 flex-col items-center justify-center gap-2 p-4 text-center text-sm font-semibold/);
  assert.match(p, /<Icone className="h-9 w-9 text-primary"/);
  assert.doesNotMatch(p, /xl:w-7\/12">\s*\{tipos\.map/, "os questionários não ficam presos a 7/12 da largura");
});

test("os botões das listas ficam no alto, à esquerda, e o período à direita (decisão 400)", () => {
  const p = ler("ViagensPainel.tsx");
  const a = p.indexOf("{alternador}\n          <h2 id=\"viagens-indicadores\" className=\"sr-only\"");
  assert.ok(a > 0, "o alternador abre a linha, antes do título (só para leitor de tela)");
  assert.ok(p.indexOf("{seletorPeriodo(\"indicadores\")}") > a, "o período fica à direita dos botões");
});

test("o seletor de período dos resultados dos técnicos fica à direita", () => {
  const p = ler("ViagensPainel.tsx");
  assert.match(p, /justify-end gap-2">\s*<h2 id="viagens-tecnicos" className="sr-only">/);
});
