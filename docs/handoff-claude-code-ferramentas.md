# Handoff para Claude Code — Ferramentas

Atualizado em 01/10/2026, sobre a `main` após o merge do PR #49 (`40bc9ab`).

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

O achado sobre tamanhos e unidades (linha 1) virou a decisão 23 e foi resolvido no PR D para EPI e Uniforme (a unidade fixa de Ferramenta continua aberta); veja "PR D — tamanho e unidade de EPI e Uniforme", abaixo. Os demais achados e limites documentados abaixo não são autorização para novas correções.

Já conforme:
- Subcategoria em lista suspensa vinda de Gerais no cadastro de EPI, Uniforme e Veículo (`CadastroProduto.tsx`, `VeiculosCadastroModulo.tsx`); Ferramenta não tem subcategoria desde a decisão 25.
- Categorias múltiplas do Fornecedor marcadas a partir de Gerais e gravadas pelo id (`fornecedores.tsx`).
- Categoria, grupo e marca de Ferramenta em lista suspensa de Gerais; renomear ou apagar opção em uso é bloqueado com aviso (`categorias.tsx`).
- Código do produto gerado pela regra de Gerais e não editável.
- Código de fábrica ligado a empresa, produto e fornecedor, escolhidos em listas; a importação do XML casa por ele.
- Código de fábrica também se cria pelo botão "Importar NF-e (XML)" da própria tela (decisão 27, `src/lib/associacao-nfe.ts` e `ImportarNfeCodigoFabrica.tsx`): lista os itens da nota, o usuário escolhe o produto de cada código e a associação vale para as próximas notas. A tela só cria associações e não mexe em estoque (decisão 24).
- Caixas: só números habilitados em Gerais aparecem; caixa cadastrada não pode ser desabilitada.
- Propagação na tela: toda alteração em Gerais avisa as telas abertas na hora (`EVENTO_PARAMETROS` em `parametros-base.ts`).

Registro dos achados e encaminhamentos:

| # | Regra | Achado | Onde |
| --- | --- | --- | --- |
| 1 | 1 e 2 | ~~EPI e Uniforme não usam tamanhos, unidades nem Associar Tamanho e Medida.~~ Resolvido no PR D (decisão 23): unidade e tamanho em lista vinda da associação da subcategoria, com estoque por tamanho. Continua aberto: Ferramenta tem a unidade fixa "Unidade". | `CadastroProduto.tsx`, `ItensModulo.tsx` (opção fixa "Unidade") |
| 2 | 1 e 2 | ~~Marca de Uniforme e de Veículo é digitada.~~ Resolvido no PR #46 (PR A, mergeado em 01/10/2026): listas Marcas de uniformes e Marcas de veículos em Gerais; marca antiga digitada fica visível e é mantida na edição; marca em uso não pode ser renomeada nem excluída. | `src/lib/marcas-gerais.ts` |
| 3 | 1 | ~~Listas fixas que sobram~~: `TAMANHOS_*`, `UNIDADES_*` e `VeiculosModulo.tsx` saíram no PR #43; `CATEGORIAS_FERRAMENTA` saiu no PR A. As listas `CATEGORIAS_EPI`, `CATEGORIAS_UNIFORME` e `TIPOS_VEICULO` servem só de dados iniciais de Gerais. | `src/lib/gemape.ts` |
| 4 | 3 | ~~Cópia estagnada: produtos guardam o NOME da subcategoria.~~ Resolvido no PR #47 (PR B, mergeado): EPI, Uniforme, Ferramenta e Veículo gravam `subcategoria_id` e mostram sempre o nome atual de Gerais (lista, busca, CSV, edição e Ficha de EPI); renomear em Gerais muda os cadastros na hora. Migração do demo: ao abrir e a cada mudança em Gerais, cadastro só com nome, ou ligado a subcategoria excluída, é ligado à subcategoria de mesmo nome (sem diferença de acento ou maiúscula) da categoria do módulo, e o nome gravado acompanha o nome atual de Gerais. Nome que não casa continua aparecendo como "fora de Cadastros > Gerais" e é mantido ao editar outros campos, inclusive em Ferramenta. | `src/lib/subcategoria-referencia.ts`, `demo-client.ts` |
| 5 | 3 | Ferramenta guarda o nome de categoria, grupo e marca; não fica estagnado porque renomear em uso é bloqueado, mas por isso a opção em uso não pode ser renomeada. | `cadastro-ferramentas.ts` |
| 6 | 3 | Código de fábrica guarda cópia do nome do produto e do fornecedor e mostra a cópia. | `parametros-base.ts` (`nome_produto`, `fornecedor_nome`) |
| 7 | 3 | ~~Gerais não tem "desativar".~~ Resolvido no PR #48 (PR C): subcategorias, marcas (ferramenta, uniforme e veículo), categorias e grupos de ferramenta têm o botão Desativar/Reativar. Desativado sai das listas de seleção dos cadastros novos, mas o cadastro que já o usa continua mostrando e mantendo o parâmetro na edição, marcado "(desativado)". Categorias-base não são desativáveis. Tamanhos e unidades ganharam Desativar/Reativar e proteção de uso no PR D. | `alterarAtivo`, `paraSelecao` em `parametros-base.ts` |
| 8 | 5 | ~~Apagar subcategoria não confere produtos que a usam.~~ Resolvido no PR #48 (PR C): a exclusão é recusada e o aviso mostra os cadastros que a usam (até 5 códigos por módulo, "e mais N"), sugerindo desativar. O mesmo aviso com códigos vale para marcas e opções de Ferramenta. | `src/lib/uso-parametros.ts`, `categorias.tsx` |
| 9 | 5 | ~~Apagar categoria não confere fornecedores e as categorias-base podem ser apagadas.~~ Resolvido no PR #48 (PR C): categoria marcada por fornecedor é recusada com a lista dos fornecedores; as categorias-base de EPI, Uniformes, Ferramentas e Veículos não podem ser excluídas nem desativadas (só renomeadas). | `CATEGORIAS_BASE`, `removerCategoria` em `parametros-base.ts` |
| 10 | 5 | ~~Apagar regra de código não avisa o que depende.~~ Resolvido no PR #48 (PR C): a regra de uma categoria-base não pode ser excluída; o aviso diz que novos cadastros do módulo ficariam bloqueados e orienta a editar sigla ou numeração. | `removerRegraCodigo`, `codigo-produto.tsx` |
| 11 | 5 | Apagar fornecedor ou produto não confere os códigos de fábrica que apontam para ele. | `fornecedores-demo.ts`, cadastros de produto |
| 12 | 5 | ~~A conferência de "em uso" da marca de Ferramenta lê sempre os dados de demonstração.~~ Resolvido no PR #48 (PR C): a marca consulta o banco ativo. Categoria e grupo continuam no demo, onde seus campos existem; a migração desses parâmetros para o banco real pertence à Fase 2. | `categorias.tsx` |

Fora de Gerais, mas parecido: o fornecedor das Compras de EPI e Uniformes é digitado, embora exista o cadastro de Fornecedores. Endereçamento é cadastrado e lê o produto pelo código, mas ainda não alimenta nenhum módulo.

## PR D — tamanho e unidade de EPI e Uniforme (decisão 23)

Liberado pelo responsável em 01/10/2026, em duas etapas, cada uma com PR próprio e parada para o merge:

