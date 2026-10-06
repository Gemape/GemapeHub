import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerParametros } from '../src/lib/parametros-base.ts';
import { estadoEstoqueModulo } from '../src/lib/estoque-tamanho.ts';
import { lerItensEstoque } from '../src/lib/itens-estoque-modulo.ts';
import { prepararEstoqueFerramenta, prepararMinimoUnico, prepararMinimosEstoque } from '../src/lib/estoque-configuracao.ts';

const ler = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8');

test('cadastros de EPI e Uniforme não exibem saldo nem alerta nem exportam estoque', () => {
  const fonte = ler('components/modules/CadastroProduto.tsx');
  const csv = fonte.slice(fonte.indexOf('exportarCsv('), fonte.indexOf('Exportar CSV', fonte.indexOf('exportarCsv(')));
  const lista = fonte.slice(fonte.indexOf('<div className="panel overflow-x-auto">'), fonte.indexOf('Exportar CSV', fonte.indexOf('<div className="panel overflow-x-auto">')));
  assert.doesNotMatch(csv, /Estoque|Mínimo|estoque_atual|estoque_minimo/);
  assert.doesNotMatch(lista, /Abaixo do mínimo|resumoEstoquePorTamanho|item\.estoque_atual|<TableHead[^>]*>Estoque<\/TableHead>/);
  assert.doesNotMatch(fonte, /O alerta de estoque baixo/, 'o cadastro não anuncia alertas de estoque');
  assert.doesNotMatch(fonte, /O estoque é\s+controlado por tamanho/, 'o cadastro não descreve controle de estoque como sua função');
  assert.doesNotMatch(fonte, /A movimentação e o saldo ficam no módulo/, 'o cadastro não instrui sobre estoque');
  assert.doesNotMatch(fonte, /Estoque mínimo por tamanho|name="estoque_minimo"|minimos_tamanho|campoMinimo/, 'o cadastro não configura estoque');
});

test('cadastro de Ferramentas não exibe nem exporta saldo ou alerta', () => {
  const fonte = ler('components/modules/ItensModulo.tsx');
  const csv = fonte.slice(fonte.indexOf('exportarCsv('), fonte.indexOf('Exportar CSV', fonte.indexOf('exportarCsv(')));
  const lista = fonte.slice(fonte.indexOf('<div className="panel overflow-x-auto">'), fonte.indexOf('Novo item', fonte.indexOf('<div className="panel overflow-x-auto">')));
  assert.doesNotMatch(csv, /Estoque:|Mínimo:/);
  assert.doesNotMatch(lista, /<TableHead[^>]*>Estoque<\/TableHead>|item\.estoque_atual|font-bold text-destructive/);
  // Decisão 54: o cadastro de ferramenta passou a ter o campo estoque mínimo; o estoque inicial continua no módulo.
  assert.doesNotMatch(fonte, /name="estoque_atual"|Estoque Atual/, 'estoque inicial fica no módulo');
});

test('módulos EPI, Uniformes e Ferramentas têm aba de estoque própria', () => {
  const pagina = ler('components/modules/PaginaModulo.tsx');
  assert.match(pagina, /<EstoqueModulo modulo={modulo} \/>/);
  assert.doesNotMatch(pagina, /<CadastroProduto tabela="epis" \/>/);
  assert.match(pagina, /value="estoque"/);
  const estoque = ler('components/modules/EstoqueModulo.tsx');
  assert.match(estoque, /Estoque mínimo/);
  assert.match(estoque, /Abaixo do mínimo/);
  assert.match(estoque, /estadoEstoqueModulo/);
  assert.match(estoque, /prepararMinimosEstoque/, 'mínimos são gravados pelo módulo');
  assert.match(estoque, /Estoque inicial/, 'Ferramentas configura o estoque inicial no módulo');
});

test('mínimos por tamanho são gravados no mesmo mapa e somados no mínimo do produto', () => {
  const valores = prepararMinimosEstoque({ 'tam-40': 2, 'tam-42': 5 }, ['tam-40', 'tam-42']);
  assert.deepEqual(valores, { minimos_tamanho: { 'tam-40': 2, 'tam-42': 5 }, estoque_minimo: 7 });
  assert.throws(() => prepararMinimosEstoque({ 'tam-40': -1 }, ['tam-40']), /mínimo/i);
  assert.throws(() => prepararMinimosEstoque({ 'tam-99': 4 }, ['tam-40']), /tamanho/i);
});

test('módulo de Ferramentas valida e prepara mínimo e saldo editável', () => {
  assert.deepEqual(prepararEstoqueFerramenta('4', '7'), { estoque_minimo: 4, estoque_atual: 7 });
  assert.throws(() => prepararEstoqueFerramenta('2', '-1'), /estoque/i);
  assert.throws(() => prepararEstoqueFerramenta('1.5', '0'), /mínimo/i);
});

test('módulo de EPI/Uniformes sem tamanhos grava mínimo único e limpa grade antiga', () => {
  assert.deepEqual(prepararMinimoUnico('3'), { estoque_minimo: 3, minimos_tamanho: {} });
  assert.throws(() => prepararMinimoUnico('-2'), /mínimo/i);
});

test('módulo sinaliza mínimo por tamanho e saldo do produto', () => {
  const item = { categoria: 'Botina', subcategoria_id: 'sub-epi-botina', estoque_atual: 7, estoque_minimo: 6,
    saldos_tamanho: { 'tam-40': 1, 'tam-42': 6 }, minimos_tamanho: { 'tam-40': 2, 'tam-42': 4 } };
  const estado = estadoEstoqueModulo(lerParametros(null), 'epi', item);
  assert.equal(estado.saldo, 7);
  assert.equal(estado.minimo, 6);
  assert.equal(estado.alerta, true, 'um tamanho abaixo do mínimo aciona alerta mesmo com total suficiente');
  assert.match(estado.detalheSaldo, /40.*1/);
  assert.match(estado.detalheMinimo, /40.*2/);
  assert.match(estado.detalheAlerta, /40 \(1\/2\)/);
});

test('módulo preserva alerta do mínimo legado mesmo após desautorizar o tamanho', () => {
  const item = { categoria: 'Capacete', subcategoria_id: 'sub-epi-capacete', estoque_atual: 5, estoque_minimo: 2,
    saldos_tamanho: { 'sem-tamanho': 5 }, minimos_tamanho: { 'tam-40': 2 } };
  const estado = estadoEstoqueModulo(lerParametros(null), 'epi', item);
  assert.equal(estado.alerta, true);
  assert.match(estado.detalheMinimo, /40.*2/);
  assert.match(estado.detalheAlerta, /40 \(0\/2\)/);
});

test('módulo lê todos os itens em páginas e respeita a empresa', async () => {
  const linhas = Array.from({length: 120}, (_, i) => ({id: String(i), empresa_id: i === 119 ? 'b' : 'a', nome: `Item ${i}`}));
  const cliente = { from: () => {
    let empresa, inicio = 0, fim = 49;
    const q = {select: () => q, eq: (_coluna, id) => {empresa = id; return q;}, order: () => q,
      range: (a, b) => {inicio = a; fim = b; return q;},
      then: (ok) => ok({data: linhas.filter(l => l.empresa_id === empresa).slice(inicio, fim + 1), error: null})};
    return q;
  }};
  const itens = await lerItensEstoque(cliente, 'epi', 'a');
  assert.equal(itens.length, 119);
  assert.ok(itens.every(i => i.empresa_id === 'a'));
});
