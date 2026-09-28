# Regras de trabalho no GEMAPE Hub

Leia também o `AGENTS.md`. A `main` sincroniza com o Lovable: não reescreva histórico já publicado.

## Supabase real

- Nada é criado, alterado ou apagado no Supabase real (tabelas, vínculos, políticas, usuários) sem ordem explícita do responsável.
- Teste tudo antes num banco local ou em modo demonstração, com dados fictícios.
- Nunca coloque credenciais reais em arquivos do repositório. As variáveis ficam no `.env` local (ignorado pelo git) ou no painel da Vercel. Se faltar alguma, liste o nome no PR.

## Git

1. Nunca faça commit direto na `main`.
2. Uma branch por tarefa, criada a partir da `main`:
   - `fix/nome-do-ajuste` para correções;
   - `feat/nome-da-funcionalidade` para novidades;
   - `test/nome-do-modulo` para testes.
3. Commits pequenos, com mensagem em português dizendo o que mudou e por quê.
4. Antes de abrir o PR, atualize a branch com `git pull origin main`.
5. Nunca faça merge do próprio PR. O merge é do responsável, após revisão.
6. Alterações pedidas no PR vão na mesma branch. Não abra PR novo.
7. Espere o merge de um PR antes de começar tarefa que dependa dele.

## Antes de abrir o PR

- Rode `npm run typecheck`, `npm test` e o build de produção (`npm run build`). Build quebrado é deploy quebrado na Vercel.
- Tire screenshots das telas afetadas (login, dashboard, módulos) no ambiente de desenvolvimento.
- Mudanças visuais só vão para commit depois da validação visual do responsável.

## Conteúdo do PR

- Título claro do que foi feito.
- Resumo das mudanças.
- Resultado dos testes executados, com passou/falhou por módulo.
- Screenshots das telas afetadas.
- Link do preview da Vercel.
- Passo a passo para testar manualmente no preview.

## Preview na Vercel

Rotina em todo PR:

1. Antes de abrir o PR, rode o build de produção (`npm run build`) e corrija falhas.
2. Abra o PR. A Vercel gera o link de preview a cada push na branch.
3. Confira o status do deploy nos checks do PR (`gh pr checks` ou a aba Checks). Se falhar, leia o log de erro, corrija na mesma branch e faça push até o preview funcionar.
4. Coloque na descrição do PR o link do preview e o passo a passo para testar nele.
5. A tarefa só está concluída com o preview funcionando.

Configuração:

- O build detecta a Vercel pela variável `VERCEL` e gera a saída no formato dela (`vite.config.ts`). Fora da Vercel, o build continua gerando o servidor Node usado na VPN (`npm start`).
- Sem variáveis configuradas, o preview abre em modo demonstração, com dados fictícios salvos no navegador. A lista completa de variáveis está no `.env.example`.
