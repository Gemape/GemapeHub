import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("../src/", import.meta.url).pathname;
const arquivos = (dir) =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
const fontes = arquivos(raiz).filter((c) => /\.(ts|tsx)$/.test(c));
const ler = (relativo) => readFileSync(join(raiz, relativo), "utf8");

// Listas de EPI, Uniforme e Veículo vêm de Cadastros > Gerais; as listas fixas
// de src/lib/gemape.ts só servem de dados iniciais para Gerais.
const SEMENTES = ["CATEGORIAS_EPI", "CATEGORIAS_UNIFORME", "TIPOS_VEICULO"];
const REMOVIDAS = ["TAMANHOS_EPI", "TAMANHOS_UNIFORME", "UNIDADES_EPI", "UNIDADES_UNIFORME"];

test("as listas fixas de EPI, Uniforme e Veículo só são usadas como sementes de Gerais", () => {
  for (const nome of SEMENTES) {
    const usos = fontes
      .filter((c) => new RegExp(`\\b${nome}\\b`).test(readFileSync(c, "utf8")))
      .map((c) => c.slice(raiz.length))
      .sort();
    assert.deepEqual(usos, ["lib/gemape.ts", "lib/parametros-base.ts"], nome);
  }
});

test("tamanhos e unidades fixos de EPI e Uniforme não existem mais", () => {
  for (const nome of REMOVIDAS) {
    const usos = fontes.filter((c) => new RegExp(`\\b${nome}\\b`).test(readFileSync(c, "utf8")));
    assert.deepEqual(usos, [], nome);
  }
});

test("o módulo antigo de veículos com lista fixa foi apagado", () => {
  assert.equal(existsSync(join(raiz, "components/modules/VeiculosModulo.tsx")), false);
});

test("o cadastro de itens antigo atende só ferramentas", () => {
  const fonte = ler("components/modules/ItensModulo.tsx");
  assert.match(fonte, /modulo: "ferramenta"/);
  assert.doesNotMatch(fonte, /modulo === "epi"|modulo === "uniforme"|SKU-001/);
});
