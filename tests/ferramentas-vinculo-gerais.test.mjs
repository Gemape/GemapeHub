import test from 'node:test';
import assert from 'node:assert/strict';
import { opcaoFerramentaEmUso } from '../src/lib/cadastro-ferramentas.ts';

test('categorias e grupos vinculados são identificados antes de renomear ou excluir', () => {
  const modelos = [{ categoria_ferramenta: 'Elétrica', grupo_ferramenta: 'Diversos' }];
  assert.equal(opcaoFerramentaEmUso(modelos, 'categoriasFerramenta', 'Elétrica'), true);
  assert.equal(opcaoFerramentaEmUso(modelos, 'gruposFerramenta', 'Diversos'), true);
  assert.equal(opcaoFerramentaEmUso(modelos, 'gruposFerramenta', 'Cachimbo'), false);
});
