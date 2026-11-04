import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { enderecoDaEntrada } from "../src/lib/enderecamento-categoria.ts";

const dados = (cat, tipo) => ({ enderecamentoCategorias: { [cat]: tipo } });
const enderecos = [{ id: "1", empresa_id: "e1", codigo_produto: "epi-0002", rua: "A", prateleira: "3", apartamento: "2" }];

test("categoria sem endereçamento não mostra nada; com endereçamento mostra o endereço do produto na empresa", () => {
  assert.equal(enderecoDaEntrada(dados("cat-epi", "nao_usa"), "cat-epi", "e1", "EPI-0002", enderecos).aplica, false);
  const e = enderecoDaEntrada(dados("cat-epi", "obrigatorio"), "cat-epi", "e1", "EPI-0002", enderecos);
  assert.equal(e.aplica, true);
  assert.equal(e.texto, "Rua A · Número 3 · Apartamento 2");
  assert.equal(e.endereco?.id, "1");
});

test("sem endereço cadastrado, aplica e avisa; obrigatório só na categoria obrigatória; outra empresa não vale", () => {
  const sem = enderecoDaEntrada(dados("cat-uniformes", "obrigatorio"), "cat-uniformes", "e1", "UNI-9", enderecos);
  assert.deepEqual([sem.aplica, sem.obrigatorio, sem.endereco], [true, true, null]);
  const opcional = enderecoDaEntrada(dados("cat-uniformes", "opcional"), "cat-uniformes", "e1", "UNI-9", enderecos);
  assert.deepEqual([opcional.aplica, opcional.obrigatorio], [true, false]);
  assert.equal(enderecoDaEntrada(dados("cat-epi", "obrigatorio"), "cat-epi", "e2", "EPI-0002", enderecos).endereco, null);
  assert.equal(enderecoDaEntrada(dados("cat-epi", "obrigatorio"), "cat-epi", "", "EPI-0002", enderecos).aplica, false);
});

test("as entradas de EPI, uniforme e ferramenta mostram o endereçamento e avisam ao salvar; o link abre o endereçamento filtrado", () => {
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  assert.match(ler("components/modules/EpiComprasModulo.tsx"), /<EnderecoDaEntrada categoriaId="cat-epi"/);
  assert.match(ler("components/modules/EpiComprasModulo.tsx"), /avisarEnderecamentoObrigatorio\(parametros, "cat-epi"/);
  assert.match(ler("components/modules/UniformesComprasModulo.tsx"), /<EnderecoDaEntrada categoriaId="cat-uniformes"/);
  assert.match(ler("components/modules/UniformesComprasModulo.tsx"), /avisarEnderecamentoObrigatorio\(parametros, "cat-uniformes"/);
  const mov = ler("components/modules/MovimentacoesModulo.tsx");
  assert.match(mov, /modulo === "ferramenta" && tipoMovimentacao === "Entrada" && alvoId[\s\S]*<EnderecoDaEntrada categoriaId="cat-ferramentas"/);
  assert.match(mov, /avisarEnderecamentoObrigatorio\(parametros, "cat-ferramentas"/);
  assert.match(ler("components/EnderecoDaEntrada.tsx"), /\/cadastros\/gerais\/enderecamento\?busca=/);
  assert.match(ler("routes/_authenticated/cadastros/gerais/enderecamento.tsx"), /validateSearch/);
});
