-- Create compras_uniformes table
CREATE TABLE IF NOT EXISTS public.compras_uniformes (
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
CREATE INDEX IF NOT EXISTS idx_compras_uniformes_empresa ON public.compras_uniformes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_uniformes_item ON public.compras_uniformes(item_id);
CREATE INDEX IF NOT EXISTS idx_compras_uniformes_data ON public.compras_uniformes(data_compra);

-- Enable RLS
ALTER TABLE public.compras_uniformes ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all access following project pattern)
CREATE POLICY "Allow all access to compras_uniformes" ON public.compras_uniformes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to handle purchase registration and update stock
CREATE OR REPLACE FUNCTION handle_compra_uniforme()
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
    'uniforme',
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

-- Trigger for purchases
DROP TRIGGER IF EXISTS trg_compra_uniforme ON public.compras_uniformes;
CREATE TRIGGER trg_compra_uniforme
  AFTER INSERT ON public.compras_uniformes
  FOR EACH ROW
  EXECUTE FUNCTION handle_compra_uniforme();
