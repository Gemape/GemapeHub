import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../src/", import.meta.url);
const ler = (arquivo) => readFileSync(new URL(arquivo, raiz), "utf8");

test("o vidro (glassmorphism) existe, desfoca o fundo e vale para painéis e cartões", () => {
  const css = ler("styles.css");
  assert.match(css, /\.glass \{[^}]*backdrop-filter: blur/s);
  assert.match(css, /\.glass-strong \{[^}]*backdrop-filter: blur/s);
  assert.match(css, /\.panel \{[^}]*backdrop-filter: blur/s);
  assert.match(ler("components/ui/card.tsx"), /glass min-w-0/);
});

test("a paleta da marca fica e só a barra lateral usa a nova cor", () => {
  const css = ler("styles.css");
  assert.match(css, /--primary: oklch\(0\.32 0\.25 266\)/);
  assert.match(css, /--sidebar: #0A007C/);
});

test("janelas, menus e listas suspensas usam o vidro firme", () => {
  for (const f of ["dialog", "alert-dialog", "sheet", "popover", "select", "dropdown-menu"]) {
    assert.match(ler(`components/ui/${f}.tsx`), /glass-strong/, f);
  }
});

test("o menu traz a logo GEMAPE 40 anos animada; a tela de acesso usa o mesmo logo (dec 143) e tudo respeita quem pede menos movimento", () => {
  const barra = ler("components/layout/AppSidebar.tsx");
  assert.match(barra, /className="logo-marca"/);
  assert.doesNotMatch(barra, /Settings2|<Cog/);
  const css = ler("styles.css");
  assert.match(css, /@keyframes engrenagem-girando/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*animation: none/);
  assert.match(ler("routes/auth.tsx"), /<LogoEntrada grande \/>/);
});

test("telas estreitas: o conteúdo não estoura a largura (cartões e abas rolam por dentro)", () => {
  assert.match(ler("components/ui/card.tsx"), /min-w-0/);
  assert.match(ler("components/ui/tabs.tsx"), /max-w-full[^"]*overflow-x-auto[^"]*justify-start|justify-start[^"]*overflow-x-auto/);
  assert.match(ler("routes/_authenticated/route.tsx"), /min-w-0 flex-col/);
});

test("a impressão sai sem gradiente e sem vidro", () => {
  const css = ler("styles.css");
  assert.match(css, /@media print \{[^@]*background: #fff !important/s);
  assert.match(css, /@media print[\s\S]*backdrop-filter: none !important/);
});

test("o vidro fica na camada de componentes, para os utilitários do Tailwind vencerem", () => {
  const css = ler("styles.css");
  assert.match(css, /@layer components \{[\s\S]*\.glass \{/);
  assert.doesNotMatch(css, /@utility (glass|glass-strong|panel) \{/);
});
