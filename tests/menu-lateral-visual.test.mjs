import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");

test("menu lateral: itens, submenus e títulos de grupo usam o visual maior da decisão 98", () => {
  assert.match(fonte, /const BOTAO_MENU =[\s\S]*text-\[15px\][\s\S]*\[&>svg\]:size-5/);
  assert.match(fonte, /const BOTAO_SUBMENU =[\s\S]*text-\[14px\][\s\S]*\[&>svg\]:size-\[18px\]/);
  assert.match(fonte, /const TITULO_GRUPO =[\s\S]*uppercase/);
  assert.match(fonte, /<SidebarGroupLabel className=\{TITULO_GRUPO\}>/);
  assert.equal((fonte.match(/className=\{BOTAO_SUBMENU\}/g) ?? []).length, 2);
  assert.ok((fonte.match(/className=\{BOTAO_MENU\}/g) ?? []).length >= 3);
});

test("menu lateral: títulos de grupo em faixa destacada e grupos separados por linha (decisão 99)", () => {
  assert.match(fonte, /const TITULO_GRUPO =[\s\S]*bg-white\/10[\s\S]*text-white/);
  assert.match(fonte, /const SEPARADOR_GRUPO = "[^"]*border-t/);
  assert.match(fonte, /indice > 0 \? SEPARADOR_GRUPO : undefined/);
});

test("menu lateral: vidro, animação nos botões e logo com duas engrenagens (decisão 100)", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(fonte, /const BOTAO_MENU =\s+"menu-vidro /);
  assert.match(fonte, /const BOTAO_SUBMENU =\s+"menu-vidro-sub /);
  assert.match(fonte, /className="logo-engrenagem"/);
  assert.match(fonte, /engrenagem-girando size-10/);
  assert.match(fonte, /engrenagem-inversa size-6/);
  assert.match(fonte, /text-3xl font-black[^"]*">GEMAPE/);
  for (const u of ["menu-vidro", "menu-vidro-sub", "logo-engrenagem", "engrenagem-inversa"]) {
    assert.match(css, new RegExp(`@utility ${u} \\{`));
  }
  assert.match(css, /backdrop-filter: blur/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("logo: engrenagens encaixadas, mesma velocidade e sentidos opostos (correção da decisão 100)", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(css, /@keyframes engrenagem-encaixada \{[\s\S]*rotate\(15deg\)[\s\S]*rotate\(-345deg\)/);
  assert.match(css, /& > \.engrenagem-girando \{[\s\S]*left: 8px;[\s\S]*animation-duration: 8s/);
  assert.match(css, /& > \.engrenagem-inversa \{[\s\S]*left: 34px;[\s\S]*engrenagem-encaixada 8s linear infinite/);
});
