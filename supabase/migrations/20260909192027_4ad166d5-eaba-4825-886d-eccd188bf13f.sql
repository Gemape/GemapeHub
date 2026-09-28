ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS codigo_sequencial INTEGER;

CREATE TABLE public.ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT '00:00',
  responsavel_registro TEXT NOT NULL,
  descricao_ocorrencia TEXT NOT NULL,
  tipo_ocorrencia TEXT NOT NULL,
  empregado_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.itens(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencias TO authenticated;
GRANT ALL ON public.ocorrencias TO service_role;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gerenciam ocorrencias" ON public.ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.compras_uniformes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.itens(id) ON DELETE SET NULL,
  fornecedor TEXT NOT NULL,
  nota_fiscal TEXT,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC(12,2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_uniformes TO authenticated;
GRANT ALL ON public.compras_uniformes TO service_role;
ALTER TABLE public.compras_uniformes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gerenciam compras" ON public.compras_uniformes FOR ALL TO authenticated USING (true) WITH CHECK (true);