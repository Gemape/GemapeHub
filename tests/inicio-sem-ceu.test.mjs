import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const inicio = ler("routes/_authenticated/inicio.tsx");

test("o efeito do céu (Cloud Sky) saiu do projeto, por ordem do responsável", () => {
  assert.equal(existsSync(new URL("../src/components/CloudSky.tsx", import.meta.url)), false);
  assert.doesNotMatch(inicio, /CloudSky|WebGL|webgl/);
  assert.doesNotMatch(inicio, /fixed inset-0|-z-10/);
});

test("a tela inicial usa só o fundo padrão do sistema (o gradiente do body, o mesmo das telas internas)", () => {
  assert.doesNotMatch(inicio, /bg-\[#|style=\{\{[^}]*background:/);
  const css = ler("styles.css");
  assert.match(css, /body \{[\s\S]*?linear-gradient\(160deg, var\(--fundo-a\), var\(--fundo-b\)\)/);
});

test("o texto da tela volta ao estilo simples, sem painéis que existiam só para dar leitura sobre o céu", () => {
  assert.doesNotMatch(inicio, /backdrop-blur|bg-card\/\d+/);
  assert.match(inicio, /<header>/);
});

test("os cartões seguem como estavam: faixa em tom da marca, ícone, título e Clique para acessar", () => {
  assert.match(inicio, /bg-primary\/10/);
  assert.match(inicio, /Clique para acessar/);
  assert.match(inicio, /lg:grid-cols-3/);
});
