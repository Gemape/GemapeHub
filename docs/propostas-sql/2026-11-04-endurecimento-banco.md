# Ajustes no banco (migration escrita, NÃO APLICADA no Supabase)

> **Atualização:** os itens 0, 1, 2 e 3 viraram a migration `supabase/migrations/20261104120000_caixas_contrato_e_auditoria.sql` (decisão 402), testada num PostgreSQL em memória (`tests/banco-caixas.test.mjs`). Ela só vale depois que o responsável a aplicar no Supabase real, em transação e com backup. Antes disso, rode a consulta de duplicidade do item 2 (a migration não cria o índice se houver duplicatas, mas avisa).


Resultado da auditoria de 04/11/2026. **Nada disto foi executado** e o arquivo fica em `docs/` de propósito (e não em `supabase/migrations/`), para não ser aplicado por sincronização automática. A aplicação só acontece com ordem explícita do responsável, em transação e com backup.

## 0. `auditoria_movimentacoes` sem RLS e sem REVOKE (Alto/Crítico, exposição de dados)

Criada em `20260911104000_schema_optimizations_and_fixes.sql` (linha 91) sem `ENABLE ROW LEVEL SECURITY` e sem revogar os privilégios padrão do Supabase. Nenhuma migration posterior a protege; `20260916000000_security_integrity.sql` só derruba o gatilho antigo (`trg_auditoria_movimentacoes`) e passa a auditar na tabela nova `public.auditoria` (esta sim com RLS). A tabela antiga ficou órfã: com os privilégios padrão do Supabase (`anon` e `authenticated` com SELECT/INSERT/UPDATE/DELETE em tabelas novas), a API REST pode **ler o JSON das movimentações antigas e gravar linhas nela**, inclusive sem login.

**Antes de decidir**, confira só por leitura se isso vale no projeto real (pode ter sido tratado fora das migrations):

```sql
SELECT relrowsecurity FROM pg_class WHERE oid = 'public.auditoria_movimentacoes'::regclass;
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'auditoria_movimentacoes' AND grantee IN ('anon','authenticated');
SELECT count(*) FROM public.auditoria_movimentacoes;
```

Correção proposta (não destrutiva: não apaga linhas; sem política, ninguém além do `service_role` lê ou grava):

```sql
BEGIN;
ALTER TABLE public.auditoria_movimentacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auditoria_movimentacoes FROM anon, authenticated;
-- Leitura só para administrador, como a tabela nova `public.auditoria`:
CREATE POLICY auditoria_mov_admin ON public.auditoria_movimentacoes FOR SELECT TO authenticated USING (public.gemape_admin());
GRANT SELECT ON public.auditoria_movimentacoes TO authenticated;
COMMIT;
```

Impacto: nenhuma tela do sistema lê essa tabela (`grep` em `src/`: nenhuma ocorrência), então a mudança não altera funcionalidade. Decisão do responsável: manter a tabela como histórico (acima) ou arquivá-la e apagá-la depois (destrutivo, só com ordem expressa).

## 1. `auditar_movimentacao()` é SECURITY DEFINER sem `search_path` (Alto, segurança)

Criada em `20260911104000_schema_optimizations_and_fixes.sql` (linha 101) sem `SET search_path`. Uma função SECURITY DEFINER sem `search_path` fixo pode ser desviada por quem cria objetos com o mesmo nome em um schema que venha antes no caminho de busca. Todas as outras funções SECURITY DEFINER das migrations já fixam o `search_path`. Hoje a função está órfã (o gatilho que a usava foi derrubado em `20260916000000`), então o risco é baixo; ainda assim vale fixar o caminho ou removê-la. A função só usa nomes qualificados (`public.auditoria_movimentacoes`, `auth.uid()`), então fixar o caminho vazio não muda o comportamento.

```sql
BEGIN;
ALTER FUNCTION public.auditar_movimentacao() SET search_path = '';
COMMIT;
```

Impacto: nenhum dado é alterado; só a função passa a ignorar o caminho de busca da sessão. Reversível com `ALTER FUNCTION public.auditar_movimentacao() RESET search_path;`.

## 2. Uma ferramenta em mais de uma caixa (Alto, integridade)

A regra do sistema (e do modo demonstração) é "cada ferramenta fica em uma caixa só". No banco real só existe `UNIQUE(caixa_id, ferramenta_id)`: a mesma ferramenta pode entrar em duas caixas, e `salvar_caixa` não confere isso.

**Antes de qualquer mudança**, rode esta consulta somente de leitura para saber se já há duplicidade nos dados reais:

```sql
SELECT ferramenta_id, count(*) AS caixas, array_agg(caixa_id) AS ids_das_caixas
FROM public.caixa_ferramenta_itens
GROUP BY ferramenta_id
HAVING count(*) > 1;
```

- Se a consulta não devolver linhas: pode-se criar a restrição `CREATE UNIQUE INDEX caixa_ferramenta_itens_ferramenta_unica ON public.caixa_ferramenta_itens(ferramenta_id);` e, na `salvar_caixa`, traduzir a violação para a mensagem "Esta ferramenta já está na caixa X".
- Se devolver linhas: **não criar o índice**. Os casos precisam ser resolvidos pelo responsável (qual caixa fica com a ferramenta), pois resolver sozinho mudaria dados reais.

## 3. `salvar_caixa` no UPDATE grava `status` nulo (Médio)

No INSERT o `status` usa `COALESCE(..., 'Ativa')`; no UPDATE usa `p_valores->>'status'` direto. Se a tela omitir o campo, a coluna (`NOT NULL`) recusa a gravação com erro genérico. Ajuste proposto na `salvar_caixa`: `status=COALESCE(p_valores->>'status', status)`.

## 4. Pendências conhecidas (Fase 2, já registradas em `docs/pendencias-fase2.md`)

As RPCs `editar_epi_catalogo`, `excluir_epi_catalogo`, `editar_uniforme_catalogo`, `excluir_uniforme_catalogo`, `separar_epis_por_tamanho` e `travas_catalogo` existem só no modo demonstração. No banco real a tela não as chama (`travas_catalogo` está atrás de `MODO_DEMO`), mas as gravações equivalentes ainda não têm função no banco.
