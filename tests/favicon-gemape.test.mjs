import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('o ícone da aba usa a arte GEMAPE disponível nos arquivos públicos', () => {
  const raiz = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');
  const logo = readFileSync(new URL('../public/logo.png', import.meta.url));
  assert.ok(logo.length > 0);
  assert.match(raiz, /rel: "icon", href: `\$\{import\.meta\.env\["BASE_URL"\]\}logo\.png`, type: "image\/png"/);
  assert.doesNotMatch(raiz, /favicon\.ico/);
  assert.equal(existsSync(new URL('../public/favicon.ico', import.meta.url)), false);
});
