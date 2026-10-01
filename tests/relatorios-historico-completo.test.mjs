import test from 'node:test';
import assert from 'node:assert/strict';
import { lerMovimentacoesRelatorio, lerEmpregadosRelatorio } from '../src/lib/relatorios-historico.ts';

function clienteComLimite(linhas) {
  return { from: () => {
    const filtros = [];
    let inicio = 0, fim = 999;
    const q = {
      select: () => q,
      eq: (campo, valor) => { filtros.push(l => l[campo] === valor); return q; },
      gte: (campo, valor) => { filtros.push(l => l[campo] >= valor); return q; },
      lte: (campo, valor) => { filtros.push(l => l[campo] <= valor); return q; },
      order: () => q,
      range: (a, b) => { inicio = a; fim = b; return q; },
      then: (ok) => ok({ data: linhas.filter(l => filtros.every(f => f(l))).slice(inicio, Math.min(fim + 1, inicio + 1000)), error: null }),
    };
    return q;
  } };
}

test('relatório mostra mais de 1000 movimentações sem truncar', async () => {
  const linhas = Array.from({length: 1205}, (_, i) => ({id: String(i), modulo: 'epi', empresa_id: 'a', empregado_id: 'ana', data_movimentacao: '2026-09-30'}));
  const resultado = await lerMovimentacoesRelatorio(clienteComLimite(linhas), {modulo: 'epi', empresaId: 'a', empregadoId: 'ana'});
  assert.equal(resultado.length, 1205);
  assert.equal(resultado.at(-1).id, '1204');
});

test('relatório do empregado não mistura outra empresa', async () => {
  const linhas = [
    {id: 'a', modulo: 'uniforme', empresa_id: 'a', empregado_id: 'ana', data_movimentacao: '2026-09-30'},
    {id: 'b', modulo: 'uniforme', empresa_id: 'b', empregado_id: 'ana', data_movimentacao: '2026-09-30'},
  ];
  const resultado = await lerMovimentacoesRelatorio(clienteComLimite(linhas), {modulo: 'uniforme', empresaId: 'a', empregadoId: 'ana'});
  assert.deepEqual(resultado.map(l => l.id), ['a']);
});

test('seletor de empregados alcança registros além dos primeiros 50', async () => {
  const linhas = Array.from({length: 120}, (_, i) => ({id: String(i), nome: `Pessoa ${i}`, empresa_id: 'a'}));
  const resultado = await lerEmpregadosRelatorio(clienteComLimite(linhas), 'a');
  assert.equal(resultado.length, 120);
});
