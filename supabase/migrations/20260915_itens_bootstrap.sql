-- =============================================================
-- 20260915_itens_bootstrap.sql
-- Tabela legada 'itens' — necessária em projetos novos como
-- origem da migração para as tabelas split (epis/uniformes/
-- ferramentas) executada pelo 20260915_opcao_a_delta.sql.
--
-- Colunas confirmadas por probe da API REST em 2026-09-15
-- contra o banco original (ref: rgwfydfsxoykipuujywy).
--
-- Aplicar ANTES do apply_all_schema.sql + delta em projetos
-- novos que não herdem o banco Lovable Cloud original.
-- Idempotente — CREATE TABLE IF NOT EXISTS.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.itens (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT        NOT NULL,
  empresa_id       UUID        REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo           TEXT        NOT NULL,
  descricao        TEXT        NOT NULL,
  marca            TEXT,
  modelo           TEXT,
  numero_serie     TEXT,
  ca_certificado   TEXT,
  tamanho          TEXT,
  cor              TEXT,
  unidade_medida   TEXT        NOT NULL DEFAULT 'UN',
  estoque_minimo   SMALLINT    NOT NULL DEFAULT 0,
  estoque_atual    SMALLINT    NOT NULL DEFAULT 0,
  preco_unitario   NUMERIC(10,2),
  estado           TEXT        NOT NULL DEFAULT 'Novo',
  ativo            BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  codigo_sequencial INTEGER
);

-- RLS
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'itens' AND policyname = 'auth_all_itens'
  ) THEN
    CREATE POLICY "auth_all_itens"
      ON public.itens
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;
