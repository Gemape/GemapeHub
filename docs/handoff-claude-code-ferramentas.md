# Handoff para Claude Code — Ferramentas

Atualizado em 30/09/2026. A referência remota é `origin/main` em `82e681d` (merge do PR #29).

**Marco: o plano de Ferramentas da Fase 1 está completo** (etapas 1 a 6, PRs #20 a #26, confirmado pelo responsável em 30/09/2026). A proposta de Caixas e Portador (`docs/proposta-caixas-portador.md`) e a Fase 2 aguardam decisão do responsável: não iniciar nenhuma das duas.

## Estado das etapas

| Etapa | Estado | Evidência e próximo passo |
| --- | --- | --- |
| 1 — documentação | Mergeada | Plano em `docs/plano-ferramentas-fase1.md`; PR #20 na `main`. |
| Emenda documental | Na `main` | Conferido pelo conteúdo de `docs/especificacao-gemapehub.md`: categoria e grupo de ferramentas vêm de Gerais, e a subcategoria da categoria de produto Ferramentas identifica a regra do código. A branch histórica é `docs/ferramentas-categoria-grupo-gerais`. |
| 2 — cadastro | Concluída e mergeada | Commit `c983454`, PR #22, merge `b495094`. Teste explícito de editar, salvar e reabrir preserva estoque positivo. Branch histórica: `feat/ferramentas-cadastro-gerais`. Não há PR da etapa 2 pendente de abertura ou merge. |
| 3 — identificação e custo | Concluída e mergeada | PR #23, merge `09c5880`. Série obrigatória, patrimônio e data opcionais, custo com duas casas e valor em estoque em centavos. |
| 4 — listas | Concluída e mergeada | PR #24, merge `009f037`. A aba Movimentações mostra a coluna Código e a natureza (Entrada (compra), Saída (entrega), Saída (baixa)); o CSV tem a coluna Codigo. Regras em `src/lib/historico-movimentacoes.ts`. |
| 5 — encerramento | Concluída e mergeada | PR #25, merge `c4b2ada`. O termo carrega o saldo devido por empregado e empresa (lido do histórico inteiro), recusa excesso, item sem saldo, repetição e data vazia, e grava as devoluções de uma vez. O cliente de demonstração emula o gatilho de estoque. |
| 6 — validação | Concluída e mergeada | PR #26, merge `21f43ce`. Fluxo completo percorrido no navegador (ver "Validação de ponta a ponta"). Termo de Responsabilidade valida o estoque, grava as saídas de uma vez e não repete a entrega num segundo clique; compras de EPI e uniforme viram entrada e somam no estoque do demo, com valor total calculado. |

## Validação de ponta a ponta (etapa 6, modo demonstração)

Roteiro executado no navegador em 30/09/2026 sobre a `main` em `c4b2ada` mais as correções da etapa 6:

| Passo | Resultado |
| --- | --- |
| Cadastrar ferramenta sem série | Recusado; o diálogo continua aberto. |
| Cadastrar com série e custo R$ 199,90 | Salvo como FER-0002, estoque 0, custo exibido. |
| Entrada (compra) de 5 | Estoque 0 → 5; histórico mostra "Entrada (compra)" e o código. |
| Termo de Responsabilidade com 6 | Recusado: passa do estoque disponível (5). |
| Termo de Responsabilidade com 3 | Estoque 5 → 2; termo aberto; "Saída (entrega)". |
| Saída com motivo Quebra, 1 | Estoque 2 → 1; "Saída (baixa)". |
| Demissão com data vencida | A empregada some da lista de nova saída. |
| Termo de Encerramento após a demissão | Carrega saldo 2 (3 entregues − 1 baixa); devolve; estoque 1 → 3; recarregar avisa que não há saldo. |
| Dashboard de Ferramentas | Valor em estoque R$ 1.319,70 (3 × 199,90 + 3 × 240,00). |
| Compra de EPI (4 × R$ 10,00) | Estoque 12 → 16; total da compra R$ 40,00. |

Validação automática: `npm test`, `npm run typecheck`, `npm run build` e `git diff --check`.

## Pendências para PRs separados

Ordem sugerida pelo responsável em 30/09/2026. Cada item tem branch e PR próprios, com testes antes do código e validação completa; o próximo só começa depois do merge do anterior.

| # | Pendência | Estado |
| --- | --- | --- |
| 1 | HTML do Termo de Responsabilidade sem escape de textos: aplicar o mesmo tratamento do Termo de Encerramento. | Concluída: PR #27, merge `4f220ee`. O HTML está em `src/lib/termo-responsabilidade-html.ts`, com `escaparHtml` e a data impressa sem cair no dia anterior. |
| 2 | Termos de Uniformes (entrega e baixa) e Termo de Vistoria gravam item a item: usar o mesmo padrão atômico dos termos de Ferramentas (validar antes e gravar tudo de uma vez). | Concluída: PR #28, merge `47272e8`. Regras em `src/lib/termos-atomicos.ts`: entrega e baixa de uniformes não passam do estoque disponível; vistoria confere as linhas, mas não o estoque; "Nenhum / Empresa" grava sem empregado. Os três termos gravam tudo de uma vez, travam o segundo clique e limpam a lista após gravar. |
| 3 | Abertura dos termos em aba nova é bloqueada por alguns navegadores, porque a aba abre depois da gravação. Vale para todos os termos (EPI, Uniformes e Ferramentas). | Não iniciada. |
| 4 | Data padrão das compras de EPI e Uniformes usa o fuso UTC (`toISOString`) e mostra o dia seguinte no fim da noite: usar `hojeLocal()`. | Não iniciada. |
| 5 | HTML dos termos de Baixa de Uniforme e de Vistoria sem escape de textos (nome do item, estado, motivo e observação digitada): aplicar `escaparHtml`, como no Termo de Responsabilidade. Achado no code review da pendência 2; o problema já existia antes dela. | Concluída: PR #29, merge `82e681d`. HTML em `src/lib/termo-baixa-uniforme-html.ts` e `src/lib/termo-vistoria-html.ts`, com `escaparHtml` em todos os textos; a data da vistoria é impressa sem cair no dia anterior. |
| 6 | HTML de outros termos ainda sem escape: Termo de Entrega de EPI e Ficha de EPI Avulsa (empresa, empregado e nome do item) e Termo de Entrega de Uniforme (empresa e empregado; os itens já são escapados). Achado no code review da pendência 5; o problema já existia antes. | Em andamento: branch `fix/termos-epi-uniforme-escape`. HTML em `src/lib/termo-entrega-epi-html.ts`, `src/lib/ficha-epi-avulsa-html.ts` e `src/lib/termo-entrega-uniforme-html.ts`, com `escaparHtml` em todos os textos; a data do Termo de Entrega de EPI é impressa sem cair no dia anterior; campos vazios não mostram "undefined". |

Fica para a Fase 2: editar ou excluir uma compra de EPI ou uniforme não ajusta o estoque do demo. No banco real, compras são imutáveis (gatilho `gemape_compra_imutavel`) e a tela recebe erro. Decidir se os botões Editar e Excluir de compras saem da tela.

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
