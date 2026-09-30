import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSupabase } from '../src/integrations/supabase/demo-client.ts';
import { valoresItemNaEdicao } from '../src/lib/cadastro-ferramentas.ts';

test('edição de EPI e uniforme omite estoque desabilitado ao salvar e reabrir', async () => {
  for (const tabela of ['epis', 'uniformes']) {
    const id = crypto.randomUUID();
    await demoSupabase.from(tabela).insert({ id, estoque_atual: 9, nome: 'Antes' });
    const valores = valoresItemNaEdicao({ nome: 'Depois', estoque_atual: 0 }, true);
    await demoSupabase.from(tabela).update(valores).eq('id', id);
    const { data } = await demoSupabase.from(tabela).select('*').eq('id', id).single();
    assert.equal(data.nome, 'Depois');
    assert.equal(data.estoque_atual, 9);
  }
});
