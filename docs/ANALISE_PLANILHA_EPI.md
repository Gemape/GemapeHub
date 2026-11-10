# Análise da planilha CONTROLE DE UNIFORMES E EPIs

Documento de análise, gerado a partir da leitura somente-leitura da planilha. Nenhum CPF, nome de empregado, senha ou outro dado pessoal foi copiado para cá.

## 1. Arquivo analisado

| Item | Valor |
| --- | --- |
| Arquivo pedido | `CONTROLE DE UNIFORMES E EPIs___.xlsm`, na raiz do projeto |
| Arquivo encontrado | `CONTROLE DE UNIFORMES E EPIS___.xlsx` (2.142.037 bytes), em `C:\Users\User\Desktop\GemapeHubs`, ao lado da pasta do projeto (não dentro do repositório) |
| Confirmado pelo responsável | Sim, é esse o arquivo |
| Formato | `.xlsx`: **não contém macros VBA** (não há `vbaProject.bin` no pacote) |
| Como foi lido | `openpyxl` não está instalado e, por escolha do responsável, nada foi instalado. O pacote OOXML foi lido direto (`zipfile` + XML do Python), só leitura; o arquivo original não foi alterado |
| Planilha de origem | Foi salva como `.xlsx` a partir de uma `.xlsm`: restaram os botões ("ATUALIZAR RELATÓRIO" etc.), mas o código que eles chamavam não existe mais |

### Consequência para a análise

As abas de relatório estão **preenchidas com valores gravados**, não com fórmulas: `REL_ESTOQUE`, `REL_COMPRAS`, `REL_BAIXAS_DEFINITIVAS` e `REL_FUNCIONÁRIO` têm, cada uma, no máximo uma fórmula (`NOW()` da impressão), e `CAD_PRODUTO` tem o estoque atual como número fixo. Quem calculava e preenchia isso era a macro VBA dos botões, que **não está no arquivo**. As regras abaixo foram **deduzidas dos valores gravados** e marcadas como "inferido" quando não há prova direta. Para confirmar, é preciso o `.xlsm` original (para ler o código VBA).

## 2. Abas (13)

Todas visíveis. "Células" = células com valor ou fórmula (as dimensões usadas incluem formatação vazia, por isso são bem maiores).

| Aba | Dimensão | Células | Fórmulas | Papel |
| --- | --- | --- | --- | --- |
| PARÂMETROS | A1:AI186 | 54 | 0 | Listas fixas e parâmetros |
| CAD_PRODUTO | A1:AU3721 | 482 | 4 | Cadastro de produtos e estoque por grupo |
| CAD_EMPREGADOS | A1:AL391 | 430 | 236 | Cadastro de empregados e medidas |
| CAD_FICHA_EPI | A1:EL43 | 248 | 40 | Texto técnico de cada EPI, para a ficha |
| MOVIMENTAÇÃO | A1:V6089 | 6.764 | 6.088 | Livro de entradas e saídas |
| REL_BAIXAS_DEFINITIVAS | A1:AN4706 | 60 | 1 | Relatório de baixas |
| REL_FUNCIONÁRIO | A1:AH1373 | 102 | 7 | Entregas por empregado |
| REL_ESTOQUE | A1:Z3695 | 679 | 1 | Controle de estoque e consumo |
| REL_COMPRAS | A1:W4771 | 97 | 1 | Sugestão de compras |
| FICHA_EPI | A1:AC41 | 29 | 6 | Ficha individual de entrega de EPI (impressão) |
| ENTREGA_UNIFORME | A1:X4666 | 50 | 7 | Termo de entrega de uniformes (impressão) |
| ENTREGA_TREINO_EPI | A1:AA4823 | 273 | 7 | Termo de entrega e treinamento de EPIs (impressão) |
| BAIXA_EPI_UNIFORME | A1:X4666 | 65 | 8 | Termo de baixa de EPIs e uniformes (impressão) |

Há também 9 botões de formulário (rótulos: ATUALIZAR RELATÓRIO, ATUALIZAR RELATÓRIO FUNCIONÁRIO, ATUALIZAR ESTOQUE, ATUALIZAR COMPRAS, FORMATAR IMPRESSÃO) e um vínculo externo para uma "Lista Mestre" de RH em um servidor de rede (usada só para duas listas de contrato; fora do escopo).

## 3. PARÂMETROS

