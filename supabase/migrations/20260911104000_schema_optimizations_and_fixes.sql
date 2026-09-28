-- 1. RLS permissivo
-- TODO: Provisório - mantendo permissivo mas preparado para admin role no futuro.
-- Apenas para deixar o comentário como solicitado na issue 14.
-- "Como não há tabela de perfis ainda, manter permissivo mas adicionar comentário TODO indicando que é provisório."

-- 3. Campos de enumeração com CHECK
ALTER TABLE public.itens
ADD CONSTRAINT check_itens_modulo CHECK (modulo IN ('epi', 'uniforme', 'ferramenta')),
ADD CONSTRAINT check_itens_estado CHECK (estado IN ('Novo', 'Usado'));

ALTER TABLE public.movimentacoes
ADD CONSTRAINT check_movimentacoes_modulo CHECK (modulo IN ('epi', 'uniforme', 'ferramenta', 'veiculo')),
ADD CONSTRAINT check_movimentacoes_tipo_movimentacao CHECK (tipo_movimentacao IN ('Entrada', 'Saida', 'Devolucao', 'Transferencia')),
ADD CONSTRAINT check_movimentacoes_motivo_baixa CHECK (motivo_baixa IN ('Fornecimento ao Empregado', 'Desligamento', 'Desgaste Natural', 'Quebra', 'Desaparecimento', 'Perda', 'Mau Uso')),
ADD CONSTRAINT check_movimentacoes_onus_baixa CHECK (onus_baixa IN ('Da Empresa', 'Do Empregado')),
ADD CONSTRAINT check_movimentacoes_tipo_vistoria CHECK (tipo_vistoria IN ('Inicial (Entrega da caixa)', 'Periodica', 'Reposicao', 'Final (Desligamento)')),
ADD CONSTRAINT check_movimentacoes_tipo_ocorrencia CHECK (tipo_ocorrencia IN ('Comunicada pelo empregado a empresa', 'Identificada em vistoria periodica')),
ADD CONSTRAINT check_movimentacoes_conducao_ocorrencia CHECK (conducao_ocorrencia IN ('Onus integral da empresa', 'Onus integral do empregado', 'Onus parcial da empresa e parcial do empregado'));

ALTER TABLE public.veiculos
ADD CONSTRAINT check_veiculos_status CHECK (status IN ('Ativo', 'Manutencao', 'Inativo'));

-- 4. CHECK constraint em movimentacoes: item_id ou veiculo_id (exclusivo)
ALTER TABLE public.movimentacoes
ADD CONSTRAINT check_movimentacao_alvo CHECK ((item_id IS NOT NULL AND veiculo_id IS NULL) OR (item_id IS NULL AND veiculo_id IS NOT NULL));

-- 5. Corrigir keep_alive() com SET search_path
CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 1;
$$;

-- 6. Adicionar coluna updated_at
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.empregados ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.itens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Função e Trigger de updated_at
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trg_empregados_updated_at ON public.empregados;
CREATE TRIGGER trg_empregados_updated_at BEFORE UPDATE ON public.empregados FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trg_itens_updated_at ON public.itens;
CREATE TRIGGER trg_itens_updated_at BEFORE UPDATE ON public.itens FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trg_veiculos_updated_at ON public.veiculos;
CREATE TRIGGER trg_veiculos_updated_at BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trg_movimentacoes_updated_at ON public.movimentacoes;
CREATE TRIGGER trg_movimentacoes_updated_at BEFORE UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

-- 7. UNIQUE constraint empregados.cpf
ALTER TABLE public.empregados ADD CONSTRAINT unique_empregados_cpf UNIQUE (cpf);

-- 8. UNIQUE constraint cadastros_auxiliares
ALTER TABLE public.cadastros_auxiliares ADD CONSTRAINT unique_cadastros_aux_cat_valor UNIQUE (categoria, valor);

-- 9. Remover coluna status_ocorrencia
ALTER TABLE public.movimentacoes DROP COLUMN IF EXISTS status_ocorrencia;
DELETE FROM public.cadastros_auxiliares WHERE categoria = 'status_ocorrencia';

-- 10. CREATE INDEX veiculo_id
CREATE INDEX IF NOT EXISTS idx_movimentacoes_veiculo ON public.movimentacoes(veiculo_id);

-- 11. CHECK length observacao
ALTER TABLE public.movimentacoes ADD CONSTRAINT check_observacao_length CHECK (length(observacao) <= 500);

-- 12. ALTER cnpj DROP NOT NULL
ALTER TABLE public.empresas ALTER COLUMN cnpj DROP NOT NULL;
UPDATE public.empresas SET cnpj = NULL WHERE cnpj = '';

-- 13. Tabela auditoria_movimentacoes
CREATE TABLE IF NOT EXISTS public.auditoria_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movimentacao_id UUID REFERENCES public.movimentacoes(id) ON DELETE CASCADE,
    acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.auditar_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.auditoria_movimentacoes(movimentacao_id, acao, dados_novos, usuario_id)
        VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.auditoria_movimentacoes(movimentacao_id, acao, dados_anteriores, dados_novos, usuario_id)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.auditoria_movimentacoes(movimentacao_id, acao, dados_anteriores, usuario_id)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_movimentacoes ON public.movimentacoes;
CREATE TRIGGER trg_auditoria_movimentacoes
AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.auditar_movimentacao();

-- 2. e 3. (continuação) Trigger atualizar_estoque
-- Na migration existente (20260909130319) há uma `aplicar_movimentacao_estoque()`.
-- A nova chama-se `atualizar_estoque()`. Vou remover a antiga se existir.
DROP TRIGGER IF EXISTS trg_movimentacoes_estoque ON public.movimentacoes;
-- Crio a nova trigger function
CREATE OR REPLACE FUNCTION public.atualizar_estoque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.item_id IS NOT NULL THEN
        IF NEW.tipo_movimentacao = 'Entrada' THEN
            UPDATE public.itens SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.item_id;
        ELSIF NEW.tipo_movimentacao IN ('Saida', 'Devolucao') THEN
            UPDATE public.itens SET estoque_atual = estoque_atual - NEW.quantidade WHERE id = NEW.item_id;
        END IF;
        -- Transferencia não altera o estoque_atual do item
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_estoque ON public.movimentacoes;
CREATE TRIGGER trg_atualizar_estoque
AFTER INSERT ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque();

-- Constraint para impedir estoque negativo:
ALTER TABLE public.itens ADD CONSTRAINT check_estoque_atual_positivo CHECK (estoque_atual >= 0);
