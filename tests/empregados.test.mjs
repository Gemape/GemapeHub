import test from 'node:test';
import assert from 'node:assert/strict';
import { bloqueioPorDemissao, cpfValido, empregadoAtivo, formatarCpf, hojeLocal, matriculaValida, prepararEmpregado, separarEmpregados } from '../src/lib/empregados.ts';

const base = { nome: ' Maria  da Silva ', cpf: '52998224725', matricula: 'l3 p25', empresa_id: 'e1', email: ' Maria@Gemape.com.br ', data_admissao: '2024-01-10', data_demissao: '' };

test('nome digitado em caixa alta é normalizado sem mexer em CPF ou matrícula', () => {
  const salvo = prepararEmpregado({ ...base, nome: 'MARIA DA SILVA' }, []);
  assert.equal(salvo.nome, 'Maria da Silva');
  assert.equal(salvo.matricula, 'L3P25');
});

test('CPF e matrícula', () => {
  assert.ok(cpfValido('529.982.247-25'));
  assert.ok(!cpfValido('111.111.111-11'));
  assert.ok(!cpfValido('529.982.247-24'));
  assert.equal(formatarCpf('52998224725'), '529.982.247-25');
  assert.ok(matriculaValida('L3P25'));
  assert.ok(!matriculaValida('3-25'));
});

test('prepara o empregado e inativa pela data de demissão', () => {
  const v = prepararEmpregado(base, []);
  assert.deepEqual(v, { nome: 'Maria da Silva', cpf: '529.982.247-25', matricula: 'L3P25', empresa_id: 'e1', email: 'maria@gemape.com.br', data_admissao: '2024-01-10', data_demissao: null, ativo: true });
  assert.equal(prepararEmpregado({ ...base, data_demissao: '2026-09-30' }, [], undefined, '2026-09-30').ativo, false);
  assert.throws(() => prepararEmpregado({ ...base, data_demissao: '2023-01-01' }, []), /anterior à admissão/);
  assert.throws(() => prepararEmpregado({ ...base, email: 'x@' }, []), /E-mail/);
  assert.throws(() => prepararEmpregado({ ...base, matricula: '1001' }, []), /LxPx/);
  assert.throws(() => prepararEmpregado({ ...base, cpf: '123' }, []), /CPF inválido/);
});

test('duplicados e dados antigos na edição', () => {
  const outros = [{ id: 'a', cpf: '529.982.247-25', matricula: 'L1P1' }];
  assert.throws(() => prepararEmpregado(base, outros), /mesmo CPF|este CPF/);
  assert.throws(() => prepararEmpregado({ ...base, cpf: '11144477735', matricula: 'l1p1' }, outros), /matrícula/);
  // Registro antigo com CPF e matrícula fora do padrão pode ser editado sem trocá-los.
  const antigo = { id: 'b', cpf: '000.000.000-00', matricula: '1001' };
  const v = prepararEmpregado({ ...base, cpf: '000.000.000-00', matricula: '1001' }, [...outros, antigo], antigo);
  assert.equal(v.matricula, '1001');
});

test('separa ativos e demitidos', () => {
  const r = separarEmpregados([
    { nome: 'Zé', ativo: true, data_demissao: null },
    { nome: 'Ana', ativo: true, data_demissao: '2026-01-01' },
    { nome: 'Bia', ativo: true, data_demissao: null },
    { nome: 'Caio', ativo: false, data_demissao: null },
  ], '2026-09-30');
  assert.deepEqual(r.ativos.map((e) => e.nome), ['Bia', 'Zé']);
  assert.deepEqual(r.inativos.map((e) => e.nome), ['Ana', 'Caio']);
});

test('edição preserva inativo manual e dados antigos repetidos', () => {
  const inativo = { id: 'c', cpf: '52998224725', matricula: 'l3p25', ativo: false };
  const v = prepararEmpregado({ ...base, cpf: '52998224725', matricula: 'l3p25' }, [inativo], inativo);
  assert.equal(v.ativo, false);
  // CPF e matrícula sem mudança ficam exatamente como estavam.
  assert.equal(v.cpf, '52998224725');
  assert.equal(v.matricula, 'l3p25');
  // Dois registros antigos com o mesmo valor: editar um deles sem mexer no valor não bloqueia.
  const a = { id: 'a', cpf: 'N/A', matricula: '1001', ativo: true };
  const b = { id: 'b', cpf: 'N/A', matricula: '1001', ativo: true };
  assert.doesNotThrow(() => prepararEmpregado({ ...base, cpf: 'N/A', matricula: '1001' }, [a, b], a));
});

