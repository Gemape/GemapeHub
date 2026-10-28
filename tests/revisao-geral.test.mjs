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

test('editar cliente ou fornecedor excluído em outra aba não recria o cadastro com código novo', async () => {
  const { salvarCliente, listarClientes } = await import('../src/lib/clientes-demo.ts');
  const { salvarFornecedor, listarFornecedores } = await import('../src/lib/fornecedores-demo.ts');
  const dados = new Map();
  const local = { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
  const cliente = { nome: 'Ana', cpf: '', cnpj: '', endereco: '', contato: '', telefone: '', telefone2: '', email: '', observacao: '' };
  assert.throws(() => salvarCliente({ ...cliente, id: 'sumiu' }, local), /foi excluído/);
  assert.equal(listarClientes(local).length, 0);
  const forn = { razao_social: 'ABC', nome_fantasia: '', cnpj: '12.345.678/0001-90', rua: '', numero: '', bairro: '', cep: '', cidade: '', estado: '', pais: '', inscricao_estadual: '', telefone: '', contato: '', observacoes: '', categorias: [] };
  assert.throws(() => salvarFornecedor({ ...forn, id: 'sumiu' }, local), /foi excluído/);
  assert.equal(listarFornecedores(local).length, 0);
});

test('km do cadastro: lista mostra o maior entre cadastro e registros e a edição recusa km menor', () => {
  const s = fonte('components/modules/VeiculosCadastroModulo.tsx');
  assert.match(s, /kmAtualDe\(v\)/);
  assert.match(s, /km < kmDosRegistros\(editando\.id\)/);
});

test('Habilitados do cadastro inicial (sem vínculo) não são oferecidos de novo pelo nome', () => {
  // Desde a decisão 299 quem escolhe os habilitados é a caixa dupla: o empregado já habilitado (por id ou pelo nome) não volta para a lista da esquerda.
  const s = fonte('components/parametros/CaixaDuplaEmpregados.tsx');
  assert.match(s, /jaHabilitado = new Set\(habilitados\.flatMap\(\(h\) => \[h\.empregadoId, normalizar\(h\.nome\)\]\)\)/);
});

test('o Construtor pergunta antes de sair da tela com alterações não salvas', () => {
  const s = fonte('components/parametros/QuestionarioDespesasConstrutor.tsx');
  assert.match(s, /useBlocker\(\{[\s\S]*disabled: !alterado/);
});

test('o relatório de Viagens usa a logomarca nova, tanto ao gerar quanto ao reabrir (dec 234)', () => {
  assert.match(fonte('components/modules/ViagensRelatorio.tsx'), /logo-relatorio-viagens\.png/);
  assert.match(fonte('components/modules/ViagensLista.tsx'), /logo-relatorio-viagens\.png/);
  assert.equal(readFileSync(new URL('../public/logo-relatorio-viagens.png', import.meta.url)).subarray(1, 4).toString(), 'PNG');
});
