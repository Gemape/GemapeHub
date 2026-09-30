# Handoff para Claude Code — Ferramentas

Atualizado em 30/09/2026. A referência remota é `origin/main` em `009f037` (PR #24).

## Estado das etapas

| Etapa | Estado | Evidência e próximo passo |
| --- | --- | --- |
| 1 — documentação | Mergeada | Plano em `docs/plano-ferramentas-fase1.md`; PR #20 na `main`. |
| Emenda documental | Na `main` | Conferido pelo conteúdo de `docs/especificacao-gemapehub.md`: categoria e grupo de ferramentas vêm de Gerais, e a subcategoria da categoria de produto Ferramentas identifica a regra do código. A branch histórica é `docs/ferramentas-categoria-grupo-gerais`. |
| 2 — cadastro | Concluída e mergeada | Commit `c983454`, PR #22, merge `b495094`. Teste explícito de editar, salvar e reabrir preserva estoque positivo. Branch histórica: `feat/ferramentas-cadastro-gerais`. Não há PR da etapa 2 pendente de abertura ou merge. |
| 3 — identificação e custo | Concluída e mergeada | PR #23, merge `09c5880`. Série obrigatória, patrimônio e data opcionais, custo com duas casas e valor em estoque em centavos. |
| 4 — listas | Concluída e mergeada | PR #24, merge `009f037`. A aba Movimentações mostra a coluna Código e a natureza (Entrada (compra), Saída (entrega), Saída (baixa)); o CSV tem a coluna Codigo. Regras em `src/lib/historico-movimentacoes.ts`. |
| 5 — encerramento | Implementada na branch; aguarda PR e merge | Branch `feat/ferramentas-encerramento-saldo`. "Carregar Histórico" traz cada ferramenta com o saldo devido (entregue menos devolvido e baixado) por empregado e empresa; o termo recusa quantidade acima do saldo, item sem saldo e repetição, e grava as devoluções de uma vez. O cliente de demonstração passou a emular o gatilho de estoque do banco real. Regras em `src/lib/encerramento-ferramentas.ts`, testes em `tests/encerramento-ferramentas.test.mjs`. |
| 6 — validação | Pendente | Validar cada PR de código com testes, typecheck e build antes de solicitar revisão visual. |

## Decisões vigentes

- Categoria e grupo do modelo são seleções mantidas em Cadastros > Gerais. A subcategoria da categoria de produto Ferramentas vem de Gerais e alimenta a regra global do código (FER-0001 por padrão); código não é editável e permanece na edição.
- Série informada é obrigatória, sem geração de série fictícia. Patrimônio e data de aquisição são opcionais. Preço de custo não negativo tem até duas casas decimais e alimenta o indicador “Valor total em estoque”.
- A Fase 1 usa dados locais de demonstração. Não criar ou alterar tabelas, migrations, autenticação ou dados no Supabase real.
- Permissões por tela e revisão do estoque histórico de ferramentas permanecem na Fase 2 (`docs/pendencias-fase2.md`). Caixas 01–100, Portador completo e marcas aguardam aprovação do plano separado em `docs/proposta-caixas-portador.md`.

## Commits e validação da branch da etapa 3

1. `00df5c2` — bloqueia renomeação/exclusão de categoria ou grupo de Gerais usados por ferramenta.
2. `d62c1da` — reserva código de ferramenta excluída, sem afetar regras de EPI e outros módulos.
3. `36de063` — preserva o estoque na edição de EPI e uniforme.
4. `fd89ba2` — valida identificação e custo, mostra os dados na lista/CSV e calcula o valor do estoque em centavos.

Cada caso recebeu teste reproduzindo a falha antes da correção. Validação final: 54 testes passaram; `npm run typecheck`, `npm run build` e `git diff --check` passaram. O responsável abrirá o PR manualmente após o push e fará a revisão visual local.

## Achados da revisão do código da etapa 2 e resolução

- **Categoria/grupo renomeados ou excluídos:** corrigido em `00df5c2`; a tela de Gerais consulta os modelos locais e bloqueia alteração de opção usada.
- **Reuso de código após exclusão:** corrigido em `d62c1da`; códigos excluídos são reservados no navegador. A reserva concorrente no banco real permanece na Fase 2.
- **Estoque em EPI e uniforme:** corrigido em `36de063`; o payload de edição omite `estoque_atual` em todos os módulos, preservando a quantidade no demo.
- **Custo em ponto flutuante:** corrigido em `fd89ba2`; os dashboards somam valores em centavos.

## Processo e acesso

- Cada etapa usa branch própria a partir da `main`, só depois do merge da etapa anterior; nada vai direto à `main`.
- Commits com o e-mail `ti@gemape.com.br` (`git config user.email`), sem mudar o nome do autor, para a Vercel reconhecer o autor e criar o preview. O PR #23 não teve preview porque os commits saíram com um autor sem acesso ao projeto na Vercel.
- Se a API do GitHub devolver Forbidden, faça push da branch, informe o título do PR e aguarde: o responsável abre o PR manualmente.
- Preview da Vercel (regra vigente desde 30/09/2026, 16:05): após cada push ou PR, conferir o deployment de preview (Ready, Building ou Error) e informar o link completo quando estiver Ready. Se falhar ou ficar bloqueado, informar o motivo exato e aguardar; não alterar configurações da Vercel.
- Fallback: se o ambiente não alcançar a Vercel, rodar `VITE_DEMO_MODE=true npm run dev -- --host 0.0.0.0 --port 5173` e informar a URL local e os pontos de conferência.
- Só avançar de etapa depois do aviso "PR mergeado". Produção só sai da `main` após merge do responsável; o deploy final será na VPS da Mega Provedor.
