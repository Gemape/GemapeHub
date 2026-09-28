-- =====================================================================
-- SCRIPT DE APLICAÇÃO COMPLETA DO SCHEMA GEMAPE
-- Execute este script no SQL Editor do Supabase:
-- https://app.supabase.com/project/rgwfydfsxoykipuujywy/sql/new
-- =====================================================================

-- ----------------------------------------------------------------
-- PASSO 0: Garantir função handle_updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- PASSO 1: Tabelas base (se ainda não existirem)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.empregados (
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

CREATE TABLE IF NOT EXISTS public.cadastros_auxiliares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  valor TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- ----------------------------------------------------------------
-- PASSO 2: Criar tabelas específicas epis, uniformes, ferramentas
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_sku TEXT NOT NULL,
  categoria TEXT NOT NULL,
  ca TEXT NOT NULL DEFAULT 'N/A',
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

CREATE TABLE IF NOT EXISTS public.ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_sku TEXT NOT NULL,
  categoria TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT NOT NULL DEFAULT 'SN-' || gen_random_uuid()::text,
  patrimonio TEXT,
  estoque_minimo INTEGER DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  data_aquisicao DATE,
  fornecedor TEXT,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, codigo_sku)
);

-- ----------------------------------------------------------------
-- PASSO 3: Tabela veículos (com colunas corretas)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  placa TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  ano INTEGER,
  cor TEXT,
  tipo TEXT,
  quilometragem_atual INTEGER NOT NULL DEFAULT 0,
  combustivel TEXT,
  chassi TEXT,
  renavam TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  empregado_responsavel_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas corretas na tabela veículos (caso existisse com nome antigo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='ano_fabricacao') THEN
    ALTER TABLE public.veiculos RENAME COLUMN ano_fabricacao TO ano;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='km_atual') THEN
    ALTER TABLE public.veiculos RENAME COLUMN km_atual TO quilometragem_atual;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='chassi') THEN
    ALTER TABLE public.veiculos ADD COLUMN chassi TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='tipo') THEN
    ALTER TABLE public.veiculos ADD COLUMN tipo TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='combustivel') THEN
    ALTER TABLE public.veiculos ADD COLUMN combustivel TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='observacoes') THEN
    ALTER TABLE public.veiculos ADD COLUMN observacoes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='updated_at') THEN
    ALTER TABLE public.veiculos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='veiculos' AND column_name='quilometragem_atual') THEN
    ALTER TABLE public.veiculos ADD COLUMN quilometragem_atual INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ----------------------------------------------------------------
