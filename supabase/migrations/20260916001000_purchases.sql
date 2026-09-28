BEGIN;
-- Substitui rotinas antigas que debitavam/créditavam a tabela legada itens.
DROP TRIGGER IF EXISTS trg_compra_epi ON public.compras_epis;
DROP TRIGGER IF EXISTS trg_compra_uniforme ON public.compras_uniformes;
CREATE FUNCTION public.gemape_compra() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.quantidade IS NULL OR NEW.quantidade <= 0 OR NEW.valor_unitario IS NULL OR NEW.valor_unitario < 0 THEN
    RAISE EXCEPTION 'Quantidade e valor de compra inválidos' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.movimentacoes(modulo,tipo_movimentacao,quantidade,data_movimentacao,item_id,empresa_id,observacao)
  VALUES(CASE TG_TABLE_NAME WHEN 'compras_epis' THEN 'epi' ELSE 'uniforme' END,
    'Entrada',NEW.quantidade,NEW.data_compra,NEW.item_id,NEW.empresa_id,
    left('Compra: NF ' || COALESCE(NEW.nota_fiscal,'não informada') || ' / ' || NEW.fornecedor,500));
  RETURN NEW;
END; $$;
CREATE TRIGGER gemape_compra AFTER INSERT ON public.compras_epis FOR EACH ROW EXECUTE FUNCTION public.gemape_compra();
CREATE TRIGGER gemape_compra AFTER INSERT ON public.compras_uniformes FOR EACH ROW EXECUTE FUNCTION public.gemape_compra();
CREATE TRIGGER gemape_compra_imutavel BEFORE UPDATE OR DELETE ON public.compras_epis FOR EACH ROW EXECUTE FUNCTION public.gemape_movimentacao_imutavel();
CREATE TRIGGER gemape_compra_imutavel BEFORE UPDATE OR DELETE ON public.compras_uniformes FOR EACH ROW EXECUTE FUNCTION public.gemape_movimentacao_imutavel();
REVOKE ALL ON FUNCTION public.gemape_compra() FROM PUBLIC,anon,authenticated;
COMMIT;
