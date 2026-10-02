# Varredura da especificação contra o sistema

Feita em 01/10/2026 sobre a `main` em `ec1b9c7` (merge do PR #52). Compara cada item de `docs/especificacao-gemapehub.md` (rev1, conferido também contra o PDF `md gemape rev1.pdf`) com o código, à luz de `docs/decisoes-especiais.md` (decisões 1 a 23 e a atual 25) e de `docs/pendencias-fase2.md`. Nenhum código foi alterado nesta varredura.

## Estado de partida

- PR #50 (decisão 23), PR #51 (decisão 23 corrigida com as 4 regras do code review e decisão 25) e PR #52 (ferramenta sem subcategoria e sem aba Cadastro no módulo) estão mergeados.
- O PR D (código do estoque por tamanho, decisão 23) foi liberado pelo responsável e está na branch `feat/tamanho-estoque-por-tamanho`, aguardando validação e merge.
- Não há PR aberto no repositório.

## Legenda

- **Implementado:** atende ao MD e às decisões, no modo demonstração.
- **Parcial:** existe, mas falta parte do que o MD ou uma decisão pede.
- **Não iniciado:** não existe na `main`.
- **BLOQUEADO:** depende da decisão 19 (Fase 2 só com o sistema 100% funcional), da 20 (VPS após a Fase 2), da evolução do XML (decisão 21), da pendência 4 ou de tabela/auth no Supabase. Não tem plano de execução.

Observação geral: tudo o que está "implementado" funciona no modo demonstração, com dados no navegador. A ida para tabelas reais é Fase 2 e já está registrada em `docs/pendencias-fase2.md`; essa parte não se repete item a item abaixo.

## 1. Cadastros > Gerais

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Permissão: só Administrador | Implementado | `cadastros/gerais/route.tsx` bloqueia quem não é admin; o menu Gerais só aparece para admin (`AppSidebar.tsx`). |
| Cadastrar categorias (mostra existentes, cadastra nova) | Implementado | Gerais > Categorias (`categorias.tsx`). Categorias-base protegidas (PR #48). |
| Cadastrar subcategorias por categoria | Implementado | Gerais > Categorias, bloco "Subcategorias de …". Desativar e proteção de uso (PR #48). |
| Categorias e grupos de ferramentas | Implementado | Gerais > Categorias, blocos "Categorias de ferramentas" e "Grupos de ferramentas", com as listas iniciais do MD. |
| Código de fábrica: produto e fornecedor com busca, código na NF, CA se EPI | Implementado | Gerais > Código de fábrica (`codigo-fabrica.tsx`). Observação: guarda cópia do nome do produto e do fornecedor (achado 6 da decisão 22) e excluir fornecedor ou produto não confere os códigos que apontam para ele (achado 11). Ver prioridade 5. |
| Código de fábrica: uso na importação do XML | Implementado | PR #44 (decisão 21). Evoluções do XML: **BLOQUEADO** (aguardam o responsável). |
| Endereçamento: produto com busca, rua, número (estante), apartamento (nível) | Implementado | Gerais > Endereçamento (`EnderecamentoModulo.tsx`); rotas antigas redirecionam. Migration real `20260928130000_enderecamentos` não aplicada: **BLOQUEADO** (Fase 2). |
| Tamanhos e numerações, em sequência | Implementado | Gerais > Tamanhos e Unidades, com ordenação; desativar e proteção de uso no PR D. |
| Unidades de medida | Implementado | Mesma tela; desativar e proteção de uso no PR D. |
| Associar tamanho e medida (Existentes → Autorizados; desautorizar volta à esquerda, decisão 2) | Implementado no PR D | A associação por subcategoria (`associar-tamanhos.tsx`) alimenta a unidade do cadastro e o tamanho das linhas de EPI e Uniforme (decisão 23). |
| Código do produto (categoria, sigla, numeração inicial de 4 dígitos) | Implementado | Gerais > Código do Produto. Regras de categoria-base protegidas (PR #48). |
| Caixas 01 a 100 com flag | Implementado | Caixas de Ferramentas > Habilitar caixas (PR #37). |

## 2. EPI

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Código automático (EPI-0001) | Implementado | Cadastros > EPIs (`CadastroProduto.tsx`). |
| Subcategoria em lista de Gerais | Implementado | Por referência (`subcategoria_id`, PR #47). |
| Descrição, estoque mínimo, empresa (decisão 9) | Implementado | Mesmo formulário. |
| Tamanho e unidade de Gerais, estoque e mínimo por tamanho (decisão 23) | Implementado no PR D | Aguardando merge. |
| Ficha de EPI: busca do EPI e os 7 campos manuais | Implementado | Cadastros > Ficha de EPI (`epi-ficha.tsx`, `fichas-epi.ts`). Gravação só no navegador; tabela real é Fase 2. |

## 3. Uniforme

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Código automático (UNI-0001), subcategoria de Gerais, descrição, estoque mínimo | Implementado | Cadastros > Uniformes (`CadastroProduto.tsx`). |
| Preço de custo, marca (lista de Gerais, PR #46), modelo, empresa (decisões 1 e 9); sem CA | Implementado | Mesmo formulário. Marca e modelo só gravam no demo; colunas reais: **BLOQUEADO** (Fase 2). |
| Tamanho e unidade de Gerais, estoque por tamanho (decisão 23) | Implementado no PR D | Aguardando merge. |

## 4. Veículo

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Itens 1 a 15 (código VEI, subcategoria de Gerais, descrição, placa, marca de Gerais, modelo, ano, cor, combustível, empresa, RENAVAM, km, situação, responsável, observações) | Implementado | Cadastros > Veículos (`VeiculosCadastroModulo.tsx`). Código e descrição só gravam no demo; colunas reais: **BLOQUEADO** (Fase 2). |

## 5. Ferramentas

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Permissão: Administrador cadastra caixa, portador, categoria e grupo; usuário simples cadastra modelo | Parcial / **BLOQUEADO** | Categoria e grupo ficam em Gerais (só admin). Caixa e portador não têm restrição por perfil: permissões por tela são Fase 2 (decisões 4 e 19). |
| Modelo sem subcategoria (decisão 25) | Implementado | PR #52. |
| Código FER automático, sequência entre empresas, sem edição | Implementado | `cadastro-ferramentas.ts`. |
| Categoria e grupo de Gerais | Implementado | Lista suspensa; renomear ou apagar em uso é bloqueado. |
| Descrição, estoque mínimo, modelo, série obrigatória, patrimônio, data de aquisição, custo, empresa | Implementado | Cadastros > Ferramentas (`ItensModulo.tsx`). |
| Marca de Gerais | Implementado | PR #39. |
| Lista e movimentos (entrada/saída no histórico, código na linha e no CSV, termos de Responsabilidade e Encerramento) | Implementado | PRs #24 a #26. |
| Caixa 01–100 e Portador com histórico | Implementado | PRs #37 a #40. |
| Campos fora do MD no cadastro do modelo | Parcial | O formulário ainda tem Unidade de medida fixa "Unidade", Status com lista fixa (`STATUS_FERRAMENTA`: Ativo, Manutenção, Inativo), Nota fiscal, Observações e Estoque atual inicial. Nenhum consta do MD nem de decisão. Precisa da decisão do responsável (manter, tirar ou passar para Gerais). Ver prioridade 6. |
| Subcategorias da categoria Ferramentas em Gerais | Parcial | Sem uso desde a decisão 25; continuam cadastráveis em Gerais. Precisa de decisão (esconder ou manter). |

## 6. Empregados

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Campos: nome, CPF, matrícula LxPx, empresa, e-mail, admissão, demissão; sem cargo nem "ativo" | Implementado | `empregados.tsx`. Coluna `email` real: **BLOQUEADO** (Fase 2). |
| Ativos no bloco superior; demissão leva ao bloco inferior (decisão 15) | Implementado | Blocos "Ativos" e demitidos; demissão futura só vale na data. |
| Excluir só Administrador; acesso Administrador e RH | **BLOQUEADO** | Hoje qualquer perfil com escrita exclui. Permissões por perfil são Fase 2 (decisões 4 e 19). |

## 7. Empresas

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Nome fantasia (decisão 11), razão social, CNPJ | Implementado | `empresas.tsx`. |
| Endereço | Não iniciado | Falta na `main`. Material antigo na branch `feat/empresas` (PR #11, fechado sem merge). Possível no demo; as colunas reais já estão na pendência da Fase 2. Ver prioridade 2. |
| Status (ativa ou inativa) | Não iniciado | Idem. O MD não diz o efeito da empresa inativa: proposta abaixo. |
| Excluir só Administrador; acesso Administrador e RH | **BLOQUEADO** | Permissões por perfil, Fase 2. |

## 8. Fornecedores

| Item do MD | Status | Onde está / o que falta |
| --- | --- | --- |
| Código de 5 dígitos, várias categorias de Gerais (decisão 13), razão social, fantasia, CNPJ, endereço completo, IE, telefone, contato, observações | Implementado | `cadastros/fornecedores.tsx`, `fornecedores-demo.ts`. Só no navegador; tabela real é Fase 2. |
| Acesso só Administrador | **BLOQUEADO** | Permissões por perfil, Fase 2. |

## 9. Fora dos itens do MD: padrões obrigatórios e decisão 22

Achados da varredura em telas que o MD não detalha, mas que os padrões obrigatórios cobrem:

| # | Achado | Status | Onde |
| --- | --- | --- | --- |
| A | Relatórios por empregado de EPI e de Uniformes leem só as últimas 1000 movimentações **de todas as empresas** e filtram o empregado na tela; os relatórios de baixa leem as últimas 1000 da empresa. Com histórico grande, entregas antigas somem. É o mesmo problema que a pendência 8 corrigiu na Ficha de EPI Avulsa. | Não iniciado | `EpiRelatorioFuncionario.tsx`, `UniformesRelatorioFuncionario.tsx`, `EpiRelatorioBaixa.tsx`, `UniformesRelatorioBaixa.tsx` (`useMovimentacoes(…, 1000)`) |
| B | A tela Relatórios (Dashboard) lê só as últimas 500 movimentações do período. | Não iniciado | `relatorios.tsx` |
| C | Fornecedor das Compras de EPI e de Uniformes é digitado, embora exista o cadastro de Fornecedores (decisão 22, regras 1 e 2, por analogia). | Não iniciado | `EpiComprasModulo.tsx`, `UniformesComprasModulo.tsx` |
| D | Editar ou excluir compra de EPI ou Uniforme não ajusta o estoque do demo; no banco real a compra é imutável. Falta decidir se os botões saem. | Aguarda decisão | Handoff, "Fica para a Fase 2" |
| E | Datas padrão em UTC (compras, vistoria, relatórios de baixa, ocorrências, janela de 180 dias). A varredura achou também o período padrão da tela Relatórios (`relatorios.tsx`, hoje e 30 dias) em UTC. | **BLOQUEADO** (pendência 4) | Ver handoff, pendência 4 |
| F | A cobertura de estoque do dashboard soma só as primeiras 1000 saídas dos últimos 180 dias. | **BLOQUEADO** (mesma consulta da pendência 4) | `hooks-gemape.ts`, `useSaidasPorItem` |
| G | Ferramenta antiga sem categoria de ferramenta abre a edição com valor inicial possivelmente inválido. | Não iniciado | `ItensModulo.tsx` |
| H | 4 testes falham no Windows por montarem caminho com `new URL(...).pathname`; correção com `fileURLToPath`. | Não iniciado | `tests/gerais-protecao`, `listas-fixas`, `marcas-gerais`, `subcategoria-referencia` |

## 10. Itens BLOQUEADOS (sem plano de execução)

- Permissões por perfil em todas as telas (Empregados, Empresas, Fornecedores, Caixa e Portador; exclusões só pelo Administrador): decisões 4 e 19, depende de auth.
- Tabelas e colunas reais (empresas, e-mail de empregados, Gerais, fornecedores, Ficha de EPI, marca/modelo de uniforme, código/descrição de veículo, portadores, caixas, notas importadas, tamanho por referência e estoque por tamanho) e as 3 migrations não aplicadas: Fase 2, decisão 19.
- Evoluções da importação do XML (decisão 21): aguardam o responsável. A única mudança no XML prevista é a do PR D (item com tamanho vira pendência).
- Pendência 4 (datas UTC), com os achados E e F.
- Deploy na VPS: decisão 20.

## 11. Prioridade sugerida dentro da Fase 1

A Fase 2 só abre com o sistema 100% funcional (decisão 19), então a ordem abaixo põe primeiro o que o MD pede e ainda falta, depois os padrões obrigatórios, depois acabamento. Nada começa sem a liberação do responsável; cada item terá branch e PR próprios.

| Prioridade | Item | Por quê | Precisa de decisão antes? |
| --- | --- | --- | --- |
| 1 | PR D: tamanho e unidade de Gerais em EPI e Uniforme, estoque e mínimo por tamanho (decisão 23 com as 4 regras) | Único item do MD (Associar tamanho e medida) ainda sem uso nos módulos; já aprovado e documentado. | Não; só a liberação. |
| 2 | Empresas: endereço e status | Campos do MD ainda ausentes. | Sim: efeito da empresa inativa. Proposta: some das listas de escolha de cadastros e movimentos novos e continua no histórico, relatórios e termos. |
| 3 | Relatórios lendo o histórico completo (achados A e B) | Padrão obrigatório de leitura completa por empregado e empresa. | Não. |
| 4 | Fornecedor das compras escolhido do cadastro (achado C) | Fonte única (decisão 22). | Sim: muda o campo da tela de compras; a compra antiga com nome digitado continua aparecendo. |
| 5 | Código de fábrica: nome atual do produto e do fornecedor e proteção ao excluir (achados 6 e 11 da decisão 22) | Regras 3 e 5 da decisão 22. | Não. |
| 6 | Cadastro de ferramenta: campos fora do MD (unidade fixa, status em lista fixa, nota fiscal, observações, estoque inicial), subcategorias de Ferramentas sem uso em Gerais e achado G | Conformidade com o MD e a decisão 22. | Sim: manter, tirar ou levar para Gerais, campo a campo. |
| 7 | Botões Editar e Excluir das compras (achado D) | Evita estoque divergente no demo e erro no banco real. | Sim. |
| 8 | Testes no Windows (achado H) | Só ambiente de desenvolvimento. | Não. |