| Lista | Valores |
| --- | --- |
| Tipo de movimento | ENTRADA, SAÍDA |
| Motivo de baixa (saída) | FORNECIMENTO AO EMPREGADO, DESLIGAMENTO, DESGASTE NATURAL, QUEBRA, DESAPARECIMENTO, PERDA, MAU USO |
| Estado do produto | NOVO, USADO |
| Cobertura do estoque (filtro dos relatórios) | MENOS DE 30, 60, 90, 120, 180 DIAS |
| Sugerir compra se cobertura inferior a XX dias | 180, 120, 90, 60, 30 (lista para escolher a meta) |
| Identificação da empresa | 3 empresas do grupo, cada uma com razão social e CNPJ (usadas nos termos) |
| Baixa definitiva substituindo um produto | NOVO, USADO |
| Contexto da baixa | NO DESLIGAMENTO DO EMPREGADO, NO DECORRER DO CONTRATO DE TRABALHO |
| Tipo de uniforme | NOVO, USADO, NOVO E USADO |

## 4. CAD_PRODUTO

Quatro blocos lado a lado, um por grupo: **UNIFORME NOVO** (colunas D a H), **EPIs** (J a N), **UNIFORME USADO** (P a T) e um quarto grupo vazio (V a Z). Cada bloco tem: ESTOQUE ATUAL, ESTOQUE CRÍTICO, DESCRIÇÃO, GRUPO e ESTADO.

- Os títulos dos blocos vêm de uma lista de grupos (B3:B6) por fórmula `=B3`, `=B4`...
- Há 54 linhas de produtos. O tamanho vai dentro da descrição ("... TAM. G"), um produto por tamanho.
- **Estoque atual é número fixo** (a macro "ATUALIZAR ESTOQUE" o recalcula). Aparecem valores **negativos** (por exemplo -1), o que mostra que a planilha deixa o estoque ficar negativo.
- Existem nomes definidos `Grupo_D1`, `Grupo_J1`, `Grupo_P1` e `Grupo_V1` (as colunas de descrição de cada grupo), usados nas listas suspensas.
- Há uma coluna "SUGERIR COMPRA SE COBERTURA DE ESTOQUE INFERIOR A (DIAS)" com o valor 120 na linha 3 e na linha 4.

## 5. CAD_EMPREGADOS

Colunas: NOME EMPREGADO (chave de busca; fórmula `=E{linha}`), EMPRESA, ÁREA (setor), NOME COMPLETO, CPF, IDENTIDADE, DATA DE NASCIMENTO, e as **medidas**: CALÇA, BLUSA e BOTINA. As fórmulas (236) são só `=E{linha}` ou cópias compartilhadas da mesma ideia. Dados pessoais não foram copiados.

## 6. MOVIMENTAÇÃO (livro de movimentos)

| Coluna | Conteúdo |
| --- | --- |
| B | DATA MOVIMENTO |
| C | TIPO MOVIMENTO (ENTRADA ou SAÍDA) |
| D | SE SAÍDA, MOTIVO |
| E | GRUPO (EPIs, UNIFORME NOVO, UNIFORME USADO) |
| F | PRODUTO (lista suspensa com validação, linhas inteiras) |
| G | ESTADO (NOVO ou USADO) |
| H | QUANT |
| I | EMPREGADO (se saída) |
| J | CPF — fórmula |
| L1 | ESTOQUE ATUAL (rótulo; a macro preenche) |

**Única fórmula (6.088 linhas, coluna J):**
`=IF(ISBLANK(I{r}),"",VLOOKUP(I{r},CAD_EMPREGADOS!$B$2:$H$236,5,FALSE))` — traz o CPF do empregado pelo nome. Observação: o intervalo fixo `$B$2:$H$236` é menor que a lista de empregados (a aba chega à linha 391), então empregados além da linha 236 não seriam achados.

**Comentário da célula G1:** se o motivo da saída é "entrega ao funcionário", o estado é NOVO ou USADO do item entregue; em outro motivo de saída, a coluna informa se o uniforme com **baixa definitiva** foi entregue novo ou usado ao empregado.

**Formatação condicional** nas colunas C e D (destaca o tipo e o motivo).

### Dados gravados (resumo, sem nomes)

- 102 movimentos, de 11/03/2026 a 06/04/2026: 72 entradas e 30 saídas.
- Grupos: EPIs 55, UNIFORME NOVO 41, UNIFORME USADO 6. Estado: NOVO 89, USADO 12.
- Motivos das saídas: Fornecimento ao empregado 12, Desgaste natural 7, Desaparecimento 6, Perda 2, Quebra 2, sem motivo 1 (a planilha aceita saída sem motivo e sem empregado: 1 caso de cada).
- 66 produtos distintos; **9 de 79 combinações produto/estado ficam com saldo negativo** (entradas menos saídas): a planilha não impede saída sem estoque.
- Nenhuma entrada tem empregado informado (como esperado).

