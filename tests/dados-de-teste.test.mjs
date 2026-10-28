import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { aplicarDadosDeTeste, CHAVE_CONTROLE, lerControle, pedirLimpar, pedirRestaurar, prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import { VERSAO_DADOS_TESTE } from "../src/lib/dados-teste/conjunto.ts";
import * as P_GERAIS from "../src/lib/parametros-base.ts";
import { cpfValido, emailValido, matriculaValida } from "../src/lib/empregados.ts";
import { validarCep, validarCnpj, validarTelefone } from "../src/lib/formatacao-cadastral.ts";
import { placaValida } from "../src/lib/veiculos.ts";

const AGORA = new Date("2026-10-22T12:00:00-03:00");
const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const json = (s, k) => JSON.parse(s.getItem(k) ?? "null");
const prontos = () => {
  const s = memoria();
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  return s;
};
const doTeste = (lista) => lista.filter((l) => String(l.id).startsWith("teste-"));
const dados = (s) => json(s, "gemape-demo-dados");
const LISTAS = ["gemape-demo-fornecedores", "gemape-demo-clientes", "gemape-demo-abastecimentos", "gemape-demo-portadores-caixa", "gemape-demo-respostas-despesas"];

test("cinco registros em cada cadastro (cinco empregados por empresa); o sistema não traz mais a empresa GEMAPE de demonstração", () => {
  const s = prontos();
  const d = dados(s);
  for (const t of ["veiculos", "caixas_ferramentas"]) assert.equal(doTeste(d[t]).length, 5, t);
  assert.equal(doTeste(d.ferramentas).length, 20, "vinte ferramentas, distribuídas nas cinco caixas");
  assert.equal(doTeste(d.empresas).length, 3, "as três empresas do grupo");
  assert.equal(d.empresas.length, 3, "só as três empresas do grupo");
  assert.equal(doTeste(d.empregados).length, 15);
  for (const e of doTeste(d.empresas)) assert.equal(doTeste(d.empregados).filter((x) => x.empresa_id === e.id).length, 5, `cinco empregados em ${e.nome_fantasia}`);
  assert.equal(d.empregados.length, 15);
  for (const k of LISTAS) assert.equal(doTeste(json(s, k)).length, 5, k);
  assert.equal(doTeste(json(s, "gemape-demo-equipamentos")).length, 40);
  assert.equal(doTeste(json(s, "gemape-demo-equipamentos")).length, 40, "cinco equipamentos em cada um dos oito tipos");
  // EPIs e uniformes: três produtos (descrições), um registro de catálogo por tamanho.
  for (const t of ["epis_catalogo", "uniformes_catalogo"]) assert.equal(new Set(doTeste(d[t]).map((c) => c.nome)).size, 5, t);
  assert.ok(doTeste(d.epis_catalogo).length > 3, "tamanhos variados");
  const gerais = json(s, "gemape-demo-parametros-base");
  for (const lista of ["marcasFerramenta", "marcasUniforme", "tiposOcorrenciaVeiculo", "acoesManutencaoVeiculo"]) {
    assert.equal(lerControle(s).gerais[lista].length, 3, lista);
    for (const id of lerControle(s).gerais[lista]) assert.ok(gerais[lista].some((o) => o.id === id), `${lista} gravada`);
  }
  assert.deepEqual([1, 2, 3].filter((n) => gerais.caixasHabilitadas.includes(n)), [1, 2, 3]);
});

test("documentos, e-mails, telefones, CEPs, matrículas e placas têm formato válido", () => {
  const s = prontos();
  const d = dados(s);
  for (const e of doTeste(d.empresas)) { assert.ok(validarCnpj(e.cnpj), e.cnpj); assert.ok(validarCep(e.cep)); }
  for (const e of doTeste(d.empregados)) { assert.ok(cpfValido(e.cpf), e.cpf); assert.ok(emailValido(e.email)); assert.ok(matriculaValida(e.matricula)); assert.ok(e.email.endsWith("@exemplo.com.br")); }
  for (const f of doTeste(json(s, "gemape-demo-fornecedores"))) { assert.ok(validarCnpj(f.cnpj)); assert.ok(validarCep(f.cep)); assert.ok(validarTelefone(f.telefone)); }
  for (const c of doTeste(json(s, "gemape-demo-clientes"))) { assert.ok(cpfValido(c.cpf)); assert.ok(validarCnpj(c.cnpj)); assert.ok(validarTelefone(c.telefone) && validarTelefone(c.telefone2)); assert.ok(emailValido(c.email)); assert.ok(c.email.endsWith(".exemplo.com.br")); }
  for (const v of doTeste(d.veiculos)) assert.ok(placaValida(v.placa.replace("-", "")), v.placa);
});

test("todos os campos dos cadastros vêm preenchidos", () => {
  const s = prontos();
  const d = dados(s);
  const vazios = (linha, ignorar = []) => Object.entries(linha).filter(([k, v]) => !ignorar.includes(k) && (v === null || v === undefined || v === "")).map(([k]) => k);
  for (const e of doTeste(d.empresas)) assert.deepEqual(vazios(e), [], e.nome_fantasia);
  for (const e of doTeste(d.empregados)) assert.deepEqual(vazios(e, ["data_demissao"]), [], e.nome);
  for (const f of doTeste(json(s, "gemape-demo-fornecedores"))) assert.deepEqual(vazios(f), [], f.razao_social);
  for (const c of doTeste(json(s, "gemape-demo-clientes"))) assert.deepEqual(vazios(c), [], c.nome);
  for (const v of doTeste(d.veiculos)) assert.deepEqual(vazios(v), [], v.placa);
  for (const e of doTeste(json(s, "gemape-demo-equipamentos"))) assert.deepEqual(vazios(e), [], e.nome);
  for (const f of doTeste(d.ferramentas).filter((x) => x.tamanho !== null)) assert.deepEqual(vazios(f), [], f.nome);
  for (const c of doTeste(d.caixas_ferramentas)) assert.deepEqual(vazios(c), [], c.codigo);
});

test("coerência: cada registro aponta para algo que existe, na mesma empresa", () => {
  const s = prontos();
  const d = dados(s);
  const empresas = new Map(d.empresas.map((e) => [e.id, e]));
  const empregados = new Map(d.empregados.map((e) => [e.id, e]));
  for (const e of doTeste(d.empregados)) assert.ok(empresas.has(e.empresa_id), "empregado sem empresa");
  assert.equal(new Set(doTeste(d.empregados).map((e) => e.empresa_id)).size, 3, "um empregado em cada empresa");
  const veiculos = new Map(d.veiculos.map((v) => [v.id, v]));
  for (const v of doTeste(d.veiculos)) {
    assert.ok(empresas.has(v.empresa_id));
    assert.equal(empregados.get(v.empregado_responsavel_id)?.empresa_id, v.empresa_id, "responsável da mesma empresa");
  }
  for (const e of doTeste(json(s, "gemape-demo-equipamentos"))) assert.ok(empresas.has(e.empresaId), "equipamento sem empresa");
  const fornecedores = new Set(json(s, "gemape-demo-fornecedores").map((f) => f.id));
  const itens = new Map([...d.epis, ...d.uniformes, ...d.ferramentas].map((i) => [i.id, i]));
  for (const f of doTeste(d.ferramentas)) assert.ok(empresas.has(f.empresa_id));
  for (const c of [...d.compras_epis, ...d.compras_uniformes].filter((x) => String(x.id).startsWith("teste-"))) {
    assert.ok(fornecedores.has(c.fornecedor_id), "compra sem fornecedor");
    assert.equal(itens.get(c.item_id)?.empresa_id, c.empresa_id, "compra de item de outra empresa");
  }
  for (const m of doTeste(d.movimentacoes)) {
    const item = itens.get(m.item_id);
    assert.ok(item, "movimentação sem item");
    assert.equal(item.empresa_id, m.empresa_id, "movimentação de item de outra empresa");
    if (m.empregado_id) assert.equal(empregados.get(m.empregado_id)?.empresa_id, m.empresa_id, "entrega a empregado de outra empresa");
  }
  // Entregas e devoluções de EPI e de uniforme sempre apontam para um empregado existente.
  for (const m of doTeste(d.movimentacoes).filter((x) => ["epi", "uniforme"].includes(x.modulo) && x.tipo_movimentacao !== "Entrada")) assert.ok(empregados.has(m.empregado_id));
  // Cada EPI, uniforme e ferramenta de teste tem um código de fábrica com um dos três fornecedores.
  const fabrica = json(s, "gemape-demo-parametros-base").codigosFabrica.filter((c) => lerControle(s).gerais.codigosFabrica.includes(c.id));
  for (const c of fabrica) assert.ok(fornecedores.has(c.fornecedor_id));
  for (const i of [...doTeste(d.epis_catalogo), ...doTeste(d.uniformes_catalogo), ...doTeste(d.ferramentas)]) {
    assert.ok(fabrica.some((c) => c.codigo_produto === i.codigo_sku), `${i.codigo_sku} sem fornecedor`);
  }
  for (const c of fabrica.filter((x) => x.tabela === "epis")) assert.match(c.ca, /^\d+$/, "EPI com CA");
  // Caixas: ferramenta da mesma empresa e um portador existente.
  const caixas = new Map(d.caixas_ferramentas.map((c) => [c.id, c]));
  for (const i of doTeste(d.caixa_ferramenta_itens)) assert.equal(itens.get(i.ferramenta_id)?.empresa_id, caixas.get(i.caixa_id)?.empresa_id);
  for (const p of doTeste(json(s, "gemape-demo-portadores-caixa"))) {
    assert.equal(caixas.get(p.caixa_id)?.empresa_id, p.empresa_id);
    assert.equal(empregados.get(p.empregado_id)?.empresa_id, p.empresa_id);
  }
  // Viagens: cada uma ligada a um abastecimento de um veículo de teste e a um técnico (empregado de teste) habilitado.
  const abastecimentos = new Map(json(s, "gemape-demo-abastecimentos").map((a) => [a.id, a]));
  const questionario = json(s, "gemape-demo-questionario-despesas");
  const habilitados = questionario.perguntas.find((p) => p.id === "q-04").habilitados.filter((h) => String(h.empregadoId).startsWith("teste-"));
  assert.equal(habilitados.length, 15);
  for (const v of doTeste(json(s, "gemape-demo-respostas-despesas"))) {
    const ab = abastecimentos.get(v.valores["abastecimento:id"]);
    assert.ok(ab && veiculos.has(ab.veiculoId), "viagem sem veículo");
    const tecnico = habilitados.find((h) => v.valores["q-04"][0].startsWith(`${h.nome} (`));
    assert.ok(tecnico && empregados.has(tecnico.empregadoId), "viagem sem empregado");
  }
});

test("estoque: saldo por empresa e tamanho = movimentações; mínimos variados; alerta de EPI abaixo do mínimo para testar", () => {
  const s = prontos();
  const d = dados(s);
  for (const [tabela, modulo] of [["epis", "epi"], ["uniformes", "uniforme"], ["ferramentas", "ferramenta"]]) {
    for (const linha of doTeste(d[tabela])) {
      const saldo = doTeste(d.movimentacoes).filter((m) => m.modulo === modulo && m.item_id === linha.id).reduce((t, m) => t + (m.tipo_movimentacao === "Saida" ? -m.quantidade : m.quantidade), 0);
      assert.equal(linha.estoque_atual, saldo, `${tabela} ${linha.codigo_sku}`);
      assert.ok(linha.estoque_atual >= 0);
    }
  }
  const epis = doTeste(d.epis).filter((e) => e.empresa_id.startsWith("teste-"));
  assert.ok(new Set(epis.map((e) => e.estoque_minimo)).size >= 4, "mínimos variados");
  assert.ok(epis.some((e) => e.estoque_atual <= e.estoque_minimo), "há EPI no mínimo ou abaixo");
  assert.ok(epis.some((e) => e.estoque_atual > e.estoque_minimo), "e há EPI com estoque confortável");
  // Estoque separado por empresa e por tamanho: cada linha é um (item do catálogo, empresa), e o catálogo traz um tamanho por registro.
  assert.equal(new Set(epis.map((e) => `${e.catalogo_id}|${e.empresa_id}`)).size, epis.length);
  assert.ok(new Set(epis.flatMap((e) => e.tamanhos_selecionados)).size >= 6);
  // Cadastros só com parametrização: o catálogo guarda mínimo, nunca saldo.
  for (const c of [...doTeste(d.epis_catalogo), ...doTeste(d.uniformes_catalogo)]) assert.ok(!("estoque_atual" in c));
});

test("os dados ficam gravados: abrir de novo não faz nada e o que foi mexido nos dados de teste permanece", () => {
  const s = prontos();
  const antes = new Map(s.m);
  assert.equal(prepararDadosDeTeste(s, base, new Date("2026-11-01T12:00:00-03:00")), "igual");
  assert.deepEqual([...s.m], [...antes], "nada foi regravado");
  const d = dados(s);
  d.empresas.find((e) => e.id === "teste-empresa-1").nome_fantasia = "Gemape (editada pelo usuário)";
  s.setItem("gemape-demo-dados", JSON.stringify(d));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "igual");
  assert.equal(dados(s).empresas.find((e) => e.id === "teste-empresa-1").nome_fantasia, "Gemape (editada pelo usuário)");
});

