import test from 'node:test';
import assert from 'node:assert/strict';
import { anoValido, formatarPlaca, normalizarPlaca, placaRepetida, placaValida } from '../src/lib/veiculos.ts';
import { lerParametros, proximoCodigo } from '../src/lib/parametros-base.ts';

test('placa: padrão antigo e Mercosul', () => {
  assert.equal(normalizarPlaca(' abc-1234 '), 'ABC1234');
  assert.ok(placaValida('abc-1234'));
  assert.ok(placaValida('BRA2E19'));
  assert.ok(!placaValida('AB-1234'));
  assert.ok(!placaValida('ABCD123'));
  assert.equal(formatarPlaca('abc1234'), 'ABC-1234');
  assert.equal(formatarPlaca('bra2e19'), 'BRA2E19');
});

test('placa repetida ignora o próprio veículo', () => {
  const lista = [{ id: 'a', placa: 'GEM-2026' }, { id: 'b', placa: 'BRA2E19' }];
  assert.ok(placaRepetida('gem2026', lista));
  assert.ok(!placaRepetida('GEM2026', lista, 'a'));
  assert.ok(!placaRepetida('XYZ1A23', lista));
});

test('ano de fabricação', () => {
  const hoje = new Date('2026-09-30');
  assert.ok(anoValido(2027, hoje));
  assert.ok(!anoValido(2028, hoje));
  assert.ok(!anoValido(1949, hoje));
  assert.ok(!anoValido(2020.5, hoje));
});

test('código do veículo: sequência VEI', () => {
  const regra = lerParametros(null).regrasCodigo.find((r) => r.categoriaId === 'cat-veiculos');
  assert.equal(proximoCodigo(regra, []), 'VEI-0001');
  assert.equal(proximoCodigo(regra, ['VEI-0001', 'UNI-0005']), 'VEI-0002');
});

test("empilhadeira não tem placa; os demais tipos continuam com placa (decisão 66)", async () => {
  const { subcategoriaTemPlaca } = await import("../src/lib/veiculos.ts");
  assert.equal(subcategoriaTemPlaca("Empilhadeira"), false);
  for (const nome of ["Carro", "Van", "Utilitário", "Caminhão", "Moto", "Outros"]) assert.equal(subcategoriaTemPlaca(nome), true, nome);
  assert.equal(subcategoriaTemPlaca(undefined), true);
});

test("sem placa a descrição do veículo continua montada pelos demais dados", async () => {
  const { descricaoVeiculo } = await import("../src/lib/descricao-veiculo.ts");
  assert.equal(descricaoVeiculo({ placa: "", subcategoria: "Empilhadeira", marca: "Toyota", modelo: "Hyster", ano: 2003 }), "Empilhadeira · Toyota · Hyster · 2003");
});
