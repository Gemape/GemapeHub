-- Migration: Final Schema Alignment and PostgREST Cache Refresh
-- Date: 2026-09-10
-- Author: Trae Agent

-- 1. Ensure 'veiculos' columns are correct as per spec
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'ano_fabricacao') THEN
        ALTER TABLE public.veiculos RENAME COLUMN ano_fabricacao TO ano;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'km_atual') THEN
        ALTER TABLE public.veiculos RENAME COLUMN km_atual TO quilometragem_atual;
    END IF;
END $$;

-- 2. Fix foreign keys in 'movimentacoes' to point to specific tables or keep them generic but valid
-- Since 'movimentacoes' has 'item_id', and UUIDs are preserved, it technically works.
-- But we should update the FK constraint if it was pointing to 'itens'.
ALTER TABLE public.movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_item_id_fkey;

-- 3. Fix 'caixa_ferramenta_itens' to point to 'ferramentas' instead of 'itens'
ALTER TABLE public.caixa_ferramenta_itens DROP CONSTRAINT IF EXISTS caixa_ferramenta_itens_ferramenta_id_fkey;
ALTER TABLE public.caixa_ferramenta_itens 
  ADD CONSTRAINT caixa_ferramenta_itens_ferramenta_id_fkey 
  FOREIGN KEY (ferramenta_id) REFERENCES public.ferramentas(id) ON DELETE CASCADE;

-- 4. Fix 'compras_epis' and 'compras_uniformes' FKs
ALTER TABLE public.compras_epis DROP CONSTRAINT IF EXISTS compras_epis_item_id_fkey;
ALTER TABLE public.compras_epis 
  ADD CONSTRAINT compras_epis_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES public.epis(id) ON DELETE CASCADE;

ALTER TABLE public.compras_uniformes DROP CONSTRAINT IF EXISTS compras_uniformes_item_id_fkey;
ALTER TABLE public.compras_uniformes 
  ADD CONSTRAINT compras_uniformes_item_id_fkey 
  FOREIGN KEY (item_id) REFERENCES public.uniformes(id) ON DELETE CASCADE;

-- 5. Fix 'ocorrencias' FK
ALTER TABLE public.ocorrencias DROP CONSTRAINT IF EXISTS ocorrencias_item_id_fkey;

-- 6. Create a VIEW 'itens' for backward compatibility
-- This prevents "Could not find column of itens" errors if any legacy query still hits it.
DROP VIEW IF EXISTS public.itens;
CREATE VIEW public.itens AS
  SELECT id, empresa_id, nome as descricao, codigo_sku as codigo, categoria, ca as ca_certificado, tamanho, unidade_medida, estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at, 'epi' as modulo, NULL::text as marca, NULL::text as modelo, NULL::text as numero_serie, NULL::text as cor, NULL::text as caixa
  FROM public.epis
  UNION ALL
  SELECT id, empresa_id, nome as descricao, codigo_sku as codigo, categoria, NULL as ca_certificado, tamanho, unidade_medida, estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at, 'uniforme' as modulo, NULL::text as marca, NULL::text as modelo, NULL::text as numero_serie, cor, NULL::text as caixa
  FROM public.uniformes
  UNION ALL
  SELECT id, empresa_id, nome as descricao, codigo_sku as codigo, categoria, NULL as ca_certificado, NULL as tamanho, NULL as unidade_medida, estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at, 'ferramenta' as modulo, marca, modelo, numero_serie, NULL::text as cor, NULL::text as caixa
  FROM public.ferramentas;

-- 7. Grant permissions on the view
GRANT SELECT ON public.itens TO authenticated;
GRANT SELECT ON public.itens TO service_role;

-- 8. Force Schema Cache Refresh by updating comments on ALL related tables
COMMENT ON TABLE public.epis IS 'Cadastro de EPIs - Final Sync 2026-09-10';
COMMENT ON TABLE public.uniformes IS 'Cadastro de Uniformes - Final Sync 2026-09-10';
COMMENT ON TABLE public.ferramentas IS 'Cadastro de Ferramentas - Final Sync 2026-09-10';
COMMENT ON TABLE public.veiculos IS 'Cadastro de Veículos - Final Sync 2026-09-10';
COMMENT ON TABLE public.caixas_ferramentas IS 'Cadastro de Caixas de Ferramentas - Final Sync 2026-09-10';
COMMENT ON TABLE public.caixa_ferramenta_itens IS 'Vinculação N:N Caixas e Ferramentas - Final Sync 2026-09-10';
COMMENT ON VIEW public.itens IS 'Vista de compatibilidade legada para itens - Final Sync 2026-09-10';
