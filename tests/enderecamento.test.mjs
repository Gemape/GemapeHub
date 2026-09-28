import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('endereçamento: isolamento por empresa, papéis e endereço sem duplicidade', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    for (const f of ['apply_all_schema.sql','20260916000000_security_integrity.sql','20260916001000_purchases.sql',
      '20260928120000_empresa_papeis_rls.sql','20260928130000_enderecamentos.sql']) {
      await db.exec(await fs.readFile(`supabase/migrations/${f}`,'utf8'));
    }
    const [a, b] = (await db.query('SELECT id FROM empresas ORDER BY nome_fantasia LIMIT 2')).rows.map(r => r.id);
    const gestorA='30000000-0000-4000-8000-000000000001', operadorA='30000000-0000-4000-8000-000000000002', gestorB='30000000-0000-4000-8000-000000000003';
    await db.exec(`INSERT INTO auth.users VALUES('${gestorA}'),('${operadorA}'),('${gestorB}');
      UPDATE perfis SET ativo=true, papel='gestor', empresa_id='${a}' WHERE id='${gestorA}';
      UPDATE perfis SET ativo=true, papel='operador', empresa_id='${a}' WHERE id='${operadorA}';
      UPDATE perfis SET ativo=true, papel='gestor', empresa_id='${b}' WHERE id='${gestorB}';`);
    const como = id => db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
    const n = async () => (await db.query('SELECT count(*)::int n FROM enderecamentos')).rows[0].n;
    const inserir = (empresa, codigo, rua='A', prat='01', apto='101') =>
      db.query('INSERT INTO enderecamentos(empresa_id,codigo_produto,rua,prateleira,apartamento) VALUES($1,$2,$3,$4,$5) RETURNING id', [empresa, codigo, rua, prat, apto]);

    await como(gestorA);
    const { rows: [{ id }] } = await inserir(a, 'EPI-0001');
    await inserir(a, 'EPI-0002');
    await assert.rejects(inserir(a, 'epi-0001', ' a ', '01', '101'), e => e.code === '23505');
    await assert.rejects(inserir(b, 'EPI-0001'), e => e.code === '42501');
    await assert.rejects(inserir(a, '   '), e => e.code === '23514');
    await db.query("UPDATE enderecamentos SET prateleira='02' WHERE id=$1", [id]);
    assert.equal(await n(), 2);

    await como(operadorA);
    assert.equal(await n(), 2);
    await assert.rejects(inserir(a, 'EPI-0003'), e => e.code === '42501');
    await assert.rejects(db.exec('DELETE FROM enderecamentos'), e => e.code === '42501');

    await como(gestorB);
    assert.equal(await n(), 0);
    assert.equal((await db.query('DELETE FROM enderecamentos RETURNING id')).rows.length, 0);
    await inserir(b, 'EPI-0001');
    assert.equal(await n(), 1);
  } finally { await db.close(); }
});
