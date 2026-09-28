import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHost } from '../scripts/start-private.mjs';
import { allowedOrigin, securityHeaders } from '../src/server/security.ts';

test('binding rejeita interfaces públicas, curingas e IP privado ausente', () => {
  for (const ip of ['0.0.0.0','::','8.8.8.8','10.20.1.1']) assert.throws(() => validateHost(ip,['127.0.0.1']));
  assert.equal(validateHost('127.0.0.1',['127.0.0.1']),'127.0.0.1');
  assert.equal(validateHost('10.20.1.1',['10.20.1.1']),'10.20.1.1');
});
test('origem administrativa deve coincidir exatamente com APP_URL', () => {
  const request = origin => new Request('https://gemape.internal/api/admin/users', { method: 'POST', headers: origin ? { origin } : {} });
  assert.equal(allowedOrigin(request('https://gemape.internal'),'https://gemape.internal'),true);
  assert.equal(allowedOrigin(request('https://gemape.internal.evil.test'),'https://gemape.internal'),false);
  assert.equal(allowedOrigin(request(null),'https://gemape.internal'),false);
});
test('headers preservam status e conteúdo', async () => {
  const r = securityHeaders(new Response('teste',{status:403}));
  assert.equal(r.status,403); assert.equal(await r.text(),'teste');
  assert.equal(r.headers.get('X-Frame-Options'),'DENY');
});
