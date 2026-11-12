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
  assert.match(inicio, /"vidro-cartao /);
  assert.doesNotMatch(inicio, /bg-card\b/);
});

test("o topo traz só Gestão de Patrimônio (letras em quadradinhos animados), centralizado, sem o Grupo Gemape acima", () => {
  const rota = ler("routes/_authenticated/route.tsx");
  assert.doesNotMatch(rota, /eyebrow-marca/);
  assert.match(rota, /<span className="sr-only">Gestão de Patrimônio e Gemape Máquinas e Peças Ltda<\/span>/);
  assert.match(rota, /className="letra-marca"/);
  assert.doesNotMatch(rota, /Demonstração · dados locais|Grupo GEMAPE</);
  assert.match(rota, /md:grid-cols-\[auto_1fr_auto\]/);
  const css = ler("styles.css");
  assert.match(css, /@utility letra-marca \{[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?animation: none/);
});

test("os cartões seguem como estavam: faixa em tom da marca, ícone, título e Clique para acessar", () => {
  assert.match(inicio, /bg-primary\/10/);
  assert.match(inicio, /Clique para acessar/);
  assert.match(inicio, /grid-cols-1[^\"]*min-\[480px\]:grid-cols-2/);
});

test("a tela inicial não mostra mais o texto de título (Início / Gestão de Patrimônio): começa direto nos cartões", () => {
  assert.doesNotMatch(inicio, /Escolha onde você quer trabalhar/);
  assert.doesNotMatch(inicio, /text-eyebrow/);
  assert.doesNotMatch(inicio, /Gestão de Patrimônio/);
});

test("o título da página continua existindo só para o leitor de tela (acessibilidade)", () => {
  assert.match(inicio, /<h1 className="sr-only">Início<\/h1>/);
});

test("a tipografia é Manrope: título 700 em caixa alta, cartões 500 e 400; e o topo é maior", () => {
  const css = ler("styles.css");
  assert.match(css, /@utility letra-marca \{[\s\S]*?"Manrope"[\s\S]*?font-weight: 900/);
  assert.match(inicio, /fonte-manrope/);
  assert.match(inicio, /font-medium">\{c\.titulo\}/);
  assert.match(ler("routes/__root.tsx"), /family=Manrope/);
  const rota = ler("routes/_authenticated/route.tsx");
  assert.match(rota, /sm:w-52/);
  assert.match(rota, /py-5/);
});

test("o fundo segue o site da Gemape: branco descendo para um azul clarinho, com manchas suaves", () => {
  const css = ler("styles.css");
  assert.match(css, /--fundo-a: oklch\(1 0 0\);/);
  assert.match(css, /--fundo-b: oklch\(0\.97[0-9]* 0\.01/);
});

test("o ícone dos cartões é um medalhão grande que flutua e brilha, e fica parado para quem reduz movimento", () => {
  assert.match(inicio, /medalhao-cartao/);
  const css = ler("styles.css");
  assert.match(css, /@utility medalhao-cartao \{[\s\S]*?height: 5rem[\s\S]*?cartao-flutua[\s\S]*?cartao-anel-pulso[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?animation: none/);
  assert.ok(css.includes(".group\\/cartao:hover & > svg"));
});

test("o morphing: todo ícone da tela inicial tem um segundo ícone, que só anima sem 'reduzir movimento' e some no celular", () => {
  const lib = ler("lib/inicio.ts");
  const chaves = [...inicio.match(/const ICONES_MORPH[^{]*\{([\s\S]*?)\};/)[1].matchAll(/(\w+):/g)].map((m) => m[1]);
  const icones = [...inicio.match(/const ICONES_CARTAO[^{]*\{([\s\S]*?)\};/)[1].replace(/:\s*\w+/g, "").matchAll(/\w+/g)].map((m) => m[0]);
  for (const i of icones) assert.ok(chaves.includes(i), `sem morph para ${i}`);
  assert.ok(lib.length > 0);
  const css = ler("styles.css");
  assert.match(css, /@keyframes ic-morph-a[\s\S]*@keyframes ic-morph-b/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?ic-morph-a[\s\S]*?pointer: coarse[\s\S]*?data-morph\] \{ display: none/);
});
