-- Endereçamento de estoque: onde cada produto fica guardado (rua, prateleira, apartamento).
-- Aplicar após 20260928120000_empresa_papeis_rls.sql. Mesmas regras de acesso dos cadastros:
-- todos os perfis ativos consultam a própria empresa; admin e gestor cadastram e alteram.
BEGIN;

CREATE TABLE public.enderecamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo_produto text NOT NULL CHECK (length(trim(codigo_produto)) BETWEEN 1 AND 60),
  rua text NOT NULL CHECK (length(trim(rua)) BETWEEN 1 AND 30),
  prateleira text NOT NULL CHECK (length(trim(prateleira)) BETWEEN 1 AND 30),
  apartamento text NOT NULL CHECK (length(trim(apartamento)) BETWEEN 1 AND 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Um produto pode ocupar vários endereços e um endereço pode guardar vários produtos,
-- mas o mesmo produto não se repete no mesmo endereço (sem diferenciar maiúsculas).
CREATE UNIQUE INDEX enderecamentos_unico ON public.enderecamentos
  (empresa_id, upper(trim(rua)), upper(trim(prateleira)), upper(trim(apartamento)), upper(trim(codigo_produto)));
CREATE INDEX enderecamentos_produto ON public.enderecamentos (empresa_id, codigo_produto);

CREATE TRIGGER enderecamentos_updated_at BEFORE UPDATE ON public.enderecamentos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER gemape_auditar AFTER INSERT OR UPDATE OR DELETE ON public.enderecamentos
FOR EACH ROW EXECUTE FUNCTION public.gemape_auditar();
CREATE TRIGGER gemape_exigir_escrita BEFORE INSERT OR UPDATE OR DELETE ON public.enderecamentos
FOR EACH STATEMENT EXECUTE FUNCTION public.gemape_exigir_escrita();

ALTER TABLE public.enderecamentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enderecamentos FROM anon;
REVOKE TRUNCATE ON public.enderecamentos FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enderecamentos TO authenticated;
GRANT ALL ON public.enderecamentos TO service_role;
CREATE POLICY empresa_leitura ON public.enderecamentos FOR SELECT TO authenticated
  USING (public.gemape_pode_ver(empresa_id));
CREATE POLICY empresa_escrita ON public.enderecamentos FOR ALL TO authenticated
  USING (public.gemape_pode_gerir(empresa_id)) WITH CHECK (public.gemape_pode_gerir(empresa_id));

NOTIFY pgrst, 'reload schema';
COMMIT;
