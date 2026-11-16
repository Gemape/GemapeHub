import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { sugerirNome } from "../src/lib/busca-tolerante.ts";
import { buscarCep, preencherEndereco } from "../src/lib/cep.ts";
import { calcularCompletude, CAMPOS_EMPREGADO } from "../src/lib/completude.ts";
import { descricaoDoMenu } from "../src/lib/descricoes-menu.ts";
import { direcaoDaTroca, marcarDirecao } from "../src/lib/direcao-tela.ts";
import { mascararPlaca } from "../src/lib/mascaras.ts";
import { ultimaCompraDoFornecedor } from "../src/lib/sugestao-entrada.ts";
import { ABAS_EPI, ABAS_UNIFORME, ABAS_FERRAMENTA } from "../src/lib/menu-parametros.ts";

test("placa: antiga ganha hífen, Mercosul não, maiúsculas e máximo de 7 caracteres", () => {
  assert.equal(mascararPlaca("abc1234"), "ABC-1234");
  assert.equal(mascararPlaca("abc1d23"), "ABC1D23");
  assert.equal(mascararPlaca("abc-12"), "ABC-12");
  assert.equal(mascararPlaca("abc1"), "ABC1");
  assert.equal(mascararPlaca("abc1234999"), "ABC-1234");
  assert.equal(mascararPlaca(""), "");
});

test("CEP: busca só com 8 dígitos, lê o ViaCEP e devolve null em erro", async () => {
  const ok = async () => ({ ok: true, json: async () => ({ logradouro: "Rua A", bairro: "Centro", localidade: "Cuiabá", uf: "MT" }) });
  assert.deepEqual(await buscarCep("78.005-100", ok), { rua: "Rua A", bairro: "Centro", cidade: "Cuiabá", estado: "MT" });
  assert.equal(await buscarCep("123", ok), null);
  assert.equal(await buscarCep("99999-999", async () => ({ ok: true, json: async () => ({ erro: true }) })), null);
  assert.equal(await buscarCep("88888-888", async () => { throw new Error("sem rede"); }), null);
});

test("CEP: só preenche campo vazio, nunca sobrescreve", () => {
  const campos = { rua: { value: "", dispatchEvent() {} }, bairro: { value: "Já digitado", dispatchEvent() {} }, cidade: { value: " ", dispatchEvent() {} } };
  const form = { elements: { namedItem: (n) => campos[n] ?? null } };
  const feitos = preencherEndereco(form, { rua: "Rua A", bairro: "Centro", cidade: "Cuiabá", estado: "MT" });
  assert.deepEqual(feitos, ["rua", "cidade"]);
  assert.equal(campos.bairro.value, "Já digitado");
  assert.deepEqual(preencherEndereco(null, { rua: "A", bairro: "B", cidade: "C", estado: "D" }), []);
});

test("subtítulos: opções parecidas têm descrição e toda aba dos módulos de entrega está coberta", () => {
  assert.match(descricaoDoMenu("Ficha de EPI Avulsa"), /pontuais/);
  for (const a of [...ABAS_EPI, ...ABAS_UNIFORME, ...ABAS_FERRAMENTA].filter((x) => /termo|ficha|entrega|entrada/i.test(x.titulo))) {
    assert.ok(descricaoDoMenu(a.titulo), `sem descrição: ${a.titulo}`);
  }
});

test("Você quis dizer: nome parecido sugere, nome distante não", () => {
  const nomes = ["Jonathan Silva", "Maria Souza"];
  assert.equal(sugerirNome("Jonatan", nomes), "Jonathan Silva");
  assert.equal(sugerirNome("Xyzabc", nomes), undefined);
  assert.equal(sugerirNome("", nomes), undefined);
});

test("completude: percentual e o que falta", () => {
  const r = calcularCompletude({ nome: "A", cpf: "1", empresa_id: "x", matricula: "L1P1", email: "", data_admissao: "" }, CAMPOS_EMPREGADO);
  assert.equal(r.pct, 67);
  assert.deepEqual(r.faltam.map((c) => c.id), ["email", "data_admissao"]);
  assert.equal(calcularCompletude({}, []).pct, 100);
});

test("entrada: sugere a última compra do fornecedor (mais recente, com item e empresa)", () => {
  const c = (fornecedor, data, item, v) => ({ fornecedor, data_compra: data, empresa_id: "e1", item_id: item, valor_unitario: v });
  const lista = [c("Alfa", "2026-01-01", "i1", 10), c("alfa ", "2026-03-01", "i2", 12), c("Beta", "2026-04-01", "i3", 5), c("Alfa", "2026-05-01", null, 9)];
  assert.equal(ultimaCompraDoFornecedor(lista, "Alfa").item_id, "i2");
  assert.equal(ultimaCompraDoFornecedor(lista, "Zeta"), undefined);
  assert.equal(ultimaCompraDoFornecedor(lista, ""), undefined);
});

test("direção: voltar vale uma vez e depois volta a avançar", () => {
  assert.equal(direcaoDaTroca(), "avancar");
  marcarDirecao("voltar");
  assert.equal(direcaoDaTroca(), "voltar");
  assert.equal(direcaoDaTroca(), "voltar", "ler não gasta a marca (modo estrito do React lê duas vezes)");
  marcarDirecao("avancar");
  assert.equal(direcaoDaTroca(), "avancar");
});

test("telas: máscara de placa, barra de completude, destaque e sem-resultado ligados", () => {
  const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(ler("src/components/modules/VeiculosCadastroModulo.tsx"), /aoDigitarMascarado\("placa"\)/);
  assert.match(ler("src/components/modules/VeiculosCadastroModulo.tsx"), /BarraCompletude campos=\{camposDeCompletude\}/);
  assert.match(ler("src/components/modules/EmpregadosCadastroModulo.tsx"), /BarraCompletude campos=\{CAMPOS_EMPREGADO\}/);
  assert.match(ler("src/components/modules/EmpregadosCadastroModulo.tsx"), /SemResultadoBusca/);
  assert.match(ler("src/components/inicio/BuscaRapida.tsx"), /SemResultadoBusca/);
  assert.match(ler("src/routes/_authenticated/route.tsx"), /pagina-entra-esquerda/);
  assert.match(ler("src/lib/mascaras.ts"), /nome === "cep"/);
});
