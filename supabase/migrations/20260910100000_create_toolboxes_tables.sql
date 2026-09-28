-- Criar sequência para caixas de ferramentas
CREATE SEQUENCE IF NOT EXISTS public.codigo_caixa_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Tabela de caixas de ferramentas
CREATE TABLE IF NOT EXISTS public.caixas_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT UNIQUE NOT NULL,
  codigo_num INTEGER UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  localizacao TEXT,
  status TEXT NOT NULL DEFAULT 'Ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de itens da caixa (relacionamento N:N)
CREATE TABLE IF NOT EXISTS public.caixa_ferramenta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID NOT NULL REFERENCES public.caixas_ferramentas(id) ON DELETE CASCADE,
  ferramenta_id UUID NOT NULL REFERENCES public.itens(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(caixa_id, ferramenta_id)
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas_ferramentas TO authenticated;
GRANT ALL ON public.caixas_ferramentas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixa_ferramenta_itens TO authenticated;
GRANT ALL ON public.caixa_ferramenta_itens TO service_role;

-- RLS
ALTER TABLE public.caixas_ferramentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_ferramenta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_caixas_ferramentas" ON public.caixas_ferramentas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_caixa_ferramenta_itens" ON public.caixa_ferramenta_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para código sequencial automático
CREATE OR REPLACE FUNCTION public.set_codigo_caixa_trigger()
RETURNS TRIGGER AS $$
DECLARE
  proximo_val INTEGER;
BEGIN
  IF NEW.codigo_num IS NULL THEN
    proximo_val := nextval('public.codigo_caixa_seq');
    NEW.codigo_num := proximo_val;
    NEW.codigo := 'CX-' || LPAD(proximo_val::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_codigo_caixa
  BEFORE INSERT ON public.caixas_ferramentas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_codigo_caixa_trigger();

-- Trigger para updated_at
CREATE TRIGGER trigger_caixas_ferramentas_updated_at
  BEFORE UPDATE ON public.caixas_ferramentas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices
CREATE INDEX idx_caixas_empresa ON public.caixas_ferramentas(empresa_id);
CREATE INDEX idx_caixas_responsavel ON public.caixas_ferramentas(responsavel_id);
CREATE INDEX idx_caixa_itens_caixa ON public.caixa_ferramenta_itens(caixa_id);
CREATE INDEX idx_caixa_itens_ferramenta ON public.caixa_ferramenta_itens(ferramenta_id);
