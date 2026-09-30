# Construção do GEMAPE Hub e pendências da Fase 2

## Filosofia de construção (definida pelo responsável em 29/09/2026)

Primeiro construímos a **lógica e o funcionamento** do sistema. O banco de dados (Supabase) e a autenticação só são criados **depois que tudo estiver validado**.

**Fase atual: lógica e funcionamento**
1. Telas, fluxos, regras, cálculos e validações são construídos e ajustados em **modo demonstração**, com dados fictícios locais.
2. Nada toca o Supabase real: sem tabelas novas, sem migrations, sem auth.
3. Cada entrega passa pela validação visual do responsável no preview da Vercel antes de ser considerada pronta.
4. Quando tudo estiver validado (módulos, cadastros, telas e fluxos), constrói-se o banco real e a autenticação no Supabase: tabelas, vínculos, políticas de acesso e perfis. **Essa fase só começa com ordem explícita do responsável.**

**Regra prática:** se uma tarefa exigir criar tabela no Supabase ou mexer em auth, pare e avise o responsável. É sinal de que chegamos à Fase 2, e ela só começa com a ordem dele.

## Registro para a Fase 2

Nada abaixo deve ser feito antes da ordem do responsável.

### Banco de dados
- **Empresas:** adicionar à tabela `public.empresas` as colunas `rua`, `numero`, `bairro`, `cep`, `cidade`, `estado` e `status`. O formulário de empresas já envia esses campos.
- **Migrations já escritas e ainda não aplicadas no banco real:**
  - `20260928120000_empresa_papeis_rls.sql` (perfis e isolamento por empresa);
  - `20260928130000_enderecamentos.sql` (endereçamento de estoque);
  - `20260928140000_vistoria_sem_estoque.sql` (vistoria não altera estoque).
- **Código do produto:** gerar o próximo código (EPI-0001 etc.) no próprio banco, para não repetir quando duas pessoas salvam ao mesmo tempo.
- **Empregados:** criar a coluna `email`. No gatilho de movimentações, bloquear também empregado com demissão vencida, ou seja, exigir `data_demissao IS NULL OR data_demissao > (now() AT TIME ZONE 'America/Sao_Paulo')::date`. Hoje o gatilho só olha `ativo`, e quem foi salvo com demissão futura continua `ativo = true` depois da data. A tela já bloqueia (decisão de 30/09/2026). Exceção: o termo de encerramento de ferramentas (devolução na saída) continua liberado depois da demissão, e o gatilho também precisa deixá-lo passar.
- **Estoque de ferramentas:** revisar o estoque inflado por vistorias antigas, que foram gravadas como entrada.
- **Cadastros que hoje ficam só no navegador** e vão precisar de tabela: Cadastros > Gerais (categorias, subcategorias, tamanhos, unidades, associações, regras de código do produto, códigos de fábrica), fornecedores e Ficha de EPI (uma por EPI, com os 7 campos da NR6).

### Autenticação e permissões
- **Permissões de acesso por tela** são definidas nesta fase, junto com a auth e o banco.
- **Perfis decididos:** Administrador, RH e Padrão. O perfil Gestor deixa de existir, e os usuários Gestor atuais passam para Administrador ou Padrão.
- **Regras já decididas:** o empregado só lê; devolução e exclusões de cadastro só pelo Administrador.

### Configuração
- Definir `VITE_DEMO_MODE=false`.
- Vincular a empresa de cada usuário.
- Cadastrar as URLs de redirecionamento da auth no Supabase.
