-- Vistoria periódica de ferramentas sem alterar o estoque.
-- Antes, o Termo de Vistoria gravava cada item como "Entrada", e cada vistoria somava a quantidade ao estoque.
-- Agora existe o tipo "Vistoria", que registra o fato na movimentação sem mexer no saldo.
-- Depende de 20260928120000_empresa_papeis_rls.sql.

-- 1. Aceita o tipo "Vistoria" onde a restrição antiga existir.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='check_movimentacoes_tipo_movimentacao'
             AND conrelid='public.movimentacoes'::regclass) THEN
    ALTER TABLE public.movimentacoes DROP CONSTRAINT check_movimentacoes_tipo_movimentacao;
    ALTER TABLE public.movimentacoes ADD CONSTRAINT check_movimentacoes_tipo_movimentacao
      CHECK (tipo_movimentacao IN ('Entrada','Saida','Devolucao','Transferencia','Vistoria'));
  END IF;
END $$;

-- 2. A rotina de estoque aceita "Vistoria" e só altera o saldo quando há variação.
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque_v2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tabela text; item record; saldo integer; delta integer;
BEGIN
  IF NOT public.gemape_pode_operar(NEW.empresa_id) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF NEW.quantidade IS NULL OR NEW.quantidade <= 0 OR NEW.tipo_movimentacao NOT IN ('Entrada','Saida','Devolucao','Transferencia','Vistoria') THEN
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
    -- Vistoria e Transferência só registram o fato; não mudam o saldo.
    delta := CASE NEW.tipo_movimentacao WHEN 'Entrada' THEN NEW.quantidade WHEN 'Devolucao' THEN NEW.quantidade WHEN 'Saida' THEN -NEW.quantidade ELSE 0 END;
    IF delta <> 0 THEN
      saldo := COALESCE(item.estoque_atual,0)+delta;
      IF saldo < 0 THEN RAISE EXCEPTION 'Estoque insuficiente' USING ERRCODE='23514'; END IF;
      EXECUTE format('UPDATE public.%I SET estoque_atual=$1 WHERE id=$2',tabela) USING saldo,NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
