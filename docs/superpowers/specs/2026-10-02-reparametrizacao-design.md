# Reparametrização geral — desenho aprovado para implementação em cinco PRs

Data: 02/10/2026. Base: `main` em `337dbcb`. Responsável pelos commits e PRs: `ti@gemape.com.br`.

## Objetivo e limites

Reorganizar Parâmetros e os cadastros de EPI para facilitar a configuração e a localização dos produtos, preservando o restante do visual. Cada entrega usa uma branch criada da `main` após o merge da anterior, passa por testes, typecheck, build, `git diff --check`, revisão de código e preview. O responsável valida e mergeia cada PR antes do próximo. Nenhuma entrega escreve migration, acessa o Supabase real, inicia a pendência 4 ou a Fase 2.

O menu lateral usa `#0A007C`; a paleta e o vidro das demais áreas continuam como estão. Nos textos digitados em cadastros, a primeira letra fica maiúscula e as demais minúsculas, preservando siglas e códigos (por exemplo, GEMAPE, EPI, CA e SKU). Títulos e textos da interface não sofrem essa transformação. CNPJ é exibido como `XX.XXX.XXX/XXXX-XX`, celular como `(XX)X.XXXX.XXXX`, fixo como `(XX)XXXX.XXXX` e CEP como `XX.XXX-XXX`. Entradas novas são validadas pelo número de dígitos; registros antigos legíveis são formatados na apresentação sem perder seu valor original quando forem incompletos. Comparações por CNPJ continuam usando apenas dígitos.

## PR 1 — Formatação e menu Parâmetros

- Aplicar `#0A007C` só ao fundo da barra lateral. Estados de foco, seleção e contraste continuam legíveis; o restante do tema permanece igual.
- Renomear o grupo lateral “Cadastros” para “Parâmetros”, mantendo as rotas existentes e os controles de acesso.
- Criar funções compartilhadas de formatação e validação de CNPJ, telefone, CEP e capitalização de texto de cadastro. Usá-las nos campos e apresentações correspondentes, inclusive Empresas e Fornecedores. Preservar siglas, códigos e valores antigos incompletos; não alterar texto da interface.
- Testar as funções com entradas limpas, pontuadas, incompletas, telefone fixo e celular; verificar as telas atingidas no navegador antes do PR.

## PR 2 — Tabelas de Apoio

- Renomear “Cadastrar Categorias e Subcategorias” para “Tabelas de Apoio”. Na entrada, mostrar somente Categorias. Abrir subcategorias e listas relacionadas quando uma categoria for escolhida, com retorno claro à lista de categorias. Melhorar a hierarquia visual sem mudar o restante do tema.
- Guardar em cada categoria o parâmetro de endereçamento `Não usa` (padrão), `Opcional` ou `Obrigatório`. A configuração reutiliza exatamente Rua, Número e Apartamento da rotina existente; não cria campos ou formatos por categoria.
- `Não usa` esconde os produtos da categoria da rotina Endereçamento de Estoque. `Opcional` os exibe com ou sem endereço. `Obrigatório` os exibe e, ao salvar ou editar produto sem endereço, mostra aviso no modo demonstração sem bloquear. O filtro “sem endereçamento” inclui produtos opcionais e obrigatórios sem endereço.
- Registrar a decisão e seus esclarecimentos em `docs/decisoes-especiais.md`. Persistência real ou configuração adicional de campos fica fora desta fase.

## PR 3 — Código de Fábrica e Endereçamento de Estoque

- O campo CA de Código de Fábrica aceita somente dígitos, inclusive na validação ao salvar.
- A rotina Endereçamento abre com todos os produtos cadastrados das categorias que usam endereçamento, com e sem endereço. Mantém a busca por palavra chave sobre ambos. Remove “Novo endereço” e acrescenta “Filtrar itens sem endereçamento”.
- Cada linha permite incluir ou editar o endereço com os campos atuais e excluir somente o endereço, mantendo o produto. “Clonar”, na linha do item de destino, pede o código do item de origem (mesma categoria e empresa, com endereço) e copia seus três campos para o destino após validação (ordem do responsável de 02/10, que prevalece sobre a redação anterior). Não cria produto nem movimenta estoque. Verificar categoria, empresa de contexto e duplicidade antes de salvar; falhas não deixam cópia parcial.

