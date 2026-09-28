-- Adicionar novas colunas à tabela itens
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS data_validade DATE;
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Adicionar novas colunas à tabela veiculos
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS combustivel TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS renavam TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Garantir constraints UNIQUE
-- Placa já deve ser unique, mas vamos reforçar
ALTER TABLE public.veiculos DROP CONSTRAINT IF EXISTS veiculos_placa_key;
ALTER TABLE public.veiculos ADD CONSTRAINT veiculos_placa_key UNIQUE (placa);

-- Renavam deve ser único
ALTER TABLE public.veiculos DROP CONSTRAINT IF EXISTS veiculos_renavam_key;
ALTER TABLE public.veiculos ADD CONSTRAINT veiculos_renavam_key UNIQUE (renavam);

-- Código deve ser único por módulo (EPI, Uniforme, Ferramenta)
-- Nota: Para EPI usamos codigo_sequencial, mas o campo 'codigo' também existe.
-- Vamos aplicar a regra ao campo 'codigo' para os módulos onde ele é usado.
ALTER TABLE public.itens DROP CONSTRAINT IF EXISTS itens_codigo_modulo_unique;
ALTER TABLE public.itens ADD CONSTRAINT itens_codigo_modulo_unique UNIQUE (codigo, modulo);

-- Número de série deve ser único (principalmente para ferramentas)
-- Como o campo é compartilhado, vamos tornar único por item se preenchido
-- (Nota: UNIQUE em PostgreSQL permite múltiplos NULLs)
ALTER TABLE public.itens DROP CONSTRAINT IF EXISTS itens_numero_serie_key;
ALTER TABLE public.itens ADD CONSTRAINT itens_numero_serie_key UNIQUE (numero_serie);

-- Trigger para atualizar o updated_at em itens
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_itens_updated_at ON public.itens;
CREATE TRIGGER trigger_itens_updated_at
BEFORE UPDATE ON public.itens
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
