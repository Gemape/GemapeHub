-- Create compras_epis table
CREATE TABLE IF NOT EXISTS public.compras_epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.itens(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  nota_fiscal TEXT,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_compras_epis_empresa ON public.compras_epis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_epis_item ON public.compras_epis(item_id);
CREATE INDEX IF NOT EXISTS idx_compras_epis_data ON public.compras_epis(data_compra);

-- Enable RLS
ALTER TABLE public.compras_epis ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all access to compras_epis" ON public.compras_epis
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to handle EPI purchase registration and update stock
CREATE OR REPLACE FUNCTION handle_compra_epi()
RETURNS TRIGGER AS $$
BEGIN
  -- Update item stock
  UPDATE public.itens 
  SET estoque_atual = estoque_atual + NEW.quantidade 
  WHERE id = NEW.item_id;

  -- Insert movement
  INSERT INTO public.movimentacoes (
    modulo,
    tipo_movimentacao,
    quantidade,
    data_movimentacao,
    item_id,
    empresa_id,
    observacao
  ) VALUES (
    'epi',
    'Entrada',
    NEW.quantidade,
    NEW.data_compra,
    NEW.item_id,
    NEW.empresa_id,
    'Entrada por compra - NF: ' || COALESCE(NEW.nota_fiscal, 'N/A') || ' - Fornecedor: ' || NEW.fornecedor
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for EPI purchases
DROP TRIGGER IF EXISTS trg_compra_epi ON public.compras_epis;
CREATE TRIGGER trg_compra_epi
  AFTER INSERT ON public.compras_epis
  FOR EACH ROW
  EXECUTE FUNCTION handle_compra_epi();
