import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararCadastroFerramenta, reservarCodigoFerramenta, codigosReservadosFerramenta } from '../src/lib/cadastro-ferramentas.ts';
import { lerParametros, proximoCodigo } from '../src/lib/parametros-base.ts';

test('código excluído fica reservado sem afetar a regra de outros módulos', () => {
  const registros = new Map();
  const storage = { getItem: (k) => registros.get(k) ?? null, setItem: (k, v) => registros.set(k, v) };
  reservarCodigoFerramenta('FER-0002', storage);
  assert.deepEqual(codigosReservadosFerramenta(storage), ['FER-0002']);
  assert.equal(prepararCadastroFerramenta({
    parametros: lerParametros(null), codigosExistentes: ['FER-0001', ...codigosReservadosFerramenta(storage)],
    categoriaFerramenta: 'Elétrica', grupoFerramenta: 'Diversos',
    descricao: 'Nova furadeira', estoqueMinimo: '0', numeroSerie: 'SN-NEW', precoCusto: '10.00',
  }).codigo_sku, 'FER-0003');
  assert.equal(proximoCodigo({ sigla: 'EPI', inicial: '0001' }, ['EPI-0001', ...codigosReservadosFerramenta(storage)]), 'EPI-0002');
});
