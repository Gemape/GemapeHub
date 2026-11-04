import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { montarRelatorioCadastroHtml } from "../src/lib/relatorio-cadastro.ts";

const campos = [
  { id: "codigo", rotulo: "Código", valor: (c) => c.codigo },
  { id: "nome", rotulo: "Nome", valor: (c) => c.nome },
  { id: "obs", rotulo: "Observação", valor: (c) => c.obs, padrao: false },
];
const linhas = [{ codigo: "00001", nome: "Ana <b>", obs: "" }, { codigo: "00002", nome: "Bruno", obs: "x" }];

test("o relatório sai só com os campos marcados, na ordem da lista, no padrão do sistema e com o texto escapado", () => {
  const html = montarRelatorioCadastroHtml({ titulo: "Relatório de clientes", campos, escolhidos: ["nome", "codigo"], linhas, geradoEm: "2026-11-04T12:00:00Z" });
  assert.ok(html.indexOf("<th>Código</th>") < html.indexOf("<th>Nome</th>"), "ordem da lista de campos");
  assert.doesNotMatch(html, /Observação/);
  assert.match(html, /Ana &lt;b&gt;/);
  assert.match(html, /<strong>Registros:<\/strong> 2/);
  assert.match(html, /class="padrao"/);
  assert.match(html, /Emitido em/);
});

test("campo vazio sai como traço e sem nenhum campo marcado o relatório não é gerado", () => {
  const html = montarRelatorioCadastroHtml({ titulo: "R", campos, escolhidos: ["obs"], linhas });
  assert.match(html, /<td>—<\/td>/);
  assert.throws(() => montarRelatorioCadastroHtml({ titulo: "R", campos, escolhidos: [], linhas }), /pelo menos um campo/);
  assert.throws(() => montarRelatorioCadastroHtml({ titulo: "R", campos, escolhidos: ["inexistente"], linhas }), /pelo menos um campo/);
});

test("as quatro telas de Cadastros têm o botão Relatório ao lado do Exportar CSV", () => {
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  for (const [arq, nome] of [["routes/_authenticated/cadastros/clientes.tsx", "clientes"], ["routes/_authenticated/cadastros/fornecedores.tsx", "fornecedores"], ["routes/_authenticated/empresas.tsx", "empresas"], ["components/modules/EmpregadosCadastroModulo.tsx", "empregados"]]) {
    assert.match(ler(arq), new RegExp(`<RelatorioCadastro[^>]*nome="${nome}"`), arq);
  }
  assert.match(ler("components/RelatorioCadastro.tsx"), /abrirDocumento/);
});

test("com mais de seis campos o relatório vai para a paisagem, na largura toda", () => {
  const muitos = Array.from({ length: 8 }, (_, n) => ({ id: `c${n}`, rotulo: `C${n}`, valor: () => "x" }));
  const largo = montarRelatorioCadastroHtml({ titulo: "R", campos: muitos, escolhidos: muitos.map((c) => c.id), linhas });
  assert.match(largo, /size: A4 landscape/);
  const estreito = montarRelatorioCadastroHtml({ titulo: "R", campos: muitos, escolhidos: ["c0", "c1"], linhas });
  assert.doesNotMatch(estreito, /A4 landscape/);
});
