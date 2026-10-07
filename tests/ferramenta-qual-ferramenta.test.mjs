import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { grupoPedeQualFerramenta, prepararCadastroFerramenta, qualFerramentaDe } from "../src/lib/cadastro-ferramentas.ts";
import { lerParametros } from "../src/lib/parametros-base.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};

const entrada = (extra) => ({
  parametros: lerParametros(storage()), codigosExistentes: [], categoriaFerramenta: "Manual", modelo: "Mod 1", estoqueMinimo: "2", ...extra,
});

test("só Outros e Diversos pedem qual ferramenta é", () => {
  for (const g of ["Outros", "outro", " Outras ", "Diversos"]) assert.equal(grupoPedeQualFerramenta(g), true, g);
  for (const g of ["Alicates", "", null, undefined]) assert.equal(grupoPedeQualFerramenta(g), false, String(g));
});

test("no grupo Diversos o nome digitado entra na descrição no lugar do grupo", () => {
  const r = prepararCadastroFerramenta(entrada({ grupoFerramenta: "Diversos", qualFerramenta: "  Serra   tico-tico " }));
  assert.equal(r.nome, "Serra tico-tico · Mod 1");
  assert.equal(r.grupo_ferramenta, "Diversos");
});

test("no grupo Diversos sem o nome digitado o cadastro é recusado", () => {
  assert.throws(() => prepararCadastroFerramenta(entrada({ grupoFerramenta: "Diversos", qualFerramenta: "  " })), /qual é a ferramenta/);
});

test("em outro grupo o texto digitado é ignorado", () => {
  const r = prepararCadastroFerramenta(entrada({ grupoFerramenta: "Alicates", qualFerramenta: "Serra" }));
  assert.equal(r.nome, "Alicates · Mod 1");
});

test("o separador da descrição não passa pelo texto digitado", () => {
  const r = prepararCadastroFerramenta(entrada({ grupoFerramenta: "Diversos", qualFerramenta: "Serra · Grande" }));
  assert.equal(qualFerramentaDe({ grupo_ferramenta: "Diversos", nome: r.nome }), "Serra Grande");
});

test("na edição o nome digitado volta ao campo; sem ele o campo fica vazio", () => {
  assert.equal(qualFerramentaDe({ grupo_ferramenta: "Diversos", nome: "Serra · Mod 1" }), "Serra");
  assert.equal(qualFerramentaDe({ grupo_ferramenta: "Diversos", nome: "Diversos · Mod 1" }), "");
  assert.equal(qualFerramentaDe({ grupo_ferramenta: "Alicates", nome: "Alicates · Mod 1" }), "");
  assert.equal(qualFerramentaDe(null), "");
});

test("o formulário abre o campo só quando o grupo pede e exige o preenchimento", () => {
  const fonte = readFileSync(new URL("../src/components/modules/ItensModulo.tsx", import.meta.url), "utf8");
  assert.match(fonte, /grupoPedeQualFerramenta\(grupoEscolhido\) && \(/);
  assert.match(fonte, /id="qual_ferramenta" name="qual_ferramenta" required/);
});
