-- Add unique constraint to allow upsert by code, module and company
ALTER TABLE public.itens ADD CONSTRAINT itens_codigo_modulo_empresa_unique UNIQUE (codigo, modulo, empresa_id);

-- Add unique constraint to allow upsert by CPF
ALTER TABLE public.empregados ADD CONSTRAINT empregados_cpf_unique UNIQUE (cpf);