## 7. Relatórios

### 7.1 REL_ESTOQUE (controle de estoque e consumo)

Filtros no cabeçalho: GRUPO DESEJADO, ESTADO, COBERTURA ESTOQUE (as faixas de 30 a 180 dias). Botões: atualizar relatório e formatar impressão.

Colunas: DESCRIÇÃO, GRUPO, ESTADO, ESTOQUE CRÍTICO, ESTOQUE ATUAL, PENÚLTIMA ENTRADA, ÚLTIMA ENTRADA, PENÚLTIMA SAÍDA, ÚLTIMA SAÍDA, MÉDIA DE CONSUMO MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL, GIRO DE ESTOQUE e COBERTURA DE ESTOQUE (DIAS). 58 linhas gravadas.

**Regras inferidas dos valores** (data de geração próxima de abril de 2026):

| Coluna | Regra inferida |
| --- | --- |
| Média mensal | saídas dos últimos 30 dias ÷ 1 |
| Média trimestral | saídas dos últimos 90 dias ÷ 3 |
| Média semestral | saídas dos últimos 180 dias ÷ 6 |
| Média anual | saídas dos últimos 365 dias ÷ 12 |
| Cobertura (dias) | estoque atual ÷ (média anual ÷ 30). Ex.: estoque -1 e média 0,17 dá -180 dias |
| Sem consumo | cobertura mostra o texto "Sem Consumo" quando não há saída no período |
| Estoque 0 | cobertura 0 |
| Giro de estoque | aparece 0 em todas as linhas; a fórmula não pôde ser deduzida |

Exemplo que sustenta as médias: um produto com 1 saída tem média mensal 1, trimestral 0,333, semestral 0,1667 e anual 0,0833.

### 7.2 REL_COMPRAS (sugestão de compras)

Filtros: GRUPO, ESTADO, COBERTURA DE ESTOQUE.

Colunas: DESCRIÇÃO, GRUPO, ESTADO, ESTOQUE CRÍTICO, ESTOQUE ATUAL, COBERTURA (DIAS), CONSUMO MÉDIO MENSAL, QUANTIDADE SUGERIDA PARA COMPRA, PRIORIDADE, OBSERVAÇÃO. 8 linhas gravadas (7 "1-URGENTE" e 1 "4-BAIXA").

**Regras inferidas:**

| Coluna | Regra inferida |
| --- | --- |
| Consumo médio mensal | a média anual do REL_ESTOQUE (saídas dos últimos 12 meses ÷ 12) |
| Meta | a meta de cobertura em dias do parâmetro "Sugerir compra se cobertura inferior a XX dias" (120 nos dados) |
| Percentual de cobertura | cobertura em dias ÷ meta. Ex.: -180 ÷ 120 = -150%; 90 ÷ 120 = 75% |
| Quantidade sugerida | arredonda para cima de (consumo mensal × meta em meses − estoque atual). Ex.: estoque -1, média 0,17, meta 4 meses: 0,67 + 1 = 1,67, sugere 2 |
| Prioridade | "1-URGENTE" para cobertura de 0% ou negativa ou abaixo do crítico; "4-BAIXA" para 75%. Os níveis 2 e 3 não aparecem nos dados; os cortes exatos são desconhecidos |
| Observação | "Abaixo do estoque crítico." quando o estoque está abaixo do crítico, mais "Cobertura abaixo da meta (N%)." ou "Sem consumo no último ano." |
| Só entra no relatório | produto com cobertura abaixo da meta ou estoque abaixo do crítico |

### 7.3 REL_BAIXAS_DEFINITIVAS

Filtros: FUNCIONÁRIO ENVOLVIDO, DATA INÍCIO e DATA FIM (com validação de data), MOTIVO DA BAIXA, GRUPO DESEJADO, ESTADO DO EPI OU UNIFORME ORIGINAL. Aviso na planilha: "relatório de geração lenta".

Colunas: DATA, DESCRIÇÃO, GRUPO, ESTADO, MOTIVO, QUANT., EMPREGADO. Lista (inferido) as **saídas** de motivo diferente de fornecimento (desgaste, quebra, desaparecimento, perda, mau uso, desligamento), com filtro por período.

### 7.4 REL_FUNCIONÁRIO (entregas por empregado)