-- PASSO 4: Tabela de movimentações
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- PASSO 5: Tabela de ocorrências
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TEXT NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
  responsavel_registro TEXT NOT NULL,
  descricao_ocorrencia TEXT NOT NULL,
  tipo_ocorrencia TEXT NOT NULL,
  empregado_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  item_id UUID,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- PASSO 6: Compras de EPIs e Uniformes
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.compras_epis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.epis(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  nota_fiscal TEXT,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compras_uniformes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.uniformes(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  nota_fiscal TEXT,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- PASSO 7: Caixas de ferramentas
-- ----------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.codigo_caixa_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.caixas_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT UNIQUE NOT NULL DEFAULT 'CX-0001',
  codigo_num INTEGER UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES public.empregados(id) ON DELETE SET NULL,
  localizacao TEXT,
  status TEXT NOT NULL DEFAULT 'Ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caixa_ferramenta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID NOT NULL REFERENCES public.caixas_ferramentas(id) ON DELETE CASCADE,
  ferramenta_id UUID NOT NULL REFERENCES public.ferramentas(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(caixa_id, ferramenta_id)
);

-- ----------------------------------------------------------------
-- PASSO 8: Triggers de updated_at
-- ----------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_epis_updated_at ON public.epis;
CREATE TRIGGER trigger_epis_updated_at
  BEFORE UPDATE ON public.epis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_uniformes_updated_at ON public.uniformes;
CREATE TRIGGER trigger_uniformes_updated_at
  BEFORE UPDATE ON public.uniformes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_ferramentas_updated_at ON public.ferramentas;
CREATE TRIGGER trigger_ferramentas_updated_at
  BEFORE UPDATE ON public.ferramentas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_veiculos_updated_at ON public.veiculos;
CREATE TRIGGER trigger_veiculos_updated_at
  BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_caixas_ferramentas_updated_at ON public.caixas_ferramentas;
CREATE TRIGGER trigger_caixas_ferramentas_updated_at
  BEFORE UPDATE ON public.caixas_ferramentas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------
-- PASSO 9: Trigger para código automático de caixas
-- ----------------------------------------------------------------

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

DROP TRIGGER IF EXISTS trigger_codigo_caixa ON public.caixas_ferramentas;
CREATE TRIGGER trigger_codigo_caixa
  BEFORE INSERT ON public.caixas_ferramentas
  FOR EACH ROW EXECUTE FUNCTION public.set_codigo_caixa_trigger();

-- ----------------------------------------------------------------
-- PASSO 10: Trigger de estoque em movimentações (usando tabelas específicas)
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque_v2()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    IF NEW.modulo = 'epi' THEN
      IF NEW.tipo_movimentacao IN ('Entrada', 'Devolucao') THEN
        UPDATE public.epis SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.item_id;
      ELSIF NEW.tipo_movimentacao IN ('Saida', 'Transferencia') THEN
        UPDATE public.epis SET estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade) WHERE id = NEW.item_id;
      END IF;
    ELSIF NEW.modulo = 'uniforme' THEN
      IF NEW.tipo_movimentacao IN ('Entrada', 'Devolucao') THEN
        UPDATE public.uniformes SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.item_id;
      ELSIF NEW.tipo_movimentacao IN ('Saida', 'Transferencia') THEN
        UPDATE public.uniformes SET estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade) WHERE id = NEW.item_id;
      END IF;
    ELSIF NEW.modulo = 'ferramenta' THEN
      IF NEW.tipo_movimentacao IN ('Entrada', 'Devolucao') THEN
        UPDATE public.ferramentas SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.item_id;
      ELSIF NEW.tipo_movimentacao IN ('Saida', 'Transferencia') THEN
        UPDATE public.ferramentas SET estoque_atual = GREATEST(0, estoque_atual - NEW.quantidade) WHERE id = NEW.item_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimentacoes_estoque ON public.movimentacoes;
CREATE TRIGGER trg_movimentacoes_estoque
  AFTER INSERT ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_estoque_v2();

-- Função de limpeza de movimentações antigas
CREATE OR REPLACE FUNCTION public.limpar_movimentacoes_antigas()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE registros_removidos INTEGER;
BEGIN
  DELETE FROM public.movimentacoes WHERE data_movimentacao < (now() - INTERVAL '5 years')::DATE;
  GET DIAGNOSTICS registros_removidos = ROW_COUNT;
  RETURN registros_removidos;
END;
$$;

-- ----------------------------------------------------------------
-- PASSO 11: RLS em todas as tabelas
-- ----------------------------------------------------------------

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empregados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastros_auxiliares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniformes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_epis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_uniformes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas_ferramentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_ferramenta_itens ENABLE ROW LEVEL SECURITY;

