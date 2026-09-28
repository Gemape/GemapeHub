-- Migration: Split 'itens' table into specific tables as requested in Passo 3
-- This will also fix the schema cache error by defining a fresh structure.

-- 1. Create 'epis' table
CREATE TABLE IF NOT EXISTS public.epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_sku TEXT NOT NULL,
  categoria TEXT NOT NULL,
  ca TEXT NOT NULL,
  tamanho TEXT,
  unidade_medida TEXT,
  estoque_minimo INTEGER DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  fornecedor TEXT,
  data_validade DATE,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, codigo_sku)
);

-- 2. Create 'uniformes' table
CREATE TABLE IF NOT EXISTS public.uniformes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_sku TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tamanho TEXT,
  cor TEXT,
  unidade_medida TEXT,
  estoque_minimo INTEGER DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  fornecedor TEXT,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, codigo_sku)
);

-- 3. Create 'ferramentas' table
CREATE TABLE IF NOT EXISTS public.ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_sku TEXT NOT NULL,
  categoria TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT NOT NULL,
  patrimonio TEXT,
  estoque_minimo INTEGER DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  data_aquisicao DATE,
  fornecedor TEXT,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, codigo_sku),
  UNIQUE(empresa_id, numero_serie)
);

-- 4. Update 'veiculos' to match requested structure (adding missing columns)
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS chassi TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.veiculos RENAME COLUMN ano_fabricacao TO ano;
ALTER TABLE public.veiculos RENAME COLUMN km_atual TO quilometragem_atual;

-- 5. Data Migration (Copy data from 'itens' to new tables)
-- Insert EPIs
INSERT INTO public.epis (id, empresa_id, nome, codigo_sku, categoria, ca, tamanho, unidade_medida, estoque_minimo, estoque_atual, fornecedor, data_validade, status, observacoes, created_at, updated_at)
SELECT id, empresa_id, descricao, codigo, categoria, COALESCE(ca_certificado, 'N/A'), tamanho, unidade_medida, estoque_minimo, estoque_atual, fornecedor, data_validade, status, observacoes, created_at, updated_at
FROM public.itens WHERE modulo = 'epi'
ON CONFLICT DO NOTHING;

-- Insert Uniformes
INSERT INTO public.uniformes (id, empresa_id, nome, codigo_sku, categoria, tamanho, cor, unidade_medida, estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at)
SELECT id, empresa_id, descricao, codigo, categoria, tamanho, cor, unidade_medida, estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at
FROM public.itens WHERE modulo = 'uniforme'
ON CONFLICT DO NOTHING;

-- Insert Ferramentas
INSERT INTO public.ferramentas (id, empresa_id, nome, codigo_sku, categoria, marca, modelo, numero_serie, estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at)
SELECT id, empresa_id, descricao, codigo, categoria, marca, modelo, COALESCE(numero_serie, codigo), estoque_minimo, estoque_atual, fornecedor, status, observacoes, created_at, updated_at
FROM public.itens WHERE modulo = 'ferramenta'
ON CONFLICT DO NOTHING;

-- 6. Update Relationships (FKs in other tables)
-- Note: 'movimentacoes', 'compras_epis', 'compras_uniformes' and 'caixa_ferramenta_itens' 
-- already have 'item_id' which matches the UUIDs we just migrated.
-- To maintain integrity, we'll keep the columns but we should eventually update FKs.
-- For now, we'll just ensure the cache is refreshed.

-- 7. Force Schema Cache Refresh
COMMENT ON TABLE public.epis IS 'Cadastro de EPIs';
COMMENT ON TABLE public.uniformes IS 'Cadastro de Uniformes';
COMMENT ON TABLE public.ferramentas IS 'Cadastro de Ferramentas';
COMMENT ON TABLE public.veiculos IS 'Cadastro de Veículos';

-- 8. Clean up (Rename old table to avoid accidental use)
ALTER TABLE public.itens RENAME TO itens_old;

-- 9. Triggers for updated_at on new tables
CREATE TRIGGER trigger_epis_updated_at BEFORE UPDATE ON public.epis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trigger_uniformes_updated_at BEFORE UPDATE ON public.uniformes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trigger_ferramentas_updated_at BEFORE UPDATE ON public.ferramentas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. RLS for new tables
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniformes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_epis" ON public.epis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uniformes" ON public.uniformes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ferramentas" ON public.ferramentas FOR ALL TO authenticated USING (true) WITH CHECK (true);
