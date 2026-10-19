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
3. Confira o status do deploy nos checks do PR (`gh pr checks` ou a aba Checks). Se o build falhar por erro no código, corrija na mesma branch e faça push até o preview funcionar. Se o deployment falhar ou ficar bloqueado por configuração ou permissão da Vercel, informe o motivo exato ao responsável e aguarde: não altere configurações da Vercel.
   - Se o ambiente de trabalho não alcançar a Vercel, rode o app localmente em modo demonstração (`VITE_DEMO_MODE` diferente de `false`) e informe a URL local e os pontos de conferência.
   - Se a API do GitHub devolver Forbidden, faça push da branch, informe o título do PR e aguarde: o responsável abre o PR manualmente.
4. Coloque na descrição do PR o link do preview e o passo a passo para testar nele.
5. A tarefa só está concluída com o preview funcionando.

Configuração:

- O build detecta a Vercel pela variável `VERCEL` e gera a saída no formato dela (`vite.config.ts`). Fora da Vercel, o build continua gerando o servidor Node usado na VPN (`npm start`).
- Sem variáveis configuradas, o preview abre em modo demonstração, com dados fictícios salvos no navegador. A lista completa de variáveis está no `.env.example`.

## Delegação (conselheiro + executores)

O modelo principal (Opus, definido em `.claude/settings.json`) analisa, planeja, decide, delega e revisa. Os subagentes ficam em `.claude/agents/`, usam Haiku e só executam e relatam.

| Subagente | Para quê | Ferramentas |
|---|---|---|
| `investigador-de-bugs` | Ler código, logs e testes e apontar a causa provável, com arquivos e linhas. | Read, Grep, Glob |
| `executor-de-testes` | Rodar `npm test`, `npm run typecheck` e `npm run build` e resumir as falhas. Nunca roda comando de escrita (git, `npm install`, alteração de arquivos). | Bash, Read, Grep, Glob |
| `revisor-de-padroes` | Conferir capitalização, escape de texto e fuso de Brasília nos arquivos apontados. Sem Bash. | Read, Grep, Glob |

Delega:

- tarefas repetitivas, leitura ampla e varredura de arquivos;
- rodar a suíte e resumir as falhas;
- a checagem mecânica de padrões nos arquivos alterados.

Não delega:

- decisões de arquitetura;
- alterações em código de produção e em testes;
- operações git (branch, commit, push, PR) e o `git diff --check`;
- a comunicação com o responsável;
- qualquer coisa que toque o Supabase.

Regras:

- O relatório dos subagentes nunca substitui o code review. O modelo principal confere cada achado contra o código antes de agir, e trata o relatório como pista, não como fato.
- Subagente não corrige nada: quem edita é o modelo principal, depois de decidir.
- Se o relatório não bater com o código, vale o código.
