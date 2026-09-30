import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSupabase } from '../src/integrations/supabase/demo-client.ts';
import { prepararCadastroFerramenta } from '../src/lib/cadastro-ferramentas.ts';
import { lerParametros } from '../src/lib/parametros-base.ts';
import { valorTotalEmEstoque } from '../src/lib/gemape.ts';

test('série, patrimônio, aquisição e custo persistem ao salvar e reabrir', async () => {
  const cadastro = prepararCadastroFerramenta({
    parametros: lerParametros(null), codigosExistentes: ['FER-0001'],
    subcategoria: 'Elétrica', categoriaFerramenta: 'Elétrica',
    grupoFerramenta: 'Diversos', descricao: 'Furadeira', estoqueMinimo: '1',
    numeroSerie: '  SERIE-42  ', precoCusto: '240.50',
  });
  const id = crypto.randomUUID();
  await demoSupabase.from('ferramentas').insert({
    id, empresa_id: 'empresa-demo', ...cadastro,
    patrimonio: 'PAT-42', data_aquisicao: '2026-09-30', estoque_atual: 3,
  });

  const { data: reaberta } = await demoSupabase.from('ferramentas').select('*').eq('id', id).single();
  assert.equal(reaberta.numero_serie, 'SERIE-42');
  assert.equal(reaberta.patrimonio, 'PAT-42');
  assert.equal(reaberta.data_aquisicao, '2026-09-30');
  assert.equal(reaberta.preco_unitario, 240.5);
  assert.equal(valorTotalEmEstoque([reaberta]), 721.5);
});

test('patrimônio e data são opcionais, e o valor em estoque soma em centavos', async () => {
  const id = crypto.randomUUID();
  await demoSupabase.from('ferramentas').insert({
    id, nome: 'Alicate', numero_serie: 'SN-SEM-PAT',
    patrimonio: null, data_aquisicao: null, preco_unitario: 0.29, estoque_atual: 3,
  });
  const { data } = await demoSupabase.from('ferramentas').select('*').eq('id', id).single();
  assert.equal(data.patrimonio, null);
  assert.equal(data.data_aquisicao, null);
  assert.equal(valorTotalEmEstoque([
    { estoque_atual: 3, preco_unitario: 0.29 },
    { estoque_atual: 1, preco_unitario: 0.1 },
    { estoque_atual: 5, preco_unitario: null },
  ]), 0.97);
});