1. **Documentação** (PR #50, mergeado, e o PR de correções após o code review): decisão 23, pendência da Fase 2 de tamanho e unidade por referência com estoque por tamanho, e este plano.
2. **Código**, em branch própria a partir da `main` depois do merge da etapa 1.

Uma sessão anterior (Codex) chegou a começar o PR D, mas o trabalho ficou só na máquina local e não chegou ao GitHub. O responsável decidiu recomeçar do zero a partir da `main`; aquele trabalho pode ser resgatado depois, se necessário.

Escopo da etapa 2, com os testes escritos antes do código:

| # | Entrega | Como |
| --- | --- | --- |
| 1 | Gerais: Tamanhos e Unidades com Desativar/Reativar e proteção de item em uso; Associar Tamanho e Medida com aviso ao desautorizar | Mesmo padrão do PR #48: botão de olho, item desativado sai das listas de seleção e continua no cadastro que já o usa; exclusão recusada com aviso de onde é usado (produtos, saldos por tamanho, movimentações e compras). Desautorizar um tamanho que tem saldo ou histórico no produto também avisa o que depende. |
| 2 | EPI e Uniforme: Tamanho e Unidade em lista suspensa | Opções = tamanhos e unidades autorizados para a subcategoria do produto em Associar Tamanho e Medida, só os ativos (mais o valor atual na edição). Unidade no cadastro do produto (`unidade_id`); tamanho nas linhas de compra, entrega, baixa e devolução (`tamanho_id`) e na grade de estoque mínimo por tamanho do produto. Referência por id, com o nome sempre atual de Gerais, como `subcategoria_id` no PR #47. Subcategoria sem unidade autorizada não exige unidade. |
| 3 | Estoque por tamanho | Cada produto + tamanho tem estoque e estoque mínimo próprios, com alerta de estoque baixo por tamanho; o estoque do produto é a soma. Produto sem tamanhos mantém o mínimo único. Compra, entrega, baixa e devolução informam o tamanho. O cliente de demonstração soma e subtrai só no saldo daquele tamanho e recusa tamanho ausente ou não autorizado e saldo negativo, de forma atômica. Listas, busca, CSV, edição, Ficha de EPI, compras, movimentações, relatórios e termos mostram o tamanho, com escape nos documentos. |
| 4 | Compatibilidade | Subcategoria sem tamanho autorizado não exige tamanho e mantém o estoque único. Registros antigos sem tamanho (ou com texto fora de Gerais) são mostrados e preservados ao editar outros campos, e o texto antigo é ligado ao parâmetro de mesmo nome quando houver. Migração do saldo: produto com tamanho digitado que casa com Gerais leva o saldo inteiro para esse tamanho; sem tamanho, o saldo fica em "sem tamanho", que só pode sair até zerar; autorizar tamanhos depois só avisa, sem converter saldo; uniformes antigos cadastrados um por tamanho continuam separados. |
| 5 | Importação do XML | A nota não traz tamanho: item casado com produto cuja subcategoria tem tamanho autorizado fica como pendência visível e não é gravado; produto sem tamanho segue como hoje. É a única mudança na importação; o restante do XML (#44) aguarda o responsável. |

Testes obrigatórios: movimentar uma numeração não altera o saldo de outra; tamanho ausente ou diferente dos autorizados é recusado; renomear ou desativar um tamanho em Gerais se reflete nos cadastros.

As regras das linhas 3 a 5 (XML sem tamanho como pendência, migração do saldo, unidade não exigida sem associação, mínimo e alerta por tamanho) foram aprovadas pelo responsável em 01/10/2026 após o code review do PR #50 e fazem parte do escopo do PR D.

Fora do escopo: demais evoluções da importação do XML, pendência 4 e Fase 2.

### Entrega da etapa 2 (código)

Branch `feat/tamanho-estoque-por-tamanho`, aguardando validação e merge do responsável. Tudo vale só no modo demonstração; fora dele nenhum campo novo é enviado ao banco real (as colunas são pendência da Fase 2).

- `src/lib/estoque-tamanho.ts`: regras do saldo por tamanho (`saldosPorTamanho`, `movimentarTamanho`, opções de entrada e saída, resumo, alertas, validação das linhas antes de gravar).
- `demo-client.ts`: o gatilho do demo mexe só no saldo do tamanho (`saldos_tamanho` no produto, `estoque_atual` é a soma), recusa tamanho ausente, não autorizado ou sem saldo e grava tudo ou nada; a compra repassa `tamanho_id` à Entrada.
- `src/components/SeletorTamanho.tsx`: lista de tamanho das linhas. Entrada mostra os autorizados e ativos; saída mostra os que têm saldo, inclusive "Sem tamanho" e o tamanho desativado.
- Cadastro de EPI e Uniforme: Unidade de Gerais (`unidade_id`), grade de mínimo por tamanho (`minimos_tamanho`), coluna Unidade, saldo e mínimo por tamanho na lista, busca e CSV, alerta "Abaixo do mínimo" por tamanho.
- Compras, Termos de Entrega (EPI e Uniforme), Termo de Baixa de Uniforme e Movimentações escolhem o tamanho; relatórios do empregado e de baixas, Ficha de EPI Avulsa, CSV do histórico e termos mostram o tamanho, escapado nos documentos.
- Gerais: Tamanhos e Unidades com Desativar/Reativar e exclusão recusada em uso (`usoDoTamanho`, `usoDaUnidade`); Associar avisa ao desautorizar (`dependenciasDaDesautorizacao`) e ao autorizar numa subcategoria com saldo antigo (`avisoAutorizacaoTamanhos`).
- Importação do XML: item casado com produto que controla tamanho fica como pendência.
- Dashboard: produto com mínimo por tamanho entra nos alertas pelo tamanho abaixo do mínimo (demais itens, pelo total).
- Produto cuja subcategoria perde os tamanhos volta a estoque único quando não há saldo em nenhum tamanho; o mapa antigo é descartado na próxima movimentação, sem perder saldo. Tamanho desativado não recebe entrada nem pelo gatilho do demo.
- Testes: `estoque-tamanho`, `gerais-tamanhos-protecao` e `tamanho-telas-documentos`.

Correções do code review do PR #54 (`revisoes/code-review-pr54-estoque-por-tamanho.md`, os 10 achados):
- A devolução volta no tamanho em que o item saiu: qualquer tamanho de Gerais (mesmo desativado ou desautorizado depois) ou "Sem tamanho", escolhido explicitamente (`opcoesTamanhoDevolucao`).
- Quando a subcategoria perde todos os tamanhos:
  - a compra explica que é preciso autorizar um tamanho em Associar;
  - o cadastro volta ao mínimo único, e os mínimos por tamanho antigos são limpos.
- Busca e alerta:
  - a busca do cadastro só usa o resumo por tamanho de quem controla tamanho;
  - lista e Dashboard usam o mesmo critério de alerta (`usaMinimoPorTamanho`).
- Associar Tamanho e Medida:
  - processa os cliques em fila, lendo Gerais na hora;
  - a leitura dos cadastros é única e em paralelo (`src/lib/ler-cadastros-uso.ts`);
  - desautorizar unidade também avisa quem usa o texto antigo.

## Decisões vigentes

- **Decisão 24 — estoque nos módulos:** cadastros não exibem nem configuram estoque. A grade de mínimo por tamanho de EPI/Uniformes e os campos de mínimo e estoque inicial de Ferramentas ficam nas abas Estoque dos módulos; o estoque inicial de Ferramentas pode ser ajustado diretamente mesmo após movimentações. Gerais > Associar Tamanho e Medida e Gerais > Tamanhos e Unidades podem consultar estoque para proteções e avisos (ver `docs/decisoes-especiais.md`).

- **Seleção de tamanhos por produto:** chips de EPI e Uniformes selecionam tamanhos no modo demonstração; a aba Estoque mostra apenas os selecionados. Fora do demo, falta campo persistente de tamanhos por produto; a migration fica pendente para a fase de montagem do banco no Supabase. Não escrever nem aplicar migration agora.

- Categoria e grupo do modelo são seleções mantidas em Cadastros > Gerais. O código vem da regra global da categoria-base Ferramentas (FER-0001 por padrão); não é editável e permanece na edição. Desde a decisão 25, a ferramenta não tem subcategoria e o módulo Ferramentas não tem aba Cadastro.
- Série informada é obrigatória, sem geração de série fictícia. Patrimônio e data de aquisição são opcionais. Preço de custo não negativo tem até duas casas decimais e alimenta o indicador “Valor total em estoque”.
- A Fase 1 usa dados locais de demonstração. Não criar ou alterar tabelas, migrations, autenticação ou dados no Supabase real.
- Permissões por tela e revisão do estoque histórico de ferramentas permanecem na Fase 2 (`docs/pendencias-fase2.md`). Caixas e Portador concluída: etapas 1 a 4 mergeadas (PRs #37 a #40).
- Relatórios saiu do menu Cadastros (PR #41): a tela é aberta só pelo atalho Relatórios do Dashboard.
- O módulo Uniformes não tem aba Cadastro (decisão 26): o cadastro de uniformes fica só em Cadastros > Uniformes.

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

Em 01/10/2026, o PR de `docs/link-visualizacao` foi preparado apenas para gerar um preview da Vercel do sistema em modo demonstração, permitindo a visualização navegável antes de qualquer merge.

- Cada etapa usa branch própria a partir da `main`, só depois do merge da etapa anterior; nada vai direto à `main`.
- Commits com o e-mail `ti@gemape.com.br` (`git config user.email`), sem mudar o nome do autor, para a Vercel reconhecer o autor e criar o preview. O PR #23 não teve preview porque os commits saíram com um autor sem acesso ao projeto na Vercel.
- Se a API do GitHub devolver Forbidden, faça push da branch, informe o título do PR e aguarde: o responsável abre o PR manualmente.
- Preview da Vercel (regra vigente desde 30/09/2026, 16:05): após cada push ou PR, conferir o deployment de preview (Ready, Building ou Error) e informar o link completo quando estiver Ready. Se falhar ou ficar bloqueado, informar o motivo exato e aguardar; não alterar configurações da Vercel.
- Segurança do TanStack Start (01/10/2026): desde 30/09/2026 a Vercel recusa o `npm ci` de projetos com versões do TanStack Start afetadas pelo CVE-2026-102989 (GHSA-qx66-fv34-fjm8, XSS em respostas de server functions). Os PRs #54 a #57 falharam por isso. O PR `fix/tanstack-start-cve` atualizou `@tanstack/react-start` para 1.168.60, `@tanstack/start-server-core` para 1.169.39 e alinhou `@tanstack/react-router` (1.170.41) e `@tanstack/router-plugin` (1.168.42) para não haver duas cópias do roteador. Nunca usar `DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS=1`.
- Tamanhos padrão (decisão 28): `src/lib/tamanhos-padrao.ts` guarda o catálogo e a regra da sequência; `adicionarOpcao` insere o tamanho novo na posição certa e `cadastrarTamanhosPadrao` (botão em Gerais > Tamanhos e unidades) completa listas já salvas. A lista de Cadastros > EPIs e Uniformes tem a coluna Tamanhos (`tamanhosDoCadastro`).
- Testes no Windows: no Windows local, 4 testes falham (`gerais-protecao`, `listas-fixas`, `marcas-gerais`, `subcategoria-referencia`) porque montam o caminho com `new URL(...).pathname`, que vira `C:\C:\...`; a correção seria `fileURLToPath`. A referência válida é o check "Validar aplicação" do PR (`.github/workflows/validar.yml`: typecheck, testes e build no Linux).
- Fallback: se o ambiente não alcançar a Vercel, rodar `VITE_DEMO_MODE=true npm run dev -- --host 0.0.0.0 --port 5173` e informar a URL local e os pontos de conferência.
- Só avançar de etapa depois do aviso "PR mergeado". Pelas decisões 19 e 20, a ordem final é concluir o MD (o que resta está em "O que resta do MD fora de Ferramentas", mais a pendência 4), confirmar o sistema 100% funcional, executar a Fase 2 com auth e banco de dados reais do Supabase e somente então fazer o deploy de produção na VPS da Mega Provedor. A Fase 2 ainda não está autorizada.
- Empresas, endereço e status (decisão 29): `src/lib/empresas.ts` (campos, `valoresDaEmpresa`, `enderecoResumido`); a tela `empresas.tsx` só exibe e grava esses campos no modo demonstração, porque o banco real ainda não tem as colunas (Fase 2). O status ainda não filtra nenhuma lista.
- Visual (decisão 30): vidro em `src/styles.css` (`.glass`, `.glass-strong`, `.panel`, fundo do `body`); componentes de `components/ui` usam `glass`/`glass-strong`; engrenagem `engrenagem-girando` no logo e no login; impressão sem vidro. Conferir tela estreita (390 px) a cada tela nova.
- Máscara ao digitar (decisão 32): `src/lib/mascaras.ts` (`mascararCnpj`, `mascararCep`, `mascararTelefone`, `aoDigitarMascarado`) ligada no `onInput` dos campos de Empresas e Fornecedores. Campo novo com CNPJ, CEP ou telefone deve usar o mesmo handler.
- Endereçamento e CA (decisão 33): `montarClonagemEndereco` em `src/lib/enderecamento-categoria.ts` valida a clonagem (origem informada na linha do destino); `EnderecamentoModulo.tsx` tem o diálogo "Clonar endereço". O CA de EPI em Código de Fábrica é só números (`salvarCodigoFabrica` e o campo).
- Menus (decisões 34 e 36): a hierarquia de Parâmetros > Gerais e Ferramentas vem de `src/lib/menu-parametros.ts` (`MENU_GERAIS`, `MENU_FERRAMENTAS`); `AppSidebar.tsx` só desenha. Item novo de menu entra nesse arquivo.
- EPI por tamanho (decisão 35, PR 5A): `src/lib/epi-catalogo.ts` (agrupar, buscar, validar Novo/Clonar), tabela demo `epis_catalogo` e `sincronizarEpis` no `demo-client.ts` (cria o estoque de cada empresa a partir do catálogo); telas `epi-cadastrar.tsx` e `epi-ficha.tsx` (hoje em Parâmetros > EPI, decisão 37); as URLs antigas `/cadastros/epi` e `/cadastros/epi-ficha` redirecionam.
- Caixas (decisão 36): `MENU_FERRAMENTAS` em `src/lib/menu-parametros.ts` (grupo Ferramentas em Parâmetros; Módulos tem só o item Ferramentas); a habilitação vive em `components/parametros/CaixasHabilitadasPainel.tsx`, aba "Habilitar caixas" de `caixas-ferramentas.tsx` (parâmetro `?aba=habilitar`, só Administrador); `/cadastros/gerais/caixas` redireciona.
- Menu EPI (decisão 37): `MENU_EPI` em `src/lib/menu-parametros.ts` é o grupo Parâmetros > EPI (Cadastrar EPI e, dentro, Cadastrar Ficha de EPI); Módulos tem só o item "EPIs" (`/epi`).
- Tamanho e Medidas (decisão 38, PR 8): menu único em `MENU_GERAIS` para `/cadastros/gerais/tamanhos-unidades`, com abas `?aba=cadastro|associar` (`components/parametros/TamanhosMedidasPainel.tsx` e `AssociarTamanhosPainel.tsx`); `/cadastros/gerais/associar-tamanhos` redireciona para a aba associar.
- Separar EPIs por tamanho (decisão 39, PR 5B): `src/lib/epi-separar-tamanhos.ts` (`planejarSeparacao` mostra a prévia, `aplicarSeparacao` grava tudo ou nada); o demo expõe a operação como `rpc("separar_epis_por_tamanho")` em `demo-client.ts`; o botão e a prévia ficam em `CadastroEpi.tsx`. O registro antigo recebe `separado_em` e `separado_para`.
- Empresa inativa (decisão 40): `empresasParaEscolha` e `empresaPadraoParaEscolha` em `src/lib/empresas.ts`; os selects de empresa dos formulários e dos termos usam o primeiro; filtros, relatórios, cabeçalho e painel continuam com todas.
- Compras com fornecedor do cadastro (decisão 41): `src/lib/compras-fornecedor.ts` (lista por categoria e conferência na gravação) e `SeletorFornecedorCompra.tsx`, usados por `EpiComprasModulo.tsx` e `UniformesComprasModulo.tsx`; só no demo, no banco real segue o texto.
- Aviso ao excluir com código de fábrica (decisão 42): `src/lib/codigo-fabrica-vinculos.ts` monta o aviso; `removerCodigosFabricaPorIds` em `parametros-base.ts` remove as associações; usado em `fornecedores.tsx`, `CadastroProduto.tsx` e `ItensModulo.tsx`.
- Submenus no menu lateral (decisão 43): as abas das telas viraram itens do `AppSidebar` (`ABAS_EPI`, `ABAS_UNIFORME`, `ABAS_FERRAMENTA`, `ABAS_VEICULO`, `ABAS_CAIXAS`, `ABAS_TAMANHOS` e `abaDoModulo` em `src/lib/menu-parametros.ts`); as páginas leem `?aba=` e não têm mais `TabsList`. Tela nova com seções: criar o `ABAS_*` e o submenu, não abas.
- Ordem de Parâmetros (decisão 44): `MenuGerais` vem antes de `MenuEpi` e `MenuFerramentas` em `AppSidebar.tsx`.
- Botões padrão (decisão 45): `AcoesLinha` em `components/parametros/`; EPI usa `editarEpiCatalogo` e `excluirEpiCatalogo` (`epi-catalogo.ts`), expostos no demo como `rpc("editar_epi_catalogo")` e `rpc("excluir_epi_catalogo")`.
- Botões padrão, parte 2: todas as listas de Parâmetros usam `AcoesLinha`; o Clonar de cada uma abre o formulário de novo com `modelo` e `base = editando ?? modelo`.
- Veículos em Parâmetros (decisão 46): `MENU_VEICULOS` e `MenuVeiculos` (menu), listas em `components/parametros/VeiculosListasParametros.tsx`, dados em `acoesManutencaoVeiculo` (pai com `subitens`) e `tiposOcorrenciaVeiculo` (`parametros-base.ts`), padrões em `veiculos-padrao.ts`. A escolha de manutenção em `MovimentacoesModulo` (veículo) com `SeletorAcaoManutencao` ficou sem tela desde a decisão 77; os campos `acao_manutencao` e `subitens_manutencao` só vão no modo demonstração.
- Ficha de EPI (decisão 47): `rotuloEpiFicha` e `tamanhoDoEpi` em `src/lib/ficha-epi-rotulo.ts` (tamanho vem de `tamanhos_selecionados[0]` do EPI); cadastro rápido de tamanho em `components/parametros/NovoTamanhoRapido.tsx`, aberto por diálogo irmão do da ficha em `epi-ficha.tsx`.
- Cadastrar Uniforme (decisão 48): `CadastroUniforme.tsx` (cópia adaptada do `CadastroEpi.tsx`, sem a separação), tabelas `uniformes_catalogo` e `uniformes` no demo; as funções de `epi-catalogo.ts` recebem `TABELAS_EPI` ou `TABELAS_UNIFORME`; operações `editar_uniforme_catalogo` e `excluir_uniforme_catalogo` no demo; menu `MENU_UNIFORMES` e rota `/uniformes-cadastrar`.
- Link Cadastrar tamanho (decisão 50): `DialogTamanhoSubcategoria` (components/parametros) e `criarTamanhoParaSubcategoria` (`lib/tamanho-subcategoria.ts`), usados em `CadastroEpi` e `CadastroUniforme`.
- Cadastrar Veículo (decisão 49): `descricaoVeiculo` e `validarAquisicao` em `src/lib/descricao-veiculo.ts`; `VeiculosCadastroModulo` não tem mais o campo Descrição e grava `data_aquisicao`, `custo` e `numero_nota_fiscal` só no modo demonstração.
- Editar completo (decisão 51): `EdicaoCatalogoForm` (EPI e uniforme), `editarEpiCatalogo` aceita subcategoria, unidade e tamanho com `motivoTravaEstrutura`/`travasDoItem` (epi-catalogo.ts); `moverFicha` (fichas-epi.ts). O demo expõe `travas_catalogo` (só leitura).
- Plano de manutenções (decisão 52): `src/lib/plano-manutencao.ts` (localStorage `gemape-demo-planos-manutencao`, `criarPlano`/`editarPlano`/`removerPlano`/`itensDoPlano`) e tela `components/parametros/PlanoManutencaoVeiculo.tsx`, rota `/cadastros/veiculos-plano-manutencao`, item em `MENU_VEICULOS`.
- CPF com máscara (decisão 53): `mascararCpf` em `src/lib/empregados.ts`, usado no campo CPF de `routes/_authenticated/empregados.tsx` (placeholder `xxx.xxx.xxx-xx`, sem `maxLength`: a máscara limita a 11 dígitos e aceita colar com espaços).
- Parâmetros > Ferramentas (decisão 54): `MENU_FERRAMENTAS` = Cadastrar Caixa (`soAdmin`, `search: { aba: "habilitar" }`, tela `caixas-ferramentas.tsx` só com `CaixasHabilitadasPainel`) e Cadastrar Ferramenta; `ABAS_CAIXAS` removido. `ItensModulo` sem descrição/série/patrimônio/aquisição/empresa/custo/NF, com estoque mínimo; `prepararCadastroFerramenta` recebe `modelo` e `estoqueMinimo` e gera `nome` com `descricaoFerramenta`.
- Fornecedores (decisão 55): `salvarFornecedor` (fornecedores-demo.ts) exige só razão social e CNPJ; a tela não tem mais o campo/coluna Categorias (a edição preserva `categorias`); `fornecedoresDaCategoria`/`escolherFornecedorDaCompra` (compras-fornecedor.ts) ignoram a categoria e `usoDaCategoria` foi removido; NF-e, código de fábrica e uso de categoria caem para a razão social quando falta o fantasia.
- Tamanho do Novo EPI/Uniforme (decisão 56): `tamanhosGeraisParaCadastro` (estoque-tamanho.ts) alimenta o select em `CadastroEpi`/`CadastroUniforme`; sem tamanho em Gerais aparece o link Cadastrar tamanho; ao salvar, `autorizar` associa à subcategoria o tamanho que ainda não era associado.
- Frota e extrato (decisão 57): `FrotaModulo`/`ExtratoVeiculo`/`AbastecimentoVeiculoModulo`/`ManutencaoVeiculoModulo` em `components/modules`, rota `veiculos.tsx` (abas frota, abastecimento, manutencao, movimentacoes, ocorrencias em `ABAS_VEICULO`). Dados no navegador via `registros-veiculo.ts` (`gemape-demo-abastecimentos`, `gemape-demo-manutencoes-veiculo`); cálculos em `extrato-veiculo.ts` (`mediaKmPorLitro`, `kmAtualDoVeiculo`, `sugestoesPreventivas`, `somarMeses`); hooks em `use-registros-veiculo.ts`.
- Abastecimento com hora e valor (decisão 58): `registrarAbastecimento` exige data, hora, km, litros e valor (`dinheiroPositivo`); `kmCoerente` confere por data e hora contra abastecimentos e manutenções; `ultimoAbastecimentoDoVeiculo` e `historicoAbastecimentos` (km rodados, km/L do trecho, R$/L) em `extrato-veiculo.ts`; tela com filtro Histórico por veículo em `AbastecimentoVeiculoModulo`, mesmo histórico no `ExtratoVeiculo`.
- Busca nos submenus de Veículos (decisão 59): `combinaBusca` (parametros-base.ts) em `FrotaModulo` (coluna e busca por responsável), `AbastecimentoVeiculoModulo`, `ManutencaoVeiculoModulo` e `MovimentacoesModulo` (só quando `ehVeiculo`, lista `visiveis`); Ocorrências já tinha.
- Ocorrências de veículos (decisão 60): `src/lib/ocorrencias-veiculo.ts` (código OCO-, status, tratativa, fotos), `src/lib/imagem.ts` (compressão), `OcorrenciasVeiculoModulo` + `FotosOcorrencia`; loja `gemape-demo-ocorrencias-veiculo`; só em `MODO_DEMO`.
- Manutenção de veículos detalhada (decisão 61): `registrarManutencao` com grupo/ações/local/custos (`registros-veiculo.ts`), `resumoManutencao`, `ManutencaoVeiculoModulo`.
- Itens check list de veículos (decisão 62): `GrupoChecklistVeiculo` em `parametros-base.ts`, padrão em `checklist-veiculos-padrao.ts`, tela `ChecklistVeiculoLista` (rota /cadastros/veiculos-checklist).
- Padrão do check list por leves, pesados e empilhadeiras (decisão 64): `CHECKLIST_VEICULOS_PADRAO` e `NOMES_PADRAO_ANTIGO` em `checklist-veiculos-padrao.ts`; `cadastrarPadraoChecklistVeiculos` substitui o padrão antigo e liga grupos sem tipo.
- Check list de veículos (decisão 63): `src/lib/checklist-veiculo.ts` (iniciar, avaliar, concluir, pendências), `checklist-veiculo-html.ts` (PDF), `ChecklistVeiculoModulo`; vínculo grupo↔tipo em `parametros-base.ts`; periodicidade escolhida no módulo (`definirPeriodicidade`, loja `gemape-demo-periodicidade-checklist`); loja `gemape-demo-checklists-veiculo`; só em `MODO_DEMO`.
- Empilhadeira sem placa (decisão 66): `subcategoriaTemPlaca` em `src/lib/veiculos.ts`; `VeiculosCadastroModulo` esconde a Placa e salva em branco.
- Tipo no formulário do check list (decisão 65): `TIPOS_CHECKLIST`, `gruposDoTipoChecklist` e `tipoChecklistDaSubcategoria` em `checklist-veiculo.ts`; campo "Tipo de veículo" em `ChecklistVeiculoModulo`.
- Marcas de veículos padrão (decisão 67): `MARCAS_VEICULO_PADRAO` em `veiculos-padrao.ts`, semeadas em `padrao()` e completadas por `cadastrarMarcasPadraoVeiculos` (botão em Gerais > Veículos).
- Categoria de ferramenta = subcategoria de Ferramentas (decisão 68): lista "Categorias de ferramentas" removida de Gerais; `prepararCadastroFerramenta` e `ItensModulo` usam `subcategoriasDa(..., "cat-ferramentas")`; a chave `categoriasFerramenta` segue no armazenamento só por compatibilidade.
- Subcategoria Empilhadeira de fábrica (decisão 69): `TIPOS_VEICULO` em `gemape.ts` ganhou "Empilhadeira"; `lerComEstado` em `parametros-base.ts` a inclui uma vez para quem já tinha cadastros salvos (marcador `gemape-demo-subcategoria-empilhadeira`, gravado em `alterar`).
- Link "Cadastrar tamanho" sempre visível em `CadastroEpi` e `CadastroUniforme` (decisão 70), mesmo com tamanhos na lista; mesma janela `DialogTamanhoSubcategoria`.
- Tamanho do Novo EPI/Uniforme só dos autorizados (decisão 71, revoga 56): `tamanhosGeraisParaCadastro` removida; `CadastroEpi`/`CadastroUniforme` usam `tamanhosAssociadosParaCadastro` e não associam mais ao salvar.
- Título de Tamanho e Medidas de Produto na barra lateral com ícone e texto iguais aos demais menus (decisão 72): ajuste em `SubLink` de `AppSidebar.tsx`.
- Ícones em todos os submenus de Módulos e de Tamanho e Medidas (decisão 73): `icone` obrigatório em `AbaMenu` (`menu-parametros.ts`), desenhado por `SubAbas`.
- Associar itens de check list a um veículo (decisão 74): `checklist-associacao-veiculo.ts` + `AssociarChecklistVeiculo.tsx`, rota `/cadastros/veiculos-checklist-associar`; Itens check list com ícone de chave de boca. A associação é só cadastro: o módulo Check list não a lê (confirmado pelo responsável).
- Periodicidade do módulo Check list vem da associação (decisão 75, revoga 63(c)): `periodicidadeDaAssociacao` em `checklist-veiculo.ts`; coluna Periodicidade removida da tabela; Quinzenal e Mensal em `periodoAtual`.
- O formulário Novo check list traz só os grupos da associação do veículo (decisão 76, substitui a origem dos itens da 65): `gruposAssociadosDoVeiculo` em `checklist-veiculo.ts`.
- Submenu Movimentações removido do módulo Veículos (decisão 77): `ABAS_VEICULO` e rota `/veiculos`.
- Relatório da Frota em PDF (decisão 78): `frota-relatorio-html.ts` + botão em `FrotaModulo.tsx`.
- Manutenção com vários grupos de ações (decisão 79, altera a 61): `grupos` em `registros-veiculo.ts` (`gruposDaManutencao`), `ManutencaoVeiculoModulo.tsx`, sugestões em `extrato-veiculo.ts`.
- Painel do mês do Check list (decisão 80): `checklist-painel.ts` (previsões desde a associação, congeladas após o prazo, `painelDoMes`) + `ChecklistPainelMensal.tsx` no topo do módulo.
- Editar manutenção (decisão 81): `editarManutencao` em `registros-veiculo.ts` + botão em `ManutencaoVeiculoModulo.tsx`.
- Relatório da manutenção por grupo de serviço (decisão 82): `manutencao-relatorio-html.ts`, abre ao cadastrar e pelo botão Relatório.
- Cadastrar Ferramenta: grupo Outros/Diversos abre o campo "Qual ferramenta?" (decisão 83); o nome digitado entra na descrição, sem coluna nova.
- Painel mensal do Check list: o dia de hoje (Brasília) se renova a cada minuto, então a tela aberta na virada do dia atualiza previsões e situações sem recarregar.
- Capitalização (decisão 84): `capitalizarTexto` (primeira letra) e `capitalizarNomePessoa` (por palavra) em `formatacao-cadastral.ts`; `Input`/`Textarea` aceitam `capitalizar="texto"|"nome"` e corrigem no blur e no Enter; mapa de campos em `docs/capitalizacao-campos.md`.
- Parâmetros > Tamanho e Medidas de Produto: o submenu Cadastro saiu (decisão 85); o menu pai abre o cadastro (`abaPadrao`) e só "Associar ao produto" fica como submenu.
- Parâmetros: Tabelas de Apoio e Tamanho e Medidas de Produto saíram de Gerais e aparecem dentro de EPI, Uniformes e Ferramentas (decisão 86): `itensApoio(de)` em `menu-parametros.ts`, mesma tela, `?de=` só marca o menu de origem.
- Cadastrar EPI (Novo EPI): link 'Associar tamanhos' abre a tela de Associar ao produto numa janela sem perder o cadastro (decisão 87): `DialogAssociarTamanhos`.
- Cadastrar Uniforme (Novo Uniforme): mesmo link 'Associar tamanhos' do EPI (decisão 88); Ferramentas e Veículos não têm tamanho no cadastro e ficaram de fora por escolha do dono.
- Parâmetros: Tamanho e Medidas de Produto é uma tela só por menu (EPI, Uniformes, Ferramentas), cadastro em cima e associação embaixo, categoria vinda do menu (decisão 89): `TamanhosMedidasUnificado`; a janela do Novo EPI/Uniforme abre a mesma tela.
- Parâmetros: Tabelas de Apoio virou Parâmetros Específicos e abre direto na categoria do menu de origem, inclusive em Veículos (decisão 91): `categorias.tsx` com `?de=`.
- Check list: Novo check list tem o link 'Cadastrar veículo' que abre o Cadastro de Veículos numa janela sem perder o preenchido (decisão 92): `DialogCadastroVeiculos`.
- Check list: no Novo check list, os avisos de veículo sem itens associados e de periodicidade não definida têm o link que abre a associação de itens numa janela sem perder o preenchido (decisão 93): `DialogAssociarChecklist`.
- Veículos: combustível GLP incluído na lista do cadastro (decisão 94): `COMBUSTIVEIS_VEICULO` em `src/lib/gemape.ts`.
- Check list: no Novo check list avulso, o aviso de tipo sem itens tem o link que abre Itens check list numa janela sem perder o preenchido (decisão 95): `DialogItensChecklist`.
- Cadastrar EPI: a lista de EPIs cadastrados ganhou a coluna Descrição e perdeu a linha de cabeçalho do grupo (decisão 96); as etiquetas de categoria e unidade da 96 foram substituídas pela decisão 97 abaixo.
- Cadastrar EPI: a lista tem as colunas Código, Descrição (só o nome do item), Tamanho, Unidade (ao lado de Tamanho), Estoque mínimo e Ações (decisão 97, substitui a 96b): coluna Unidade em `CadastroEpi.tsx`.
- Menu lateral: fontes e ícones maiores, títulos de grupo em caixa alta e item ativo com barra lateral (decisão 98): constantes `BOTAO_MENU`, `BOTAO_SUBMENU` e `TITULO_GRUPO` em `AppSidebar.tsx`.
- Menu lateral: títulos de grupo (Visão geral, Módulos, Parâmetros) em faixa branca com linha divisória entre os grupos (decisão 99): `TITULO_GRUPO` e `SEPARADOR_GRUPO` em `AppSidebar.tsx`.
- Menu lateral em vidro: botões com animação, GEMAPE maior e logo com duas engrenagens (decisão 100): utilitários `menu-vidro`, `menu-vidro-sub`, `logo-engrenagem` em `styles.css`.
- Ferramentas > Número da caixa: colunas Qtd na caixa, Com empregado e Disponível, e histórico de movimentações por caixa com exportação (decisão 101): `controle-caixa.ts` e `FerramentasCaixasModulo.tsx`.
- Caixa gravada em entrega, vistoria e devolução só no modo demonstração (`caixa_id`, decisão 103, substitui a 101d): `caixaDaUltimaEntrega` em `controle-caixa.ts`; a coluna entra na Fase 2.
- Decisão 104: Número da caixa com Ferramentas da caixa, Dar baixa, Registrar ocorrência e lista de ocorrências por caixa (`CaixaGestaoDialogs.tsx`, `controle-caixa.ts`); caixa identificada só pelo número (campo Nome removido).
- Decisão 105: botão Vincular ferramentas em Número da caixa (inclusive caixa habilitada sem cadastro, que é criada ao salvar o vínculo).
- Decisão 106: uma ferramenta em uma caixa só (Vincular bloqueia a que está em outra); botão Transferir entre caixas com histórico nas duas (`DialogTransferirCaixa`).
- Decisão 107: Vincular ferramentas com lista de Parâmetros > Ferramentas, ferramentas de outra caixa travadas e link Cadastrar ferramenta (janela por cima, Voltar ao vínculo).
- Decisão 108 (substituída pela 110): botão Restaurar padrão por linha em Itens check list.
- Decisão 109: marca do menu (GEMAPE / Gestão de Patrimônio) centralizada e animada (`marca-titulo`, `marca-linha`, `marca-subtitulo` em styles.css); parada com reduzir movimento.
- Decisão 110: botão único Restaurar padrão inicial ao lado de Cadastrar grupo, com janela de checkboxes e confirmação (`RestaurarPadraoChecklist`, `situacaoPadraoChecklistVeiculos`, `restaurarPadroesChecklistVeiculos`); botões por linha removidos.
- Decisão 111: botão Restaurar padrão inicial em Ações de manutenção, mesmo componente do check list (`RestaurarPadraoInicial`, `situacaoPadraoAcoesManutencaoVeiculo`, `restaurarPadroesAcoesManutencaoVeiculo`).
- Decisão 112: Parâmetros > Veículos > Manutenção reúne Ações de manutenção e Plano de manutenções (`ManutencaoParametros`, rota `/cadastros/veiculos-manutencao`; rotas antigas redirecionam; listas ganharam a prop `secao`).
- Decisão 113: Parâmetros > Veículos > Check list reúne Itens check list (separados por tipo de veículo, `separarPorTipoVeiculo` em checklist-por-tipo.ts) e Associar itens (`ChecklistParametros`; rota antiga de associar redireciona).
- Decisão 114: logo GEMAPE 40 anos animada no menu lateral (`logo-marca` em styles.css, imagem em src/assets), no lugar das engrenagens e do texto GEMAPE; engrenagem das telas de acesso mantida.
- Decisão 115: Parâmetros > Ferramentas sem o item Tamanho e Medidas de Produto (`MENU_FERRAMENTAS` usa `itemEspecificos`); EPI e Uniformes não mudam.
- Decisão 117: tamanhos por grupo de ferramenta em Parâmetros Específicos de Ferramentas (`TamanhosPorFerramenta.tsx`, `tamanhosGrupoFerramenta` em parametros-base, planilha em `tamanhos-ferramentas-padrao.ts`); ainda não ligados ao Cadastrar Ferramenta.
- Decisão 116: associação de check list com "Não definida"/"Não definido", `obrigatorio` por grupo e `checklistsDaAssociacao` (nome Placa >> Periodicidade >> Responsável, tipo Periódico/Avulso/Livre) em `checklist-associacao-veiculo.ts`; `checklistVisivelNaLista` agora é periodicidade OU responsável.
- Decisão 118: Novo check list sem Tipo de veículo e com Tipo de check list (Periódico ou Avulso), uma janela só (`modoAvulso` em ChecklistVeiculoModulo).
- Decisão 119: cada grupo associado tem `tipo` (periodico/avulso); a janela Associar itens tem o campo Tipo de check list (`tipoAtual`); `gruposDaPeriodicidade` e `gruposAvulsosDaAssociacao`; `periodicidadesDaAssociacao` em checklist-veiculo.ts; Associar itens vem antes de Itens check list em `ChecklistParametros`.
- Decisão 120: janela Associar itens abre Cadastrar veículo, Cadastrar itens de check list e Cadastrar empregado por cima (`DialogCadastroVeiculos`, `DialogItensChecklist`, `DialogCadastroEmpregados`, irmãs do diálogo da associação; tela de Empregados extraída para `EmpregadosCadastroModulo`).
- Decisão 121: código do check list único, nunca reaproveitado (`proximoCodigo` em checklist-veiculo.ts, sequência local).
- Decisão 122: ícones do menu lateral em quadrinhos de vidro animados (`icone-menu` em styles.css; `icone-seta` exclui a seta).
- Decisão 123: um check list periódico em andamento por periodicidade por veículo; Situação por veículo com uma linha por periodicidade (`periodicidadesDe(v)` em ChecklistVeiculoModulo; bloqueio em `gravarNovoChecklist`).
- Decisão 124: painel do mês prevê por periodicidade (`previstos` em ChecklistVeiculoModulo) e `painelDoMes` casa check list e previsão pela periodicidade.
- Decisão 125: `obrigatorio` na Previsao (periodicidadeObrigatoria em checklist-veiculo.ts); painelDoMes só conta obrigatórias; situação "opcional".
- Decisão 126: campo "Check list: Obrigatório / Não obrigatório" na janela Associar (`obrigatoriedade`, `padraoObrigatorio` em AssociarChecklistVeiculo).
- Dec 127 (09/10): opção Não definida na periodicidade dos grupos habilitados; escolher passa o grupo para o check list avulso (PR #173).
- Dec 128 (09/10): resumo dos grupos habilitados com periodicidade na janela Associar (PR #173).
- Dec 129 (09/10): removido o checkbox de obrigatório por grupo; só a lista suspensa Check list (PR #173).
- Dec 130 (09/10): 5 grupos padrão 'Avulso · ...' (itens simples); Associar e Novo avulso separam avulso e periódico pelo prefixo (branch feat/checklist-avulso-itens-simples, parte da #173).
- Dec 131 (09/10): avulso reduzido a 16 itens + grupo 'Avulso · Outros' (item aberto, descrição na observação) (PR #174).
- Dec 132 (09/10): ajuste automático (uma vez) dos grupos 'Avulso · ...' já cadastrados para os 16 itens + Outros (branch fix/avulso-itens-removidos).
- Dec 133 (09/10): campo Tamanho no Cadastrar ferramenta (opções do grupo em Parâmetros Específicos), coluna na lista/CSV (branch feat/ferramenta-campo-tamanho).
- Dec 134 (09/10): sem cartões Diversos e Luva em Tamanhos por ferramenta; seed sem Luva; Tamanho do cadastro sem opções p/ eles (branch fix/tamanhos-sem-diversos-luva, parte da #176).
- Dec 135 (09/10): 6 tamanhos da Chave de fenda no padrão + inclusão automática única (branch feat/tamanhos-chave-de-fenda, parte das #176/#177).
- 2026-10-09 17:25 dec 136: Associar: ordem Veículo, Responsável, Tipo; periódico=obrigatório (KPI), avulso=não; sem campo obrigatório (feat/associar-tipo-define-obrigatorio).
- 2026-10-09 dec 137: janela Associar = Veículo, Responsável, Periodicidade (inclui Avulso); itens vêm dos grupos do tipo do veículo.
- 2026-10-09 dec 139: menu Parâmetros > EPI com ícones alinhados na mesma coluna (sem recuo da Ficha).
- 2026-10-09 dec 138: Clonar copia todas as informações (campos únicos incluídos), editáveis, código novo; EPI/Uniforme abrem o formulário Novo preenchido.
- 2026-10-09 dec 140: Parâmetros > Veículos > Manutenção sem o botão Cadastrar padrão (Tipos de ocorrência e Itens check list mantêm).
- 2026-10-09 dec 141: Manutenção: botão renomeado para Restaurar configurações iniciais (Itens check list mantém o nome antigo).
- 2026-10-09 dec 142: Restaurar configurações iniciais (Manutenção) lista pais e filhos com checkbox; só os marcados voltam.
- 2026-10-09 dec 143: tela de entrada com o logo 40 anos animado (componente LogoEntrada), igual ao menu.
- 2026-10-09 dec 144: janela Restaurar configurações iniciais lista também o que o responsável criou (só conferência).
- 2026-10-09 dec 145: alerta Sim/Não ao salvar em Ações de manutenção (cadastrar/editar e restaurar configurações iniciais).
- 2026-10-09 dec 146: texto novo do alerta de salvar (painel de manutenções, rotina de parâmetros, definitivamente) e alerta também no Plano de manutenções.
- 2026-10-09 dec 147: texto de apoio da página Manutenção trocado (redação final de 19:30; modificações não poderão ser desfeitas).
- 2026-10-09 dec 148: Check list com Itens check list no topo; janela Associar escolhe os itens por checkbox (periodicidade única para todos).
- 2026-10-09 dec 149: Salvar valida o formulário antes de abrir o alerta Sim ou Não (Ações de manutenção e Plano de manutenções).
- 2026-10-09 dec 150: texto de apoio da página Manutenção simplificado.
- 2026-10-09 dec 151: seção Criados por você passa a excluir os itens marcados (só Administrador), com alerta Sim/Não; editar fica na lista.
- 2026-10-09 dec 152: Itens check list sem Cadastrar padrão; botão passa a Restaurar configurações iniciais.
- 2026-10-09 dec 153: itens por tipo de veículo; Avulso só para veículos leves (janela Associar e check list avulso).
- 2026-10-09 dec 154: lista de itens associados sem Clonar/Editar/Excluir por linha.
- 2026-10-09 dec 155: Avulso para qualquer veículo (substitui dec 153); itens por tipo do veículo, já sem escolher a periodicidade.
- 2026-10-13 dec 156: Clonar/Editar/Excluir só no cabeçalho do check list (por veículo); Clonar abre com tudo do original e exige trocar o veículo.
- 2026-10-13 dec 157: Novo check list do módulo Veículos pergunta Veículo e depois Tipo de check list (opções Placa >> Responsável >> Periodicidade da associação + Avulso).
- 2026-10-13 dec 158: link Cadastrar itens de check list na janela Associar (janela ao lado, sem sair do formulário).
- 2026-10-13 dec 159: Parâmetros Específicos de Ferramentas: tabela Nome|Subgrupos|Ações (pai/filho) no lugar dos cartões de tamanhos; grupos continuam na lista acima, mesma página; só Editar e Excluir.
- 2026-10-13 dec 160: removida a seção EPIs antigos (e o botão Separar por tamanho) do Cadastro EPI; dados e rotina de separação ficam guardados, sem tela.
- 2026-10-13 dec 161: Manutenção do módulo Veículos com vários locais (Gemape + terceiros), descrição, pagamento combinado e custos por local, relatório por local, observação do item não feito e seção no Extrato do veículo.
- 2026-10-13 dec 162: link Cadastrar em Parâmetros > Veículos > Manutenção abaixo dos grupos de ações do Cadastrar nova manutenção (janela ao lado, sem sair do formulário).
- 2026-10-13 dec 163: item Outros (descrição aberta obrigatória) em todos os grupos de ações de manutenção, em Parâmetros e no Cadastrar nova manutenção.
- 2026-10-13 revisão do projeto inteiro: corrigidos exclusão de grupo só com Outros, datas de hoje em horário local (Relatórios, Baixa, Compras, Ocorrências, Termo), formatarData com hora em Brasília, edição de caixa sem itens da anterior e extrato com registros antigos. Sem decisão nova (correções de bug).
- 2026-10-13 revisão do projeto (2): leitura completa sem corte de 50/1000 linhas (src/lib/ler-todas.ts), Valor Total das baixas, troca de empresa limpa empregado nos termos, estado dos termos de ferramenta, painel mensal na virada do mês, endereçamento (clique duplo, vazio, acentos), transferência de caixa desfaz destino, dados ilegíveis do navegador não são sobrescritos. Sem decisão nova.
- 2026-10-14 dec 164: Parâmetros > Clientes (código 5 dígitos, só nome obrigatório, CPF/CNPJ validado, Clonar/Editar/Excluir), menu abaixo de Fornecedores. Módulo Viagens só depois do sistema inteiro aprovado.
- 2026-10-14 dec 165: Clientes com CPF (11 dígitos) e CNPJ (14 dígitos) em campos separados e opcionais; cadastros antigos migram do campo documento.
- 2026-10-14 dec 166: Clientes: nome com inicial maiúscula por palavra (padrão de nome do sistema) e e-mail todo em minúsculas (novo modo de campo 'minusculas').
- 2026-10-14 dec 167/168: Parâmetros > Veículos > Questionário de Despesas: construtor de cards (arrastar, obrigatória, clonar), banco de perguntas (8 tipos, botão Cadastrar pergunta), 13 perguntas já cadastradas, um questionário por tipo de despesa com a pergunta 3 sempre primeira, municípios do IBGE por UF. Faltam lógica se/então, resposta e menu flutuante.
- 2026-10-14 dec 169: Questionário de Despesas etapa 2: condição se/então por pergunta, formulário estilo Google Forms em rota própria sem link no menu (/questionario-despesas), respostas no navegador e lista de conferência, upload de até 3 imagens reduzidas.
- 2026-10-14 dec 170: Formulário de Despesas: Cadastrar cliente abre janela na mesma tela (componente ClienteDialog, também usado em Parâmetros > Clientes) e o cliente novo já fica escolhido.
- 2026-10-14: correções da revisão do #221: Cadastrar cliente só para quem grava; cliente escolhido sempre aparece na lista (além de 200 opções).
- 2026-10-14 dec 171: Litros abastecidos só no questionário do tipo Abastecimento (padrão novo e ajuste único dos dados salvos).
- 2026-10-14 dec 173: Questionário de Despesas em tela única: o menu abre o formulário e quem grava edita o questionário ali mesmo; sem banco de perguntas e sem rota separada.
- 2026-10-14 dec 174: Questionário de Despesas: opção Outro abre o campo "Descreva o outro" (obrigatório), gravado como "Outro: descrição".
- 2026-10-14 dec 175: Respostas registradas do Questionário de Despesas mostram as imagens anexadas (miniatura); guardadas no navegador em modo demonstração.
- 2026-10-14 dec 176: Módulo Viagens etapa 1: item Viagens em Módulos (rota /viagens, submenu Painel), botões por tipo de despesa que abrem o formulário daquele tipo, lançamentos na coleção única (dadosDoLancamento em src/lib/viagens.ts). Plano em /mnt/project-files/viagens/plano-modulo-viagens.md.
- 2026-10-14 dec 177: Viagens etapa 2: indicadores globais (despesas do mês, custo total, ICL), resultados dos técnicos, seletor de mês e ano, pergunta 14 Técnico responsável pela despesa (só quando PCM/Administrativo lança), ícone do menu Viagens = avião. Lógica em src/lib/viagens.ts.
- 2026-10-14 dec 178: Viagens etapa 3a: ramificação por opção ("Depois de responder, ir para..."), validador de ciclos, ação requerida (questionário sem publicar até corrigir); se/então da dec 169 mantido. Código em src/lib/questionario-destinos.ts. Falta 3b: seções/páginas e Criar novo questionário.
- 2026-10-14 dec 179: Viagens etapa 3b: seções que viram páginas (Próxima/Voltar), Criar novo questionário (tipo novo + primeira seção) e destino "Ir para a próxima seção". Código em src/lib/questionario-secoes.ts e SecaoDialog.tsx. Falta etapa 4 (relatório).
- 2026-10-14 dec 180: Viagens etapa 4: submenu Relatório (filtros, conferência, documento A4 com logo, clientes visitados, tabela, quadro por tipo, assinaturas, paginação 01/01 e comprovantes 1/2/4 por página). Código em src/lib/viagens-relatorio.ts e ViagensRelatorio.tsx. Plano do módulo Viagens concluído (etapas 1 a 4).
- 2026-10-14 dec 181: título do questionário = "Despesas <card>" (tituloDoQuestionario em src/lib/questionario-despesas.ts) e ícone Hamburger em Alimentação (ViagensPainel.tsx).
- 2026-10-14 dec 182: Cartões de crédito (q-02) só aparece com Moedas (q-01) = Cartão de crédito; regra de fábrica via comRegraDoCartao em src/lib/questionario-despesas.ts (migração única com cartaoAjustado).
- 2026-10-14 dec 183: card de Viagens abre o formulário sem a pergunta de tipos (prop semPerguntaTipo em QuestionarioFormulario.tsx, usada só por ViagensPainel.tsx).

- 2026-10-14 dec 184: ícones: menu Viagens = Luggage (AppSidebar.tsx); cards Pedágio = Cancela e Compra de peças = ParafusoEPorca (src/components/modules/icones-viagens.ts).
- 2026-10-14 dec 185: anexo de comprovante soma até 3 imagens, com Remover e bloqueio no limite (juntarImagens e mensagemDeLimite em src/lib/imagem-economica.ts; campo em QuestionarioFormulario.tsx).
- 2026-10-14 dec 186: lista das despesas do mês no painel de Viagens (ViagensLista.tsx, viagens-lista.ts), Gerar relatório das marcadas e status Finalizado (relatorios-viagens.ts, chave gemape-demo-relatorios-viagens). Faltam extrato do técnico e índice no prazo.
- 2026-10-14 dec 187: extrato do técnico (ViagensExtrato.tsx; extratoDoTecnico e deslocarMes em viagens-lista.ts), aberto pelo nome na tabela Resultados dos técnicos. Falta índice no prazo.
- 2026-10-14 dec 189: Parâmetros > Veículos > Questionário de Despesas só pré-visualiza (prop somentePrevia em QuestionarioFormulario); envio e respostas registradas só em Viagens.

- 2026-10-14 dec 188: painel de Viagens sem a frase sobre o envio dos comprovantes (ViagensPainel.tsx).
- 2026-10-14 dec 190: índice de lançamento no prazo (viagens.ts: lancadaNoPrazo, indicePrazo; prazo-viagens.ts) e Parâmetros > Viagens (cadastros/viagens.tsx) com o prazo em dias, padrão 3. Fecha o croqui do módulo Viagens.
- 2026-10-14 revisão #246/#247: leitura do prazo só aceita dígitos e tolera armazenamento bloqueado (detalhe em /mnt/project-files/revisoes/revisao-pr246-247.md).
- 2026-10-14 dec 191: links do topo do formulário de despesas viram botões (QuestionarioFormulario.tsx).
- 2026-10-14 dec 192: faixas verde/amarelo/vermelho nos índices do painel de Viagens (faixas-desempenho.ts, ViagensPainel.tsx).
- 2026-10-14 dec 193: dois prazos em Parâmetros > Viagens (mecânico e PCM): prazo-viagens.ts (lerPrazos/salvarPrazos), viagens.ts (prazoDoLancamento), cadastros/viagens.tsx, ViagensPainel.tsx.
- 2026-10-14 dec 194: revisão geral, correções de bugs (demo-client lte/or, empresa-context, CaixasFerramentasModulo, termos/compras por empresa, relatórios, ficha EPI, veículos). Detalhe em /mnt/project-files/revisoes/revisao-geral.md.
- 2026-10-15 dec 195: busca de ações no Cadastrar nova manutenção (busca-acoes-manutencao.ts: filtrarAcoesManutencao; ManutencaoVeiculoModulo.tsx). Sem resultado, link para Parâmetros > Veículos > Manutenção.
- 2026-10-15 dec 196: reverte a dec 195 (busca-acoes-manutencao.ts e o campo de busca saíram); o sistema já contemplava a ação.
- 2026-10-15 dec 197: busca na janela Restaurar configurações iniciais das ações de manutenção (busca-acoes-manutencao.ts: filtrarPaisEFilhos; VeiculosListasParametros.tsx: RestaurarPadraoAcoes e acaoExtra como função com `cadastrar`). Sem resultado, Cadastrar a ação abre o cadastro por cima e volta para a busca.
- 2026-10-15 dec 198: ordem do menu Parâmetros > Veículos (menu-parametros.ts, MENU_VEICULOS): Questionário de Despesas depois de Parâmetros Específicos.
- 2026-10-15 dec 199: Indicadores em Parâmetros Específicos de Veículos (IndicadoresViagens.tsx, categorias.tsx): prazos com caixas Aplicável (prazo-viagens.ts) e faixas editáveis (faixas-desempenho.ts: lerFaixas/salvarFaixas/descricoesFaixas). viagens.ts: medidoNoPrazo (só Oficina; PCM fecha relatório, só parametrizado). Parâmetros > Viagens saiu do menu e redireciona.
- 2026-10-15 revisão #255 a #257: cartão de prazo com indicador desligado, campo travado fora da validação e textos das faixas aparados (detalhe em /mnt/project-files/revisoes/revisao-pr255-257.md).
- 2026-10-15 dec 200: Questionário de Despesas em dois passos por card (QuestionarioDespesasConstrutor.tsx, QuestionarioFormulario.tsx, icones-viagens.ts com iconeDoTipo); ramificação e condição em Opções avançadas.
- 2026-10-15 dec 201: Parâmetros > Questionário de Despesas abre direto na configuração (QuestionarioDespesasTela.tsx só renderiza o Construtor; título "Configuração Formulário de Despesas"); QuestionarioFormulario sem somentePrevia/onEditar.
- 2026-10-15 dec 202: cards da montagem (QuestionarioDespesasConstrutor.tsx): botão Adicionar opção (AdicionarOpcao), barra com Editar, setas, lixeira e Obrigatória; saíram Nova página, Duplicar e Tirar daqui.
- 2026-10-15 dec 203: quadrante Adicionar ao questionário no rodapé da montagem (QuestionarioDespesasConstrutor.tsx): abre PerguntaDialog em modo novo e inclui a pergunta criada no questionário do card; botão Cadastrar pergunta do topo e seletor de perguntas já cadastradas removidos.
- 2026-10-15 dec 204: configuração do questionário com rascunho (criarRascunho/publicarRascunho em questionario-despesas.ts) e botão Salvar Formulário no fim; Criar novo questionário removido; Descartar alterações e aviso de alterações não salvas.
- 2026-10-15 dec 205: botão Restaurar configurações iniciais ao lado de Salvar Formulário (restaura o padrão via gravarEstado(estadoPadrao(), rascunho); só vale ao Salvar).
- 2026-10-15 dec 206: Opções avançadas (ramificação e condição) retiradas da montagem do Questionário de Despesas; regras já gravadas continuam valendo, sem tela para editá-las.
- 2026-10-15 dec 207: perguntas travadas na montagem (IDS_TRAVADAS/perguntaTravada em questionario-despesas.ts): UF, Município, Data, Valor, Foto e Detalhamento sem Editar, Adicionar opção e Obrigatória.
- 2026-10-15 dec 208: botão Adicionar opção (AdicionarHabilitado) nos cards Habilitados e Técnico responsável: busca empregado ativo e inclui na pergunta 04 (área escolhida; no técnico, Oficina).
- 2026-10-15 dec 209: números das perguntas de fábrica em ordem 01 a 14 (CODIGO_ORDENADO em questionario-despesas.ts; migração única por codigosOrdenados em lerEstado, perguntas próprias com número ocupado vão para o próximo livre).
- 2026-10-15 dec 210: botão Remover as ramificações com problema no aviso Ação requerida (limparPendencias em questionario-destinos.ts).
- 2026-10-15 dec 211: botão Editar em Respostas registradas (atualizarResposta, respostasParaEdicao em respostas-despesas.ts; bloqueado se a despesa está em relatório).
- 2026-10-15 dec 212: "Preencher novamente" virou Novo e volta ao painel de Viagens.
- 2026-10-15 dec 214: ícone do botão Faixas de desempenho (ViagensPainel.tsx) trocado de Palette para PieChart.
- 2026-10-15 dec 213: botão Gerar relatório (ViagensLista.tsx) movido para baixo da listagem.
- 2026-10-15 dec 215: Conferido (PCM/Administrativo) na Conferência do relatório (ViagensRelatorio.tsx, DadosRelatorio.conferido); botão Abrir Parâmetros > Clientes removido.
- 2026-10-15 dec 216: 4 tipos (Alimentação, Hospedagem, Pedágio, Estacionamento) seguem a lógica do scanner: ORDEM_LOGICA_PCM, TIPOS_COM_LOGICA_PCM em questionario-despesas.ts; PCM responde/técnico só na Não conformidade em perguntasVisiveis; justificativa sem comprovante (chaveJustificativa, tela no QuestionarioFormulario); flag logicaViagemAjustada migra dado salvo.
- 2026-10-15 dec 217: decisão 216 desfeita a pedido do dono; código revertido (ORDEM_LOGICA_PCM, justificativa e flag logicaViagemAjustada saíram).
- 2026-10-15 dec 218: classificação em Alimentação (TIPOS_COM_CLASSIFICACAO em questionario-despesas.ts; perguntas 13, 14 e 15 depois da 04; q-15 Nome do empregado; regras 14 só na Não conformidade e 15 só no Avulso; PCM responde só para quem lança pelo PCM/Administrativo em perguntasVisiveis; flag classificacaoAjustada migra dado salvo).
- 2026-10-15 dec 219: classificação (PCM responde, técnico responsável, Nome do empregado) também em Hospedagem, Pedágio, Estacionamento e Compra de peças (TIPOS_COM_CLASSIFICACAO em questionario-despesas.ts; flag classificacaoTiposAjustada migra dado salvo; Abastecimento, Manutenção e Outro não mudam).
- 2026-10-15 dec 220: Avulso (PCM/Administrativo) vira responsável da despesa pelo nome da pergunta 15 em dadosDoLancamento (viagens.ts, campo avulso); entra na lista e no relatório, fora do índice de conformidade e dos Resultados dos técnicos; filtro de técnico da lista traz os avulsos.
- 2026-10-15 revisão geral: hora e mês de hoje agora seguem Brasília (horaBrasilia em empregados.ts; periodoAtual em viagens.ts; abastecimento, ocorrências, respostas de despesas); testes fixam o fuso -03:00 e passam em UTC, Brasília e Tóquio.
- 2026-10-16 dec 221: nova ordem (comOrdemViagens em questionario-despesas.ts; flag ordemViagensAjustada migra dado salvo), q-04 renomeada Técnico responsável, q-14 Técnico que não lançou a despesa, q-09 só em Compra de peças, q-16 justificativa (justificativaAberta e chaveJustificativaPedida em questionario-respostas.ts; QuestionarioFormulario abre o campo ao tentar encerrar sem anexo).
- 2026-10-16 dec 222: Clientes (q-07) fora de todos os questionários (ID_CLIENTES em questionario-despesas.ts; estadoPadrao, comOrdemViagens e flag clientesRetiradosDeTodos migram dado salvo); a pergunta segue cadastrada.
- 2026-10-16 dec 223: Abastecimento na ordem de Alimentação (TIPOS_COM_CLASSIFICACAO e TIPOS_ORDEM_VIAGENS incluem Abastecimento; litros depois do valor; flag abastecimentoAjustado); NovoAbastecimentoDialog.tsx extraído do módulo de Veículos e reaproveitado em QuestionarioFormulario (escolher o cartão no card Abastecimento abre a janela; respostasDoAbastecimento devolve só data e valor); tests/estado-legado.mjs mantém o Abastecimento antigo nos testes que o usam como exemplo.
- 2026-10-16 dec 224: despesa de Abastecimento ligada ao registro de Veículos (chaveAbastecimento, sincronizarAbastecimento em questionario-respostas.ts; comAbastecimento em respostas-despesas.ts puxa data e valor ao gravar; EscolherAbastecimentoDialog.tsx).
- 2026-10-16 dec 225: respostasDoAbastecimento e sincronizarAbastecimento passam a trazer também os litros (q-10, máscara de duas casas).
- 2026-10-16 dec 226: Manutenção do veículo de trabalho na ordem de Alimentação (TIPO_MANUTENCAO, TIPOS_COM_DETALHAMENTO, flag manutencaoAjustada); NovaManutencaoDialog.tsx extraído do módulo de Veículos; EscolherManutencaoDialog.tsx; chaveManutencao, respostasDaManutencao e sincronizarManutencao em questionario-respostas.ts; comAbastecimento em respostas-despesas.ts também puxa data e custo total da manutenção.
- 2026-10-16 dec 227: Outro entra em TIPOS_COM_CLASSIFICACAO e TIPOS_ORDEM_VIAGENS (TIPO_OUTRO, flag outroAjustado em lerEstado).
- 2026-10-16 dec 227 (complemento): Outro entra em TIPOS_COM_DETALHAMENTO (Detalhamento depois do valor).
- 2026-10-16 revisão #289-#292: ajustes no PR fix/revisao-abastecimento-manutencao (reset da janela Novo abastecimento, trazer limpa campos antigos, vínculo solto ao trocar moeda, litros na sincronização, janelas só nos cards).
- 2026-10-16 dec 228: adicionarCodigoComCategoria (parametros-base.ts) cria categoria + sigla + numeração numa gravação só; Código do produto > Novo código com campo Categoria digitável (datalist); Clonar/Editar seguem com select.
- 2026-10-16 dec 229: removido o botão Clonar de Parâmetros > Gerais > Código do produto (codigo-produto.tsx: sem onClonar e sem função clonar); Editar e Excluir ficam.
- 2026-10-16 dec 230: FornecedorDialog.tsx extraído de cadastros/fornecedores.tsx; codigo-fabrica.tsx ganha link Cadastrar fornecedor (janela) que volta com o fornecedor escolhido; testes de fornecedores leem o novo componente.
- 2026-10-16: revisão geral do sistema (fix/revisao-geral-sistema): created_at crescente no demo, cascade de caixa, ordem na exclusão de fornecedor, Tab no CampoBusca, trava do ClienteDialog, datas de Brasília, responsável do check list por empresa. Detalhe em /mnt/project-files/revisoes/revisao-sistema-2026-10-16.md.
