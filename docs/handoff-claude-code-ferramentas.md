# Handoff para Claude Code — Ferramentas

Atualizado em 01/10/2026, sobre a `main` após o merge do PR #48 (`b6f94eb`).

**Marco: o plano de Ferramentas da Fase 1 está completo** (etapas 1 a 6, PRs #20 a #26, confirmado pelo responsável em 30/09/2026). A proposta de Caixas e Portador (`docs/proposta-caixas-portador.md`) foi aprovada pelo responsável em 30/09/2026, e as quatro etapas abaixo também, na ordem proposta (decisão 18). Cada etapa para após o PR, para validação e merge do responsável. A Fase 2 continua aguardando decisão: não iniciar.

**Marco: o bloco FERRAMENTAS do MD está concluído** com as etapas 1 a 4 de Caixas e Portador (PRs #37 a #40), confirmado pelo responsável em 01/10/2026. O que ainda resta do MD fora desse bloco está em "O que resta do MD fora de Ferramentas", abaixo; nenhum item começa sem o ok do responsável.

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

## Caixas e Portador — etapas aprovadas

A proposta aprovada lista o escopo, mas não define etapas; a divisão abaixo foi aprovada em 30/09/2026. Cada etapa terá branch e PR próprios, a partir da `main` e só depois do merge da anterior, com testes antes do código, validação completa (testes, typecheck, build, `git diff --check`), screenshots e preview da Vercel. Tudo roda no modo demonstração; nada vai para o Supabase real. As tabelas, migrações e permissões por tela ficam registradas como pendência da Fase 2.

Padrões obrigatórios em todas as etapas:
- código automático no padrão sigla + numeração;
- listas vindas de Cadastros > Gerais;
- operações atômicas: validação das linhas e do estoque, aviso quando passar do disponível, gravação de tudo de uma vez, trava contra segundo clique e lista limpa após gravar;
- escape de textos em todo documento gerado;
- datas locais de Brasília;
- histórico completo por empregado e empresa, sem o limite de 1000 linhas;
- estoque do demo reativo.

| Etapa | Entrega | Critérios de aceite |
| --- | --- | --- |
| 1 — caixas habilitadas (mergeada no PR #37, `c5846ac`) | Em Cadastros > Gerais, a lista das caixas numeradas de 01 a 100, cada uma com a flag de habilitação. O cadastro de caixa e as telas que escolhem caixa (Termo de Responsabilidade, Termo de Vistoria, aba Caixas de Ferramentas) só oferecem caixas habilitadas. | Numeração fixa de 1 a 100, sem repetir nem pular. Desabilitar uma caixa em uso é recusado, com o motivo. A caixa desabilitada some das listas de escolha, mas continua no histórico. |
| 2 — portador (mergeada no PR #38, `ed1f623`) | Cadastro de Portador: caixa (só as habilitadas), empregado por busca de palavra-chave, status ativa/inativa e observação. Histórico de portadores por caixa. | Uma caixa tem no máximo um portador ativo. Trocar o portador encerra o anterior no histórico, com data local. Empregado demitido não pode ser novo portador (decisão 15). O histórico é lido por inteiro. A gravação é atômica e trava o segundo clique. |
| 3 — marcas (mergeada no PR #39, `48a3e28`) | Cadastro de marcas de ferramentas em Cadastros > Gerais. O cadastro de ferramenta passa a escolher a marca dessa lista, em vez de texto livre. | Marca em uso não pode ser renomeada nem excluída sem aviso, como categoria e grupo (etapa 2 de Ferramentas). As ferramentas já cadastradas com marca em texto continuam exibindo a marca. |
| 4 — validação (mergeada no PR #40, `ab134d6`) | Fluxo completo no navegador (habilitar caixa, atribuir portador, trocar portador, termos com a caixa, marca na ferramenta), handoff atualizado e pendências da Fase 2 registradas. | Roteiro e capturas abaixo. Desvio de exibição dos itens da caixa corrigido e revalidado. |

Respostas do responsável aos pontos da etapa 1 (30/09/2026, decisão 18):

1. **Habilitação** em Cadastros > Gerais > Caixas, conforme a proposta.
2. **Código** de `CX-0001` a `CX-0100`, sequência única para as três empresas. O número da caixa (01 a 100) é escolhido no cadastro entre as habilitadas livres, e o código sai dele; depois de gravado, não muda.
3. **Responsável:** o portador ativo passa a ser o responsável exibido, e o campo Responsável estático deixa de ser usado (etapa 2).

Etapa 2 concluída pelo responsável após o merge do PR #38. O portador ativo substitui o campo Responsável estático no cadastro e nas listas de caixa. O histórico do modo demonstração fica em `src/lib/portadores-caixa.ts`, com troca atômica, data de Brasília e leitura completa. A `main` contém também o workflow da vitrine GitHub Pages.

Etapa 3 concluída após o merge do PR #39 (`48a3e28`): marcas de ferramentas são cadastradas em Gerais e selecionadas no modelo; marcas antigas em texto continuam visíveis. A etapa 4 valida o fluxo integrado na branch `feat/caixas-portador-validacao`. A pendência 4 e a Fase 2 aguardam decisão do responsável.

### Validação de ponta a ponta de Caixas e Portador (etapa 4)

Roteiro executado no Chromium em 30/09/2026, com sessão limpa e `VITE_DEMO_MODE=true`. A primeira passagem usou a `main` em `48a3e28`; após corrigir o desvio encontrado, o roteiro completo foi repetido na branch `feat/caixas-portador-validacao`. A ferramenta de teste percorreu a interface real, conferiu tabelas, documentos renderizados e CSVs baixados. Nenhum erro de página foi registrado. Os dados abaixo são locais e fictícios.

| Passo | Resultado |
| --- | --- |
| Cadastros > Gerais > Caixas: habilitar 01 | Gravada como habilitada (1/100). [Captura](evidencias/caixas-portador-etapa4/habilitacao.png). |
| Cadastros > Gerais > Marcas: cadastrar Makita | Marca disponível no cadastro do modelo. |
| Cadastros > Ferramentas: cadastrar Furadeira E2E, marca Makita, série SERIE-E2E, custo R$ 10,50, estoque 3 | Ferramenta salva como FER-0002. [Captura](evidencias/caixas-portador-etapa4/ferramenta.png). |
| Caixas de Ferramentas: cadastrar número 01 com a ferramenta | Caixa CX-0001 criada com o item. [Captura](evidencias/caixas-portador-etapa4/caixa.png). |
| Portadores: atribuir Maria da Silva à CX-0001 | Portadora ativa exibida na lista de caixas e na aba Caixas e itens; [CSV de caixas](evidencias/caixas-portador-etapa4/caixas.csv). [Captura do histórico](evidencias/caixas-portador-etapa4/portador-ativo.png). |
| Criar João Teste e trocá-lo diretamente pelo portador ativo | João fica Ativa; Maria passa a Inativa no histórico, com fim em 30/09/2026, sem etapa intermediária de inativação. [Captura](evidencias/caixas-portador-etapa4/troca-direta.png). |
| Inativar Maria e consultar histórico | Vínculo anterior consta como Inativa, com datas locais de início e fim; a lista de caixas deixa de mostrar portador ativo. [Captura](evidencias/caixas-portador-etapa4/historico.png). |
| Atribuir Maria novamente | O histórico mantém o vínculo encerrado e apresenta o novo vínculo Ativa; a lista volta a mostrar Maria. |
| Termo de Responsabilidade individual: empresa GEMAPE, Maria, CX-0001 | A caixa e FER-0002 aparecem no documento gerado. [Captura](evidencias/caixas-portador-etapa4/termo-gerado.png). |
| Termo de Vistoria periódica: empresa GEMAPE, CX-0001, sem empregado selecionado | O documento resolve Maria como portadora ativa e inclui CX-0001. [Captura](evidencias/caixas-portador-etapa4/vistoria.png). |
| Termo de Encerramento: devolver saldo 1 de FER-0002 | O documento identifica Maria e FER-0002; estoque volta a 3. [Captura](evidencias/caixas-portador-etapa4/encerramento.png). |
| Cadastro de ferramentas e CSV: reabrir lista | FER-0002, marca Makita e estoque 3 permanecem visíveis e constam do [CSV de ferramentas](evidencias/caixas-portador-etapa4/ferramentas.csv). [Captura](evidencias/caixas-portador-etapa4/cadastro-ferramenta-final.png). |
| Cadastros > Gerais > Caixas: tentar desabilitar 01 em uso | A caixa permanece habilitada, conforme a proteção esperada. |
| Caixas e itens: abrir CX-0001 com Furadeira E2E vinculada | **Desvio reproduzido e corrigido:** antes apareciam “1 item” e quantidade 1, mas código, nome, marca/modelo, empresa e estado ficavam vazios. Após a correção, FER-0002, Furadeira E2E e Makita aparecem. [Antes](evidencias/caixas-portador-etapa4/caixas-itens-antes-correcao.png) · [Depois](evidencias/caixas-portador-etapa4/caixas-itens-corrigido.png). |

A persistência, concorrência e permissões com Supabase real pertencem à Fase 2. A troca direta para um segundo empregado e a inativação seguida de nova atribuição foram exercidas em sessões limpas separadas. A consulta `select("*, ferramenta:ferramentas(*)")` era ignorada pelo adaptador do modo demonstração; o teste `tests/caixa-itens-demo.test.mjs` reproduziu a ausência da ferramenta antes da correção e passou depois. O roteiro completo foi repetido no navegador sem erros de página.

Validação da branch da etapa 4 após a correção: `npm test` (122/122), `npm run typecheck`, `VITE_DEMO_MODE=true npm run build` e `git diff --check` passaram.

Visualização: o workflow `.github/workflows/pages-demo.yml` publica a `main` em modo demonstração no endereço fixo `https://gemape.github.io/GemapeHub/` após cada merge. O responsável precisa selecionar uma vez **Settings > Pages > Source: GitHub Actions**. O build usa `/GemapeHub/` como base, gera `index.html` estático e copia para `404.html` para as rotas. No PR, ler o check/comentário da Vercel pelo GitHub e informar o preview; se ausente, informar a URL padrão da branch e aguardar confirmação visual. Não acessar a API da Vercel.

Etapa 1 na branch `feat/caixas-habilitadas`:
- A tela Cadastros > Gerais > Caixas marca as caixas habilitadas e grava tudo de uma vez. Uma caixa cadastrada não pode ser desabilitada.
- O cadastro de caixa escolhe o número entre as habilitadas livres. O demo recusa código repetido, como a restrição única do banco.
- Os termos de Responsabilidade e de Vistoria e a aba Caixas de Ferramentas listam só as caixas habilitadas, em ordem de número.
- Caixas antigas sem número não aparecem nas listas de escolha até receberem um número na edição.
- As regras estão em `src/lib/caixas-habilitadas.ts`.

## Pendências para PRs separados

Ordem sugerida pelo responsável em 30/09/2026. Cada item tem branch e PR próprios, com testes antes do código e validação completa; o próximo só começa depois do merge do anterior.

| # | Pendência | Estado |
| --- | --- | --- |
| 1 | HTML do Termo de Responsabilidade sem escape de textos: aplicar o mesmo tratamento do Termo de Encerramento. | Concluída: PR #27, merge `4f220ee`. O HTML está em `src/lib/termo-responsabilidade-html.ts`, com `escaparHtml` e a data impressa sem cair no dia anterior. |
| 2 | Termos de Uniformes (entrega e baixa) e Termo de Vistoria gravam item a item: usar o mesmo padrão atômico dos termos de Ferramentas (validar antes e gravar tudo de uma vez). | Concluída: PR #28, merge `47272e8`. Regras em `src/lib/termos-atomicos.ts`: entrega e baixa de uniformes não passam do estoque disponível; vistoria confere as linhas, mas não o estoque; "Nenhum / Empresa" grava sem empregado. Os três termos gravam tudo de uma vez, travam o segundo clique e limpam a lista após gravar. |
| 3 | Abertura dos termos em aba nova é bloqueada por alguns navegadores, porque a aba abre depois da gravação. Vale para todos os termos (EPI, Uniformes e Ferramentas). | Concluída: PR #35, merge `cb55f0d`. Os 7 termos abrem num visualizador dentro da tela (`abrirDocumento` em `src/lib/visualizador-documento.ts`), com Imprimir, Baixar e Fechar; nenhuma aba nova. |
| 4 | Data padrão das compras de EPI e Uniformes usa o fuso UTC (`toISOString`) e mostra o dia seguinte no fim da noite: usar `hojeLocal()`. O code review da pendência 7 achou o mesmo `toISOString` em outras datas padrão: Termo de Vistoria, relatórios de baixa de EPI e de Uniformes, e Ocorrências. Inclui a janela interna de 180 dias da cobertura de estoque, também calculada em UTC (`src/lib/hooks-gemape.ts`, saídas dos últimos 180 dias). | Aberta, aguardando decisão do responsável. O PR #34 (branch `fix/datas-padrao-locais`) foi fechado sem merge pelo responsável em 30/09/2026; a correção não está na `main`. |
| 5 | HTML dos termos de Baixa de Uniforme e de Vistoria sem escape de textos (nome do item, estado, motivo e observação digitada): aplicar `escaparHtml`, como no Termo de Responsabilidade. Achado no code review da pendência 2; o problema já existia antes dela. | Concluída: PR #29, merge `82e681d`. HTML em `src/lib/termo-baixa-uniforme-html.ts` e `src/lib/termo-vistoria-html.ts`, com `escaparHtml` em todos os textos; a data da vistoria é impressa sem cair no dia anterior. |
| 6 | HTML de outros termos ainda sem escape: Termo de Entrega de EPI e Ficha de EPI Avulsa (empresa, empregado e nome do item) e Termo de Entrega de Uniforme (empresa e empregado; os itens já são escapados). Achado no code review da pendência 5; o problema já existia antes. | Concluída: PR #30, merge `7cdcb40`. HTML em `src/lib/termo-entrega-epi-html.ts`, `src/lib/ficha-epi-avulsa-html.ts` e `src/lib/termo-entrega-uniforme-html.ts`. Com as pendências 1, 5 e 6, os 7 termos que abrem em aba nova escapam os textos: classe de risco fechada. |
| 7 | Termo de Entrega de EPI já grava em lote, mas não trava o segundo clique nem limpa a lista após gravar: um novo clique registra a mesma entrega de novo. Aplicar o mesmo padrão dos termos de Uniformes e de Ferramentas (validação de estoque, trava e lista limpa). Na mesma tela, a observação gravada usa a data em UTC (`new Date().toISOString()`), mesmo problema da pendência 4. Achado no code review da pendência 6; já existia antes. | Concluída: PR #31, merge `096070f`. Trava contra segundo clique, lista limpa após gravar, gravação em lote e validação das linhas e do estoque (`validarSaidaDeEpis`); a observação usa a data local (`observacaoEntregaEpi`). |
| 8 | Ficha de EPI Avulsa lê só as últimas 1000 movimentações de EPI de todas as empresas e filtra o empregado na tela: com histórico grande, entregas antigas somem da ficha. Ler do banco o histórico inteiro do empregado, como no Termo de Encerramento. Achado no code review da pendência 6; já existia antes. | Concluída: PR #32, merge `fc108b2`. A ficha lê do banco, na hora de gerar, o histórico inteiro do empregado naquela empresa (`lerHistoricoEpiEmpregado` em `src/lib/historico-epi-empregado.ts`). O limite de 1000 linhas por consulta do Supabase hospedado ficou registrado em `docs/pendencias-fase2.md`. |

Fica para a Fase 2: editar ou excluir uma compra de EPI ou uniforme não ajusta o estoque do demo. No banco real, compras são imutáveis (gatilho `gemape_compra_imutavel`) e a tela recebe erro. Decidir se os botões Editar e Excluir de compras saem da tela.

## O que resta do MD fora de Ferramentas

Levantamento de 01/10/2026: cada item da especificação fora do bloco FERRAMENTAS foi conferido contra o código da `main`. Categorias, subcategorias, código de fábrica (com CA para EPI), endereçamento, tamanhos e unidades, associar tamanho e medida, código do produto, cadastros de EPI, Ficha de EPI, Uniforme, Veículo, Empregados e Fornecedores estão conformes. Restam os grupos abaixo. Nenhum começa sem o ok do responsável; cada um terá branch e PR próprios.

| # | Grupo | O que falta | Estado |
| --- | --- | --- | --- |
| 1 | Importação do XML da nota fiscal | O MD diz que o código de fábrica serve para o sistema associar o produto ao importar o XML da nota do fornecedor e alimentar o estoque. O cadastro do código de fábrica existe, mas nenhuma tela lê o XML: as compras de EPI e de Uniformes só têm o campo manual Nota Fiscal. | Concluído: PR #44 mergeado em 01/10/2026 (decisão 21). |
| 2 | Cadastro de Empresas | Faltam o endereço (rua, número, bairro, CEP, cidade, estado) e o status (ativa ou inativa) do MD. O material está na branch `feat/empresas` (PR #11, fechado sem merge, commit `b0f0c7e`), que será recuperado a partir da `main` atual. | Aguarda ok do responsável. |
| 3 | Listas fixas remanescentes | Os trechos sem uso com listas fixas foram removidos; as listas em `src/lib/gemape.ts` servem apenas como dados iniciais de Gerais. | Concluído: PR #43 mergeado em 01/10/2026. |
| 4 | Pendência 4 (datas UTC) | Ver "Pendências para PRs separados", item 4. | Aguarda decisão do responsável. |

### Importação do XML da NF-e (grupo 1)

Botão "Importar NF-e (XML)" nas Compras de EPI, nas Compras de Uniformes e nas Movimentações de Ferramentas, todos abrindo a mesma tela (`src/components/modules/ImportarNfeXml.tsx`). Regras da decisão 21:
- leitura em `src/lib/nfe-xml.ts` (NF-e 4.00, sem biblioteca; recusa DOCTYPE/ENTITY; data de emissão em Brasília);
- casamento e entradas em `src/lib/importacao-nfe.ts`: fornecedor pelo CNPJ do emitente, empresa pelo CNPJ do destinatário, item pelo código de fábrica; EPI e Uniforme viram compra com a data de emissão; Ferramenta vira Entrada com a origem na observação; o resto fica pendente;
- gravação numa operação única do modo demonstração (`importar_nota_fiscal`), que desfaz tudo se uma parte falhar e recusa a mesma chave;
- testes em `tests/importacao-nfe.test.mjs` com a NF-e fictícia `tests/fixtures/nfe-4.00-exemplo.xml`.

Fica para a Fase 2 (decisão 19), sem ação agora:
- exclusão de empregados, empresas e cadastros só pelo Administrador, e as permissões por tela (decisão 4); hoje só Cadastros > Gerais é restrito ao Administrador;
- marca e modelo do uniforme e código e descrição do veículo, que hoje só são gravados no modo demonstração e precisam de colunas no banco real;
- endereço e status de empresas no banco real (colunas já registradas em `docs/pendencias-fase2.md`).

## Conformidade com a decisão 22 (Cadastros > Gerais parametriza tudo)

Auditoria de 01/10/2026 sobre a `main` (`59dd52c`), **encerrada após o merge dos PRs A, B e C**. O PR #43 removeu listas fixas sem uso e o PR #45 registrou a decisão 22 na documentação. As entregas aprovadas da auditoria estão na `main`:

- **PR A (#46):** marcas de Uniforme e Veículo passaram a ser selecionadas em Gerais; a lista fixa `CATEGORIAS_FERRAMENTA` foi removida.
- **PR B (#47):** EPI, Uniforme, Ferramenta e Veículo passaram a guardar a subcategoria por referência (`subcategoria_id`), acompanhando o nome atual de Gerais.
- **PR C (#48):** proteção de exclusão dos parâmetros em uso, categorias-base e regras de código; opção de desativar/reativar os parâmetros aplicáveis em Gerais. A conferência de marca de ferramenta consulta o banco ativo.

O achado sobre tamanhos e unidades fica para a decisão do responsável sobre o PR D; nenhum trabalho nele foi iniciado. Os demais achados e limites documentados abaixo não são autorização para novas correções.

Já conforme:
- Subcategoria em lista suspensa vinda de Gerais no cadastro de EPI, Uniforme, Ferramenta e Veículo (`CadastroProduto.tsx`, `ItensModulo.tsx`, `VeiculosCadastroModulo.tsx`).
- Categorias múltiplas do Fornecedor marcadas a partir de Gerais e gravadas pelo id (`fornecedores.tsx`).
- Categoria, grupo e marca de Ferramenta em lista suspensa de Gerais; renomear ou apagar opção em uso é bloqueado com aviso (`categorias.tsx`).
- Código do produto gerado pela regra de Gerais e não editável.
- Código de fábrica ligado a empresa, produto e fornecedor, escolhidos em listas; a importação do XML casa por ele.
- Caixas: só números habilitados em Gerais aparecem; caixa cadastrada não pode ser desabilitada.
- Propagação na tela: toda alteração em Gerais avisa as telas abertas na hora (`EVENTO_PARAMETROS` em `parametros-base.ts`).

Registro dos achados e encaminhamentos:

| # | Regra | Achado | Onde |
| --- | --- | --- | --- |
| 1 | 1 e 2 | Tamanhos, unidades e Associar Tamanho e Medida existem em Gerais, mas nenhum cadastro de módulo os usa: EPI e Uniforme não têm campo de tamanho ou unidade, e Ferramenta tem a unidade fixa "Unidade". | `CadastroProduto.tsx`, `ItensModulo.tsx` (opção fixa "Unidade") |
| 2 | 1 e 2 | ~~Marca de Uniforme e de Veículo é digitada.~~ Resolvido no PR #46 (PR A, mergeado em 01/10/2026): listas Marcas de uniformes e Marcas de veículos em Gerais; marca antiga digitada fica visível e é mantida na edição; marca em uso não pode ser renomeada nem excluída. | `src/lib/marcas-gerais.ts` |
| 3 | 1 | ~~Listas fixas que sobram~~: `TAMANHOS_*`, `UNIDADES_*` e `VeiculosModulo.tsx` saíram no PR #43; `CATEGORIAS_FERRAMENTA` saiu no PR A. As listas `CATEGORIAS_EPI`, `CATEGORIAS_UNIFORME` e `TIPOS_VEICULO` servem só de dados iniciais de Gerais. | `src/lib/gemape.ts` |
| 4 | 3 | ~~Cópia estagnada: produtos guardam o NOME da subcategoria.~~ Resolvido no PR #47 (PR B, mergeado): EPI, Uniforme, Ferramenta e Veículo gravam `subcategoria_id` e mostram sempre o nome atual de Gerais (lista, busca, CSV, edição e Ficha de EPI); renomear em Gerais muda os cadastros na hora. Migração do demo: ao abrir e a cada mudança em Gerais, cadastro só com nome, ou ligado a subcategoria excluída, é ligado à subcategoria de mesmo nome (sem diferença de acento ou maiúscula) da categoria do módulo, e o nome gravado acompanha o nome atual de Gerais. Nome que não casa continua aparecendo como "fora de Cadastros > Gerais" e é mantido ao editar outros campos, inclusive em Ferramenta. | `src/lib/subcategoria-referencia.ts`, `demo-client.ts` |
| 5 | 3 | Ferramenta guarda o nome de categoria, grupo e marca; não fica estagnado porque renomear em uso é bloqueado, mas por isso a opção em uso não pode ser renomeada. | `cadastro-ferramentas.ts` |
| 6 | 3 | Código de fábrica guarda cópia do nome do produto e do fornecedor e mostra a cópia. | `parametros-base.ts` (`nome_produto`, `fornecedor_nome`) |
| 7 | 3 | ~~Gerais não tem "desativar".~~ Resolvido no PR #48 (PR C): subcategorias, marcas (ferramenta, uniforme e veículo), categorias e grupos de ferramenta têm o botão Desativar/Reativar. Desativado sai das listas de seleção dos cadastros novos, mas o cadastro que já o usa continua mostrando e mantendo o parâmetro na edição, marcado "(desativado)". Categorias-base e tamanhos/unidades não são desativáveis (tamanhos e unidades ficam para o PR D). | `alterarAtivo`, `paraSelecao` em `parametros-base.ts` |
| 8 | 5 | ~~Apagar subcategoria não confere produtos que a usam.~~ Resolvido no PR #48 (PR C): a exclusão é recusada e o aviso mostra os cadastros que a usam (até 5 códigos por módulo, "e mais N"), sugerindo desativar. O mesmo aviso com códigos vale para marcas e opções de Ferramenta. | `src/lib/uso-parametros.ts`, `categorias.tsx` |
| 9 | 5 | ~~Apagar categoria não confere fornecedores e as categorias-base podem ser apagadas.~~ Resolvido no PR #48 (PR C): categoria marcada por fornecedor é recusada com a lista dos fornecedores; as categorias-base de EPI, Uniformes, Ferramentas e Veículos não podem ser excluídas nem desativadas (só renomeadas). | `CATEGORIAS_BASE`, `removerCategoria` em `parametros-base.ts` |
| 10 | 5 | ~~Apagar regra de código não avisa o que depende.~~ Resolvido no PR #48 (PR C): a regra de uma categoria-base não pode ser excluída; o aviso diz que novos cadastros do módulo ficariam bloqueados e orienta a editar sigla ou numeração. | `removerRegraCodigo`, `codigo-produto.tsx` |
| 11 | 5 | Apagar fornecedor ou produto não confere os códigos de fábrica que apontam para ele. | `fornecedores-demo.ts`, cadastros de produto |
| 12 | 5 | ~~A conferência de "em uso" da marca de Ferramenta lê sempre os dados de demonstração.~~ Resolvido no PR #48 (PR C): a marca consulta o banco ativo. Categoria e grupo continuam no demo, onde seus campos existem; a migração desses parâmetros para o banco real pertence à Fase 2. | `categorias.tsx` |

Fora de Gerais, mas parecido: o fornecedor das Compras de EPI e Uniformes é digitado, embora exista o cadastro de Fornecedores. Endereçamento é cadastrado e lê o produto pelo código, mas ainda não alimenta nenhum módulo.

## Decisões vigentes

- Categoria e grupo do modelo são seleções mantidas em Cadastros > Gerais. A subcategoria da categoria de produto Ferramentas vem de Gerais e alimenta a regra global do código (FER-0001 por padrão); código não é editável e permanece na edição.
- Série informada é obrigatória, sem geração de série fictícia. Patrimônio e data de aquisição são opcionais. Preço de custo não negativo tem até duas casas decimais e alimenta o indicador “Valor total em estoque”.
- A Fase 1 usa dados locais de demonstração. Não criar ou alterar tabelas, migrations, autenticação ou dados no Supabase real.
- Permissões por tela e revisão do estoque histórico de ferramentas permanecem na Fase 2 (`docs/pendencias-fase2.md`). Caixas e Portador concluída: etapas 1 a 4 mergeadas (PRs #37 a #40).
- Relatórios saiu do menu Cadastros (PR #41): a tela é aberta só pelo atalho Relatórios do Dashboard.

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
- Só avançar de etapa depois do aviso "PR mergeado". Pelas decisões 19 e 20, a ordem final é concluir o MD (o que resta está em "O que resta do MD fora de Ferramentas", mais a pendência 4), confirmar o sistema 100% funcional, executar a Fase 2 com auth e banco de dados reais do Supabase e somente então fazer o deploy de produção na VPS da Mega Provedor. A Fase 2 ainda não está autorizada.
