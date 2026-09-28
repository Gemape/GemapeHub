CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_empresas" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.empregados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  cargo TEXT,
  matricula TEXT,
  data_admissao DATE,
  data_demissao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empregados TO authenticated;
GRANT ALL ON public.empregados TO service_role;
ALTER TABLE public.empregados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_empregados" ON public.empregados FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.cadastros_auxiliares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  valor TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadastros_auxiliares TO authenticated;
GRANT ALL ON public.cadastros_auxiliares TO service_role;
ALTER TABLE public.cadastros_auxiliares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_cadastros_auxiliares" ON public.cadastros_auxiliares FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  ca_certificado TEXT,
  tamanho TEXT,
  cor TEXT,
  unidade_medida TEXT NOT NULL DEFAULT 'UN',
  estoque_minimo SMALLINT NOT NULL DEFAULT 0,
  estoque_atual SMALLINT NOT NULL DEFAULT 0,
  preco_unitario NUMERIC(10,2),
  estado TEXT NOT NULL DEFAULT 'Novo',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_itens" ON public.itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  placa TEXT NOT NULL UNIQUE,
  marca TEXT,
  modelo TEXT,
  ano_fabricacao SMALLINT,
  renavam TEXT,
  cor TEXT,
  km_atual INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Ativo',
  empregado_responsavel_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_veiculos" ON public.veiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.itens(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  empregado_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  modulo TEXT NOT NULL,
  tipo_movimentacao TEXT NOT NULL,
  motivo_baixa TEXT,
  quantidade SMALLINT NOT NULL DEFAULT 1,
  onus_baixa TEXT,
  tipo_vistoria TEXT,
  sinalizar_ocorrencia BOOLEAN NOT NULL DEFAULT false,
  tipo_ocorrencia TEXT,
  conducao_ocorrencia TEXT,
  status_ocorrencia TEXT,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_movimentacoes" ON public.movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_movimentacoes_item ON public.movimentacoes(item_id);
CREATE INDEX idx_movimentacoes_empregado ON public.movimentacoes(empregado_id);
CREATE INDEX idx_movimentacoes_empresa ON public.movimentacoes(empresa_id);
CREATE INDEX idx_movimentacoes_data ON public.movimentacoes(data_movimentacao);
CREATE INDEX idx_movimentacoes_modulo ON public.movimentacoes(modulo);
CREATE INDEX idx_itens_empresa ON public.itens(empresa_id);
CREATE INDEX idx_itens_modulo ON public.itens(modulo);
CREATE INDEX idx_empregados_empresa ON public.empregados(empresa_id);

CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    IF NEW.tipo_movimentacao IN ('Entrada', 'Devolucao') THEN
      UPDATE public.itens SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.item_id;
    ELSIF NEW.tipo_movimentacao IN ('Saida', 'Transferencia') THEN
      UPDATE public.itens SET estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade) WHERE id = NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movimentacoes_estoque
AFTER INSERT ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_estoque();

CREATE OR REPLACE FUNCTION public.limpar_movimentacoes_antigas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  registros_removidos INTEGER;
BEGIN
  DELETE FROM public.movimentacoes
  WHERE data_movimentacao < (now() - INTERVAL '5 years')::DATE;
  GET DIAGNOSTICS registros_removidos = ROW_COUNT;
  RETURN registros_removidos;
END;
$$;

INSERT INTO public.empresas (nome_fantasia, razao_social, cnpj) VALUES
  ('GEMAPE', 'GEMAPE MÁQUINAS E PEÇAS LTDA', '00.000.000/0001-01'),
  ('GMP', 'GMP LOCAÇÕES DE MÁQUINAS E SERVIÇOS LTDA', '00.000.000/0001-02'),
  ('LAPA', 'LAPA MÁQUINAS E PEÇAS LTDA', '00.000.000/0001-03');

INSERT INTO public.cadastros_auxiliares (categoria, valor) VALUES
  ('motivo_baixa', 'Fornecimento ao Empregado'),
  ('motivo_baixa', 'Desligamento'),
  ('motivo_baixa', 'Desgaste Natural'),
  ('motivo_baixa', 'Quebra'),
  ('motivo_baixa', 'Desaparecimento'),
  ('motivo_baixa', 'Perda'),
  ('motivo_baixa', 'Mau Uso'),
  ('estado', 'Novo'),
  ('estado', 'Usado'),
  ('onus_baixa', 'Da Empresa'),
  ('onus_baixa', 'Do Empregado'),
  ('tipo_vistoria', 'Inicial (Entrega da caixa)'),
  ('tipo_vistoria', 'Periódica'),
  ('tipo_vistoria', 'Reposição'),
  ('tipo_vistoria', 'Final (Desligamento)'),
  ('tipo_ocorrencia', 'Comunicada pelo empregado à empresa'),
  ('tipo_ocorrencia', 'Identificada em vistoria periódica'),
  ('conducao_ocorrencia', 'Ônus integral da empresa'),
  ('conducao_ocorrencia', 'Ônus integral do empregado'),
  ('conducao_ocorrencia', 'Ônus parcial da empresa e parcial do empregado'),
  ('status_ocorrencia', 'Sim'),
  ('status_ocorrencia', 'Não');