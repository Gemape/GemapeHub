import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), 'utf8');

test('registros novos do demo recebem instantes crescentes (ordenação por created_at)', () => {
  const s = fonte('integrations/supabase/demo-client.ts');
  assert.match(s, /ultimoInstante \+ 1/);
  assert.equal((s.match(/created_at: instanteNovo\(\)/g) ?? []).length >= 5, true);
});

test('excluir caixa no demo leva os itens dela junto, como o ON DELETE CASCADE', () => {
  const s = fonte('integrations/supabase/demo-client.ts');
  assert.match(s, /this\.tabela === "caixas_ferramentas"[\s\S]*caixa_ferramenta_itens/);
});

test('excluir fornecedor apaga o fornecedor antes das associações', () => {
  const s = fonte('routes/_authenticated/cadastros/fornecedores.tsx');
  assert.ok(s.indexOf('removerFornecedor(fornecedor.id)') < s.indexOf('removerCodigosFabricaPorIds(vinculos'));
});

test('a lista do campo de busca só fecha quando o foco sai do campo inteiro', () => {
  const s = fonte('components/CampoBusca.tsx');
  assert.match(s, /currentTarget\.contains\(e\.relatedTarget/);
  assert.doesNotMatch(s, /setTimeout\(\(\) => setAberto\(false\)/);
});

test('janela de cliente trava o segundo clique em Salvar', () => {
  const s = fonte('components/parametros/ClienteDialog.tsx');
  assert.match(s, /if \(trava\.current\) return;/);
});

test('data de cadastro de ferramentas e caixas sai no dia de Brasília', () => {
  assert.match(fonte('components/modules/ItensModulo.tsx'), /formatarData\(item\.created_at\)/);
  assert.match(fonte('components/modules/CaixasFerramentasModulo.tsx'), /formatarData\(c\.created_at\)/);
});

test('responsável do check list é da mesma empresa do veículo', () => {
  const s = fonte('components/modules/ChecklistVeiculoModulo.tsx');
  assert.match(s, /e\.empresa_id === veiculoEscolhido\.empresa_id/);
  assert.match(s, /responsaveisDoVeiculo\.map/);
});