Entrada: o empregado (célula de escolha) e o período inicial e final. Cabeçalho com nome e CPF por `VLOOKUP` em CAD_EMPREGADOS. Depois, **quatro blocos** com o mesmo formato (DATA, MOTIVO, GRUPO, PRODUTO, ESTADO, QUANTIDADE): UNIFORME NOVO, EPIs, UNIFORME USADO e o grupo extra. Os títulos vêm de `CAD_PRODUTO!D1`, `J1`, `P1` e `V1`. Os blocos são fatias do livro de MOVIMENTAÇÃO do empregado, por grupo e período.

## 8. Documentos de impressão

| Aba | O que gera | Dados vindos de |
| --- | --- | --- |
| FICHA_EPI | Ficha individual de controle de entrega de EPI: empresa, empregado, CPF, medidas (calça, camisa, botina), e a tabela DATA, DESCRIÇÃO DO EPI, Nº DO CA, NOVO ou REPOSIÇÃO, QUANT., ASSINATURA | `VLOOKUP` em CAD_EMPREGADOS (colunas 2, 5, 8, 9 e 10) |
| ENTREGA_UNIFORME | Termo de entrega de uniformes novos, com período | PARÂMETROS (CNPJ da empresa) e CAD_EMPREGADOS |
| ENTREGA_TREINO_EPI | Termo de entrega e treinamento para uso de EPIs, com a lista de EPIs escolhidos e as orientações de uso | CAD_FICHA_EPI (texto técnico de cada EPI) |
| BAIXA_EPI_UNIFORME | Termo de baixa de EPIs e uniformes, com o contexto da baixa (no desligamento ou no decorrer do contrato) | PARÂMETROS (contexto, CNPJ) e CAD_EMPREGADOS |

CAD_FICHA_EPI guarda, por EPI: certificado de aprovação (CA), setores aplicáveis, finalidade e riscos protegidos, instruções de uso e forma de vestir, verificação da eficácia antes do uso, higienização e conservação, descarte e responsabilidades do empregado (NR-6).

A aba FICHA_EPI tem uma **senha de desbloqueio da planilha** gravada em texto; o valor não é reproduzido aqui. Recomenda-se não levar esse mecanismo para o sistema.

## 9. Fórmulas encontradas (todas)

| Onde | Fórmula (linha como `{r}`) | Para quê |
| --- | --- | --- |
| MOVIMENTAÇÃO!J | `IF(ISBLANK(I{r}),"",VLOOKUP(I{r},CAD_EMPREGADOS!$B$2:$H$236,5,FALSE))` | CPF do empregado |
| REL_FUNCIONÁRIO!C7 | `IF(ISBLANK(I4),"",I4)` | Nome |
| REL_FUNCIONÁRIO!F7 | `IF(ISBLANK(I4),"",VLOOKUP(I4,CAD_EMPREGADOS!$B$2:$F$237,5,FALSE))` | CPF |
| REL_FUNCIONÁRIO!B9, B180, B350, B520 | `CAD_PRODUTO!D1`, `J1`, `P1`, `V1` | Título de cada bloco |
| FICHA_EPI!B4, H7, C9, E9, G9 | `IF(ISBLANK(B7),"",VLOOKUP(B7,CAD_EMPREGADOS!$B$2:$K$999999,{2,5,8,9,10},FALSE))` | Empresa, CPF e medidas |
| ENTREGA_UNIFORME, ENTREGA_TREINO_EPI, BAIXA_EPI_UNIFORME | `VLOOKUP(empresa,PARÂMETROS!$N$2:$P$9,3,FALSE)` e `VLOOKUP(empregado,CAD_EMPREGADOS!$B$2:$F$20000,{1,5},FALSE)` | CNPJ, nome e CPF |
| Todas as abas de relatório e termos | `NOW()` | Data e hora da impressão |
| CAD_PRODUTO!D1, J1, P1, V1 | `=B3`, `=B4`, `=B5`, `=B6` | Títulos dos blocos |
| CAD_EMPREGADOS!B | `=E{r}` | Chave de busca igual ao nome completo |
| CAD_FICHA_EPI!B3:B... | `=G2`, `=I2`... | Lista de nomes de EPI |

## 10. Dependências entre abas

