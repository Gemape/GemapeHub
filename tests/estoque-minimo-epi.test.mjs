import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { abaixoDoMinimo } from "../src/lib/sugestao-epi.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const l = (itemId, total, minimo, empresaId = "e1") => ({ itemId, codigo: itemId, descricao: `EPI ${itemId}`, empresaId, total, minimo });

test("estoque mínimo: só entra saldo <= mínimo (com mínimo definido), do mais distante do mínimo para o mais perto", () => {
  const r = abaixoDoMinimo([l("a", 8, 9), l("b", 0, 5), l("c", 9, 9), l("d", 10, 9), l("e", 3, 0), l("f", 2, 10)]);
  assert.deepEqual(r.map((x) => x.itemId), ["b", "f", "a", "c"], "sem estoque primeiro; 10 > 9 e mínimo 0 ficam de fora");
});

test("o botão Estoque mínimo abre a janela com uma tela por empresa e o aviso fixo saiu da Sugestão de Compras (decisão 410)", () => {
  const sug = ler("components/modules/SugestaoComprasEpi.tsx");
  assert.match(sug, /<EstoqueMinimoEpi linhas=\{todas\} empresas=\{empresasParaEscolha\(empresas\)\} \/>/);
  assert.doesNotMatch(sug, /Estoque no mínimo ou abaixo \(/);
  const tela = ler("components/modules/EstoqueMinimoEpi.tsx");
  assert.match(tela, /Estoque mínimo/);
  assert.match(tela, /aria-pressed=\{atual\?\.empresa\.id === empresa\.id\}/);
  assert.doesNotMatch(tela, /TabsTrigger|TabsList/, "o projeto não usa abas (decisão 43): são botões");
  assert.match(tela, /Tudo certo em/);
});
