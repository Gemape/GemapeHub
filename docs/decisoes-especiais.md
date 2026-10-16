# DECISÕES ESPECIAIS DO PROJETO GEMAPEHUB
# Este arquivo registra decisões aprovadas que COMPLEMENTAM ou
# CORRIGEM o MD (docs/especificacao-gemapehub.md). Em caso de
# conflito entre o MD e este arquivo, ESTE ARQUIVO PREVALECE.
# Ler sempre junto com o MD antes de qualquer trabalho.

## 1. CAMPOS DO CADASTRO DE UNIFORME
Incluir no formulário: preço de custo, marca e modelo.
Motivo: o dashboard exibe "Valor total em estoque" (sem preço, o
indicador fica errado) e o termo de uniforme precisa identificar
o item entregue.
NÃO incluir CA — é exigência da NR6 para EPIs, pertence ao módulo
EPI e à Ficha de EPI.
Estes campos devem constar na especificação do MD como aprovados.

## 2. ASSOCIAR TAMANHO E MEDIDA — CORREÇÃO DO MD
Na desautorização, o item volta para a lista da ESQUERDA
(Existentes). O MD tem erro de digitação dizendo "transferência
para o menu da direita" — ignorar esse trecho.

## 3. PORTADOR — REFERÊNCIA DESATUALIZADA
O MD cita "Parâmetros Base >> Habilitar Caixa de Ferramentas".
O menu Parâmetros Base não existe mais: virou Cadastros > Gerais.
A habilitação de caixas segue onde já está implementada.

## 4. PERMISSÕES DE ACESSO
Não constam no MD rev1, mas a decisão vale: 3 perfis apenas —
Administrador, RH e Padrão. Implementação no FINAL do projeto,
junto com auth e banco. Não perguntar acesso por tela até lá.
Regra permanente: empregado só lê; devolução e exclusões de
cadastro somente pelo Administrador.

## 5. FILOSOFIA DE CONSTRUÇÃO (FASES)
FASE 1 (atual): lógica e funcionamento do sistema, modo
demonstração, dados fictícios locais. NADA no Supabase real:
sem tabelas novas, sem migrations aplicadas, sem auth.
FASE 2 (só com ordem explícita do usuário): criar DB real e
auths no Supabase — tabelas, vínculos, políticas e perfis.
REGRA PRÁTICA: se uma tarefa exigir criar tabela no Supabase ou
auth, PARAR e avisar o usuário.

## 6. PENDÊNCIAS REGISTRADAS PARA A FASE 2
(ver também docs/pendencias-fase2.md)
- Migration: adicionar à tabela public.empresas as colunas rua,
  numero, bairro, cep, cidade, estado e status (o formulário já
  as envia).
- Permissões por tela (item 4 acima).
- 3 migrations já escritas, ainda não aplicadas.
- Revisão do estoque de ferramentas.
- Cadastros que hoje ficam só no navegador (dados de demonstração
  não persistem).

## 7. REGRAS DE PROCESSO (VALEM EM TODA SESSÃO)
- Campo extra além do MD: só com aprovação prévia do usuário,
  proposta no PR antes de implementar.
- Ambiente de teste com dados fictícios; nada no Supabase real.
- Branch separada, PR, testes, typecheck, build, screenshots e
  preview na Vercel a cada entrega.
- Validação visual do usuário antes de cada merge.
- Ordem de merge: especificação/documentação antes do código que
  a implementa.
- Se houver contradição entre o MD e este arquivo ou o histórico
  do projeto, PARAR e perguntar antes de implementar.

## 8. FERRAMENTAS — NÚMERO DE SÉRIE, PATRIMÔNIO E DATA DE AQUISIÇÃO
Decidido em 30/09/2026: VOLTAM ao cadastro de ferramentas.
Série é essencial para garantia e baixa; patrimônio liga ao ativo;
data de aquisição sustenta depreciação. MD atualizado.

## 9. EMPRESA NOS CADASTROS DE EPI, UNIFORME E VEÍCULO
Decidido em 30/09/2026: MANTER o campo Empresa. O dashboard
consolida por empresa, e o dado precisa de origem. MD atualizado.

## 10. VEÍCULO — CAMPOS ALÉM DO MD
Decidido em 30/09/2026: MANTER RENAVAM, quilometragem, situação,
empregado responsável e observações, junto com os campos do MD.
O módulo Veículos estava conforme e nada é removido. MD atualizado.

## 11. EMPRESAS — NOME FANTASIA
Decidido em 30/09/2026: MANTER o nome fantasia. MD atualizado.

## 12. EMPREGADOS
Decidido em 30/09/2026: SEGUIR O MD. E-mail no cadastro, sem cargo,
sem botão "ativo"; a inativação é automática pela data de demissão.

## 13. FORNECEDORES — CATEGORIAS (substituída pela decisão 55: fornecedor não tem mais categoria)
Decidido em 30/09/2026: VÁRIAS categorias por fornecedor, vindas de
Cadastros > Gerais > Categorias (não de lista fixa). MD atualizado.

## 14. REGISTRO DE MUDANÇAS NO MD
Toda mudança no MD deve ser registrada aqui como decisão aprovada,
para a auditoria futura conferir o código contra a spec atualizada.

## 15. EMPREGADO DEMITIDO
Decidido em 30/09/2026 (complementa o item 12):
- Demissão futura: o empregado permanece ATIVO até a data de demissão
  chegar. A data não inativa o empregado na hora de salvar.
- A partir da data de demissão (demissão vencida): entregas novas,
  baixas e devoluções avulsas ficam BLOQUEADAS. A mensagem orienta usar
  o Termo de Encerramento.
- Termo de Encerramento de ferramentas (devolução na saída): PERMITIDO
  mesmo após a demissão, porque é o movimento que fecha o ciclo do
  empregado.
- Cargo: a linha de cargo/função saiu dos termos, porque o cadastro de
  empregados não tem mais cargo.

## 16. FERRAMENTAS — CADASTRO, CUSTO, LISTAS E DEVOLUÇÃO NA FASE 1
Plano aprovado pelo responsável em 30/09/2026, complementando a decisão 8:
- O cadastro de ferramentas gera o código interno pela regra de
  Cadastros > Gerais > Código do Produto, com sequência FER-0001,
  FER-0002 etc. compartilhada entre empresas. A edição preserva o código.
- A subcategoria vem de Cadastros > Gerais. Descrição e estoque mínimo
  integram o cadastro. Categoria e grupo de ferramenta também vêm de
  Gerais e são campos distintos da subcategoria (decisão 17).
- Número de série é obrigatório e informado pelo usuário, sem valor
  fictício automático. Patrimônio e data de aquisição retornam como
  campos opcionais, conforme a decisão 8.
- Preço de custo em reais, não negativo e com duas casas decimais,
  alimenta o valor em estoque do dashboard.
- Compra significa entrada no histórico de movimentações; entrega e
  baixa são saídas no mesmo histórico. Mostrar o código do item nas
  linhas e na exportação, sem criar telas novas para essas listas.
- O Termo de Encerramento devolve ao estoque local apenas a quantidade
  ainda sob responsabilidade do empregado, uma única vez. Continua
  permitido após a demissão, conforme a decisão 15.
- A implementação desta etapa fica no modo demonstração, sem Supabase
  real. A revisão do estoque histórico de ferramentas segue pendente
  para a Fase 2. Entregar a documentação antes do código.

## 17. FERRAMENTAS — CATEGORIA E GRUPO DO MODELO
Decidido em 30/09/2026 para resolver a divergência entre o PDF do MD e
a especificação atualizada; complementa a decisão 16:
- O modelo guarda categoria de ferramenta e grupo de ferramenta,
  ambos selecionados de listas mantidas em Cadastros > Gerais. As
  categorias iniciais são Manual, Elétrica, Pneumático, Hidráulica,
  Medição e Corte; usar os nomes de Gerais, inclusive "Pneumático".
  Os grupos iniciais são os listados no MD. Não usar listas fixas no módulo.
- A subcategoria de produto também vem de Gerais, dentro da categoria
  de produto "Ferramentas". Ela identifica a regra de Código do Produto
  dessa categoria: sigla FER e numeração inicial configurada em Gerais.
  Categoria e grupo de ferramenta não criam sequências próprias.
- A proteção do estoque na edição terá teste explícito de editar,
  salvar e reabrir uma ferramenta com estoque positivo antes da
  ligação das regras ao formulário.
- Permissões por tela e revisão do estoque histórico seguem na Fase 2,
  conforme `docs/pendencias-fase2.md`.
- Caixas de 01 a 100 com flag de habilitação, fluxo completo de
  Portador e cadastro de marcas ficam fora do plano de Ferramentas.
  São proposta separada de Caixas e Portador, sujeita a aprovação.

## 18. CAIXAS E PORTADOR — ETAPAS E RESPOSTAS
Decidido pelo responsável em 30/09/2026, ao aprovar a proposta
`docs/proposta-caixas-portador.md` e as etapas do handoff:
- Etapas, na ordem: (1) caixas 01 a 100 habilitadas em Cadastros >
  Gerais; (2) Portador com histórico; (3) marcas em Gerais;
  (4) validação de ponta a ponta. Um PR por etapa, parando para
  validação e merge do responsável.
- A habilitação das caixas fica em Cadastros > Gerais, conforme a
  proposta. Isso substitui a frase da decisão 3 de que a habilitação
  "segue onde já está implementada": não havia habilitação no código.
- Código das caixas de CX-0001 a CX-0100, sequência única para as três
  empresas.
- O portador ativo passa a ser o responsável exibido da caixa; o campo
  Responsável estático do cadastro de caixa deixa de ser usado.

## 19. FASE 2 SÓ COM O SISTEMA 100% FUNCIONAL
Decidido pelo responsável e registrado em 01/10/2026 (a numeração
pulava da 18 para a 20; a regra já valia e não estava escrita):
- A Fase 2 (autenticação e banco de dados reais no Supabase) só será
  implantada após confirmar todo o sistema funcional, com 100% dos
  módulos funcionando.
- Mesmo com o sistema completo, a Fase 2 só começa por ordem
  explícita do responsável.

## 20. PRODUÇÃO NA VPS APÓS A FASE 2
Decidido pelo responsável em 30/09/2026:
- O deploy na VPS da Mega Provedor só ocorre depois que autenticação e
  banco de dados reais do Supabase estiverem integrados e funcionando
  com o sistema. Produção real exige Supabase real, não modo demonstração.
- Ordem final: concluir todo o MD (etapas 2, 3 e 4 de Caixas e Portador
  e pendência 4), confirmar o sistema 100% funcional, executar a Fase 2
  com auth e banco reais e, só então, fazer o deploy na VPS.
- Esta decisão não autoriza iniciar a Fase 2 agora. Cada etapa atual
  continua em branch e PR próprios para validação do responsável.

## 21. IMPORTAÇÃO DO XML DA NOTA FISCAL
Escopo aprovado pelo responsável em 01/10/2026:
- A importação serve para qualquer módulo. Cada item é casado pelo par
  fornecedor + código do fornecedor em Cadastros > Gerais > Código de
  fábrica, e a entrada vai para o módulo do produto casado: EPI e
  Uniforme viram compra, como na tela de Compras; Ferramenta vira
  Entrada no histórico de movimentações, com a origem na observação.
- O fornecedor é achado pelo CNPJ do emitente e a empresa pelo CNPJ do
  destinatário. Item sem casamento, de quantidade fracionada ou de
  módulo sem código de fábrica (veículo) fica como pendência visível e
  nunca é gravado automaticamente.
- A data da compra e da entrada é a DATA DE EMISSÃO da nota, no fuso de
  Brasília, e não a data da importação.
- Gravação atômica entre módulos, com desfazer total em caso de falha;
  trava contra segundo clique, lista limpa após gravar e recusa da mesma
  chave de acesso.
- Leitor próprio do XML, sem biblioteca nova: DOCTYPE e ENTITY são
  recusados e todo texto do XML é tratado como dado.
- Nada no Supabase real: a tabela das notas importadas e a função que
  grava tudo numa transação ficam como pendência da Fase 2.

## 22. CADASTROS > GERAIS PARAMETRIZA TODOS OS CADASTROS
Decidido pelo responsável em 01/10/2026 (pedida como "decisão 21";
registrada como 22 porque a 21 já é a importação do XML):
Cadastros > Gerais é a parametrização de TODOS os cadastros. Ele
configura os parâmetros de todos os cadastros que alimentam os módulos,
e esses parâmetros conversam com os cadastros. Regras:
1. Fonte única: toda lista usada em cadastro de módulo (categoria,
   tamanho/unidade, marca, código de produto, código de fábrica,
   endereçamento, caixa) vem exclusivamente de Gerais.
2. Seleção, não digitação: onde existe parâmetro em Gerais, o cadastro
   do módulo usa lista suspensa preenchida por Gerais.
3. Propagação: criar, editar ou desativar um parâmetro em Gerais
   reflete imediatamente nos cadastros e módulos que o usam.
4. Parâmetros relacionados entre si (ex.: Associar Tamanho e Medida)
   se conectam dentro de Gerais antes de alimentar os módulos.
5. Proteção: parâmetro em uso por cadastro ou módulo não pode ser
   apagado silenciosamente; o sistema avisa o que depende dele.
A conformidade do código com estas regras está no handoff
(`docs/handoff-claude-code-ferramentas.md`). Nenhuma correção começa
sem o ok do responsável; cada uma terá branch e PR próprios.

