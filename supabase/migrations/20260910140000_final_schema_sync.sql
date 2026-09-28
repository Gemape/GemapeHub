-- Final schema synchronization and cache refresh as requested in Passo 2, 3 and 5.
-- This ensures all specific tables exist with correct columns and forces PostgREST to reload.

DO $$
BEGIN
    -- Ensure 'veiculos' has all columns from Passo 3
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'ano') THEN
        ALTER TABLE public.veiculos RENAME COLUMN ano_fabricacao TO ano;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'quilometragem_atual') THEN
        ALTER TABLE public.veiculos RENAME COLUMN km_atual TO quilometragem_atual;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'tipo') THEN
        ALTER TABLE public.veiculos ADD COLUMN tipo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'combustivel') THEN
        ALTER TABLE public.veiculos ADD COLUMN combustivel TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'chassi') THEN
        ALTER TABLE public.veiculos ADD COLUMN chassi TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'renavam') THEN
        ALTER TABLE public.veiculos ADD COLUMN renavam TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'observacoes') THEN
        ALTER TABLE public.veiculos ADD COLUMN observacoes TEXT;
    END IF;

    -- Fix legacy 'itens' table if it still exists (to prevent errors in old queries)
    -- The error message specifically mentioned 'itens' and 'caixa'
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itens' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'caixa') THEN
            ALTER TABLE public.itens ADD COLUMN caixa TEXT;
        END IF;
    END IF;

    -- Also check 'itens_old' if it was renamed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itens_old' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens_old' AND column_name = 'caixa') THEN
            ALTER TABLE public.itens_old ADD COLUMN caixa TEXT;
        END IF;
    END IF;

END $$;

-- Force Schema Cache Refresh by updating comments
COMMENT ON TABLE public.epis IS 'Cadastro de EPIs - Refreshed at 2026-09-10';
COMMENT ON TABLE public.uniformes IS 'Cadastro de Uniformes - Refreshed at 2026-09-10';
COMMENT ON TABLE public.ferramentas IS 'Cadastro de Ferramentas - Refreshed at 2026-09-10';
COMMENT ON TABLE public.veiculos IS 'Cadastro de Veículos - Refreshed at 2026-09-10';
COMMENT ON TABLE public.caixas_ferramentas IS 'Cadastro de Caixas de Ferramentas - Refreshed at 2026-09-10';
COMMENT ON TABLE public.caixa_ferramenta_itens IS 'Vinculação N:N Caixas e Ferramentas - Refreshed at 2026-09-10';

-- If 'itens' view/table exists, refresh it too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'itens' AND table_schema = 'public') THEN
        EXECUTE 'COMMENT ON TABLE public.itens IS ''Tabela Legada - Refreshed at 2026-09-10''';
    END IF;
END $$;
