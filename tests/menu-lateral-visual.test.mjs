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
