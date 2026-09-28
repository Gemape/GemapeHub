-- Limpar duplicados antes de aplicar constraints

-- Itens: Manter apenas o mais recente para cada código dentro do mesmo módulo
DELETE FROM public.itens a USING (
  SELECT MIN(id) as id, codigo, modulo
  FROM public.itens
  GROUP BY codigo, modulo
  HAVING COUNT(*) > 1
) b
WHERE a.codigo = b.codigo 
  AND a.modulo = b.modulo 
  AND a.id <> b.id;

-- Empregados: Manter apenas o mais recente para cada CPF
DELETE FROM public.empregados a USING (
  SELECT MIN(id) as id, cpf
  FROM public.empregados
  GROUP BY cpf
  HAVING COUNT(*) > 1
) b
WHERE a.cpf = b.cpf 
  AND a.id <> b.id;

-- Adicionar constraints UNIQUE
-- Para itens, a combinação de código e módulo deve ser única para permitir upsert
ALTER TABLE public.itens DROP CONSTRAINT IF EXISTS itens_codigo_modulo_empresa_unique;
ALTER TABLE public.itens ADD CONSTRAINT itens_codigo_modulo_unique UNIQUE (codigo, modulo);

-- Para empregados, o CPF deve ser único
ALTER TABLE public.empregados DROP CONSTRAINT IF EXISTS empregados_cpf_unique;
ALTER TABLE public.empregados ADD CONSTRAINT empregados_cpf_unique UNIQUE (cpf);
