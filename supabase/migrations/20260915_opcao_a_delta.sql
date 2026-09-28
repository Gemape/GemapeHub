-- =============================================================
-- 20260915_opcao_a_delta.sql
-- Pré-requisito: apply_all_schema.sql já aplicado
-- Idempotente — pode rodar mais de uma vez sem duplicar dados
-- Verificação pré-migração (PASSO 0): tabela itens está VAZIA
-- (Content-Range: */0 confirmado via API em 2026-09-15)
-- =============================================================

-- 1) COLUNAS DO PAYLOAD UNIFICADO DO FRONTEND
--    (aprovadas explicitamente — payload unificado de ItensModulo.tsx)

ALTER TABLE public.ferramentas
  ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC,
  ADD COLUMN IF NOT EXISTS ca TEXT,
  ADD COLUMN IF NOT EXISTS tamanho TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS data_validade DATE;

ALTER TABLE public.epis
  ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC,
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS data_validade DATE;

ALTER TABLE public.uniformes
  ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC,
  ADD COLUMN IF NOT EXISTS ca TEXT,
  ADD COLUMN IF NOT EXISTS data_validade DATE;

-- 2) MIGRAÇÃO DE DADOS itens → split
--    Mapeamento de nomes: descricao→nome | codigo→codigo_sku |
--    ca_certificado→ca | estado→status (coluna itens não tem 'status')
--    ON CONFLICT (id) DO NOTHING — idempotente e seguro

INSERT INTO public.ferramentas
  (id, empresa_id, nome, codigo_sku, categoria, marca, modelo, numero_serie,
   ca, tamanho, cor, preco_unitario, estoque_minimo, estoque_atual,
   status, created_at, updated_at)
SELECT
  i.id, i.empresa_id, i.descricao, i.codigo,
  'Não categorizado',
  i.marca, i.modelo,
  COALESCE(i.numero_serie, 'SN-' || i.id::text),
  i.ca_certificado, i.tamanho, i.cor, i.preco_unitario,
  i.estoque_minimo, i.estoque_atual,
  COALESCE(i.estado, 'Ativo'),
  i.created_at, now()
FROM public.itens i
WHERE lower(i.modulo) IN ('ferramenta', 'ferramentas')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.epis
  (id, empresa_id, nome, codigo_sku, categoria, ca, tamanho, cor, unidade_medida,
   preco_unitario, estoque_minimo, estoque_atual,
   status, created_at, updated_at)
SELECT
  i.id, i.empresa_id, i.descricao, i.codigo,
  'Não categorizado',
  COALESCE(i.ca_certificado, 'N/A'),
  i.tamanho, i.cor, i.unidade_medida, i.preco_unitario,
  i.estoque_minimo, i.estoque_atual,
  COALESCE(i.estado, 'Ativo'),
  i.created_at, now()
FROM public.itens i
WHERE lower(i.modulo) IN ('epi', 'epis')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.uniformes
  (id, empresa_id, nome, codigo_sku, categoria, tamanho, cor, unidade_medida,
   preco_unitario, estoque_minimo, estoque_atual,
   status, created_at, updated_at)
SELECT
  i.id, i.empresa_id, i.descricao, i.codigo,
  'Não categorizado',
  i.tamanho, i.cor, i.unidade_medida, i.preco_unitario,
  i.estoque_minimo, i.estoque_atual,
  COALESCE(i.estado, 'Ativo'),
  i.created_at, now()
FROM public.itens i
WHERE lower(i.modulo) IN ('uniforme', 'uniformes')
ON CONFLICT (id) DO NOTHING;

-- 3) ALINHAMENTO movimentacoes
--    Remove coluna órfã — migration 20260911 nunca foi aplicada ao banco
ALTER TABLE public.movimentacoes DROP COLUMN IF EXISTS status_ocorrencia;

-- 4) REFRESH DO SCHEMA CACHE
--    Causa raiz do erro "Could not find the table" no PostgREST
NOTIFY pgrst, 'reload schema';

-- 5) VERIFICAÇÃO PÓS-MIGRAÇÃO
--    Rode e confirme que as contagens batem com o esperado
SELECT 'ferramentas'      AS tabela, count(*) AS linhas FROM public.ferramentas
UNION ALL
SELECT 'epis',                        count(*)          FROM public.epis
UNION ALL
SELECT 'uniformes',                   count(*)          FROM public.uniformes
UNION ALL
SELECT 'itens (original)',            count(*)          FROM public.itens;