## 23. TAMANHO E UNIDADE DE EPI E UNIFORME VÊM DE GERAIS, COM ESTOQUE POR TAMANHO
Decidido pelo responsável em 01/10/2026: "EPI e Uniforme passam a
consumir Tamanho e Unidade de Cadastros > Gerais conforme a associação
da categoria (Associar Tamanho e Medida), com estoque controlado
separado por tamanho; categoria sem associação configurada não exige
tamanho".
Como se aplica:
- A associação é a de Gerais > Associar Tamanho e Medida, feita por
  categoria e subcategoria (MD, "Associar tamanho e medida ao
  produto"). O produto usa os tamanhos e as unidades autorizados para a
  subcategoria dele.
- Tamanho e unidade são escolhidos em lista suspensa (decisão 22, regra
  2), nunca digitados.
- Cada combinação produto + tamanho tem estoque e estoque mínimo
  próprios. Entrada (compra), saída (entrega ou baixa) e devolução
  informam o tamanho; tamanho ausente ou não autorizado é recusado, e
  movimentar um tamanho nunca altera o saldo de outro.
- Unidade: escolhida no cadastro do produto. Tamanho: escolhido em cada
  compra, entrega, baixa e devolução, e na grade de estoque mínimo por
  tamanho do produto (um produto com vários tamanhos não tem um tamanho
  único no cadastro).
- Subcategoria sem tamanho autorizado não exige tamanho: o produto
  continua com um estoque único, como hoje. Subcategoria sem unidade
  autorizada não exige unidade.
- Estoque mínimo: produto com tamanhos tem mínimo e alerta por tamanho;
  produto sem tamanhos mantém o mínimo único do MD.
- Saldo existente: produto antigo com tamanho digitado que casa com um
  tamanho de Gerais leva o saldo inteiro para esse tamanho; produto sem
  tamanho fica com um saldo "sem tamanho", que só pode sair (entrega ou
  baixa) até zerar. Autorizar tamanhos depois numa subcategoria com
  produtos com saldo avisa e não converte o saldo sozinho. Uniformes
  antigos cadastrados um por tamanho continuam separados.
- Importação do XML (decisão 21): a nota fiscal não traz tamanho. Item
  casado com produto cuja subcategoria tem tamanho autorizado fica como
  pendência visível e não é gravado; produto sem tamanho segue como hoje.
- Registros antigos sem tamanho são preservados ao editar outros
  campos, como já ocorre com marca (PR #46) e subcategoria (PR #47).
- Tamanhos e unidades ganham desativar/reativar e proteção de item em
  uso, como os demais parâmetros (PR #48). Em Associar Tamanho e
  Medida, desautorizar (decisão 2) um tamanho ou unidade com saldo ou
  histórico avisa o que depende.
- Esta decisão é a aprovação dos campos Tamanho e Unidade nos
  cadastros de EPI e Uniforme, que o MD ainda não lista.
Regras complementares aprovadas pelo responsável em 01/10/2026, após o
code review do PR #50.

## 24. ESTOQUE É RESPONSABILIDADE DOS MÓDULOS, NÃO DOS CADASTROS

Decisão 24 — Estoque é responsabilidade dos módulos, não dos cadastros. Os menus de Cadastros (Gerais, Empresas, Empregados, Fornecedores, Código de Fábrica, Tamanhos, Unidades, Associar Tamanho e Medida) NÃO contam, exibem nem movimentam estoque. Toda a lógica de contagem de estoque — saldo, mínimo, alerta, entrada, saída, devolução — fica exclusivamente nos menus de módulos (EPI, Uniformes, Ferramentas, Veículos, Ocorrências). Os cadastros apenas fornecem os dados que os módulos consomem (decisão 22).

Esclarecimento do responsável em 01/10/2026: cadastros podem consultar estoque e movimentações internamente para proteções e avisos, como identificar um item em uso ou avisar antes de desautorizar um tamanho. Essa consulta não constitui contagem de estoque. Gerais > Associar Tamanho e Medida e Gerais > Tamanhos e Unidades estão conformes.

Nova diretriz do responsável em 01/10/2026, que substitui a localização dos controles da decisão 23: a configuração do estoque mínimo por tamanho também é responsabilidade do módulo; o cadastro contém apenas os dados do produto (descrição, código sigla + numeração, categoria, tamanhos autorizados). Nenhuma tela ou CSV de cadastro exibe ou configura saldo, mínimo ou alerta. O mínimo único e o estoque inicial de Ferramentas também ficam no módulo Ferramentas. O estoque inicial pode ser editado ali mesmo após movimentações, ajustando o saldo diretamente.

## 25. FERRAMENTA SEM SUBCATEGORIA E SEM ABA CADASTRO NO MÓDULO
Decidido pelo responsável em 01/10/2026:
1. O cadastro de ferramentas (Cadastros > Ferramentas) não tem mais o
   campo Subcategoria. A ferramenta é classificada pela categoria e
   pelo grupo de ferramenta de Gerais. O código continua gerado pela
   regra da categoria-base Ferramentas (FER-0001), que nunca dependeu da
   subcategoria. Ferramentas antigas mantêm a subcategoria gravada, sem
   mostrá-la, e ela é preservada ao editar outros campos.
2. O módulo Ferramentas não tem mais a aba Cadastro, que duplicava
   Cadastros > Ferramentas. O cadastro de modelos fica só em Cadastros.
Corrige o MD (Ferramentas, "Cadastrar modelo", item 1, e a frase sobre
as três seleções de Gerais), que foi ajustado junto.

## 26. MÓDULO UNIFORMES SEM ABA CADASTRO
Decidido pelo responsável em 01/10/2026: o módulo Uniformes não tem
mais a aba Cadastro, que duplicava Cadastros > Uniformes. O cadastro de
uniformes fica só em Cadastros, como o de ferramentas (decisão 25). O
módulo EPI mantém a aba Estoque. Complementa o MD (Uniforme, "Cadastrar
uniforme"), que foi ajustado junto.

## 27. LEITOR DE XML NO CÓDIGO DE FÁBRICA PARA CRIAR ASSOCIAÇÕES
Aprovado pelo responsável em 02/10/2026. Cadastros > Gerais > Código de
fábrica ganha o botão "Importar NF-e (XML)", com o mesmo leitor da
decisão 21:
- A tela lê o XML, acha o fornecedor pelo CNPJ do emitente e a empresa
  pelo CNPJ do destinatário e lista os itens da nota com o código do
  fornecedor e a descrição. Itens com o mesmo código aparecem numa linha
  só, porque uma associação vale para todos.
- Para cada item o usuário escolhe, no cadastro, o produto da empresa da
  nota (EPI-0001, UNI-0001, FER-0001) e grava a associação. Para EPI o CA
  da nota continua obrigatório, como no cadastro manual. A associação vale
  para as próximas notas do mesmo fornecedor.
- Item já associado aparece como vinculado; item novo fica pendente. Se o
  produto de uma associação foi apagado, o item pede nova escolha e a
  associação é trocada no lugar, sem duplicar.
- Decisão 24: esta tela NÃO movimenta estoque, não grava compra nem
  movimentação e não registra a nota como importada. Só cria associações.
- A entrada da nota com estoque continua nos módulos (Compras de EPI,
  Compras de Uniformes, Movimentações de Ferramentas), que casam os itens
  pelas associações criadas aqui. Item sem associação continua pendente,
  sem gravar, e o aviso indica "Associe o código em Cadastros > Gerais >
  Código de fábrica".
- Nada no Supabase: as associações ficam onde o código de fábrica já fica
  hoje (decisão 22; tabela real é pendência da Fase 2).
## 28. TAMANHOS E NUMERAÇÕES PADRÃO, EM SEQUÊNCIA, E TAMANHOS NA LISTA DO CADASTRO
Aprovado pelo responsável em 02/10/2026:
- Cadastros > Gerais > Tamanhos e unidades traz cadastradas todas as
  possibilidades de tamanho e numeração dos produtos controlados, sempre
  em sequência: Único; letras PP, P, M, G, GG, XG, XGG, G1, G2, G3, G4;
  numerações 6 a 12 (luvas), 33 a 48 (calçados) e os pares de 50 a 60
  (vestuário).
- Tamanho novo entra na posição da sequência (49 fica entre 48 e 50); o
  que o sistema não reconhece vai para o fim. As setas de mover continuam
  valendo.
- O botão "Cadastrar tamanhos padrão" completa uma lista já salva: inclui
  só o que falta, cada um na posição certa, sem repetir nome (maiúsculas
  não contam), sem alterar o que existe. Um padrão excluído antes volta com id novo, para não reviver referências antigas.
- Nos cadastros de EPI e Uniforme, a lista mostra os tamanhos e
  numerações escolhidos no produto, na ordem de Gerais, com o desativado
  marcado. Produto sem escolha mostra os tamanhos associados à
  subcategoria; sem associação, "—". É informação do cadastro, não
  estoque (decisão 24).
- Nada no Supabase: continua demo; a tabela real é pendência da Fase 2.

## 29. EMPRESAS: ENDEREÇO E STATUS NO FORMULÁRIO
Pedido do responsável em 02/10/2026: incluir no cadastro de Empresas as
opções Endereço e Status (ativa ou inativa), como no MD.
- Endereço em seis campos: rua/av., nº, bairro, CEP, cidade e estado.
  Status: Ativa ou Inativa; empresa nova nasce Ativa.
- A tabela de Empresas mostra o endereço em uma linha e o status.
- Por ora o status só informa: nenhuma lista, movimento, relatório ou
  termo muda por causa dele. O efeito de "inativa" (sumir das listas de
  escolha de cadastros e movimentos novos, mantendo o histórico) aguarda
  decisão do responsável.
- Só no modo demonstração: as colunas ainda não existem no banco real e
  fazem parte da Fase 2 (docs/pendencias-fase2.md). Fora da demonstração,
  a tela mostra e salva apenas os campos que o banco já tem.
- Nada no Supabase.

## 30. VISUAL: VIDRO (GLASSMORPHISM), ENGRENAGEM E RESPONSIVO
Pedido do responsável em 02/10/2026: sistema mais bonito, mesma cor,
efeito de vidro em todas as páginas, engrenagem girando ao lado do nome
GEMAPE e telas responsivas.
- A paleta azul não muda. O fundo vira um gradiente azul suave e os
  painéis, cartões, cabeçalho, janelas e menus ficam em vidro translúcido
  com desfoque (classes `glass`, `glass-strong` e `panel` em
  `src/styles.css`, na camada de componentes para os utilitários do
  Tailwind poderem sobrescrever).
- O ícone do logo (barra lateral e login) é uma engrenagem girando. Quem
  pede menos movimento no sistema operacional a vê parada.
- Responsivo: cartões e a área principal não estouram a largura (conferido
  em 390, 820 e 1400 px); abas rolam por dentro quando não cabem.
- Na impressão o vidro e o gradiente somem.
- Só visual: nenhuma regra, dado ou tela de lugar mudou. Nada no Supabase.

## 31. CÓDIGO DE FÁBRICA SEM BOTÃO DE IMPORTAÇÃO DE XML

Por pedido do responsável em 02/10/2026, a tela Código de fábrica deixa de mostrar o botão “Importar NF-e (XML)”. A associação manual continua disponível. Esta alteração retira apenas o acesso ao leitor nessa tela; não muda as rotinas de entrada de NF-e nos módulos, não movimenta estoque e não acessa o Supabase. Substitui o trecho da decisão 27 que previa o botão no cadastro.

## 32. TABELAS DE APOIO E ENDEREÇAMENTO POR CATEGORIA

Em 02/10/2026, o responsável definiu três estados por categoria: `Não usa` (padrão), `Opcional` e `Obrigatório`. O parâmetro apenas habilita ou exige o endereçamento com os campos já existentes Rua, Número e Apartamento; não cria formato nem campos por categoria. Produtos de `Não usa` não aparecem em Endereçamento de Estoque. Produtos `Opcionais` e `Obrigatórios` aparecem com ou sem endereço; o filtro de pendentes inclui ambos. Ao salvar ou editar um produto `Obrigatório` sem endereço, o modo demonstração avisa sem bloquear. A configuração é local nesta fase, sem migration ou alteração no Supabase. Cadastros não exibem nem configuram estoque; a decisão 24 permanece intacta.

## 32. MÁSCARA AO DIGITAR EM CNPJ, TELEFONE E CEP
Pedido do responsável em 02/10/2026: a máscara vale já na entrada, não só
ao salvar e ao exibir.
- CNPJ `XX.XXX.XXX/XXXX-XX` (14 dígitos), CEP `XX.XXX-XXX` (8 dígitos) e
  telefone `(XX)XXXX.XXXX` (fixo, 10 dígitos) ou `(XX)X.XXXX.XXXX`
  (celular, 11 dígitos; o 11º dígito troca a máscara).
- Aplicada em Empresas (CNPJ, CEP) e Fornecedores (CNPJ, CEP, telefone). O
  que passa de 14, 8 ou 11 dígitos é ignorado; letras não entram.
- Só muda o que aparece no campo: a validação e o salvamento seguem em
  `formatacao-cadastral.ts`, e dados antigos não são reescritos.
- A cor da barra lateral e a regra de capitalização aguardam decisão do
  responsável e não mudam aqui. Nada no Supabase.


## 33. CÓDIGO DE FÁBRICA: CA SÓ NÚMEROS; ENDEREÇAMENTO: CLONAR PELO ITEM DE ORIGEM

O campo CA do Código de Fábrica de EPI aceita somente dígitos (filtrado ao digitar e recusado ao salvar). Em Endereçamento de Estoque, "Clonar" fica na linha do item que receberá o endereço e pergunta o código do item de origem; copia rua, estante e apartamento da origem para o destino. A origem precisa ser da mesma categoria e empresa e ter endereço; recusa origem igual ao destino, categoria que não usa endereçamento e destino que já está no mesmo endereço. Não cria produto nem mexe em estoque. Prevalece a mensagem do responsável de 02/10 sobre a redação "código de destino" do desenho da reparametrização.

## 34. MENUS: TAMANHO E MEDIDAS DE PRODUTO E CAIXAS EM FERRAMENTAS

Em Parâmetros > Gerais, "Tamanhos e Unidades" e "Associar Tamanho e Medida" passam a ser submenus de "Tamanho e Medidas de Produto": "Cadastro de Tamanhos e Medidas" e "Associar Tamanho e Medida ao Produto". "Código do Produto" não muda. "Caixas" sai de Gerais e vira submenu de Parâmetros > Ferramentas (junto de "Cadastro de Ferramentas"); só o Administrador vê Caixas. A tela operacional "Caixas de Ferramentas" continua nos Módulos. As URLs não mudam. O menu EPI como módulo fica para o PR 5.

## 35. MENU EPI COMO MÓDULO E CATÁLOGO DE EPI POR TAMANHO (PR 5A) — o local do menu foi substituído pela decisão 37 (Parâmetros > EPI)

"Cadastrar EPI" deixa de ser cadastro de Parâmetros e passa a pertencer ao menu EPI (módulo), com "Cadastrar Ficha de EPI" como submenu dele. Por isso o estoque mínimo é perguntado nessa tela, o que muda a lista de campos do MD (Cadastrar EPI com Empresa e Estoque mínimo) e vale como decisão; a decisão 24 segue valendo para as telas de Parâmetros. O catálogo de EPI é global: um registro por descrição e tamanho, com código automático (sigla + numeração), sem empresa. Novo EPI cria uma descrição ainda não cadastrada; Clonar copia descrição, subcategoria e unidade, gera outro código e só aceita tamanho ainda não cadastrado para aquela descrição, validando de novo ao gravar. A lista agrupa pela descrição e tem busca por palavra-chave. Estoque, compras, movimentações e NF-e continuam por empresa (os registros de estoque por empresa nascem do catálogo). Só modo demonstração; no banco real continua o cadastro antigo até a Fase 2. EPIs antigos com vários tamanhos ficam como estão até o PR 5B.

## 36. CAIXAS DE FERRAMENTAS EM PARÂMETROS > FERRAMENTAS, COM A HABILITAÇÃO DAS CAIXAS NA MESMA TELA

Pedidos do responsável em 02/10: Caixas de Ferramentas sai de Módulos e vai para Ferramentas em Parâmetros, tornando um menu só com o parâmetro Caixas. Em Módulos, "Ferramentas" continua sendo um item simples (o controle). Em Parâmetros > Ferramentas ficam "Cadastro de Ferramentas" e "Caixas". A tela Caixas de Ferramentas reúne as abas Caixas e itens, Cadastro, Portadores e Habilitar caixas (numeração de 01 a 100, só Administrador); o parâmetro Caixas deixou de ser uma tela à parte. Isso substitui a decisão 34 no ponto das Caixas. As URLs continuam: `/cadastros/gerais/caixas` abre a aba Habilitar caixas. A tela de caixas já existia com seu conteúdo e não ganhou nenhuma configuração de estoque.

## 37. CADASTRAR EPI E FICHA DE EPI EM PARÂMETROS > EPI

Pedido do responsável em 02/10: por serem cadastros, "Cadastrar EPI" e "Cadastrar Ficha de EPI" ficam em um menu EPI dentro de Parâmetros, não em Módulos. Em Parâmetros > EPI, "Cadastrar EPI" tem "Cadastrar Ficha de EPI" como submenu. Em Módulos, "EPIs" volta a ser um item simples (o controle de estoque, compras, termos e relatórios). Isso substitui a decisão 35 só no ponto de onde o menu fica; o catálogo por tamanho, o mínimo perguntado no Novo EPI e o resto da 35 continuam. As URLs não mudam (`/epi-cadastrar`, `/epi-ficha`). Como o Cadastrar EPI agora é uma tela de Parâmetros, ele continua perguntando o estoque mínimo por pedido expresso do responsável na decisão 35, sem exibir saldo nem movimentação.


## 38. TAMANHO E MEDIDAS DE PRODUTO: UM MENU SÓ, COM ASSOCIAR COMO ABA

Pedido do responsável em 02/10: "Associar Tamanho e Medida ao Produto" deixa de ser um item de menu e passa para dentro de "Tamanho e Medidas de Produto", ficando um único menu de parametrização. Em Parâmetros > Gerais, "Tamanho e Medidas de Produto" abre `/cadastros/gerais/tamanhos-unidades` com duas abas: "Cadastro" (tamanhos e numerações, unidades e o botão de tamanhos padrão) e "Associar ao produto" (a associação por subcategoria). O conteúdo das duas abas não muda. `/cadastros/gerais/associar-tamanhos` continua abrindo a aba "Associar ao produto". Isso substitui a decisão 34 só na divisão em dois submenus. Nada no Supabase.


## 39. SEPARAR O EPI ANTIGO COM VÁRIOS TAMANHOS EM UM CADASTRO POR TAMANHO (PR 5B)

Ordem do responsável em 02/10, com a opção "Manter histórico" escolhida por ele. Em Cadastrar EPI (Parâmetros > EPI), o Administrador vê, nos EPIs antigos, o botão "Separar por tamanho". Uma prévia mostra, para cada descrição, os tamanhos e os códigos novos (sigla + numeração), os endereços que serão copiados e as associações de código de fábrica que seguem no código antigo. Ao confirmar, tudo é feito de uma vez: cria um EPI no catálogo por tamanho (reaproveita o que já existir para a descrição e o tamanho), leva o saldo e o mínimo de cada empresa para o tamanho certo e copia o endereço do código antigo para os novos, na mesma empresa. O registro antigo fica como histórico: saldo e mínimo por tamanho zerados (o mínimo vai para os novos, por empresa; quem não tinha mínimo no tamanho fica com zero), marcado como separado e inativo (se sobrar saldo em "Sem tamanho", continua ativo só com ele). Movimentações, fichas, termos e compras não são alterados e seguem ligados ao registro antigo. Só entram descrições com mais de um tamanho (agrupadas pela descrição, como no catálogo) e registros de uma empresa cadastrada; rodar de novo não repete o que já foi separado. As associações de NF-e (código de fábrica) não são movidas, porque um código do fornecedor não indica o tamanho: o responsável reassocia em Cadastros > Gerais > Código de fábrica. Só modo demonstração; nada no Supabase.


## 40. EMPRESA INATIVA SAI DAS LISTAS DE ESCOLHA E MANTÉM O HISTÓRICO

Ordem do responsável em 02/10 (pendente da decisão 29). Empresa com status Inativa deixa de aparecer nas listas em que se escolhe a empresa de um registro novo: cadastro de produtos (EPI, Uniforme, Ferramenta), empregados, veículos, caixas de ferramentas, endereçamento, compras, movimentações e os termos (entrega, baixa, vistoria, responsabilidade, encerramento, ficha avulsa). A empresa que já vem escolhida é a do cabeçalho, se estiver ativa; senão a primeira ativa. Ao editar um registro que já pertence a uma empresa inativa, ela continua aparecendo nele, para o registro não perder a empresa. Ficam como estão, mostrando todas: o seletor do cabeçalho, os relatórios, os filtros, o painel e os nomes mostrados nas tabelas, porque o histórico e as consultas não podem sumir. Empresa sem status conta como ativa. Se o cabeçalho estiver numa empresa inativa, as telas de termos e compras pedem para escolher a empresa. Não apaga nem altera nenhum registro; reativar a empresa a devolve às listas. Só modo demonstração (o status ainda não existe no banco real); nada no Supabase.


## 41. COMPRAS: FORNECEDOR VEM DO CADASTRO DE FORNECEDORES (a lista não filtra mais por categoria, decisão 55)

Ordem do responsável em 02/10. Em Registrar Compra de EPI e de Uniforme, o campo Fornecedor deixa de ser texto livre e passa a ser uma lista de Cadastros > Fornecedores, mostrando só os fornecedores da categoria do módulo (EPI ou Uniforme), com o código e o nome (fantasia, ou razão social se não houver). Sem fornecedor da categoria, a tela avisa para cadastrar em Cadastros > Fornecedores marcando a categoria, e a compra não é gravada. A compra guarda o nome do fornecedor, como antes, para a busca, os relatórios e o CSV não mudarem, e também o id dele; o fornecedor é conferido de novo na hora de gravar (excluído ou de outra categoria é recusado). As compras já registradas com o fornecedor em texto continuam como estão. A importação de NF-e já escolhe o fornecedor pelo CNPJ no cadastro e não muda. Compras continuam sem edição (só incluir e excluir), como antes; excluir a compra segue sem reverter o estoque. Só modo demonstração: o cadastro de fornecedores ainda não existe no banco real (Fase 2), onde o campo segue como texto. Nada no Supabase.


## 42. AVISO AO EXCLUIR FORNECEDOR OU PRODUTO COM CÓDIGO DE FÁBRICA ASSOCIADO

Ordem do responsável em 02/10. Ao excluir um fornecedor (Cadastros > Fornecedores) ou um produto (Cadastro de EPI/Uniforme/Ferramenta) que tenha código de fábrica associado em Cadastros > Gerais > Código de fábrica, a confirmação passa a dizer quantos códigos estão associados, lista até 5 deles e avisa que as associações também serão removidas e que as próximas notas ficarão sem associação. Sem associação, a confirmação é a de sempre. Confirmando, as associações saem junto, porque não valem sem um dos lados; o aviso é lido na hora, sem dados velhos. A exclusão do fornecedor é feita de uma vez: se as associações não puderem ser removidas, o fornecedor continua cadastrado. Para o produto, que é excluído antes, uma falha ao remover as associações é avisada na tela. Não muda quem pode excluir nem as regras de proteção existentes. Nada no Supabase.


## 43. SUBMENUS SEMPRE NO MENU LATERAL, SEM ABAS SUPERIORES

Ordem do responsável em 05/10, para o sistema todo. Nenhuma tela usa mais abas no alto da página: cada aba virou um submenu do menu lateral, abaixo do menu pai. EPIs, Uniformes, Ferramentas e Veículos (em Módulos) abrem e listam Dashboard, Estoque, Compras, Termos, Movimentações, Ocorrências etc., cada um conforme o módulo. Em Parâmetros, Caixas de Ferramentas lista Caixas e itens, Cadastro, Portadores e Habilitar caixas (esta só para o Administrador), e Tamanho e Medidas de Produto lista Cadastro e Associar ao produto, continuando um menu só (decisão 38). Os endereços das telas não mudam; o submenu abre a mesma tela com `?aba=` e, sem aba pedida (ou com aba que a tela não tem), abre a primeira. Os endereços antigos com `?aba=` seguem valendo. A lista de submenus fica em `src/lib/menu-parametros.ts` (`ABAS_*`). O conteúdo e as regras de cada aba não mudam. Só visual; nada no Supabase.


## 44. GERAIS É O PRIMEIRO MENU DE PARÂMETROS

Ordem do responsável em 05/10. No menu lateral, dentro de Parâmetros, Gerais (com Tabelas de Apoio, Tamanho e Medidas de Produto, Código do Produto, Código de Fábrica e Endereçamento) passa a ser o primeiro item, antes de EPI e Ferramentas. Continua só para o Administrador; os submenus e os endereços não mudam. Só a ordem na tela; nada no Supabase.


## 45. BOTÕES PADRÃO NAS LISTAS DE PARÂMETROS: CLONAR, EDITAR E EXCLUIR

Ordem do responsável em 05/10. Todas as listas de Parâmetros passam a ter os mesmos três botões, sempre nesta ordem e neste estilo: Clonar, Editar e Excluir (componente `AcoesLinha`). Excluir só aparece para o Administrador e mantém as proteções e avisos de cada lista. Clonar abre o formulário de novo já preenchido, com código novo gerado e os campos únicos (CNPJ, matrícula, CPF) em branco. A entrega é em dois PRs: primeiro o botão padrão e Cadastrar EPI, depois as demais listas.

Cadastrar EPI (catálogo, decisão 35): Editar muda a descrição, que vale para todos os tamanhos do mesmo EPI, e o estoque mínimo do tamanho, que é levado ao estoque de todas as empresas; código, tamanho, subcategoria e unidade não mudam; a descrição não pode repetir a de outro EPI. Excluir só é permitido sem saldo em nenhuma empresa e sem histórico (movimentações, compras, ocorrências); leva junto o estoque zerado e os endereços do EPI, avisa antes se houver código de fábrica associado e o remove junto. Editar e excluir são feitos de uma vez (tudo ou nada) e com trava de clique repetido. Só modo demonstração; nada no Supabase.

Segunda parte (demais listas): Uniformes, EPI antigo e Ferramentas copiam descrição, subcategoria, unidade, preço, marca e modelo, e o código é gerado ao salvar; número de série e patrimônio ficam em branco. Caixas copia nome, empresa, localização e as ferramentas vinculadas, com o número da caixa em branco (escolhido entre as habilitadas livres) e sem portador. Veículos copia os dados do cadastro e deixa em branco placa e RENAVAM, com quilometragem zerada e código novo. Empresas, Empregados e Fornecedores copiam os dados e deixam em branco CNPJ, CPF, matrícula e e-mail; o código do fornecedor é novo. Ficha de EPI copia os campos de texto e deixa o EPI para escolher. Em Gerais: as listas de nomes (categorias, subcategorias, marcas, tamanhos e unidades) copiam o nome para o campo de novo item, para o responsável ajustar e incluir; Código do Produto abre a regra nova com a numeração copiada e a sigla em branco; Código de Fábrica copia produto, fornecedor e CA, com o código da nota em branco. "Abrir" da Ficha de EPI e "Definir" do Código do Produto passam a se chamar Editar. Associar ao produto e Portadores não são listas de cadastro e ficam como estão. Endereçamento mantém o Clonar que já tinha (pergunta o código de origem). Nada no Supabase.


## 46. PARÂMETROS > VEÍCULOS: AÇÕES DE MANUTENÇÃO (PAI E FILHOS) E TIPOS DE OCORRÊNCIA

Ordem do responsável em 05/10. Veículos, em Parâmetros, passa a ser um grupo com três itens: Cadastro de Veículos (a tela de sempre), Ações de manutenção e Tipos de ocorrência. Cada lista tem os botões padrão Clonar, Editar e Excluir (decisão 45; Excluir só para o Administrador) e o botão "Cadastrar padrão", que só inclui o que falta, sem repetir nem alterar o que já existe. O nome não pode repetir dentro da lista; Clonar deixa o nome em branco e copia o resto.

Ações de manutenção são pais com subitens (filhos), cadastrados em um campo de texto com um subitem por linha, sem repetir dentro do mesmo pai. "Cadastrar padrão" carrega os 7 grupos do responsável (Lubrificação e Filtros, Transmissão e Fluídos, Freios, Pneus e Alinhamento, Suspensão e Direção, Sistema Elétrico e Iluminação, Segurança e Correias) com todos os subitens. Ao editar, os subitens que já existem mantêm o identificador. Tipos de ocorrência têm nome e descrição; "Cadastrar padrão" carrega os 8 tipos do responsável (furto, roubo, avaria em manobra, avaria por fator externo, avaria interna, infração de trânsito, sinistro com vítima e colisão em trânsito).

Na tela Veículos > Movimentações e manutenções, ao registrar uma movimentação aparece o campo "Ação de manutenção": ao escolher o pai, abrem caixas de marcar com os filhos, e é preciso marcar ao menos um. A movimentação grava o nome do pai e os nomes dos filhos marcados, e o histórico mostra a coluna Manutenção. Os tipos de ocorrência ainda não são usados nas telas de Veículos (Ocorrências fica como está). Só modo demonstração (parâmetros locais; a movimentação só leva os campos de manutenção no modo demonstração, até a Fase 2); nada no Supabase.


## 47. FICHA DE EPI: BUSCA DO EPI COM TAMANHO E CADASTRO DE TAMANHO NA MESMA TELA

Ordem do responsável em 05/10. Em Parâmetros > EPI > Cadastrar Ficha de EPI, no botão Nova ficha, o campo de busca por palavra-chave do EPI passa a mostrar código, descrição e tamanho, no formato "EPI-0002 · Luva de raspa · TAM M"; a busca também acha pelo tamanho. O mesmo texto aparece no EPI já escolhido. EPI sem tamanho aparece como "Sem tamanho". Quando o EPI escolhido não tem tamanho, ou não há nenhum tamanho cadastrado, o campo mostra o link "Cadastrar tamanho", que abre uma janela sobre a ficha, sem sair da tela, para incluir um tamanho novo (o mesmo cadastro de Gerais > Tamanho e Medidas, só para o Administrador; os demais veem o aviso). O tamanho de um EPI não muda depois de cadastrado (decisão 45): para um EPI em tamanho novo, usa-se Clonar em Cadastrar EPI. O Clonar da ficha já abria a janela com a cópia de todo o texto da ficha de origem para associar a um EPI novo e salvar, e não mudou. Só modo demonstração; nada no Supabase.


## 48. CADASTRAR UNIFORME: CATÁLOGO POR TAMANHO, IGUAL AO CADASTRAR EPI

Ordem do responsável em 05/10 (escolha: catálogo completo). Em Parâmetros, Uniformes passa a ter o item Cadastrar Uniforme (`/uniformes-cadastrar`; o endereço antigo `/cadastros/uniformes` redireciona), com a mesma tela e as mesmas regras do Cadastrar EPI (decisão 35): catálogo global, um registro por descrição e tamanho, sem empresa, com código automático (sigla UNI + numeração). Os campos são: Subcategoria, Descrição do item, Tamanho habilitado (só os tamanhos associados à subcategoria em Gerais) e Estoque mínimo; a Unidade só aparece se Gerais autorizar unidades para a subcategoria. Preço de custo, marca, modelo e empresa deixam de ser perguntados no cadastro. Novo uniforme cria uma descrição ainda não cadastrada; Clonar copia a descrição e a unidade, gera outro código e só aceita tamanho ainda não cadastrado; Editar muda a descrição (vale para todos os tamanhos do mesmo uniforme) e o estoque mínimo do tamanho; Excluir só é permitido sem saldo e sem histórico, leva o estoque zerado e os endereços, e avisa e remove os códigos de fábrica associados. A lista agrupa pela descrição e tem busca por palavra-chave. O estoque de cada empresa nasce do catálogo (saldo zero e o mínimo), e estoque, compras, movimentações e termos continuam por empresa. Os uniformes cadastrados antes ficam como estão, em "Uniformes antigos", até o PR seguinte, que os separa por tamanho (como a decisão 39 fez com o EPI). Só modo demonstração; no banco real continua o cadastro antigo até a Fase 2. Nada no Supabase.


## 49. CADASTRAR VEÍCULO: DESCRIÇÃO AUTOMÁTICA E DADOS DE AQUISIÇÃO

Ordem do responsável em 05/10. No cadastro de veículo (Veículos > Cadastrar Veículo) o campo "Descrição do item" deixa de existir. A descrição é montada sozinha, na ordem placa, subcategoria, marca, modelo, ano, cor e combustível, separados por " · " e pulando o que estiver vazio (exemplo: "ABC1D23 · Utilitário · Fiat · Strada · 2022 · Branca · Flex"). A lista, a busca e o CSV mostram a descrição calculada com os dados atuais, então acompanham mudanças feitas em Gerais. O cadastro ganha três campos opcionais: data de aquisição (não pode ser futura nem inexistente), custo em R$ (zero ou mais) e número da nota fiscal. No Clonar, esses três campos ficam em branco, pois pertencem à compra daquele veículo. Só modo demonstração (a tabela real não tem essas colunas até a Fase 2); nada no Supabase.


## 50. LINK "CADASTRAR TAMANHO" NO CADASTRO DE EPI E DE UNIFORME

Ordem do responsável em 05/10. Em Parâmetros > EPI > Cadastrar EPI e Parâmetros > Uniformes > Cadastrar Uniforme, quando a subcategoria escolhida não tem nenhum tamanho associado, o campo Tamanho mostra o link "Cadastrar tamanho". Ele abre uma janela sobre o cadastro (sem sair da tela) para digitar o tamanho novo. Ao cadastrar, o tamanho entra em Gerais, já fica associado à subcategoria e é selecionado no campo Tamanho. Só o Administrador cadastra; os demais veem o aviso para pedir a ele. A Ficha de EPI continua com o link da decisão 47. Só modo demonstração; nada no Supabase.


## 51. EDITAR ABRE TODOS OS CAMPOS DO CADASTRO, COM PROTEÇÃO

Ordem do responsável em 05/10 (escolha: com proteção). O botão Editar de todos os cadastros abre todos os campos do cadastro, menos o código (EPI-0001, FER-0001, CX-0001 etc. continuam automáticos e fixos). A maior parte das telas já era assim; mudaram as que travavam campos. Cadastrar EPI e Cadastrar Uniforme (ajusta as decisões 45 e 48): o Editar passa a mostrar Subcategoria, Descrição, Unidade, Tamanho e Estoque mínimo. Subcategoria e unidade valem para todos os tamanhos da mesma descrição e só mudam se nenhum deles tem saldo ou histórico; o tamanho só muda se aquele registro não tem saldo nem histórico, não repete a descrição no mesmo tamanho e está associado à subcategoria em Gerais. Quando travado, o campo aparece desabilitado com o motivo. Ferramentas já deixavam trocar a empresa no Editar; o cadastro antigo de produtos (usado só no banco real) segue como estava até a Fase 2. Ficha de EPI: o Editar permite trocar o EPI da ficha, escolhendo entre os que não têm ficha (a ficha se move, sem duplicar). Número da Caixa é o código da caixa e segue fixo. Só modo demonstração; nada no Supabase.


## 52. CADASTRAR PLANO DE MANUTENÇÕES POR VEÍCULO

Ordem do responsável em 05/10 (escolha: periodicidade por veículo). Em Parâmetros > Veículos entra o item "Plano de manutenções" (`/cadastros/veiculos-plano-manutencao`). Cada veículo tem no máximo um plano. Ao cadastrar, escolhe-se o veículo e abrem duas caixas: à esquerda os Grupos de ação (os de Parâmetros > Veículos > Ações de manutenção, decisão 46, que é onde esses grupos ficam) e à direita as Ações habilitadas. Cada grupo habilitado exige o limite de km e o limite de meses (números inteiros maiores que zero); a manutenção vale pelo que vier primeiro. O plano exige ao menos um grupo. Os botões são os padrões da decisão 45: Clonar copia os grupos e limites para outro veículo (que ainda não tenha plano), Editar abre todos os campos, inclusive o veículo (decisão 51), e Excluir é só do Administrador. A lista mostra os grupos habilitados com km e meses; grupos apagados de Ações de manutenção deixam de aparecer. Os planos ficam no navegador (modo demonstração); nada no Supabase e nenhuma ligação ainda com alertas ou com o registro de manutenção, que dependem de ordem futura e da Fase 2.

## 53. CPF DO EMPREGADO COM MÁSCARA xxx.xxx.xxx-xx

Ordem do responsável em 05/10. No cadastro de empregado (Novo, Editar e Clonar) o campo CPF mostra o padrão `xxx.xxx.xxx-xx` como dica e formata os números enquanto se digita (`mascararCpf` em `src/lib/empregados.ts`): só aceita dígitos, até 11, com os pontos e o traço entrando sozinhos. A validação do CPF e a conferência de duplicidade continuam as mesmas (comparam só os dígitos). Ao editar, o CPF já salvo aparece formatado. Clonar continua deixando o CPF em branco. Nada no Supabase.

## 54. PARÂMETROS > FERRAMENTAS: CADASTRAR CAIXA E CADASTRAR FERRAMENTA

Ordem do responsável em 06/10 (escolha: tirar do menu as outras telas de caixa). Em Parâmetros > Ferramentas ficam só dois itens, nesta ordem. **Cadastrar Caixa** (primeiro, só Administrador) cai direto na tela Habilitar caixas (`/caixas-ferramentas`, sem abas); Caixas e itens, Cadastro e Portadores saem do menu e a tela deixa de oferecê-los (os componentes continuam no código, sem acesso até nova ordem). Substitui a decisão 36 nesse ponto. **Cadastrar Ferramenta** (antes Cadastro de Ferramentas): some o campo Descrição; a descrição é montada sozinha como grupo da ferramenta, modelo e marca, nesta ordem, separados por " · " (`descricaoFerramenta` em `src/lib/cadastro-ferramentas.ts`), e o modelo passa a ser obrigatório. Saem da tela número de série, patrimônio, data de aquisição, empresa, preço de custo e nota fiscal, porque o cadastro não alimenta estoque: a ferramenta nova usa a empresa do cabeçalho, a edição mantém a empresa que já tinha e não apaga nenhum desses dados nas ferramentas existentes. Entra o campo **Estoque mínimo** (inteiro, 0 ou mais), na lista e no CSV também. Isso substitui a decisão 8 (série, patrimônio e aquisição no cadastro) e, para este campo, a decisão 24; o estoque inicial continua fora do cadastro, e a decisão 51 (empresa editável) não vale mais para ferramentas. **Clonar** (já existia como botão padrão da decisão 45) passa a abrir o mesmo formulário copiando categoria, grupo, marca e estoque mínimo, com o modelo em branco; o código é novo ao salvar. Ao editar, a descrição é refeita com grupo, modelo e marca, então ferramentas antigas sem modelo ou sem grupo precisam preencher esses campos para salvar; a ferramenta nova recebe um número de série gerado pelo sistema (`SN-` e um código único), porque a coluna é obrigatória e única no banco, e não salva sem empresa ativa. A edição não zera mais campos que a tela não tem. A rota antiga `/cadastros/caixas-ferramentas` continua existindo fora do menu. Só ajuste de tela e de regra de cadastro; nada no Supabase.

## 55. FORNECEDORES: NOME FANTASIA OPCIONAL E SEM CATEGORIA

Ordem do responsável em 06/10 (primeiro "eliminar a necessidade de categoria", depois "retirar os campos de categoria"). Em Cadastros > Fornecedores só a razão social e o CNPJ continuam obrigatórios: o nome fantasia deixa de ser exigido e o campo Categorias sai do formulário e da lista. Onde o sistema mostra o nome do fornecedor (lista, confirmação de exclusão, compras, importação de NF-e, código de fábrica, aviso de uso da categoria), usa-se o nome fantasia e, se estiver vazio, a razão social. Sem categoria no cadastro, todo fornecedor aparece e é aceito nas compras de EPI e de Uniforme (ajusta as decisões 13 e 41); a categoria que algum fornecedor já tinha gravada não é apagada, mas não restringe mais nada: nem as compras nem a exclusão de categorias em Cadastros > Gerais, que deixou de avisar por uso em fornecedor. Só modo demonstração; nada no Supabase.

## 56. NOVO EPI E NOVO UNIFORME: TAMANHO VEM DO CADASTRO GERAL

Ordem do responsável em 06/10. No Novo EPI e no Novo Uniforme (mesma tela, decisão 48), o campo Tamanho lista todos os tamanhos ativos de Cadastros > Gerais, e não só os já associados à subcategoria; o associado desativado continua aparecendo marcado. Quando Gerais não tem nenhum tamanho, a tela mostra "Nenhum tamanho cadastrado em Gerais" e o link já existente Cadastrar tamanho. Ao salvar com um tamanho que ainda não era associado à subcategoria, o sistema o associa a ela (ajusta as decisões 48, 50 e 51 só neste ponto; o link Cadastrar tamanho passa a aparecer só quando Gerais está vazio: a associação deixa de ser pré-requisito e passa a ser consequência do cadastro). O Clonar continua oferecendo os tamanhos associados que faltam. Só modo demonstração; nada no Supabase.

## 57. MÓDULOS > VEÍCULOS: FROTA COM EXTRATO, ABASTECIMENTO E MANUTENÇÃO

Ordem do responsável em 06/10. Em Módulos > Veículos, a primeira tela é Frota: a lista dos veículos da empresa (descrição automática da decisão 49, situação, km atual e quantas preventivas estão vencidas). Clicar num veículo abre o extrato, só de leitura, com: km atual, média de consumo em km/L, preventivas sugeridas com situação (vencida, atenção, em dia, sem registro), manutenções realizadas (preventivas e corretivas), histórico de abastecimentos e ocorrências do veículo. O menu lateral de Veículos passa a ter Frota, Abastecimento, Manutenção, Movimentações e Ocorrências (decisão 43: sem abas no topo); a antiga "Movimentações e manutenções" virou "Movimentações" e continua com o campo Ação de manutenção da decisão 46. O cadastro do veículo continua só em Parâmetros > Veículos; a Frota do módulo deixa de ter cadastro.

Campos novos, autorizados por esta ordem: Abastecimento = veículo, data, km e litros; em abastecimentos e manutenções do mesmo veículo o km cresce com a data; Manutenção = veículo, data, km, tipo (preventiva escolhe a ação de Parâmetros > Veículos > Ações de manutenção; corretiva descreve o serviço). Excluir abastecimento ou manutenção é só do Administrador. A média km/L é a distância entre o primeiro e o último abastecimento dividida pelos litros dos seguintes. As preventivas usam o plano do veículo (decisão 52) e a regra "o que vier primeiro": vence quando o km atual chega a (km da última realização + intervalo) OU a data chega a (data da última + meses); fica em atenção quando faltam 10% ou menos do intervalo de km, ou 30 dias ou menos; sem nenhuma realização registrada aparece "sem registro". O km atual é o maior entre o cadastro do veículo, os abastecimentos e as manutenções. A verificação é feita ao abrir a tela (sem tarefa diária agendada). Manutenções marcadas em Movimentações aparecem no extrato como "Movimentação", sem km, e não zeram o prazo de uma preventiva. Só modo demonstração, salvo no navegador; as tabelas reais são da Fase 2 e nada foi criado no Supabase.

## 58. ABASTECIMENTO: HORA, VALOR, KM DO ÚLTIMO E HISTÓRICO POR VEÍCULO

Ordem do responsável em 06/10 (ajusta a decisão 57). Em Módulos > Veículos > Abastecimento, o registro passa a ter veículo, data, hora, km no abastecimento, litros abastecidos e valor abastecido em reais; todos obrigatórios. Ao escolher o veículo, o campo km já vem preenchido com o km do último abastecimento dele (o mais recente por data e hora) e a tela mostra data e hora desse abastecimento; sem abastecimento anterior, avisa que é o primeiro. O km não pode ser menor que o do abastecimento anterior (igual é aceito); a conferência vale pela data e hora e também considera as manutenções do mesmo veículo, e na comparação com uma manutenção (que não tem hora) vale só a data; a mensagem de recusa diz qual registro impede; dois abastecimentos do mesmo veículo na mesma data e hora são recusados (evita duplo clique); hora futura no dia de hoje é recusada. O valor aceita "R$ 1.234,56" e precisa ser maior que zero. A tela ganhou o filtro Histórico por veículo: com um veículo escolhido mostra quantidade de abastecimentos, litros, total gasto e média km/L; a lista traz, para cada abastecimento, os km rodados desde o anterior, o valor, o R$/L e o km/L do trecho (o primeiro abastecimento do veículo não tem trecho). O extrato do veículo usa o mesmo histórico, com hora, valor, km rodados e km/L. Abastecimentos gravados antes desta decisão não têm hora nem valor: aparecem com "—" e contam para os km e a média. Só modo demonstração; nada no Supabase.

## 59. VEÍCULOS: CAMPO DE BUSCA EM TODOS OS SUBMENUS DO MÓDULO

Ordem do responsável em 06/10 (com o campo de Ocorrências como modelo). Em Módulos > Veículos, todos os submenus têm um campo de busca no alto da lista: Frota (descrição ou responsável, e também situação), Abastecimento (veículo, data, hora, km, litros ou valor), Manutenção (veículo, serviço, tipo, data ou km), Movimentações (veículo, empregado, tipo, manutenção, motivo, ônus, observação ou data) e Ocorrências (já tinha). A busca ignora acento e maiúsculas e aceita as palavras em qualquer ordem. O texto do campo muda conforme o que cada lista tem; o de Frota e o de Ocorrências seguem o modelo "Buscar por descrição ou responsável". A Frota ganhou a coluna Responsável, para a busca não ficar escondida. Em Movimentações a busca existe só em Veículos; EPI, uniforme e ferramenta ficam como estavam. No Abastecimento, o resumo do veículo mostra litros e total gasto só do que a busca deixa na tela, mas a média km/L é sempre do histórico inteiro do veículo, como os km rodados e o km/L do trecho; a busca também acha valores digitados no formato da tela (ex.: "45,50"). Com a busca ativa e nada encontrado, a lista diz "Nenhum resultado para a busca". O Exportar CSV de Movimentações continua exportando todas as movimentações, não só as filtradas. Só ajuste de tela; nada no Supabase.

## 60. VEÍCULOS > OCORRÊNCIAS: CADASTRO, FOTOS COMPRIMIDAS E TRATATIVA

Ordem do responsável em 06/10. Em Módulos > Veículos > Ocorrências a lista mostra o código, a data do ocorrido, o veículo, o tipo, o condutor e o status em cores: **Aberta** (vermelho), **Em tratativa** (âmbar) e **Encerrada** (verde), com filtro por status e a busca da decisão 59. Clicar numa linha abre os dados já lançados até o momento (ocorrência, fotos e tratativa). O botão **Nova ocorrência** continua. Ao salvar, o sistema gera o código sequencial automático (`OCO-0001`, `OCO-0002`…) e registra a data e hora do cadastro (horário de Brasília); o usuário informa veículo, tipo de ocorrência (os de Parâmetros > Veículos > Tipo de ocorrência), data e hora do ocorrido (não pode ser futura), local, condutor, danos (veículo da empresa e/ou veículo de terceiros) e descrição livre. A ocorrência nasce **Aberta**.

**Fotos:** botão Anexar fotos (até 6 por ocorrência). Antes de guardar, cada foto é reduzida no navegador: maior lado de 1024 px, JPEG com qualidade 0,6, repetindo com menos qualidade e tamanho até caber em cerca de 200 mil caracteres (`comprimirImagem` em `src/lib/imagem.ts`). Ficam guardadas só no navegador; o armazenamento real das fotos é da Fase 2.

**Tratativa:** cada linha tem o botão **Tratativa** (**Editar tratativa** depois de iniciada), só para quem pode gravar (Administrador e gestor, que fazem o papel de supervisor habilitado). A tela registra sozinha data e hora da tratativa e pede: responsável pela tratativa, descrição da tratativa para o veículo da empresa e outra para o de terceiros (cada uma exigida só quando o dano correspondente foi marcado), custo total para a empresa (aceita 0), pagamento feito por terceiros (texto livre) e uso de seguradora (sim ou não). **Salvar** mantém a ocorrência **Em tratativa** e permite voltar e editar; **Encerrar tratativa** pede confirmação ("não será possível editar mais depois disso; tem certeza?") e deixa a ocorrência **Encerrada**. A tratativa encerrada só pode ser editada pelo Administrador (usuário master), e ela continua Encerrada. O extrato do veículo (decisão 57) passa a listar essas ocorrências com código e status. Só modo demonstração, salvo no navegador (a tela antiga continua fora da demonstração); as tabelas reais e as fotos no servidor são da Fase 2 e nada foi criado no Supabase.

## 61. VEÍCULOS > MANUTENÇÃO: CADASTRO COM GRUPO, AÇÕES, LOCAL E CUSTOS

Ordem do responsável em 06/10 (ajusta a decisão 57). Em Módulos > Veículos > Manutenção, o botão **Cadastrar nova manutenção** abre o fluxo: veículo, tipo (preventiva ou corretiva), data e km (já existiam), e, só na **corretiva**, a descrição do que está acontecendo com o veículo (a preventiva não tem esse campo e não grava descrição). Depois vem o **grupo de ações** (o "pai", de Parâmetros > Veículos > Ações de manutenção), obrigatório nos dois tipos; a tela lista as **ações do grupo** (os "filhos") para marcar, e cada ação marcada tem uma **observação livre** opcional. Quando o grupo tem ações cadastradas, é preciso marcar ao menos uma; grupo sem ações cadastradas é aceito. O **local** é na própria empresa ou local de terceiro (com o nome do local, obrigatório). O **custo** é lançado separado em **peças** e **mão de obra**, ambos obrigatórios (aceita 0 e "R$ 1.234,56"); o total é a soma, mostrado na tela e na lista, e a lista ganhou as colunas Local e Custo total. Escolhas do Claude, sem ordem expressa: o grupo também é exigido na corretiva (a ordem lista o grupo depois do tipo, para os dois), e o nome das ações marcadas é guardado no registro, para não mudar se Parâmetros mudar. Só a manutenção preventiva alimenta as sugestões do extrato (decisão 57), pelo grupo. Manutenções gravadas antes desta decisão continuam aparecendo, com "—" em local e custo. O extrato do veículo mostra grupo, ações e, na corretiva, a descrição. Só modo demonstração, salvo no navegador; nada no Supabase.

## 62. PARÂMETROS > VEÍCULOS: ITENS CHECK LIST

Ordem do responsável em 06/10, com a lista de itens de conferência por tipo de veículo. Em Parâmetros > Veículos entra o item **Itens check list**, no mesmo desenho das Ações de manutenção (decisão 46): cada linha é um grupo com seus itens (um por linha na tela), com Cadastrar, Cadastrar padrão e os botões Clonar, Editar e Excluir da decisão 45 (Excluir só do Administrador). O nome do grupo é único (sem diferenciar maiúsculas ou acentos) e o item não se repete dentro do grupo; ao editar, o item de mesmo nome mantém o seu id. **Escolha do Claude:** como a ordem não definiu campos além da lista, cada grupo é "tipo de veículo · seção" (ex.: "Carros de passeio · Exterior"), sem campo novo de tipo de veículo. O texto é guardado como digitado, sem a capitalização por palavra, porque siglas como CRLV, IPVA e RNTRC seriam estragadas. **Cadastrar padrão** carrega a lista enviada: 26 grupos e 146 itens (carros de passeio em 5 seções; SUVs, utilitários e picapes em 3; vans e furgões; caminhões leves e médios em 7; pesados e cavalo mecânico em 3; ônibus e micro-ônibus em 4; motos; empilhadeiras e veículos de movimentação; e os itens comuns a todos os veículos), sem repetir o que já existe e sem alterar o que o responsável cadastrou. As partes "Tudo do carro de passeio, mais" (SUVs, vans), "do caminhão leve/médio" (pesados) e "do passeio/pesado" (ônibus) não são copiadas: os grupos do tipo-base valem e o do tipo novo soma. Esta decisão só cadastra a lista; a tela de execução do check list (marcar os itens por veículo) não faz parte dela e fica à espera de ordem. Só modo demonstração, salvo no navegador; nada no Supabase.

## 63. VEÍCULOS > CHECK LIST

Ordem do responsável em 06/10. No módulo Veículos entra o submenu **Check list** (menu lateral, decisão 43). Cada item é avaliado como **OK**, **NOK** ou **N.A.**, com campo de observação por item e até 3 fotos compactadas (mesma compressão da decisão 60) do item danificado. Os itens vêm de Parâmetros > Veículos > Itens check list (decisão 62), conforme o **tipo do veículo**. **Escolhas do Claude:** (a) o tipo do veículo é a subcategoria de Veículos em Cadastros > Gerais; cada grupo do check list ganhou o vínculo com um ou mais tipos (ou "Todos os tipos", marcado como "*"); grupos antigos ficam em "todos"; (b) o "Cadastrar padrão" liga cada grupo ao tipo pelo nome (passeio, SUV, van, caminhão leve, pesado, ônibus, moto, empilhadeira) e deixa **sem tipo** o grupo cujo tipo não existe em Gerais, avisando na tela; (c) a periodicidade (Diário ou Semanal, só essas duas) **não vem de Parâmetros nem do cadastro do veículo**: é definida dentro do próprio módulo Check list, na tabela "Situação por veículo", e vale para todos os itens do veículo; semana = segunda a domingo; (d) um veículo só pode ter um check list em andamento por vez; (e) o check list só conclui com todos os itens avaliados, e NOK exige observação; (f) ao concluir, cada NOK gera uma ocorrência OCO- (tipo fixo "Item reprovado no check list", local "Check list do veículo") e fica registrado como **pendência** no próprio check list, aberta até alguém com permissão de gravação registrar a resolução (descrição obrigatória); N.A. e OK não geram pendência nem ocorrência; (g) o PDF é gerado pelo visualizador de impressão do sistema ("Imprimir ou salvar em PDF"), com todos os itens, avaliações, observações, fotos e pendências, e todo texto escapado. A tela mostra a situação por veículo (Em dia, Em andamento, Pendente) e o histórico com busca e filtro de pendências abertas. Só modo demonstração, salvo no navegador; nada no Supabase.

## 64. PARÂMETROS > VEÍCULOS > ITENS CHECK LIST: PADRÃO POR LEVES, PESADOS E EMPILHADEIRAS

Ordem do responsável em 06/10: os itens do check list em Parâmetros passam a ser separados por tipo de veículo com as listas enviadas, e o check list do módulo segue as perguntas do tipo do veículo. **Substitui o padrão da decisão 62** (26 grupos, 146 itens). O novo "Cadastrar padrão" traz 19 grupos e 117 itens, no formato "tipo · seção": **Veículos leves** (carros, SUVs, picapes e vans; 4 grupos: Mecânica, Exterior e pneus, Interior, Segurança e documentos), **Veículos pesados** (caminhões, cavalo mecânico, carreta e ônibus; 6 grupos: Mecânica e sistema de ar, Pneus, rodas e eixos, Iluminação e sinalização, Acoplamento e carroceria, Cabine e segurança, Documentação e regulamentação) e **Empilhadeiras** (9 grupos, da elevação e mastro à documentação e inspeção). **Escolhas do Claude:** (a) ao cadastrar o novo padrão, os grupos do padrão antigo (pelos nomes originais) são retirados; grupos criados pelo responsável com outros nomes não são tocados (atenção: um grupo do responsável com o mesmo nome de um grupo antigo, como "Motos" ou "Todos os veículos · Itens comuns", e qualquer edição feita nos grupos do padrão antigo, também são substituídos); (b) ligação ao tipo pelo nome da subcategoria de Veículos em Gerais: leves = carro, utilitário/SUV/picape e van; pesados = caminhão, cavalo mecânico, carreta e ônibus; empilhadeira = subcategoria com esse nome; (c) Gerais não tem "Empilhadeira" de fábrica: os 9 grupos ficam sem tipo, com aviso, até o responsável criar o tipo em Gerais e clicar de novo em Cadastrar padrão, que liga os grupos existentes sem mexer nos itens; (d) moto e "Outros" não têm lista no padrão (o item "Motos" saiu junto com o padrão antigo); o responsável pode cadastrar grupos próprios para eles; (e) o erro de digitação "Roda trazeira" da lista enviada foi gravado como "Roda traseira". As regras de execução do check list (decisão 63) não mudam. Só modo demonstração, salvo no navegador; nada no Supabase.

## 65. VEÍCULOS > CHECK LIST: TIPO DE VEÍCULO NO FORMULÁRIO "NOVO CHECK LIST"

Ordem do responsável em 06/10: o formulário "Novo check list" ganha o campo **Tipo de veículo**, com três opções: **Veículos leves**, **Veículos pesados** e **Empilhadeira**. Ao escolher o tipo, o formulário mostra os itens correspondentes (quantidade e grupos) e o check list criado traz esses itens, vindos dos grupos ligados em Parâmetros > Veículos > Itens check list. **Escolhas do Claude:** (a) o tipo vem primeiro e a lista de veículos mostra só os veículos ativos daquele tipo, pela subcategoria de Veículos de Gerais (leves = Carro, Utilitário e Van; pesados = Caminhão e Ônibus; empilhadeira = subcategoria com esse nome); o veículo, por sua vez, é cadastrado em Parâmetros como antes; (b) os itens do tipo são os dos grupos ligados a alguma subcategoria do tipo mais os grupos de "Todos os tipos"; não foi criado campo novo em Parâmetros; (c) o botão Iniciar da tabela "Situação por veículo" abre o formulário já com o tipo e o veículo preenchidos, e fica desabilitado para veículo cujo tipo não tem lista (por exemplo, Moto); (d) o tipo escolhido (Veículos leves, Veículos pesados ou Empilhadeira) é gravado no check list e aparece na busca; check lists anteriores à decisão 65 mantêm o nome da subcategoria do veículo (Carro, Caminhão etc.); (e) a granularidade é o tipo: um grupo ligado só a "Carro" vale também para Van e Utilitário, e um ligado só a "Caminhão" vale também para Ônibus; (f) com tipo sem itens ligados, o botão Iniciar do formulário fica desabilitado. Só modo demonstração, salvo no navegador; nada no Supabase.

## 66. PARÂMETROS > VEÍCULOS > CADASTRO: EMPILHADEIRA NÃO TEM PLACA

Ordem do responsável em 06/10: no cadastro de veículo, ao selecionar a subcategoria **Empilhadeira** o campo **Placa** é retirado; o campo fica só para os veículos leves e pesados (os demais tipos). **Escolhas do Claude:** (a) "empilhadeira" é reconhecida pelo nome da subcategoria de Veículos em Cadastros > Gerais (mesma regra do check list); a troca de subcategoria no formulário mostra ou esconde a Placa na hora, sem fechar o formulário; (b) sem placa, o veículo é salvo com a placa em branco, a placa deixa de ser obrigatória e de ser conferida contra repetição, e a descrição automática (decisão 49) continua montada com os demais dados; (c) ao trocar um veículo já cadastrado para Empilhadeira, a placa que ele tinha é apagada ao salvar; (d) na lista, no CSV e nos rótulos a placa vazia aparece como "—" e o código do veículo identifica o cadastro; (e) a Moto e "Outros" continuam com placa. Só modo demonstração; nada no Supabase (a coluna de placa do banco real é tratada na Fase 2).

## 67. GERAIS > VEÍCULOS: MARCAS DE VEÍCULOS PRÉ-CADASTRADAS

Ordem do responsável em 06/10: as Tabelas de Apoio de Veículos passam a trazer as marcas de **carros** (Fiat, Volkswagen, Chevrolet, Toyota, Hyundai, Renault, Nissan, Honda, Jeep, Ford, Peugeot, Citroën, Mitsubishi, BYD, GWM, Suzuki), de **equipamentos/caminhões** (Mercedes-Benz, Volvo, Scania, MAN, Volkswagen Caminhões, Iveco, Ford Caminhões, DAF, Foton, Sinotruk), de **motos** (Honda, Yamaha, Suzuki, Kawasaki, Harley-Davidson, Royal Enfield, BMW Motorrad, Dafra, Shineray, Haojue) e de **empilhadeiras** (Toyota, Caterpillar (CAT), Hyster, Yale, Clark, Still, Jungheinrich, Crown, Paletrans, Total). **Escolhas do Claude:** (a) a lista de marcas de Veículos continua única (a marca não tem tipo) e Honda, Suzuki e Toyota, que aparecem em mais de um grupo, entram uma vez só: 43 marcas; (b) quem ainda não tem marcas salvas já recebe as padrão; quem já abriu a tela (lista salva vazia) usa o botão **Cadastrar marcas padrão**, que inclui só as que faltam, sem repetir nem alterar o que existe; (c) os nomes entram com a grafia enviada (BYD, GWM, MAN, DAF, CAT); (d) o responsável continua podendo incluir, renomear, desativar e excluir marcas (marca em uso por veículo não sai). Só modo demonstração, salvo no navegador; nada no Supabase.

## 68. GERAIS > FERRAMENTAS: CATEGORIA DE FERRAMENTA = SUBCATEGORIA

Ordem do responsável em 06/10: em Cadastros > Gerais > Tabelas de Apoio > Ferramentas aparecia duas vezes a mesma lista (Subcategorias de Ferramentas e Categorias de ferramentas, com Manual, Elétrica, Pneumático, Hidráulica, Medição e Corte). Fica só a **subcategoria** (já era a regra da decisão 3: categoria de ferramenta = subcategoria de Ferramentas). **Escolhas do Claude:** (a) some a lista "Categorias de ferramentas" de Gerais; (b) o campo "Categoria de ferramenta" do cadastro de ferramenta passa a listar as subcategorias de Ferramentas, e o cadastro só aceita nome que seja subcategoria; (c) como os nomes padrão eram os mesmos, ferramentas já cadastradas continuam válidas; o valor segue gravado no mesmo campo (`categoria_ferramenta`); (d) a subcategoria de Ferramentas em uso por uma ferramenta não pode ser renomeada nem excluída (a ferramenta guarda o nome), com aviso de onde é usada; desativar continua permitido e só tira a subcategoria da escolha; (e) categorias criadas à mão na lista antiga e que não existam como subcategoria deixam de aparecer para ferramenta nova (basta cadastrá-las como subcategoria); a ferramenta que já as usa continua editável, com a categoria atual marcada "(fora de Gerais)". Só modo demonstração; nada no Supabase.

Ordem do responsável em 06/10: em Cadastros > Gerais > Tabelas de Apoio > Ferramentas aparecia duas vezes a mesma lista (Subcategorias de Ferramentas e Categorias de ferramentas, com Manual, Elétrica, Pneumático, Hidráulica, Medição e Corte). Fica só a **subcategoria** (já era a regra da decisão 3: categoria de ferramenta = subcategoria de Ferramentas). **Escolhas do Claude:** (a) some a lista "Categorias de ferramentas" de Gerais; (b) o campo "Categoria de ferramenta" do cadastro de ferramenta passa a listar as subcategorias de Ferramentas, e o cadastro só aceita nome que seja subcategoria; (c) como os nomes padrão eram os mesmos, ferramentas já cadastradas continuam válidas; o valor segue gravado no mesmo campo (`categoria_ferramenta`); (d) a subcategoria de Ferramentas em uso por uma ferramenta não pode ser renomeada nem excluída (mesma regra das outras categorias), com aviso de onde é usada; (e) categorias criadas à mão na lista antiga e que não existam como subcategoria deixam de aparecer para ferramenta nova; basta cadastrá-las como subcategoria. Só modo demonstração; nada no Supabase.

## 69. GERAIS > VEÍCULOS: SUBCATEGORIA EMPILHADEIRA DE FÁBRICA

Ordem do responsável em 06/10: a lista Subcategorias de Veículos em Cadastros > Gerais > Tabelas de Apoio passa a trazer **Empilhadeira** (Carro, Moto, Caminhão, Utilitário, Van, Empilhadeira e Outros, este último fora da lista como antes). **Escolhas do Claude:** (a) quem começa do zero já recebe a Empilhadeira; (b) quem já tem cadastros salvos neste navegador recebe a Empilhadeira uma vez, na primeira leitura depois desta mudança, se não tiver nenhuma subcategoria de Veículos com "empilh" no nome; (c) depois de qualquer gravação em Gerais fica um marcador no navegador, e se o responsável excluir a Empilhadeira ela não volta; (d) isso substitui o ponto da decisão 64(c): os 9 grupos de Empilhadeiras do check list agora são ligados ao tipo logo no "Cadastrar padrão"; se a Empilhadeira for excluída, o aviso de grupos sem tipo volta a valer; (e) a regra de que Empilhadeira não tem placa (decisão 66) vale para essa subcategoria. Só modo demonstração, salvo no navegador; nada no Supabase.

## 70. CADASTRAR EPI E UNIFORME: LINK "CADASTRAR TAMANHO" SEMPRE VISÍVEL

Ordem do responsável em 06/10: ao cadastrar um EPI, o tamanho é puxado das listas de Gerais (Tamanho e Medidas de Produto) e, se o tamanho necessário não estiver na lista, há um link para cadastrá-lo e incluí-lo na lista do cadastro. **Escolhas do Claude:** (a) o campo Tamanho listava os tamanhos de Gerais (a decisão 71 troca isso pelos tamanhos autorizados da subcategoria); o que mudou aqui é que o link **Cadastrar tamanho** (decisão 50) agora aparece **sempre** abaixo do campo ("Não achou o tamanho? Cadastrar tamanho"), e não só quando a lista está vazia; (b) o link abre a mesma janela da decisão 50: o tamanho entra em Gerais, fica associado à subcategoria escolhida e já vem selecionado no campo; só o Administrador cadastra, os demais veem o aviso para pedir a ele; (c) como o Cadastrar Uniforme é a mesma tela do EPI (decisão 48), o mesmo ajuste vale para ele. Só modo demonstração; nada no Supabase.

## 71. NOVO EPI E NOVO UNIFORME: TAMANHO SÓ DOS AUTORIZADOS DA SUBCATEGORIA

Ordem do responsável em 06/10, com a tela Associar tamanho e medida ao produto como referência (Luva com P, M e G autorizados). **Revoga a decisão 56:** o campo Tamanho do Novo EPI e do Novo Uniforme volta a listar **só os tamanhos autorizados** da subcategoria escolhida em Cadastros > Gerais > Tamanho e Medidas de Produto > Associar ao produto, e não mais todos os tamanhos de Gerais. **Escolhas do Claude:** (a) subcategoria sem nenhum tamanho autorizado mostra "Nenhum tamanho autorizado para esta subcategoria." com o link Cadastrar tamanho, e o item pode ser salvo sem tamanho, como antes; (b) o link "Não achou o tamanho? Cadastrar tamanho" (decisões 50 e 70) continua sempre visível: o tamanho novo entra em Gerais, já é autorizado para a subcategoria e vem selecionado; só o Administrador cadastra; (c) deixa de existir a associação automática ao salvar (a decisão 56 associava o tamanho escolhido que ainda não era autorizado): agora a autorização vem só de Associar ao produto ou do link; (d) o desativado que já está autorizado continua aparecendo marcado; (e) o Clonar não muda. Só modo demonstração; nada no Supabase.

## 72. TÍTULO DE TAMANHO E MEDIDAS DE PRODUTO COM A FORMATAÇÃO DOS DEMAIS MENUS

Ordem do responsável em 07/10, com print da barra lateral de Parâmetros. Em Gerais, o item "Tamanho e Medidas de Produto" aparecia como um subtítulo pequeno e cinza, sem ícone, diferente de Tabelas de Apoio, Código do Produto, Código de Fábrica e Endereçamento. Agora ele usa o mesmo ícone (régua), o mesmo tamanho e a mesma cor de texto dos outros menus, com as abas Cadastro e Associar ao produto logo abaixo, recuadas. Só visual; nada muda nas telas, nas rotas nem no Supabase.

## 73. TODOS OS SUBMENUS DA BARRA LATERAL COM ÍCONE

Ordem do responsável em 07/10: todo menu da barra lateral deve ter ícone, padronizado por assunto. Em Parâmetros > Gerais > Tamanho e Medidas de Produto, Cadastro ganhou o ícone de lista com mais (ListPlus) e Associar ao produto o de ligação (Link2). Nos submenus de Módulos (EPIs, Uniformes, Ferramentas, Veículos), cada aba ganhou um ícone do seu assunto: Dashboard (painel), Estoque (caixas empilhadas), Compras (carrinho), Histórico (relógio), Baixas (pacote com menos), Termos (documento assinado; encerramento com X; vistoria com prancheta marcada), Ocorrências (alerta), Movimentações (setas de ida e volta), Número da caixa (caixa), Frota (carro), Abastecimento (bomba), Manutenção (chave), Check list (lista marcada). **Escolha do Claude:** a mesma aba usa o mesmo ícone em todos os módulos. Só visual; nada muda nas telas, rotas nem no Supabase.

## 74. PARÂMETROS > VEÍCULOS: ASSOCIAR ITENS DE CHECK LIST A UM VEÍCULO

Ordem do responsável em 07/10. Em Parâmetros > Veículos, o ícone de **Itens check list** passa a ser a chave de boca e entra o item **Associar itens de check list a um veículo** (`/cadastros/veiculos-checklist-associar`), com o ícone de lista com check. Na rotina, o responsável escolhe o veículo e, no mesmo formato do Plano de manutenções (decisão 52), habilita os grupos de Itens check list que quer (Habilitar → / ← Remover), com o campo adicional **Periodicidade** (Diária, Semanal, Quinzenal ou Mensal) e define o **responsável**. **Escolhas do Claude:** (a) a unidade habilitada é o **grupo** de itens (o mesmo "tipo · seção" da decisão 62), e a periodicidade é escolhida por grupo, como o plano escolhe km e meses por grupo de ação; (b) o responsável é um por veículo, escolhido entre os empregados ativos da empresa do veículo (sem empresa no veículo, de qualquer empresa), e é obrigatório; (c) cada veículo tem uma associação só; a lista traz Clonar, Editar e Excluir (decisão 45; Excluir só Administrador); Clonar copia grupos e periodicidades para outro veículo e pede o responsável de novo; Editar abre todos os campos (decisão 51), tudo ou nada; (d) grupo apagado de Itens check list some da tela e impede salvar até ser removido; (e) **conflito com a decisão 63(c)**, que mandava a periodicidade (só Diário ou Semanal) ficar dentro do módulo Check list e nunca em Parâmetros: o responsável confirmou em 07/10 que o que fica em Parâmetros é **somente cadastro**. A associação não manda no módulo Veículos > Check list, que continua com a periodicidade Diário/Semanal da tabela "Situação por veículo" (decisão 63 mantida). Só modo demonstração, salvo no navegador; nada no Supabase.

## 75. VEÍCULOS > CHECK LIST: PERIODICIDADE VEM DA ASSOCIAÇÃO DO VEÍCULO

Ordem do responsável em 07/10, com print da coluna Periodicidade da tabela "Situação por veículo": o campo de periodicidade sai do módulo Check list, e essa lógica passa a ser definida pelo cadastro Parâmetros > Veículos > Associar itens de check list a um veículo (decisão 74). **Revoga a decisão 63(c)** (periodicidade Diário/Semanal escolhida no módulo) **e o trecho da decisão 74(e)** que dizia que o módulo não lia a associação. **Escolhas do Claude:** (a) some a coluna e a lista de escolha de Periodicidade da tabela; a periodicidade do veículo é a **mais frequente** entre os grupos habilitados na associação dele (Diária, Semanal, Quinzenal, Mensal, nessa ordem), porque o módulo cobra um check list por veículo e não por grupo; (b) veículo **sem associação** mostra "Sem associação" na situação e o botão Iniciar fica desabilitado, com aviso para associar os itens em Parâmetros; (c) os itens do check list continuam sendo os do tipo do veículo (decisão 65) e o responsável continua escolhido no formulário (já vem do cadastro do veículo): só a periodicidade passa a vir da associação; (d) a situação (em dia, em andamento, pendente) passa a valer também para **Quinzenal** (de 1 a 15 e de 16 ao fim do mês, civil) e **Mensal** (o mês civil, em Brasília); semana segue de segunda a domingo; (e) a escolha de periodicidade antiga, gravada no navegador, deixa de ser usada; check lists já feitos mantêm a periodicidade com que foram gravados. Só modo demonstração; nada no Supabase.

## 76. VEÍCULOS > CHECK LIST: O FORMULÁRIO TRAZ SÓ OS ITENS DA ASSOCIAÇÃO DO VEÍCULO

Ordem do responsável em 07/10: ao abrir o formulário "Novo check list", puxar somente os itens cadastrados em Parâmetros > Veículos > Associar itens de check list a um veículo. **Substitui a origem dos itens da decisão 65** (grupos ligados ao tipo do veículo): o check list criado passa a ter só os **grupos habilitados na associação do veículo**, na ordem dela. **Escolhas do Claude:** (a) o campo Tipo de veículo continua, só para filtrar a lista de veículos (decisão 65); depois de escolher o veículo, o formulário mostra quantos itens e quais grupos virão da associação; (b) veículo sem associação mostra o aviso para associar os itens em Parâmetros e o botão Iniciar fica desabilitado; o botão Iniciar da tabela "Situação por veículo" já ficava desabilitado sem associação (decisão 75); (c) grupo apagado de Itens check list ou sem itens fica de fora; (d) o responsável definido na associação já vem preenchido no formulário (dá para trocar); (e) editar a associação não altera check lists já iniciados ou concluídos, que guardam os itens com que foram criados. Só modo demonstração; nada no Supabase.

## 77. VEÍCULOS: O SUBMENU MOVIMENTAÇÕES SAI DO MÓDULO

Ordem do responsável em 07/10: eliminar o submenu Movimentações do módulo Veículos. **Escolhas do Claude:** (a) a aba sai da barra lateral e da rota `/veiculos`; um link antigo com `?aba=movimentacoes` cai na primeira aba (Frota), como qualquer aba desconhecida; (b) só o módulo Veículos muda: EPI, Uniformes e Ferramentas mantêm Movimentações; (c) nenhum dado é apagado: o histórico de movimentações continua em Relatórios e no Extrato do veículo; (d) sem a aba, **deixa de ser possível registrar movimentação de veículo** (nem a ação de manutenção que ela gravava, decisões 46 e 59): a manutenção passa a ser lançada só na aba Manutenção; o código do ramo de veículo em `MovimentacoesModulo` e o `SeletorAcaoManutencao` ficam sem uso na tela e não foram apagados. Só modo demonstração; nada no Supabase.

## 78. VEÍCULOS > FROTA: BOTÃO DE IMPRESSÃO COM RELATÓRIO EM PDF

Ordem do responsável em 07/10: criar um botão de impressão com relatório em PDF no menu Frota do módulo Veículos. **Escolhas do Claude:** (a) botão "Imprimir relatório (PDF)" ao lado da busca; abre o visualizador do sistema (o mesmo dos termos e do check list), de onde se imprime ou salva em PDF; (b) o relatório sai com a **lista como está na tela**: respeita a empresa escolhida e a busca; traz empresa, data e hora de emissão em Brasília, totais por situação (ativos, em manutenção, inativos) e, por veículo, descrição, responsável, situação, km atual e preventivas vencidas; (c) todo texto é escapado. Só modo demonstração; nada no Supabase.

## 79. VEÍCULOS > MANUTENÇÃO: UMA MANUTENÇÃO PODE ABRANGER VÁRIOS GRUPOS DE AÇÕES

Ordem do responsável em 07/10: a manutenção cadastrada pode abranger todos os grupos de ações, e a tela só deixava lançar ações de um único grupo. **Altera a decisão 61** (um grupo por manutenção). **Escolhas do Claude:** (a) o campo "Grupo de ações" (lista de escolha) vira a lista "Grupos de ações", com uma caixa de marcação por grupo; ao marcar um grupo aparecem as ações dele, cada uma com a sua observação livre; (b) a validação vale por grupo: ao menos um grupo marcado, e em cada grupo que tem ações, ao menos uma ação marcada (grupo sem ações cadastradas vale só marcado); (c) a lista Manutenção e o extrato mostram cada grupo com as suas ações, assim: "Freios: Pastilha, Disco; Motor: Óleo"; (d) na **preventiva**, cada grupo marcado zera o prazo do respectivo item do plano de manutenção (sugestões do extrato e "Preventivas" da Frota); a corretiva continua não zerando; (e) local e custos (peças e mão de obra) continuam **um por manutenção**, não por grupo; (f) registros já gravados com um grupo só continuam valendo e aparecem como antes. Só modo demonstração; nada no Supabase.

## 80. VEÍCULOS > CHECK LIST: PAINEL DO MÊS COM OS CHECK LISTS PREVISTOS E O RESULTADO

Ordem do responsável em 07/10: no menu Check list do módulo Veículos, um painel com os check lists previstos para o mês corrente; permite escolher meses anteriores e ver os resultados já imutáveis dos check lists realizados e pendentes; mostra no topo o percentual de check lists realizados no prazo e o percentual de não realizados no prazo. **Escolhas do Claude:** (a) o painel fica no topo da tela Check list, com seletor de mês (do atual para trás, até 12 meses; sem meses futuros), quatro totais (realizados no prazo %, não realizados no prazo %, previstos no mês, a vencer) e a lista de previsões com prazo, veículo, periodicidade, responsável, situação e o código do check list (clicável); (b) **previsão** = um check list esperado de um veículo ativo com associação (decisão 75) em cada período: Diário (cada dia), Semanal (segunda a domingo), Quinzenal (1 a 15 e 16 ao fim do mês) e Mensal; o período pertence ao mês em que cai o **prazo** (o domingo, no semanal); (c) **realizado no prazo** = há check list **concluído** do veículo dentro do período (vale o dia da conclusão em Brasília); **não realizado no prazo** = o prazo passou sem isso (concluir depois do prazo não cobre o período); **a vencer** = o prazo ainda não passou; (d) os percentuais contam só o que já tem desfecho (realizados + vencidos), por isso somam exatamente 100% (o não realizado é o que falta para 100%); sem desfecho ainda aparece "—"; (e) **imutável:** cada previsão é gravada no navegador quando entra em vigor e, depois que o prazo passa, nunca mais muda, mesmo se a associação for editada ou apagada; antes do prazo ela acompanha a associação (trocar a periodicidade ou desassociar tira as previsões que ainda não venceram; trocar o responsável ou a descrição do veículo atualiza as que ainda não venceram); (f) a previsão **começa no dia em que a associação passa a valer** (a data em que foi criada ou editada pela última vez, em Brasília), mesmo que o módulo só seja aberto depois: os períodos desde essa data entram na primeira abertura e, se já venceram sem check list, aparecem como não realizados; o que passou antes da associação não é cobrado, então os meses anteriores à implantação aparecem vazios; (g) os totais valem para a empresa escolhida no topo; as previsões de todas as empresas são mantidas. Só modo demonstração; nada no Supabase.

## 81. VEÍCULOS > MANUTENÇÃO: BOTÃO EDITAR NA LISTA

Ordem do responsável em 07/10 (com print da lista de manutenções): inserir o botão Editar na lista. **Escolhas do Claude:** (a) cada linha ganha "Editar" ao lado de "Excluir" (que segue só para o Administrador); (b) abre o mesmo formulário do cadastro, já preenchido (veículo, tipo, data, km, descrição, grupos e ações marcados com as observações, local e custos); (c) vale a mesma validação do cadastro, e o km da própria manutenção não conflita com ela mesma, mas continua valendo contra os outros registros do veículo (abastecimentos e manutenções); (d) a edição troca tudo, menos o registro em si: mantém a data de criação; (e) o plano de manutenção e as sugestões do extrato passam a usar os dados editados; (f) grupo apagado de Parâmetros depois do cadastro sai da edição (só os grupos que ainda existem podem ser marcados); (g) a coluna Serviço da lista passa a mostrar cada grupo numa linha, com as ações. Só modo demonstração; nada no Supabase.

## 82. VEÍCULOS > MANUTENÇÃO: RELATÓRIO SEPARADO POR TIPO DE SERVIÇO AO CADASTRAR

Ordem do responsável em 07/10: ao cadastrar uma manutenção, gerar um relatório separado por tipo de serviço, de forma visualmente limpa e bonita. **Escolhas do Claude:** (a) "tipo de serviço" = o **grupo de ações** da manutenção (decisão 79): cada grupo sai num cartão próprio, com as ações feitas e as observações; (b) o relatório abre sozinho no visualizador do sistema (imprimir ou salvar em PDF) logo depois de salvar um **cadastro novo** (na edição não abre sozinho); (c) a lista ganha o botão "Relatório" para gerar de novo de qualquer manutenção, inclusive antigas; (d) o relatório traz empresa, tipo (preventiva ou corretiva, com o problema relatado na corretiva), veículo, data, km, local, custos de peças, mão de obra e total, data e hora de emissão em Brasília; (e) todo texto é escapado; registro antigo (um grupo só) sai normalmente. Só modo demonstração; nada no Supabase.

## 83. FERRAMENTAS > CADASTRAR FERRAMENTA: CAMPO "QUAL FERRAMENTA?" NO GRUPO OUTROS OU DIVERSOS

Ordem do responsável em 07/10 (com print do formulário): ao selecionar "Outros" no cadastro de Ferramentas, abrir um campo para digitar qual ferramenta é; depois, fazer o mesmo em todos os campos com a opção Outros nos menus de Parâmetros. **Escolhas do Claude:** (a) no sistema, a única lista de Parâmetros com essa opção hoje é o Grupo de ferramenta, e ela se chama "Diversos" (as listas de fábrica de EPI, Uniforme e Veículo já não trazem "Outros"); por isso o campo abre quando o grupo escolhido é Outros, Outro, Outras, Outra ou Diversos; (b) o campo "Qual ferramenta?" é obrigatório, até 60 caracteres, e o nome digitado entra na descrição no lugar do grupo (ex.: "Serra tico-tico · modelo · marca"); o grupo gravado segue sendo Diversos/Outros; (c) não há coluna nova: na edição o nome volta ao campo lido da própria descrição; (d) EPI, Uniforme e Ocorrência de veículo já têm descrição livre, e o Veículo tem modelo e descrição automática, então não ganharam o campo; se o responsável criar uma opção "Outros" em outra lista de Parâmetros que precise do campo, basta indicar qual. Só modo demonstração; nada no Supabase.

## 84. CAPITALIZAÇÃO: PRIMEIRA LETRA NO TEXTO COMUM, POR PALAVRA SÓ EM NOME DE PESSOA

Ordem do responsável em 07/10, consolidando e substituindo a regra "por palavra" dos PRs anteriores para texto comum. (a) **Texto comum** (descrições, empresas, produtos, endereços, categorias, fornecedores, observações): só a primeira letra do texto em maiúscula, o resto em minúscula, inclusive depois de espaço, vírgula ou hífen ("CASA DO TRABALHADOR" vira "Casa do trabalhador"; "gemape equipamentos ltda" vira "Gemape equipamentos ltda"). (b) **Nome de pessoa** (empregados, contatos, responsáveis, quem assina): continua por palavra ("luana vasconcelos" vira "Luana Vasconcelos"; da, de, do, e ficam em minúscula). (c) **Siglas e códigos** ficam como digitados: siglas conhecidas (EPI, CA, SKU, CNPJ, CPF, RG, CEP, NR, NF, UF…) saem em maiúscula e palavra com número (EPI-0001, UNI-0001, 12V) não muda. (d) **Quando vale:** o campo se corrige ao sair dele (blur) e no Enter, sem mexer enquanto se digita, e a função roda de novo ao salvar; dado já gravado não é reescrito em lote e só muda quando o usuário o edita. (e) **Onde:** todos os formulários de texto (Parâmetros, EPI, Uniformes, Ferramentas, Veículos, Empregados, Compras, termos); cada campo escolhe o modo pela propriedade `capitalizar` ("texto" ou "nome") de `Input` e `Textarea`; campos de código, número, data, máscara (CNPJ, telefone, CEP), e-mail, senha e busca ficam de fora. O mapa campo a campo está em `docs/capitalizacao-campos.md`. **Escolhas do Claude:** (f) a lista de siglas conhecidas é fechada (EPI, EPC, CA, SKU, CNPJ, CPF, RG, CEP, NR, NF, NFE, NBR, ABNT, UF, PDF, XML, USB, LED, GPS, RH, TI, CNH, CRLV, RENAVAM, ABS, GNV, SUV, IPVA e as marcas BMW, BYD, GWM, DAF, MAN); sigla fora dela digitada em maiúscula vira palavra comum (ex.: "NBX" vira "Nbx") e o responsável pode pedir a inclusão; (g) marcas como "Mercedes-Benz" ou "BMW" seguem a mesma regra ao serem digitadas num campo de texto; (h) "ao exibir": os documentos gerados continuam mostrando o que está gravado (escapado), sem reformatar dado antigo; (i) GEMAPE deixou de ser sigla forçada, para "Gemape equipamentos ltda" sair como pedido. Só modo demonstração; nada no Supabase.

## 85. PARÂMETROS > TAMANHO E MEDIDAS DE PRODUTO: SAI O SUBMENU CADASTRO DUPLICADO

Ordem do responsável em 07/10: em Parâmetros, retirar o menu "Cadastro" que está duplicado com "Tamanho e Medidas de Produto". **Escolhas do Claude:** (a) o submenu "Cadastro" (lista de tamanhos e numerações, unidades, tamanhos padrão) sai da barra lateral, porque abria a mesma tela do menu pai; (b) "Tamanho e Medidas de Produto" passa a abrir direto o cadastro (`/cadastros/gerais/tamanhos-unidades`, sem `?aba=`) e fica marcado quando essa tela está aberta; (c) "Associar ao produto" continua como único submenu abaixo dele; (d) a tela, as regras e o endereço antigo `?aba=cadastro` não mudam. Só visual; nada no Supabase.

## 86. PARÂMETROS: TABELAS DE APOIO E TAMANHO E MEDIDAS DE PRODUTO VÃO PARA DENTRO DE EPI, UNIFORMES E FERRAMENTAS

Ordem do responsável em 07/10 (com print da barra lateral): os itens "Tabelas de Apoio" e "Tamanho e Medidas de Produto" (com "Associar ao produto") passam a ficar dentro dos menus EPI, Uniformes e Ferramentas, em Parâmetros. **Escolhas do Claude:** (a) os dois itens saem de Gerais, que fica com Código do Produto, Código de Fábrica e Endereçamento (abrir Gerais agora leva ao Código do Produto); (b) as duas telas são compartilhadas e não foram duplicadas: o mesmo cadastro abre pelos três menus, com `?de=epi|uniformes|ferramentas` na URL só para marcar, na barra lateral, o menu de onde a pessoa veio; endereço sem `?de=` (favorito antigo) abre a tela sem marcar nenhum; (c) as regras, os dados e os endereços das telas não mudam, então Tabelas de Apoio continua mostrando também as listas de Veículos (inclusive Cadastrar marcas padrão) a quem entrar por qualquer um dos três menus; (d) Veículos não ganhou os itens, porque não foi citado. Só visual; nada no Supabase.

## 87. PARÂMETROS > CADASTRAR EPI: JANELA DE ASSOCIAÇÃO DE TAMANHOS SEM PERDER O CADASTRO

Ordem do responsável em 07/10: ao cadastrar novo EPI, permitir acesso à rotina de associação de tamanhos sem perder o que já foi feito; a janela abre, a associação é feita e salva, e o cadastro retoma de onde parou; a tela aberta é exatamente a da rotina de Tamanho e Medidas. **Escolhas do Claude:** (a) no Novo EPI, ao lado de "Cadastrar tamanho", entra o link "Associar tamanhos", que abre uma janela com a própria tela de Tamanho e Medidas de Produto > Associar ao produto (o mesmo componente, sem versão reduzida); (b) a janela abre ao lado do formulário, que continua montado: subcategoria, descrição, mínimo e o que mais foi preenchido ficam como estavam, e a associação salva na hora, como na tela do menu; (c) ao fechar, a lista de tamanhos do Novo EPI já traz o que foi autorizado; se a associação tirou o tamanho que estava escolhido, o campo volta vazio, para nunca gravar tamanho não autorizado; (d) o link aparece depois de escolher a subcategoria, junto do campo Tamanho; (e) só o Cadastrar EPI ganhou o link (Uniforme e Ficha de EPI não foram citados). Só modo demonstração; nada no Supabase.

## 88. PARÂMETROS > CADASTRAR UNIFORME: MESMA JANELA DE ASSOCIAÇÃO DE TAMANHOS DO EPI

Ordem do responsável em 07/10: a lógica da decisão 87 (abrir a tela de Tamanho e Medidas sem perder o cadastro em andamento, salvar e voltar) vale também para Uniformes, Ferramentas e Veículos. Ferramentas e Veículos não têm tamanho no cadastro hoje; o responsável escolheu fazer só em Uniformes agora. **Escolhas do Claude:** (a) no Novo Uniforme, ao lado de "Cadastrar tamanho", entra o link "Associar tamanhos", que abre a mesma janela do EPI (`DialogAssociarTamanhos`, a tela de Tamanho e Medidas de Produto > Associar ao produto); (b) o formulário fica montado por trás e nada do que foi preenchido se perde; (c) ao fechar, a lista de tamanhos já traz o que foi autorizado, e o tamanho escolhido que deixou de ser autorizado volta vazio; (d) Ferramentas e Veículos ficam como estão, até o responsável pedir (isso exigiria campo novo, que depende de aprovação prévia). Só modo demonstração; nada no Supabase.

## 89. PARÂMETROS: TAMANHO E MEDIDAS DE PRODUTO VIRA UMA TELA SÓ POR MENU (EPI, UNIFORMES, FERRAMENTAS)

Ordem do responsável em 07/10: hoje há duas rotinas, "Tamanho e Medidas" (cadastro) e "Associar ao produto"; unificar numa só página, no menu de parâmetros de EPI, com a mesma lógica em Uniformes e Ferramentas. Proposta aprovada pelo responsável no cartão. **Escolhas do Claude:** (a) cada menu (EPI, Uniformes, Ferramentas) tem o item "Tamanho e Medidas de Produto" sem submenu, que abre uma tela só: em cima o cadastro de tamanhos, numerações e unidades; embaixo a associação às subcategorias; (b) a categoria da associação vem do menu e a escolha de categoria some (EPI, Uniformes ou Ferramentas); a subcategoria continua sendo escolhida; (c) a lista de tamanhos e unidades é uma só no sistema e aparece igual nos três menus (não foi filtrada por categoria); (d) o submenu "Associar ao produto" saiu e o endereço antigo `?aba=associar` abre a mesma tela; o endereço antigo rola até a associação; sem menu de origem (favorito antigo), a associação mostra o seletor de categoria; trocar de menu começa a associação sem a subcategoria do menu anterior; (e) a janela "Associar tamanhos" do Novo EPI e do Novo Uniforme abre essa mesma tela, com a categoria do cadastro; (f) em Ferramentas a tela existe, mas o cadastro de ferramenta ainda não usa tamanho. Revoga a parte da decisão 85 sobre o submenu "Associar ao produto" e a da 87/88 sobre a tela aberta na janela ser só a associação. Só visual; nada no Supabase.

## 91. PARÂMETROS ESPECÍFICOS ABRE DIRETO NA CATEGORIA DO MENU

Ordem do responsável em 07/10: a rotina "Tabelas de Apoio" passa a se chamar "Parâmetros Específicos" e, em vez de cair na tela que pede para escolher entre Veículo, Ferramenta, EPI e Uniforme, abre direto no menu de interesse. **Escolhas do Claude:** (a) o item de EPI, Uniformes e Ferramentas abre na categoria do próprio menu (`?de=`); a lista de categorias e o botão "Voltar às categorias" não aparecem nesses casos; (b) o menu Veículos também ganhou o item "Parâmetros Específicos", para a categoria de veículos continuar acessível; (c) endereço antigo sem `?de=` (favorito) continua mostrando a escolha de categoria; (d) textos do Novo EPI/Uniforme passam a citar "Parâmetros > Parâmetros Específicos". Só visual; nada no Supabase.

## 92. NOVO CHECK LIST: JANELA DE CADASTRO DE VEÍCULOS SEM PERDER O QUE FOI ESCOLHIDO

Ordem do responsável em 07/10: no Novo check list, abrir a tela de veículos sem perder o cadastro em andamento, salvar e voltar. **Escolhas do Claude:** (a) abaixo do campo Veículo há o link "Cadastrar veículo", que abre a tela de Cadastro de Veículos (a mesma do menu) numa janela; (b) a janela fica ao lado do diálogo do check list, não dentro: tipo, veículo e responsável já escolhidos continuam preenchidos ao fechar; (c) o veículo salvo aparece na lista do tipo correspondente, sem selecionar sozinho; (d) vale para o check list periódico e para o avulso. Só visual; nada no Supabase.

## 93. NOVO CHECK LIST: JANELA DE ASSOCIAÇÃO DE ITENS NOS AVISOS DO VEÍCULO

Ordem do responsável em 08/10: no Novo check list, os avisos "Este veículo não tem itens associados: associe em Parâmetros > Veículos > Associar itens de check list a um veículo" e "Periodicidade (da associação do veículo): não definida (associe itens de check list ao veículo em Parâmetros)" devem abrir a tela sem perder o cadastro em andamento, salvar e voltar. **Escolhas do Claude:** (a) nos dois avisos o texto "associe em Parâmetros" vira o link "Associar itens de check list a um veículo", que abre a tela de Parâmetros > Veículos > Associar itens de check list a um veículo numa janela; (b) a janela fica ao lado do diálogo do Novo check list, não dentro: tipo, veículo e responsável continuam preenchidos ao fechar, e os avisos se atualizam sozinhos com a associação salva; (c) o link só aparece para quem tem permissão de escrita; sem ela, o aviso mantém o texto de orientação; (d) o aviso do check list avulso ("Não há itens … em Itens check list") não mudou, porque lá o problema são os itens padrão e não a associação. Só visual; nada no Supabase.

## 94. COMBUSTÍVEL GLP NO CADASTRO DE VEÍCULOS

Ordem do responsável em 08/10: incluir a opção "GLP" na lista de combustível do cadastro de veículos. **Escolhas do Claude:** a opção entra no fim da lista (depois de Híbrido), sem mudar a ordem das demais; veículos já cadastrados não mudam. A coluna `combustivel` é texto livre, então não há alteração no Supabase. Só visual.

## 95. NOVO CHECK LIST AVULSO: JANELA DE ITENS CHECK LIST NO AVISO DE TIPO SEM ITENS

Ordem do responsável em 08/10: no Novo check list avulso, o aviso "Não há itens de check list para o tipo deste veículo em Parâmetros > Veículos > Itens check list" deve abrir a tela sem perder o cadastro em andamento, salvar e voltar. **Escolhas do Claude:** (a) o texto "em Parâmetros > Veículos > Itens check list" vira o link "Cadastrar itens de check list", que abre a tela Itens check list (a mesma do menu) numa janela; (b) a janela fica ao lado do diálogo do check list avulso: tipo e veículo escolhidos continuam preenchidos, e o aviso some sozinho quando o tipo passa a ter itens; (c) o link só aparece para quem tem permissão de escrita; sem ela, o aviso mantém a orientação de cadastrar em Parâmetros; (d) completa o mesmo padrão das decisões 92 e 93 no Novo check list. Só visual; nada no Supabase.

## 96. CADASTRAR EPI: COLUNA DESCRIÇÃO NA LISTA DE EPIS CADASTRADOS

Ordem do responsável em 08/10: na lista que aparece ao cadastrar o EPI, o EPI aparecia numa linha acima dos códigos; criar o campo Descrição na tela, descrevendo o EPI com a categoria e a unidade, com exibição bonita. **Escolhas do Claude:** (a) a lista passa a ter as colunas Código, Descrição, Tamanho, Estoque mínimo e Ações; (b) a Descrição mostra o nome do EPI em destaque e, ao lado, a categoria e a unidade em etiquetas; a unidade só aparece quando o EPI tem unidade; (c) a linha de cabeçalho do grupo (nome, categoria e unidade acima dos códigos) saiu, porque a descrição agora está em cada linha; os tamanhos do mesmo EPI continuam juntos, separados do EPI seguinte por uma linha mais marcada; (d) a Descrição é montada a partir do nome, da categoria e da unidade já cadastrados: não é um campo novo no cadastro nem no Supabase; (e) a busca continua por código, descrição, subcategoria e tamanho. Só visual.

## 97. CADASTRAR EPI: DESCRIÇÃO SÓ COM O TEXTO DO ITEM E UNIDADE EM COLUNA PRÓPRIA

Ordem do responsável em 08/10: a "Descrição" volta a mostrar somente o texto da descrição do item, e a unidade deve ter um campo ao lado de Tamanho, seguindo o padrão existente. Substitui a decisão 96(b) e a primeira versão desta (texto corrido "Par de luva de látex", descartada pelo responsável). **Escolhas do Claude:** (a) a lista de EPIs cadastrados tem as colunas Código, Descrição, Tamanho, Unidade, Estoque mínimo e Ações; (b) a Descrição mostra só o nome (a descrição digitada no cadastro), sem categoria, sem unidade, sem etiquetas e sem negrito, na fonte padrão da tabela; (c) a Unidade fica logo depois de Tamanho, na mesma fonte e no mesmo padrão: mostra a unidade do EPI ou "Sem unidade" quando não tem, como a coluna Tamanho mostra "Sem tamanho"; (d) a categoria deixa de aparecer na lista (continua no cadastro e na busca por subcategoria); (e) a linha de cabeçalho do grupo continua fora, e os tamanhos do mesmo EPI seguem juntos, separados do seguinte por uma linha mais marcada. Só visual: a unidade já existe no cadastro; nada novo no Supabase.

## 98. MENU LATERAL: FONTES E ÍCONES MAIORES E VISUAL MAIS REFINADO

Ordem do responsável em 08/10: aumentar as fontes e os ícones do menu lateral e deixar ícones e textos mais bonitos. **Escolhas do Claude:** (a) itens principais: fonte de 14 para 15 px, altura de 32 para 44 px, ícones de 16 para 20 px com traço mais fino e mais espaço entre ícone e texto; (b) submenus: fonte de 14 px, ícones de 18 px e altura mínima maior; (c) títulos dos grupos (Visão geral, Módulos, Parâmetros) em caixa alta, com espaçamento entre letras; (d) item ativo com fundo claro translúcido, texto em negrito branco e uma barra branca na borda esquerda; (e) a setinha de abrir/fechar fica menor e mais discreta. Cores, ordem e nomes do menu não mudam. Só visual, no `AppSidebar.tsx`; nada no Supabase.

## 99. MENU LATERAL: TÍTULOS DOS GRUPOS COM MAIS DESTAQUE

Ordem do responsável em 08/10: Visão geral, Módulos e Parâmetros com mais destaque, para mostrar que são partes separadas do sistema. **Escolhas do Claude:** (a) cada título fica numa faixa própria, com fundo claro translúcido, texto branco em negrito, caixa alta e barra branca na borda esquerda; (b) entre um grupo e o seguinte há uma linha divisória e mais espaço; (c) itens, ícones, cores de fundo e ordem do menu não mudam. Só visual, no `AppSidebar.tsx`; nada no Supabase.

## 100. MENU LATERAL: ESTILO VIDRO (GLASSMORPHISM), BOTÕES ANIMADOS E LOGO MAIOR

Ordem do responsável em 08/10: visual mais clean do menu lateral em estilo glassmorphism, com animação nos botões, texto GEMAPE maior e o ícone animado da engrenagem maior e mais bonito, ao lado do texto. **Escolhas do Claude:** (a) botões e faixas de título em vidro fosco (fundo claro translúcido, borda fina e desfoque), mantendo a cor azul #0A007C do menu; (b) animação nos botões: ao passar o mouse o botão desliza um pouco para a direita, clareia e ganha sombra, o ícone cresce de leve, e ao clicar afunda; item ativo em vidro mais claro com brilho; (c) GEMAPE passa de 18 para 30 px e o subtítulo de 10 para 11 px (quebra em duas linhas); (d) a engrenagem vai para um quadrado de vidro de 68 px com a engrenagem grande girando devagar, uma pequena girando ao contrário e um brilho que pulsa; (e) quem pede menos movimento no sistema vê tudo parado; (f) só visual, em `AppSidebar.tsx` e `styles.css`; nada no Supabase.

## 101. FERRAMENTAS > NÚMERO DA CAIXA: CONTROLE POR CAIXA E HISTÓRICO DE MOVIMENTAÇÕES

Ordem do responsável em 08/10: o menu Número da caixa, em Ferramentas, deve controlar as ferramentas por caixa cadastrada e mostrar o histórico de movimentações de ferramentas por caixa. **Escolhas do Claude:** (a) cada caixa habilitada continua listando suas ferramentas e ganha três colunas: Qtd na caixa (a quantidade cadastrada na caixa), Com empregado (entregue menos devolvido e baixado, nunca negativo) e Disponível (Qtd na caixa menos Com empregado, nunca negativo); (b) abaixo da lista de cada caixa, o botão "Histórico de movimentações (N)" abre a tabela com Data, Tipo (entrada por compra, saída por entrega, saída por baixa, devolução), Ferramenta (código e nome), Qtd, Empregado e Observação, da mais nova para a mais antiga, e o botão Exportar baixa o mesmo histórico em CSV; (c) o histórico lê todas as movimentações de ferramentas da empresa, sem o limite de linhas; (d) a movimentação não grava a caixa: o histórico da caixa mostra as movimentações das ferramentas que estão cadastradas nela, e uma ferramenta que estiver em duas caixas aparece nas duas; (e) as contas ficam em `src/lib/controle-caixa.ts`. Sem tabela nem coluna nova: nada no Supabase; funciona com os dados de demonstração.

## 103. FERRAMENTAS: CAIXA GRAVADA EM CADA MOVIMENTAÇÃO (MODO DEMONSTRAÇÃO)

Ordem do responsável em 08/10: gravar a caixa em cada entrega; o banco só será construído depois da ordem dele, com o sistema aprovado. Substitui a decisão 101(d). **Escolhas do Claude:** (a) a movimentação de ferramenta ganha o campo `caixa_id`, gravado só no modo demonstração (no Supabase real nada muda: o campo só é enviado quando o modo demonstração está ativo, e a coluna entra na Fase 2); (b) a caixa é gravada na entrega (Termo de responsabilidade, com a caixa escolhida; entrega avulsa fica sem caixa), na vistoria periódica (caixa escolhida) e na devolução (Termo de encerramento: volta para a caixa da entrega mais recente daquela ferramenta ao empregado); (c) em Número da caixa, o histórico e as colunas Com empregado e Disponível de cada caixa usam as movimentações gravadas com ela; as sem caixa (compras, baixas e registros antigos) aparecem nas caixas em que a ferramenta está cadastrada; (d) uma ferramenta cadastrada em duas caixas tem entregas, vistorias e devoluções separadas por caixa. Baixas e compras seguem sem caixa. Nada novo no Supabase.

### Decisão 104: Número da caixa com a gestão completa; caixa só pelo número

Ordem do responsável em 08/10: em Ferramentas > Número da caixa, fazer toda a gestão das ferramentas por caixa (incluir cada caixa com suas ferramentas, histórico e movimentações por caixa, ocorrências). Depois: as caixas não são nomeadas por setor, são vinculadas a empregados e só têm o número como identificação. **Escolhas do Claude:** (a) cada caixa ganha os botões Ferramentas da caixa (incluir, tirar e mudar a quantidade; não deixa a quantidade ficar abaixo do que está com empregado nem tirar ferramenta que está com empregado), Dar baixa (motivo, ônus, data, empregado opcional; sem empregado a baixa sai do guardado na caixa, com empregado sai do que está com ele) e Registrar ocorrência; (b) a tabela da caixa ganha a coluna Baixado, e Disponível passa a descontar as baixas feitas na própria caixa; (c) a lista "Ocorrências da caixa" mostra as ocorrências gravadas com a caixa e, entre as antigas, as de ferramentas cadastradas nela; as ocorrências também aparecem em Ocorrências de Ferramentas; (d) baixa e ocorrência gravam `caixa_id` só no modo demonstração; (e) correção da revisão do PR #152: baixa sem empregado não reduz mais "Com empregado"; (f) o campo Nome sai do cadastro da caixa e de todas as telas (títulos, listas, termos, portadores, CSV); o nome gravado repete o código (CX-0001) para não quebrar a coluna do banco, e a busca é pelo número. Contas em `src/lib/controle-caixa.ts`, telas em `CaixaGestaoDialogs.tsx`. Nada no Supabase.

### Decisão 105: botão Vincular ferramentas em Número da caixa, também para caixa sem cadastro

Ordem do responsável em 08/10: em Número da caixa não aparecia um botão claro para vincular as caixas às suas ferramentas. **Escolhas do Claude:** (a) o botão "Ferramentas da caixa" passa a se chamar **Vincular ferramentas** (janela "Vincular ferramentas à caixa", botão Salvar vínculo), com a mesma lógica da decisão 104; (b) as caixas habilitadas em Caixas de Ferramentas > Habilitar caixas que ainda não têm cadastro aparecem na tela como "sem ferramentas vinculadas", cada uma com o botão Vincular ferramentas; ao salvar, a caixa é criada (empresa do cabeçalho, ou a primeira ativa; status Ativa; nome igual ao código) já com as ferramentas; (c) o filtro por número vale para essas caixas. Nada novo no Supabase.

### Decisão 106: uma ferramenta só pode estar em uma caixa; mudança só por baixa ou transferência

Ordem do responsável em 08/10: uma ferramenta salva dentro de uma caixa só pode ser vinculada a outra caixa se for dada baixa ou transferida; o sistema não permite a mesma ferramenta em duas caixas. **Escolhas do Claude:** (a) em Vincular ferramentas, a lista de ferramentas para incluir não mostra as que já estão em outra caixa (de qualquer empresa), e ao salvar o sistema confere de novo e barra com a mensagem "já está na caixa CX-xxxx. Dê baixa ou transfira"; (b) novo botão **Transferir** em cada caixa: escolhe a ferramenta e a caixa de destino, a ferramenta passa com a mesma quantidade (precisa estar guardada, sem empregado com ela, e não pode já estar no destino); entra primeiro no destino e só depois sai da origem, e a transferência fica no histórico das duas caixas (tipo Transferência, origem e destino); (c) a ferramenta só volta a ficar livre para outra caixa quando sai da sua caixa (tirada em Vincular ferramentas, depois de baixa total e devolução, ou transferida); (d) o histórico e as ocorrências passam a mostrar o nome da ferramenta mesmo depois que ela saiu da caixa; (e) caixas que já estavam com a mesma ferramenta repetida (dados antigos de demonstração) continuam como estão e só são ajustadas quando o responsável editar; nada é apagado. Só modo demonstração para o campo `caixa_id` da transferência; nada novo no Supabase. Na Fase 2 o banco deve ter uma restrição de uma ferramenta por caixa (registrada em docs/pendencias-fase2.md).

### Decisão 107: Vincular ferramentas com a lista de Parâmetros > Ferramentas e cadastro sem perder o vínculo

Ordem do responsável em 08/10: ao vincular uma ferramenta em Número da caixa, deve aparecer a lista suspensa que vem de Parâmetros > Ferramentas, com a tela de cadastro abrindo sem perder o cadastro em andamento, para salvar e voltar. **Escolhas do Claude:** (a) a lista suspensa de Vincular ferramentas vem do cadastro de Parâmetros > Ferramentas > Cadastrar Ferramenta (ferramentas ativas); as que já estão em outra caixa aparecem travadas, com "já na caixa CX-xxxx" (decisão 106), em vez de sumir; (b) o link **Cadastrar ferramenta** ao lado da lista abre a mesma tela de Cadastrar Ferramenta (com Novo item, Clonar, Editar e Excluir e as mesmas regras) numa janela por cima; o vínculo em andamento (ferramentas e quantidades já escolhidas) fica guardado; (c) o botão **Voltar ao vínculo** fecha a janela e a ferramenta recém-cadastrada já aparece na lista; (d) sem ferramenta livre, a lista avisa "cadastre uma nova". Nada novo no Supabase.

### Decisão 108: Restaurar padrão por linha em Parâmetros > Veículos > Itens check list

Ordem do responsável em 08/10: criar um botão de restaurar padrão para cada item da lista de Itens check list, para garantir que as informações voltem às configurações iniciais, por linha. **Escolhas do Claude:** (a) cada linha da lista ganha o botão **Restaurar padrão**, entre Editar e Excluir (decisão 45); (b) a janela de confirmação avisa que as alterações feitas na linha se perdem; (c) restaurar volta o **nome, os itens e os tipos de veículo** do grupo ao padrão de fábrica (decisões 62 e 64); o id do grupo fica (associações e check lists existentes continuam ligados) e os itens que já existiam mantêm o id; (d) só aparece nas linhas que fazem parte do padrão (mesmo nome, sem diferenciar maiúsculas); grupo criado pelo responsável não tem configuração inicial e não ganha o botão; (e) se o tipo de veículo do padrão não existe em Gerais, os tipos atuais ficam como estão e o aviso diz isso; (f) o botão serve também para quem tem permissão de gravar, como Editar. Só modo demonstração, salvo no navegador; nada no Supabase.

### Decisão 109: marca do menu lateral centralizada e animada

Ordem do responsável em 08/10: deixar o texto GEMAPE / Gestão de Patrimônio do menu mais bonito, centralizado e animado. **Escolhas do Claude:** (a) o bloco de texto ao lado da engrenagem fica centralizado no espaço que sobra; (b) GEMAPE ganha um brilho em degradê azul claro que percorre as letras, em ciclo de 5 segundos; (c) uma linha fina luminosa abaixo do nome "respira" (abre e fecha) em ciclo de 3,6 segundos; (d) "Gestão de Patrimônio" entra com fade, subida leve e espaçamento de letras que se fecha ao carregar a tela; (e) quem tem a opção de reduzir movimento no sistema vê tudo parado (nome branco, linha fixa, subtítulo sem entrada). Só visual, em `AppSidebar.tsx` e `styles.css`; tamanho da fonte, cores do menu e logo das engrenagens não mudam. Nada no Supabase.

### Decisão 110: Um único botão Restaurar padrão inicial no Itens check list (substitui a decisão 108)

Ordem do responsável em 08/10: criar um botão **Restaurar padrão inicial** ao lado de Cadastrar grupo do check list; os botões Restaurar padrão por linha (decisão 108) deixam de existir e viram esse botão único, que abre uma tela com todos os padrões iniciais do menu, escolhidos por caixa de seleção, e o sistema pergunta se tem certeza antes de salvar. **Escolhas do Claude:** (a) o botão fica no alto da lista, antes de Cadastrar grupo do check list; os botões por linha saem (Clonar, Editar e Excluir seguem a decisão 45); (b) a janela lista **todos** os grupos do padrão de fábrica (decisões 62 e 64), cada um com seus itens e a situação atual: Igual ao padrão, Alterado ou Não cadastrado; (c) nada vem marcado; há Marcar todos e Desmarcar todos, e Salvar só fica ativo com ao menos um grupo marcado; (d) ao salvar, uma confirmação diz quantos grupos serão restaurados, quantas alterações se perdem e quantos grupos excluídos voltam a ser cadastrados; (e) grupo existente volta ao nome, itens e tipos de veículo iniciais (o id fica e os itens que já existiam mantêm o id); grupo do padrão que foi excluído é cadastrado de novo; o que não foi marcado não muda; (f) tudo ou nada: se algo falhar, nada é gravado; (g) se o tipo de veículo do padrão não existe em Gerais, os tipos atuais ficam como estão (grupo recadastrado fica sem tipo) e o aviso diz isso. Só modo demonstração, salvo no navegador; nada no Supabase.

### Decisão 111: Restaurar padrão inicial também em Parâmetros > Veículos > Ações de manutenção

Ordem do responsável em 08/10: criar a mesma lógica e o botão "Restaurar padrão inicial" da decisão 110 em Ações de manutenção. **Escolhas do Claude:** (a) o botão fica no alto da lista, ao lado de Cadastrar padrão e Cadastrar ação de manutenção, e abre a mesma janela de escolha por caixa de seleção, com todas as 7 ações do padrão (decisão 46), seus subitens e a situação atual (Igual ao padrão, Alterado, Não cadastrada); (b) nada vem marcado, há Marcar todos e Desmarcar todos, e a confirmação antes de gravar diz quantas ações serão restauradas, quantas alterações se perdem e quantas excluídas voltam a ser cadastradas; (c) ação existente volta ao nome e aos subitens iniciais (o id fica e os subitens que já existiam mantêm o id); ação do padrão excluída é cadastrada de novo; ações criadas pelo responsável e as não marcadas não mudam; (d) tudo ou nada; (e) a janela e a regra são as mesmas do check list, num único componente. Tipos de ocorrência não foram mexidos (não foi pedido). Só modo demonstração, salvo no navegador; nada no Supabase.

### Decisão 112: Parâmetros > Veículos > Manutenção, uma página só com Ações de manutenção e Plano de manutenções

Ordem do responsável em 08/10: deixar numa só página Ações de manutenção e Cadastrar Plano de Manutenções, com o nome **Manutenção**. **Escolhas do Claude:** (a) o submenu de Parâmetros > Veículos passa a ter **Manutenção** no lugar dos dois itens antigos (decisão 43: continua no menu lateral, sem abas); (b) a página mostra, de cima para baixo, a lista **Ações de manutenção** (com Cadastrar padrão, Restaurar padrão inicial e Cadastrar ação de manutenção) e a lista **Cadastrar Plano de Manutenções**, cada uma com as mesmas telas, botões e regras de antes (decisões 46, 52, 110 e 111); (c) as ações vêm primeiro porque o plano usa os grupos de ação; (d) os endereços antigos (`/cadastros/veiculos-acoes-manutencao` e `/cadastros/veiculos-plano-manutencao`) continuam funcionando e levam à nova página; (e) os avisos que diziam "Parâmetros > Veículos > Ações de manutenção" ou "Plano de manutenções" passam a dizer "Manutenção". Nada muda nos dados. Só modo demonstração; nada no Supabase.

### Decisão 113: Parâmetros > Veículos > Check list, uma página só com os itens por tipo de veículo e a associação ao veículo

Ordem do responsável em 08/10: os Itens check list devem ser separados por tipo de veículo e a tela deve ser única, unida com Associar itens de check list a um veículo. **Escolhas do Claude:** (a) o submenu de Parâmetros > Veículos passa a ter **Check list** no lugar de "Itens check list" e "Associar itens de check list a um veículo" (decisão 43: menu lateral, sem abas); (b) a página mostra, de cima para baixo, **Itens check list** e **Associar itens de check list a um veículo**, cada uma com as mesmas telas, botões e regras de antes (decisões 62, 63, 64, 74, 108 e 110); (c) os itens ficam **separados por tipo de veículo**, numa faixa de título por tipo, na ordem de Parâmetros > Gerais, com a quantidade de grupos de cada tipo; (d) um grupo ligado a vários tipos aparece em cada um deles (é o mesmo grupo: editar ou excluir vale para todos) e a coluna Tipo de veículo continua mostrando todos os tipos dele; (e) os grupos de "todos os tipos" ficam numa faixa própria, e os sem tipo (ou com tipo que não existe mais) em "Sem tipo de veículo (não aparece em check list)"; faixa sem grupo não aparece; (f) o endereço antigo de Associar itens leva à nova página; os avisos que citavam as telas antigas passam a dizer "Check list". Nada muda nos dados. Só modo demonstração; nada no Supabase.

### Decisão 114: Logo GEMAPE 40 anos animada no menu lateral, no lugar das engrenagens

Ordem do responsável em 08/10: trocar o logotipo das engrenagens pela logo enviada (GEMAPE 40 anos, máquinas e peças) e deixá-la animada e bonita. **Escolhas do Claude:** (a) a imagem enviada (branca sobre fundo azul) virou um PNG com fundo transparente, recortado nas bordas (`src/assets/logo-gemape-40-anos.png`), para valer sobre o azul do menu; (b) a logo ocupa o lugar das engrenagens **e** do texto GEMAPE, porque a própria logo já traz o nome; abaixo ficam a linha e o subtítulo "Gestão de Patrimônio" da decisão 109; (c) animação: a logo entra com um leve zoom, um brilho azul-claro percorre as letras, e um halo pulsa devagar; para quem pede menos movimento tudo fica parado; (d) as engrenagens saem do menu; a engrenagem pequena das telas de acesso (login) não foi pedida e fica como está; (e) a imagem original do favicon e da página inicial (`public/logo.png`) não mudou. Nada no Supabase.

### Decisão 115: Parâmetros > Ferramentas sem o menu Tamanho e Medidas de Produto

Ordem do responsável em 08/10: eliminar o menu "Tamanho e Medidas de Produto" de Parâmetros > Ferramentas. **Escolhas do Claude:** (a) sai só do menu de Ferramentas; EPI e Uniformes mantêm o menu e a tela (decisões 86 e 89); (b) o endereço da tela não mudou, só o item saiu do menu; (c) Parâmetros Específicos continua em Ferramentas. Só visual; nada no Supabase.

### Decisão 116: Check list de veículo com periodicidade/responsável "não definido", obrigatório e nome Placa >> Periodicidade >> Responsável

Ordem do responsável em 08/10, em Parâmetros > Veículos > Check list: (a) a lista é separada por veículo e por check list, com o tipo (periódico ou avulso); (b) informa se o check list é obrigatório; (c) nos grupos habilitados existe a periodicidade "Não definida"; (d) o responsável pode ser "Não definido"; (e) periodicidade e pessoa não definidas = check list **livre**, feito a qualquer tempo por qualquer pessoa; (f) o nome de todo check list é PLACA >> PERIODICIDADE >> RESPONSÁVEL (com "Não definida"/"Não definido" quando falta); (g) o check list sem periodicidade e sem responsável não aparece na lista do menu (Módulos > Veículos > Check list), só na visão Avulsos. **Escolhas do Claude:** (1) os grupos habilitados do veículo se juntam por periodicidade e cada periodicidade é um check list (`checklistsDaAssociacao`); (2) tipo: Periódico quando a periodicidade está definida; Avulso quando não está mas há responsável; Livre quando nenhum dos dois; (3) obrigatório é marcado por grupo na janela (caixa "Check list obrigatório") e a lista mostra Sim, Não ou Parcial; associações antigas passam a Não; (4) um veículo continua com um responsável só; (5) "Não definida" não entra no painel do mês nem na periodicidade do veículo; (6) isto muda a regra da decisão 90 de que o check list sem periodicidade **ou** sem responsável ficava fora da lista: agora só fica fora o que não tem **nenhum** dos dois; muda também a decisão 74 (responsável deixa de ser obrigatório). Só modo demonstração; no banco real, a tabela de associação precisará de `obrigatorio`, de periodicidade nula e de responsável nulo (`docs/pendencias-fase2.md`).

### Decisão 117: Tamanhos por ferramenta em Parâmetros > Ferramentas > Parâmetros Específicos

Ordem do responsável em 08/10: em Parâmetros Específicos de Ferramentas, incluir os tamanhos das ferramentas conforme a planilha enviada e um campo para cadastrar mais tamanhos por ferramenta. **Escolhas do Claude:** (a) "ferramenta" aqui é o **grupo de ferramenta** (as colunas da planilha: Chave L, Chave boca, Chave estria, Meia lua, Combinada, Canhão, Alicates, Lima, Chave, Chave Philips, Chave de fenda, Torx, Chave Allen, Luva, Canhão Torx, Cachimbo); (b) nova seção "Tamanhos por ferramenta" abaixo de Grupos de ferramentas, com um cartão por grupo, os tamanhos como etiquetas com botão de excluir e o campo "Novo tamanho" + Adicionar (não aceita repetido); (c) o botão "Cadastrar tamanhos padrão" lança a planilha inteira, cria os grupos que faltam (Chave, Torx, Luva, Canhão Torx) e não muda nem apaga nada já cadastrado; "Chave Fenda" da planilha é o grupo Chave de fenda e "Alenn" é o grupo Chave Allen; Chave Philips e Canhão Torx vieram vazios; (d) os tamanhos ficam em texto livre, como na planilha (ex.: 06-07, 3/4 X 5/8, T10, 1,5, Corrente); (e) excluir um grupo leva os tamanhos dele; (f) por ora os tamanhos só são cadastrados: o Cadastrar Ferramenta ainda não os oferece (decisão 54, o modelo continua texto livre); falta ordem do responsável para ligar. Só modo demonstração; no banco real precisará de uma tabela de tamanhos por grupo (`docs/pendencias-fase2.md`).

Ordem do responsável em 08/10, em Parâmetros > Veículos > Check list: (a) a lista é separada por veículo e por check list, com o tipo (periódico ou avulso); (b) informa se o check list é obrigatório; (c) nos grupos habilitados existe a periodicidade "Não definida"; (d) o responsável pode ser "Não definido"; (e) periodicidade e pessoa não definidas = check list **livre**, feito a qualquer tempo por qualquer pessoa; (f) o nome de todo check list é PLACA >> PERIODICIDADE >> RESPONSÁVEL (com "Não definida"/"Não definido" quando falta); (g) o check list sem periodicidade e sem responsável não aparece na lista do menu (Módulos > Veículos > Check list), só na visão Avulsos. **Escolhas do Claude:** (1) os grupos habilitados do veículo se juntam por periodicidade e cada periodicidade é um check list (`checklistsDaAssociacao`); (2) tipo: Periódico quando a periodicidade está definida; Avulso quando não está mas há responsável; Livre quando nenhum dos dois; (3) obrigatório é marcado por grupo na janela (caixa "Check list obrigatório") e a lista mostra Sim, Não ou Parcial; associações antigas passam a Não; (4) um veículo continua com um responsável só; (5) "Não definida" não entra no painel do mês nem na periodicidade do veículo; (6) isto muda a regra da decisão 90 de que o check list sem periodicidade **ou** sem responsável ficava fora da lista: agora só fica fora o que não tem **nenhum** dos dois; muda também a decisão 74 (responsável deixa de ser obrigatório). Só modo demonstração; no banco real, a tabela de associação precisará de `obrigatorio`, de periodicidade nula e de responsável nulo (`docs/pendencias-fase2.md`).

### Decisão 118: Novo check list sem Tipo de veículo, com Tipo de check list (Periódico ou Avulso)

Ordem do responsável em 08/10 (19:33, 19:51 e 19:52): na janela "Novo check list" e na "Novo check list avulso", retirar o campo Tipo de veículo e incluir o campo **Tipo de check list: Periódico ou Avulso**. **Escolhas do Claude:** (a) as duas janelas viram uma só ("Novo check list"); o botão "Novo check list avulso" da visão Avulsos abre a mesma janela já em Avulso; (b) o campo Veículo lista todos os veículos ativos que têm tipo de check list; o tipo (para os itens do avulso sem associação) vem do próprio veículo; (c) Periódico: traz os grupos da periodicidade do veículo, com Responsável e, havendo mais de uma periodicidade, a troca entre elas; Avulso: sem responsável nem periodicidade, só com os grupos Avulso da associação (decisão 119), ou, sem associação, os grupos do tipo do veículo; (d) a escolha livre de periodicidade que existiu numa versão anterior desta decisão saiu: a periodicidade vem da associação do veículo. Só modo demonstração; nada no Supabase.

### Decisão 119: Cada veículo tem dois check lists, o periódico e o avulso; Associar itens vem primeiro na página

Ordem do responsável em 08/10: (a) em Parâmetros > Veículos > Check list, "Associar itens de check list a um veículo" aparece em primeiro lugar e depois os demais formulários (Itens check list); (b) dentro de Associar itens há o campo **Tipo de check list: Periódico ou Avulso**; (c) a lógica é que, por veículo, existem dois check lists: o **periódico**, mais apurado, e o **avulso**, só para registrar itens mais simples; (d) sim, o check list periódico traz só os grupos da sua periodicidade e o avulso só os grupos dele. **Escolhas do Claude:** (1) o campo Tipo de check list fica na janela ao lado de Veículo e Responsável e escolhe qual dos dois check lists do veículo está sendo montado: "Grupos habilitados" mostra os grupos do tipo escolhido e "Habilitar" os põe nesse tipo; os grupos dos dois tipos são salvos juntos, na mesma associação do veículo (um grupo só pode estar em um tipo); (2) grupo Periódico exige periodicidade definida (Diária, Semanal, Quinzenal ou Mensal); grupo Avulso não tem periodicidade e é guardado como "Não definida" (é a opção "Não definida" da decisão 116, que passa a existir só para o avulso); (3) o check list periódico traz só os grupos periódicos da sua periodicidade (se o veículo tem mais de uma, a janela Novo check list oferece trocar entre elas); o avulso traz só os grupos Avulso; veículo sem associação continua trazendo, no avulso, os grupos do tipo do veículo; (4) associações salvas sem tipo: periódico se tinham periodicidade definida, senão avulso; (5) o responsável continua um só por veículo; (6) o painel do mês e as previsões seguem usando só a periodicidade mais frequente do veículo (outras periodicidades do mesmo veículo ainda não entram no painel; falta ordem). Só modo demonstração; nada no Supabase.

### Decisão 120: Telas de cadastro abertas por cima da janela Associar itens, sem perder o preenchimento

Ordem do responsável em 08/10 (20:01): em "Associar itens de check list a um veículo", abrir por cima as telas de cadastro de que a associação depende, sem perder o cadastro em andamento, salvar e voltar. **Escolhas do Claude:** (a) três atalhos dentro da janela: "Cadastrar veículo" (sob o campo Veículo, tela Cadastro de Veículos), "Cadastrar itens de check list" (no painel Grupos de itens, tela Itens check list) e "Cadastrar empregado" (sob o campo Responsável, tela Empregados); (b) cada tela abre numa janela ao lado (nunca dentro) da janela da associação, como nas decisões 92 e 95; veículo, tipo de check list, responsável e grupos habilitados continuam como estavam; (c) ao fechar as telas de veículo e de empregado, as listas do campo Veículo e do campo Responsável são lidas de novo; os grupos novos aparecem sozinhos; (d) os atalhos só aparecem para quem pode gravar; (e) a tela de Empregados passou da rota para `EmpregadosCadastroModulo`, sem mudar o comportamento, para ser reaproveitada na janela (`DialogCadastroEmpregados`). Só modo demonstração; nada no Supabase.

### Decisão 121: Código do check list único, nunca reaproveitado

Ordem do responsável em 08/10 (20:24): os códigos dos check lists não podem se repetir; cada check list gera um código único. **Causa:** o código era o maior da lista mais um; ao descartar o último check list em andamento, o mesmo código voltava a ser entregue ao próximo. **Correção:** o sistema guarda o último número já entregue (`gemape-demo-checklists-veiculo-sequencia`) e o próximo código é maior que ele e que o maior código da lista; vale para periódico e avulso, que usam a mesma numeração CHK-0001. Dados antigos sem a sequência partem do maior código da lista. Só modo demonstração; no banco real, na Fase 2, a numeração deve vir de sequência com restrição única na coluna do código (registrado em `docs/pendencias-fase2.md`).

### Decisão 122: Ícones do menu lateral animados

Ordem do responsável em 08/10 (20:28): tornar os ícones dos menus laterais animados e bonitos visualmente. **Escolhas do Claude:** (a) cada ícone fica num quadrinho de vidro com gradiente e brilho, em todos os níveis do menu (grupos, módulos, parâmetros e submenus); (b) ao passar o mouse, o ícone balança e ganha brilho; (c) o item ativo ganha o quadrinho branco, com o ícone em azul e um pulso suave; (d) a seta de abrir e fechar não muda; (e) quem prefere menos movimento (`prefers-reduced-motion`) vê os ícones parados; (f) nos submenus, o ícone fica no alto, alinhado com a primeira linha do texto, mesmo quando o nome quebra em várias linhas (ajuste pedido às 20:35); o recuo dos itens filhos continua marcando a hierarquia. Só visual; sem mudança de comportamento nem de dados. Aguarda validação visual do responsável.

### Decisão 123: Vários check lists periódicos por veículo, um por periodicidade

Primeiro dos pendentes combinados com o responsável (09/10, "siga pela ordem sugerida"). **Antes:** o veículo só podia ter um check list periódico em andamento, qualquer que fosse a periodicidade. **Agora:** cada periodicidade da associação do veículo (por exemplo Semanal e Mensal) tem o seu check list periódico em andamento; só se bloqueia um segundo da mesma periodicidade. O avulso continua independente. Na Situação por veículo, o veículo aparece numa linha por periodicidade, com a coluna Periodicidade, a situação de cada uma e os botões Iniciar e Continuar próprios; o Iniciar abre o Novo check list já na periodicidade da linha. Veículo sem associação continua numa linha só. O painel do mês ainda usa a periodicidade mais frequente do veículo: isso é o próximo passo (painel com várias periodicidades). Só modo demonstração; nada no Supabase.

### Decisão 124: Painel do mês com várias periodicidades por veículo

Segundo dos pendentes combinados com o responsável (09/10, "siga pela ordem sugerida"), na sequência da decisão 123. **Antes:** o painel previa só a periodicidade mais frequente do veículo. **Agora:** o painel prevê uma vez por periodicidade da associação (um veículo Semanal e Mensal gera os prazos semanais e o prazo mensal), e cada previsão só é cumprida por check list concluído da própria periodicidade: um semanal não cobre o mensal, e o contrário também não. Os percentuais e a imutabilidade dos meses vencidos seguem as regras da decisão 80. Previsões antigas, gravadas só com a periodicidade mais frequente, continuam como estão; as novas passam a valer ao abrir o módulo. Só modo demonstração; nada no Supabase.

### Decisão 125: Check list obrigatório vale como cobrança no painel do mês

Terceiro dos pendentes combinados com o responsável (09/10). **Pergunta feita ao responsável:** o que significa ser obrigatório, já que a conclusão do check list sempre exigiu todos os itens avaliados. **Resposta (cartão, 09/10 11:22): "Cobrança no painel".** **Regra:** a periodicidade de um veículo é obrigatória se algum grupo periódico dela estiver marcado como "Check list obrigatório" na associação. No painel do mês, só as previsões obrigatórias entram nos percentuais, em Previstos no mês e em A vencer, e só elas podem ficar "Não realizado no prazo". As previsões opcionais aparecem na lista como "Opcional" (ou "Realizado no prazo", se foram feitas) e ficam fora dos percentuais; o cartão Previstos no mês informa quantas são. Previsões gravadas antes desta decisão, sem o campo, valem como obrigatórias. A previsão que ainda não venceu acompanha a associação; a vencida não muda (decisão 80). **Atenção:** os grupos já associados estão como não obrigatórios; até serem marcados, o painel os mostra como Opcional. A conclusão do check list não mudou. Só modo demonstração; nada no Supabase.

### Decisão 126: Campo "Check list: Obrigatório ou Não obrigatório" na janela Associar itens

Ordem do responsável em 09/10 (11:30), em Parâmetros > Veículos > Check list, com o print da janela Associar itens: incluir o campo Check list: Obrigatório ou Não obrigatório. A mensagem repetiu também os pontos da decisão 116 (grupos com "Não definida", responsável "Não definido", check list livre, nome Placa >> Periodicidade >> Responsável e ocultar da lista o que não tem periodicidade nem responsável); esses já estavam entregues e foram conferidos nos testes. **Escolhas do Claude:** (a) o campo "Check list" fica na primeira linha da janela, entre Tipo de check list e Responsável, com as opções Obrigatório e Não obrigatório; (b) ele vale para os grupos habilitados do tipo mostrado (periódico ou avulso) e para os que forem habilitados depois; (c) a caixa "Check list obrigatório" de cada grupo continua, para marcar um a um; se os grupos do tipo divergirem, o campo mostra "Misto (por grupo)"; (d) o efeito do obrigatório é o da decisão 125 (cobrança no painel do mês). Só modo demonstração; nada no Supabase.

### Decisão 127: Opção "Não definida" na periodicidade dos grupos habilitados

Ordem do responsável em 09/10 (11:40), com o print de Itens check list: nos grupos habilitados tem que ter a opção "Não definida". **Antes:** a lista de periodicidade do grupo periódico só tinha Diária, Semanal, Quinzenal e Mensal; "Não definida" só existia implícita no avulso. **Agora:** a lista também tem "Não definida". Ao escolhê-la, o grupo passa para o check list avulso (livre, feito a qualquer tempo), com aviso na tela, mantendo a regra da decisão 116 (periodicidade não definida = check list livre). Nenhuma mudança de dados: o avulso já guardava "Não definida". Sem necessidade nova de banco.

### Decisão 128: Resumo dos grupos habilitados com a periodicidade, na janela Associar itens

Ordem do responsável em 09/10 (11:47), com o print do quadro "Grupos habilitados no check list periódico" mostrando só "3 grupo(s) no check list avulso": mostrar na tela quais grupos foram habilitados e a periodicidade de cada um. **Antes:** o quadro dizia só a quantidade de grupos do outro tipo. **Agora:** abaixo da lista do tipo escolhido há o resumo com todos os grupos habilitados (periódicos e avulsos), cada um com tipo e periodicidade (avulso = Não definida; periódico sem escolha = "periodicidade a escolher"). Só exibição, sem mudança de dados nem de banco.

### Decisão 129: Sem checkbox de obrigatório por grupo; só a lista suspensa "Check list"

Ordem do responsável em 09/10 (11:53), com o print do checkbox "Check list obrigatório" em cada grupo habilitado: retirar o checkbox e deixar somente o campo já existente da lista suspensa. **Antes:** cada grupo habilitado tinha um checkbox de obrigatório, além da lista suspensa Check list (decisão 126). **Agora:** só a lista suspensa Check list (Obrigatório / Não obrigatório) define a obrigatoriedade dos grupos do tipo na tela. Os dados guardados não mudam. Sem necessidade nova de banco.

### Decisão 130: Itens mais simples no check list avulso (5 grupos "Avulso · ...")

Ordem do responsável em 09/10 (12:00 e 12:01): ao preencher um check list avulso devem aparecer itens mais simples, e o cadastro do avulso deve conter 5 grupos (Mecânicos e funcionamento, Pneus e rodas, Iluminação e sinalização, Segurança, Conforto e limpeza), com os itens da lista que ele enviou; o preenchimento segue o padrão atual, com OK, NOK e N.A. **Antes:** o avulso usava os mesmos grupos do periódico. **Agora:** o padrão inicial (botões Cadastrar padrão e Restaurar padrão inicial) traz 5 grupos "Avulso · ..." (16 itens, ver decisão 131), válidos para todos os tipos de veículo. Na janela Associar itens, o check list avulso oferece só os grupos "Avulso · ..." e o periódico oferece os demais; no Novo check list avulso de veículo sem associação, entram só os grupos "Avulso · ...". Como o responsável não aprovou campo novo, o grupo é do avulso pelo prefixo do nome, sem campo extra no cadastro. Check lists avulsos já feitos e associações já salvas não mudam. Sem necessidade nova de banco.

### Decisão 131: Itens do check list avulso reduzidos e item "Outros" aberto

Ordem do responsável em 09/10 (12:12), sobre a decisão 130: tirar do avulso os itens Kit de primeiros socorros, Nível do óleo da transmissão, Bateria, Luz de freio, Luz de ré, Pisca-alerta, Setas, Iluminação do painel, Extintor, Triângulo, Limpador e lavador do para-brisa, Palhetas e Bancos e cintos limpos; e incluir um campo "Outros", deixado aberto. **Antes:** 5 grupos "Avulso · ..." com 28 itens. **Agora:** 6 grupos com 16 itens: Mecânicos e funcionamento (5), Pneus e rodas (4), Iluminação e sinalização (2), Segurança (1), Conforto e limpeza (3) e o novo "Avulso · Outros", com o item "Outros (descreva na observação)", que é avaliado como os demais (OK, NOK, N.A.) e tem a observação aberta para o texto livre. Quem já cadastrou o padrão usa "Restaurar padrão inicial" para atualizar. Sem necessidade nova de banco.

### Decisão 132: Ajuste automático dos grupos "Avulso · ..." já cadastrados

Ordem do responsável em 09/10 (12:20): a alteração dos 13 itens (decisão 131) não apareceu no navegador dele. **Causa:** o "Cadastrar padrão" só acrescenta grupos que faltam e não altera os que já existem; quem cadastrou o padrão antes da decisão 131 continuou com os 28 itens. **Agora:** ao ler os cadastros, uma única vez por navegador, os grupos "Avulso · ..." do padrão perdem os 13 itens retirados e o grupo "Avulso · Outros" é incluído se faltar (id fixo, para não quebrar associações). Itens que o responsável acrescentou e grupos que ele criou não são tocados; depois de qualquer alteração salva, o ajuste não roda mais, então um item retirado e recolocado por ele permanece. Sem necessidade nova de banco.

### Decisão 133: Campo Tamanho no Cadastrar ferramenta

Ordem do responsável em 09/10 (12:39), com o print da janela Cadastrar ferramenta: incluir o campo tamanho de ferramentas, com os tamanhos puxados do cadastro que já existe em Parâmetros Específicos. **Escolhas do Claude:** (a) os tamanhos vêm da lista do **grupo de ferramenta** escolhido (decisão 117, "Tamanhos por ferramenta"); trocar o grupo limpa o tamanho; (b) o campo é opcional, com a opção "Sem tamanho", porque nem todo grupo tem tamanhos; (c) grupo sem tamanhos mostra o aviso para cadastrar em Parâmetros > Ferramentas > Parâmetros Específicos; (d) na edição, um tamanho já gravado que saiu da lista do grupo continua aparecendo como "(fora de Parâmetros Específicos)"; (e) a descrição automática (grupo, modelo e marca) não muda; (f) a lista de ferramentas e a exportação ganham a coluna Tamanho; (g) fica ao lado do Estoque mínimo, sem mudar o resto da janela. A decisão 115 (sem o menu Tamanho e Medidas de Produto em Ferramentas) não muda: o tamanho vem só de Parâmetros Específicos. No banco real, a tabela `ferramentas` precisará de uma coluna de tamanho (registrado em pendencias-fase2). Nada no Supabase.

### Decisão 134: Sem os cartões Diversos e Luva em Tamanhos por ferramenta

Ordem do responsável em 09/10 (12:42), com o print dos cartões Diversos e Luva (e confirmação no cartão de decisão: "Diversos e Luva"). **Antes:** a seção Tamanhos por ferramenta (decisão 117) mostrava um cartão para cada grupo, inclusive Diversos (sem tamanhos) e Luva (Anticorte, Antiimpacto, Raspa, Vaqueta). **Agora:** os dois cartões não aparecem; o "Cadastrar tamanhos padrão" não lança mais a coluna Luva nem cria o grupo Luva; e o campo Tamanho do Cadastrar ferramenta (decisão 133) não oferece opções para esses grupos. Nada é apagado: os grupos e os tamanhos já gravados continuam guardados, e basta tirar o grupo da lista `GRUPOS_SEM_TAMANHO` para voltarem. Só visual. Nada no Supabase.

### Decisão 135: Tamanhos da Chave de fenda

Ordem do responsável em 09/10 (12:47): incluir os tamanhos de chave de fenda `1/8" x 3" (3x75 mm)`, `3/16" x 4" (5x100 mm)`, `1/4" x 4" (6,5x100 mm)`, `1/4" x 6" (6,5x150 mm)`, `5/16" x 6" (8x150 mm)` e `3/8" x 8" (10x200 mm)`. **Antes:** a coluna Chave de fenda do padrão (decisão 117) estava sem tamanhos. **Agora:** os 6 tamanhos entram no padrão (botão Cadastrar tamanhos padrão) e, uma vez por navegador, são acrescentados sozinhos ao grupo Chave de fenda de quem já tem cadastros salvos, sem repetir e sem apagar nada; depois de qualquer alteração salva, um tamanho que o responsável excluir não volta. Os tamanhos aparecem no campo Tamanho do Cadastrar ferramenta (decisão 133). Sem necessidade nova de banco.

### Decisão 136: O tipo do check list define se é obrigatório

Ordem do responsável em 09/10 (17:25), com o print da janela Associar itens de check list a um veículo. **Antes:** campos Veículo, Tipo de check list, Check list (Obrigatório/Não obrigatório) e Responsável. **Agora:** a ordem é Veículo, Responsável e Tipo de check list (periódico ou avulso); o campo Check list (Obrigatório/Não obrigatório) saiu. **Periódico é sempre obrigatório** (entra nos KPI e nos percentuais do painel) e **avulso nunca é obrigatório** (não entra nos KPI). Isso vale ao salvar e também ao ler associações gravadas antes (periódico antigo marcado como não obrigatório passa a obrigatório; avulso marcado como obrigatório passa a não obrigatório). Um grupo que passa para avulso por "Não definida" deixa de ser obrigatório. **Escolha do Claude:** o nome do terceiro campo continua "Tipo de check list", para não confundir com a periodicidade de cada grupo. Substitui a decisão 126 (campo Check list). Sem necessidade nova de banco. Nada no Supabase.

### Decisão 137: Janela Associar só com Veículo, Responsável e Periodicidade

Ordem do responsável em 09/10 (17:28), "os demais campos saem", confirmada no cartão de decisão ("Periodicidade única"). **Antes:** além dos campos, a janela tinha a escolha dos grupos de itens, a periodicidade de cada grupo e o resumo (decisões 119, 127, 128, 130). **Agora:** a janela tem só **Veículo, Responsável e Periodicidade** (Diária, Semanal, Quinzenal, Mensal ou **Avulso**); saíram a seção de grupos, o habilitar/remover, a periodicidade por grupo, o resumo e o campo Não definida por grupo. **Periodicidade escolhida = check list periódico**, obrigatório (decisão 136), com todos os grupos do periódico que valem para o tipo do veículo e a periodicidade escolhida. **Avulso** = só os grupos "Avulso · ...", não obrigatórios. Ao editar, a periodicidade volta do que está gravado. Substitui as decisões 119 (tipo na janela), 127, 128 e 130 na tela; a lista de associações e o painel não mudam. Nada no Supabase.

### Decisão 138: Clonar copia todas as informações, com código novo

Ordem do responsável em 09/10 (17:48): em todos os botões Clonar do sistema, o formulário abre com **todas as informações** do item clonado, todas editáveis, e o código é novo; o Clonar serve para aproveitar o que já está cadastrado. **Antes** (decisão 45 e seguintes) os campos únicos ficavam em branco. **Agora** são copiados: CNPJ (Empresas e Fornecedores), CPF, matrícula e e-mail (Empregados), placa, RENAVAM, quilometragem e aquisição (Veículos), modelo (Ferramentas), sigla (Código do Produto), código na nota (Código de Fábrica), nome (Tipos de ocorrência e Ações de manutenção) e o responsável (Associar itens de check list). **EPI e Uniforme:** o Clonar deixa de ser a janela curta e abre o formulário Novo preenchido (descrição, subcategoria, unidade e estoque mínimo editáveis); a mesma descrição vale em outro tamanho (com a mesma subcategoria e unidade), e descrição nova vira item novo. **Continuam em branco, por não poderem repetir:** a data de demissão do empregado, o número da caixa (escolhido entre os livres), o portador da caixa, o EPI da ficha (um por EPI), o veículo do plano de manutenção e da associação de check list (um por veículo). Os campos copiados que precisam ser únicos (CNPJ, CPF, placa) continuam validados ao salvar; se o usuário não editar, o sistema avisa que já existe. Endereçamento mantém o Clonar que pergunta o código de origem. Revoga em parte as decisões 45 e 54. Nada no Supabase.

### Decisão 139: Ícones do menu Parâmetros > EPI alinhados

Ordem do responsável em 09/10 (17:52), com o print do menu EPI: alinhar os ícones e, ao selecionar um item, o ícone fica colorido como em Empresas, Empregados e Fornecedores. **Antes:** Cadastrar EPI ficava 1 pixel à direita dos demais e Cadastrar Ficha de EPI recuado 16 pixels, então os ícones não formavam uma coluna. **Agora:** os quatro itens (Cadastrar EPI, Cadastrar Ficha de EPI, Parâmetros Específicos e Tamanho e Medidas de Produto) têm o ícone na mesma coluna, e a Ficha vem logo abaixo de Cadastrar EPI, sem recuo (muda só a decisão 37 no desenho do menu). O ícone colorido do item selecionado já funcionava nos quatro itens (conferido no ambiente local) e continua igual. Só visual; nada no Supabase.

### Decisão 140: Sem o botão Cadastrar padrão em Ações de manutenção

Ordem do responsável em 09/10 (18:11): em Parâmetros > Veículos > Manutenção, eliminar o botão **Cadastrar padrão**. **Antes:** a lista de Ações de manutenção tinha Cadastrar padrão, Restaurar padrão e Cadastrar ação de manutenção. **Agora:** o botão Cadastrar padrão sai dessa tela; ficam Restaurar padrão e Cadastrar ação de manutenção. **Escolha do Claude:** a ordem falou só da tela Manutenção, então Tipos de ocorrência e Itens check list continuam com o Cadastrar padrão deles. Nada é apagado: as ações já cadastradas e o padrão (função `cadastrarPadraoVeiculos`, que ainda alimenta Tipos de ocorrência) seguem iguais. Só visual; nada no Supabase.

### Decisão 141: Restaurar configurações iniciais em Ações de manutenção

Ordem do responsável em 09/10 (18:13): em Parâmetros > Veículos > Manutenção, o botão **Restaurar padrão inicial** passa a se chamar **Restaurar configurações iniciais**. O nome vale para o botão e para o título da janela que ele abre; o funcionamento não muda (marcar o que restaurar e confirmar, tudo de uma vez). **Escolha do Claude:** só a tela Manutenção muda; em Itens check list o botão continua com o nome antigo. Só visual; nada no Supabase.

### Decisão 142: Restaurar configurações iniciais escolhendo pais e filhos

Ordem do responsável em 09/10 (print da janela): a janela **Restaurar configurações iniciais** das Ações de manutenção deve listar os pais e os filhos iniciais, permitindo escolher quais pais e quais filhos restaurar, sem obrigar a restaurar todos os filhos; a lista fica semelhante à de Parâmetros Específicos de ferramenta, com checkbox nos filhos. **Antes:** a janela mostrava só os 7 pais, com um checkbox por pai. **Agora:** cada pai aparece com seus filhos iniciais, cada um com checkbox e a situação (já cadastrado ou não cadastrado). Marcar um filho marca o pai; Marcar todos/Desmarcar todos e contagem de pais e filhos escolhidos. Ao confirmar, tudo de uma vez: pai marcado volta ao nome inicial (ou é cadastrado de novo se foi excluído) e só os filhos marcados são restaurados ou incluídos. Filhos não marcados e os que o responsável criou ficam como estão. **Escolha do Claude:** a situação do pai é pelo nome; pai renomeado aparece como não cadastrado. Só vale em Ações de manutenção; Itens check list segue como estava. Nada no Supabase (dados locais do modo demonstração).

### Decisão 143: Logo 40 anos animado na tela de entrada

Ordem do responsável em 09/10 (18:35), com o print do logo: na tela inicial de entrada do sistema, colocar o ícone com a mesma animação e o layout igual ao do anexo. **Antes:** a tela de entrada mostrava a engrenagem girando e o texto "GEMAPE" dentro do cartão. **Agora:** o logo GEMAPE 40 anos aparece acima do cartão, com a mesma animação do menu lateral (entrada com zoom, brilho percorrendo as letras e halo), a linha de brilho e o subtítulo "Gestão de Patrimônio", como no anexo. Vale para as três versões da tela (demonstração, login e conexão não configurada); quem pede menos movimento vê o logo parado. Só visual; nada no Supabase.

### Decisão 144: Restaurar configurações iniciais lista também o que o responsável criou

Ordem do responsável em 09/10 (18:44): nas Ações de manutenção, mostrar os pais e filhos criados pelo usuário ao longo do tempo, para o padrão poder ser completamente revisado, mantendo a lista com checkbox também nos filhos. Resposta ao cartão (18:45): **só listar**. **Antes:** a janela mostrava só o padrão inicial. **Agora:** abaixo do padrão aparece a seção **Criados por você**, com as ações criadas (e todos os subitens) e os subitens extras dentro de ações do padrão, cada um com checkbox. **Escolha do Claude:** como a ordem foi só listar, marcar esses itens é só conferência e não altera nada ao salvar (a seção avisa isso); excluir ou editar continua pelos botões da lista de Ações de manutenção. Nada no Supabase.

### Decisão 145: Alerta Sim ou Não ao salvar em Ações de manutenção

Ordem do responsável em 09/10 (18:52): criar um alerta de salvamento: "As alterações feitas modificarão o painel com os itens de manutenção. Tem certeza que deseja fazer isso?", com as respostas Sim ou Não. **Antes:** Cadastrar/Editar ação de manutenção gravava direto, e Restaurar configurações iniciais usava a caixa de confirmação simples do navegador. **Agora:** nas duas telas, ao clicar em Salvar abre o alerta com esse texto e os botões **Não** (volta à janela sem gravar) e **Sim** (grava). Na janela Restaurar configurações iniciais o alerta também traz o resumo do que será restaurado. **Escolha do Claude:** a ordem não disse onde; vale para salvar ação (nova, editada ou clonada) e para restaurar configurações iniciais. Excluir ação mantém a pergunta que já tinha, e as demais listas de Veículos não mudam. Nada no Supabase.

### Decisão 146: Novo texto do alerta de salvar e alerta também no Plano de manutenções

Ordem do responsável em 09/10 (19:21): dentro do menu de Parâmetros > Manutenção, configurar a mensagem de salvamento: "As alterações feitas modificarão o painel de manutenções. Na rotina de parâmetros. Definitivamente. Tem certeza que deseja fazer isso?". **Antes:** o alerta da decisão 145 dizia "As alterações feitas modificarão o painel com os itens de manutenção. Tem certeza que deseja fazer isso?" e só aparecia em Ações de manutenção. **Agora:** o texto é "As alterações feitas modificarão o painel de manutenções na rotina de parâmetros. Definitivamente. Tem certeza que deseja fazer isso?", com Sim e Não, e aparece ao salvar nas duas listas da página Manutenção: Ações de manutenção (cadastrar, editar, clonar e restaurar configurações iniciais) e Plano de manutenções. **Escolha do Claude:** o ditado foi transcrito numa só frase, sem a divisão em três pedaços; excluir segue com a pergunta que já tinha. Nada no Supabase.

### Decisão 147: Novo texto de apoio da página Manutenção

Ordem do responsável em 09/10 (19:28), com o print do texto no alto da página Parâmetros > Veículos > Manutenção: trocar por "permite revisar o painel de manutenções e o nome da rotina de parâmetros relacionado ao menu de manutenção. E redefine seus itens e organização. As modificações selecionadas não poderão ser desfeitas." Às 19:30 o responsável reescreveu o texto: "Permite revisar o painel de nome da rotina de manutenção ao qual está diretamente relacionado. E redefinir seus itens e organização. As modificações selecionadas não poderão ser desfeitas." (vale esta última redação) **Antes:** "As ações de manutenção e o plano de manutenções de cada veículo, na mesma página: primeiro as ações, depois o plano que as usa." **Agora:** "Permite revisar o painel de nome da rotina de manutenção ao qual está diretamente relacionado, e redefinir seus itens e organização. As modificações selecionadas não poderão ser desfeitas." **Escolha do Claude:** juntei as duas primeiras frases do ditado com vírgula e comecei com maiúscula; as palavras são as do responsável, inclusive "painel de nome da rotina de manutenção", que ficou como ditado. Só texto; nada no Supabase.

### Decisão 148: Check list com os itens primeiro e escolha dos itens ao associar

Ordem do responsável em 09/10 (19:37), com o print da página Parâmetros > Veículos > Check list: a primeira coisa é cadastrar os itens do check list, então eles têm que vir no topo; depois vem associar itens de check list a um veículo; em seguida são selecionados os que comporão aquele check list; a periodicidade não é informada item em item, mas no início da criação do check list, abrangendo todos os itens. **Antes:** a página abria com Associar itens a um veículo e, abaixo, Itens check list; a janela Associar tinha Veículo, Responsável e Periodicidade, e levava automaticamente todos os itens do tipo do veículo (decisão 137). **Agora:** (1) a página mostra primeiro Itens check list e depois Associar itens a um veículo, com o texto de apoio ajustado à nova ordem; (2) na janela Associar, depois de Veículo, Responsável e Periodicidade (uma só, que vale para todos), aparece a lista **Itens que compõem o check list**, com um checkbox por item que serve ao tipo do veículo (e só os avulsos quando a periodicidade é Avulso), Marcar todos e Desmarcar todos; só os marcados entram na associação. **Escolha do Claude:** "itens" são os itens do cadastro Itens check list, que se agrupam por tipo de veículo e seção (ex.: Veículos leves · Mecânica), então o checkbox é por item do cadastro, como ele aparece na lista; ao escolher o veículo ou a periodicidade, todos vêm marcados e podem ser desmarcados; é preciso marcar ao menos um. A periodicidade segue única, sem escolha item a item. Nada no Supabase (dados locais do modo demonstração).

### Decisão 149: Validar o formulário antes de abrir o alerta Sim ou Não

Ordem do responsável em 09/10 (19:42): "valide". **Antes:** nas Ações de manutenção e no Plano de manutenções, o alerta Sim/Não abria sempre ao clicar em Salvar, mesmo com o formulário inválido (nome repetido, veículo sem escolher, limites faltando); o erro só aparecia depois do Sim. **Agora:** ao clicar em Salvar o formulário é validado primeiro, com as mesmas regras do salvamento, e o erro aparece na hora; o alerta só abre se estiver tudo certo. **Como:** a validação ensaia a gravação numa cópia em memória, sem gravar nada. Nada no Supabase.

### Decisão 150: Texto de apoio da página Manutenção em linguagem mais simples

Ordem do responsável em 09/10 (19:42): "faça a revisão de forma mais simples", sobre o texto da decisão 147. **Antes:** "Permite revisar o painel de nome da rotina de manutenção ao qual está diretamente relacionado, e redefinir seus itens e organização. As modificações selecionadas não poderão ser desfeitas." **Agora:** "Permite revisar o painel de manutenções, redefinir seus itens e a organização deles. O que for salvo não poderá ser desfeito." **Escolha do Claude:** o responsável não ditou o novo texto; mantive a ideia (revisar o painel, redefinir itens e organização, não desfaz) com palavras do dia a dia. Se preferir outra redação, é só ditar. Só texto; nada no Supabase.

### Decisão 151: Excluir os itens "Criados por você" marcados na janela Restaurar configurações iniciais

Ordem do responsável em 09/10 (19:42), sobre a seção da decisão 144: "se a ideia é revisar o padrão por completo, o passo natural seria excluir ou editar os itens marcados. sim." **Antes:** a seção "Criados por você" só listava (marcar era só conferência). **Agora:** os itens marcados são **excluídos** ao salvar, e o alerta Sim/Não avisa quantos e que não dá para desfazer. Pai marcado: some a ação criada por você ou, numa ação do padrão, os subitens extras dela; filho marcado: some só esse subitem. Pode misturar com restaurar padrão na mesma gravação, tudo de uma vez. **Editar:** continua pelo botão Editar da lista de ações (a janela não edita texto). **Escolhas do Claude:** só o Administrador vê os checkboxes e exclui (regra do projeto para exclusões de cadastro); o padrão inicial nunca é apagado por esta seção. Substitui a escolha "Só listar" da decisão 144. Nada no Supabase.

### Decisão 152: Itens check list sem "Cadastrar padrão" e botão "Restaurar configurações iniciais"

Ordem do responsável em 09/10 (20:00), com o print dos dois botões: mudar o nome do botão "Restaurar padrão inicial" para "Restaurar configurações iniciais" e remover o botão "Cadastrar padrão". **Antes:** a lista Itens check list (Parâmetros > Veículos > Check list) tinha "Cadastrar padrão" e "Restaurar padrão inicial". **Agora:** só "Restaurar configurações iniciais" (o título da janela acompanha). O padrão que faltar continua sendo cadastrado por essa janela, que lista os itens ausentes. **Escolha do Claude:** o print não dizia a tela; apliquei na lista Itens check list, a única com os dois botões juntos. Tipos de ocorrência continua com "Cadastrar padrão", sem botão de restaurar. Se era para outra tela, é só avisar. Nada no Supabase.

### Decisão 153: Itens vinculados ao tipo de veículo; avulso só para veículos leves

Ordem do responsável em 09/10 (20:11), com o print da janela Associar itens de check list (Empilhadeira com Avulso): "os itens do check list serão vinculados ao tipo de veículo e não periodicidade. O avulso se aplicará apenas a veículos leves." **Antes:** a opção Avulso aparecia para qualquer veículo, e a Empilhadeira do print recebia os seis grupos "Avulso · ...". **Agora:** os itens que aparecem na janela dependem do tipo do veículo (a periodicidade vale igual para todos os itens marcados, sem escolher item a item), e **Avulso só pode ser escolhido para veículos leves** (carro de passeio, SUV/utilitário/picape e van). Para os demais tipos a opção aparece desativada ("só veículos leves"); trocar para um veículo que não é leve limpa o Avulso escolhido. Na tela de Check list de veículos, o avulso de veículo sem associação também só traz itens se o veículo for leve. **Escolhas do Claude:** moto, caminhão, ônibus e empilhadeira não são leves; os grupos "Avulso · ..." continuam cadastrados como estão (a regra vale na escolha, não nos dados); associações avulsas que já existam para outros tipos não foram apagadas. Se "leves" incluir outros tipos, é só avisar. Nada no Supabase.

### Decisão 154: Lista de itens associados sem botões por linha

Ordem do responsável em 09/10 (20:21): "nos itens na lista que mostra os itens associados a um checklist não deve existir em cada linha os botões clonar, editar e excluir". **Antes:** em Parâmetros > Veículos > Check list, a lista de associação (veículo, periodicidade, responsável e grupos) tinha a coluna Ações com Clonar, Editar e Excluir em cada veículo. **Agora:** a coluna Ações saiu; a lista só mostra as associações, e o botão "Associar itens" no alto continua. **Escolha do Claude:** entendi "lista que mostra os itens associados a um checklist" como a lista de associação ao veículo; a lista Itens check list (grupos por tipo de veículo) não mudou. Sem os botões, não dá mais para editar nem excluir uma associação já feita pela tela; se isso for um problema, uma saída é abrir a edição ao clicar na linha. Nada no Supabase.

### Decisão 155: Avulso para qualquer veículo; itens definidos pelo tipo do veículo

Ordem do responsável em 09/10 (20:25), com o print da janela Associar (Fiat Strada com Avulso desativado): "quando for montar o checklist, os itens devem ser por tipo de veículo. E o avulso puxará os itens simples. Todos os equipamentos poderão fazer check list avulso. O que define o checklist é o tipo de veículo e não a periodicidade." **Substitui a decisão 153.** **Antes:** Avulso só podia ser escolhido para veículos leves (a Strada do print ficava com a opção desativada), e a janela só mostrava os itens depois de escolher a periodicidade. **Agora:** Avulso vale para **qualquer veículo** e traz os itens simples (grupos "Avulso · ..."); os demais itens aparecem **assim que o veículo é escolhido**, pelo tipo dele, sem depender da periodicidade, e a periodicidade escolhida vale para todos os marcados. O mesmo vale na tela de Check list de veículos para o avulso de veículo sem associação. **Escolha do Claude:** ao escolher Avulso, a lista troca para os itens simples; ao voltar para uma periodicidade, volta para os itens do tipo. Nada no Supabase.

### Decisão 156: Clonar na associação volta no cabeçalho do check list e abre com tudo do original

Ordem do responsável em 13/10 (17:03 e 17:06): ao clicar em Clonar, a tela deve mostrar o check list original com todos os itens já associados, o veículo, o responsável e a periodicidade, para informar só o ponto que muda. **Antes** (decisão 154): a lista de associados ficou sem os botões Clonar, Editar e Excluir, e o Clonar antigo abria com o veículo em branco. **Agora:** os botões ficam uma vez só, no cabeçalho de cada check list (a linha do veículo), e não nas linhas dos itens; Clonar, Editar e Excluir abrem com veículo, responsável, periodicidade e itens do original. No Clonar o veículo aparece preenchido, mas o clone precisa de outro veículo: salvar sem trocar mostra "Escolha outro veículo para o clone: este já tem o check list original." (cada veículo tem uma associação só). Restringe a decisão 154 às linhas dos itens. Nada no Supabase.

### Decisão 157: Módulos > Veículos > Check list: primeiro o veículo, depois o tipo de check list

Ordem do responsável em 13/10 (17:08), com o print da janela Novo check list: as perguntas devem ser Veículo e, em seguida, Tipo de check list, e nesse momento aparecem as opções de check list existentes (associados) ao veículo no formato padrão, com placa, responsável e periodicidade. **Antes:** a janela perguntava o Tipo de check list (Periódico ou Avulso) antes do veículo, e a periodicidade era escolhida em links abaixo. **Agora:** 1) Veículo; 2) Tipo de check list, que só abre depois do veículo e lista um item por periodicidade associada a ele, no formato pedido pelo responsável, **Placa >> Responsável >> Periodicidade**, mais a opção **Placa >> Avulso**; 3) o responsável vem da associação e só é perguntado quando a associação está com responsável "Não definido". Trocar de veículo limpa o tipo escolhido se o novo veículo não tem aquela opção. O botão Iniciar da situação por veículo abre a janela já com o veículo e a periodicidade daquela linha. Nada no Supabase.

Observação de formato: nesta janela as opções seguem a ordem escrita no pedido, Placa >> Responsável >> Periodicidade. O nome do check list na lista, na associação e na decisão 90 continua Placa >> Periodicidade >> Responsável; se quiser a mesma ordem em todo o sistema, é uma decisão nova.

### Decisão 158: Link para cadastrar os itens de dentro da janela Associar

Ordem do responsável em 13/10 (17:17), com o print da janela Associar itens de check list a um veículo: criar um link na tela para cadastrar os itens que compõem o check list, indo e voltando sem sair do formulário. **Antes:** sem item para o veículo, a janela só dizia "Cadastre em Itens check list", e o responsável tinha de fechar o formulário. **Agora:** abaixo de "Itens que compõem o check list" há o link **Cadastrar itens de check list** (só para quem escreve), que abre a tela Itens check list, a mesma de Parâmetros > Veículos > Check list, numa janela ao lado do formulário. Ao fechar, o formulário continua como estava (veículo, responsável, periodicidade e marcações) e a lista de itens já mostra os novos. Nada no Supabase.

### Decisão 159: Subgrupos (filhos) dos grupos de ferramenta, na tela de Parâmetros Específicos

Ordem do responsável em 13/10 (17:28), com o print das Ações de manutenção como modelo, e respostas das 17:30 ("Manter grupos" no cartão e "tudo na mesma página"): os grupos de ferramenta cadastrados (Chave de fenda, Chave estria, Meia lua, pais) precisam dos subgrupos associados (numerações e especificações, filhos), numa tela igual à das Ações de manutenção. **Antes:** Parâmetros > Ferramentas > Parâmetros Específicos mostrava a lista Grupos de ferramentas e, abaixo, cartões "Tamanhos por ferramenta" (decisão 117) com os tamanhos em etiquetas. **Agora:** a lista Grupos de ferramentas continua onde estava (é onde se cria, renomeia, ativa e exclui o grupo, com as travas de uso) e, na mesma página, os cartões deram lugar à tabela **Nome | Subgrupos | Ações**, com **Cadastrar padrão**, **Restaurar configurações iniciais** e **Cadastrar subgrupos**. Sem o botão Clonar (ordem das 17:37, com o print da tabela: "retirar os botões clonar, deixar somente editar e excluir"): cada linha tem só Editar, que troca a lista de subgrupos do grupo (o nome é mudado na lista de grupos), e Excluir (só Administrador), que esvazia os subgrupos e o grupo continua. Cadastrar soma e recusa subgrupo repetido; Editar substitui; tudo ou nada. Os subgrupos são os mesmos tamanhos que alimentam o campo Tamanho do Cadastrar ferramenta (decisões 117 e 133), então nada muda ali; Diversos e Luva continuam fora (decisão 134). Necessidade para a Fase 2: coluna ou tabela de subgrupos por grupo de ferramenta. Nada no Supabase.

### Decisão 160: Sem a seção EPIs antigos no Cadastro EPI

Ordem do responsável em 13/10 (17:33), com o print da seção: em Parâmetros > EPI > Cadastro EPI, "não precisa ter o item EPIs antigos; eliminar isso". **Antes:** abaixo da lista de EPIs aparecia o quadro "EPIs antigos" (cadastrados antes do catálogo por tamanho, como o EPI-0001 Capacete de segurança), com o botão Separar por tamanho (só Administrador) e o aviso dos já separados. **Agora:** o quadro, o botão, a janela de separação e o aviso saíram da tela; a tela também deixou de ler estoques, endereços e empresas só para isso. Nada foi apagado: os registros antigos de EPI continuam guardados e ligados às movimentações, fichas e termos; só deixam de aparecer nesta tela. A rotina de separação (`epi-separar-tamanhos` e a operação do demo) fica no código, sem tela. Nada no Supabase.

### Decisão 161: Módulos > Veículos > Manutenção com vários locais, custos e pagamento por local e observação do item não feito

Ordem do responsável em 13/10 (18:01), com o print do Cadastrar nova manutenção, plano aprovado às 18:03 ("pode seguir conforme sugerido"). **Antes:** a manutenção tinha um único local (na empresa ou um terceiro), um custo de peças e um de mão de obra. **Agora:** a manutenção tem uma lista de locais: no máximo um **Na própria empresa (Gemape)** e quantos **Terceiros** forem precisos (botões Adicionar local na Gemape, Adicionar terceiro e Remover). Cada local tem nome (terceiro), **descrição do serviço**, **condição de pagamento combinada** (texto livre, opcional), custo de peças e custo de mão de obra (0 se não houve) e mostra o custo do local; o custo total da manutenção é a soma dos locais. A lista e o **Relatório** mostram o custo de cada local (para o financeiro controlar os pagamentos), a condição de pagamento e o total da manutenção. Dentro de cada grupo marcado, a ação **não feita** ganha o campo opcional "Observação do item não feito"; só as com observação ficam gravadas, aparecem no relatório como "não realizado" e na seção **Itens não realizados em atenção** do **Extrato do veículo**, para olhar antes do prazo do plano; o item sai dessa lista quando uma manutenção posterior o realiza. Manutenções já cadastradas continuam abrindo: o local e os custos antigos viram o primeiro local. Necessidade para a Fase 2: tabela de locais da manutenção (manutenção, tipo, nome, descrição, condição de pagamento, custos) e de itens não realizados com observação. Nada no Supabase.

### Decisão 162: Link para cadastrar os grupos e ações de manutenção de dentro do Cadastrar nova manutenção

Ordem do responsável em 13/10 (18:20), com o print da tela: "no grupo de ações criar um link abaixo para levar até Parâmetros > Veículos > Manutenção para que o usuário cadastre sem precisar sair desta tela". **Antes:** sem grupos cadastrados, a tela só avisava para cadastrar em Parâmetros, e o usuário tinha de sair do formulário. **Agora:** abaixo dos grupos de ações há o link **Cadastrar em Parâmetros > Veículos > Manutenção**, que abre a mesma tela "Ações de manutenção" (grupos pais e ações filhas) numa janela ao lado do formulário. Ao fechar, a manutenção continua de onde parou: veículo, km, grupos e ações marcados, locais e custos não se perdem, e o grupo ou a ação recém-cadastrados já aparecem na lista. O link só aparece para quem pode gravar. Nada no Supabase.

### Decisão 163: Item Outros, de descrição aberta, em todos os grupos de ações de manutenção

Ordem do responsável em 13/10 (18:27), com os prints do Cadastrar nova manutenção e do Restaurar configurações iniciais: "no grupo de ações incluir campo Outros e abrir campo para descrever de forma aberta, criar também em Parâmetros de manutenção em todos os grupos de ações". **Antes:** cada grupo só tinha as ações cadastradas. **Agora:** todo grupo de ações tem o item **Outros**, em Parâmetros > Veículos > Manutenção (padrão inicial, grupos já cadastrados e grupos novos; vai sempre ao fim, não se duplica e não sai ao editar a lista) e no **Cadastrar nova manutenção**. Marcado Outros, o campo vira **Descreva o que foi feito (obrigatório)**, de texto aberto, e a descrição vai para o relatório, a lista e o extrato como as observações das outras ações. Outros não pede observação de item não feito (dec 161). Nas telas de restaurar e de itens criados por você, Outros conta como parte do padrão, não como item criado. Nada no Supabase; no banco real, Outros é mais uma ação de cada grupo.

### Decisão 164: Parâmetros > Clientes

Ordem do responsável em 14/10 (11:19), plano aprovado às 11:21 ("sim, pode começar pelo item 1"). **Antes:** não havia cadastro de clientes. **Agora:** em Parâmetros, logo abaixo de Fornecedores (fora de Parâmetros > Veículos), a tela **Clientes** com código gerado automaticamente (5 dígitos, 00001, sem reaproveitar excluídos), **Nome do cliente** (único campo obrigatório), CNPJ ou CPF (validado e sem repetição quando preenchido), Endereço, Contato, Telefone, Telefone 2, E-mail e Observação (todos opcionais). Mesmos botões das outras listas de Parâmetros: Clonar (copia tudo, código novo), Editar e Excluir. **Esclarecimento do responsável (14/10 11:26):** haverá um menu **Viagens** em Módulos, para as funcionalidades (lançar despesas, consultas, relatório), e outro menu **Viagens** em Parâmetros, para o cadastro de dados (por exemplo as categorias de despesa). Clientes continua como item próprio de Parâmetros, abaixo de Fornecedores. **Observação:** o módulo Viagens (despesas em viagens e saídas externas, fotos de comprovantes, relatório) só será iniciado depois que o sistema inteiro estiver aprovado, por ordem do responsável (14/10 11:21); Clientes é a base dele. Por ora os dados ficam no navegador (modo demonstração); a tabela `clientes` com `empresa_id` fica para a Fase 2.

### Decisão 165: Clientes com CPF e CNPJ em campos separados

Ordem do responsável em 14/10 (11:39), com o print do Novo cliente: "separar os campos CPF e CNPJ, pois cada um tem padrões de quantidade de dígitos diferentes; colocar cada campo no padrão de preenchimento, CPF com 11 e CNPJ com 14, não obrigatórios". **Antes:** um único campo "CNPJ ou CPF" (decisão 164). **Agora:** dois campos, **CPF** (11 dígitos, máscara 000.000.000-00, dígitos verificadores conferidos) e **CNPJ** (14 dígitos, máscara 00.000.000/0000-00), os dois opcionais; preenchido, cada um precisa ter a quantidade certa de dígitos e não pode repetir em outro cliente. A lista mostra uma coluna para cada. Cadastros salvos com o campo antigo passam sozinhos para CPF ou CNPJ conforme a quantidade de dígitos. Esta decisão altera a 164 neste ponto.

### Decisão 166: Clientes: nome com inicial maiúscula e e-mail em minúsculas

Ordem do responsável em 14/10 (11:46), com o print do Novo cliente: "adequar o preenchimento do nome, primeiras letras sempre maiúsculas e as demais minúsculas, igual ao padrão do sistema; no campo e-mail, todas as letras minúsculas". **Antes:** o nome mantinha o que foi digitado depois da primeira palavra ("Gerado magela da costa") e o e-mail aparecia como digitado. **Agora:** o **Nome do cliente** segue o padrão de nome do sistema (inicial maiúscula em cada palavra; da, de, do e e ficam minúsculas: "Gerado Magela da Costa") e o **E-mail** fica todo em minúsculas, corrigidos ao sair do campo e ao salvar. Novo modo de campo "minusculas" disponível para outros e-mails.

### Decisão 167: Parâmetros > Veículos > Questionário de Despesas (construtor de cards)

Ordem do responsável em 14/10 (11:51 e 12:04), plano em etapas aprovado às 11:54, lembrando que **não há banco de dados nesta fase** (11:55). **Antes:** não havia questionário de despesas. **Agora:** em Parâmetros > Veículos, abaixo de Check list, o submenu **Questionário de Despesas**, em formulário montado por esquema (JSON), com lista vertical de cards. Card **inativo**: fundo branco, cantos arredondados, sombra sutil, enunciado e prévia da resposta. Card **ativo** (clique): barra lateral colorida, sombra maior e, na linha inferior, Editar, Clonar, Remover do questionário e a chave **Obrigatória**. **Alça ⋮⋮** no topo do card para reordenar arrastando; a transição entre ativo e inativo é suave. **Etapas seguintes (ainda não feitas):** lógica se/então (mostrar campos conforme respostas anteriores, por exemplo cartões de crédito só quando a moeda for cartão), validações por regex, preenchimento com coleta de respostas e o menu flutuante de ações globais (adicionar pergunta, importar de outro formulário, título e descrição, imagem, vídeo e seção). Nada no Supabase.

### Decisão 168: Banco de perguntas e um questionário por tipo de despesa

Ordem do responsável em 14/10 (12:04, 12:05 e 12:05), estrutura confirmada às 12:05 ("um por tipo"). **Antes:** só havia a ideia do construtor (decisão 167). **Agora:** as perguntas ficam num **banco** (tabela no fim da tela, com número em sequência 01, 02, 03..., que não se reaproveita, e Clonar, Editar e Excluir). O botão **Cadastrar pergunta**, no canto superior direito, primeiro pergunta o **tipo**: múltipla escolha (uma resposta); caixas de seleção (título e opções, com chave para permitir ou não mais de uma resposta); lista suspensa (uma resposta, opções só ao clicar, podendo usar os clientes de Parâmetros > Clientes); resposta curta (formato: texto livre, moeda, número sem casas ou com duas casas decimais); data (calendário); hora (só horário); parágrafo (texto longo); upload de arquivo (até 3 imagens, ao menos 1 obrigatória, imagens reduzidas antes de guardar). **Toda pergunta** tem a chave de resposta obrigatória. **Cada tipo de despesa tem o seu questionário**, montado com perguntas do banco, e **a pergunta 3 (Tipos de despesas) é sempre a primeira** e não se move nem se exclui; a resposta a ela define o tipo e, no módulo Viagens (fica para depois), o botão de acesso direto àquele questionário. Os tipos de despesa são as opções da pergunta 3 (incluir ou tirar uma opção cria ou apaga o questionário daquele tipo). **Já cadastradas** (14/10): 01 Moedas; 02 Cartões de crédito; 03 Tipos de despesas; 04 Habilitados ao questionário de viagem (busca de empregado ativo em Parâmetros > Empregados e área Oficina, PCM ou Administrativo ao lado do nome; empregado que fica inativo sai da lista sozinho; Roberto, Wellington, Bionor, Levindo e Wagner na Oficina, Eduardo e Bruno no PCM, ainda sem vínculo com o cadastro); 05 Unidade da Federação (27 UFs); 06 Município (lista oficial do IBGE da UF escolhida na 05, com busca por palavra-chave); 07 Clientes (de Parâmetros > Clientes); 08 Data da despesa; 09 Detalhamento da despesa; 10 Litros abastecidos e 11 Valor da despesa (números com duas casas); 12 Foto do comprovante; 13 PCM responde (Avulso e Não conformidade). Todas obrigatórias, todas começam presentes em todos os tipos de despesa e o responsável tira de cada questionário o que não se aplica. Na tela de Caixas de seleção, o título e as opções seguem o formato pai e filho. Nada no Supabase.

### Decisão 169: Questionário de Despesas, etapa 2: condição se/então e formulário no estilo Google Forms

Ordem do responsável em 14/10 (12:21 "pode seguir"; 12:27 e 12:27 pedindo a página no estilo Google Forms, esclarecida como **somente para o Questionário de Despesas**). **Antes:** o questionário só tinha o cadastro das perguntas (decisões 167 e 168). **Agora:** (1) **Condição se/então** em cada pergunta do questionário de um tipo de despesa: "Mostrar esta pergunta só se [pergunta anterior com opções escritas] for (ou não for) [opção]"; vale só naquele tipo, só com origem anterior, e mexer na ordem, nas opções ou excluir a origem desfaz a condição que deixou de valer; uma pergunta oculta não libera as que dependem dela. Nenhuma condição já vem cadastrada: o responsável define (por exemplo, Cartões de crédito só se Moedas for Cartão de crédito). (2) **Formulário** em rota própria, **sem link no menu lateral**, aberto pelo botão **Abrir formulário** da tela de cadastro (com o tipo de despesa já marcado): cartão central sobre o fundo atual (glassmorphism e azul do sistema), título e descrição no topo, perguntas em cartões, barra de progresso das obrigatórias, asterisco nas obrigatórias, validação com mensagem clara antes do envio, botão **Enviar** com tela **Resposta registrada** e **Preencher novamente**, lista **Respostas registradas** para conferência (a exclusão é só do Administrador). Funciona em 390, 820 e 1400 px sem rolagem lateral. (3) **Campos de verdade:** moeda, número com duas casas e inteiro com máscara; data e hora nativas; município filtrado pela UF respondida e com busca; clientes de Parâmetros > Clientes; habilitados só com empregado ativo; texto livre com a primeira letra maiúscula; upload de até 3 imagens, ao menos 1 obrigatória, reduzidas no navegador (WebP, até 1280 px). (4) A resposta grava de uma vez, com data e hora locais (nunca UTC) e o título das perguntas da época; fica só no navegador. Nada no Supabase; o módulo Viagens, que vai usar este formulário, continua para depois da aprovação do sistema. (5) **Clientes sem sair do formulário (12:50):** a lista de clientes é lida de Parâmetros > Clientes; abaixo do campo há o link **Cadastrar cliente**, que abre o cadastro em outra aba, e a lista se atualiza sozinha ao voltar para o formulário, sem perder o que já foi preenchido.

### Decisão 170: Formulário de Despesas, cadastro de cliente na mesma tela

Ordem do responsável em 14/10 (12:56). **Antes:** o campo Clientes do formulário tinha o link "Cadastrar cliente", que abria o cadastro em outra aba. **Agora:** o link abre a **janela de Novo cliente dentro do formulário** (a mesma de Parâmetros > Clientes, com os mesmos campos, máscaras e regras). Ao salvar, a janela fecha, o formulário continua como estava (nada preenchido se perde) e o **cliente novo já fica escolhido** no campo. Cancelar volta ao formulário sem mudar nada. A janela é um componente só, usado também na tela de Clientes. Quem só lê (perfil sem permissão de gravar) não vê o link Cadastrar cliente. Esta decisão substitui o item 5 da decisão 169 (link em outra aba). Nada no Supabase.

### Decisão 171: Questionário de Despesas, Litros abastecidos só no Abastecimento

Ordem do responsável em 14/10 (13:06). **Antes:** a pergunta "Litros abastecidos" vinha em todos os tipos de despesa. **Agora:** ela vem só no questionário do tipo **Abastecimento**; Alimentação, Hospedagem, Pedágio e os demais não a trazem, e um tipo novo também não a ganha. Vale para o padrão novo e, uma única vez, para os dados já salvos no navegador (tira Litros dos outros tipos; depois disso, quem incluir Litros num tipo de propósito mantém a escolha). Se nos dados salvos o tipo Abastecimento foi renomeado, nada é tirado. A condição se/então não foi usada porque ela depende de uma pergunta anterior e a pergunta de tipo é a origem do questionário. Nada no Supabase.

### Decisão 172: Código do produto, várias siglas por categoria

Ordem do responsável em 14/10 (13:02, escolha "Várias por categoria"). **Antes:** cada categoria tinha uma única regra de código (sigla + numeração inicial). **Agora:** (1) botão **Novo código** em Cadastros > Gerais > Código do produto cria **mais uma sigla na mesma categoria** (ex.: EPI e LUV), sem mexer nas que já existem; a tela lista uma linha por sigla, e a **primeira da categoria é a padrão**. (2) A sigla é única no sistema inteiro (na própria categoria ou em outra). (3) Clonar copia a numeração para um novo código na mesma categoria, com a **sigla em branco** (a sigla é única e a cópia precisa de uma própria); Editar muda a sigla escolhida; Excluir tira só a sigla escolhida (se for a padrão, o aviso diz qual passa a ser a padrão), e a **última sigla de uma categoria de módulo não sai** (EPI, Uniformes, Ferramentas, Veículos). (4) Nos cadastros de EPI, Uniforme, Ferramenta, Veículo e Produto, quando a categoria tem mais de uma sigla aparece o campo **Sigla do código** (padrão marcada) e o código mostrado muda ao trocar; com uma só sigla o campo não aparece. Ao clonar, começa com a sigla do original. A numeração de cada sigla segue sozinha (o próximo é um depois do maior já usado com aquela sigla). A separação de EPI por tamanho usa a sigla padrão. Nada no Supabase; a tabela de regras da Fase 2 passa a aceitar várias por categoria (docs/pendencias-fase2.md).

### Decisão 173: Questionário de Despesas, tela única (formulário com a montagem dentro)

Ordem do responsável em 14/10 (13:20 e escolha "Tela só" às 13:22). **Antes:** duas telas: a inicial de montagem (com título, texto de ajuda e o **banco de perguntas** em tabela) e o formulário, aberto pelo botão **Abrir formulário**. **Agora:** uma tela só, em Parâmetros > Veículos > Questionário de Despesas. O menu **abre direto no formulário**. Quem pode gravar (Administrador e RH) vê ali o botão **Editar questionário**, que troca, **na mesma tela**, para a montagem (cartões com Editar, Clonar, Mover, Remover do questionário, Obrigatória, condição se/então e o botão **Cadastrar pergunta** no canto superior direito); **Abrir formulário** volta ao preenchimento com o mesmo tipo de despesa. Quem só lê (Padrão) vê só o formulário. Somem a tela inicial, o **banco de perguntas** e o texto de ajuda da montagem; a rota separada do formulário deixa de existir. Como não há mais tabela, cada cartão ganha o botão **Excluir pergunta** (exclui de todos os questionários, só para perguntas que não são de sistema; a pergunta de tipos de despesa não se exclui), e as perguntas que ficaram fora do questionário voltam por **Adicionar a este questionário**. Conferido em 390 e 1400 px, sem rolagem lateral. Nada no Supabase.

**Ajuste (14/10, 13:40):** na montagem some o cartão separado "Questionário do tipo de despesa"; o tipo se escolhe na própria primeira pergunta (Tipos de despesa). O título do formulário passa a ser **Questionário de Despesas**.

**Ajuste (14/10, 13:45):** no formulário, **Unidade da Federação** e **Município** ficam no mesmo cartão (a pergunta que depende da anterior entra no cartão dela).

### Decisão 174: Questionário de Despesas, campo para descrever o "Outro"

Ordem do responsável em 14/10 (13:47). **Antes:** marcar "Outro" em Tipos de despesas (ou em qualquer pergunta de escolha) não pedia mais nada. **Agora:** ao marcar a opção **Outro** de uma pergunta de escolha com opções próprias (múltipla escolha, caixas de seleção ou lista), abre logo abaixo o campo **Descreva o outro**, obrigatório (mensagem "Descreva o outro."). Desmarcar o Outro apaga a descrição. A resposta registrada guarda "Outro: descrição". Vale para qualquer pergunta que tenha uma opção chamada exatamente "Outro". Nada no Supabase.

### Decisão 175: Questionário de Despesas, imagens anexadas aparecem nas respostas registradas

Ordem do responsável em 14/10 (13:50). **Antes:** nas Respostas registradas a foto do comprovante aparecia só como nome do arquivo. **Agora:** a imagem (já reduzida no navegador, formato econômico da decisão 168) é guardada junto da resposta e aparece na lista, abaixo do campo, em tamanho de visualização (até 16 rem de altura). Só imagens são guardadas (`data:image/`). Se o navegador ficar sem espaço, a resposta não é gravada e a tela avisa para excluir respostas antigas. Na Fase 2 as imagens vão para o armazenamento de arquivos (ver docs/pendencias-fase2.md). Nada no Supabase.

### Decisão 176: Módulo Viagens, etapa 1 (painel com os questionários e lançamentos)

Ordem do responsável em 14/10 (14:10), plano aprovado às 14:11 ("Sim, começar"). Esta decisão libera o módulo Viagens, que a decisão 164 deixava para depois da aprovação do sistema. Plano completo em quatro etapas (painel, indicadores e resultados dos técnicos, construtor com ramificação, relatório) em /mnt/project-files/viagens/plano-modulo-viagens.md. **Antes:** só havia o formulário do Questionário de Despesas, aberto por Parâmetros. **Agora (etapa 1):** novo item **Viagens** em **Módulos**, abaixo de Veículos, com o submenu **Painel**. A tela principal mostra **Questionários de despesas**: um botão por tipo de despesa (as opções da pergunta 3), lado a lado, com ícone e texto do tema (talher, cama, bomba de combustível, cone, vaga, chave inglesa, caixas, reticências; tipo novo usa o recibo). O clique abre, na mesma tela, o formulário com o tipo já marcado; **Voltar ao painel** retorna. Ao enviar, a despesa fica na **coleção única de lançamentos** (as respostas registradas, no navegador em modo demonstração), de estrutura flexível: o que não foi respondido fica nulo, e os campos que os indicadores e o relatório usam (tipo, data, valor, cliente, descrição, técnico e área) saem das perguntas de sistema 04, 07, 08, 09 e 11 (`dadosDoLancamento`). Os indicadores, os resultados dos técnicos, o construtor com ramificação e o relatório vêm nas etapas 2 a 4. **Pontos em aberto para as etapas 2 e 3:** campo novo para saber qual técnico perde pontos quando o PCM lança, e a ramificação substituir a condição se/então da decisão 169. **Observação:** a pergunta 13 (PCM responde) vem depois da foto do comprovante nos questionários atuais; o responsável pode reordenar em Parâmetros. Na Fase 2 a coleção vira tabela com `empresa_id` e coluna JSONB; as imagens vão para o armazenamento de arquivos. Nada no Supabase.

### Decisão 177: Módulo Viagens, etapa 2 (indicadores, resultados dos técnicos e técnico responsável)

Ordem do responsável em 14/10 (14:10, plano aprovado às 14:11), com a fórmula enviada às 14:19 e a escolha "Pergunta nova" às 14:20; o ícone do menu Viagens passa a ser um **avião** (14:30). **Antes:** o painel só tinha os botões dos questionários. **Agora:** (1) **Indicadores globais de despesas**, abaixo dos botões: despesas lançadas no mês, custo total e **Índice de conformidade de lançamento (ICL)**, com o ícone de informação que explica o cálculo. O botão com o mês e o ano (por padrão o mês atual) abre a escolha de **mês e ano**; trocar o período muda juntos os indicadores e os resultados dos técnicos. O lançamento conta no mês da **data da despesa** (sem ela, no mês do registro). (2) **Resultados dos técnicos**: lista dos técnicos habilitados (pergunta 04, área Oficina, só empregado ativo) com número de lançamentos do mês, valor total somado e ICL individual ("—" quando não há lançamento na conta). (3) **Fórmula do ICL (do responsável):** ICL = (despesas lançadas pelo técnico ÷ total de despesas do técnico, técnico + gestor) × 100; exemplo: 10 despesas, 8 lançadas pelo técnico e 2 pelo gestor, ICL = 80%. Lançamento cujo "habilitado" respondido (quem lança, pergunta 04) é da área PCM ou Administrativo é não conformidade do técnico dono da despesa. O geral usa todos os lançamentos do índice. Os marcados como "Avulso – técnico não monitorado" na pergunta 13 e os de PCM sem técnico informado ficam fora do índice (entram na quantidade e no custo). (4) **Pergunta nova 14, "Técnico responsável pela despesa"** (pergunta de sistema, caixas de seleção, obrigatória): aparece logo depois da pergunta 04 **somente quando quem lança é PCM ou Administrativo**; a lista são os habilitados da pergunta 04 com área Oficina (muda junto com ela, sem lista própria). Entra em todos os questionários; nos dados salvos antes dela existir é incluída uma vez só (depois da pergunta 04), sem trazer de volta se o responsável tirar de um questionário; o número 14 passa para o próximo livre se já estiver em uso. O próximo número de pergunta nova passa a ser 15. Nada no Supabase; na Fase 2 o índice sai de consulta na tabela de lançamentos.

### Decisão 178: Módulo Viagens, etapa 3a (ramificação por opção, validador de ciclos e ação requerida)

Ordem do responsável em 14/10 (plano aprovado às 14:11, "prossiga" às 14:39). **Antes:** o Questionário de Despesas seguia sempre a ordem das perguntas, com a condição se/então da decisão 169 só escondendo perguntas. **Agora:** em Parâmetros > Veículos > Questionário de Despesas, a pergunta de uma única resposta e com opções escritas (múltipla escolha, lista suspensa e caixas de uma só marcação) ganha, ao ser aberta, o bloco **"Depois de responder, ir para..."**: cada opção escolhe **Segue para a próxima pergunta** (padrão), **Encerrar formulário** ou **Ir para** uma pergunta do mesmo questionário. As perguntas puladas não aparecem nem entram na resposta registrada. A ramificação é guardada por tipo de despesa (`destinos`) e acompanha o tipo renomeado.

**Validador de ciclos:** busca em profundidade no fluxo (cada pergunta vai para a próxima e para os destinos escolhidos). Ao marcar um destino ou reordenar perguntas, se o fluxo voltar a uma pergunta já visitada, não salva e mostra o caminho (ex.: "Fluxo em ciclo: 01 → 02 → 01.").

**Ação requerida:** excluir uma pergunta, tirá-la do questionário ou mudar o nome de uma opção que tinha destino não apaga a ramificação em silêncio: ela fica marcada, a tela lista o problema e o questionário **não é publicado** (o botão em Viagens fica desabilitado com "Ação requerida" e o formulário não envia) até o responsável corrigir.

**Se/então (decisão 169):** continua funcionando como está. A conversão automática das condições em destinos não é exata (a condição esconde uma pergunta, o destino salta um trecho), então não foi feita; o ponto 4 do plano fica para o responsável decidir se as condições serão aposentadas. Ficam para a etapa 3b: seções/páginas, botão "Criar novo questionário" e o destino "Ir para a próxima seção".

Fase 2: `destinos` vira coluna JSONB no esquema do questionário (tipo de despesa, pergunta, opção, destino), sem tabela nova agora.

### Decisão 179: Módulo Viagens, etapa 3b (seções, páginas e Criar novo questionário)

Ordem do responsável em 14/10 (plano aprovado às 14:11, "prossiga" às 14:39). **Antes:** o Questionário de Despesas era uma página só e novos questionários só nasciam ao acrescentar uma opção na pergunta 03. **Agora:** (1) **Seções:** em Parâmetros > Veículos > Questionário de Despesas, o botão "Iniciar seção aqui" de uma pergunta cria uma seção (título e subtítulo opcionais) que começa nela; cada seção é uma **página** no formulário, com "Próxima" e "Voltar" (cada página é validada antes de avançar e o envio está na última). Seção sem título fica oculta, mas a página continua separada. A primeira seção começa na pergunta 03 e não se remove; as outras podem ser editadas ou removidas (as perguntas ficam na seção anterior). A seção anda com a pergunta quando ela muda de lugar e some se a pergunta inicial sair do questionário. (2) **Criar novo questionário** (botão no canto superior direito): pede o nome (que vira um tipo novo na pergunta 03 e um botão em Viagens), o título e o subtítulo da primeira seção; nasce só com a pergunta 03 e as demais vêm do banco pelo seletor "Adicionar a este questionário". (3) Na ramificação (decisão 178) entra o destino **Ir para a próxima seção** (sem seção seguinte, encerra o formulário), contado também no validador de ciclos.

Fase 2: `secoes` (tipo, id, título, subtítulo, pergunta inicial) fica no esquema do questionário, junto de `destinos`, em JSONB. Pendente de decisão do responsável: aposentar o se/então da decisão 169 (ponto 4 do plano).

### Decisão 180: Módulo Viagens, etapa 4 (Viagens > Relatório)

Ordem do responsável em 14/10 (14:10, plano aprovado às 14:11, "prossiga" às 14:39). **Antes:** o módulo Viagens só tinha o Painel. **Agora:** o submenu **Relatório** (Módulos > Viagens) tem filtros (um empregado ou todos, data inicial e final, padrão do dia 1º do mês até hoje; comprovantes por página 1, 2 ou 4; supervisor e diretor escolhidos entre os empregados ativos de Parâmetros > Empregados; emitente = quem está logado), uma conferência (despesas, total, comprovantes, total por tipo e clientes visitados, com o botão **Abrir Parâmetros > Clientes**) e o botão **Gerar relatório**, que abre o documento no visualizador do sistema para imprimir ou salvar em PDF.

O documento (A4) traz: cabeçalho com a **logomarca à esquerda**, "Relatório de Viagens" centralizado, o empregado ou "Todos os empregados" e o período; **clientes visitados** (sem cliente em nenhuma despesa: "Clientes não informados"); **tabela de despesas** em ordem de ocorrência (data, tipo, cliente, valor; a descrição vai numa linha abaixo só quando existe; sem linhas em branco); **quadro de total por tipo** com total geral; **assinaturas lado a lado** (emitente, supervisor, diretor); **rodapé 01/01 dinâmico** (número da página e total); e os **comprovantes** em sequência, na ordem do relatório, 4, 2 ou 1 por página, cada um com data, tipo, cliente e valor. O período vale pela data da despesa (sem ela, pela do registro) e o empregado é o dono da despesa (decisão 177). Todo texto passa por escaparHtml e as datas saem em horário de Brasília.

Fase 2: o relatório passa a ler a tabela de lançamentos (com `empresa_id`) e as imagens do armazenamento de arquivos; o nome do emitente virá do cadastro do usuário.

### Decisão 181: Questionário com o nome do card e ícone de hambúrguer em Alimentação

Ordem do responsável em 14/10 (17:58). **Antes:** o formulário se chamava sempre "Questionário de Despesas" e o card Alimentação usava talheres cruzados. **Agora:** o card Alimentação usa o ícone de **hambúrguer**; cada card de Viagens abre o questionário **daquele tipo**, com o nome **Despesas + nome do card** (Despesas Alimentação, Despesas Hospedagem, Despesas Abastecimento...), tanto no preenchimento quanto na montagem em Parâmetros > Veículos > Questionário de Despesas. As perguntas de cada questionário já vêm de Parâmetros (um questionário por tipo, decisões 167 e 168); quem monta escolhe o tipo na pergunta 03 e define ali as perguntas pertinentes a cada card. Tipo novo criado em "Criar novo questionário" ganha o nome do mesmo jeito. Nada no Supabase.

### Decisão 182: Cartões de crédito só aparece quando a moeda for Cartão de crédito

Ordem do responsável em 14/10 (18:03). **Antes:** a pergunta "Cartões de crédito" aparecia em todo questionário, qualquer que fosse a moeda. **Agora:** ela só aparece quando em "Moedas" estiver marcado **Cartão de crédito**; com Dinheiro ou Ticket de abastecimento o campo não aparece (e não é cobrado). Usa a condição se/então já existente (decisão 169), aplicada de fábrica em todos os questionários que têm Moedas antes de Cartões, e também aos dados salvos antes, uma única vez (o responsável pode tirar ou mudar a condição depois). Nada no Supabase.

### Decisão 183: Card de Viagens abre o formulário sem a pergunta "Tipos de despesas"

Ordem do responsável em 14/10 (18:20). **Antes:** ao clicar num card de Viagens (por exemplo Alimentação), o formulário abria com a pergunta "Tipos de despesas" com o tipo já marcado. **Agora:** em **todos os cards** essa pergunta não aparece: o tipo é o do card clicado e o formulário se chama "Despesas <card>". A resposta continua gravada com o tipo certo, e o "Preencher novamente" mantém o tipo do card. Em Parâmetros > Veículos > Questionário de Despesas a pergunta continua visível, porque ali se escolhe o tipo para montar. Nada no Supabase.

### Decisão 184: Ícones de Viagens (mala), Pedágio (cancela) e Compra de peças (parafuso e porca)

Ordem do responsável em 14/10 (18:29 e 18:30). **Antes:** o menu Viagens usava um avião, o card Pedágio um cone e o card Compra de peças para cliente caixas empilhadas. **Agora:** o menu **Viagens** usa uma **mala**; o card **Pedágio** uma **cancela** (poste e braço listrado) e o card **Compra de peças para cliente** um **parafuso com porca**. Cancela e parafuso com porca não existem na biblioteca de ícones e foram desenhados no mesmo traço dos demais (src/components/modules/icones-viagens.ts). Nada no Supabase.

### Decisão 185: Anexo de comprovante soma até 3 imagens, todas compactadas

Ordem do responsável em 14/10 (19:09). **Antes:** cada escolha de arquivo no campo "Foto do comprovante" trocava as imagens anteriores, então anexar uma segunda imagem apagava a primeira (o limite de 3 só valia se as 3 fossem escolhidas de uma vez). **Agora:** cada escolha **soma** às imagens já anexadas, até **3 imagens**; a lista mostra cada imagem com o tamanho antes e depois da compactação e um botão **Remover** em cada uma; com 3 imagens o campo fica bloqueado até remover uma; escolher mais do que cabe não muda nada e a mensagem diz quantas ainda cabem. Toda imagem é **compactada no navegador** antes de ser guardada (WebP, lado maior até 1280 px, qualidade 0,7, decisão 168); se a compactação sair maior que a imagem original (imagem já pequena), vale a original. Só imagens são aceitas. Nada no Supabase; na Fase 2 as imagens vão para o armazenamento de arquivos.

### Decisão 186: Viagens, lista das despesas do mês com status e geração do relatório

Ordem do responsável em 14/10 (19:38), a partir do croqui "módulo viagens". **Antes:** o painel de Viagens mostrava só os indicadores e os resultados dos técnicos, sem ver cada despesa, e o relatório era gerado só pela aba Relatório, por período. **Agora:** entre os indicadores e os resultados dos técnicos há a **lista das despesas** do mês escolhido (ANO/MÊS), com as colunas data, local (município/UF), foto, cliente, técnico, tipo, valor e status, da mais nova para a mais antiga. Filtros: tipo, técnico, data inicial e data final (dentro do mês). Clicar numa despesa abre as informações completas, o detalhamento e as fotos. O status é **Em aberto** ou **Finalizado**; Finalizado é a despesa que já entrou num relatório gerado. Cada despesa em aberto tem caixa de seleção; o botão **Gerar relatório** gera o documento (mesmo modelo da decisão 180) só com as marcadas, que precisam ser de **um técnico só**, e as marca como Finalizadas na mesma operação (se algo falha, nada é gravado; despesa já finalizada não entra em outro relatório). Despesa finalizada mostra **Baixar relatório**, que reabre o documento salvo. Os relatórios ficam no navegador (`gemape-demo-relatorios-viagens`). Etapas seguintes do croqui: extrato do técnico e índice de lançamento no prazo (prazo em dias após a despesa, configurável, começando em 3). Nada no Supabase.

### Decisão 187: Viagens, extrato do técnico

Ordem do responsável em 14/10 (19:38), a partir do croqui "módulo viagens". **Antes:** o nome do técnico em "Resultados dos técnicos" era só texto. **Agora:** o nome é um botão que abre o **extrato do técnico** numa janela, com o mês do painel, setas para o mês anterior e o seguinte, no topo a **quantidade de despesas** e o **custo total** do mês e, abaixo, a lista com data, tipo, cliente, valor e os indicadores de cada despesa (lançada pelo técnico ou pelo gestor, como no ICL, e Em aberto ou Finalizado). Vale o técnico responsável da despesa, a mesma regra dos Resultados dos técnicos. A regra do croqui "um técnico não vê o extrato do outro" depende de login e fica para a Fase 2; em demonstração o extrato abre para qualquer pessoa. Nada no Supabase.

### Decisão 189: Parâmetros > Veículos > Questionário de Despesas só configura, não lança despesa

Ordem do responsável em 14/10 (19:57). **Antes:** a tela de Parâmetros abria o formulário completo, com o botão Enviar e a lista de respostas registradas, e por ela dava para lançar despesas. **Agora:** a tela é só **pré-visualização da montagem**: o formulário aparece para conferir perguntas, ramificações e seções, mas **não envia** (sem o botão Enviar) e **não mostra respostas registradas**; o aviso no topo diz que as despesas são lançadas em Módulos > Viagens. O Editar questionário continua ali para quem pode gravar. O lançamento e as respostas registradas ficam só no módulo Viagens. Nada no Supabase.

### Decisão 188: Painel de Viagens sem o aviso sobre o envio dos comprovantes

Ordem do responsável em 14/10 (19:54). **Antes:** abaixo do título "Questionários de despesas" o texto dizia "Escolha o tipo da despesa a lançar. O formulário termina sempre com o envio dos comprovantes." **Agora:** só "Escolha o tipo da despesa a lançar." A frase sobre os comprovantes foi retirada; o formulário continua pedindo a foto do comprovante como antes.

### Decisão 190: Viagens, índice de lançamento no prazo

Ordem do responsável em 14/10 (19:38), a partir do croqui "módulo viagens", com o prazo definido por ele como **dias após a data da despesa**. **Antes:** o painel tinha só o índice de conformidade de lançamento (ICL). **Agora:** há também o **índice de lançamento no prazo**, em roxo: (despesas lançadas dentro do prazo ÷ total de despesas lançadas no período) × 100. Aparece num **quarto cartão** dos indicadores globais (o ICL continua) e numa **coluna "No prazo"** na tabela Resultados dos técnicos, por técnico responsável. Uma despesa conta como no prazo quando o formulário foi enviado até N dias depois da data da despesa, em dias de calendário, no horário de Brasília; despesa com data depois do envio não conta como no prazo; técnico sem lançamentos mostra "—". O **prazo** (N) se configura em **Parâmetros > Viagens**, item novo do menu Parâmetros, com padrão **3 dias** (0 a 365; 0 vale só o mesmo dia); a regra de Parâmetros é só parametrizar, o índice aparece no módulo Viagens. O ícone de informação do cartão explica a conta com exemplo. O prazo fica no navegador (`gemape-demo-viagens-prazo`). Nada no Supabase.

### Decisão 191: Links do topo do formulário de despesas viram botões

Ordem do responsável em 14/10 (20:12). **Antes:** no topo do formulário do questionário de despesas, "Voltar ao painel", "Editar questionário" e "Respostas registradas" eram textos sublinhados, como links. **Agora:** são **botões** com ícone (seta para voltar, lápis para editar, prancheta para as respostas), com as mesmas funções: Voltar ao painel (só em Viagens), Editar questionário (só em Parâmetros, para quem pode gravar) e Respostas registradas (só em Viagens; mostra e oculta a lista). Mudança só visual; nada no Supabase.

### Decisão 192: Viagens, faixas de desempenho nos índices

Ordem do responsável em 14/10 (20:23), a partir do croqui "esquema kpi". **Antes:** o ICL e o índice de lançamento no prazo apareciam só como percentual, sem dizer se o resultado era bom. **Agora:** os dois índices ganham **faixa de cor**: **verde** de 90% a 100% (Excelente / No prazo), **amarelo** de 70% a 89,9% (Atenção / Alerta) e **vermelho** abaixo de 70% (Crítico / Inaceitável). A cor vale nos dois cartões do painel (valor colorido mais o nome da faixa) e nas colunas ICL e No prazo de Resultados dos técnicos (bolinha, valor e texto de apoio para leitor de tela; a cor nunca é o único sinal). O botão **Faixas de desempenho**, ao lado do período, abre a legenda com o significado prático para a gestão de cada faixa, com o texto do croqui. A comparação usa o valor como aparece na tela, com uma casa decimal (89,95% aparece 90% e é verde); sem lançamentos o índice é "—" e não tem faixa. Os limites 90 e 70 são fixos, sem campo de configuração. Nada no Supabase.

### Decisão 193: Parâmetros > Viagens, dois prazos (técnico mecânico e PCM)

Ordem do responsável em 14/10 (20:23, croqui "esquema kpi") e resposta ao cartão das 20:24. **Antes:** Parâmetros > Viagens tinha um prazo só (decisão 190), igual para todas as despesas. **Agora:** há **dois prazos**, em dias após a data da despesa, ambos com padrão **3 dias** (0 a 365): **Técnico mecânico** e **PCM**. No índice de lançamento no prazo, cada despesa usa o prazo de **quem a lançou**: Oficina usa o do mecânico; PCM e Administrativo usam o do PCM (o Administrativo não tem prazo próprio no croqui). Quem já tinha salvo o prazo único vê esse valor nos dois campos até salvar de novo. A explicação do cartão do índice mostra os dois prazos de hoje. O **Questionário de Despesas continua em Parâmetros > Veículos** (decisão do responsável: só os prazos ficam em Parâmetros > Viagens); a regra de Parâmetros é só parametrizar, o índice aparece no módulo Viagens. Os prazos ficam no navegador (`gemape-demo-viagens-prazos`). Na Fase 2 viram configuração por empresa (`empresa_id`), registrado em docs/pendencias-fase2.md. Nada no Supabase.

### Decisão 194: Revisão geral do sistema, correções de bugs

Ordem do responsável em 14/10 (20:32): "rode o code review de todo o sistema e corrija todos bugs e erros que encontrar". **Antes:** a revisão achou falhas que não mudam regra de negócio, só fazem a tela agir contra o que já estava decidido. **Agora**, corrigido: (1) **Relatórios** e relatórios de baixas no modo demonstração quebravam (o demo não tinha `lte`) e a **busca** de EPI, ocorrências e compras era ignorada (o demo ignorava `or`); (2) a **empresa escolhida no topo** que foi excluída agora volta para "Todas as empresas"; (3) **Caixas** (Parâmetros): o formulário aceitava ferramenta já em outra caixa e permitia tirar ferramenta que está com empregado, agora valem as mesmas regras do diálogo de ferramentas da caixa; (4) **Termos de EPI, uniforme e ferramentas e Compras**: o seletor de item mostra só os itens da empresa escolhida (cada empresa tem o seu registro do mesmo produto) e a troca de empresa limpa item, caixa e empregado escolhidos; (5) **datas** dos termos de entrega e de baixa não podem ficar em branco; "hoje" passa a ser sempre o de Brasília; (6) **relatórios**: "Fornecimento ao Empregado" é entrega e não baixa nos relatórios de EPI e uniforme, e o CSV de baixas traz o valor real (antes R$ 0,00); (7) **Ficha de EPI avulsa** mostra BAIXA e o motivo quando a saída é baixa (antes saía como ENTREGA); (8) **Veículos**: responsável do novo veículo só da empresa do veículo, associação de check list zera o responsável que não vale para o novo veículo, a coluna Pendências conta por periodicidade, check list não inicia com responsável desligado, abastecimento mantém a trava de duplo clique; (9) editar empregado sem CPF antigo não aceita CPF em branco; (10) o título do card de ocorrências do painel diz "nas 20 movimentações recentes". **Não alterado, aguarda decisão do responsável:** modo demonstração como padrão quando falta `VITE_DEMO_MODE`; Clonar copiando CNPJ/CPF (decisão 138); histórico de códigos de ferramenta corrompido bloqueando o cadastro (de propósito); motivo "Quebra" em uniforme; lista de Ocorrências sem filtro de empresa. Detalhe em /mnt/project-files/revisoes/revisao-geral.md. Nada no Supabase.

### Decisão 195: Busca de ações no Cadastrar nova manutenção

Ordem do responsável em 15/10 (13:39), com o croqui "Módulos > Veículos > Manutenção, Cadastrar nova manutenção": veículo, tipo (preventiva ou corretiva), data, km do veículo, **um campo de busca** que ajuda a localizar a ação e, abaixo, os grupos de ações; ao não localizar a ação, o usuário deve poder cadastrá-la em Parâmetros > Veículos > Manutenção. **Antes:** o formulário listava todos os grupos de ações e o usuário rolava para achar a ação. **Agora:** acima dos grupos há o campo **Buscar ação de manutenção**. A busca não diferencia maiúsculas, minúsculas e acento, aceita parte da palavra e palavras em qualquer ordem. Se o nome do grupo combina, o grupo aparece com todas as suas ações; senão aparecem só as ações que combinam, já com as caixas para marcar (marcar uma ação marca o grupo dela). O que já estava marcado não se perde ao buscar, e uma linha informa quantos grupos e ações estão marcados. Sem resultado, a tela avisa "Nenhuma ação encontrada" e traz o link **Parâmetros > Veículos > Manutenção**, que abre a janela de cadastro de grupos e ações ao lado do formulário (decisão 162), sem perder o que foi preenchido. A ordem dos campos segue o croqui. Nada no Supabase; a busca roda sobre os dados locais da demonstração.

### Decisão 196: Reversão da busca de ações no Cadastrar nova manutenção (decisão 195)

Ordem do responsável em 15/10 (13:51): "desfaça a última alteração, pois o sistema já contemplava a ação". **Antes:** a decisão 195 (PR #253) pôs o campo Buscar ação de manutenção no Cadastrar nova manutenção. **Agora:** o campo e o filtro foram retirados e o formulário voltou ao que era antes do #253; a decisão 195 deixa de valer e fica aqui só como registro. O sistema já atendia o croqui de 15/10 (veículo, tipo, data, km, grupos de ações e o link para cadastrar em Parâmetros > Veículos > Manutenção, decisão 162). Nada no Supabase.

### Decisão 197: Busca na janela Restaurar configurações iniciais das ações de manutenção, com cadastro de ação por cima

Ordem do responsável em 15/10 (13:56 e 13:58), com o print da janela "Restaurar configurações iniciais" das Ações de manutenção: "criar um campo de busca que vai ajudar a localizar a ação do grupo de ações" e "ao não localizar a ação de manutenção necessária o usuário poderá cadastrar a ação na mesma tela, puxando do menu Parâmetros > Veículos > Manutenção, indo e voltando". **Antes:** a janela listava todos os grupos (pais) e subitens (filhos) do padrão inicial e os criados por você, sem busca. **Agora:** acima da lista há o campo **Buscar ação ou subitem**, que não diferencia maiúsculas e acento, aceita parte da palavra e palavras em qualquer ordem. O pai que combina mostra todos os filhos; senão aparecem só os filhos que combinam. Vale também para "Criados por você". O que já estava marcado não se perde ao buscar; **Marcar todos** e **Desmarcar todos** valem para o que está na tela quando há busca, e o contador mostra o total marcado. Sem resultado, a janela avisa e traz o botão **Cadastrar a ação**, que abre o cadastro de ação de manutenção (o mesmo de Parâmetros > Veículos > Manutenção) por cima, com o nome buscado já preenchido; ao salvar (com a confirmação Sim ou Não de sempre), volta para a mesma busca, já com a ação nova na lista de criados. A tela é a mesma de Parâmetros e a que abre de dentro do Cadastrar nova manutenção (decisão 162). A decisão 195, revertida pela 196, era outra tela (o formulário da manutenção) e não volta. Nada no Supabase.

### Decisão 198: Questionário de Despesas depois de Parâmetros Específicos no menu Parâmetros > Veículos

Ordem do responsável em 15/10 (14:12), com o print do menu: "em Parâmetros, dentro do menu Veículos, colocar o submenu Questionário de Despesas abaixo do submenu Parâmetros Específicos". **Antes:** a ordem era Cadastro de Veículos, Manutenção, Tipos de ocorrência, Check list, Questionário de Despesas e Parâmetros Específicos. **Agora:** Questionário de Despesas é o último, depois de Parâmetros Específicos. Só a ordem muda; as telas e os endereços são os mesmos. Nada no Supabase.

### Decisão 199: Indicadores de Viagens em Parâmetros > Veículos > Parâmetros Específicos (prazos e faixas editáveis)

Ordem do responsável em 15/10 (14:19), com o print da tela Parâmetros Específicos de Veículos e o croqui "esquema de cores e faixas de desempenho", e resposta ao cartão das 14:20 ("Sim, PCM fecha"). **Antes:** os dois prazos ficavam em Parâmetros > Viagens (decisão 193), ambos de lançar despesa, e os limites das faixas (90 e 70) eram fixos (decisão 192). **Agora:** Parâmetros > Veículos > Parâmetros Específicos tem a seção **Indicadores**, com: (1) **Nº de dias para lançar despesas**, com a caixa **Aplicável ao técnico mecânico** e os dias após a data da despesa; (2) **Nº de dias para fechar o relatório de despesas**, com a caixa **Aplicável ao PCM** e os dias após o lançamento; (3) **Faixas de desempenho**: limite do verde e do amarelo (inteiros de 1 a 100, o do amarelo abaixo do verde; padrão 90 e 70) e, para cada cor, a classificação e o significado prático para a gestão (padrão: o texto do croqui), com **Salvar faixas** e **Restaurar padrão**. Caixa desmarcada: o indicador não é medido (campo de dias travado). **Efeito no painel de Viagens:** o índice de lançamento no prazo passa a medir só as despesas lançadas pela **Oficina**, com o prazo do mecânico; as lançadas pelo PCM ou pelo Administrativo saem desse índice (já pesam no índice de conformidade); desligada a caixa do mecânico, o índice mostra "—". O prazo de fechar o relatório do PCM fica **só parametrizado** por enquanto, sem índice no painel até o responsável pedir. As cores, a legenda "Faixas de desempenho" e as explicações do painel passam a ler os limites e os textos configurados. **Parâmetros > Viagens saiu do menu**; o endereço antigo leva para Parâmetros Específicos de Veículos. Como é só parametrizar, o funcionamento fica no módulo Viagens (princípio do sistema). Prazos e faixas ficam no navegador (`gemape-demo-viagens-prazos` e `gemape-demo-faixas-desempenho`). Necessidade para a Fase 2: configuração por empresa (`empresa_id`) dos prazos, das caixas e das faixas, registrada em docs/pendencias-fase2.md. Nada no Supabase.

### Decisão 200: Configuração do Questionário de Despesas em dois passos, por card de Viagens

Ordem do responsável em 15/10 (14:42 e 14:51): trocar o texto "Pré-visualização da montagem: nada é enviado daqui..." por "Configuração de perguntas para o questionário de despesa" e deixar a configuração mais simples e intuitiva, com o questionário atrelado ao tipo de card que existe no módulo Viagens, mantendo as mesmas perguntas e opções. **Antes:** a montagem escolhia o tipo numa pergunta-lista dentro da página, com botões só de ícone e ramificação e condição sempre abertas. **Agora:** na montagem, o passo 1 escolhe o card (mesmos ícones e nomes de Viagens; "Editar cards" altera a lista de tipos) e o passo 2 monta as perguntas daquele card; os botões têm texto (Nova página, Editar, Duplicar, Tirar daqui) e ramificação e condição ficam em "Opções avançadas", abertas sozinhas quando a pergunta já tem configuração. A pergunta fixa de tipos não aparece mais como cartão na montagem. A pré-visualização mostra o novo texto. Perguntas, opções e regras não mudam. O mapa de ícones dos tipos saiu de ViagensPainel.tsx para icones-viagens.ts. Sem campo novo nem Supabase.

### Decisão 201: Questionário de Despesas em Parâmetros abre direto na configuração

Ordem do responsável em 15/10 (16:07), com os prints do formulário e da configuração: "retirar este formulário em anexo, deixar somente a segunda tela para configurar o formulário de despesas, trocar o título Despesas Alimentação para Configuração Formulário de Despesas". **Antes:** o menu abria o formulário de pré-visualização, com o botão Editar questionário para chegar à configuração, e o título mostrava "Despesas <card>". **Agora:** o menu abre direto na configuração (passo 1 escolhe o card, passo 2 monta as perguntas, dec 200) com o título fixo "Configuração Formulário de Despesas"; o formulário de pré-visualização e o botão Abrir formulário saíram, e o Formulário perdeu as opções de pré-visualização (somentePrevia e Editar questionário). O formulário com envio e respostas registradas continua só no módulo Viagens. Quem só lê vê a configuração sem os botões de alteração. Sem campo novo nem Supabase. Substitui a parte da dec 173 e da dec 189 que abria o menu na pré-visualização.

### Decisão 202: Cards da montagem do questionário padronizados e botão Adicionar opção

Ordem do responsável em 15/10 (16:22), com os prints do card e do botão: "incluir botão de adicionar opção nos campos de cada pergunta, deixar o editar e obrigatória e lixeira, excluir nova página e duplicar; padronizar todas essas funcionalidades nos cards ao montar o questionário". **Antes:** a barra do card tinha Nova página, Editar, Duplicar, setas, Tirar daqui, lixeira e Obrigatória, e as opções só se mudavam na janela de Editar. **Agora:** cada pergunta com opções próprias (múltipla escolha, caixas, lista; não as de clientes, empregados ou tipos) tem o botão Adicionar opção, que abre um campo (Enter ou Adicionar grava, Cancelar fecha; opção repetida é recusada pela validação existente). A barra ficou igual em todos os cards: Editar, setas de ordem, lixeira e Obrigatória. A lixeira exclui a pergunta (com confirmação); nas perguntas de sistema, que não se excluem, tira a pergunta do questionário. Saíram Nova página, Duplicar e Tirar daqui; sem Nova página não se cria seção nova (as existentes seguem editáveis e removíveis). Sem campo novo nem Supabase.

### Decisão 203: Quadrante Adicionar ao questionário abre o cadastro de pergunta nova

Ordem do responsável em 15/10 (16:32), com o print do seletor do rodapé: "mudar o botão em anexo, quando clicado em adicionar este questionário, abrir a opção de incluir um novo quadrante para configurar uma pergunta nova". **Antes:** o rodapé da montagem tinha o seletor "Adicionar a este questionário / Escolha uma pergunta do banco", e o botão Cadastrar pergunta do topo criava a pergunta fora do questionário. **Agora:** o rodapé tem o quadrante tracejado "Adicionar ao questionário", que abre o cadastro de pergunta nova (escolhe o tipo e preenche) e, ao salvar, a pergunta já entra no fim do questionário do card escolhido. O botão Cadastrar pergunta do topo saiu, e o seletor de perguntas já cadastradas também (ordem do responsável às 16:40: "retirar estes campos do formulário"); sobra só o quadrante. Sem campo novo nem Supabase.

### Decisão 204: Salvar Formulário no fim da configuração e retirada do Criar novo questionário

Ordem do responsável em 15/10 (16:48), com o print do botão: "retirar o botão em anexo, criar um botão no final da página: Salvar Formulário, tornar a configuração do formulário de despesas mais simples e intuitiva possível para o usuário". **Antes:** cada mudança na montagem do questionário gravava na hora, e o topo tinha o botão Criar novo questionário. **Agora:** o botão Criar novo questionário saiu (um card novo nasce em Editar cards, no passo 1). As mudanças da montagem ficam num rascunho na memória e só o botão **Salvar Formulário**, no fim da página, grava de verdade; o Módulo Viagens passa a usar o que foi salvo. Ao lado, o aviso "Há alterações que ainda não foram salvas." (ou "Tudo salvo.") e o botão Descartar alterações, que volta ao último salvo; sair da página com alterações pendentes pede confirmação do navegador. Salvar não sobrescreve dado ilegível. A tela segue em três passos simples: escolher o card, montar as perguntas, salvar. Sem campo novo nem Supabase.

### Decisão 205: Botão Restaurar configurações iniciais ao lado de Salvar Formulário

Ordem do responsável em 15/10 (17:04): "em Parâmetros > Veículos > Questionário de Despesas incluir um botão de restaurar configurações iniciais ao lado de salvar formulário." No fim da configuração, ao lado de Salvar Formulário, entra o botão **Restaurar configurações iniciais**. Ele pede confirmação e devolve ao padrão as perguntas, as opções e os questionários de todos os cards, mas só no rascunho: nada muda no formulário usado em Viagens até clicar em Salvar Formulário (e Descartar alterações desfaz a restauração). Os códigos de pergunta já usados não se repetem. Sem campo novo nem Supabase.

### Decisão 206: Retirada das Opções avançadas (ramificação e condição) da montagem do formulário

Ordem do responsável em 15/10 (17:10), com o print do item "Opções avançadas (ramificação e condição)": "retirar de todas as perguntas a opção em anexo para o usuário não fazer confusão, deixar a montagem do formulário mais simples possível." O bloco sai de todas as perguntas na configuração do Questionário de Despesas, com as telas de ramificação (próxima pergunta por opção) e de condição (mostrar só se). O que já estava configurado (por exemplo, a regra do cartão de crédito) continua valendo em Viagens e aparece como texto no card da pergunta; só não há mais tela para criar ou mudar essas regras. Sem campo novo nem Supabase.

### Decisão 207: Perguntas travadas na montagem do formulário

Ordem do responsável em 15/10 (17:23): "as caixas de unidades de federação, município, data da despesa, valor da despesa, foto do comprovante, detalhamento da despesa são travadas pois não terão necessidade de editar." Na configuração do Questionário de Despesas, essas seis perguntas ficam travadas: sem Editar, sem Adicionar opção e sem trocar Obrigatória; o card mostra "Pergunta travada: não precisa de edição". Continuam podendo mudar de posição e sair do questionário de um card (setas e lixeira). Sem campo novo nem Supabase.

### Decisão 208: Adicionar opção em Habilitados e em Técnico responsável pela despesa

Ordem do responsável em 15/10 (17:29), com o print do botão: "adicionar botão de adicionar opção nos campos habilitados ao questionário de viagem, técnico responsável pela despesa." Nos cards dessas duas perguntas entra o botão **Adicionar opção**, como nas demais. Como as duas não têm opções escritas e sim empregados, o botão busca o empregado ativo pelo nome e inclui na lista de habilitados da pergunta 04. Em "Habilitados" o responsável escolhe a área (Oficina, PCM ou Administrativo); em "Técnico responsável pela despesa" a pessoa entra com a área Oficina, porque essa pergunta usa os habilitados de Oficina da pergunta 04. Quem já está na lista não aparece na busca. Vale só ao Salvar Formulário. Sem campo novo nem Supabase.

### Decisão 209: Perguntas do questionário em ordem numérica

Ordem do responsável em 15/10 (17:37): "colocar em ordem numérica todas as perguntas que estão no formulário do questionário, hoje as perguntas estão com números desordenados." As perguntas de fábrica passam a ter o número na ordem em que aparecem: Técnico responsável pela despesa vira 05 e as seguintes seguem de 06 (Unidade da Federação) a 14 (PCM responde). Os identificadores internos não mudam, então nada que já funciona se perde. Nos dados já salvos neste navegador a renumeração roda uma vez só; pergunta criada pelo responsável que já usasse um desses números passa para o próximo livre (15 em diante), para nenhum número se repetir. Sem campo novo nem Supabase.

### Decisão 210: Remover ramificações antigas com problema

Achado da revisão de 15/10 (17:38) sobre as decisões 205 a 208: com as Opções avançadas retiradas (decisão 206), uma ramificação antiga que ficou com problema (opção que não existe mais, pergunta de destino fora do questionário ou pergunta que não ramifica mais) deixava o aviso "Ação requerida" sem tela para corrigir. O aviso ganha o botão **Remover as ramificações com problema**: tira só as opções com problema, mantém as boas, e vale ao Salvar Formulário. Sem campo novo nem Supabase.

### Decisão 211: Editar despesa registrada

Pedido do dono (15/10, 17:52): na lista "Respostas registradas" do módulo Viagens, cada despesa ganha o botão **Editar** (ao lado de Excluir), que volta à tela das perguntas com a despesa preenchida. Ao salvar ("Salvar alterações") a despesa mantém número, data e hora do registro. Despesa que já está num relatório (Finalizada) não pode ser editada, igual à exclusão. Edita quem pode gravar. A resposta passa a guardar também os valores digitados (`valores`); registros antigos são reconstituídos a partir do texto. Sem Supabase.

### Decisão 212: Botão Novo na resposta registrada

Pedido do dono (15/10, 17:53): na tela "Resposta registrada", o botão "Preencher novamente" passa a se chamar **Novo** e volta à tela inicial do módulo Viagens para lançar uma nova despesa.

### Decisão 213: Gerar relatório abaixo da listagem

Pedido do dono (15/10, 18:08): na lista de despesas do módulo Viagens, o botão **Gerar relatório** (com o contador de despesas marcadas) passa a ficar abaixo da tabela, não acima. Só muda a posição. Sem Supabase.

### Decisão 214: Ícone de gráfico de pizza em Faixas de desempenho

Pedido do dono (15/10, 18:11): o botão **Faixas de desempenho** do painel de Viagens troca o ícone de paleta por um de gráfico de pizza. Só muda o ícone. Sem Supabase.

### Decisão 215: Conferido (PCM ou Administrativo) na Conferência do relatório

Pedido do dono (15/10, 18:58): na Conferência do Relatório de Viagens, sai o botão **Abrir Parâmetros > Clientes** e entra o campo **Conferido:** com lista suspensa de duas opções, **PCM** ou **Administrativo** (começa em branco). A escolha vale para o relatório gerado e, quando preenchida, sai no documento abaixo de "Clientes visitados". Sem campo novo no cadastro nem Supabase.

### Decisão 216: Lógica de perguntas de Alimentação, Hospedagem, Pedágio e Estacionamento

Pedido do dono (15/10, 19:18 e 19:21), a partir de um scanner de fluxograma: estes quatro tipos seguem a mesma lógica de perguntas, nesta ordem: **quem lança** (04); se quem lança é do PCM ou do Administrativo, **PCM responde** (13), com Avulso (técnico não monitorado) ou Não conformidade (técnico monitorado que não lançou); só na Não conformidade vem o **técnico responsável** (14), isto é, o técnico que não lançou; depois, para todos, **data**, **UF**, **município**, **cliente**, **moeda** (e o cartão, se for cartão de crédito), **valor** e **foto do comprovante**. Quem lança pela Oficina pula direto para a data.

- **Detalhamento da despesa** sai destes quatro tipos; fica só na Compra de peças para cliente.
- **Sem comprovante:** ao tentar encerrar sem anexar a foto, abre a tela "Comprovante não anexado", que pede a **justificativa da ausência do documento** e permite **Encerrar com justificativa** (ou Voltar e anexar). A justificativa fica na despesa e aparece nas respostas registradas. Vale só nestes quatro tipos; os demais continuam exigindo o comprovante.
- Os outros tipos (Abastecimento, Manutenção, Compra de peças, Outro) não mudam.
- Clientes foi mantido nos quatro tipos (o scanner não o mostra; o relatório usa os clientes visitados).
- Dado já salvo no navegador passa **uma vez só** para essa ordem; pergunta criada pelo responsável nesses tipos fica antes do comprovante. Registro para a Fase 2 em docs/pendencias-fase2.md. Sem Supabase.
- Revisão do PR: a migração também limpa ramificações e seções que apontavam para pergunta que saiu dos quatro tipos (Detalhamento), para o questionário não ficar com "ação requerida".

### Decisão 217: Desfeita a decisão 216 (lógica de perguntas dos 4 tipos)

Pedido do dono (15/10, 19:35): "desfazer esta última alteração". O código da decisão 216 foi revertido: Alimentação, Hospedagem, Pedágio e Estacionamento voltam à ordem e às perguntas de antes (com Detalhamento, sem PCM responde condicional e sem tela de justificativa). O texto da decisão 216 e o registro de Fase 2 da justificativa ficam no histórico, **sem valer**. O scanner do dono segue como referência caso a lógica seja retomada. Navegadores que já migraram para a ordem da 216 continuam com ela até as perguntas serem reordenadas ou o questionário ser restaurado pelo botão Restaurar configurações iniciais. Sem Supabase.

### Decisão 218: Classificação Avulso ou Não conformidade em Alimentação

Pedido do dono (15/10, 19:46), para testar só em **Alimentação** (se ficar bom, ele manda estender aos outros tipos): logo depois de **quem lança** (04) entram os campos de classificação do PCM ou Administrativo.

- **PCM responde** (13, Avulso ou Não conformidade) só aparece quando quem lança é do **PCM ou do Administrativo**; quem lança pela Oficina segue direto.
- **Avulso (técnico não monitorado):** abre o campo **Nome do empregado** (pergunta 15, texto livre, obrigatório).
- **Não conformidade (técnico monitorado que não lançou):** pede o **técnico responsável** (14), isto é, o técnico que não lançou.
- Depois seguem as demais perguntas, na mesma ordem de antes (sem tirar Detalhamento, Clientes nem mudar a foto do comprovante).
- As condições ficam gravadas como regras do questionário de Alimentação (14 só na Não conformidade, 15 só no Avulso). Os outros tipos não mudam.
- Dado já salvo no navegador ganha a classificação em Alimentação **uma vez só**; a pergunta 15 nasce com o número 15, fora da sequência dos demais por não ter lugar sem renumerar todas.
- O nome do empregado no Avulso fica só registrado na despesa; ele **não** vira técnico responsável nem entra em relatório (a confirmar com o dono). Registro de Fase 2 em docs/pendencias-fase2.md. Sem Supabase.

### Decisão 219: Classificação nos demais cards de despesa (Hospedagem, Pedágio, Estacionamento, Compra de peças)

Pedido do dono (15/10, 20:05 e 20:06), depois de validar a decisão 218 em Alimentação: aplicar a **mesma lógica** nos cards **Hospedagem**, **Pedágio**, **Estacionamento** e **Compra de peças para cliente**.

- Em cada um desses cards, logo depois de **quem lança** (04), entram **PCM responde** (13), o **técnico responsável** (14) e o **Nome do empregado** (15), com as mesmas regras da decisão 218: a classificação só aparece quando quem lança é do PCM ou do Administrativo; Avulso abre o nome do empregado; Não conformidade pede o técnico que não lançou.
- **Abastecimento, Manutenção do veículo de trabalho e Outro não mudam** (nada foi pedido para eles).
- Dado já salvo no navegador ganha a classificação nesses quatro cards **uma vez só** (marca `classificacaoTiposAjustada`); Alimentação não é refeita, para não desfazer ajustes do dono na montagem.
- O nome do empregado do Avulso continua só registrado na despesa (ponto da decisão 218 ainda a confirmar). Sem Supabase.

### Decisão 220: O Avulso entra no relatório com o nome do empregado

Resposta do dono (15/10, 20:16) à dúvida da decisão 218: "O Avulso será um empregado diferente dos técnicos cadastrados, ele entra no relatório".

- Quando quem lança é do PCM ou do Administrativo e a classificação é **Avulso**, o **Nome do empregado** (pergunta 15) passa a ser o **responsável** da despesa: ela aparece na lista de despesas de Viagens com esse nome, pode ser marcada e entra no **relatório** dele (um relatório por empregado, como para os técnicos).
- O Avulso **não é técnico cadastrado**: continua **fora do índice de conformidade** e fora de "Resultados dos técnicos" no painel; o filtro de técnico da lista também traz os empregados Avulso lançados.
- Não conformidade não muda (o responsável é o técnico que não lançou).
- Substitui o ponto "só fica registrado" da decisão 218. Nada no Supabase; na Fase 2 o nome pode ligar ao cadastro de empregados (docs/pendencias-fase2.md).

### Decisão 221: Nova ordem das perguntas do questionário de Viagens e justificativa sem documento

Ordem do responsável em 16/10 (11:49), com o print da pergunta "Habilitados ao questionário de viagem": o nome passa a ser **Técnico responsável**, ela vai para o lugar da primeira pergunta e a ordem dos cards **Alimentação, Hospedagem, Pedágio e Estacionamento** (e **Compra de peças para cliente**, citada na ordem) passa a ser: Técnico responsável, Data da despesa, Unidade da Federação, Município (cidade), Moeda, Valor da despesa e Foto do comprovante (documento). **Detalhamento da despesa** só existe em Compra de peças para cliente, entre o valor e o documento.

- A pergunta 04 ("quem lança") continua a mesma, só muda o nome; a pergunta 14 passou a se chamar **Técnico que não lançou a despesa**, para não repetir o nome.
- **Sem documento:** se quem lança tentar encerrar sem anexar, abre o campo obrigatório **Justifique a ausência do documento** (pergunta 16, de sistema) e a despesa **pode ser encerrada com a justificativa**. Se o anexo entrar depois, a justificativa some e não é gravada. Despesa encerrada com justificativa reabre na edição com ela à mostra.
- **Escolhas minhas onde o pedido não dizia** (a conferir no preview): a classificação PCM responde (dec 218/219) continua logo depois do Técnico responsável; **Clientes** fica depois do Município e **Cartões de crédito** depois de Moeda (só com Moeda = Cartão de crédito, dec 182); os números das perguntas (dec 209) não foram trocados.
- Abastecimento, Manutenção e Outro não mudam. Dado salvo no navegador migra **uma vez só** (marca `ordemViagensAjustada`), refazendo a ordem desses cinco tipos; pergunta criada pelo responsável fica entre o valor e o documento. Sem Supabase.

### Decisão 222: Sem o campo Clientes nos questionários

Ordem do responsável em 16/10: às 12:00 "retirar o campo de clientes dos módulos alimentação, hospedagem, pedágio, estacionamento" e às 12:14, com o print, "retirar o campo clientes de todos os cards".

- A pergunta **Clientes** sai de **todos** os questionários de Viagens: Alimentação, Hospedagem, Abastecimento, Pedágio, Estacionamento, Manutenção do veículo de trabalho, Compra de peças para cliente e Outro. A pergunta continua cadastrada no banco de perguntas e pode ser incluída de novo na montagem, se o responsável quiser.
- Despesas desses tipos ficam sem cliente na lista e no relatório de Viagens (o campo já era opcional lá). Despesas já registradas mantêm o que foi respondido.
- Dado salvo no navegador migra **uma vez só** (marca `clientesRetiradosDeTodos`; a marca `clientesRetirados` da primeira versão, que só cobria quatro tipos, não conta); quem voltar Clientes à mão depois não é desfeito. Sem Supabase.

### Decisão 223: Card Abastecimento na ordem de Alimentação e cartão que abre o Novo abastecimento

Ordem do responsável em 16/10 (12:31): "No módulo Viagens no card Despesas Abastecimento colocar as perguntas na mesma ordem do card Alimentação. Quando chegar na pergunta sobre o cartão de crédito, ao selecionar, irá abrir a tela do módulo de veículo > abastecimento > novo abastecimento e irá puxar os dados de lá e extrair apenas os dados de data da despesa do abastecimento e valor da despesa do abastecimento, depois volta para o card para finalizar a despesa de abastecimento".

- **Ordem:** Técnico responsável, Data da despesa, UF, Município, Moedas, Cartões de crédito, Valor da despesa, **Litros abastecidos** (continua pedido; fica depois do valor), Foto do comprovante. Como em Alimentação, o card também ganha a classificação "PCM responde" (decisão 218) e a justificativa da ausência do documento (decisão 221); o Abastecimento não pergunta Clientes (decisão 222).
- **Cartão de crédito:** ao escolher o cartão na pergunta Cartões de crédito do card Abastecimento abre a janela **Novo abastecimento**, a mesma de Módulos > Veículos > Abastecimento (veículo, data, hora, km, litros e valor; mesmas conferências de km). Ao salvar, o abastecimento fica registrado em Veículos e **só a data e o valor** voltam para Data da despesa e Valor da despesa do card; litros e km não vêm. Cancelar a janela mantém o card como está; o botão "Registrar no Novo abastecimento" embaixo da pergunta do cartão abre a janela de novo.
- **Escolhas minhas onde o pedido não dizia:** a janela abre ao escolher o cartão (e não ao escolher a moeda); a classificação e a justificativa valem também no Abastecimento para a ordem ficar igual à de Alimentação.
- Dado salvo no navegador migra uma vez só (marca `abastecimentoAjustado`). Só modo demonstração, nada no Supabase; na Fase 2 o vínculo entre a despesa e o abastecimento registrado pode ser gravado (docs/pendencias-fase2.md).

## Decisão 224 — Despesa de abastecimento ligada ao módulo Abastecimento (2026-10-16)

Pedido do dono (12:51): "ao preencher uma despesa de abastecimento ela deve conversar com o módulo abastecimento; quando as informações de despesas de viagens forem informadas devem puxar os dados do módulo abastecimento". Complementa a decisão 223.

- **Vínculo:** a despesa do card Abastecimento guarda o id do abastecimento de Módulos > Veículos > Abastecimento (`abastecimento:id` em `valores`). Ao enviar ou salvar a edição, **data e valor da despesa são puxados do abastecimento ligado** (vale o que está em Veículos). Se o abastecimento foi excluído, a despesa não grava e avisa para escolher outro ou registrar um novo.
- **Sem duplicar:** além de "Registrar no Novo abastecimento", o card tem **"Escolher abastecimento já registrado"**: lista os abastecimentos da empresa (mais novos primeiro) e a escolha traz data e valor. O cartão só abre o Novo abastecimento sozinho quando ainda não há abastecimento ligado.
- Sob a pergunta do cartão aparece um resumo do abastecimento ligado (data, hora, km, litros, valor).
- **Escolha minha onde o pedido não dizia:** continuam vindo só data e valor (decisão 223); litros seguem como pergunta do card.
- Só modo demonstração; nada no Supabase. Fase 2: coluna de ligação despesa x abastecimento com `empresa_id` (docs/pendencias-fase2.md).

## Decisão 225 — Litros também vêm do abastecimento (2026-10-16)

Pedido do dono (13:00): "incluir litros abastecidos também ao clicar escolher abastecimento já registrado". Muda a decisão 223 (só data e valor) e a 224.

- Ao escolher um abastecimento já registrado, ou ao salvar o Novo abastecimento, **data, valor e litros** vão para o card Abastecimento. Km continua sem vir.
- Ao enviar, a despesa ligada puxa de novo data, valor e litros do abastecimento (decisão 224).
- Litros abastecidos segue como pergunta do card, na mesma posição, já preenchida.

## Decisão 226 — Manutenção do veículo de trabalho em Viagens (2026-10-16)

Pedido do dono (13:12): "no card manutenção de veículo de trabalho, colocar as perguntas na mesma ordem do card alimentação. Ao clicar no cartão de crédito e escolher o cartão seguir a mesma lógica do módulo de abastecimento, porém ele irá puxar as informações do módulo de manutenção: data de despesa, detalhamento da despesa, custo total, e retorna para preenchimento do formulário".

- **Ordem:** Técnico responsável, Data da despesa, UF, Município, Moedas, Cartões de crédito, Valor da despesa, **Detalhamento da despesa**, Foto do comprovante. O card ganha a classificação "PCM responde" (decisão 218) e a justificativa da ausência do documento (decisão 221), como Alimentação; sem Clientes (decisão 222).
- **Cartão de crédito:** ao escolher o cartão abre a janela **Cadastrar nova manutenção** (a mesma de Módulos > Veículos > Manutenção, agora um componente reaproveitado). Ao salvar, a manutenção fica registrada em Veículos e voltam para o card a **data**, o **detalhamento** (grupos e ações feitas, e a descrição da corretiva) e o **custo total**, que vai para o Valor da despesa. O botão "Registrar na Nova manutenção" reabre a janela.
- **Vínculo (como na decisão 224):** a despesa guarda o id da manutenção; ao enviar, data e custo total são puxados de novo dela. O detalhamento vem uma vez e pode ser ajustado. Botão **"Escolher manutenção já registrada"** lista as manutenções da empresa para não duplicar. Manutenção excluída impede gravar e avisa.
- **Escolhas minhas onde o pedido não dizia:** a janela abre ao escolher o cartão; ao cadastrar uma manutenção por este card o relatório de manutenção não abre sozinho (só na tela do módulo); o detalhamento fica editável.
- Dado salvo migra uma vez só (marca `manutencaoAjustada`). Só modo demonstração; na Fase 2, coluna de ligação despesa x manutenção com `empresa_id` (docs/pendencias-fase2.md).

## Decisão 227 — Card Outro na ordem do Alimentação (2026-10-16)

Pedidos do dono (13:30): "colocar as perguntas do card outro na mesma ordem do módulo alimentação"; (13:37): "no card outros incluir o campo de detalhamento da despesa".

- O card **Outro** segue a ordem do Alimentação: Técnico responsável, Data da despesa, UF, Município, Moedas, Cartões de crédito, Valor da despesa, **Detalhamento da despesa** (depois do valor, pedido do dono às 13:37), Foto do comprovante. Ganha a classificação "PCM responde" (decisão 218) e a justificativa da ausência do documento (decisão 221); sem Clientes (decisão 222) e sem Litros.
- Com isso, os oito tipos de despesa seguem a mesma ordem.
- Dado salvo migra uma vez só (marca `outroAjustado`). Tipo novo criado pelo responsável continua usando o questionário completo de fábrica.
