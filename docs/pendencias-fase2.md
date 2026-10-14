# Construção do GEMAPE Hub e pendências da Fase 2

## Filosofia de construção (definida pelo responsável em 29/09/2026)

Primeiro construímos a **lógica e o funcionamento** do sistema. O banco de dados (Supabase) e a autenticação só são criados **depois que tudo estiver validado**.

**Fase atual: lógica e funcionamento**
1. Telas, fluxos, regras, cálculos e validações são construídos e ajustados em **modo demonstração**, com dados fictícios locais.
2. Nada toca o Supabase real: sem tabelas novas, sem migrations, sem auth.
3. Cada entrega passa pela validação visual do responsável no preview da Vercel antes de ser considerada pronta. Se o ambiente de trabalho não alcançar a Vercel, a visualização local em modo demonstração é o fallback.
4. Quando tudo estiver validado (módulos, cadastros, telas e fluxos), constrói-se o banco real e a autenticação no Supabase: tabelas, vínculos, políticas de acesso e perfis. **Essa fase só começa com ordem explícita do responsável.**

**Regra prática:** se uma tarefa exigir criar tabela no Supabase ou mexer em auth, pare e avise o responsável. É sinal de que chegamos à Fase 2, e ela só começa com a ordem dele.

## Registro para a Fase 2

Nada abaixo deve ser feito antes da ordem do responsável.

### Banco de dados
- **Empresas:** adicionar à tabela `public.empresas` as colunas `rua`, `numero`, `bairro`, `cep`, `cidade`, `estado` e `status`. O formulário de empresas já envia esses campos.
- **Migrations já escritas e ainda não aplicadas no banco real:**
  - `20260928120000_empresa_papeis_rls.sql` (perfis e isolamento por empresa);
  - `20260928130000_enderecamentos.sql` (endereçamento de estoque);
  - `20260928140000_vistoria_sem_estoque.sql` (vistoria não altera estoque).