test("versão nova do conjunto troca só o que é de teste e mantém o que o usuário criou", () => {
  const s = prontos();
  const d = dados(s);
  d.empresas.push({ id: "empresa-do-usuario", nome_fantasia: "Minha empresa" });
  d.empregados.push({ id: "emp-do-usuario", empresa_id: "empresa-do-usuario", nome: "Pessoa do usuário" });
  s.setItem("gemape-demo-dados", JSON.stringify(d));
  const controle = lerControle(s);
  s.setItem(CHAVE_CONTROLE, JSON.stringify({ ...controle, versao: VERSAO_DADOS_TESTE - 1 }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  const depois = dados(s);
  assert.equal(depois.empresas.filter((e) => e.id.startsWith("teste-")).length, 3, "sem duplicar");
  assert.equal(depois.empresas.filter((e) => e.nome_fantasia === "Minha empresa").length, 1);
  assert.equal(depois.empregados.filter((e) => e.id.startsWith("teste-")).length, 15);
  assert.equal(lerControle(s).versao, VERSAO_DADOS_TESTE);
  for (const k of LISTAS) assert.equal(doTeste(json(s, k)).length, 5, `${k} sem duplicar`);
  assert.equal(doTeste(json(s, "gemape-demo-equipamentos")).length, 40, "equipamentos sem duplicar");
  const gerais = json(s, "gemape-demo-parametros-base");
  assert.equal(gerais.marcasFerramenta.filter((m) => ["Ferrotec", "Maxforça", "Duramax"].includes(m.nome)).length, 3, "marcas sem duplicar");
});

test("Limpar tira só os dados de teste e não grava de novo; Restaurar repõe o conjunto original", () => {
  const s = prontos();
  const d = dados(s);
  d.empresas.push({ id: "empresa-do-usuario", nome_fantasia: "Minha empresa" });
  d.movimentacoes.push({ id: "mov-usuario", modulo: "epi", tipo_movimentacao: "Saida", quantidade: 1, item_id: d.epis.find((e) => e.id.startsWith("teste-")).id, empresa_id: "teste-empresa-1" });
  s.setItem("gemape-demo-dados", JSON.stringify(d));
  pedirLimpar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "limpo");
  const limpo = dados(s);
  for (const [tabela, linhas] of Object.entries(limpo)) assert.equal(doTeste(linhas).length, 0, tabela);
  assert.ok(limpo.empresas.some((e) => e.id === "empresa-do-usuario") && !limpo.empresas.some((e) => e.id === "empresa-demo"), "a empresa GEMAPE antiga não volta");
  assert.ok(!limpo.movimentacoes.some((m) => m.id === "mov-usuario"), "o que apontava para item de teste vai junto");
  for (const k of [...LISTAS, "gemape-demo-equipamentos"]) assert.equal(doTeste(json(s, k)).length, 0, k);
  const gerais = json(s, "gemape-demo-parametros-base");
  assert.ok(!gerais.marcasFerramenta.some((m) => m.nome === "Ferrotec"));
  assert.ok(!json(s, "gemape-demo-questionario-despesas").perguntas.find((p) => p.id === "q-04").habilitados.some((h) => String(h.empregadoId).startsWith("teste-")));
  // Aberto de novo, continua limpo.
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "igual");
  assert.equal(doTeste(dados(s).empresas).length, 0);
  // Restaurar volta a gravar tudo.
  pedirRestaurar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  assert.equal(doTeste(dados(s).empresas).length, 3);
  assert.ok(dados(s).empresas.some((e) => e.id === "empresa-do-usuario"), "o do usuário continua");
  for (const k of LISTAS) assert.equal(doTeste(json(s, k)).length, 5, k);
});

