-- Aplicar após o schema base existente. Execute em transação e com backup.
BEGIN;
CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  papel text NOT NULL DEFAULT 'consulta' CHECK (papel IN ('admin','consulta')),
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.perfis(id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.gemape_ativo() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo);
$$;
CREATE FUNCTION public.gemape_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.perfis WHERE id = auth.uid() AND ativo AND papel = 'admin');
$$;
REVOKE ALL ON FUNCTION public.gemape_ativo(), public.gemape_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gemape_ativo(), public.gemape_admin() TO authenticated;
CREATE POLICY perfil_leitura ON public.perfis FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.gemape_admin());
GRANT SELECT ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;

CREATE FUNCTION public.gemape_novo_usuario() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.perfis(id) VALUES(NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER gemape_novo_usuario AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.gemape_novo_usuario();
REVOKE ALL ON FUNCTION public.gemape_novo_usuario() FROM PUBLIC, anon, authenticated;

-- Retorna 403 pelo PostgREST inclusive em UPDATE/DELETE sem linhas visíveis.
CREATE FUNCTION public.gemape_exigir_escrita() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.gemape_admin() THEN
    RAISE EXCEPTION 'Alteração permitida somente para administrador ativo' USING ERRCODE = '42501';
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.gemape_exigir_escrita() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['empresas','empregados','cadastros_auxiliares','epis','uniformes',
    'ferramentas','veiculos','movimentacoes','ocorrencias','compras_epis','compras_uniformes',
    'caixas_ferramentas','caixa_ferramenta_itens','itens'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname,t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
    EXECUTE format('CREATE POLICY leitura_ativa ON public.%I FOR SELECT TO authenticated USING (public.gemape_ativo())',t);
    EXECUTE format('CREATE POLICY escrita_admin ON public.%I FOR ALL TO authenticated USING (public.gemape_admin()) WITH CHECK (public.gemape_admin())',t);
    EXECUTE format('CREATE TRIGGER gemape_exigir_escrita BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.gemape_exigir_escrita()',t);
  END LOOP;
END $$;

-- Todas as categorias aceitam o mesmo payload de cadastro.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['epis','uniformes','ferramentas'] LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS marca text,
      ADD COLUMN IF NOT EXISTS modelo text,
      ADD COLUMN IF NOT EXISTS numero_serie text,
      ADD COLUMN IF NOT EXISTS ca text,
      ADD COLUMN IF NOT EXISTS tamanho text,
      ADD COLUMN IF NOT EXISTS cor text,
      ADD COLUMN IF NOT EXISTS unidade_medida text,
      ADD COLUMN IF NOT EXISTS data_validade date,
      ADD COLUMN IF NOT EXISTS data_aquisicao date,
      ADD COLUMN IF NOT EXISTS patrimonio text,
      ADD COLUMN IF NOT EXISTS nota_fiscal text,
      ADD COLUMN IF NOT EXISTS preco_unitario numeric(14,2)', t);
    -- NOT VALID preserva dados legados, mas valida toda gravação nova.
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT saldo_valido CHECK (estoque_atual >= 0 AND estoque_minimo >= 0 AND preco_unitario >= 0) NOT VALID',t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(empresa_id,nome)',t || '_empresa_nome',t);
  END LOOP;
END $$;
ALTER TABLE public.epis ADD COLUMN IF NOT EXISTS ca_validade date;
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS origem_empregado_id uuid REFERENCES public.empregados(id),
  ADD COLUMN IF NOT EXISTS origem_local text,
  ADD COLUMN IF NOT EXISTS destino_local text,
  ADD COLUMN IF NOT EXISTS prazo_devolucao date,
  ADD COLUMN IF NOT EXISTS conservacao text,
  ADD COLUMN IF NOT EXISTS preco_unitario_registrado numeric(14,2);
ALTER TABLE public.movimentacoes ADD CONSTRAINT quantidade_positiva CHECK (quantidade > 0) NOT VALID;
CREATE INDEX IF NOT EXISTS movimentacoes_custodia ON public.movimentacoes(modulo,item_id,empregado_id);

-- Diário independente: excluir a origem não apaga a evidência.
CREATE TABLE public.auditoria (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela text NOT NULL, registro_id uuid, acao text NOT NULL,
  anterior jsonb, posterior jsonb, usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.auditoria TO authenticated;
CREATE POLICY auditoria_admin ON public.auditoria FOR SELECT TO authenticated USING(public.gemape_admin());
CREATE FUNCTION public.gemape_auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.auditoria(tabela,registro_id,acao,anterior,posterior,usuario_id)
  VALUES(TG_TABLE_NAME,COALESCE(NEW.id,OLD.id),TG_OP,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,auth.uid());
  RETURN COALESCE(NEW,OLD);
END; $$;
REVOKE ALL ON FUNCTION public.gemape_auditar() FROM PUBLIC, anon, authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['perfis','empresas','empregados','epis','uniformes','ferramentas','veiculos',
    'movimentacoes','ocorrencias','compras_epis','compras_uniformes','caixas_ferramentas','caixa_ferramenta_itens'] LOOP
    EXECUTE format('CREATE TRIGGER gemape_auditar AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gemape_auditar()',t);
  END LOOP;
END $$;

-- Movimentações são imutáveis: correções exigem lançamentos compensatórios.
CREATE FUNCTION public.gemape_movimentacao_imutavel() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Histórico imutável: registre um lançamento compensatório' USING ERRCODE='42501'; END; $$;
CREATE TRIGGER gemape_movimentacao_imutavel BEFORE UPDATE OR DELETE ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.gemape_movimentacao_imutavel();
REVOKE ALL ON FUNCTION public.limpar_movimentacoes_antigas() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_auditoria_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_atualizar_estoque ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_movimentacoes_estoque ON public.movimentacoes;

CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque_v2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tabela text; item record; saldo integer; delta integer;
BEGIN
  IF NOT public.gemape_admin() THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
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
CREATE TRIGGER trg_movimentacoes_estoque BEFORE INSERT ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_estoque_v2();
REVOKE ALL ON FUNCTION public.aplicar_movimentacao_estoque_v2() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.salvar_caixa(p_id uuid, p_valores jsonb, p_itens jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE caixa uuid; registro record;
BEGIN
  IF NOT public.gemape_admin() THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
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
REVOKE ALL ON FUNCTION public.salvar_caixa(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_caixa(uuid,jsonb,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
