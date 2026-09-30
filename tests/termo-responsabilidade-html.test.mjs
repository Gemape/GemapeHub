import test from 'node:test';
import assert from 'node:assert/strict';

// O termo é impresso no fuso do Brasil: a data não pode cair no dia anterior.
process.env.TZ = 'America/Sao_Paulo';
const { montarTermoResponsabilidadeHtml } = await import('../src/lib/termo-responsabilidade-html.ts');

const perigoso = '<img src=x onerror=alert(1)>';
const dados = {
  empresa: { razao_social: `GEMAPE ${perigoso}`, cnpj: '00.000.000/0001-00' },
  empregado: { nome: `Ana ${perigoso}`, cpf: '000.000.000-00' },
  caixaCodigo: `CX-01 ${perigoso}`,
  data: '2026-09-30',
  linhas: [{ codigo: 'FER-0001', nome: `Furadeira ${perigoso}`, marca: perigoso, quantidade: 2, estado: perigoso }],
};

test('o Termo de Responsabilidade escapa todos os textos informados', () => {
  const html = montarTermoResponsabilidadeHtml(dados);
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('Ana &lt;img'));
  assert.ok(html.includes('FER-0001'));
});

test('o Termo de Responsabilidade imprime a data do termo, sem cair no dia anterior', () => {
  const html = montarTermoResponsabilidadeHtml(dados);
  assert.ok(html.includes('30 de setembro de 2026'), 'data impressa errada');
});
