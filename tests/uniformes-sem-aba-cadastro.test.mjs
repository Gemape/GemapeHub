import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ler = (arquivo) =>
  readFileSync(fileURLToPath(new URL(`../src/${arquivo}`, import.meta.url)), "utf8");

test("o módulo Uniformes não tem aba Cadastro, que fica só em Cadastros > Uniformes (decisão 26)", () => {
  const pagina = ler("components/modules/PaginaModulo.tsx");
  const uniforme = pagina.slice(pagina.indexOf(") : ("), pagina.indexOf("</TabsList>"));
  assert.match(uniforme, /value="termo-baixa"/, "o trecho conferido é o das abas de Uniformes");
  assert.doesNotMatch(uniforme, /value="cadastro"/);
  assert.doesNotMatch(pagina, /<CadastroProduto tabela="uniformes" \/>/);
  // EPI mantém a aba Estoque, agora separada do cadastro; Uniformes continua só em Cadastros.
  assert.match(pagina, /<EstoqueModulo modulo={modulo} \/>/);
  assert.doesNotMatch(pagina, /<CadastroProduto tabela="epis" \/>/);
  assert.match(
    ler("routes/_authenticated/cadastros/uniformes.tsx"),
    /CadastroProduto tabela="uniformes"/,
  );
});
