# Auditoria — sistema atual × especificação

**Etapa 0.** Levantamento feito em 29/09/2026 sobre a versão que está no ar (branch `main`, commit d1c23d0). Nenhuma tela foi alterada. A especificação usada é `docs/especificacao-gemapehub.md`.

**Legenda:**
- ✅ **Conforme:** já existe e atende à especificação. Não mexer.
- 🔧 **Ajustar:** existe, mas precisa ser adaptado.
- 🆕 **Construir:** não existe.

> **Trabalho ainda fora da `main`.** Parte do que está abaixo já tem PR aberto ou branch, mas nada disso está no ar:
> - PR #6: Código de Fábrica com importação de XML.
> - PR #7: código sequencial do fornecedor.
> - PR #8: Categorias de Produto.
> - Branch `feat/empresas`, ainda sem PR: endereço e status nas empresas.
>
> Na seção "Como aproveitar o que já está feito", proponho o que fazer com cada um.

---

## Visão geral

| Camada | ✅ Conforme | 🔧 Ajustar | 🆕 Construir |
|---|---|---|---|
| Parâmetros Base (Produtos) | 0 | 2 | 7 |
| Cadastros | 6 | 13 | 6 |
| Módulos | 5 | 3 | 0 |
| Permissões de Acesso | 0 | 1 | 3 |

O ponto central: **hoje as listas de opções (categorias, tamanhos, unidades, tipos) estão fixas no código** (`src/lib/gemape.ts`), e os módulos guardam como texto livre dados que deveriam vir de um cadastro, como fornecedor e marca. A adequação consiste em criar os Parâmetros Base e fazer os módulos lerem deles.

---

## 1. Parâmetros Base — Produtos

Especificação: acesso só do Administrador. Usuário simples não tem acesso.

| Item da especificação | Hoje | Situação | O que fazer |
|---|---|---|---|
| Menu "Parâmetros Base" | Não existe. O menu tem Visão geral, Módulos e Cadastros. | 🆕 | Criar o grupo no menu, visível só para o administrador. |
| **Cadastrar categorias:** mostra as existentes e permite criar nova | Não existe. Os módulos são fixos (EPI, Uniforme, Ferramenta, Veículo). | 🆕 | Cadastro de categorias, começando com EPI, Uniformes, Ferramentas e Veículos. |
| **Cadastrar subcategorias:** escolher a categoria e cadastrar subcategorias | Existem como listas fixas no código (`CATEGORIAS_EPI` = Capacete, Luva, Óculos…; `CATEGORIAS_UNIFORME`; `CATEGORIAS_FERRAMENTA`; `TIPOS_VEICULO`). Não há tela. | 🔧 | Levar as listas atuais para um cadastro editável. Os formulários passam a ler dele. O PR #8 já faz parte disso. |
| **Código de fábrica:** buscar produto GEMAPE, buscar fornecedor, código do produto na NF e CA se for EPI | Não existe na `main`. | 🆕 | Tela com busca de produto e de fornecedor. O PR #6 tem a tabela e a importação de XML, mas a especificação pede a associação manual, com busca. |
| **Endereçamento de estoque:** produto (com busca), rua (corredor), número (estante), apartamento (nível, de cima para baixo) | Existe (`EnderecamentoModulo`). Campos Rua / Prateleira / Apartamento. O produto é um código digitado, com sugestões, e o sistema não confere se o código existe. Fica no grupo Módulos. | 🔧 | Trocar "Prateleira" por "Número (estante)" e explicar "Apartamento (nível, de cima para baixo)". Produto passa a ser escolhido por busca, só entre os cadastrados. Mover para Parâmetros Base. |
| **Numeração e tamanhos:** lista sequencial de todos os tamanhos e numerações | Listas fixas `TAMANHOS_EPI` (Único, P, M, G, GG) e `TAMANHOS_UNIFORME` (PP a XGG, Único). Não há numeração (ex.: 38, 40, 42). | 🆕 | Cadastro único de tamanhos e numerações. |
| **Unidades de medida:** Unidade, Par, Jogo, Caixa… | Listas fixas `UNIDADES_EPI` (Unidade, Par, Jogo) e `UNIDADES_UNIFORME` (Unidade, Par). Ferramenta usa só "Unidade". Não existe "Caixa". | 🆕 | Cadastro de unidades de medida. |
| **Associar tamanho e medida** à categoria e subcategoria (Existentes → Autorizados) | Não existe. Cada módulo mostra a lista fixa inteira. | 🆕 | Tela com as duas listas (Existentes / Autorizados), por categoria e subcategoria. Os formulários mostram só os autorizados. |
| **Código do produto:** categoria, sigla e numeração inicial | Não existe. O código (SKU) é digitado à mão. A tela de EPI diz "o código será gerado automaticamente", mas nada gera. | 🆕 | Regra por categoria (ex.: EPI + "EPI" + 1 gera EPI-0001). Os cadastros de produto passam a gerar o código sozinhos. |

