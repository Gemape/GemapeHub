import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { lerNfe, extrairCa } from '../src/lib/nfe-xml.ts';

test('NF-e 4.00: lê emitente, número, chave e itens da nota fictícia', async () => {
  const nota = lerNfe(await fs.readFile('tests/fixtures/nfe-ficticia.xml', 'utf8'));
  assert.equal(nota.chave.length, 44);
  assert.equal(nota.numero, '1234');
  assert.equal(nota.serie, '1');
  assert.equal(nota.emissao, '2026-09-29');
  assert.deepEqual(nota.emitente, { cnpj: '00000000000191', nome: 'FORNECEDOR FICTICIO DE EPI & UNIFORMES LTDA' });
  assert.deepEqual(nota.itens.map((i) => [i.numero, i.codigo, i.ca]),
    [[1, 'CAP-7788', '12345'], [2, 'LUV-0042', '98765'], [3, 'CAM-M-AZ', ''], [4, 'FUR-500W', '']]);
  assert.equal(nota.itens[0].ean, '7890000000017');
  assert.equal(nota.itens[1].ean, '');
  assert.equal(nota.itens[1].unidade, 'PAR');
});

test('NF-e: aceita prefixo de namespace e nota sem nfeProc', () => {
  const xml = `<nfe:NFe xmlns:nfe="http://www.portalfiscal.inf.br/nfe"><nfe:infNFe Id="NFe${'1'.repeat(44)}" versao="4.00">
    <nfe:ide><nfe:nNF>7</nfe:nNF></nfe:ide><nfe:emit><nfe:CNPJ>11111111000111</nfe:CNPJ><nfe:xNome>X</nfe:xNome></nfe:emit>
    <nfe:det nItem="1"><nfe:prod><nfe:cProd>A&amp;B</nfe:cProd><nfe:xProd>ITEM</nfe:xProd></nfe:prod></nfe:det></nfe:infNFe></nfe:NFe>`;
  const nota = lerNfe(xml);
  assert.equal(nota.numero, '7');
  assert.equal(nota.itens[0].codigo, 'A&B');
});

test('NF-e: recusa arquivo que não é nota, nota sem itens e item sem código', () => {
  assert.throws(() => lerNfe('<html><body>oi</body></html>'), /não é um XML de NF-e/);
  assert.throws(() => lerNfe('<infNFe Id="NFe1"><ide/></infNFe>'), /não tem itens/);
  assert.throws(() => lerNfe('<infNFe><det nItem="1"><prod><xProd>X</xProd></prod></det></infNFe>'), /sem código/);
});

test('CA: reconhece as formas comuns e ignora palavras com "ca"', () => {
  for (const [texto, ca] of [['LUVA CA 12345', '12345'], ['C.A.: 4321', '4321'], ['CA nº 55555', '55555'],
    ['bota ca-40001 preta', '40001'], ['CALCA 42', ''], ['CAMISA TAM 44', ''], ['BRACADEIRA 123456', ''], ['sem ca', ''], ['BOTA PVC CANO 400MM', ''], ['BOTA CANO LONGO CA 37456', '37456'],
    ['CA N 98765', '98765'], ['CA No. 1234', '1234'], ['C.A. N° 22222', '22222']]) {
    assert.equal(extrairCa(texto), ca, texto);
  }
});
