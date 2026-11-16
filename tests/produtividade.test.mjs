import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { combinaBuscaTolerante, distancia, pontuaBusca } from "../src/lib/busca-tolerante.ts";
import { lerColagem, lerNumero, linhasDaColagem, somarPorItem } from "../src/lib/colar-planilha.ts";
import { pendenciasDeHoje, totalPendencias } from "../src/lib/atencao-hoje.ts";
import { situacaoDoCa, ultimasMovimentacoes } from "../src/lib/peek.ts";
import { destinoDoSolto, registrarReceptor, receptorPara, ehPdf } from "../src/lib/arquivos-soltos.ts";

const fonte = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// ---------- busca tolerante ----------
test("busca tolerante acha sem acento, incompleta e com erro de digitação", () => {
  const nome = "Bota de Segurança com Biqueira de Aço";
  assert.ok(combinaBuscaTolerante("bota biqueira aco", nome));
  assert.ok(combinaBuscaTolerante("bota biquera aço", nome), "letra faltando");
  assert.ok(combinaBuscaTolerante("segurnça", nome), "letras trocadas");
  assert.ok(combinaBuscaTolerante("biq", nome), "trecho do começo");
  assert.ok(combinaBuscaTolerante("12345", "Luva CA 12345"), "número do CA");
  assert.equal(combinaBuscaTolerante("12345", "Luva CA 12346"), false, "número não tem tolerância");
  assert.equal(combinaBuscaTolerante("FER-001", "FER-002 Martelo"), false, "código não tem tolerância");
});

test("busca tolerante não aceita o que não tem nada a ver", () => {
  assert.equal(combinaBuscaTolerante("capacete", "Bota de Segurança"), false);
  assert.equal(combinaBuscaTolerante("bota luva", "Bota de Segurança"), false, "todas as palavras precisam achar par");
  assert.equal(combinaBuscaTolerante("abc", "xyz"), false, "palavra curta não tolera erro");
  assert.equal(combinaBuscaTolerante("", "qualquer"), true, "busca vazia mostra tudo");
});

test("a pontuação põe o casamento exato na frente do aproximado", () => {
  assert.ok(pontuaBusca("biqueira", "Biqueira de aço") > pontuaBusca("biqueria", "Biqueira de aço"));
  assert.equal(pontuaBusca("zzzz", "Biqueira"), 0);
  assert.equal(distancia("aco", "aço", 2) <= 1, true);
});

// ---------- colar da planilha ----------
test("lê o que o Excel copia: TAB, quebra de linha do Windows e célula entre aspas", () => {
  assert.deepEqual(lerColagem("A1\t10\r\nA2\t5\r\n"), [["A1", "10"], ["A2", "5"]]);
  assert.deepEqual(lerColagem('"Furadeira\n2 velocidades"\t3'), [["Furadeira\n2 velocidades", "3"]]);
  assert.deepEqual(lerColagem("FER-1;4\nFER-2;6"), [["FER-1", "4"], ["FER-2", "6"]], "CSV brasileiro");
  assert.deepEqual(lerColagem("   \n"), []);
});

test("números do Excel brasileiro e americano", () => {
  assert.equal(lerNumero("1.234,5"), 1234.5);
  assert.equal(lerNumero("10"), 10);
  assert.equal(lerNumero("2,5"), 2.5);
  assert.equal(lerNumero("abc"), null);
  assert.equal(lerNumero(""), null);
});

const itens = [
  { id: "1", codigo_sku: "FER-001", nome: "Furadeira de impacto" },
  { id: "2", codigo_sku: "FER-002", nome: "Martelo de borracha" },
  { id: "3", codigo_sku: "FER-003", nome: "Martelo de unha" },
];

test("cada linha colada é conferida contra o cadastro", () => {
  const l = linhasDaColagem("Código\tQtde\nFER-001\t10\nfer-002\t4\nFER-999\t1\nFER-001\t0\nFER-003", itens);
  assert.equal(l.length, 5, "o cabeçalho sai");
  assert.equal(l[0].item.id, "1");
  assert.equal(l[0].quantidade, 10);
  assert.equal(l[1].item.id, "2", "código sem diferenciar maiúscula");
  assert.match(l[2].erro, /não encontrado/);
  assert.match(l[3].erro, /maior que zero/);
  assert.match(l[4].erro, /quantidade/i);
});