```
PARÂMETROS ── listas (tipo, motivo, estado, cobertura, empresas) ──► MOVIMENTAÇÃO, REL_*, termos
CAD_PRODUTO ── produtos, grupos, estoque crítico ──► MOVIMENTAÇÃO (lista de produtos) ──► REL_ESTOQUE ──► REL_COMPRAS
CAD_EMPREGADOS ── nome, CPF, medidas, empresa ──► MOVIMENTAÇÃO!J, REL_FUNCIONÁRIO, FICHA_EPI, termos
CAD_FICHA_EPI ── texto técnico e CA ──► ENTREGA_TREINO_EPI
MOVIMENTAÇÃO ──► ESTOQUE ATUAL (CAD_PRODUTO), REL_ESTOQUE, REL_COMPRAS, REL_BAIXAS_DEFINITIVAS, REL_FUNCIONÁRIO
```

O estoque atual **não é fórmula**: é recalculado por macro a partir do livro de MOVIMENTAÇÃO (entradas menos saídas, por produto e estado).

## 11. Regras de negócio identificadas

1. Todo movimento é ENTRADA ou SAÍDA, com data, grupo, produto, estado e quantidade.
2. Saída tem motivo (7 opções) e, no fornecimento, o empregado; o CPF vem do cadastro do empregado.
3. Estoque por produto e estado = entradas − saídas. A planilha **permite saldo negativo**.
4. Cada produto tem um estoque crítico (mínimo).
5. Cobertura em dias = estoque atual ÷ consumo médio diário (consumo médio mensal ÷ 30), com consumo dos últimos 12 meses para a compra e janelas de 30, 90, 180 e 365 dias para o estoque.
6. A meta de cobertura (30, 60, 90, 120 ou 180 dias) define quando sugerir compra e quanto comprar.
7. Prioridade da compra pelo percentual de cobertura (cortes inferidos; só se viu "1-URGENTE" e "4-BAIXA").
8. Baixa definitiva é toda saída que não é fornecimento ao empregado; pode "substituir um produto" (informa se o original era novo ou usado) e tem contexto (desligamento ou decorrer do contrato).
9. Uniforme tem três situações: novo, usado ou novo e usado; EPI nunca é "usado" na entrega.
10. A ficha do EPI leva o número do CA e a distinção NOVO (NO) ou REPOSIÇÃO (RE); o empregado assina.
11. O termo de treinamento imprime, por EPI, a orientação de uso do cadastro técnico (NR-6).
12. Medidas do empregado (calça, blusa, botina) acompanham a ficha.

## 12. Comparação com o módulo de EPIs do sistema (GemapeHub)

Já existe no sistema: abas Dashboard, Estoque, Compras, Histórico do empregado, Baixas definitivas, Entrega EPI, Termo de Entrega, Ficha de EPI Avulsa e Ocorrências; motivos de baixa iguais aos da planilha; estado Novo e Usado; níveis de cobertura em 30, 60, 90, 120 e 180 dias (`nivelPorCobertura`) e cálculo de cobertura com as saídas dos últimos 180 dias; ficha com CA.

**Lacunas em relação à planilha** (candidatas a implantar):

| Lacuna | Planilha | Sistema hoje |
| --- | --- | --- |
| Relatório de estoque detalhado | Médias mensal, trimestral, semestral e anual, giro, últimas e penúltimas entradas e saídas | Só estoque atual e alerta por cobertura (janela de 180 dias) |
| Sugestão de compras | Quantidade sugerida, prioridade e observação, por meta de cobertura | A aba Compras registra compras; não sugere |
| Meta de cobertura configurável | Lista 30, 60, 90, 120 ou 180 dias | Faixas fixas no código |
| Estoque crítico por produto | Coluna no cadastro | Existe estoque mínimo no item |
| Estoque negativo | Permite (e há casos) | A confirmar se o sistema barra a saída sem estoque |
| Contexto da baixa e "substitui produto" | Duas listas nos parâmetros | A confirmar |
| Texto técnico do EPI no termo de treinamento | CAD_FICHA_EPI (8 campos por EPI) | A confirmar |

## 13. Pontos que precisam de decisão ou do arquivo original

- Fórmula exata do **giro de estoque** e cortes das prioridades 2 e 3: só o código VBA original revela. Pedir o `.xlsm` original.
- A data de referência dos relatórios gravados é anterior a `NOW()` da impressão (os valores são de uma geração antiga), então as janelas inferidas têm esse limite.
- O intervalo fixo da busca de CPF em MOVIMENTAÇÃO (`$B$2:$H$236`) é menor que o cadastro de empregados.
- A senha de desbloqueio gravada na planilha deve ser tratada como credencial e não levada ao sistema.
- O vínculo externo com a "Lista Mestre" de RH (rede interna) não tem uso nas regras de EPI.