---

## 2. Cadastros

### Empresas

Especificação: acesso do Administrador e do RH. Usuário simples não tem acesso. Excluir só o administrador.

| Item | Hoje | Situação | O que fazer |
|---|---|---|---|
| Razão social | Existe, obrigatória. | ✅ | Manter. |
| CNPJ | Existe, obrigatório, sem conferência dos dígitos nem de CNPJ repetido. | 🔧 | Validar os dígitos e barrar repetido. |
| Endereço | Não existe. | 🆕 | Rua/Av., Nº, Bairro, CEP, Cidade, Estado. |
| Status (ativa/inativa) | Não existe. | 🆕 | Campo de status; ativas primeiro na lista. |
| Acesso e exclusão | O menu aparece para todos. Editar e excluir aparecem para admin e gestor, mas o banco só deixa o admin gravar. | 🔧 | Menu e tela só para o administrador (e o RH, quando existir). Excluir só para o administrador. |
| Nome fantasia (fora da especificação) | Existe. O seletor de empresa no topo e todos os módulos usam esse campo. | ✅ | Manter, para não quebrar os módulos. |

> O branch `feat/empresas` já tem os 4 ajustes acima prontos e testados. Está aguardando a sua validação visual.

### Empregados

Especificação: acesso do Administrador e do RH. Usuário simples não tem acesso. Excluir só o administrador.

| Item | Hoje | Situação | O que fazer |
|---|---|---|---|
| Nome completo, CPF, Empresa | Existem. | ✅ | Manter. |
| Matrícula interna (LxPx: livro x, página x) | Existe como texto livre, sem formato. | 🔧 | Orientar o formato LxPx (ex.: L2P15) e conferir. |
| E-mail | Não existe. | 🆕 | Criar. Ele também será usado para o primeiro acesso do usuário. |
| Data de admissão, data de demissão | Existem. | ✅ | Manter. |
| Demissão inativa automaticamente | Não. O "ativo" é um interruptor manual, separado da data. | 🔧 | Ao informar a data de demissão, o empregado fica inativo automaticamente. |
| Ativos em cima, inativos num bloco separado embaixo | Tabela única. | 🔧 | Dividir em dois blocos. |
| Acesso e exclusão | Aparece para todos. Excluir aparece para admin e gestor. | 🔧 | Tela só para administrador e RH. Excluir só para o administrador. |
| Cargo (fora da especificação) | Existe. | ✅ | Manter. |

### Fornecedores

Especificação: acesso só do Administrador.