test("entrada de estoque não adivinha: nome igual vale; parecido só vira sugestão", () => {
  const l = linhasDaColagem("Furadeira de impacto\t2\nfuradera\t1\nFER-099\t1\nmartelo\t1", itens);
  assert.equal(l[0].item.id, "1", "nome inteiro igual, sem diferenciar acento ou maiúscula");
  assert.equal(l[1].item, null, "com erro de digitação não lança");
  assert.match(l[1].erro, /Você quis dizer FER-001 \(Furadeira de impacto\)/);
  assert.equal(l[2].item, null, "FER-099 não existe e não é trocado por outro item");
  assert.match(l[3].erro, /FER-002.*ou FER-003/);
});

test("linha de dado com quantidade em branco ou por extenso não vira cabeçalho", () => {
  const a = linhasDaColagem("FER-001\t\nFER-002\t3", itens);
  assert.equal(a.length, 2);
  assert.match(a[0].erro, /quantidade/i);
  const b = linhasDaColagem("FER-001\tdez\nFER-002\t3", itens);
  assert.equal(b.length, 2);
  assert.match(b[0].erro, /quantidade/i);
  assert.equal(linhasDaColagem("Código\tQtde\nFER-002\t3", itens).length, 1, "cabeçalho de verdade sai");
  assert.equal(linhasDaColagem("FER-001\t5", itens).length, 1, "uma linha só nunca é cabeçalho");
});

test("milhar brasileiro sem vírgula: 1.200 é mil e duzentos", () => {
  assert.equal(lerNumero("1.200"), 1200);
  assert.equal(lerNumero("12.500"), 12500);
  assert.equal(lerNumero("1.234.567"), 1234567);
  assert.equal(lerNumero("1.5"), 1.5);
});

test("quantidade antes do código também funciona e fração é recusada", () => {
  const l = linhasDaColagem("5\tFER-001\nFER-002\t1,5", itens);
  assert.equal(l[0].item.id, "1");
  assert.equal(l[0].quantidade, 5);
  assert.match(l[1].erro, /inteiro/);
});

test("linhas do mesmo item são somadas e linha com erro não entra", () => {
  const l = linhasDaColagem("FER-001\t3\nFER-001\t2\nFER-002\t1\nXX\t9", itens);
  const s = somarPorItem(l);
  assert.deepEqual(s.map((x) => [x.item.id, x.quantidade]), [["1", 5], ["2", 1]]);
});

