import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerParametros, salvarEnderecamentoCategoria } from '../src/lib/parametros-base.ts';
import { montarLinhasEnderecamento, precisaAvisarEnderecamento } from '../src/lib/enderecamento-categoria.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test('lista só produtos de categorias habilitadas, mesmo sem endereço', () => {
  const local = storage();
  salvarEnderecamentoCategoria('cat-epi', 'opcional', local);
  salvarEnderecamentoCategoria('cat-uniformes', 'obrigatorio', local);
  const produtos = [
    { tabela: 'epis', codigo_sku: 'EPI-0001', nome: 'Luva', empresa_id: 'a' },
    { tabela: 'epis', codigo_sku: 'EPI-0001', nome: 'Luva', empresa_id: 'b' },
    { tabela: 'uniformes', codigo_sku: 'UNI-0001', nome: 'Calça', empresa_id: 'a' },
    { tabela: 'ferramentas', codigo_sku: 'FER-0001', nome: 'Chave', empresa_id: 'a' },
  ];
  const enderecos = [{ id: 'end1', empresa_id: 'a', codigo_produto: 'EPI-0001', rua: 'A', prateleira: '1', apartamento: '2' }];
  const linhas = montarLinhasEnderecamento(produtos, enderecos, lerParametros(local), 'todas', '', false);
  assert.deepEqual(linhas.map((l) => [l.produto.codigo_sku, l.produto.empresa_id, l.endereco?.id]),
    [['EPI-0001', 'a', 'end1'], ['EPI-0001', 'b', undefined], ['UNI-0001', 'a', undefined]]);
  assert.deepEqual(montarLinhasEnderecamento(produtos, enderecos, lerParametros(local), 'todas', '', true)
    .map((l) => l.produto.codigo_sku), ['EPI-0001', 'UNI-0001']);
  assert.deepEqual(montarLinhasEnderecamento(produtos, enderecos, lerParametros(local), 'a', 'luva', false)
    .map((l) => l.produto.codigo_sku), ['EPI-0001']);
});

test('obrigatório avisa só quando o produto da empresa está sem endereço', () => {
  const local = storage();
  salvarEnderecamentoCategoria('cat-epi', 'obrigatorio', local);
  const dados = lerParametros(local);
  const enderecos = [{ empresa_id: 'a', codigo_produto: 'EPI-0001' }];
  assert.equal(precisaAvisarEnderecamento(dados, 'cat-epi', 'b', 'EPI-0001', enderecos), true);
  assert.equal(precisaAvisarEnderecamento(dados, 'cat-epi', 'a', 'EPI-0001', enderecos), false);
  assert.equal(precisaAvisarEnderecamento(dados, 'cat-uniformes', 'b', 'UNI-0001', []), false);
});

test('a tela oferece produtos sem endereço e filtro de pendentes', () => {
  const tela = readFileSync(new URL('../src/components/modules/EnderecamentoModulo.tsx', import.meta.url), 'utf8');
  assert.match(tela, /montarLinhasEnderecamento/);
  assert.match(tela, /Filtrar itens sem endereçamento/);
  assert.match(tela, /Adicionar endereço/);
});

test('salvar EPI, uniforme, ferramenta ou veículo aciona aviso sem bloquear a gravação', () => {
  for (const arquivo of ['CadastroProduto.tsx', 'VeiculosCadastroModulo.tsx', 'ItensModulo.tsx']) {
    const tela = readFileSync(new URL(`../src/components/modules/${arquivo}`, import.meta.url), 'utf8');
    assert.match(tela, /avisarEnderecamentoObrigatorio/);
    assert.match(tela, /onSuccess: \(\) => \{/);
  }
});
