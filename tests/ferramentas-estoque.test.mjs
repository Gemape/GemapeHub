import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSupabase } from '../src/integrations/supabase/demo-client.ts';
import { protegerEstoqueNaEdicao } from '../src/lib/cadastro-ferramentas.ts';

test('editar, salvar e reabrir ferramenta preserva estoque positivo', async () => {
  const id = crypto.randomUUID();
  await demoSupabase.from('ferramentas').insert({
    id, empresa_id: 'empresa-demo', codigo_sku: 'FER-9999', nome: 'Furadeira',
    categoria: 'Elétrica', estoque_atual: 7, estoque_minimo: 2,
  });

  // Um campo desabilitado não entra no FormData. A conversão antiga gravava zero.
  const formulario = new FormData();
  formulario.set('nome', 'Furadeira revisada');
  formulario.set('estoque_minimo', '3');
  const valores = protegerEstoqueNaEdicao({
    nome: formulario.get('nome'),
    estoque_minimo: Number(formulario.get('estoque_minimo')),
    estoque_atual: Number(formulario.get('estoque_atual') ?? 0),
  });
  await demoSupabase.from('ferramentas').update(valores).eq('id', id);

  const { data: reaberta } = await demoSupabase.from('ferramentas').select('*').eq('id', id).single();
  assert.equal(reaberta.nome, 'Furadeira revisada');
  assert.equal(reaberta.estoque_minimo, 3);
  assert.equal(reaberta.estoque_atual, 7);
});
