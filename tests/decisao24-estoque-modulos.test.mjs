import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerParametros } from '../src/lib/parametros-base.ts';
import { estadoEstoqueModulo } from '../src/lib/estoque-tamanho.ts';
import { lerItensEstoque } from '../src/lib/itens-estoque-modulo.ts';

const ler = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8');

test('cadastros de EPI e Uniforme não exibem saldo nem alerta nem exportam estoque', () => {
  const fonte = ler('components/modules/CadastroProduto.tsx');
  const csv = fonte.slice(fonte.indexOf('exportarCsv('), fonte.indexOf('Exportar CSV', fonte.indexOf('exportarCsv(')));
  const lista = fonte.slice(fonte.indexOf('<div className="panel overflow-x-auto">'), fonte.indexOf('Exportar CSV', fonte.indexOf('<div className="panel overflow-x-auto">')));
  assert.doesNotMatch(csv, /Estoque|Mínimo|estoque_atual|estoque_minimo/);
  assert.doesNotMatch(lista, /Abaixo do mínimo|resumoEstoquePorTamanho|item\.estoque_atual|<TableHead[^>]*>Estoque<\/TableHead>/);
  assert.doesNotMatch(fonte, /O alerta de estoque baixo/, 'o cadastro não anuncia alertas de estoque');
  assert.match(fonte, /Estoque mínimo por tamanho/, 'a grade de parametrização continua');
});

test('cadastro de Ferramentas não exibe nem exporta saldo ou alerta', () => {
  const fonte = ler('components/modules/ItensModulo.tsx');
  const csv = fonte.slice(fonte.indexOf('exportarCsv('), fonte.indexOf('Exportar CSV', fonte.indexOf('exportarCsv(')));
  const lista = fonte.slice(fonte.indexOf('<div className="panel overflow-x-auto">'), fonte.indexOf('Novo item', fonte.indexOf('<div className="panel overflow-x-auto">')));
  assert.doesNotMatch(csv, /Estoque:|Mínimo:/);
  assert.doesNotMatch(lista, /<TableHead[^>]*>Estoque<\/TableHead>|item\.estoque_atual|font-bold text-destructive/);
  assert.match(fonte, /name="estoque_minimo"/);
  assert.match(fonte, /name="estoque_atual"/, 'o estoque inicial permanece por decisão do responsável');
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
});

test('módulo sinaliza mínimo por tamanho e saldo do produto', () => {
  const item = { categoria: 'Botina', subcategoria_id: 'sub-epi-botina', estoque_atual: 7, estoque_minimo: 6,
    saldos_tamanho: { 'tam-40': 1, 'tam-42': 6 }, minimos_tamanho: { 'tam-40': 2, 'tam-42': 4 } };
  const estado = estadoEstoqueModulo(lerParametros(null), 'epi', item);
  assert.equal(estado.saldo, 7);
  assert.equal(estado.minimo, 6);
  assert.equal(estado.alerta, true, 'um tamanho abaixo do mínimo aciona alerta mesmo com total suficiente');
  assert.match(estado.detalheSaldo, /40.*1/);
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
