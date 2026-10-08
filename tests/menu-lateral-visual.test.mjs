import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");

test("menu lateral: itens, submenus e títulos de grupo usam o visual maior da decisão 98", () => {
  assert.match(fonte, /const BOTAO_MENU =[\s\S]*text-\[15px\][\s\S]*\[&>svg:not\(\.icone-seta\)\]:size-8/);
  assert.match(fonte, /const BOTAO_SUBMENU =[\s\S]*text-\[14px\][\s\S]*\[&>svg:not\(\.icone-seta\)\]:size-7/);
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

test("menu lateral: vidro e animação nos botões (decisão 100)", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(fonte, /const BOTAO_MENU =\s+"menu-vidro /);
  assert.match(fonte, /const BOTAO_SUBMENU =\s+"menu-vidro-sub /);
  for (const u of ["menu-vidro", "menu-vidro-sub"]) {
    assert.match(css, new RegExp(`@utility ${u} \\{`));
  }
  assert.match(css, /backdrop-filter: blur/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("marca do menu: logo GEMAPE 40 anos animada no lugar das engrenagens, com versão parada para quem reduz movimento (decisões 109 e 114)", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(fonte, /import logoMarca from "@\/assets\/logo-gemape-40-anos\.png"/);
  assert.match(fonte, /className="logo-marca"/);
  assert.match(fonte, /maskImage: `url\(\$\{logoMarca\}\)`/);
  assert.match(fonte, /aria-label="GEMAPE, 40 anos, máquinas e peças"/);
  assert.doesNotMatch(fonte, /<Cog|logo-engrenagem|marca-titulo/);
  assert.match(fonte, /className="text-center leading-tight"/);
  assert.match(fonte, /className="marca-linha mt-3"/);
  assert.match(fonte, /marca-subtitulo/);
  for (const u of ["logo-marca", "marca-subtitulo", "marca-linha"]) {
    const bloco = css.slice(css.indexOf(`@utility ${u} {`));
    assert.ok(bloco.length > 0, u);
    assert.match(bloco.slice(0, bloco.indexOf("\n}\n")), /prefers-reduced-motion: reduce[\s\S]*animation: none/);
  }
  for (const k of ["logo-entrada", "logo-varredura", "logo-halo", "marca-entrada", "marca-linha"]) assert.match(css, new RegExp(`@keyframes ${k} \\{`));
  assert.doesNotMatch(css, /engrenagem-inversa|logo-engrenagem|marca-titulo/);
});

test("os ícones do menu ficam em quadrinhos de vidro animados, sem afetar a seta (dec 122)", () => {
  const fonte = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(fonte, /const BOTAO_MENU =\s+"menu-vidro icone-menu /);
  assert.match(fonte, /const BOTAO_SUBMENU =\s+"menu-vidro-sub icone-menu /);
  assert.match(fonte, /icone-seta ml-auto/);
  assert.match(css, /@utility icone-menu/);
  assert.match(css, /@keyframes icone-balanco/);
  assert.match(css, /@keyframes icone-pulso/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*& > svg:not\(\.icone-seta\)/);
});
