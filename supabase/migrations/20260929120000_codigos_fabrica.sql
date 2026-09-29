-- Código de Fábrica: liga o código GEMAPE de um produto ao código do fornecedor e ao código do item
-- no fornecedor (cProd da NF-e), com o CA quando o produto é EPI.
-- Aplicar após 20260928120000_empresa_papeis_rls.sql. Mesmas regras de acesso dos cadastros:
-- todos os perfis ativos consultam a própria empresa; admin e gestor cadastram e alteram.
BEGIN;

CREATE TABLE public.codigos_fabrica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN ('epi','uniforme','ferramenta')),
  codigo_gemape text NOT NULL CHECK (length(trim(codigo_gemape)) BETWEEN 1 AND 60),
  codigo_fornecedor text NOT NULL CHECK (length(trim(codigo_fornecedor)) BETWEEN 1 AND 60),
  codigo_item_fornecedor text NOT NULL CHECK (length(trim(codigo_item_fornecedor)) BETWEEN 1 AND 60),
  -- CA só existe para EPI.
  ca text CHECK (ca IS NULL OR (modulo = 'epi' AND length(trim(ca)) BETWEEN 1 AND 20)),
  -- Dados da nota de onde o código veio, quando importado do XML.
  descricao_nota text CHECK (descricao_nota IS NULL OR length(descricao_nota) <= 200),
  fornecedor_cnpj text CHECK (fornecedor_cnpj IS NULL OR fornecedor_cnpj ~ '^\d{11}(\d{3})?$'),
  fornecedor_nome text CHECK (fornecedor_nome IS NULL OR length(fornecedor_nome) <= 120),
  nota_numero text CHECK (nota_numero IS NULL OR length(nota_numero) <= 20),
  nota_chave text CHECK (nota_chave IS NULL OR nota_chave ~ '^\d{44}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- O mesmo item de um fornecedor aponta para um único produto GEMAPE em cada empresa (sem diferenciar maiúsculas).
CREATE UNIQUE INDEX codigos_fabrica_unico ON public.codigos_fabrica
  (empresa_id, upper(trim(codigo_fornecedor)), upper(trim(codigo_item_fornecedor)));
CREATE INDEX codigos_fabrica_gemape ON public.codigos_fabrica (empresa_id, codigo_gemape);

CREATE TRIGGER codigos_fabrica_updated_at BEFORE UPDATE ON public.codigos_fabrica
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER gemape_auditar AFTER INSERT OR UPDATE OR DELETE ON public.codigos_fabrica
FOR EACH ROW EXECUTE FUNCTION public.gemape_auditar();
CREATE TRIGGER gemape_exigir_escrita BEFORE INSERT OR UPDATE OR DELETE ON public.codigos_fabrica
FOR EACH STATEMENT EXECUTE FUNCTION public.gemape_exigir_escrita();

ALTER TABLE public.codigos_fabrica ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.codigos_fabrica FROM anon;
REVOKE TRUNCATE ON public.codigos_fabrica FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.codigos_fabrica TO authenticated;
GRANT ALL ON public.codigos_fabrica TO service_role;
CREATE POLICY empresa_leitura ON public.codigos_fabrica FOR SELECT TO authenticated
  USING (public.gemape_pode_ver(empresa_id));
CREATE POLICY empresa_escrita ON public.codigos_fabrica FOR ALL TO authenticated
  USING (public.gemape_pode_gerir(empresa_id)) WITH CHECK (public.gemape_pode_gerir(empresa_id));

NOTIFY pgrst, 'reload schema';
COMMIT;