- **Código do produto:** gerar o próximo código (EPI-0001 etc.) no próprio banco, para não repetir quando duas pessoas salvam ao mesmo tempo.
- **Empregados:** criar a coluna `email`. No gatilho de movimentações, bloquear também empregado com demissão vencida, ou seja, exigir `data_demissao IS NULL OR data_demissao > (now() AT TIME ZONE 'America/Sao_Paulo')::date`. Hoje o gatilho só olha `ativo`, e quem foi salvo com demissão futura continua `ativo = true` depois da data. A tela já bloqueia (decisão especial 15). **Atenção:** o termo de encerramento de ferramentas (devolução na saída) é liberado na tela depois da demissão, mas o gatilho atual recusa qualquer movimentação de empregado com `ativo = false`. Como quem é salvo com a demissão já vencida fica com `ativo = false`, o encerramento dele falha no banco real. O gatilho precisa deixar o encerramento passar.
- **Estoque de ferramentas:** revisar o estoque inflado por vistorias antigas, que foram gravadas como entrada.
- **Estoque no modo demonstração:** o cliente de demonstração emula o gatilho de movimentações (entrada e devolução somam, saída subtrai, vistoria e transferência não mexem; saldo negativo é recusado) e o gatilho de compras de EPI e uniforme (cada compra vira uma entrada; `valor_total` calculado). Editar ou excluir compra não mexe no estoque do demo; no banco real, compras são imutáveis. Ao ligar o banco real, o gatilho assume essa conta e o código da tela não precisa mudar.
- **Limite de 1000 linhas por consulta:** o Supabase hospedado devolve no máximo 1000 linhas por consulta (`max_rows` padrão da API). Isso afeta a Ficha de EPI Avulsa (`lerHistoricoEpiEmpregado`, PR #32) e o saldo do Termo de Encerramento de ferramentas (`lerSaldosSobResponsabilidade`, commit 5805b5f) para empregados com mais de 1000 movimentações na mesma empresa: as mais antigas ficariam de fora. A correção é paginar com `.range()` até acabar o histórico, tanto ao carregar quanto ao gravar. Só é testável com o banco real: na Fase 2, reproduzir semeando mais de 1000 movimentações do mesmo empregado na mesma empresa (roteiro do PR #32).
- **Caixas de ferramentas (decisão 18):** hoje o gatilho `set_codigo_caixa_trigger` gera o código pela sequência `codigo_caixa_seq`, sem limite, e ignora o número escolhido na tela. Ele precisa aceitar o número escolhido (1 a 100), gravar `codigo_num` e `codigo` (`CX-0001` a `CX-0100`) e recusar número repetido ou fora da faixa. As caixas habilitadas, hoje em Cadastros > Gerais no navegador, vão para uma tabela, e o banco deve recusar caixa com número não habilitado. Caixas reais com código acima de `CX-0100` ou sem número precisam de decisão na migração: na tela, elas ficam fora das listas de escolha e, ao editar, pedem um número novo.
- **Caixa na movimentação de ferramenta (decisão 103):** hoje a movimentação guarda `caixa_id` só no modo demonstração. Na Fase 2, criar a coluna `caixa_id` (referência a `caixas_ferramentas`) em `movimentacoes`, preencher na entrega, na vistoria e na devolução (a devolução volta para a caixa da última entrega da ferramenta ao empregado), e decidir o que fazer com movimentações antigas sem caixa (compras e baixas seguem sem caixa). Remover a condição `MODO_DEMO` dos três termos de ferramentas.
- **Portadores de caixas:** migrar o histórico local de vínculos caixa–empregado–empresa para tabela própria, preservando início, fim, status e observação. Garantir no banco, por transação e restrição, no máximo um portador ativo por caixa e o encerramento do vínculo anterior antes de uma troca. Consultar o histórico completo por caixa, inclusive acima do limite de 1000 linhas por resposta; não restaurar o antigo campo Responsável estático como fonte da tela ou dos CSVs. Validar a regra de empregado demitido também no banco.
- **Marcas de ferramentas:** migrar a lista de Cadastros > Gerais para tabela e vincular as ferramentas sem perder as marcas antigas gravadas como texto. Proteger renomeação e exclusão de marca em uso também no banco; definir a correspondência dos textos legados antes de impor a chave estrangeira.
- **Subcategoria por referência (decisão 22, regra 3):** criar a coluna `subcategoria_id` em `epis`, `uniformes`, `ferramentas` e `veiculos`, ligada à tabela de subcategorias. Antes da chave estrangeira, ligar os cadastros existentes pelo nome gravado em `categoria` (ou `tipo`, no veículo), como o modo demonstração já faz em `vincularSubcategorias` (`src/lib/subcategoria-referencia.ts`); o que não casar fica com o nome antigo. Hoje a tela só grava `subcategoria_id` no modo demonstração.
- **Tamanho e unidade por referência, com estoque por tamanho (decisão 23):** junto com `subcategoria_id`, criar `unidade_id` em `epis` e `uniformes` e `tamanho_id` (opcional, porque `movimentacoes` também serve ferramenta e veículo) em `movimentacoes`, `compras_epis` e `compras_uniformes`, ligados às tabelas de tamanhos e unidades de Gerais. Isso depende de criar antes as tabelas de tamanhos, unidades e associações (item "Cadastros que hoje ficam só no navegador"). Criar a tabela de estoque por tamanho (módulo, produto, tamanho, estoque atual e estoque mínimo, chave única módulo + produto + tamanho, com um saldo "sem tamanho" para o estoque antigo). O gatilho de compras só repassa `tamanho_id` para a movimentação de Entrada que já cria; só o gatilho de movimentações altera o saldo do tamanho, recusando tamanho ausente ou não autorizado para a subcategoria do produto e saldo negativo. Antes das chaves estrangeiras, ligar `unidade_medida` à unidade de mesmo nome e lançar o saldo do produto antigo no tamanho de mesmo nome do texto `tamanho` (ou no saldo "sem tamanho", se não casar), como a decisão 23 define. O PR D faz essa conta no modo demonstração, no navegador.
- **Parâmetro desativado em Gerais (decisão 22, PR C):** no modo demonstração os ids desativados ficam na lista `inativos` dos parâmetros. No banco real, criar a coluna `ativo` (padrão verdadeiro) nas tabelas de subcategorias, marcas e opções de ferramenta; as listas de seleção filtram os ativos e mantêm o valor já gravado no cadastro. A conferência de uso antes de excluir deve passar a ser feita no banco (chave estrangeira com restrição de exclusão): hoje a tela lê os cadastros numa consulta só, que no banco real pode parar no limite de linhas por resposta.
- **Importação do XML da NF-e (decisão 21):** criar a tabela `notas_fiscais_importadas` (chave de acesso única, número, série, data de emissão, empresa e fornecedor) e a função `importar_nota_fiscal`, que recebe as compras de EPI e de uniforme e as entradas de ferramenta e grava tudo numa transação, recusando chave repetida. O modo demonstração emula essa função (`src/integrations/supabase/demo-client.ts`). Fora do modo demonstração, o botão "Importar NF-e (XML)" fica oculto até a função existir. O código de fábrica também precisa ir para tabela (já listado abaixo).
- **Cadastros que hoje ficam só no navegador** e vão precisar de tabela: Cadastros > Gerais (categorias, subcategorias, tamanhos, unidades, associações, regras de código do produto, códigos de fábrica), fornecedores e Ficha de EPI (uma por EPI, com os 7 campos da NR6).

### Autenticação e permissões
- **Permissões de acesso por tela** são definidas nesta fase, junto com a auth e o banco.
- **Perfis decididos:** Administrador, RH e Padrão. O perfil Gestor deixa de existir, e os usuários Gestor atuais passam para Administrador ou Padrão.
- **Regras já decididas:** o empregado só lê; devolução e exclusões de cadastro só pelo Administrador.

### Configuração
- Definir `VITE_DEMO_MODE=false`.
- Vincular a empresa de cada usuário.
- Cadastrar as URLs de redirecionamento da auth no Supabase.
- `ocorrencias.caixa_id` e `movimentacoes.caixa_id` (decisão 104): hoje só no modo demonstração; no banco real entram colunas opcionais ligadas a `caixas_ferramentas`. A coluna `caixas_ferramentas.nome` passa a repetir o código; pode virar opcional.
- `caixa_ferramenta_itens`: restrição única por `ferramenta_id` (uma ferramenta em uma caixa só, decisão 106); migrar antes os dados repetidos, se houver.

- Tamanhos por grupo de ferramenta (decisão 117): precisará de tabela grupo -> tamanhos no banco real. Sem tabela criada agora.
- Check list de veículo (decisão 116): a associação precisará de `obrigatorio` por grupo, periodicidade nula e responsável nulo. Sem tabela criada agora.
- Check list de veículo (decisão 119): cada grupo associado precisará de `tipo` (periódico ou avulso); avulso grava periodicidade nula.

- Check list (dec 121): o código do check list (CHK-NNNN) deve vir de sequência do banco com restrição única; hoje a sequência é local (`gemape-demo-checklists-veiculo-sequencia`).
- Ferramentas, campo Tamanho (decisão 133): hoje só no modo demonstração (a ferramenta guarda `tamanho` como texto). No banco real, criar a coluna `tamanho` (texto, opcional) em `ferramentas` ou ligá-la à futura tabela grupo -> tamanhos (decisão 117). Sem tabela nem coluna criada agora.
- Ferramentas, subgrupos por grupo (decisão 159): hoje só no modo demonstração (`tamanhosGrupoFerramenta`, lista por grupo). No banco real, criar tabela (ou coluna JSON) de subgrupos ligada ao grupo de ferramenta, com unicidade por grupo.
- Manutenção de veículo, locais (decisão 161): hoje só no modo demonstração (`locais` e `naoRealizados` dentro do registro). No banco real, criar tabelas de locais da manutenção (tipo, nome, descrição, condição de pagamento, custo de peças e de mão de obra) e de itens não realizados com observação, ligadas à manutenção.

## Revisão do projeto inteiro (13/10/2026): achados que ficam para a Fase 2

Nada abaixo foi alterado: dependem de papéis, RLS ou migrations no Supabase real (só com ordem do responsável).

- Devolução e Termo de Encerramento hoje aparecem para quem pode operar; a regra é só Administrador. No banco, a política `empresa_registro` de `movimentacoes` e o gatilho `aplicar_movimentacao_estoque_v2` só conferem "pode operar".
- Excluir compra de EPI e Descartar check list em andamento sem exigir Administrador.
- Transferência de ferramenta entre caixas: no demo agora desfaz o destino se a saída da origem falhar; no banco real o ideal é uma única RPC atômica (como `salvar_caixa`) que também grave a movimentação.
- Excluir ação de manutenção ou grupo de check list usado em plano/associação não é bloqueado, e a restauração do padrão cria outro id (o plano ou a associação perde o item). Precisa de decisão do responsável (bloquear ou manter o id).
- Check list avulso concluído com item NOK cria ocorrência sem condutor.
- Responsável do veículo pode ser de outra empresa (lista mostra todos).

## Clientes (decisão 164)

- Tabela `clientes` com `empresa_id`: id, codigo (sequencial, único), nome, cpf (11 dígitos) e cnpj (14 dígitos), campos separados e opcionais, cada um único quando preenchido (decisão 165), endereco, contato, telefone, telefone2, email, observacao. Exclusão só pelo Administrador. Hoje o cadastro fica no navegador (`gemape-demo-clientes`).
- Módulo Viagens (despesas por categoria, fotos de comprovantes, fechamento periódico e relatório de viagem): só depois de o sistema inteiro ser aprovado; vai usar Clientes, Empregados e Veículos.

## Questionário de Despesas (decisões 167 e 168)

- Hoje tudo fica em `gemape-demo-questionario-despesas` (localStorage): banco de perguntas e um questionário por tipo de despesa. Na Fase 2: tabelas separadas para perguntas (JSON do esquema, com `empresa_id`), questionários (tipo de despesa e ordem das perguntas) e respostas (JSONB), com RLS por empresa e leitura para o Padrão.
- O questionário é guardado pelo texto do tipo de despesa: renomear uma opção da pergunta 3 apaga o questionário do nome antigo e cria um padrão para o novo. No banco, usar um id estável por tipo.
- Habilitados (pergunta 4): hoje os sete nomes iniciais não têm vínculo com o cadastro de empregados; na Fase 2, vincular pelo `empregado_id`. Quem fica inativo sai da lista sozinho.
- Municípios: lista do IBGE (5.570 itens) gravada em `src/lib/dados/municipios-ibge.ts`, copiada em 14/10/2026 de https://github.com/kelvins/municipios-brasileiros; conferir contra o IBGE antes da Fase 2.
- Upload (pergunta 12): até 3 imagens, ao menos 1 obrigatória. Imagens reduzidas no navegador (WebP, 1280 px, qualidade 0,7) antes de ir ao armazenamento; guardar o caminho do arquivo, não a imagem, na tabela de respostas.
- Falta (modo demonstração): validação por regex e menu flutuante de ações globais (imagem, vídeo, seção, importar de outro formulário).
- Etapa 2 (decisão 169): regras se/então guardadas por tipo de despesa e pergunta (`regras`); respostas em `gemape-demo-respostas-despesas` (tipo, data, hora, itens com título e resposta). Na Fase 2: tabela de respostas com `empresa_id`, usuário, tipo, data e hora do servidor e o JSON dos itens; imagens no armazenamento do sistema (caminho na tabela), já reduzidas no navegador (WebP, 1280 px, 0,7). A resposta do upload hoje guarda só o nome do arquivo.
