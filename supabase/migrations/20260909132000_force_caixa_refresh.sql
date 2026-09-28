-- Migration to ensure 'caixa' column exists in 'itens' table
-- This migration is redundant but serves to trigger a schema cache refresh in PostgREST

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'caixa') THEN
        ALTER TABLE public.itens ADD COLUMN caixa TEXT;
    ELSE
        -- If it exists, we just touch it to trigger a refresh
        COMMENT ON COLUMN public.itens.caixa IS 'Caixa onde o item está guardado (Módulo Ferramentas)';
    END IF;
END $$;
