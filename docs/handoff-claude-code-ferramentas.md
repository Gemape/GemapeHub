# Handoff para Claude Code — Ferramentas

Atualizado em 30/09/2026. A referência remota é `origin/main` em `b495094` (PR #22).

## Estado das etapas

| Etapa | Estado | Evidência e próximo passo |
| --- | --- | --- |
| 1 — documentação | Mergeada | Plano em `docs/plano-ferramentas-fase1.md`; PR #20 na `main`. |
| Emenda documental | Na `main` | Conferido pelo conteúdo de `docs/especificacao-gemapehub.md`: categoria e grupo de ferramentas vêm de Gerais, e a subcategoria da categoria de produto Ferramentas identifica a regra do código. A branch histórica é `docs/ferramentas-categoria-grupo-gerais`. |
| 2 — cadastro | Concluída e mergeada | Commit `c983454`, PR #22, merge `b495094`. Teste explícito de editar, salvar e reabrir preserva estoque positivo. Branch histórica: `feat/ferramentas-cadastro-gerais`. Não há PR da etapa 2 pendente de abertura ou merge. |
| 3 — identificação e custo | Implementada na branch; sem PR ou merge | Branch `feat/ferramentas-identificacao-custo`. O teste cobre persistência e reabertura de série, patrimônio, data e custo, campos opcionais e cálculo do valor em centavos. Lista e CSV exibem os campos; dashboards usam o cálculo em centavos. Ainda falta revisão visual pelo responsável e PR manual. |
| 4 — listas | Não iniciada | Mostrar código nas linhas e no CSV do histórico: compra = entrada; entrega e baixa = saídas, sem telas novas. |
| 5 — encerramento | Não iniciada | Calcular saldo ainda devido por empregado, empresa e ferramenta; devolver ao estoque uma vez, inclusive após demissão. |
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

- Cada etapa usa branch própria; nada vai direto à `main`. O token disponível para `gh pr create` devolve `Post "https://api.github.com/graphql": Forbidden`; após push, o responsável abre os PRs manualmente.
- Visualização local: `VITE_DEMO_MODE=true npm run dev -- --host 0.0.0.0 --port 5173`. O responsável verifica no navegador. Não consultar a Vercel nem disparar deploys.
- Produção só sai da `main` após merge do responsável. O deploy final será na VPS da Mega Provedor.
- O servidor local da etapa 2 foi iniciado na porta 5173 para visualização; confirmar se o responsável terminou antes de pará-lo.
