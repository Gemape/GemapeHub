import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { lerParametros, salvarCodigoFabrica } from "../src/lib/parametros-base.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const base = {
  empresa_id: "e1", tabela: "epis", codigo_produto: "EPI-0001", nome_produto: "Luva",
  fornecedor_id: "f1", fornecedor_nome: "Forn", codigo_fornecedor: "LUV-1", ca: "12345",
};

test("o CA do código de fábrica aceita somente números", () => {
  const s = storage();
  assert.equal(salvarCodigoFabrica(base, undefined, s).ca, "12345");
  for (const ruim of ["12a45", "CA 123", "12.345", "12-3", "1 2"]) {
    assert.throws(
      () => salvarCodigoFabrica({ ...base, codigo_fornecedor: `X-${ruim}`, ca: ruim }, undefined, s),
      /CA.*somente números/,
      ruim,
    );
  }
  assert.equal(lerParametros(s).codigosFabrica.length, 1);
});

test("CA continua obrigatório para EPI e é ignorado nas demais categorias", () => {
  const s = storage();
  assert.throws(() => salvarCodigoFabrica({ ...base, ca: "" }, undefined, s), /informe o CA/i);
  const fer = salvarCodigoFabrica(
    { ...base, tabela: "ferramentas", codigo_produto: "FER-0001", codigo_fornecedor: "F-9", ca: "abc" },
    undefined,
    s,
  );
  assert.equal(fer.ca, "");
});

test("a tela de código de fábrica só deixa digitar números no CA", () => {
  const tela = readFileSync(
    new URL("../src/routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx", import.meta.url),
    "utf8",
  );
  assert.match(tela, /inputMode="numeric"/);
  assert.match(tela, /setCa\(e\.target\.value\.replace\(\/\\D\/g, ""\)\)/);
});