## PR 4 — Hierarquia dos menus

- Criar “Tamanho e Medidas de Produto” com os submenus “Cadastro de Tamanhos e Medidas” e “Associar Tamanho e Medida ao Produto” (feito no PR 4; as telas mantêm as URLs). Manter “Código do Produto” acessível em Gerais.
- No menu Parâmetros, mover “Caixas” de Gerais para dentro de “Ferramentas”, como submenu da rotina de ferramentas. Distinguir esse parâmetro da tela operacional “Caixas de Ferramentas” do módulo, preservando o acesso a ambas.
- O menu “EPI” (módulo, com “Cadastrar EPI” e “Cadastrar Ficha de EPI”) é feito no PR 5, por ordem do responsável de 02/10.

## PR 5 — Cadastro de EPI por tamanho (dividido em 5A e 5B por escolha do responsável em 02/10)

- **5A (menu EPI e catálogo por tamanho, só demo):** menu EPI como módulo com “Cadastrar EPI” e, dentro dele, “Cadastrar Ficha de EPI”; catálogo global `epis_catalogo` (um registro por descrição e tamanho, sem empresa, com estoque mínimo); os registros de `epis` por empresa continuam sendo a posição de estoque de cada empresa e são criados a partir do catálogo, de modo que estoque, compras, NF-e, termos e dashboard seguem separados por empresa. EPIs antigos aparecem na lista como “antigos” e não são alterados.
- **5B (migração):** separa os EPIs antigos com vários tamanhos em um cadastro por tamanho, preservando histórico, saldos, endereços, fichas e associações. Só depois do merge do 5A.
- Mínimo: um só no catálogo, copiado para o estoque de cada empresa (escolha recomendada, ainda não contestada pelo responsável).

- Substituir, no modo demonstração, o produto com vários tamanhos por um cadastro independente para cada tamanho, com novo código automático `EPI-0001`, `EPI-0002` etc. O catálogo de EPI deixa de pertencer a uma empresa; compras, estoque e movimentações continuam separados por empresa. Adaptar as referências atuais a `empresa_id` nas compras, movimentações e associações de NF-e: elas usam o produto do catálogo global, mas preservam a empresa da operação e da nota.
- “Novo EPI” cria uma descrição ainda não cadastrada em outro tamanho, pergunta o estoque mínimo e não pede empresa. A lista inicial traz todos os EPIs, agrupa os de mesma descrição e permite busca por palavra chave.
- “Clonar” abre o formulário com descrição e unidade copiadas, gera outro código e oferece só tamanhos ainda não cadastrados para aquele produto. Exige tamanho diferente, pergunta o mínimo e valida novamente na gravação para impedir duplicação por dois cliques. A operação não herda saldo nem movimentações.
- A rotina Cadastrar EPI deixa de ser cadastro e passa a pertencer ao menu EPI (módulo). Por isso o estoque mínimo é perguntado nela. A decisão 24 segue intacta: nenhuma tela do menu Parâmetros exibe ou configura estoque. Registrar essa localização na decisão de reparametrização.
- Preservar dados e histórico existentes, inclusive EPIs antigos com vários tamanhos; planejar uma adaptação local explícita antes de mudar a leitura dos módulos. Nenhuma migration é escrita ou aplicada nesta fase. Se a implementação exigir tabela ou autenticação no Supabase, parar e avisar o responsável antes.

## Verificação e entrega de cada PR

Escrever testes que reproduzam a regra antes do código. Para bug existente, reproduzir também no navegador antes de corrigir. Executar `npm test`, `npm run typecheck`, `npm run build` e `git diff --check`; conferir as mudanças visuais no navegador e revisar o código antes do PR. Informar o resultado e o link do preview da Vercel quando estiver Ready. Nunca mergear o próprio PR.

As regras de gravação atômica, proteção contra clique repetido, escape de documentos, datas locais de Brasília, histórico completo e estoque reativo do modo demonstração continuam válidas.