| Item | Hoje | Situação | O que fazer |
|---|---|---|---|
| Código sequencial automático de **5 dígitos** | Não existe na `main`. O PR #7 gera "FOR-0001" (4 dígitos com prefixo). | 🔧 | Ajustar o PR #7 para 5 dígitos (00001). |
| Categoria (vem de Categorias de Produto) | Existe como "Natureza", com caixas fixas: EPI, Uniforme, Ferramentas, Veículos. | 🔧 | Ler as opções do cadastro de categorias. |
| Razão social, nome fantasia, CNPJ, endereço completo, inscrição estadual, telefone, contato, observações | Existem todos. | ✅ | Manter. |
| Acesso | Aparece para todos. Editar aparece para admin e gestor. | 🔧 | Só administrador. |

### Cadastros de Ferramentas

Especificação: o administrador cadastra caixa, portador, categoria e grupo. O usuário simples cadastra modelo.

| Item | Hoje | Situação | O que fazer |
|---|---|---|---|
| **Categorias de ferramentas:** Manual, Elétrica, Pneumático, Hidráulica, Medição, Corte, e permitir novas | Lista fixa com os mesmos valores, mais "Outros". Não dá para cadastrar novas. | 🔧 | Levar para um cadastro editável. Pode ser a própria subcategoria da categoria Ferramentas nos Parâmetros Base. |
| **Grupos:** Chave de fenda, Chave estria… Diversos (13 itens) | Não existe. | 🆕 | Cadastro de grupos, com os 13 itens iniciais. |
| **Marcas** | Não existe. Marca é texto livre no produto. | 🆕 | Cadastro de marcas. O produto passa a escolher de uma lista. |
| **Caixas numeradas de 01 a 100, com flag de habilitada** | As caixas têm código automático CX-0001, sem limite e sem flag. | 🔧 | Trocar para a numeração fixa 01–100, com marcação de habilitada. |
| **Portador:** caixa (só as habilitadas), empregado (com busca), status, observação e histórico de portadores | Existe só "Responsável atual" dentro da caixa. Não há status, observação nem histórico. | 🆕 | Cadastro de portador com histórico. |
| **Modelo (ferramenta):** código sequencial, categoria, grupo, modelo | Código digitado à mão. Categoria vem da lista fixa. Sem grupo. | 🔧 | Código automático, grupo e marca por lista. |
| Número de série, patrimônio com chave liga/desliga e código sequencial, data de aquisição (rascunho da especificação) | Nº de série e data de aquisição existem. Patrimônio é texto livre, sem chave. | 🔧 | Aguardar a versão final dessa parte da especificação (está marcada como rascunho). |

> Na tela de ferramentas, os campos Marca e Modelo aparecem duas vezes no formulário. É um defeito a corrigir junto com este ajuste.

---

## 3. Módulos

A especificação não detalha os módulos. A regra é: **os módulos puxam dados dos cadastros e não guardam dados próprios que deveriam vir de um cadastro.**

| Módulo | Hoje | Situação | O que fazer |
|---|---|---|---|
| **EPIs** (cadastro, entrega, termos, compras, relatórios) | Funciona. Categoria, tamanho e unidade vêm de listas fixas. Fornecedor é texto livre. Código é digitado. | 🔧 | Ler subcategoria, tamanho e unidade dos Parâmetros Base. Fornecedor escolhido do cadastro. Código gerado pela regra. |
| **Uniformes** | Igual ao EPI. | 🔧 | Mesmos ajustes do EPI. |
| **Ferramentas e Caixas de Ferramentas** | Funciona. Marca, grupo e patrimônio são texto livre; categoria vem de lista fixa. | 🔧 | Ler dos cadastros de Ferramentas (categoria, grupo, marca, caixas, portador). |
| **Veículos** | Funciona. "Tipo" vem de lista fixa. Responsável e empresa já vêm dos cadastros. | ✅ | Manter. O "Tipo" passa a vir da subcategoria de Veículos quando os Parâmetros Base existirem. |
| **Ocorrências** | Funciona. Empregado, item e veículo já vêm dos cadastros. | ✅ | Manter. |
| **Dashboard** | Totais, patrimônio por categoria, alertas de estoque e distribuição por empresa. | ✅ | Manter. |
| **Relatórios** | Relatório de movimentações com filtros e exportação CSV. | ✅ | Manter. |
| **Menu** | Os cadastros de EPIs, Uniformes, Ferramentas e Veículos estão no grupo "Cadastros", misturados com Empresas, Empregados e Fornecedores. Endereçamento está em "Módulos". | ✅ | Manter por enquanto. Vou reorganizar junto com a criação de Parâmetros Base, com a sua aprovação. |

