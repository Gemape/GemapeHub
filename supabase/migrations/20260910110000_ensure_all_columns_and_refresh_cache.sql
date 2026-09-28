-- Migration para garantir que todas as colunas necessárias existam e forçar atualização do cache do PostgREST
DO $$
BEGIN
    -- Coluna 'caixa' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'caixa') THEN
        ALTER TABLE public.itens ADD COLUMN caixa TEXT;
    END IF;

    -- Coluna 'categoria' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'categoria') THEN
        ALTER TABLE public.itens ADD COLUMN categoria TEXT;
    END IF;

    -- Coluna 'fornecedor' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'fornecedor') THEN
        ALTER TABLE public.itens ADD COLUMN fornecedor TEXT;
    END IF;

    -- Coluna 'data_validade' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'data_validade') THEN
        ALTER TABLE public.itens ADD COLUMN data_validade DATE;
    END IF;

    -- Coluna 'tamanho' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'tamanho') THEN
        ALTER TABLE public.itens ADD COLUMN tamanho TEXT;
    END IF;

    -- Coluna 'cor' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'cor') THEN
        ALTER TABLE public.itens ADD COLUMN cor TEXT;
    END IF;

    -- Coluna 'unidade_medida' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'unidade_medida') THEN
        ALTER TABLE public.itens ADD COLUMN unidade_medida TEXT;
    END IF;

    -- Coluna 'ca_certificado' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'ca_certificado') THEN
        ALTER TABLE public.itens ADD COLUMN ca_certificado TEXT;
    END IF;

    -- Coluna 'numero_serie' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'numero_serie') THEN
        ALTER TABLE public.itens ADD COLUMN numero_serie TEXT;
    END IF;

    -- Coluna 'marca' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'marca') THEN
        ALTER TABLE public.itens ADD COLUMN marca TEXT;
    END IF;

    -- Coluna 'modelo' em 'itens'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'modelo') THEN
        ALTER TABLE public.itens ADD COLUMN modelo TEXT;
    END IF;

    -- Colunas para Veículos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'tipo') THEN
        ALTER TABLE public.veiculos ADD COLUMN tipo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'combustivel') THEN
        ALTER TABLE public.veiculos ADD COLUMN combustivel TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'renavam') THEN
        ALTER TABLE public.veiculos ADD COLUMN renavam TEXT;
    END IF;

END $$;

-- Forçar atualização de comentários para garantir que o cache seja invalidado
COMMENT ON TABLE public.itens IS 'Tabela de itens (EPIs, Uniformes, Ferramentas) do sistema GEMAPE';
COMMENT ON TABLE public.veiculos IS 'Tabela de veículos da frota GEMAPE';
