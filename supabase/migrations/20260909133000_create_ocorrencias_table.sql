-- Create ocorrencias table
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    hora TIME NOT NULL DEFAULT CURRENT_TIME,
    responsavel_registro TEXT NOT NULL,
    descricao_ocorrencia TEXT NOT NULL,
    tipo_ocorrencia TEXT NOT NULL CHECK (tipo_ocorrencia IN ('EPI', 'Uniforme', 'Ferramenta', 'Veículo')),
    empregado_id UUID REFERENCES public.empregados(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (following project pattern)
CREATE POLICY "Allow all access to ocorrencias" ON public.ocorrencias
    FOR ALL
    USING (true)
    WITH CHECK (true);
