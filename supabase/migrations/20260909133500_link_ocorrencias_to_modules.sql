-- Add foreign keys to ocorrencias table to link with items and vehicles
ALTER TABLE public.ocorrencias 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.itens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL;

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.ocorrencias IS 'Tabela de ocorrências vinculadas a empregados, itens (EPI, Uniforme, Ferramenta) ou veículos.';
