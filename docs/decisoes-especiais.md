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
