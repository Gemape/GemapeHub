import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migração, RBAC, transações e diário patrimonial', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    await db.exec(await fs.readFile('supabase/migrations/apply_all_schema.sql','utf8'));
    await db.exec(await fs.readFile('supabase/migrations/20260916000000_security_integrity.sql','utf8'));
    await db.exec(await fs.readFile('supabase/migrations/20260916001000_purchases.sql','utf8'));
    await db.exec(await fs.readFile('supabase/migrations/20260928120000_empresa_papeis_rls.sql','utf8'));
    const admin='10000000-0000-4000-8000-000000000001', consulta='10000000-0000-4000-8000-000000000002';
    await db.exec(`INSERT INTO auth.users VALUES('${admin}'),('${consulta}');
      UPDATE public.perfis SET ativo=true,papel='admin' WHERE id='${admin}';
      UPDATE public.perfis SET ativo=true, empresa_id=(SELECT id FROM public.empresas ORDER BY nome_fantasia LIMIT 1) WHERE id='${consulta}';`);
    const empresa=(await db.query('SELECT id FROM empresas ORDER BY nome_fantasia LIMIT 1')).rows[0].id;
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${consulta}',false);`);
    assert.equal((await db.query('SELECT count(*)::int n FROM empresas')).rows[0].n,1);
    for (const sql of ["INSERT INTO empresas(nome_fantasia,razao_social,cnpj) VALUES('X','X','1')", "UPDATE empresas SET nome_fantasia='X' WHERE false", 'DELETE FROM empresas WHERE false']) {
      await assert.rejects(db.exec(sql), e => e.code === '42501');
    }
    await assert.rejects(db.exec("UPDATE perfis SET papel='admin'"), e => e.code === '42501');
    await assert.rejects(db.exec('SELECT limpar_movimentacoes_antigas()'), e => e.code === '42501');
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${admin}',false);`);
    const item=(await db.query(`INSERT INTO ferramentas(empresa_id,nome,codigo_sku,categoria,estoque_atual,preco_unitario) VALUES($1,'Furadeira','F-1','Elétrica',5,100) RETURNING id`,[empresa])).rows[0].id;
    const movimento=(tipo,qtd,extra='')=>`INSERT INTO movimentacoes(empresa_id,item_id,modulo,tipo_movimentacao,quantidade${extra ? ',origem_local,destino_local' : ''}) VALUES('${empresa}','${item}','ferramenta','${tipo}',${qtd}${extra})`;
    await db.exec(movimento('Saida',2));
    const saldo=async()=> (await db.query('SELECT estoque_atual FROM ferramentas WHERE id=$1',[item])).rows[0].estoque_atual;
    assert.equal(await saldo(),3);
    await assert.rejects(db.exec(movimento('Saida',4)), /Estoque insuficiente/);
    assert.equal(await saldo(),3);
    await db.exec(movimento('Devolucao',1)); assert.equal(await saldo(),4);
    await db.exec(movimento('Transferencia',1,",'Obra A','Obra B'")); assert.equal(await saldo(),4);
    await assert.rejects(db.exec(movimento('Transferencia',1)), /origem e destino/);
    await assert.rejects(db.exec('DELETE FROM movimentacoes'), /Histórico imutável/);
    assert.equal((await db.query('SELECT responsavel_id FROM movimentacoes LIMIT 1')).rows[0].responsavel_id,admin);
    const values={empresa_id:empresa,nome:'Caixa de teste',status:'Ativa'};
    const caixa=(await db.query('SELECT salvar_caixa(null,$1::jsonb,$2::jsonb) id',[JSON.stringify(values),JSON.stringify([{ferramenta_id:item,quantidade:1}])])).rows[0].id;
    await assert.rejects(db.query('SELECT salvar_caixa($1,$2::jsonb,$3::jsonb)',[caixa,JSON.stringify({...values,nome:'Não deve persistir'}),JSON.stringify([{ferramenta_id:item,quantidade:0}])]), /quantidade/);
    assert.equal((await db.query('SELECT nome FROM caixas_ferramentas WHERE id=$1',[caixa])).rows[0].nome,'Caixa de teste');
    assert.equal((await db.query('SELECT count(*)::int n FROM caixa_ferramenta_itens WHERE caixa_id=$1',[caixa])).rows[0].n,1);
    const epi=(await db.query(`INSERT INTO epis(empresa_id,nome,codigo_sku,categoria,estoque_atual,preco_unitario) VALUES($1,'Capacete','E-1','Capacete',0,50) RETURNING id`,[empresa])).rows[0].id;
    await db.query(`INSERT INTO compras_epis(empresa_id,item_id,fornecedor,quantidade,valor_unitario) VALUES($1,$2,'Fornecedor',3,50)`,[empresa,epi]);
    assert.equal((await db.query('SELECT estoque_atual FROM epis WHERE id=$1',[epi])).rows[0].estoque_atual,3);
    assert.equal((await db.query(`SELECT count(*)::int n FROM movimentacoes WHERE item_id=$1 AND tipo_movimentacao='Entrada'`,[epi])).rows[0].n,1);
    assert.ok((await db.query('SELECT count(*)::int n FROM auditoria')).rows[0].n > 0);
    await db.exec(`RESET ROLE; UPDATE perfis SET ativo=false WHERE id='${consulta}'; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${consulta}',false);`);
    assert.equal((await db.query('SELECT count(*)::int n FROM empresas')).rows[0].n,0);
  } finally { await db.close(); }
});

