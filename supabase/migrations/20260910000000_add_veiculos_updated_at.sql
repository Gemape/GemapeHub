-- Adicionar updated_at à tabela veiculos
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger para atualizar o updated_at em veiculos
DROP TRIGGER IF EXISTS trigger_veiculos_updated_at ON public.veiculos;
CREATE TRIGGER trigger_veiculos_updated_at
BEFORE UPDATE ON public.veiculos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
