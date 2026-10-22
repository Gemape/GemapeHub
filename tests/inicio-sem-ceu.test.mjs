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

test("os cartões da tela inicial são de vidro (efeito glassmorphism do sistema), sem fundo sólido", () => {
  assert.match(inicio, /"glass overflow-hidden/);
  assert.doesNotMatch(inicio, /bg-card\b/);
});

test("o topo traz o título animado Grupo Gemape Gestão de Patrimônio, centralizado, no lugar do texto antigo", () => {
  const rota = ler("routes/_authenticated/route.tsx");
  assert.match(rota, /titulo-marca[^>]*>Grupo Gemape Gestão de Patrimônio</);
  assert.doesNotMatch(rota, /Demonstração · dados locais|Grupo GEMAPE</);
  assert.match(rota, /md:grid-cols-\[1fr_auto_1fr\]/);
  const css = ler("styles.css");
  assert.match(css, /@utility titulo-marca \{[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?animation: none/);
});

test("os cartões seguem como estavam: faixa em tom da marca, ícone, título e Clique para acessar", () => {
  assert.match(inicio, /bg-primary\/10/);
  assert.match(inicio, /Clique para acessar/);
  assert.match(inicio, /lg:w-\[calc\(25%/);
});

test("a tela inicial não mostra mais o texto de título (Início / Gestão de Patrimônio): começa direto nos cartões", () => {
  assert.doesNotMatch(inicio, /Escolha onde você quer trabalhar/);
  assert.doesNotMatch(inicio, /text-eyebrow/);
  assert.doesNotMatch(inicio, /Gestão de Patrimônio/);
});

test("o título da página continua existindo só para o leitor de tela (acessibilidade)", () => {
  assert.match(inicio, /<h1 className="sr-only">Início<\/h1>/);
});