// ---------- atenção hoje ----------
const base = {
  hoje: "2026-11-13",
  empregados: [
    { id: "e1", nome: "Maria", empresa_id: "emp", ativo: true },
    { id: "e2", nome: "João", empresa_id: "emp", ativo: false, data_demissao: "2026-10-01" },
  ],
  epis: [
    { id: "a", nome: "Luva", ca_validade: "2026-10-01", estoque_atual: 2, estoque_minimo: 5 },
    { id: "b", nome: "Capacete", ca_validade: "2026-12-01", estoque_atual: 50, estoque_minimo: 5 },
    { id: "c", nome: "Óculos", ca_validade: "2027-12-01", estoque_atual: 5, estoque_minimo: 5 },
  ],
  uniformes: [{ id: "u", nome: "Camisa", estoque_atual: 0, estoque_minimo: 3 }],
  ferramentas: [{ id: "f", nome: "Furadeira" }],
  movsEpi: [
    { item_id: "a", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-05-01" },
    { item_id: "b", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-05-01" },
  ],
  movsFerramenta: [
    { item_id: "f", empregado_id: "e2", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-06-01" },
    { item_id: "f", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-06-01" },
    { item_id: "f", empregado_id: "e1", tipo_movimentacao: "Devolucao", quantidade: 1, data_movimentacao: "2026-06-02" },
  ],
};

test("atenção hoje: vencidos, devolução atrasada, estoque no mínimo e EPI com desligado, nesta ordem de prioridade", () => {
  const g = pendenciasDeHoje(base);
  assert.deepEqual(g.map((x) => x.prioridade), ["alta", "alta", "alta", "media", "media", "media", "media", "media"]);
  const porId = Object.fromEntries(g.map((x) => [x.id, x]));
  assert.equal(porId["epi-vencido"].itens.length, 1);
  assert.match(porId["epi-vencido"].itens[0].detalhe, /Luva/);
  assert.equal(porId["epi-vencido"].itens[0].acao.search.empregado, "e1");
  assert.equal(porId["devolucao-atrasada"].itens.length, 1, "só quem foi desligado e não devolveu");
  assert.match(porId["devolucao-atrasada"].itens[0].detalhe, /Furadeira/);
  assert.equal(porId["minimo-epi"].itens.length, 2, "Luva (2≤5) e Óculos (5≤5)");
  assert.equal(porId["minimo-uniforme"].itens.length, 1, "Camisa (0≤3)");
  assert.equal(porId["minimo-ferramenta"].itens.length, 0);
  assert.equal(porId["equipamentos"].itens.length, 0);
  assert.equal(porId["viagens"].itens.length, 0);
  assert.equal(porId["epi-com-desligado"].itens.length, 0, "e2 está desligado mas nunca recebeu EPI");
  assert.equal(totalPendencias(g), 1 + 1 + 3);
});

test("atenção hoje: usa o saldo e o mínimo da tela de Estoque (tamanhos) e ignora item inativo", () => {
  const g = pendenciasDeHoje({
    ...base,
    epis: [{ id: "a", nome: "Bota", ca_validade: "2027-12-01", estoque_atual: 0, estoque_minimo: 0 }, { id: "x", nome: "Inativa", status: "Inativo", ca_validade: "2026-11-20", estoque_atual: 0, estoque_minimo: 5 }],
    uniformes: [],
    estado: (_m, item) => (item.id === "a" ? { saldo: 12, minimo: 10, alerta: true } : { saldo: 0, minimo: 5, alerta: true }),
  });
  const minimo = g.find((x) => x.id === "minimo-epi");
  assert.equal(minimo.itens.length, 1);
  assert.match(minimo.itens[0].detalhe, /saldo 12 para mínimo 10/);
});

test("atenção hoje: EPI ainda com empregado desligado entra; devolvido ou de empregado ativo não", () => {
  const g = pendenciasDeHoje({
    ...base,
    movsEpi: [
      ...base.movsEpi,
      { item_id: "a", empregado_id: "e2", tipo_movimentacao: "Saida", quantidade: 2, data_movimentacao: "2026-05-01" },
      { item_id: "b", empregado_id: "e2", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-05-01" },
      { item_id: "b", empregado_id: "e2", tipo_movimentacao: "Devolucao", quantidade: 1, data_movimentacao: "2026-10-02" },
    ],
  });
  const item = g.find((x) => x.id === "epi-com-desligado").itens;
  assert.equal(item.length, 1);
  assert.equal(item[0].texto, "João");
  assert.match(item[0].detalhe, /Luva \(2\)/);
  assert.doesNotMatch(item[0].detalhe, /Capacete/);
  assert.equal(item[0].acao.search.empregado, "e2");
});

test("atenção hoje: sem mínimo cadastrado não alerta e empregado desligado não entra nos vencidos", () => {
  const g = pendenciasDeHoje({ ...base, epis: [{ id: "a", nome: "Luva", ca_validade: "2026-10-01", estoque_atual: 0, estoque_minimo: 0 }], uniformes: [],
    empregados: [{ id: "e1", nome: "Maria", ativo: true, data_demissao: "2026-11-01" }] });
  assert.equal(g.find((x) => x.id === "minimo-epi").itens.length, 0);
  assert.equal(g.find((x) => x.id === "epi-vencido").itens.length, 0);
});

test("atenção hoje: ferramenta abaixo do mínimo, equipamento com manutenção atrasada ou ocorrência aberta e viagens sem relatório no prazo", () => {
  const g = pendenciasDeHoje({
    ...base,
    ferramentas: [{ id: "f", nome: "Furadeira", estoque_atual: 1, estoque_minimo: 2 }, { id: "g", nome: "Martelo", estoque_atual: 9, estoque_minimo: 2 }],
    equipamentos: {
      nomes: new Map([["q1", "Empilhadeira 1"], ["q2", "Compressor 2"]]),
      ordens: [
        { id: "o1", equipamentoId: "q1", tipo: "Preventiva", status: "Pendente", dataPrevista: "2026-11-10", responsavel: "Ana" },
        { id: "o2", equipamentoId: "q2", tipo: "Corretiva", status: "Em andamento", dataPrevista: "2026-12-30" },
        { id: "o3", equipamentoId: "q2", tipo: "Corretiva", status: "Concluída", dataPrevista: "2026-01-01" },
      ],
      ocorrencias: [
        { id: "c1", equipamentoId: "q2", tipoNome: "Falha mecânica", status: "Aberta", data: "2026-11-12", codigo: "OCO-0001" },
        { id: "c2", equipamentoId: "q1", tipoNome: "Falha elétrica", status: "Resolvida", data: "2026-11-01" },
      ],
    },
    viagens: {
      prazoDias: 3,
      despesasEmAberto: [
        { id: "d1", tecnico: "Bruno", registradaEm: "2026-11-01" },
        { id: "d2", tecnico: "Bruno", registradaEm: "2026-11-05" },
        { id: "d3", tecnico: "Carla", registradaEm: "2026-11-14" },
        { id: "d4", tecnico: "Dora", registradaEm: "2026-11-13" },
      ],
    },
  });
  const porId = Object.fromEntries(g.map((x) => [x.id, x]));
  assert.equal(porId["minimo-ferramenta"].itens.length, 1);
  assert.equal(porId["equipamentos"].itens.length, 2, "só a ordem aberta e atrasada e a ocorrência não encerrada");
  assert.match(porId["equipamentos"].itens[0].detalhe, /Manutenção preventiva atrasada \d+ dia\(s\)/);
  assert.match(porId["equipamentos"].itens[1].detalhe, /OCO-0001 aberta: Falha mecânica/);
  assert.equal(porId["viagens"].itens.length, 1, "só Bruno passou do prazo; Carla e Dora estão dentro dele");
  assert.match(porId["viagens"].itens[0].detalhe, /2 despesa\(s\) sem relatório/);
  assert.equal(porId["viagens"].itens[0].acao.url, "/viagens");
});

// ---------- peek ----------
test("últimas movimentações vêm das mais novas para as mais antigas", () => {
  const r = ultimasMovimentacoes([
    { tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-01-01", item_id: "a" },
    { tipo_movimentacao: "Devolucao", quantidade: 2, data_movimentacao: "2026-03-01", item_id: "a" },
    { tipo_movimentacao: "Entrada", quantidade: 9, data_movimentacao: "2026-02-01", item_id: "zz" },
  ], (id) => (id === "a" ? "Luva" : "Item removido"), 2);
  assert.equal(r.length, 2);
  assert.equal(r[0].texto, "Devolução · Luva");
  assert.equal(r[1].texto, "Entrada · Item removido");
});

test("situação do CA: vencido, vencendo, válido e sem data", () => {
  assert.equal(situacaoDoCa("2026-10-01", "2026-11-13").vencido, true);
  const v = situacaoDoCa("2026-11-20", "2026-11-13");
  assert.equal(v.avisar, true);
  assert.match(v.texto, /7 dias/);
  assert.equal(situacaoDoCa("2027-01-01", "2026-11-13").avisar, false);
  assert.equal(situacaoDoCa(null, "2026-11-13").avisar, false);
});

// ---------- arrastar e soltar ----------
test("arquivo solto: o receptor mais recente que aceita leva; sem receptor, imagem e PDF só abrem para ver", () => {
  const pdf = new File(["x"], "nota.pdf", { type: "application/pdf" });
  const foto = new File(["x"], "avaria.jpg", { type: "image/jpeg" });
  const zip = new File(["x"], "tudo.zip", { type: "application/zip" });
  assert.equal(destinoDoSolto([pdf]).tipo, "visualizar");
  assert.equal(destinoDoSolto([zip]).tipo, "recusar");
  assert.equal(destinoDoSolto([]).tipo, "recusar");
  const recebidos = [];
  const sair = registrarReceptor({ rotulo: "anexar fotos", aceita: (a) => a.type.startsWith("image/"), receber: (a) => recebidos.push(...a) });
  const d = destinoDoSolto([foto]);
  assert.equal(d.tipo, "receptor");
  d.receptor.receber([foto]);
  assert.equal(recebidos.length, 1);
  assert.equal(destinoDoSolto([pdf]).tipo, "visualizar", "o receptor de fotos não aceita PDF");
  assert.equal(receptorPara([foto, pdf]), null, "precisa aceitar todos os arquivos");
  sair();
  assert.equal(destinoDoSolto([foto]).tipo, "visualizar", "tela fechada: o receptor sai");
  assert.ok(ehPdf(pdf));
});

// ---------- ligações nas telas ----------
test("telas ligadas: gaveta, cartão, colar, soltar, abas e aviso de alterações", () => {
  assert.match(fonte("src/components/modules/EmpregadosCadastroModulo.tsx"), /NomeComResumo[\s\S]*GavetaEmpregado[\s\S]*useAvisoNaoSalvo/);
  assert.match(fonte("src/components/modules/VeiculosCadastroModulo.tsx"), /GavetaItemMovimentado[\s\S]*useAvisoNaoSalvo/);
  assert.match(fonte("src/components/modules/EstoqueModulo.tsx"), /GavetaItemMovimentado/);
  assert.match(fonte("src/components/modules/EstoqueEpiModulo.tsx"), /CartaoDoNome[\s\S]*situacaoDoCa/);
  assert.match(fonte("src/components/modules/MovimentacoesModulo.tsx"), /ColarPlanilhaDialog/);
  assert.match(fonte("src/components/modules/FotosOcorrencia.tsx"), /registrarReceptor/);
  assert.match(fonte("src/components/modules/ImportarNfeXml.tsx"), /registrarReceptor[\s\S]*ehXml/);
  const gaveta = fonte("src/components/modules/GavetasDeResumo.tsx");
  assert.match(gaveta, /\.eq\(alvo\?\.campo[\s\S]*\.limit\(5\)/, "5 últimas, filtradas no servidor");
  assert.doesNotMatch(gaveta, /useMovimentacoes/);
  assert.match(fonte("src/components/GavetaResumo.tsx"), /onCloseAutoFocus/, "a ficha só abre depois da gaveta fechar");
  assert.match(fonte("src/components/VisorArquivo.tsx"), /passive: false/);
  const rota = fonte("src/routes/_authenticated/route.tsx");
  assert.match(rota, /<SincroniaAbas \/>/);
  assert.match(rota, /<ReceptorGlobal \/>/);
  assert.match(fonte("src/routes/_authenticated/inicio.tsx"), /<AtencaoHoje \/>/);
  assert.match(fonte("src/components/SeletorComBusca.tsx"), /combinaBuscaTolerante/);
});

test("sincronia entre abas e aviso de alterações usam as APIs nativas", () => {
  const s = fonte("src/lib/sincronia-abas.ts");
  assert.match(s, /new BroadcastChannel/);
  assert.match(fonte("src/lib/use-aviso-nao-salvo.ts"), /enableBeforeUnload/);
  assert.match(fonte("src/lib/use-aviso-nao-salvo.ts"), /Você tem alterações não salvas\. Deseja sair mesmo assim\?/);
  assert.match(fonte("src/components/layout/SincroniaAbas.tsx"), /getMutationCache\(\)\.subscribe/);
});

test("bloco de atenção: pulso limitado e sem esconder o foco, X por usuário que reaparece com pendência nova", () => {
  const b = fonte("src/components/inicio/AtencaoHoje.tsx");
  assert.doesNotMatch(b, /infinite|animate-ping|animate-pulse/, "nada pulsa para sempre");
  assert.match(b, /motion-safe:animate-\[pulso-atencao_2\.4s_ease-in-out_2\]/);
  assert.match(b, /total <= fechadoCom/, "pendência nova reabre o bloco");
  assert.match(b, /sessionStorage\.getItem\(chave\)/);
  assert.match(b, /<\/h2>\s*<button/, "o X fica fora do título");
  assert.match(fonte("src/styles.css"), /@keyframes pulso-atencao \{[^}]*outline/s, "outline, não box-shadow, para não cobrir o anel de foco");
});
