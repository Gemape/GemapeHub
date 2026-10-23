import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { aplicarDadosDeTeste, CHAVE_CONTROLE, lerControle, pedirLimpar, pedirRestaurar, prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import { VERSAO_DADOS_TESTE } from "../src/lib/dados-teste/conjunto.ts";
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
const LISTAS = ["gemape-demo-fornecedores", "gemape-demo-clientes", "gemape-demo-equipamentos", "gemape-demo-abastecimentos", "gemape-demo-portadores-caixa", "gemape-demo-respostas-despesas"];

test("cinco registros em cada cadastro (cinco empregados por empresa), com os que o sistema já trazia mantidos", () => {
  const s = prontos();
  const d = dados(s);
  for (const t of ["ferramentas", "veiculos", "caixas_ferramentas"]) assert.equal(doTeste(d[t]).length, 5, t);
  assert.equal(doTeste(d.empresas).length, 3, "as três empresas do grupo");
  assert.equal(d.empresas.length, 4, "a empresa que já existia fica");
  assert.equal(doTeste(d.empregados).length, 15);
  for (const e of doTeste(d.empresas)) assert.equal(doTeste(d.empregados).filter((x) => x.empresa_id === e.id).length, 5, `cinco empregados em ${e.nome_fantasia}`);
  assert.equal(d.empregados.length, 16);
  for (const k of LISTAS) assert.equal(doTeste(json(s, k)).length, 5, k);
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
  assert.ok(limpo.empresas.some((e) => e.id === "empresa-do-usuario") && limpo.empresas.some((e) => e.id === "empresa-demo"));
  assert.ok(!limpo.movimentacoes.some((m) => m.id === "mov-usuario"), "o que apontava para item de teste vai junto");
  for (const k of LISTAS) assert.equal(doTeste(json(s, k)).length, 0, k);
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