test('demissão futura = ativo; demissão passada = inativo', () => {
  const hoje = '2026-09-30';
  assert.equal(hojeLocal(new Date(2026, 8, 5)), '2026-09-05');
  // Ao salvar: futura continua ativo, passada (ou hoje) fica inativo.
  assert.equal(prepararEmpregado({ ...base, data_demissao: '2026-10-15' }, [], undefined, hoje).ativo, true);
  assert.equal(prepararEmpregado({ ...base, data_demissao: '2026-09-01' }, [], undefined, hoje).ativo, false);
  // Salvo com demissão futura: quando a data chega, passa a contar como inativo.
  const joao = { nome: 'João', ativo: true, data_demissao: '2026-10-15' };
  assert.equal(empregadoAtivo(joao, hoje), true);
  assert.equal(empregadoAtivo(joao, '2026-10-15'), false);
  assert.deepEqual(separarEmpregados([joao], hoje).ativos.map((e) => e.nome), ['João']);
  assert.deepEqual(separarEmpregados([joao], '2026-10-16').inativos.map((e) => e.nome), ['João']);
  // Quem ficou inativo por uma demissão e teve a data removida volta a ser ativo.
  const antes = { id: 'x', cpf: '529.982.247-25', matricula: 'L3P25', ativo: false, data_demissao: '2026-09-01' };
  assert.equal(prepararEmpregado({ ...base, data_demissao: '' }, [], antes, hoje).ativo, true);
});

test('movimentação com demissão vencida é bloqueada', () => {
  const hoje = '2026-09-30';
  assert.equal(bloqueioPorDemissao({ nome: 'Ana', data_demissao: null }, 'entrega', '', hoje), null);
  assert.equal(bloqueioPorDemissao({ nome: 'Ana', data_demissao: '2026-10-15' }, 'entrega', hoje, hoje), null);
  assert.equal(bloqueioPorDemissao(undefined, 'entrega', '', hoje), null);
  const msg = bloqueioPorDemissao({ nome: 'Ana', data_demissao: '2026-09-01' }, 'entrega', '', hoje);
  assert.match(msg, /Ana foi demitido\(a\) em 01\/09\/2026/);
  assert.match(msg, /entrega, devolução ou baixa/);
  assert.ok(bloqueioPorDemissao({ nome: 'Ana', data_demissao: hoje }, 'entrega', '', hoje));
  // Entrega lançada hoje, mas datada depois da demissão futura: bloqueada.
  assert.ok(bloqueioPorDemissao({ nome: 'Ana', data_demissao: '2026-10-15' }, 'entrega', '2026-10-20', hoje));
  // Depois da demissão, uma movimentação com data antiga também é bloqueada.
  assert.ok(bloqueioPorDemissao({ nome: 'Ana', data_demissao: '2026-09-01' }, 'entrega', '2026-08-01', hoje));
});

test('termo de encerramento é liberado após a demissão; entrega e baixa continuam bloqueadas', () => {
  const hoje = '2026-09-30';
  const demitido = { nome: 'Ana', data_demissao: '2026-09-01' };
  assert.equal(bloqueioPorDemissao(demitido, 'encerramento', hoje, hoje), null);
  assert.equal(bloqueioPorDemissao(demitido, 'encerramento', '2026-10-05', hoje), null);
  assert.match(bloqueioPorDemissao(demitido, 'entrega', hoje, hoje), /Não é possível registrar/);
  assert.match(bloqueioPorDemissao(demitido, 'baixa', hoje, hoje), /Termo de Encerramento/);
  assert.ok(bloqueioPorDemissao(demitido, 'devolucao', hoje, hoje));
  assert.ok(bloqueioPorDemissao(demitido, 'movimentacao', hoje, hoje));
});
