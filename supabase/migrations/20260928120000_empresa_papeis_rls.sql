-- Isolamento por empresa e papéis admin/gestor/operador aplicados no banco.
-- Aplicar após 20260916000000_security_integrity.sql e 20260916001000_purchases.sql.
-- Execute em transação e com backup. Não altera dados de negócio.
--   admin    : todas as empresas, leitura e escrita, gerencia usuários
--   gestor   : somente a própria empresa (perfis.empresa_id), leitura e escrita
--   operador : somente a própria empresa, leitura; registra movimentações e ocorrências
BEGIN;

-- 1. Perfis: empresa e novos papéis. "consulta" passa a ser "operador".
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;
DO $$ DECLARE c text; BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.perfis'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%papel%' LOOP
    EXECUTE format('ALTER TABLE public.perfis DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
UPDATE public.perfis SET papel = 'operador' WHERE papel = 'consulta';
ALTER TABLE public.perfis ALTER COLUMN papel SET DEFAULT 'operador';
ALTER TABLE public.perfis ADD CONSTRAINT perfis_papel_check CHECK (papel IN ('admin','gestor','operador'));
CREATE INDEX IF NOT EXISTS perfis_empresa ON public.perfis(empresa_id);
-- Os privilégios padrão do Supabase concedem tudo a anon/authenticated; perfis só é alterado pelo servidor (service role).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.perfis FROM anon, authenticated;

-- 2. Funções de acesso. Perfil inativo ou sem empresa (não admin) não enxerga nada.
CREATE OR REPLACE FUNCTION public.gemape_papel() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT papel FROM public.perfis WHERE id = auth.uid() AND ativo;
$$;
CREATE OR REPLACE FUNCTION public.gemape_pode_ver(p_empresa uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo
    AND (papel = 'admin' OR (empresa_id IS NOT NULL AND empresa_id = p_empresa)));
$$;
CREATE OR REPLACE FUNCTION public.gemape_pode_gerir(p_empresa uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo
    AND (papel = 'admin' OR (papel = 'gestor' AND empresa_id IS NOT NULL AND empresa_id = p_empresa)));
$$;
CREATE OR REPLACE FUNCTION public.gemape_pode_operar(p_empresa uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo
    AND (papel = 'admin' OR (papel IN ('gestor','operador') AND empresa_id IS NOT NULL AND empresa_id = p_empresa)));
$$;
CREATE OR REPLACE FUNCTION public.gemape_empresa_da_caixa(p_caixa uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT empresa_id FROM public.caixas_ferramentas WHERE id = p_caixa;
$$;
REVOKE ALL ON FUNCTION public.gemape_papel(), public.gemape_pode_ver(uuid), public.gemape_pode_gerir(uuid),
  public.gemape_pode_operar(uuid), public.gemape_empresa_da_caixa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gemape_papel(), public.gemape_pode_ver(uuid), public.gemape_pode_gerir(uuid),
  public.gemape_pode_operar(uuid), public.gemape_empresa_da_caixa(uuid) TO authenticated;

-- 3. Ocorrências passam a ter empresa, derivada do empregado, veículo ou item.
ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.gemape_ocorrencia_empresa() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.empresa_id := COALESCE(
    (SELECT empresa_id FROM public.empregados WHERE id = NEW.empregado_id),
    (SELECT empresa_id FROM public.veiculos WHERE id = NEW.veiculo_id),
    (SELECT empresa_id FROM public.epis WHERE id = NEW.item_id),
    (SELECT empresa_id FROM public.uniformes WHERE id = NEW.item_id),
    (SELECT empresa_id FROM public.ferramentas WHERE id = NEW.item_id),
    NEW.empresa_id);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.gemape_ocorrencia_empresa() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS gemape_ocorrencia_empresa ON public.ocorrencias;
CREATE TRIGGER gemape_ocorrencia_empresa BEFORE INSERT OR UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.gemape_ocorrencia_empresa();
-- Backfill roda sem usuário logado; o bloqueio por papel é suspenso só nesta instrução.
ALTER TABLE public.ocorrencias DISABLE TRIGGER gemape_exigir_escrita;
UPDATE public.ocorrencias o SET empresa_id = COALESCE(
    (SELECT empresa_id FROM public.empregados WHERE id = o.empregado_id),
    (SELECT empresa_id FROM public.veiculos WHERE id = o.veiculo_id),
    (SELECT empresa_id FROM public.epis WHERE id = o.item_id),
    (SELECT empresa_id FROM public.uniformes WHERE id = o.item_id),
    (SELECT empresa_id FROM public.ferramentas WHERE id = o.item_id))
  WHERE empresa_id IS NULL;
ALTER TABLE public.ocorrencias ENABLE TRIGGER gemape_exigir_escrita;
CREATE INDEX IF NOT EXISTS ocorrencias_empresa ON public.ocorrencias(empresa_id);

-- 4. Bloqueio por comando (403 mesmo sem linhas visíveis), agora por papel.
CREATE OR REPLACE FUNCTION public.gemape_exigir_escrita() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE papel text := public.gemape_papel();
BEGIN
  -- Gravações feitas pelas próprias rotinas do banco (ex.: baixa de estoque da movimentação).
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF papel = 'admin' THEN RETURN NULL; END IF;
  IF papel = 'gestor' AND TG_TABLE_NAME NOT IN ('empresas','cadastros_auxiliares') THEN RETURN NULL; END IF;
  IF papel = 'operador' AND TG_OP = 'INSERT' AND TG_TABLE_NAME IN ('movimentacoes','ocorrencias') THEN RETURN NULL; END IF;
  RAISE EXCEPTION 'Alteração não permitida para o seu perfil' USING ERRCODE = '42501';
END; $$;

-- 5. Políticas: substitui leitura_ativa/escrita_admin por regras por empresa.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['empresas','empregados','cadastros_auxiliares','epis','uniformes',
    'ferramentas','veiculos','movimentacoes','ocorrencias','compras_epis','compras_uniformes',
    'caixas_ferramentas','caixa_ferramenta_itens','itens'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- TRUNCATE ignora RLS e gatilhos por linha.
    EXECUTE format('REVOKE TRUNCATE ON public.%I FROM anon, authenticated', t);

    IF t = 'empresas' THEN
      CREATE POLICY empresa_leitura ON public.empresas FOR SELECT TO authenticated USING (public.gemape_pode_ver(id));
      CREATE POLICY empresa_escrita ON public.empresas FOR ALL TO authenticated USING (public.gemape_admin()) WITH CHECK (public.gemape_admin());
    ELSIF t = 'cadastros_auxiliares' THEN
      -- Listas de apoio compartilhadas pelas três empresas.
      CREATE POLICY empresa_leitura ON public.cadastros_auxiliares FOR SELECT TO authenticated USING (public.gemape_ativo());
      CREATE POLICY empresa_escrita ON public.cadastros_auxiliares FOR ALL TO authenticated USING (public.gemape_admin()) WITH CHECK (public.gemape_admin());
    ELSIF t = 'caixa_ferramenta_itens' THEN
      CREATE POLICY empresa_leitura ON public.caixa_ferramenta_itens FOR SELECT TO authenticated
        USING (public.gemape_pode_ver(public.gemape_empresa_da_caixa(caixa_id)));
      CREATE POLICY empresa_escrita ON public.caixa_ferramenta_itens FOR ALL TO authenticated
        USING (public.gemape_pode_gerir(public.gemape_empresa_da_caixa(caixa_id)))
        WITH CHECK (public.gemape_pode_gerir(public.gemape_empresa_da_caixa(caixa_id)));
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='empresa_id') THEN
      EXECUTE format('CREATE POLICY empresa_leitura ON public.%I FOR SELECT TO authenticated USING (public.gemape_pode_ver(empresa_id))', t);
      EXECUTE format('CREATE POLICY empresa_escrita ON public.%I FOR ALL TO authenticated USING (public.gemape_pode_gerir(empresa_id)) WITH CHECK (public.gemape_pode_gerir(empresa_id))', t);
      IF t IN ('movimentacoes','ocorrencias') THEN
        EXECUTE format('CREATE POLICY empresa_registro ON public.%I FOR INSERT TO authenticated WITH CHECK (public.gemape_pode_operar(empresa_id))', t);
      END IF;
    ELSE
      -- Tabela legada sem empresa: somente administrador.
      EXECUTE format('CREATE POLICY empresa_leitura ON public.%I FOR SELECT TO authenticated USING (public.gemape_admin())', t);
      EXECUTE format('CREATE POLICY empresa_escrita ON public.%I FOR ALL TO authenticated USING (public.gemape_admin()) WITH CHECK (public.gemape_admin())', t);
    END IF;
  END LOOP;
END $$;

-- 6. Rotinas que antes exigiam admin passam a checar papel e empresa.
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque_v2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tabela text; item record; saldo integer; delta integer;
BEGIN
  IF NOT public.gemape_pode_operar(NEW.empresa_id) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF NEW.quantidade IS NULL OR NEW.quantidade <= 0 OR NEW.tipo_movimentacao NOT IN ('Entrada','Saida','Devolucao','Transferencia') THEN
    RAISE EXCEPTION 'Quantidade ou tipo inválido' USING ERRCODE='23514';
  END IF;
  NEW.responsavel_id := auth.uid();
  NEW.created_at := now();
  IF NEW.modulo = 'veiculo' THEN
    IF NEW.veiculo_id IS NULL OR NEW.item_id IS NOT NULL THEN RAISE EXCEPTION 'Veículo inválido'; END IF;
    SELECT empresa_id INTO item FROM public.veiculos WHERE id=NEW.veiculo_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Veículo inexistente'; END IF;
  ELSE
    tabela := CASE NEW.modulo WHEN 'epi' THEN 'epis' WHEN 'uniforme' THEN 'uniformes' WHEN 'ferramenta' THEN 'ferramentas' END;
    IF tabela IS NULL OR NEW.item_id IS NULL OR NEW.veiculo_id IS NOT NULL THEN RAISE EXCEPTION 'Item ou módulo inválido'; END IF;
    EXECUTE format('SELECT empresa_id, estoque_atual, preco_unitario FROM public.%I WHERE id=$1 FOR UPDATE',tabela) INTO item USING NEW.item_id;
    IF item.empresa_id IS NULL THEN RAISE EXCEPTION 'Item inexistente ou sem empresa'; END IF;
    NEW.preco_unitario_registrado := item.preco_unitario;
  END IF;
  IF NEW.empresa_id IS DISTINCT FROM item.empresa_id THEN RAISE EXCEPTION 'Empresa incompatível com o patrimônio'; END IF;
  IF NEW.empregado_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.empregados WHERE id=NEW.empregado_id AND ativo AND empresa_id=NEW.empresa_id) THEN
    RAISE EXCEPTION 'Empregado inativo ou de outra empresa';
  END IF;
  IF NEW.tipo_movimentacao = 'Transferencia' AND
    (nullif(trim(NEW.origem_local),'') IS NULL OR nullif(trim(NEW.destino_local),'') IS NULL OR NEW.origem_local=NEW.destino_local) THEN
    RAISE EXCEPTION 'Informe origem e destino distintos';
  END IF;
  IF NEW.modulo <> 'veiculo' THEN
    delta := CASE NEW.tipo_movimentacao WHEN 'Entrada' THEN NEW.quantidade WHEN 'Devolucao' THEN NEW.quantidade WHEN 'Saida' THEN -NEW.quantidade ELSE 0 END;
    saldo := COALESCE(item.estoque_atual,0)+delta;
    IF saldo < 0 THEN RAISE EXCEPTION 'Estoque insuficiente' USING ERRCODE='23514'; END IF;
    EXECUTE format('UPDATE public.%I SET estoque_atual=$1 WHERE id=$2',tabela) USING saldo,NEW.item_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.salvar_caixa(p_id uuid, p_valores jsonb, p_itens jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE caixa uuid; registro record;
BEGIN
  IF NOT public.gemape_pode_gerir((p_valores->>'empresa_id')::uuid) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_itens) <> 'array' OR length(trim(p_valores->>'nome')) < 1 THEN RAISE EXCEPTION 'Caixa inválida'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.caixas_ferramentas(empresa_id,nome,descricao,responsavel_id,localizacao,status)
    VALUES((p_valores->>'empresa_id')::uuid,p_valores->>'nome',p_valores->>'descricao',
      (p_valores->>'responsavel_id')::uuid,p_valores->>'localizacao',COALESCE(p_valores->>'status','Ativa')) RETURNING id INTO caixa;
  ELSE
    UPDATE public.caixas_ferramentas SET empresa_id=(p_valores->>'empresa_id')::uuid,nome=p_valores->>'nome',
      descricao=p_valores->>'descricao',responsavel_id=(p_valores->>'responsavel_id')::uuid,
      localizacao=p_valores->>'localizacao',status=p_valores->>'status' WHERE id=p_id RETURNING id INTO caixa;
    IF caixa IS NULL THEN RAISE EXCEPTION 'Caixa inexistente'; END IF;
    DELETE FROM public.caixa_ferramenta_itens WHERE caixa_id=caixa;
  END IF;
  FOR registro IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(ferramenta_id uuid,quantidade integer,observacao text) LOOP
    IF NOT EXISTS(SELECT 1 FROM public.ferramentas WHERE id=registro.ferramenta_id AND empresa_id=(p_valores->>'empresa_id')::uuid) THEN
      RAISE EXCEPTION 'Ferramenta inexistente ou de outra empresa';
    END IF;
    INSERT INTO public.caixa_ferramenta_itens(caixa_id,ferramenta_id,quantidade,observacao)
      VALUES(caixa,registro.ferramenta_id,registro.quantidade,registro.observacao);
  END LOOP;
  RETURN caixa;
END; $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