Há também uma tela de veículos antiga que não é usada em lugar nenhum (`VeiculosModulo.tsx`) e tem campos com nomes trocados. Posso removê-la.

---

## 4. Permissões de Acesso

| Item | Hoje | Situação | O que fazer |
|---|---|---|---|
| **Grupos:** Administrador, RH, Padrão | Existem Administrador, Gestor e Operador. Não há RH. | 🔧 | Decidir o mapeamento: Operador passa a ser Padrão? O Gestor continua existindo? E criar o RH. |
| **Cadastrar usuário:** escolher o empregado, login nome.sobrenome, senha automática trocada no primeiro acesso, dados enviados por e-mail | Hoje o login é o e-mail, a senha inicial é digitada pelo administrador e não há vínculo com o empregado. A tela está desligada no modo demonstração. | 🆕 | Construir na **Fase 2**, porque depende da autenticação real (Supabase). Na Fase 1, dá para simular a troca de perfil no modo demonstração, para testar as permissões. |
| **Gerenciar acesso:** para cada rotina, Editar, Consultar ou Sem acesso | Não existe. O acesso é só pelo perfil. | 🆕 | Construir. Na Fase 1, como simulação no modo demonstração. |
| Enviar dados de acesso por e-mail | Não existe. | 🆕 | Fase 2. |

---

## Como aproveitar o que já está feito

| Trabalho | Proposta |
|---|---|
| Branch `feat/empresas` (endereço, status, validação de CNPJ, acesso só admin) | Abrir o PR quando você validar as telas. É exatamente o ajuste de Empresas acima. |
| PR #7 (código do fornecedor) | Ajustar para 5 dígitos e manter o PR, na mesma branch. |
| PR #8 (Categorias de Produto) | Fechar e aproveitar o código na etapa de Parâmetros Base, que vai ter Categorias **e** Subcategorias. |
| PR #6 (Código de Fábrica com XML) | Fechar e aproveitar a tabela e a busca na tela manual de Código de Fábrica. A importação do XML fica guardada para o futuro módulo de entrada de nota fiscal. |

## Ordem proposta

1. **Parâmetros Base:** categorias, subcategorias, tamanhos, unidades, associação tamanho/medida, código do produto, código de fábrica e endereçamento.
2. **Cadastros:** Empresas, Empregados, Fornecedores e os cadastros de Ferramentas (categorias, grupos, marcas, caixas 01–100, portador).
3. **Módulos:** EPIs, Uniformes e Ferramentas passam a ler dos cadastros.
4. **Permissões:** perfis Administrador / RH / Padrão e matriz de acesso simulados no modo demonstração. A parte real fica para a Fase 2.

Cada etapa sai em PR próprio, com preview na Vercel, screenshots e a sua aprovação antes da seguinte. Tudo em modo demonstração, sem nada no Supabase real.

## Decisões que preciso de você

1. **Perfis:** mapeio Operador → Padrão, mantenho o Gestor e crio o RH? Ou passam a existir só os 3 perfis da especificação?
2. **PRs abertos:** concorda com a proposta acima (fechar #6 e #8 e reaproveitar o código; ajustar #7)?
3. **Categorias de ferramentas:** são as subcategorias da categoria "Ferramentas" nos Parâmetros Base, ou um cadastro separado dentro de Ferramentas, como a especificação descreve?
