import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (arquivo) => readFileSync(new URL(`../src/${arquivo}`, import.meta.url), 'utf8');

test('o módulo Ferramentas não tem aba Cadastro, que fica só em Cadastros > Ferramentas (decisão 25)', () => {
  const pagina = ler('components/modules/PaginaModulo.tsx');
  assert.doesNotMatch(pagina, /ItensModulo/);
  const ferramenta = pagina.slice(pagina.indexOf('modulo === "ferramenta" ? ('), pagina.indexOf(') : ('));
  assert.match(ferramenta, /value="termo-vistoria"/, 'o trecho conferido é o das abas de Ferramentas');
  assert.doesNotMatch(ferramenta, /value="cadastro"/);
  assert.match(ler('routes/_authenticated/cadastros/ferramentas.tsx'), /<ItensModulo modulo="ferramenta" \/>/);
});
