import test from 'node:test';
import assert from 'node:assert/strict';

// Navegador simulado com dados do demo gravados antes da referência.
const guardado = new Map();
const ouvintes = [];
globalThis.window = {
  localStorage: {
    getItem: (k) => guardado.get(k) ?? null,
    setItem: (k, v) => guardado.set(k, v),
  },
  addEventListener: (nome, funcao) => ouvintes.push([nome, funcao]),
  dispatchEvent: () => true,
};
globalThis.localStorage = globalThis.window.localStorage;
guardado.set('gemape-demo-dados', JSON.stringify({
  epis: [{ id: 'e1', empresa_id: 'x', nome: 'Capacete', categoria: 'Capacete' }],
  uniformes: [{ id: 'u1', empresa_id: 'x', nome: 'Calça', categoria: 'Calça' }],
  ferramentas: [], veiculos: [{ id: 'v1', empresa_id: 'x', placa: 'ABC1234', tipo: 'Moto' }],
  movimentacoes: [],
}));

test('ao abrir o demo, os cadastros antigos são vinculados e gravados com a referência', async () => {
  const { demoSupabase } = await import('../src/integrations/supabase/demo-client.ts');
  const salvo = JSON.parse(guardado.get('gemape-demo-dados'));
  assert.equal(salvo.epis[0].subcategoria_id, 'sub-epi-capacete');
  assert.equal(salvo.uniformes[0].subcategoria_id, 'sub-uniformes-calca');
  assert.equal(salvo.veiculos[0].subcategoria_id, 'sub-veiculos-moto');
  const { data } = await demoSupabase.from('epis').select('*').eq('id', 'e1').single();
  assert.equal(data.subcategoria_id, 'sub-epi-capacete');
});

test('ao mudar Gerais, nome gravado que passa a existir lá é ligado e salvo', async () => {
  const { adicionarSubcategoria, EVENTO_PARAMETROS } = await import('../src/lib/parametros-base.ts');
  const { demoSupabase } = await import('../src/integrations/supabase/demo-client.ts');
  await demoSupabase.from('epis').insert({ id: 'e9', empresa_id: 'x', nome: 'Avental', categoria: 'Avental de raspa' });
  assert.equal(JSON.parse(guardado.get('gemape-demo-dados')).epis.find((e) => e.id === 'e9').subcategoria_id, undefined);
  const sub = adicionarSubcategoria('cat-epi', 'Avental de Raspa');
  for (const [nome, funcao] of ouvintes) if (nome === EVENTO_PARAMETROS) funcao();
  const salvo = JSON.parse(guardado.get('gemape-demo-dados')).epis.find((e) => e.id === 'e9');
  assert.equal(salvo.subcategoria_id, sub.id);
  assert.equal(salvo.categoria, 'Avental de Raspa');
});
