DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'itens' AND column_name = 'caixa') THEN
        ALTER TABLE public.itens ADD COLUMN caixa TEXT;
    END IF;
END $$;
