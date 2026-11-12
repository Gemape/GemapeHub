import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("a tela de entrada usa o logo 40 anos animado, igual ao menu (dec 143)", () => {
  const logo = readFileSync("src/components/layout/LogoEntrada.tsx", "utf8");
  assert.match(logo, /logo-gemape-40-anos\.png/);
  assert.match(logo, /className="logo-marca"/);
  assert.match(logo, /marca-linha/);
  assert.match(logo, /Gestão de Patrimônio/);
  const auth = readFileSync("src/routes/auth.tsx", "utf8");
  assert.equal((auth.match(/<LogoEntrada grande \/>/g) ?? []).length, 3); // demonstração, login e configuração ausente
  assert.doesNotMatch(auth, /engrenagem-girando/);
});
