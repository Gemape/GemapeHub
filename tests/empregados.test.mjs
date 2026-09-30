import test from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido, formatarCpf, matriculaValida, prepararEmpregado, separarEmpregados } from '../src/lib/empregados.ts';

const base = { nome: ' Maria  da Silva ', cpf: '52998224725', matricula: 'l3 p25', empresa_id: 'e1', email: ' Maria@Gemape.com.br ', data_admissao: '2024-01-10', data_demissao: '' };

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
  assert.equal(prepararEmpregado({ ...base, data_demissao: '2026-09-30' }, []).ativo, false);
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
  ]);
  assert.deepEqual(r.ativos.map((e) => e.nome), ['Bia', 'Zé']);
  assert.deepEqual(r.inativos.map((e) => e.nome), ['Ana', 'Caio']);
});