test('isolamento por empresa e papéis admin, gestor e operador', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    for (const f of ['apply_all_schema.sql','20260916000000_security_integrity.sql','20260916001000_purchases.sql','20260928120000_empresa_papeis_rls.sql']) {
      await db.exec(await fs.readFile(`supabase/migrations/${f}`,'utf8'));
    }
    const [a, b] = (await db.query('SELECT id FROM empresas ORDER BY nome_fantasia LIMIT 2')).rows.map(r => r.id);
    const admin='20000000-0000-4000-8000-000000000001', gestorA='20000000-0000-4000-8000-000000000002',
      operadorA='20000000-0000-4000-8000-000000000003', semEmpresa='20000000-0000-4000-8000-000000000004';
    await db.exec(`INSERT INTO auth.users VALUES('${admin}'),('${gestorA}'),('${operadorA}'),('${semEmpresa}');
      UPDATE perfis SET ativo=true, papel='admin' WHERE id='${admin}';
      UPDATE perfis SET ativo=true, papel='gestor', empresa_id='${a}' WHERE id='${gestorA}';
      UPDATE perfis SET ativo=true, papel='operador', empresa_id='${a}' WHERE id='${operadorA}';
      UPDATE perfis SET ativo=true, papel='operador' WHERE id='${semEmpresa}';`);
    await assert.rejects(db.exec(`UPDATE perfis SET papel='consulta' WHERE id='${admin}'`), /perfis_papel_check/);
    const como = id => db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`);
    const n = async sql => (await db.query(sql)).rows[0].n;
    const ferramenta = (empresa, sku) => `INSERT INTO ferramentas(empresa_id,nome,codigo_sku,categoria,estoque_atual,preco_unitario) VALUES('${empresa}','F','${sku}','Elétrica',5,10) RETURNING id`;

    await como(admin);
    const itemA = (await db.query(ferramenta(a,'A-1'))).rows[0].id;
    const itemB = (await db.query(ferramenta(b,'B-1'))).rows[0].id;
    const empregadoB = (await db.query(`INSERT INTO empregados(empresa_id,nome,cpf) VALUES('${b}','Beto','111') RETURNING id`)).rows[0].id;
    await db.exec(`INSERT INTO ocorrencias(responsavel_registro,descricao_ocorrencia,tipo_ocorrencia,empregado_id) VALUES('Admin','Quebra','Quebra','${empregadoB}')`);
    assert.equal(await n('SELECT count(*)::int n FROM empresas'), 3);
    assert.equal(await n('SELECT count(*)::int n FROM ferramentas'), 2);
    assert.equal((await db.query('SELECT empresa_id FROM ocorrencias')).rows[0].empresa_id, b);

    await como(gestorA);
    assert.equal(await n('SELECT count(*)::int n FROM empresas'), 1);
    assert.equal(await n('SELECT count(*)::int n FROM ferramentas'), 1);
    assert.equal(await n('SELECT count(*)::int n FROM ocorrencias'), 0);
    await db.query(ferramenta(a,'A-2'));
    await assert.rejects(db.query(ferramenta(b,'B-2')), e => e.code === '42501');
    assert.equal((await db.query(`UPDATE ferramentas SET nome='X' WHERE id='${itemB}' RETURNING id`)).rows.length, 0);
    await assert.rejects(db.exec("UPDATE empresas SET nome_fantasia='X'"), e => e.code === '42501');
    await db.exec(`INSERT INTO movimentacoes(empresa_id,item_id,modulo,tipo_movimentacao,quantidade) VALUES('${a}','${itemA}','ferramenta','Saida',1)`);
    await assert.rejects(db.exec(`INSERT INTO movimentacoes(empresa_id,item_id,modulo,tipo_movimentacao,quantidade) VALUES('${b}','${itemB}','ferramenta','Saida',1)`), /Acesso negado/);
    await assert.rejects(db.query('SELECT salvar_caixa(null,$1::jsonb,$2::jsonb)', [JSON.stringify({ empresa_id: b, nome: 'Caixa B' }), '[]']), /Acesso negado/);
    await db.query('SELECT salvar_caixa(null,$1::jsonb,$2::jsonb)', [JSON.stringify({ empresa_id: a, nome: 'Caixa A' }), JSON.stringify([{ ferramenta_id: itemA, quantidade: 1 }])]);
    assert.equal(await n('SELECT count(*)::int n FROM caixa_ferramenta_itens'), 1);

    await como(operadorA);
    assert.equal(await n('SELECT count(*)::int n FROM ferramentas'), 2);
    assert.equal(await n('SELECT count(*)::int n FROM caixa_ferramenta_itens'), 1);
    await assert.rejects(db.query(ferramenta(a,'A-3')), e => e.code === '42501');
    await assert.rejects(db.exec(`UPDATE ferramentas SET nome='X' WHERE id='${itemA}'`), e => e.code === '42501');
    await db.exec(`INSERT INTO movimentacoes(empresa_id,item_id,modulo,tipo_movimentacao,quantidade) VALUES('${a}','${itemA}','ferramenta','Devolucao',1)`);
    await assert.rejects(db.exec(`INSERT INTO movimentacoes(empresa_id,item_id,modulo,tipo_movimentacao,quantidade) VALUES('${b}','${itemB}','ferramenta','Devolucao',1)`), /Acesso negado/);
    await db.exec(`INSERT INTO ocorrencias(responsavel_registro,descricao_ocorrencia,tipo_ocorrencia,empresa_id) VALUES('Op','Perda','Perda','${a}')`);
    await assert.rejects(db.exec(`INSERT INTO ocorrencias(responsavel_registro,descricao_ocorrencia,tipo_ocorrencia,empregado_id,empresa_id) VALUES('Op','Perda','Perda','${empregadoB}','${a}')`), e => e.code === '42501');
    await assert.rejects(db.exec('DELETE FROM ocorrencias'), e => e.code === '42501');
    assert.equal(await n('SELECT count(*)::int n FROM ocorrencias'), 1);

    await como(semEmpresa);
    assert.equal(await n('SELECT count(*)::int n FROM empresas'), 0);
    assert.equal(await n('SELECT count(*)::int n FROM ferramentas'), 0);
  } finally { await db.close(); }
});
