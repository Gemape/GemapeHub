-- Criar sequência exclusiva para EPIs
CREATE SEQUENCE IF NOT EXISTS public.codigo_epi_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Função para gerar o próximo código
CREATE OR REPLACE FUNCTION public.gerar_codigo_epi()
RETURNS INTEGER AS
$$
BEGIN
  RETURN nextval('public.codigo_epi_seq');
END;
$$
LANGUAGE plpgsql;

-- Adicionar coluna codigo_sequencial na tabela itens se não existir
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS codigo_sequencial INTEGER;

-- Adicionar constraint UNIQUE se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itens_codigo_sequencial_key') THEN
        ALTER TABLE public.itens ADD CONSTRAINT itens_codigo_sequencial_key UNIQUE (codigo_sequencial);
    END IF;
END $$;

-- Trigger: preencher codigo_sequencial automaticamente no INSERT
CREATE OR REPLACE FUNCTION public.set_codigo_epi_trigger()
RETURNS TRIGGER AS
$$
BEGIN
  IF NEW.modulo = 'epi' AND NEW.codigo_sequencial IS NULL THEN
    NEW.codigo_sequencial := public.gerar_codigo_epi();
  END IF;
  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Criar trigger na tabela itens
DROP TRIGGER IF EXISTS trigger_codigo_epi ON public.itens;
CREATE TRIGGER trigger_codigo_epi
  BEFORE INSERT ON public.itens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_codigo_epi_trigger();