test("restaurar desfaz o que foi sujo nos dados de teste", () => {
  const s = prontos();
  const d = dados(s);
  d.empregados.find((e) => e.id === "teste-empregado-1").nome = "Nome sujo";
  const episAntes = d.epis.length;
  d.epis = d.epis.filter((e) => !e.id.startsWith("teste-epi-est-1"));
  assert.ok(d.epis.length < episAntes);
  s.setItem("gemape-demo-dados", JSON.stringify(d));
  pedirRestaurar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  assert.equal(dados(s).empregados.find((e) => e.id === "teste-empregado-1").nome, "Ana Beatriz Correia");
  assert.equal(dados(s).epis.length, episAntes, "o estoque apagado voltou");
});

test("dado salvo ilegível não é sobrescrito: os dados de teste não são aplicados", () => {
  const s = memoria();
  s.setItem("gemape-demo-dados", "{quebrado");
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "erro");
  assert.equal(s.getItem("gemape-demo-dados"), "{quebrado");
});

test("só no modo demonstração e só no armazenamento local: nada no Supabase e a produção não carrega o conjunto", () => {
  const demo = ler("integrations/supabase/demo-client.ts");
  assert.match(demo, /typeof window !== "undefined" && import\.meta\.env\?\.VITE_DEMO_MODE !== "false"\) prepararDadosDeTeste\(window\.localStorage/);
  const arquivos = readdirSync(new URL("../src/lib/dados-teste/", import.meta.url));
  assert.ok(arquivos.length >= 4);
  for (const a of arquivos) {
    const codigo = ler(`lib/dados-teste/${a}`);
    assert.doesNotMatch(codigo, /integrations\/supabase|createClient|\.rpc\(|supabase\.|\.from\("(?!gemape)/, a);
    assert.doesNotMatch(codigo, /fetch\(|XMLHttpRequest|sendBeacon/, a);
  }
  // O menu de Restaurar e Limpar só existe no demo.
  const rota = ler("routes/_authenticated/route.tsx");
  // A forma com ponto é trocada pelo valor no começo da compilação: na produção o menu e os dados de teste nem entram no pacote (conferido no build).
  assert.match(rota, /const MenuDadosDeTeste = import\.meta\.env\.VITE_DEMO_MODE !== "false"\s*\? lazy\(/);
  assert.match(ler("env.d.ts"), /readonly VITE_DEMO_MODE\?: string/);
  assert.match(rota, /\{MenuDadosDeTeste && <Suspense/);
  const menu = ler("components/layout/MenuDadosDeTeste.tsx");
  assert.match(menu, /Restaurar dados de teste/);
  assert.match(menu, /Limpar dados de teste/);
});

test("EPI e uniforme com tamanho guardam saldo e mínimo por tamanho, como a tela de Estoque lê", () => {
  const s = prontos();
  const d = dados(s);
  for (const linha of [...doTeste(d.epis), ...doTeste(d.uniformes)].filter((l) => l.tamanhos_selecionados.length === 1)) {
    const tam = linha.tamanhos_selecionados[0];
    assert.deepEqual(linha.saldos_tamanho, { [tam]: linha.estoque_atual }, linha.codigo_sku);
    assert.deepEqual(linha.minimos_tamanho, { [tam]: linha.estoque_minimo }, linha.codigo_sku);
  }
  assert.ok(doTeste(d.epis).some((l) => l.saldos_tamanho));
});

test("as empresas de teste são as três do grupo, com os CNPJs da planilha de controle", () => {
  const d = dados(prontos());
  assert.deepEqual(doTeste(d.empresas).map((e) => e.razao_social), ["Gemape Máquinas e Peças Ltda", "GMP Locações de Máquinas e Serviços Ltda", "Lapa Máquinas e Peças Ltda"]);
  assert.deepEqual(doTeste(d.empresas).map((e) => e.cnpj), ["21.866.173/0001-67", "08.184.170/0001-85", "44.578.791/0001-07"]);
});

test("formulários abrem preenchidos (2.8): o quarto registro é válido, único e nunca é gravado sozinho", async () => {
  const { exemploEmpresa, exemploEmpregado, exemploFornecedor, exemploCliente, exemploVeiculo, exemploCaixa, exemploFerramenta, ehExemplo } = await import("../src/lib/dados-teste/exemplos.ts");
  const s = prontos();
  const d = dados(s);
  const antes = JSON.stringify(d);
  const emp = exemploEmpresa(d.empresas);
  assert.ok(validarCnpj(emp.cnpj) && validarCep(emp.cep) && ehExemplo(emp));
  assert.ok(!d.empresas.some((e) => e.cnpj.replace(/\D/g, "") === emp.cnpj.replace(/\D/g, "")));
  const pessoa = exemploEmpregado(d.empregados, d.empresas[0].id, AGORA);
  assert.ok(cpfValido(pessoa.cpf) && matriculaValida(pessoa.matricula) && emailValido(pessoa.email));
  assert.ok(!d.empregados.some((e) => e.cpf === pessoa.cpf || e.matricula === pessoa.matricula));
  const forn = exemploFornecedor(json(s, "gemape-demo-fornecedores"));
  assert.ok(validarCnpj(forn.cnpj) && validarTelefone(forn.telefone));
  const cli = exemploCliente(json(s, "gemape-demo-clientes"));
  assert.ok(cpfValido(cli.cpf) && validarCnpj(cli.cnpj) && emailValido(cli.email));
  const vei = exemploVeiculo(d.veiculos, d.empresas[0].id, "Fiat", AGORA);
  assert.ok(placaValida(vei.placa) && !d.veiculos.some((v) => String(v.placa).replace("-", "") === vei.placa));
  assert.ok(exemploCaixa("x").status === "Ativa" && exemploFerramenta("Manual", "Ferrotec").grupo_ferramenta === "Chave L" && exemploFerramenta("Manual", "Ferrotec", "Lima", "8").tamanho === "8");
  assert.equal(JSON.stringify(dados(s)), antes, "o exemplo não grava nada");
});

test("formulários de exemplo só no modo demonstração: cada ponto de uso confere o modo na compilação", () => {
  const usos = ["routes/_authenticated/empresas.tsx", "routes/_authenticated/cadastros/fornecedores.tsx", "routes/_authenticated/cadastros/clientes.tsx", "routes/_authenticated/cadastros/equipamentos.tsx",
    "components/modules/EmpregadosCadastroModulo.tsx", "components/modules/CadastroEpi.tsx", "components/modules/CadastroUniforme.tsx", "components/modules/ItensModulo.tsx",
    "components/modules/VeiculosCadastroModulo.tsx", "components/modules/CaixasFerramentasModulo.tsx", "components/parametros/QuestionarioFormulario.tsx"];
  assert.equal(usos.length, 11);
  const gate = 'import.meta.env.VITE_DEMO_MODE !== "false"';
  for (const u of usos) {
    const fonte = ler(u);
    const chamadas = [...fonte.matchAll(/\b(exemplo[A-Z]\w*)\(/g)].map((m) => m.index);
    assert.ok(chamadas.length > 0, `${u} usa um exemplo`);
    // Toda chamada vem logo depois da conferência do modo (na mesma linha ou até 400 caracteres antes), na forma que o build troca por constante.
    for (const c of chamadas) assert.ok(fonte.lastIndexOf(gate, c) >= 0 && c - fonte.lastIndexOf(gate, c) < 400, `${u}: exemplo fora do modo demonstração`);
  }
});

test("o número da caixa é único: as caixas de teste não repetem o número de uma caixa cadastrada pela pessoa", () => {
  const s = memoria();
  s.setItem("gemape-demo-dados", JSON.stringify({ ...base, caixas_ferramentas: [{ id: "u1", codigo: "CX-0003", codigo_num: 3, empresa_id: "x", nome: "CX-0003", status: "Ativa" }] }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  const numeros = dados(s).caixas_ferramentas.map((c) => c.codigo_num);
  assert.equal(new Set(numeros).size, numeros.length, "nenhum número repetido");
  assert.ok(numeros.includes(3) && doTeste(dados(s).caixas_ferramentas).length === 5);
  assert.deepEqual(doTeste(dados(s).caixas_ferramentas).map((c) => c.codigo_num).sort(), [1, 2, 4, 5, 6]);
});

test("a base de demonstração recusa uma segunda caixa com o mesmo número", async () => {
  const { demoSupabase: supabase } = await import("../src/integrations/supabase/demo-client.ts");
  const caixa = (n) => ({ codigo: `CX-${String(n).padStart(4, "0")}`, codigo_num: n, nome: `CX-${n}`, status: "Ativa" });
  const primeira = await supabase.from("caixas_ferramentas").insert(caixa(97));
  assert.equal(primeira.error, null);
  const repetida = await supabase.from("caixas_ferramentas").insert(caixa(97));
  assert.match(repetida.error?.message ?? "", /Já existe a caixa CX-0097/);
});

test("quem ainda tem a empresa GEMAPE antiga no navegador a perde com os cadastros dela, e ficam só as três empresas do grupo", () => {
  const s = memoria();
  const antiga = { id: "empresa-demo", nome_fantasia: "GEMAPE", razao_social: "GEMAPE Demonstração", cnpj: "00.000.000/0001-00", status: "Ativa" };
  s.setItem("gemape-demo-dados", JSON.stringify({
    ...base,
    empresas: [antiga],
    empregados: [{ id: "emp-demo", empresa_id: "empresa-demo", nome: "Maria" }],
    epis: [{ id: "epi-demo", empresa_id: "empresa-demo", nome: "Capacete", codigo_sku: "EPI-0001" }],
    ferramentas: [{ id: "fer-demo", empresa_id: "empresa-demo", nome: "Furadeira", codigo_sku: "FER-0001" }, { id: "fer-minha", empresa_id: "empresa-demo", nome: "Serra", codigo_sku: "FER-0002" }],
    veiculos: [{ id: "vei-demo", empresa_id: "empresa-demo", placa: "GEM-2026" }],
    movimentacoes: [{ id: "m1", modulo: "ferramenta", item_id: "fer-demo", empresa_id: "empresa-demo" }],
    caixas_ferramentas: [{ id: "cx-antiga", codigo: "CX-0003", codigo_num: 3, empresa_id: "empresa-demo" }],
    caixa_ferramenta_itens: [{ id: "ci1", caixa_id: "cx-antiga", ferramenta_id: "fer-demo", quantidade: 1 }],
  }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  const d = dados(s);
  assert.deepEqual(d.empresas.map((e) => e.id), ["teste-empresa-1", "teste-empresa-2", "teste-empresa-3"]);
  for (const t of ["empregados", "epis", "ferramentas", "veiculos", "movimentacoes", "caixas_ferramentas", "caixa_ferramenta_itens"]) {
    assert.ok(!d[t].some((l) => ["emp-demo", "epi-demo", "fer-demo", "fer-minha", "vei-demo", "m1", "cx-antiga", "ci1"].includes(l.id)), t);
  }
  assert.ok(d.caixas_ferramentas.every((c) => String(c.id).startsWith("teste-")), "o número CX-0003 fica livre para as de teste");
  // O sistema novo já começa sem a empresa antiga.
  assert.deepEqual(base.empresas, []);
  assert.ok(!JSON.stringify(base).includes("empresa-demo"));
});

test("cada um dos cinco veículos e dos cinco equipamentos de teste vem com dados em todas as seções dos relatórios", () => {
  const s = prontos();
  const lista = (k) => json(s, k) ?? [];
  const veiculos = doTeste(dados(s).veiculos);
  assert.equal(veiculos.length, 5);
  for (const v of veiculos) {
    for (const [chave, minimo] of [["gemape-demo-abastecimentos", 4], ["gemape-demo-manutencoes-veiculo", 2], ["gemape-demo-ocorrencias-veiculo", 1], ["gemape-demo-checklists-veiculo", 1], ["gemape-demo-planos-manutencao", 1], ["gemape-demo-associacoes-checklist-veiculo", 1]]) {
      assert.ok(lista(chave).filter((r) => r.veiculoId === v.id).length >= minimo, `${v.placa}: ${chave}`);
    }
  }
  const manut = lista("gemape-demo-manutencoes-veiculo");
  assert.deepEqual([manut.filter((m) => m.tipo === "Preventiva").length, manut.filter((m) => m.tipo === "Corretiva").length], [5, 5]);
  const ocor = lista("gemape-demo-ocorrencias-veiculo");
  assert.ok(ocor.some((o) => o.status === "Aberta") && ocor.some((o) => o.status === "Em tratativa") && ocor.some((o) => o.status === "Encerrada"));
  assert.ok(lista("gemape-demo-checklists-veiculo").every((c) => c.status === "Concluído"));
  assert.ok(ocor.some((o) => o.tipoId === "checklist"), "itens NOK dos check lists geraram ocorrência");
  // Equipamentos: todos têm manutenção, ocorrência e check list.
  // Equipamentos: os dez com dados (PAT-0006, 0007, 0009, 0014, 0019, 0024, 0029, 0033, 0038 e 0039) têm manutenção, ocorrência e check list; os outros trinta ficam só cadastrados.
  const comDados = [5, 6, 8, 13, 18, 23, 28, 32, 37, 38].map((i) => `teste-equipamento-${i + 1}`);
  for (const e of doTeste(json(s, "gemape-demo-equipamentos")).filter((x) => comDados.includes(x.id))) {
    for (const chave of ["gemape-demo-eq-manutencoes", "gemape-demo-eq-ocorrencias", "gemape-demo-eq-checklists-exec"]) {
      assert.ok(lista(chave).some((r) => r.equipamentoId === e.id), `${e.patrimonio}: ${chave}`);
    }
  }
  // Limpar leva tudo isso junto.
  pedirLimpar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "limpo");
  for (const chave of ["gemape-demo-manutencoes-veiculo", "gemape-demo-ocorrencias-veiculo", "gemape-demo-checklists-veiculo", "gemape-demo-planos-manutencao", "gemape-demo-associacoes-checklist-veiculo", "gemape-demo-abastecimentos"]) {
    assert.equal(lista(chave).filter((r) => String(r.veiculoId).startsWith("teste-")).length, 0, chave);
  }
});

test("cada veículo e cada equipamento vem com cinco check lists periódicos e cinco avulsos preenchidos para consulta (equipamento: cinco de manutenção e cinco de vistoria)", () => {
  const s = prontos();
  const veiculos = json(s, "gemape-demo-checklists-veiculo").filter((c) => String(c.veiculoId).startsWith("teste-"));
  assert.equal(veiculos.length, 50);
  for (const v of new Set(veiculos.map((c) => c.veiculoId))) {
    const dele = veiculos.filter((c) => c.veiculoId === v);
    assert.deepEqual([dele.filter((c) => c.periodicidade).length, dele.filter((c) => !c.periodicidade).length], [5, 5], v);
  }
  assert.equal(new Set(veiculos.map((c) => c.veiculoId)).size, 5, "os cinco veículos");
  assert.ok(veiculos.every((c) => c.status === "Concluído" && c.itens.every((i) => i.avaliacao !== null)), "todos preenchidos e concluídos");
  assert.ok(veiculos.some((c) => c.itens.some((i) => i.avaliacao === "NOK")) && veiculos.some((c) => c.itens.every((i) => i.avaliacao === "OK")), "com e sem itens NOK");
  assert.equal(new Set(veiculos.map((c) => c.codigo)).size, veiculos.length, "códigos únicos");
  const equipamentos = json(s, "gemape-demo-eq-checklists-exec").filter((c) => String(c.equipamentoId).startsWith("teste-"));
  assert.equal(equipamentos.length, 150);
  assert.equal(new Set(equipamentos.map((c) => c.equipamentoId)).size, 10, "os dez equipamentos com dados");
  for (const e of new Set(equipamentos.map((c) => c.equipamentoId))) {
    const dele = equipamentos.filter((c) => c.equipamentoId === e);
    const contar = (finalidade) => dele.filter((c) => c.periodicidade && c.finalidade === finalidade).length;
    assert.deepEqual([contar("manutencao"), contar("vistoria"), dele.filter((c) => !c.periodicidade).length], [5, 5, 5], e);
  }
  assert.ok(equipamentos.every((c) => c.status === "Concluído" && c.itens.every((i) => i.avaliacao !== null)));
  assert.equal(new Set(equipamentos.map((c) => c.codigo)).size, equipamentos.length, "códigos únicos");
});

test("em Parâmetros > Check list só ficam os grupos com uso: associados ou presentes em check lists preenchidos", () => {
  const s = prontos();
  const gerais = json(s, "gemape-demo-parametros-base");
  const assocV = json(s, "gemape-demo-associacoes-checklist-veiculo") ?? [];
  const execV = json(s, "gemape-demo-checklists-veiculo") ?? [];
  const usadosV = new Set([...assocV.flatMap((a) => a.itens.map((i) => i.grupoId)), ...execV.flatMap((c) => c.itens.map((i) => i.id.split(":")[0]))]);
  assert.ok(gerais.itensChecklistVeiculo.length > 0 && gerais.itensChecklistVeiculo.every((g) => usadosV.has(g.id)), "veículos: nenhum grupo sem uso");
  const eq = json(s, "gemape-demo-equipamentos-checklist");
  const execE = json(s, "gemape-demo-eq-checklists-exec") ?? [];
  for (const f of ["manutencao", "vistoria"]) {
    const usados = new Set([...eq[f].associacoes.flatMap((a) => a.itens.map((i) => i.grupoId)), ...execE.filter((c) => c.finalidade === f).flatMap((c) => c.itens.map((i) => i.id.split(":")[0]))]);
    assert.ok(eq[f].grupos.length > 0 && eq[f].grupos.every((g) => usados.has(g.id)), `equipamentos (${f}): nenhum grupo sem uso`);
  }
  // Aplicar de novo (nova versão) refaz o padrão antes e enxuga depois: continua sem grupo sem uso e com os cinco de cada tipo.
  s.setItem("gemape-demo-dados-teste", JSON.stringify({ ...JSON.parse(s.getItem("gemape-demo-dados-teste")), versao: VERSAO_DADOS_TESTE - 1 }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  assert.equal(json(s, "gemape-demo-checklists-veiculo").filter((c) => String(c.veiculoId).startsWith("teste-")).length, 50);
  assert.equal(json(s, "gemape-demo-eq-checklists-exec").filter((c) => String(c.equipamentoId).startsWith("teste-")).length, 150);
});

test("equipamento sem itens de check list associados (ex.: PAT-9001 Hidrante) sai com os registros dele; os de teste ficam", () => {
  const s = memoria();
  s.setItem("gemape-demo-equipamentos", JSON.stringify([{ id: "pat-9001", patrimonio: "PAT-9001", nome: "Hidrante", tipoId: "tipo-extintores", empresaId: "teste-empresa-1", status: "Ativo", tecnico: {} }]));
  s.setItem("gemape-demo-eq-ocorrencias", JSON.stringify([{ id: "o-9001", equipamentoId: "pat-9001", tipoId: "t", tipoNome: "Falha", data: "2026-10-01", descricao: "Do hidrante", status: "Aberta" }]));
  s.setItem("gemape-demo-equipamentos-manutencao", JSON.stringify({ acoes: [], tiposOcorrencia: [], planos: [{ equipamentoId: "pat-9001", itens: [], atualizadoEm: "2026-10-01T00:00:00Z" }] }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  const equipamentos = json(s, "gemape-demo-equipamentos");
  assert.ok(!equipamentos.some((e) => e.patrimonio === "PAT-9001"), "o hidrante sem associação saiu");
  assert.equal(equipamentos.filter((e) => String(e.id).startsWith("teste-")).length, 40, "os quarenta de teste ficam");
  assert.ok(!json(s, "gemape-demo-eq-ocorrencias").some((o) => o.equipamentoId === "pat-9001"), "a ocorrência dele saiu");
  assert.ok(!json(s, "gemape-demo-equipamentos-manutencao").planos.some((p) => p.equipamentoId === "pat-9001"), "o plano dele saiu");
  // Todo equipamento que sobra tem associação nas duas finalidades.
  const eq = json(s, "gemape-demo-equipamentos-checklist");
  for (const i of [5, 6, 8, 13, 18, 23, 28, 32, 37, 38]) for (const f of ["manutencao", "vistoria"]) assert.ok(eq[f].associacoes.some((a) => a.equipamentoId === `teste-equipamento-${i + 1}`), `PAT-${String(i + 1).padStart(4, "0")}: ${f}`);
});

test("os check lists de teste entram nos indicadores do painel do mês: previstos, realizados no prazo, não realizados e a vencer", async () => {
  const { sincronizarPrevisoes, lerPrevisoes, painelDoMes } = await import("../src/lib/checklist-painel.ts");
  const s = prontos();
  const hoje = "2026-10-22";
  const associacoes = json(s, "gemape-demo-associacoes-checklist-veiculo").filter((a) => String(a.veiculoId).startsWith("teste-"));
  assert.equal(associacoes.length, 5);
  assert.ok(associacoes.every((a) => a.atualizadoEm.slice(0, 10) < "2026-09-01"), "a associação vale desde antes dos check lists: as previsões cobrem o período");
  const veiculos = associacoes.map((a) => ({ veiculoId: a.veiculoId, veiculoRotulo: a.veiculoId, periodicidade: a.itens[0].periodicidade, responsavelNome: a.responsavel?.nome ?? "", obrigatorio: true, desde: a.atualizadoEm.slice(0, 10) }));
  sincronizarPrevisoes({ veiculos, hoje }, s);
  const checklists = json(s, "gemape-demo-checklists-veiculo");
  const resumo = painelDoMes("2026-10", lerPrevisoes(s), checklists, hoje).resumo;
  assert.ok(resumo.previstos >= 10 && resumo.realizados > 0 && resumo.naoRealizados > 0 && resumo.aVencer > 0, JSON.stringify(resumo));
  assert.equal(resumo.pctNoPrazo + resumo.pctNaoNoPrazo, 100);
  // Os meses anteriores também têm resultado.
  const setembro = painelDoMes("2026-09", lerPrevisoes(s), checklists, hoje).resumo;
  assert.ok(setembro.realizados > 0, "setembro tem check lists feitos no prazo");
});

test("o painel de todos os períodos controla todos os check lists periódicos de teste (25 por tipo de check list), sem depender do mês", async () => {
  const { sincronizarPrevisoes, lerPrevisoes, painelDoMes } = await import("../src/lib/checklist-painel.ts");
  const s = prontos();
  const hoje = "2026-10-22";
  const associacoes = json(s, "gemape-demo-associacoes-checklist-veiculo").filter((a) => String(a.veiculoId).startsWith("teste-"));
  sincronizarPrevisoes({ veiculos: associacoes.map((a) => ({ veiculoId: a.veiculoId, veiculoRotulo: a.veiculoId, periodicidade: a.itens[0].periodicidade, responsavelNome: "", obrigatorio: true, desde: a.atualizadoEm.slice(0, 10) })), hoje }, s);
  const periodicos = json(s, "gemape-demo-checklists-veiculo").filter((c) => String(c.veiculoId).startsWith("teste-") && c.periodicidade);
  assert.equal(periodicos.length, 25);
  const todos = painelDoMes(null, lerPrevisoes(s), periodicos, hoje);
  // Cada um dos 25 check lists periódicos concluídos está numa previsão e conta como realizado no prazo.
  assert.equal(todos.resumo.realizados, 25);
  assert.equal(new Set(todos.linhas.filter((l) => l.situacao === "realizado").map((l) => l.checklistId)).size, 25);
  assert.ok(todos.resumo.previstos > 25 && todos.resumo.naoRealizados > 0 && todos.resumo.aVencer > 0, "além dos feitos há períodos perdidos e em aberto");
  // O mês de outubro sozinho tem menos que o total: a soma dos meses fecha com todos os períodos.
  const meses = [...new Set(lerPrevisoes(s).map((p) => p.fim.slice(0, 7)))];
  assert.equal(meses.reduce((t, m) => t + painelDoMes(m, lerPrevisoes(s), periodicos, hoje).resumo.previstos, 0), todos.resumo.previstos);
  assert.ok(painelDoMes("2026-10", lerPrevisoes(s), periodicos, hoje).resumo.realizados < 25);
});

test("a lista de check lists mostra um mês de cada vez (o de hoje por padrão), e o que está em andamento aparece sempre", async () => {
  const { noMesDaLista } = await import("../src/lib/checklist-painel.ts");
  const feito = (data) => ({ status: "Concluído", data });
  assert.ok(noMesDaLista(feito("2026-10-05"), "2026-10") && !noMesDaLista(feito("2026-09-28"), "2026-10"));
  assert.ok(noMesDaLista(feito("2026-09-28"), null), "todos os meses");
  assert.ok(noMesDaLista({ status: "Em andamento", data: "2026-07-01" }, "2026-10"), "em andamento nunca fica escondido");
  const s = prontos();
  const periodicos = json(s, "gemape-demo-checklists-veiculo").filter((c) => String(c.veiculoId).startsWith("teste-") && c.periodicidade);
  const doMes = periodicos.filter((c) => noMesDaLista(c, "2026-10"));
  assert.ok(doMes.length > 0 && doMes.length < periodicos.length, `outubro tem ${doMes.length} dos ${periodicos.length}`);
  const equip = ler("components/modules/equipamento/ChecklistEquipamentoModulo.tsx");
  assert.match(equip, /mesEscolhidoLista \?\? hoje\.slice\(0, 7\)/, "equipamentos: sem escolha acompanha o mês de hoje");
  assert.match(equip, /avulsosDoMes/);
  assert.match(equip, /Periódicos \(\{naListaDoMes\.length\}\)/);
  assert.match(equip, /id="mes_lista"/);
  // Veículos (decisão 298): as listas do periódico e do avulso começam no mês de hoje, e o em andamento aparece sempre.
  const listasVeiculo = ler("components/modules/ChecklistListasVeiculo.tsx");
  assert.match(listasVeiculo, /const mes = escolhido \?\? mesDe\(hoje\);/);
  assert.match(listasVeiculo, /noMesDaLista\(c, mes === TODOS_OS_MESES \? null : mes\)/);
  assert.match(listasVeiculo, /id="lista_mes"/);
});

test("o painel de equipamentos, em manutenção e em vistoria, usa a mesma lógica do de veículos e controla todos os 25 check lists periódicos de cada finalidade", async () => {
  const { sincronizarPrevisoes, lerPrevisoes, painelDoMes } = await import("../src/lib/checklist-painel.ts");
  const s = prontos();
  const hoje = "2026-10-22";
  const eq = json(s, "gemape-demo-equipamentos-checklist");
  const execs = json(s, "gemape-demo-eq-checklists-exec").filter((c) => String(c.equipamentoId).startsWith("teste-"));
  for (const finalidade of ["manutencao", "vistoria"]) {
    const chave = `gemape-demo-eq-previsoes-${finalidade}`;
    const associacoes = eq[finalidade].associacoes.filter((a) => String(a.equipamentoId).startsWith("teste-"));
    assert.equal(associacoes.length, 10, finalidade);
    assert.ok(associacoes.every((a) => a.atualizadoEm.slice(0, 10) < "2026-09-01"), `${finalidade}: a associação vale desde antes dos check lists`);
    sincronizarPrevisoes({ veiculos: associacoes.map((a) => ({ veiculoId: a.equipamentoId, veiculoRotulo: a.equipamentoId, periodicidade: a.itens[0].periodicidade, responsavelNome: "", obrigatorio: true, desde: a.atualizadoEm.slice(0, 10) })), hoje }, s, { chave });
    const periodicos = execs.filter((c) => c.finalidade === finalidade && c.periodicidade).map((c) => ({ ...c, veiculoId: c.equipamentoId }));
    assert.equal(periodicos.length, 50, finalidade);
    const todos = painelDoMes(null, lerPrevisoes(s, chave), periodicos, hoje);
    assert.equal(todos.resumo.realizados, 50, `${finalidade}: os 50 periódicos contam como realizados no prazo`);
    assert.ok(todos.resumo.previstos > 50 && todos.resumo.naoRealizados > 0 && todos.resumo.aVencer > 0, `${finalidade}: ${JSON.stringify(todos.resumo)}`);
    assert.equal(todos.resumo.pctNoPrazo + todos.resumo.pctNaoNoPrazo, 100);
    assert.ok(painelDoMes("2026-10", lerPrevisoes(s, chave), periodicos, hoje).resumo.realizados < 50);
  }
  // Os dois painéis (veículos e equipamentos) são o mesmo componente.
  assert.match(ler("components/modules/equipamento/ChecklistEquipamentoModulo.tsx"), /<ChecklistPainelMensal/);
  // Veículos (decisão 298) tem o painel de resultados no modelo de Viagens, com a mesma conta (painelDoMes).
  assert.match(ler("components/modules/ChecklistVeiculoModulo.tsx"), /<ChecklistResultadosPainel/);
  assert.match(ler("components/modules/ChecklistResultadosPainel.tsx"), /painelDoMes\(/);
});

test("as 20 ferramentas de teste ficam distribuídas nas cinco caixas, quatro em cada, e cada ferramenta está em uma caixa só", () => {
  const s = prontos();
  const d = dados(s);
  const itens = doTeste(d.caixa_ferramenta_itens);
  assert.equal(itens.length, 20);
  const caixas = new Map(d.caixas_ferramentas.map((c) => [c.id, c]));
  const ferramentas = new Map(d.ferramentas.map((f) => [f.id, f]));
  assert.equal(new Set(itens.map((i) => i.ferramenta_id)).size, 20, "nenhuma ferramenta em duas caixas");
  for (const c of doTeste(d.caixas_ferramentas)) assert.equal(itens.filter((i) => i.caixa_id === c.id).length, 4, c.codigo);
  for (const i of itens) assert.equal(ferramentas.get(i.ferramenta_id)?.empresa_id, caixas.get(i.caixa_id)?.empresa_id, "a ferramenta é da empresa da caixa");
  assert.equal(new Set(doTeste(d.ferramentas).map((f) => f.codigo_sku)).size, 20, "códigos únicos");
  assert.equal(doTeste(d.movimentacoes).filter((m) => m.modulo === "ferramenta").length, 20, "uma entrada por ferramenta");
});

test("a base recusa gravar uma caixa com ferramenta que já está em outra caixa", async () => {
  const { demoSupabase } = await import("../src/integrations/supabase/demo-client.ts");
  const caixa = (n) => ({ codigo: `CX-${String(n).padStart(4, "0")}`, codigo_num: n, nome: `CX-${n}`, status: "Ativa" });
  const itens = [{ ferramenta_id: "fer-unica-1", quantidade: 1, observacao: "" }];
  const primeira = await demoSupabase.rpc("salvar_caixa", { p_id: null, p_valores: caixa(91), p_itens: itens });
  assert.equal(primeira.error, null);
  const segunda = await demoSupabase.rpc("salvar_caixa", { p_id: null, p_valores: caixa(92), p_itens: itens });
  assert.match(segunda.error?.message ?? "", /já está na caixa CX-0091/);
  // Regravar a mesma caixa com a mesma ferramenta é normal.
  const igual = await demoSupabase.rpc("salvar_caixa", { p_id: primeira.data, p_valores: caixa(91), p_itens: itens });
  assert.equal(igual.error, null);
});

test("limpar e reaplicar os dados de teste não deixa ferramenta repetida em caixa por causa de transferências antigas", () => {
  const s = prontos();
  const d = dados(s);
  // Registro antigo: uma transferência deixou a ferramenta 2 também na caixa 1 (id aleatório, ligado à caixa de teste).
  d.caixa_ferramenta_itens.push({ id: "item-solto", caixa_id: "teste-caixa-1", ferramenta_id: "teste-ferramenta-2", quantidade: 1, observacao: "" });
  s.setItem("gemape-demo-dados", JSON.stringify(d));
  s.setItem("gemape-demo-dados-teste", JSON.stringify({ ...JSON.parse(s.getItem("gemape-demo-dados-teste")), versao: VERSAO_DADOS_TESTE - 1 }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  const itens = dados(s).caixa_ferramenta_itens;
  assert.ok(!itens.some((i) => i.id === "item-solto"));
  const por = new Map();
  for (const i of itens) por.set(i.ferramenta_id, (por.get(i.ferramenta_id) ?? 0) + 1);
  assert.ok([...por.values()].every((n) => n === 1), "cada ferramenta em uma caixa só");
});

test("os 15 empregados de teste (5 em cada empresa) têm histórico de movimentações de EPI e de uniforme: entregas, devoluções e baixas, sem estoque negativo", () => {
  const s = prontos();
  const d = dados(s);
  const empregados = doTeste(d.empregados);
  assert.equal(empregados.length, 15);
  const movs = doTeste(d.movimentacoes);
  for (const modulo of ["epi", "uniforme"]) {
    const doModulo = movs.filter((m) => m.modulo === modulo && m.empregado_id);
    for (const e of empregados) {
      const dele = doModulo.filter((m) => m.empregado_id === e.id);
      assert.ok(dele.some((m) => m.tipo_movimentacao === "Saida" && !m.motivo_baixa), `${e.nome}: entrega de ${modulo}`);
      assert.ok(dele.every((m) => m.empresa_id === e.empresa_id), `${e.nome}: movimentação da própria empresa`);
    }
    assert.ok(doModulo.some((m) => m.tipo_movimentacao === "Devolucao") && doModulo.some((m) => m.tipo_movimentacao === "Saida" && m.motivo_baixa), `${modulo}: há devoluções e baixas`);
    assert.ok(doModulo.some((m) => m.codigo_movimentacao?.startsWith("ENT-")) && doModulo.some((m) => m.codigo_movimentacao?.startsWith("DEV-")));
    // Dias diferentes entre os empregados, e nenhuma data futura.
    assert.ok(new Set(doModulo.map((m) => m.data_movimentacao)).size >= 15 && doModulo.every((m) => m.data_movimentacao <= AGORA.toISOString().slice(0, 10)));
  }
  // O estoque de cada item nunca fica negativo depois de todas as movimentações.
  for (const tabela of ["epis", "uniformes"]) {
    for (const linha of doTeste(d[tabela])) assert.ok(linha.estoque_atual >= 0, `${tabela} ${linha.codigo_sku}: ${linha.estoque_atual}`);
  }
});

test("aplicar de novo com marcas e ações já cadastradas em Gerais (de uma aplicação interrompida) não trava: o que já existe fica e não é apagado no Limpar", () => {
  const s = memoria();
  const Gerais = P_GERAIS;
  Gerais.adicionarListaFerramenta("marcasFerramenta", "Ferrotec", s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  assert.equal(doTeste(dados(s).ferramentas).length, 20, "o conjunto foi aplicado mesmo assim");
  pedirLimpar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "limpo");
  assert.ok(json(s, "gemape-demo-parametros-base").marcasFerramenta.some((m) => m.nome === "Ferrotec"), "a marca que já existia continua");
});

test("código de fábrica que já existe (de uma aplicação interrompida) não trava a aplicação dos dados de teste", () => {
  const s = memoria();
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  const antes = json(s, "gemape-demo-parametros-base");
  // Estado de quem teve a aplicação interrompida: os códigos de fábrica ficaram gravados, mas o controle de versão voltou atrás.
  s.setItem("gemape-demo-dados-teste", JSON.stringify({ ...JSON.parse(s.getItem("gemape-demo-dados-teste")), versao: VERSAO_DADOS_TESTE - 1, gerais: {} }));
  assert.ok(antes.codigosFabrica.length > 0);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  assert.equal(doTeste(dados(s).equipamentos ?? []).length, 0);
  assert.equal(doTeste(json(s, "gemape-demo-equipamentos")).length, 40);
});