-- Policies (idempotentes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='empresas' AND policyname='auth_all_empresas') THEN
    CREATE POLICY "auth_all_empresas" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='empregados' AND policyname='auth_all_empregados') THEN
    CREATE POLICY "auth_all_empregados" ON public.empregados FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cadastros_auxiliares' AND policyname='auth_all_cadastros_auxiliares') THEN
    CREATE POLICY "auth_all_cadastros_auxiliares" ON public.cadastros_auxiliares FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='epis' AND policyname='auth_all_epis') THEN
    CREATE POLICY "auth_all_epis" ON public.epis FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='uniformes' AND policyname='auth_all_uniformes') THEN
    CREATE POLICY "auth_all_uniformes" ON public.uniformes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ferramentas' AND policyname='auth_all_ferramentas') THEN
    CREATE POLICY "auth_all_ferramentas" ON public.ferramentas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='veiculos' AND policyname='auth_all_veiculos') THEN
    CREATE POLICY "auth_all_veiculos" ON public.veiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movimentacoes' AND policyname='auth_all_movimentacoes') THEN
    CREATE POLICY "auth_all_movimentacoes" ON public.movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ocorrencias' AND policyname='auth_all_ocorrencias') THEN
    CREATE POLICY "auth_all_ocorrencias" ON public.ocorrencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='compras_epis' AND policyname='auth_all_compras_epis') THEN
    CREATE POLICY "auth_all_compras_epis" ON public.compras_epis FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='compras_uniformes' AND policyname='auth_all_compras_uniformes') THEN
    CREATE POLICY "auth_all_compras_uniformes" ON public.compras_uniformes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='caixas_ferramentas' AND policyname='auth_all_caixas_ferramentas') THEN
    CREATE POLICY "auth_all_caixas_ferramentas" ON public.caixas_ferramentas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='caixa_ferramenta_itens' AND policyname='auth_all_caixa_ferramenta_itens') THEN
    CREATE POLICY "auth_all_caixa_ferramenta_itens" ON public.caixa_ferramenta_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ----------------------------------------------------------------
-- PASSO 12: Grants
-- ----------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empregados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cadastros_auxiliares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uniformes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ferramentas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_epis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras_uniformes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas_ferramentas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixa_ferramenta_itens TO authenticated;
GRANT USAGE ON SEQUENCE public.codigo_caixa_seq TO authenticated;

GRANT ALL ON public.empresas TO service_role;
GRANT ALL ON public.empregados TO service_role;
GRANT ALL ON public.cadastros_auxiliares TO service_role;
GRANT ALL ON public.epis TO service_role;
GRANT ALL ON public.uniformes TO service_role;
GRANT ALL ON public.ferramentas TO service_role;
GRANT ALL ON public.veiculos TO service_role;
GRANT ALL ON public.movimentacoes TO service_role;
GRANT ALL ON public.ocorrencias TO service_role;
GRANT ALL ON public.compras_epis TO service_role;
GRANT ALL ON public.compras_uniformes TO service_role;
GRANT ALL ON public.caixas_ferramentas TO service_role;
GRANT ALL ON public.caixa_ferramenta_itens TO service_role;

-- ----------------------------------------------------------------
-- PASSO 13: Dados iniciais (apenas se não existirem)
-- ----------------------------------------------------------------

INSERT INTO public.empresas (nome_fantasia, razao_social, cnpj) VALUES
  ('GEMAPE', 'GEMAPE MÁQUINAS E PEÇAS LTDA', '00.000.000/0001-01'),
  ('GMP', 'GMP LOCAÇÕES DE MÁQUINAS E SERVIÇOS LTDA', '00.000.000/0001-02'),
  ('LAPA', 'LAPA MÁQUINAS E PEÇAS LTDA', '00.000.000/0001-03')
ON CONFLICT (cnpj) DO NOTHING;

-- ----------------------------------------------------------------
-- PASSO 14: Forçar atualização do cache do PostgREST
-- ----------------------------------------------------------------

COMMENT ON TABLE public.epis IS 'Cadastro de EPIs - Schema v2 Final';
COMMENT ON TABLE public.uniformes IS 'Cadastro de Uniformes - Schema v2 Final';
COMMENT ON TABLE public.ferramentas IS 'Cadastro de Ferramentas - Schema v2 Final';
COMMENT ON TABLE public.veiculos IS 'Cadastro de Veículos - Schema v2 Final';
COMMENT ON TABLE public.movimentacoes IS 'Movimentações de Estoque - Schema v2 Final';
COMMENT ON TABLE public.caixas_ferramentas IS 'Caixas de Ferramentas - Schema v2 Final';
COMMENT ON TABLE public.caixa_ferramenta_itens IS 'Itens de Caixas de Ferramentas - Schema v2 Final';

-- FIM DO SCRIPT