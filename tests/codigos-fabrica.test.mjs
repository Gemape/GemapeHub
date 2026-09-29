import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('código de fábrica: isolamento por empresa, papéis, CA só em EPI e sem duplicidade', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    for (const f of ['apply_all_schema.sql','20260916000000_security_integrity.sql','20260916001000_purchases.sql',
      '20260928120000_empresa_papeis_rls.sql','20260929120000_codigos_fabrica.sql']) {
      await db.exec(await fs.readFile(`supabase/migrations/${f}`,'utf8'));
    }
    const [a, b] = (await db.query('SELECT id FROM empresas ORDER BY nome_fantasia LIMIT 2')).rows.map(r => r.id);
    const gestorA='30000000-0000-4000-8000-000000000001', operadorA='30000000-0000-4000-8000-000000000002', gestorB='30000000-0000-4000-8000-000000000003';
    await db.exec(`INSERT INTO auth.users VALUES('${gestorA}'),('${operadorA}'),('${gestorB}');
      UPDATE perfis SET ativo=true, papel='gestor', empresa_id='${a}' WHERE id='${gestorA}';
      UPDATE perfis SET ativo=true, papel='operador', empresa_id='${a}' WHERE id='${operadorA}';
      UPDATE perfis SET ativo=true, papel='gestor', empresa_id='${b}' WHERE id='${gestorB}';`);
    const como = id => db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
    const n = async () => (await db.query('SELECT count(*)::int n FROM codigos_fabrica')).rows[0].n;
    const inserir = (empresa, item, { modulo='epi', ca=null, fornecedor='FORN-01', cnpj=null, chave=null } = {}) =>
      db.query(`INSERT INTO codigos_fabrica(empresa_id,modulo,codigo_gemape,codigo_fornecedor,codigo_item_fornecedor,ca,fornecedor_cnpj,nota_chave)
        VALUES($1,$2,'EPI-0001',$3,$4,$5,$6,$7) RETURNING id`, [empresa, modulo, fornecedor, item, ca, cnpj, chave]);

    await como(gestorA);
    const { rows: [{ id }] } = await inserir(a, 'CAP-7788', { ca: '12345', cnpj: '00000000000191', chave: '3'.repeat(44) });
    await inserir(a, 'CAM-M-AZ', { modulo: 'uniforme' });
    await inserir(a, 'CAP-7788', { fornecedor: 'FORN-02' });
    await assert.rejects(inserir(a, ' cap-7788 ', { fornecedor: 'forn-01' }), e => e.code === '23505');
    await assert.rejects(inserir(a, 'X1', { modulo: 'uniforme', ca: '123' }), e => e.code === '23514');
    await assert.rejects(inserir(a, 'X2', { modulo: 'veiculo' }), e => e.code === '23514');
    await assert.rejects(inserir(a, 'X3', { cnpj: '123' }), e => e.code === '23514');
    await assert.rejects(inserir(a, 'X4', { chave: '1234' }), e => e.code === '23514');
    await assert.rejects(inserir(a, '   '), e => e.code === '23514');
    await assert.rejects(inserir(b, 'CAP-9999'), e => e.code === '42501');
    await db.query("UPDATE codigos_fabrica SET ca='54321' WHERE id=$1", [id]);
    assert.equal(await n(), 3);

    await como(operadorA);
    assert.equal(await n(), 3);
    await assert.rejects(inserir(a, 'LUV-0042'), e => e.code === '42501');
    await assert.rejects(db.exec('DELETE FROM codigos_fabrica'), e => e.code === '42501');

    await como(gestorB);
    assert.equal(await n(), 0);
    assert.equal((await db.query('DELETE FROM codigos_fabrica RETURNING id')).rows.length, 0);
    await inserir(b, 'CAP-7788');
    assert.equal(await n(), 1);
  } finally { await db.close(); }
});
