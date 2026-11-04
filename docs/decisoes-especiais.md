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

> Alterada pela decisão 334: os dois prazos passaram para Parâmetros > Viagens > Parâmetros Específicos; em Veículos ficaram as faixas de desempenho.

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

### Decisão 228: Novo código cria a categoria junto com a sigla e a numeração

Pedido do responsável em 16/10 (13:48): "ao clicar novo código permitir inserir uma nova categoria, sigla e numeração, estes são os parâmetros para gerar o código dos produtos". **Antes:** Novo código em Parâmetros > Gerais > Código do produto só deixava escolher uma categoria que já existia em Categorias. **Agora:** o campo Categoria é digitável, com sugestão das categorias existentes. Nome novo cria a categoria, a sigla e a numeração inicial numa gravação só; nome de categoria que já existe só ganha mais uma sigla (decisão 172). A sigla segue única no sistema, a numeração tem até 4 dígitos maior que zero e erro em qualquer campo não grava nada (nem a categoria). Clonar e Editar continuam com a categoria da linha. Nada no Supabase; a Fase 2 não precisa de nada novo (categoria e regra de código já estão em docs/pendencias-fase2.md).

### Decisão 229: Código do produto sem o botão Clonar

Pedido do responsável em 16/10 (14:00): "retirar todos os botões Clonar deste menu" (print de Parâmetros > Gerais > Código do produto). **Antes:** cada linha tinha Clonar, Editar e Excluir (decisões 138 e 172). **Agora:** a lista de Código do produto tem só Editar e Excluir; para mais uma sigla na categoria usa-se o botão Novo código (decisão 228). Exceção registrada à decisão 45 (Clonar em toda lista de Parâmetros) só para esta tela. Os demais menus de Parâmetros não mudam.

### Decisão 230: Cadastrar fornecedor em janela no Novo código de fábrica

Pedido do responsável em 16/10 (14:11): "em novo código de fábrica criar o link para ir ao cadastro de fornecedores, preencher e voltar ao formulário sem sair da tela". **Antes:** o aviso "Nenhum fornecedor cadastrado" levava a Cadastros > Fornecedores, fora do formulário, e só aparecia com a lista vazia. **Agora:** sob o campo Fornecedor há sempre o link **Cadastrar fornecedor**, que abre a janela de cadastro por cima do formulário (a mesma de Cadastros > Fornecedores, componente FornecedorDialog). Ao salvar, a janela fecha e o formulário volta com o fornecedor novo já escolhido; produto e código na nota digitados ficam como estavam. Cancelar volta sem mudar nada. Mesmo padrão do cadastro de cliente no formulário de despesas (decisão 170). Nada no Supabase.

### Decisão 231: Clonar código de fábrica clona o produto, com código novo

Pedido do responsável em 16/10 (14:24 a 14:35, escolha "Clonar o produto"): ao clonar, o código da GEMAPE nunca repete o do original; repetem-se todas as informações do produto e gera-se o código seguinte da sequência, em todos os produtos do sistema. **Conferido:** o Clonar de EPI, Uniforme, Ferramenta, Veículo e Produto já gera código novo e sequencial. **Antes:** o Clonar de Código de fábrica abria a associação ligada ao mesmo produto, e o código GEMAPE aparecia repetido na lista. **Agora:** a janela abre como **Clonar código de fábrica**: o produto aparece como "Novo produto, cópia de EPI-0001", fornecedor, código na nota e CA vêm copiados e editáveis (decisão 138). Ao salvar, o sistema cria uma cópia do produto (todas as informações, saldo zerado, código seguinte com a mesma sigla do original) e a associação ao produto novo, na mesma tela. A associação é validada primeiro e desfeita se o produto não for criado, e o duplo clique é travado. **Exceção:** produto que vem do catálogo de EPI ou de Uniforme (por tamanho) não é clonado aqui; o aviso manda clonar em Parâmetros > EPI ou Uniforme, que pede outro tamanho, e depois usar Nova associação. Fora do modo demonstração o Clonar segue como antes. Nada no Supabase real; na Fase 2 a cópia do produto e a associação passam a ser uma operação única no banco (docs/pendencias-fase2.md).

### Decisão 232: Responsividade para celular e tablet

Pedido do responsável em 16/10 (14:42): "melhorar a responsividade do sistema para telas de celular e tablets"; escolha "Cartões" (14:47). **Conferido:** 26 telas em 390 px (celular) e 820 px (tablet); o menu já recolhe e o tablet já funcionava bem. **Antes:** no celular as colunas das listas ficavam espremidas e Editar e Excluir ficavam escondidos à direita; duas telas passavam da largura (Parâmetros > Veículos > Manutenção e Gerais > Tamanho e Medidas). **Agora:** (1) abaixo de 640 px cada linha de lista vira um **cartão** com rótulo e valor (o rótulo é o título da coluna) e os botões embaixo; de 640 px para cima a tabela é a mesma de sempre; (2) botões e campos ficam mais altos no celular (área de toque de 40 a 48 px); (3) nas janelas, Salvar e Cancelar ficam fixos no rodapé do celular, sem precisar rolar até o fim; (4) as duas telas que estouravam foram corrigidas. Vale para todas as listas do sistema, inclusive as de Parâmetros de Veículos e Ferramentas; uma tabela que deva continuar com rolagem lateral usa `semCartoes`. Nada no Supabase.

### Decisão 233: Clientes volta a todos os questionários de Viagens

Pedido do responsável em 16/10 (16:38), com o print do Relatório de Viagens saindo "Clientes não informados": "incluir o campo clientes em todos os cards de preenchimento, opção com link no cadastro de clientes, para que saia no relatório de viagens".

- A pergunta **Clientes** volta a **todos** os questionários (Alimentação, Hospedagem, Abastecimento, Pedágio, Estacionamento, Manutenção do veículo de trabalho, Compra de peças para cliente e Outro), logo depois do Município. Ela continua opcional e usa o cadastro de Parâmetros > Clientes, com o link **Cadastrar cliente** abrindo a janela de cadastro (dec 170) e voltando com o cliente escolhido.
- O cliente escolhido sai na coluna Cliente e em **Clientes visitados** do Relatório de Viagens (o relatório já lia essa resposta).
- Desfaz a decisão 222. Dado salvo no navegador migra **uma vez só** (marca `clientesEmTodos`): Clientes entra onde faltava; quem tirar a pergunta de um questionário depois não é desfeito. Despesas já registradas continuam sem cliente. Sem Supabase.

### Decisão 234: Logomarca nova no Relatório de Viagens

Pedido do responsável em 16/10 (16:40), com a imagem da logomarca GEMAPE 40 anos (colorida, fundo branco): "trocar a logo que sai impressa no relatório de viagens pela segunda imagem anexo".

- O Relatório de Viagens (ao gerar e ao reabrir pela lista) imprime a nova logomarca, arquivo `public/logo-relatorio-viagens.png` (a imagem enviada, sem a margem branca). A coluna da logo no cabeçalho ficou um pouco maior (46 mm) para o texto "Máquinas e Peças" continuar legível.
- Só o relatório de Viagens muda: os demais documentos continuam com `public/logo.png`. Sem Supabase.

### Decisão 235: Gasto por técnico responsável no relatório de todos os empregados

Pedido do responsável em 16/10 (17:02): "quando for selecionado o relatório de todos empregados, constar no relatório o gasto por técnico responsável".

- No Relatório de Viagens de "Todos os empregados" (ao gerar e ao reabrir pela lista), a tabela de despesas ganha a coluna Técnico e, depois do quadro por tipo, sai o quadro "Gasto por técnico responsável" (técnico, lançamentos e total, com total geral), em ordem alfabética.
- Lançamento sem técnico responsável aparece como "Sem técnico responsável", por último. Relatório de um empregado só continua como antes. Sem Supabase.

### Decisão 236: Opção "Sem cliente vinculado" no campo Clientes

Pedido do responsável em 16/10 (17:13): "incluir no campo clientes: Sem cliente vinculado, para viagens sem cliente específico".

- A lista do campo Clientes (todos os cards de Viagens) começa com a opção fixa "Sem cliente vinculado"; satisfaz a obrigatoriedade do campo. Ela não é um cadastro e não depende de Parâmetros > Clientes.
- No Relatório de Viagens a opção aparece na coluna Cliente da linha, mas não entra em "Clientes visitados". Sem Supabase.

### Decisão 237: Sem confirmação ao autorizar tamanho em Associar Tamanho e Medida ao Produto

Pedido do responsável em 16/10 (17:49), com a imagem da mensagem "Produtos com saldo: EPI-0001. Esse saldo fica em 'Sem tamanho': não é convertido e só pode sair até zerar. Autorizar mesmo assim?": "retirar esta mensagem de todas as telas de parâmetros".

- Autorizar tamanho (ou unidade) a uma subcategoria passa a gravar direto, sem a janela de confirmação. Era a única tela de Parâmetros com esse aviso.
- O saldo dos produtos que já existiam continua em "Sem tamanho", como antes: só a pergunta saiu. O aviso de desautorizar (produtos que dependem do tamanho ou da unidade) não muda. Sem Supabase.

### Decisão 238: Empresa em cada linha do Estoque dos módulos

Pedido do responsável em 16/10 (18:01), com a imagem do Estoque de EPI: "no módulo estoque EPI está repetindo e gravando os mesmos códigos, novamente cada código é único e deve ser gerenciado única e exclusivamente separado". Escolha dele no card: "Coluna Empresa".

- O código continua único no catálogo. Com "Todas as empresas", o Estoque mostrava uma linha por empresa (cada empresa tem o seu registro de saldo e mínimo do mesmo código, decisão 35) sem dizer qual era a empresa, e o código parecia repetido.
- O Estoque de EPI, Uniformes e Ferramentas ganha a coluna Empresa em cada linha, o Exportar CSV traz a empresa, e a janela Configurar mostra a empresa no título. O saldo, o mínimo e o alerta seguem separados por empresa. Sem Supabase.

### Decisão 239: Entrega EPI no módulo EPI (registro de entrega e devolução)

Pedido do responsável em 16/10 (17:37), com plano aprovado por ele ("ok") e a escolha "Tela nova" no card.

- Em Módulos > EPIs, o submenu "Entrega EPI" (antes de Termo de Entrega; `/epi?aba=entrega`) tem dois botões: Registrar entrega e Devolver EPI (só o Administrador vê este). O Termo de Entrega continua como está; depois de registrar a entrega, a tela oferece abrir o termo assinável da mesma entrega (textos escapados).
- Registrar entrega: empresa (só ativas), empregado (ativo e sem demissão vencida), EPI do catálogo, tamanho, quantidade, data (Brasília) e observações (primeira maiúscula, resto minúsculo). Quantidade inteira maior que zero e não maior que o saldo da empresa (por tamanho, quando há). Todas as linhas são gravadas de uma vez: se uma passa do saldo, nenhuma é gravada; o botão trava o clique repetido e a lista é limpa depois de gravar.
- Devolver EPI: só o Administrador; devolve até o que o empregado tem em posse (entregue menos devolvido e baixado, por EPI e tamanho); soma ao saldo; grava a data e o responsável (por padrão, o usuário logado, editável).
- Cada movimentação ganha código automático, sigla + numeração, com contagem separada: ENT-0001 para entrega e DEV-0001 para devolução. O código nunca repete (lê todos os códigos já gravados antes de gerar).
- Alerta de mínimo: faixa no alto da tela com os EPIs no mínimo ou abaixo (por tamanho, quando há) e aviso ao registrar a entrega que leva o saldo ao mínimo. O estoque do demo continua reativo.
- Histórico completo de movimentações de EPI por EPI e por empregado (lido em blocos, sem o limite de 1000 linhas), com Exportar CSV.
- Ficha de EPI Avulsa: ganhou a coluna Código e, na devolução, o responsável. Cada entrega e devolução entra na ficha com data, EPI, tamanho, quantidade e código.
- Só modo demonstração: as colunas `codigo_movimentacao` e `responsavel_nome` de `movimentacoes` existem só no demo (anotadas em `docs/pendencias-fase2.md`). Nada no Supabase.

### Decisão 240: Tamanho na Entrada de Movimentações (EPI e Uniforme)

Pedido do responsável em 16/10 (18:14), com a imagem da Nova movimentação de uniforme: "no campo de entrada de uniforme incluir o tamanho". Escolha dele no cartão: "Todos ativos".

- Em Módulos > EPIs e Uniformes > Movimentações, na Entrada, o produto sem nenhum tamanho autorizado ativo na subcategoria passa a mostrar o campo Tamanho com todos os tamanhos ativos de Gerais; o tamanho é obrigatório. Produto com tamanho autorizado continua com só os autorizados.
- Ao registrar, o tamanho escolhido é associado à subcategoria do produto (antes de gravar; se a gravação falhar, a associação é desfeita). O saldo antigo continua em "Sem tamanho", e a entrada soma no tamanho escolhido.
- Compras e demais telas não mudam. Sem tamanhos em Gerais, o estoque continua único.

### Decisão 241: Dar baixa em ferramenta pela caixa não exige estoque do cadastro

Pedido do responsável em 16/10 (18:25), com a imagem da janela "Dar baixa em ferramenta da caixa CX-0001" e o aviso "Falha ao registrar movimentação: Estoque insuficiente": "corrigir a funcionalidade e permitir dar baixa na ferramenta nas caixas".

- Causa: a ferramenta cadastrada em Parâmetros nasce com estoque zero (o que existe fica guardado na caixa), e a baixa era conferida contra esse estoque, mesmo com 1 guardada na caixa.
- Agora a baixa pela caixa (com ou sem empregado) é gravada no histórico sem mexer no estoque do cadastro; o limite continua sendo o guardado na caixa (sem empregado) ou o que está com o empregado, conferido pela própria janela. Saída comum de ferramenta sem estoque continua recusada.
- Só modo demonstração; no banco real o gatilho de movimentações precisa pular o estoque quando houver `caixa_id` em baixa (registrado em `docs/pendencias-fase2.md`).

### Decisão 242: Motivo "Devolução" na baixa de ferramenta pela caixa

Pedido do responsável em 16/10 (18:26), com a imagem da lista Motivo da baixa: "incluir no campo motivo da baixa: devolução".

- Em Módulos > Ferramentas > Caixas > Dar baixa, a lista Motivo da baixa ganha "Devolução" no fim (Desligamento, Desgaste Natural, Quebra, Desaparecimento, Perda, Mau Uso, Devolução).
- Conta como baixa, igual aos outros motivos. A lista de motivos das Movimentações dos módulos não mudou; se o responsável quiser Devolução lá também, é um pedido à parte.

### Decisão 243: Transferir ferramenta entre caixas, inclusive para caixa ainda sem cadastro

Pedido do responsável em 16/10 (18:28), com a imagem das caixas CX-0001 a CX-0003: "habilitar o campo: transferir permitindo passar uma ferramenta de uma caixa a outra e registrar a movimentação no histórico de movimentações".

- Causa: o botão Transferir só ligava com duas caixas já cadastradas; CX-0002 e CX-0003 estavam habilitadas, mas sem ferramentas, e não contavam como destino.
- Agora o botão liga quando há outra caixa cadastrada ou habilitada sem cadastro. A lista Caixa de destino mostra as duas, e a sem cadastro aparece como "(ainda sem ferramentas)".
- Transferir para caixa sem cadastro cria a caixa (mesma empresa da origem, status Ativa) já com a ferramenta e a mesma quantidade; só depois a ferramenta sai da origem, e se a saída falhar a entrada no destino é desfeita.
- A movimentação "Transferência" (origem, destino, data) fica no Histórico de movimentações das duas caixas.

### Decisão 244: Entrega da caixa no Termo de Responsabilidade não exige estoque do cadastro

Pedido do responsável em 16/10 (18:37), com a imagem do aviso "A entrega de 1 unidade(s) de Amperimetro passa do estoque disponível (0)" ao gerar o Termo de Responsabilidade com a caixa CX-0001: "corrigir a mensagem em anexo".

- Causa: a mesma da baixa (decisão 241). A ferramenta cadastrada nasce com estoque zero e a quantidade fica guardada na caixa, mas a entrega era conferida contra o estoque do cadastro.
- Com caixa escolhida, o Termo confere o que está guardado na caixa (quantidade na caixa menos o que está com empregados e o baixado), com o aviso "passa do que está guardado na caixa (n)". Entrega avulsa, sem caixa, continua conferida contra o estoque.
- No modo demonstração, entrega, devolução e baixa de ferramenta ligadas a uma caixa não mexem mais no estoque do cadastro (a caixa controla a quantidade). No banco real o gatilho precisa fazer o mesmo (`docs/pendencias-fase2.md`).

### Decisão 245: Município é uma única lista suspensa que busca ao digitar

Pedido do responsável em 16/10 (19:02), com a imagem do campo Município em Viagens: "deixa somente a lista suspensa para selecionar os municípios e ao digitar ele irá buscar os municípios".

- O campo "Buscar município" separado saiu. O Município passa a ser um só campo: ao clicar abre a lista dos municípios da UF respondida antes, e ao digitar a lista filtra (sem acento e sem diferenciar maiúscula). Não há mais o aviso "Mostrando 200 de 853".
- A lista abre empurrando o que vem abaixo (`listaNoFluxo` do CampoBusca), porque o cartão seguinte cobria a lista flutuante.
- Sem UF escolhida o campo fica desabilitado, como antes. Escolhido o município, aparece com o botão Trocar.

### Decisão 246: Anexo de imagens mostra miniaturas

Pedido do responsável em 16/10 (19:01), com a imagem do campo "Foto do comprovante": "ao anexar imagem no campo do anexo fazer com que apareça as miniaturas ao invés do texto".

- Cada imagem anexada no questionário aparece como miniatura (já reduzida) em vez da linha "nome: tamanho para tamanho". O nome e a redução ficam na dica ao passar o mouse.
- O botão × no canto da miniatura remove a imagem (substitui o link "Remover"). Limite de 3 imagens e mensagem de contagem continuam iguais.

### Decisão 247: Parâmetros > Equipamentos > Cadastrar equipamento (e Módulos > Equipamentos)

Pedido do responsável em 22/10: criar o menu **Equipamentos** em Parâmetros e em Módulos. Em Parâmetros ficam os cadastros; em Módulos ficarão a lógica e as funcionalidades (por ora o módulo só mostra "em construção"). Feito conforme as sugestões, com ajustes combinados para depois.

- **Dados gerais (todos obrigatórios):** empresa, código de patrimônio (TAG ou placa, digitado e único; guardado em maiúsculas), nome/descrição, categoria, marca/fabricante, modelo, número de série, data de aquisição (real e não futura, em horário de Brasília), valor de compra (0 ou mais) e setor/localização. Status atual: Ativo, Em manutenção, Baixado/Inativo ou Reserva.
- **Categorias:** Máquina / Veículo, Maquinário elétrico, Jato de alta pressão, Segurança (extintor) e Ferramental. A categoria decide quais **grupos de especificações técnicas** aparecem; os campos dos outros grupos somem do formulário e não são guardados. O jato de alta pressão junta os grupos de motor e elétrico; o Ferramental não tem especificação técnica.
- **Máquina / Veículo:** propulsão (Diesel, Gasolina, Elétrico, GLP/Gás, Manual), capacidade de carga (kg ou t), horímetro inicial (h), consumo estimado (L/h) e capacidade do tanque (L). **Elétrico:** tensão (110V, 220V Monofásico, 220V Trifásico, 380V, 440V), potência (CV, HP ou kW), corrente nominal (A), pressão de trabalho (PSI ou Bar) e vazão de água (L/min). **Extintor:** agente (Água, Pó PQS ABC, Pó PQS BC, CO2), capacidade (kg ou L), data da última recarga e vencimento do teste hidrostático, **estes quatro obrigatórios**. Nos demais, os técnicos são opcionais.
- Marca e setor são texto digitado por enquanto (a integração com listas de Cadastros > Gerais fica para depois). Clonar copia os dados e deixa o patrimônio e o número de série em branco. Excluir é só do Administrador (decisão 45).
- Só modo demonstração: nada no Supabase.

### Decisão 248: Parâmetros > Equipamentos > Parâmetros Específicos (subcategorias e tipos)

Pedido do responsável em 22/10: o cadastro dos parâmetros específicos de equipamentos segue o desenho **pai e filho**. O pai é a **subcategoria** e o filho é o **tipo**, que sempre fica debaixo de uma subcategoria.

- **Subcategorias de fábrica (as das Normas Regulamentadoras):** Movimentação e elevação de carga (NR-11); Maquinário industrial ferramental (NR-12 e NR-10); Sistemas pneumáticos e hidráulicos (NR-13); Equipamentos de emergência e combate a incêndio (NR-23).
- **Tipos de fábrica, cada um debaixo da sua norma:** NR-11: Empilhadeiras, Munck, Ponte rolante. NR-12 e NR-10: Serra de corte, Máquina de solda. NR-13: Compressor de ar (vaso de pressão), Jato de alta pressão (lavador). NR-23: Extintores de incêndio. (O responsável escreveu "muck"; entrou como "Munck", que é o nome do equipamento, e dá para editar.)
- A tela é uma só, em árvore: cada subcategoria é um bloco com seus tipos embaixo. Há Cadastrar subcategoria, Cadastrar tipo (já com o pai escolhido), Editar e Excluir (só do Administrador, decisão 45). O tipo pode mudar de subcategoria na edição.
- Regras: nomes em texto capitalizado e únicos sem diferenciar acento nem maiúscula (o nome do tipo é único no cadastro todo); **não se exclui uma subcategoria que ainda tem tipos**; erro não grava nada.
- **Ligado ao Cadastrar equipamento:** o equipamento passa a ter Subcategoria e Tipo no lugar das cinco categorias antigas. Cada tipo guarda os **grupos de campos técnicos** que aparecem no cadastro dos equipamentos dele (Máquinas e veículos; Equipamentos elétricos e motores; Extintor, que tem 4 campos obrigatórios). De fábrica: Empilhadeiras e Munck, motor; Ponte rolante, Serra de corte, Máquina de solda e Compressor, elétrico; Jato de alta pressão, motor e elétrico; Extintores, extintor. Tipo novo começa sem campos técnicos até o grupo ser marcado.
- Não se exclui um tipo que algum equipamento usa. Equipamento salvo antes dos tipos continua na lista com o tipo em branco e pede o tipo ao ser editado; os valores técnicos dele ficam.
- Só modo demonstração: nada no Supabase.

## 249. Parâmetros > Equipamentos > Check list (manutenção e vistoria)
- Duas opções independentes, escolhidas por `?aba=manutencao|vistoria` (itens "Check list de manutenção" e "Check list de vistoria" no menu e no cartão Equipamentos). Cada uma tem os seus grupos e as suas associações; o mesmo nome de grupo pode existir nas duas.
- A tela segue Parâmetros > Veículos > Check list: no alto os **Itens check list** (grupo com nome, itens um por linha e tipos de equipamento de Parâmetros Específicos, ou "Todos os tipos") e embaixo a **associação a um equipamento** (responsável ou "Não definido"; por grupo, Periódico com periodicidade Diária/Semanal/Quinzenal/Mensal, obrigatório, ou Avulso, não obrigatório). Cada periodicidade forma um check list chamado PATRIMÔNIO >> PERIODICIDADE >> RESPONSÁVEL.
- Regras: um equipamento tem uma associação por check list; só se associam grupos que valem para o tipo do equipamento; **não se exclui um grupo que algum equipamento usa**; nome único sem diferenciar acento/maiúscula; erro não grava nada; dado ilegível nunca é sobrescrito.
- Check list de **manutenção** tem o botão **Cadastrar padrão**: cria 16 grupos (um por rotina da lista da Gemape: extintores, compressor, jato, serra, máquina de solda, empilhadeiras, Munck e ponte rolante), cada um valendo só para o seu tipo; repetir não duplica nem desfaz edições. O de **vistoria** também tem **Cadastrar padrão**, com 16 grupos (vistoria visual e vistoria complexa de cada um dos mesmos tipos), no mesmo esquema. Só modo demonstração (`gemape-demo-equipamentos-checklist`); nada no Supabase.

## 250. Parâmetros > Equipamentos com a mesma lógica de Veículos
- **Escolha item a item no check list (veículos e equipamentos):** ao associar, marca-se o grupo e abrem-se os itens dele, cada um com a sua caixa; o grupo entra no check list com os itens marcados (`itensIds`). Grupo com todos os itens marcados vale inteiro (itens que entrarem nele depois também); lista vazia é recusada. Associação antiga, sem `itensIds`, continua valendo com todos os itens; o módulo de check list de veículos recebe o grupo só com os itens escolhidos.
- **Manutenção** (`/cadastros/equipamentos-manutencao`): ações de manutenção (grupo pai com subitens, sempre com Outros por último) e **plano de manutenção por equipamento**, com limite de **horas de uso** e de meses, o que vier primeiro (em Veículos é km). Uma só página: primeiro as ações, depois o plano. Ação usada em plano não se exclui.
- **Tipos de ocorrência** (`/cadastros/equipamentos-tipos-ocorrencia`): nome único e descrição.
- **Clonar** na associação do check list e no plano de manutenção, além de Editar e Excluir (Excluir só do Administrador), como em Veículos. Reaproveita a lista de Veículos (`ListaVeiculos` agora exportada, com o caminho no alto configurável).
- Dados em `gemape-demo-equipamentos-manutencao`: erro de validação não grava nada e dado ilegível nunca é sobrescrito. Só modo demonstração; nada no Supabase.

## 251. Novo check list: opções com o nome da associação
- Em Módulos > Veículos > Check list > Novo check list, as opções do campo Tipo de check list passam a ter o **mesmo nome da tabela de associação** (Parâmetros > Veículos > Check list): **Placa >> Periodicidade >> Responsável** (ex.: ABC-1599 >> Diária >> Maria da Silva). Isso revisa a ordem Placa >> Responsável >> Periodicidade da decisão 157.
- O Avulso é **Placa >> Não definida >> Responsável**; leva o responsável da associação quando ela tem grupos avulsos e, sem eles, "Não definido".

## 252. EPIs: controle de estoque e sugestão de compras, como na planilha de controle
- Base: `docs/ANALISE_PLANILHA_EPI.md` (análise da planilha CONTROLE DE UNIFORMES E EPIs; as macros VBA não vieram no arquivo, então as regras abaixo foram deduzidas dos valores gravados).
- **Aba Estoque dos EPIs > Controle de estoque e consumo:** estoque crítico e atual, penúltima e última entrada e saída, médias de consumo (mensal = saídas de 30 dias; trimestral = 90 dias ÷ 3; semestral = 180 dias ÷ 6; anual = 365 dias ÷ 12) e cobertura em dias = estoque atual ÷ (média anual ÷ 30); sem consumo no ano aparece "Sem consumo".
- **Aba Compras dos EPIs > Sugestão de compras:** entra o EPI abaixo do estoque crítico ou com cobertura abaixo da meta. Quantidade = arredonda para cima de (maior entre média anual × meta em meses e o estoque crítico, menos o estoque atual), no mínimo 1. Observação: "Abaixo do estoque crítico.", "Cobertura abaixo da meta (N%).", "Sem consumo no último ano.".
- **Meta de cobertura:** 30, 60, 90, 120 ou 180 dias, escolhida na própria aba (padrão 120), guardada no navegador.
- **Prioridade:** "1-URGENTE" (abaixo do crítico ou menos de 25% da meta), "2-ALTA" (menos de 50%), "3-MÉDIA" (menos de 75%), "4-BAIXA" (de 75% até a meta). Na planilha só se viram 1-URGENTE e 4-BAIXA: **os cortes de 25% e 50% são inferidos e precisam ser confirmados**.
- **Fora desta decisão:** giro de estoque (a fórmula não pôde ser deduzida) e bloqueio de saída sem estoque (a planilha permite saldo negativo).
- Só modo demonstração; nada no Supabase.

## 253. Uniformes com a mesma lógica e os mesmos submenus do módulo de EPIs
- **Submenus dos Uniformes** passam a seguir os do EPI: Dashboard, Estoque, Movimentações (continua), Compras, Histórico do empregado, Baixar Definitivas, **Entrega Uniforme** (nova), Termo de Entrega, Termo de Baixa e Ocorrências. Os nomes "Histórico do empregado" e "Baixar Definitivas" são os mesmos do EPI. A Ficha de EPI Avulsa não tem equivalente em Uniformes.
- **Entrega Uniforme:** a mesma tela de Entrega EPI (entrega e devolução por empregado, códigos ENT e DEV, devolução só do Administrador, histórico filtrável, alerta de estoque mínimo e termo de entrega), agora usada pelos dois módulos. A entrega aceita o módulo (`epi` ou `uniforme`), que define a tabela dos itens, o módulo gravado na movimentação e as palavras das mensagens.
- **Estoque e Compras dos Uniformes:** ganham o Controle de estoque e consumo e a Sugestão de compras da decisão 252 (mesmos cálculos e a mesma meta de cobertura, que vale para os dois módulos).
- Só modo demonstração; nada no Supabase.

## 254. Ajustes de revisão: grupo personalizado, controle de estoque e editor de itens
- **Grupo personalizado** ("Personalizado · PLACA" ou "· PATRIMÔNIO"): fica fora da lista de grupos de outros veículos e equipamentos; ao reabrir a associação, os itens salvos voltam no bloco "Personalizar itens" e salvar atualiza o mesmo grupo (não cria "(2)", "(3)"); grupos antigos do mesmo veículo ou equipamento que ficaram sem uso são removidos.
- **Controle de estoque e sugestão de compras:** item inativo fica de fora; a devolução sai do consumo da mesma janela (consumo = saídas − devoluções, nunca negativo); com "Todas as empresas" há coluna Empresa (e no CSV), porque cada empresa tem o seu registro do mesmo produto.
- **Editor de itens do grupo:** apagar o único item mantém a linha para reescrever; item com até 200 caracteres e grupo com até 5000 (o limite do campo de texto de antes).

## 255. Dados de teste gravados no modo demonstração
- **O que são:** cinco registros em cada cadastro (cinco empregados por empresa) (as três empresas são as do grupo, com nome e CNPJ da planilha de controle; endereços, pessoas, documentos, e-mails e telefones são inventados, e nenhum dado de empregado real é copiado) (empresas, empregados, fornecedores, clientes, EPIs, uniformes, ferramentas, caixas de ferramentas, veículos, equipamentos, viagens e, em Gerais, marcas, tipos de ocorrência, ações de manutenção e códigos de fábrica), com todos os campos preenchidos e vínculos reais: empregado numa empresa, EPI, uniforme e ferramenta com fornecedor (código de fábrica), equipamento e veículo numa empresa, viagem com abastecimento de um veículo e técnico existentes, entregas a empregados da mesma empresa. Documentos, e-mails e telefones têm formato válido (dígito verificador conferido) e números inventados. O registro que o sistema já trazia (GEMAPE, Maria da Silva, GEM-2026...) fica.
- **Onde ficam:** no armazenamento local do navegador, nas mesmas chaves que as telas já leem; o controle `gemape-demo-dados-teste` guarda a versão aplicada. Sobrevivem a recarregar, fechar o navegador e reiniciar o servidor.
- **Quando se aplicam:** ao abrir o sistema, na primeira vez e a cada versão nova do conjunto (`VERSAO_DADOS_TESTE`); a troca mexe só nos registros de teste (ids com prefixo `teste-` e as listas de Gerais anotadas no controle). Na mesma versão não faz nada, e o que foi alterado nos dados de teste permanece.
- **Menu "Dados de teste" (topo):** Restaurar repõe o conjunto original; Limpar tira os dados de teste e eles não voltam sozinhos até restaurar. O que o usuário criou à mão fica.
- **Estoque:** saldo e mínimo por empresa e por tamanho (EPIs e uniformes com tamanhos variados), mínimos variados e alguns itens abaixo do mínimo para testar o alerta; o saldo é a soma das movimentações. Os cadastros guardam só parametrização.
- **Só no demo:** o carregamento e o menu saem do pacote de produção (conferido no build com `VITE_DEMO_MODE=false`: nenhum dado de teste, nome ou menu no código gerado). Nada vai ao Supabase.
- **Formulários já preenchidos (2.8):** no demo, o cadastro novo de empresa, empregado, fornecedor, cliente, EPI, uniforme, ferramenta, veículo, equipamento, caixa de ferramentas e viagem abre com um quarto registro fictício (`src/lib/dados-teste/exemplos.ts`), com código, placa, CPF, CNPJ, matrícula e patrimônio que ainda não existem. Não é gravado: só vai ao armazenamento se a pessoa salvar. Cada ponto de uso confere `import.meta.env.VITE_DEMO_MODE !== "false"`, então em produção o formulário abre em branco e os dados do exemplo saem do pacote.
- **Título do topo:** só "GESTÃO DE PATRIMÔNIO", em caixa alta e letras espaçadas, com entrada animada (parada para quem reduz movimento).

## 256. Configurações: acessos por usuário (só teste, modo demonstração)
- **O que é:** botão "Configurações" no topo (só para o Administrador) com uma matriz de caixas de marcar por tela (Dashboard, EPIs, Uniformes, Ferramentas e caixas, Veículos, Viagens, Equipamentos, Empresas, Empregados, Fornecedores, Clientes) e ação (ver, criar, editar, excluir). O seletor "Entrar como" troca o usuário de teste.
- **Perfil e exceções:** Administrador, RH e Padrão dão o ponto de partida; cada usuário pode ter exceções, e só a diferença para o perfil é guardada (marcada com * na matriz). Marcar criar, editar ou excluir marca também "ver"; desmarcar "ver" desmarca as outras. O Administrador sempre tem tudo; Gerais e Configurações são só dele.
- **Usuários de teste:** Administrador Demo, Helena Rocha (RH), Paulo Mendes (Padrão) e Marina Souza (Padrão restrito a EPIs e Uniformes).
- **Como bloqueia:** cartões de telas sem "ver" somem do início e do menu da área; a tela aberta pelo endereço mostra "Sem acesso"; botões de criar/editar/excluir somem sem a ação; e o cliente de demonstração recusa a gravação (insert, update, delete e movimentações) das tabelas de EPIs, Uniformes, Ferramentas e caixas, Veículos, Empresas e Empregados. Fornecedores, Clientes, Equipamentos e Viagens têm só o bloqueio de tela e de botões, porque gravam por bibliotecas próprias.
- **Onde ficam:** `gemape-demo-permissoes` e `gemape-demo-usuario-ativo` no armazenamento do navegador (sobrevivem a recarregar e a reiniciar o servidor). "Restaurar permissões originais" (na janela) e "Restaurar dados de teste" repõem o conjunto original e o Administrador como usuário.
- **Só no demo:** tudo atrás de `import.meta.env.VITE_DEMO_MODE !== "false"`; o build de produção não traz usuários, chaves nem textos. Nada vai ao Supabase (sem tabela, migration, RLS ou mudança de auth). Os papéis reais (admin, gestor, operador) e as permissões por tela de verdade ficam para a Fase 2.

## 257. Módulo Equipamentos: controles na mesma lógica de Veículos (só demonstração)
- **Abas:** Inventário dos Equipamentos, Abastecimento, Manutenção, Ocorrências, Check list de Manutenção e Check list de vistoria, como submenus do menu e dos cartões da tela inicial (`?aba=`). O cadastro e os parâmetros continuam em Parâmetros > Equipamentos.
- **Inventário:** lista os equipamentos cadastrados com status, horímetro, última manutenção, ocorrências abertas e último check list, e abre o extrato completo por equipamento. Só leitura.
- **Abastecimento:** só para equipamento com motor a combustão (tipo com o grupo Máquinas e veículos e propulsão a diesel, gasolina ou gás). Usa horímetro no lugar do km, que nunca pode ser menor que o do registro anterior, e mostra horas trabalhadas, R$/L e L/h.
- **Manutenção:** preventiva ou corretiva, com as ações e subitens de Parâmetros > Equipamentos > Manutenção, local (empresa ou terceiro) e custos de peças e mão de obra.
- **Ocorrências:** tipos de Parâmetros > Equipamentos > Tipos de ocorrência; abertas até alguém informar a solução.
- **Check lists:** usam os check lists associados ao equipamento em Parâmetros (grupos, itens, periodicidade e responsável); cada item é conforme, não conforme (exige a descrição) ou não se aplica.
- **Indicadores (cinco KPIs):** disponibilidade (horas programadas, dias úteis × 8 h, menos as horas de parada informadas na manutenção), custo de manutenção por hora (custo do período ÷ horas de horímetro rodadas), razão preventiva/corretiva (meta ≥ 70% preventiva), aderência ao plano de manutenção (item vence por horas OU por meses desde a última execução; meta ≥ 90%) e conformidade legal (vistoria periódica em dia para todos; extintor: teste hidrostático e recarga; vaso de pressão: inspeção anual; empilhadeiras e máquinas: sem ocorrência de segurança aberta; meta 100%). Cada um aparece para a frota, com semáforo, e por equipamento, com os motivos. O período é escolhido (30, 90, 180 dias ou 12 meses). A manutenção ganhou o campo "tempo parado (horas)".
- **Onde ficam:** `gemape-demo-eq-abastecimentos`, `-manutencoes`, `-ocorrencias` e `-checklists` no armazenamento do navegador; nada vai ao Supabase. Os dados de teste trazem cinco registros de cada controle (versão 7).

## 258. Check list de equipamentos como o de veículos; empilhadeira só em Equipamentos
- **Associar itens de check list a um equipamento** (manutenção e vistoria) segue a janela de Veículos: equipamento, responsável (empregado ativo da empresa do equipamento) e uma periodicidade só (Diária, Semanal, Quinzenal, Mensal ou Avulso) para todos os itens marcados; grupos do tipo do equipamento com caixas por grupo e por item, Marcar todos e Desmarcar todos, e o bloco Personalizar itens (grupo "Personalizado · patrimônio", ou "Avulso · Personalizado · patrimônio"). Atalhos para cadastrar equipamento, empregado e itens. O equipamento só aparece na lista enquanto não tem associação; clonar exige outro equipamento.
- Os grupos padrão de manutenção e de vistoria entram sozinhos na primeira vez, como os de Veículos (o que for excluído depois não volta).
- **Empilhadeira saiu de Veículos:** não existe mais como tipo de veículo, nem os grupos de check list "Empilhadeiras ·" em Veículos, e todo veículo tem placa (a decisão 66 e a 69 ficam substituídas). Quem já tinha a subcategoria e os grupos em Gerais os perde uma vez só. Veículos já cadastrados com esse tipo continuam nos dados, mas devem ser cadastrados de novo em Equipamentos.

## 259. Check list de equipamentos (módulo) com a lógica do de Veículos
- **Por finalidade:** Check list de Manutenção e Check list de vistoria têm, cada um, os seus itens e associações (Parâmetros), painel do mês, situação por equipamento, lista e histórico.
- **Painel do mês:** previsões por periodicidade (diária, semanal, quinzenal ou mensal) desde o dia da associação; realizado no prazo, não realizado no prazo e a vencer (só os obrigatórios entram nos percentuais). É o mesmo painel de Veículos, com chave de armazenamento própria por finalidade.
- **Novo check list:** escolhe o equipamento ativo e o tipo de check list (as opções da associação: "Patrimônio >> Periodicidade >> Responsável", ou Avulso); o responsável vem da associação. Os itens são os grupos da periodicidade escolhida, com os itens marcados um a um.
- **Execução:** cada item é OK, NOK ou N.A., com observação e até 3 fotos; concluir exige tudo avaliado e o problema de cada NOK. Cada NOK gera uma ocorrência aberta do equipamento e uma pendência no check list, resolvida depois com a descrição do que foi feito. Check list em andamento pode ser descartado; o concluído gera PDF. Código CHE-0001.
- Sem periodicidade e sem responsável, o check list é avulso: fica fora do painel e da situação por equipamento.
- Os indicadores usam a última vistoria concluída e as pendências NOK abertas.

## 260. Indicadores de Equipamentos parametrizáveis
- Em **Parâmetros > Equipamentos > Parâmetros Específicos > Indicadores** (como os Indicadores de Viagens em Veículos) ficam os valores que eram fixos no cálculo: período padrão, jornada (horas por dia útil), metas verde e amarelo de disponibilidade, razão preventiva, aderência ao plano e conformidade legal, fator do amarelo do custo por hora (vezes a média da frota), validade da recarga do extintor e da inspeção do vaso de pressão (meses), validade da vistoria por periodicidade (dias), a exigência de nenhuma ocorrência de segurança aberta (NR-11 e NR-12) e o que tira o equipamento de "pronto agora" (ocorrência aberta, vistoria com NOK pendente).
- O painel de Indicadores do módulo lê estes valores (cards, semáforos e textos de "Como é calculado"). Os dados que alimentam o cálculo vêm dos registros do módulo (horímetro de abastecimentos e manutenções, tempo parado, custos, ocorrências, check lists) e dos planos de manutenção e check lists associados de Parâmetros.
- Valor inválido ou ausente volta ao padrão; "Restaurar padrão" repõe tudo. Só no navegador, em modo demonstração (`gemape-demo-kpis-equipamento`); nada vai ao Supabase.

## 261. Ações de manutenção de equipamentos: padrão inicial e Restaurar configurações iniciais
- Em **Parâmetros > Equipamentos > Manutenção > Ações de manutenção** já vêm cadastradas 36 ações, da lista fornecida pela Gemape, para 12 famílias de equipamento (geradores, empilhadeiras, compressores diesel, torres de iluminação, compactadores, martelos e perfuradores, betoneiras, motobombas, cortadoras de piso, motores estacionários, equipamentos de apoio e elétricos e extintores de incêndio). Ação nova no fim do padrão entra uma vez em quem já tinha as anteriores, sem trazer de volta o que foi excluído. O nome do pai leva a família ("Geradores (todas as potências) · Revisão do sistema de lubrificação e filtros") e os filhos são os subitens da lista. Entram sozinhas uma vez só, como as de Veículos.
- **Todo pai tem o subitem Outros**, de descrição aberta, sempre por último; ele é acrescentado ao gravar qualquer ação, do padrão ou criada por você.
- **Restaurar configurações iniciais** funciona como em Veículos: lista os pais e os filhos do padrão com a situação de cada pai (igual ao padrão, alterado ou não cadastrado), marcação de pais e filhos, Marcar todos e Desmarcar todos, busca, e restaura só o marcado (o excluído é cadastrado de novo; os não marcados e o que você criou ficam). Embaixo, "Criados por você": quem pode excluir marca e exclui junto. Salvar pede a confirmação Sim ou Não, porque muda os planos e os indicadores de manutenção.
- Siglas e medidas do padrão (QTA, QTM, 7", 2,5 ton) entram como foram escritas, sem a capitalização automática.
- Correções do code review desta etapa: horímetro decimal lido certo (vírgula decimal, ponto de milhar só em grupos de três), manutenção e abastecimento do mesmo dia não se bloqueiam, data e hora de Brasília nos formulários, formulários limpos ao cancelar, limpeza única da Empilhadeira de Veículos com marcador novo, leitura das permissões sem gravar durante a renderização e check list de equipamentos com o equipamento travado na edição.

## 262. Endereçamento de estoque dos equipamentos e ordem do menu
- Em **Parâmetros > Equipamentos > Parâmetros Específicos** há o campo **Endereçamento de estoque** (Não usa, Opcional ou Obrigatório), igual ao de Veículos em Gerais > Categorias. Equipamento não é categoria de Gerais, então a escolha fica na chave própria `cat-equipamentos` do mesmo armazenamento. Começa em Não usa.
- Com Opcional ou Obrigatório, os equipamentos aparecem em **Endereçamento** (o código que se endereça é o patrimônio; os campos são Rua, Número e Apartamento) e podem ser clonados como os outros itens. Obrigatório avisa ao salvar um equipamento sem endereço, sem impedir o salvamento.
- A ordem dos submenus de Parâmetros > Equipamentos (menu, barra lateral e cartão da tela inicial) é: Cadastrar equipamento, Manutenção, Tipos de ocorrência, Check list de manutenção, Check list de vistoria e Parâmetros Específicos.

## 263. Restaurar configurações iniciais nos check lists de equipamentos
- Em **Parâmetros > Equipamentos > Check list de manutenção** e **Check list de vistoria**, o botão **Restaurar configurações iniciais** (a mesma janela de Veículos) substitui o antigo "Cadastrar padrão": lista os 16 grupos do padrão inicial de cada check list com a situação de cada um (igual ao padrão, alterado ou não cadastrado) e os itens, permite marcar um a um, Marcar todos e Desmarcar todos, e restaura só o marcado, depois de confirmar.
- Grupo que existe volta ao nome, aos itens e ao tipo de equipamento iniciais (o id e os itens que já existiam ficam); grupo excluído é cadastrado de novo; os grupos que você criou e as associações dos equipamentos não mudam. Se o tipo de equipamento do padrão não existe mais em Parâmetros Específicos, os tipos atuais ficam como estão e o aviso conta.
- O padrão continua entrando sozinho na primeira abertura (uma vez só).
- **Novo check list de equipamento (módulo) como o de Veículos:** os atalhos do diálogo abrem janelas ao lado dele, sem perder o que já foi escolhido: "Associar itens de check list a um equipamento" (a tela de Associar de Parâmetros), "Cadastrar itens de check list" (a lista de grupos, no avulso sem associação) e "Cadastrar equipamento". Ao salvar nelas, o painel, a situação por equipamento e as opções do tipo de check list se atualizam; equipamento escolhido que deixa de estar disponível é limpo, com aviso. A janela de Associar itens já abre com o formulário (equipamento, responsável, periodicidade, grupos e itens, Personalizar itens), com o equipamento escolhido no Novo check list; se ele já tem associação, abre a edição dela.

## 264. Itens avulsos nos check lists de equipamentos
- Em **Parâmetros > Equipamentos > Check list de manutenção** e **de vistoria**, o padrão inicial ganhou os itens do check list avulso, como em Veículos: um grupo **"Avulso · tipo"** para cada um dos 8 tipos de equipamento (empilhadeiras, munck, ponte rolante, serra de corte, máquina de solda, compressor de ar, jato de alta pressão e extintores), com 4 ou 5 itens simples cada, nos dois check lists (manutenção: tarefas rápidas; vistoria: conferências rápidas). São 24 grupos em cada padrão (16 do periódico e 8 avulsos), e o Restaurar configurações iniciais os inclui.
- É o nome que define o grupo: os que começam com "Avulso ·" são do avulso; os demais, do periódico. Na janela de associação, **Periodicidade Avulso traz só os grupos avulsos** do tipo do equipamento (e os de todos os tipos), e as periodicidades Diária, Semanal, Quinzenal e Mensal trazem só os do periódico. No módulo, o Novo check list avulso de um equipamento sem associação usa os avulsos do tipo dele.
- Quem já tinha os 16 grupos de cada padrão recebe os avulsos uma vez só, na próxima abertura, sem trazer de volta o que excluiu.

## 265. Associação de check list de equipamento: equipamento editável e fotos nas ocorrências

- Na janela de associação (Parâmetros > Equipamentos > Check list de manutenção e de vistoria), o campo Equipamento fica habilitado também ao editar e lista todos os equipamentos cadastrados; os que já têm itens associados aparecem desabilitados ("· já tem itens associados"). Trocar o equipamento ao editar move a associação: a do equipamento antigo sai, com o grupo personalizado dele.
- Ocorrências de equipamento aceitam fotos como as de veículo: até 6 por ocorrência, só imagens, anexadas ao registrar ou depois, enquanto a ocorrência está aberta. As fotos dos itens do check list (até 3 por item) já existiam na execução.
- Tudo em modo demonstração (localStorage), sem Supabase.

## 266. Padrão único de relatório impresso

- Todo relatório, check list, termo e ficha gerado pelo sistema segue o layout do Relatório de Viagens: folha A4, cabeçalho com logomarca, título, subtítulos e empresa, linha azul (#0A007C), tabelas de cabeçalho azul, quadros de resumo cinza e rodapé "Emitido em" (com a numeração das páginas na impressão).
- O padrão fica em `src/lib/relatorio-padrao.ts` (`paginaRelatorio`, `cabecalhoRelatorio`, `montarRelatorioTabelaHtml`, `CSS_TERMO`). Check lists de veículo e de equipamento, Frota, Manutenção, os cinco termos, a Ficha de EPI e o Termo de Encerramento passaram a usá-lo; o Relatório de Viagens, que tem paginação própria, é a referência visual.
- O botão Imprimir dos relatórios de EPI e Uniformes (por empregado e de baixas) abre o relatório no padrão, em vez de imprimir a tela. Relatório novo deve usar o mesmo módulo.
- Só texto e estilo gerados no navegador, em modo demonstração, sem Supabase.

## 267. Número de caixa único entre as empresas

- Duas caixas de ferramentas não podem ter o mesmo número, mesmo em empresas diferentes. As telas já conferiam; agora a base de demonstração também recusa o cadastro repetido ("Já existe a caixa CX-0003").
- Os dados de teste pegam os primeiros números que as caixas cadastradas pela pessoa não usam, em vez de repetir o CX-0003 dela (versão 12 dos dados de teste). No banco real, o mesmo vale como restrição de unicidade do número (Fase 2).

## 268. Configurações como cartão e acessos por menu

- O botão Configurações saiu do cabeçalho e virou um cartão ao lado do Dashboard, na tela inicial (só o Administrador, só no modo demonstração). O cabeçalho mantém "Entrar como".
- A matriz de acessos passou a ter uma linha para cada módulo e para cada menu do sistema (abas dos módulos e itens de Parâmetros), cada uma com Ver, Criar, Editar e Excluir. As linhas dos menus saem dos mesmos dados da tela inicial (`SUBTELAS`).
- O menu herda o que o módulo tem; marcar ou desmarcar dá uma exceção só daquele menu (marcada com *), e só a exceção é guardada. Sem "Ver" no módulo, nenhum menu dele aparece. A rota vale pelo menu: `?aba=` ou `?de=` escolhe o menu e, sem eles, vale a primeira aba do módulo.
- Menus e cartões sem acesso somem da tela inicial e do menu do topo; entrar pelo endereço mostra "Sem acesso a esta tela". A recusa de gravação continua por módulo (tabela), não por menu.
- Só no navegador, em modo demonstração, sem Supabase; o código fica fora da produção.

## 269. Sem a empresa GEMAPE de demonstração

- O sistema de demonstração não traz mais a empresa "GEMAPE" (id `empresa-demo`) nem os cadastros dela (empregada, EPI, uniforme, ferramenta FER-0001 e veículo GEM-2026). As três empresas do grupo vêm dos dados de teste.
- Quem já tinha a empresa antiga no navegador a perde ao aplicar os dados de teste (versão 13): saem a empresa, o que tinha o id dela, as movimentações, caixas e compras ligadas a esses itens, os portadores de caixa e os abastecimentos do veículo antigo.

## 270. Relatório do extrato do veículo

- O extrato do veículo passou a ser um relatório no padrão dos demais (decisão 266), aberto no visualizador do sistema, onde se imprime ou se baixa o arquivo (ver decisões 271 e 272 para o botão e a abertura direta em tela cheia). Seções: preventivas sugeridas, manutenções realizadas, itens não realizados em atenção, histórico de abastecimentos e ocorrências.
- O HTML vem de `src/lib/extrato-html.ts`; as contas (km atual, média, sugestões) continuam na tela. Só no navegador, sem Supabase.

## 271. Gerar PDF nos extratos e dados de teste completos para os relatórios

- O botão dos extratos de veículo e de equipamento passou a se chamar só "Gerar PDF". O do equipamento (Inventário > Extrato) abre o extrato no padrão dos relatórios, com abastecimentos, manutenções, ocorrências e check lists; os dois usam `src/lib/extrato-html.ts`.
- Os cinco veículos de teste vêm com abastecimentos (4 cada), uma manutenção preventiva e uma corretiva, plano de manutenção (o do primeiro e o do quarto já com preventiva vencida), uma ocorrência (aberta, em tratativa e encerrada) e um check list semanal concluído, com itens NOK em dois deles (`veiculos-modulo.ts`). Os cinco equipamentos agora têm manutenção, ocorrência e check list, e o compressor tem abastecimentos. Tudo gravado pelas mesmas funções das telas, com datas no passado e km/horímetro crescendo.
- Versão 14 dos dados de teste; Limpar leva os registros dos veículos de teste junto. Só no navegador, em modo demonstração.

## 272. Extrato abre direto em tela cheia, com a situação colorida

- Ver extrato (veículos) e Extrato (inventário de equipamentos) deixaram de abrir a janela com listas: o relatório abre direto no visualizador, ocupando a tela toda (`telaCheia`), com a folha na largura da tela para consultar com folga; ao imprimir segue A4. No visualizador em tela cheia o botão de imprimir se chama "Gerar PDF" (e há "Baixar").
- A situação sai com o ponto colorido dos indicadores da tela: vermelho (Vencida, Aberta, NOK), amarelo (Atenção, Em tratativa), verde (Em dia, Encerrada, Resolvida, Tudo OK) e cinza (Sem registro). Os quadros do topo ficam em vermelho quando há preventiva vencida ou ocorrência aberta.

## 273. Relatório de abastecimento por veículo

- Em Módulos > Veículos > Abastecimento, o botão "Gerar PDF" abre, em tela cheia no visualizador, o relatório de abastecimento no padrão dos demais (decisão 266): resumo no topo (veículos, abastecimentos, litros, total gasto e, com um veículo só, a média de consumo) e um quadro por veículo, com data e hora, km, km rodados, litros, valor, R$/L e km/L, e o total e a média de cada um. O relatório segue os filtros da tela (empresa do cabeçalho, veículo escolhido e busca).
- Só no navegador, em modo demonstração, sem Supabase.

## 274. Relatório de abastecimento por equipamento

- Em Módulos > Equipamentos > Abastecimento, o botão "Gerar PDF" abre, em tela cheia no visualizador, o relatório de abastecimento no mesmo formato do de Veículos (decisão 273): resumo no topo (equipamentos, abastecimentos, litros, total gasto e, com um equipamento só, o consumo médio em L/h) e um quadro por equipamento a combustão, com data e hora, horímetro, horas trabalhadas, litros, valor, R$/L e L/h, mais o total e o consumo médio de cada um. Segue os filtros da tela (empresa do cabeçalho, equipamento escolhido e busca).
- Só no navegador, em modo demonstração, sem Supabase.

## 275. Cinco check lists preenchidos de cada tipo nos dados de teste

- Veículos: cinco check lists periódicos (um por veículo) e cinco avulsos (grupos "Avulso ·" do tipo do veículo), todos concluídos, com itens NOK em alguns para testar pendências e ocorrências.
- Equipamentos: cinco periódicos de manutenção, cinco periódicos de vistoria e cinco avulsos (três de manutenção e dois de vistoria), todos concluídos, com NOK em seis deles.
- Versão 15 dos dados de teste; a numeração dos check lists (CHK e CHE) recomeça quando os de teste são removidos. Só no navegador, em modo demonstração, sem Supabase.

## 276. Só grupos de check list com uso nos dados de teste

- Ao gerar os dados de teste (versão 18), em Parâmetros > Check list ficam só os grupos de itens que têm uso: ligados a uma associação (veículo ou equipamento) ou presentes em algum check list preenchido. Os grupos do padrão que ninguém usa saem (`enxugar-checklists.ts`); o Restaurar configurações iniciais traz de volta o padrão quando precisar, e o gerador refaz o padrão antes de semear, para sempre ter de onde escolher.
- Associações e check lists de veículo ou equipamento que não existe mais (cadastro apagado) saem junto, e os check lists de teste dos veículos usam só grupos do padrão (não os criados pela pessoa nem os personalizados de outro veículo). Hoje: veículos com 6 grupos, equipamentos com 9 (manutenção) e 8 (vistoria). Só no navegador, em modo demonstração, sem Supabase.

## 277. Cinco check lists periódicos e cinco avulsos em cada veículo e equipamento

- Os dados de teste (versão 19) deixam gravados, em cada um dos cinco veículos, cinco check lists periódicos (semanais, um por semana) e cinco avulsos; e, em cada um dos cinco equipamentos, cinco periódicos de manutenção, cinco periódicos de vistoria e cinco avulsos (três de manutenção e dois de vistoria). São 50 em veículos e 75 em equipamentos, todos concluídos e preenchidos, com parte deles com item NOK (que gera ocorrência e pendência aberta) e parte só com OK.
- Ocupa cerca de 600 KB do armazenamento do navegador. Substitui as contagens da decisão 275 (cinco de cada tipo no total). Só no navegador, em modo demonstração, sem Supabase.

## 278. Check lists de teste nos indicadores do painel do mês e sem equipamento sem associação

- O painel do mês só conta previsões desde o dia em que a associação passou a valer, e as de teste nasciam no dia de hoje: Previstos, Realizados, Não realizados e A vencer ficavam zerados. Agora a associação de cada veículo e de cada equipamento vale desde 56 a 175 dias atrás (`PLANOS_CHECKLIST_TESTE`), e os cinco check lists periódicos cobrem semanas, quinzenas ou meses de acordo com a periodicidade: uns feitos no prazo, outros sem check list (não realizados) e o mês em aberto (a vencer). Versão 21 dos dados de teste.
- Equipamento que não tem itens de check list associados, em manutenção ou em vistoria (como o PAT-9001 Hidrante), sai do cadastro ao gerar os dados de teste, com os abastecimentos, manutenções, ocorrências, check lists e plano dele. Só no navegador, em modo demonstração, sem Supabase.

## 279. Painel de check lists com todos os períodos

- O painel de indicadores do Check list (Veículos e Equipamentos) só contava os check lists previstos para um mês, então os 25 periódicos concluídos em meses diferentes apareciam como 14 (ou menos). O seletor ganhou a opção "Todos os períodos", que agora é a escolha inicial: Realizados no prazo, Não realizados, Previstos e A vencer somam todas as previsões obrigatórias de todos os meses, e cada check list periódico concluído entra como realizado. Escolher um mês continua mostrando o resultado só daquele mês (o mês atual aberto, os anteriores fechados). Só no navegador, em modo demonstração, sem Supabase.

## 280. Lista de check lists por mês

- A lista de Check lists (Veículos e Equipamentos) mostra um mês de cada vez, para não poluir a tela: começa no mês de hoje e tem o seletor Mês, com os últimos 12 meses e "Todos os meses". Periódicos, Avulsos e "Com pendências abertas" contam só o mês escolhido (vale a data do check list); o que ainda está em andamento aparece sempre, em qualquer mês. O painel de indicadores continua com o seu próprio período (decisão 279) e a situação por veículo e por equipamento não muda. Só no navegador, em modo demonstração, sem Supabase.

## 281. Painéis de check list de equipamentos iguais aos de veículos

- Os indicadores do Check list de equipamentos, em manutenção e em vistoria, são o mesmo painel de Veículos (`ChecklistPainelMensal`): período "Todos os períodos" por padrão ou um mês, com previstos, realizados no prazo, não realizados e a vencer; os 25 check lists periódicos de teste de cada finalidade contam como realizados. Ajustes da revisão: a lista mensal acompanha o mês de hoje também na virada do mês e usa a data de conclusão do check list, como o painel; a limpeza dos dados de teste só apaga grupos de check list de veículo que são do padrão e não para numa falha.

## 282. Ferramenta única em uma caixa só e 20 ferramentas de teste

- Cada ferramenta é única e fica em uma caixa só. A base de demonstração recusa gravar uma caixa com ferramenta que já está em outra ("Esta ferramenta já está na caixa CX-0001..."), como já fazia a tela de Vincular ferramentas. A transferência agora tira a ferramenta da origem e depois a coloca no destino (se a entrada falhar, ela volta para a origem), em vez de ficar nas duas caixas no meio do caminho.
- A repetição que aparecia (FER-0002 e FER-0003 nas caixas CX-0001 e CX-0002) vinha de linhas de transferências antigas que ficavam presas aos ids das caixas de teste ao reaplicar os dados: ao limpar, o que está ligado a caixa ou ferramenta de teste sai junto, e quem ainda tem ferramenta em duas caixas fica com a primeira.
- Dados de teste (versão 23): 20 ferramentas (entradas de estoque, código de fábrica e fornecedor) distribuídas nas 5 caixas, quatro em cada, cada ferramenta na caixa da sua empresa. Só no navegador, em modo demonstração, sem Supabase.

## 283. Histórico de movimentações de EPI e de uniforme para os 15 empregados de teste

- Os dados de teste (versão 25) dão histórico de movimentações aos 15 empregados das três empresas, tanto em EPIs como em Uniformes: os quatro empregados que só tinham o primeiro de cada empresa ganham entregas (botina, luvas e capacete; camisa, calça e jaqueta) em dias diferentes, e parte deles uma devolução ou uma baixa (desgaste, perda ou quebra). Cada empregado fica com 4 movimentações de EPI e 4 de uniforme (o primeiro de cada empresa mantém as dele), todas com código ENT ou DEV quando é o caso, da própria empresa e sem estoque negativo (as compras de capacete das empresas 2 e 3 subiram). Só no navegador, em modo demonstração, sem Supabase.

## 284. Tirar foto no anexo de fotos das ocorrências e dos check lists

- O anexo de fotos compartilhado (`BotaoAnexarFotos`: nova ocorrência e ocorrências abertas de veículo e de equipamento, e itens dos check lists) ganhou o botão "Tirar foto", ao lado de "Anexar fotos": no celular abre direto a câmera de trás (`capture="environment"`), no computador vira a escolha de um arquivo. As duas entradas passam pela mesma redução da imagem e pelo mesmo limite de fotos (6 por ocorrência, 3 por item de check list). Segue o comprovante da despesa, que já tinha a câmera. Só no navegador, sem Supabase.

## 285. Celular

- O cabeçalho (logo, menu da área, título, usuário, testes e empresa) empilha em uma coluna no celular, com os controles em duas colunas, e só fica fixo no topo a partir de md; antes a tela ficava com até três vezes a largura do celular. Toda janela (`DialogContent`) rola na tela pequena (máximo de 100dvh), com o rodapé de botões fixo embaixo. O visualizador de documentos e os relatórios impressos (`relatorio-padrao.ts`) empilham o cabeçalho e rolam as tabelas de lado em telas até 640 px; a impressão continua A4. Conferido em 390 px de largura nas telas inicial, Veículos, Equipamentos, Ferramentas e EPIs.

## 286. Celular: indicadores compactos e botões lado a lado

- Os quadros de indicadores (painel de check lists, dashboard, abastecimento, inventário de equipamentos, frota, relatórios de EPI e de uniformes) ficam em duas colunas no celular, com o cartão (`StatCard`) mais compacto (menos espaço interno, número menor e sem o ícone), em vez de uma coluna de cartões altos. O rodapé das janelas põe os botões lado a lado (Salvar e Cancelar) e ocupa metade da altura. Conferido em 360 px, sem rolagem lateral em 29 telas.

## 287. Equipamentos de teste: 40 cadastrados e só 10 com dados; códigos EQP e CHK; aplicação dos dados à prova de interrupção

- Os dados de teste (versão 27) cadastram 40 equipamentos, cinco de cada um dos oito tipos (PAT-0001 a PAT-0040, empresa girando entre as três), e só dez levam registros: PAT-0006, 0007, 0009, 0014, 0019, 0024, 0029, 0033, 0038 e 0039 (ao menos um de cada tipo), cada um com associação de check list (manutenção e vistoria, periodicidade semanal, quinzenal ou mensal), plano de manutenção, manutenção preventiva e corretiva, ocorrência e 15 check lists preenchidos (5 periódicos de manutenção, 5 de vistoria e 5 avulsos), mais três abastecimentos nos de motor a combustão. PAT-0001 a PAT-0005 ficam só cadastrados, limpos. Os trinta sem associação aparecem na janela de Associar itens de check list a um equipamento (a lista traz todos os cadastrados, com "já tem itens associados" nos outros) e a limpeza de equipamento sem associação não alcança os de teste.
- Código do produto (Gerais) ganhou as linhas Equipamentos (EQP-0001) e Check list (CHK-0001), também para quem já tinha o cadastro salvo (sem mexer no que existe nem tomar uma sigla em uso). Elas definem sigla e numeração; o código do check list continua sendo gerado em sequência (CHK-0001...) pela tela de check list.
- Aplicar os dados de teste agora é tudo ou nada: se algo falhar no meio, o navegador volta ao que era, em vez de ficar com a metade (era o que travava a reaplicação com "Já existe a opção Ferrotec" e "código SE-100 já associado"). Marcas, tipos e ações de Gerais e códigos de fábrica que já existem ficam como estão e não são anotados para o Limpar. Só no navegador, em modo demonstração, sem Supabase.

## 288. Novo check list: o responsável da associação vale

- No Novo check list (equipamentos e veículos), quando a associação do equipamento ou do veículo define o responsável, o campo Responsável fica escondido e vale o da associação. Antes o envio usava só o responsável guardado ao escolher o equipamento: se a associação fosse criada depois, pela janela de Associar ao lado, o campo sumia mas o envio seguia sem responsável ("Selecione o responsável pelo check list" com o responsável aparecendo na opção do tipo). Agora o envio usa o responsável da associação. Só no navegador, em modo demonstração, sem Supabase.

## 289. Telas de check list mais limpas

- Nas telas de Check list de Veículos e de Equipamentos: a situação por veículo e por equipamento mostra só quem tem check list associado (os sem associação, que podem ser dezenas, ficam atrás do botão "Mostrar sem associação (N)"); o painel de indicadores mostra as 8 primeiras linhas, com o período mais recente primeiro, e "Mostrar todas as N linhas"; e a lista de check lists do mês mostra as 10 primeiras, com "Mostrar todos os N check lists". Nada é apagado, só escondido até pedir. Só no navegador, em modo demonstração, sem Supabase.

## 290. Ajustes da revisão dos check lists

- Equipamentos e Check list (categorias só de código) ficam fora das telas de Categorias e de associar tamanhos; aparecem só em Código do produto. O responsável da associação só esconde o campo no Novo check list quando está ativo e é da empresa do equipamento ou veículo; senão o campo volta para escolher outro. A lista de check lists volta às dez primeiras ao mudar mês, visão, busca ou filtro. O painel em "todos os períodos" ordena pelo prazo mais recente e, no mesmo dia, pelo nome de A a Z. O equipamento de teste de motor elétrico parte do horímetro inicial nas manutenções. A aplicação dos dados de teste só ignora o que já existe (outro erro desfaz tudo) e a restauração não troca o erro original. Só no navegador, em modo demonstração, sem Supabase.

## 291. Página inicial pública em vidro

- A página de entrada usa fundo azul com manchas de luz que derivam devagar, cartões de vidro (desfoque, borda e reflexo ao passar o mouse) que sobem em sequência, e a mesma logomarca brilhante e animada do login e dos módulos, em tamanho grande. Os seis módulos aparecem em cartões de vidro. Quem já tem sessão continua indo para a tela inicial. Quem prefere menos movimento recebe tudo parado. Só visual, sem Supabase.

## 292. Formulários de cadastro em tela inteira

- Os formulários de Empregados, Veículos, Equipamentos, Empresas, Fornecedores, Clientes, EPIs, Uniformes e Produtos abrem ocupando a tela toda, com margens laterais no computador, para enxergar tudo sem rolar a janela. Vale também para a lista de Empregados e de Veículos aberta de dentro da associação de check list. As demais janelas (confirmações e avisos) continuam pequenas. Só visual, sem Supabase.

## 293. Cadastrar a partir da associação e voltar

- Nas telas de Associar itens de check list (Veículos e Equipamentos), Cadastrar empregado e Cadastrar veículo abrem direto o formulário de novo cadastro em tela inteira; ao salvar ou cancelar, a janela volta à associação com o que já estava preenchido. Cadastrar itens de check list (Equipamentos) deixou de fechar a associação: abre os grupos de itens numa janela ao lado, e ao fechar a associação continua de onde parou, como em Veículos. Só visual, sem Supabase.

## 294. Cadastrar padrão só item a item e com confirmação

- Em todos os botões "Cadastrar padrão" dos Parâmetros (subgrupos de ferramentas, tamanhos e medidas, marcas de veículos e tipos de ocorrência de veículos), o padrão não é mais implantado de uma vez: abre uma janela que lista só o que ainda falta, sem nada marcado, o responsável marca item a item e confirma antes de gravar. Não há "Marcar todos". O "Cadastrar padrão" dos tipos de ocorrência deixou de cadastrar também as ações de manutenção, que têm a sua própria restauração item a item. Só visual, sem Supabase.

## 295. Botão Escolher arquivo em todo o sistema

- Todo campo de arquivo (foto do comprovante, importação de NF-e XML e os demais) mostra o botão "Escolher arquivo" ou "Escolher arquivos", no estilo do "Tirar foto", com o nome do que foi escolhido ao lado ("Nenhum arquivo escolhido" enquanto não houver). O campo nativo fica escondido por trás do botão, então rótulo, foco por teclado e leitores de tela continuam funcionando. A mudança está no componente Input, por isso vale para qualquer tela que use type="file". Só visual, sem Supabase.

## 296. Frota: ocorrências na lista e extrato com período e atalhos

- A lista da Frota ganhou a coluna Ocorrências: "N vencida(s)" em vermelho quando há, senão "N em aberto" ou "Sem ocorrências abertas"; a mesma coluna sai no PDF da frota. Como a ocorrência não tem prazo cadastrado, vence a que continua Aberta ou Em tratativa mais de 7 dias depois do dia em que aconteceu (constante DIAS_PARA_VENCER em frota-ocorrencias.ts). Ao clicar no veículo, o extrato deixou de abrir direto: abre uma janela com Data início e Data fim (opcionais; início depois do fim é bloqueado) e os botões Manutenções sugeridas, Manutenções realizadas, Ocorrências e Extrato completo, cada um abrindo o relatório em tela cheia só com aquela parte. O período vale para manutenções realizadas, abastecimentos e ocorrências; as sugeridas e o km atual mostram sempre a situação de hoje. Ocorrência vencida sai sinalizada em vermelho no extrato. Só visual, sem Supabase.

## 297. Manutenção de veículos: filtro por período

- A lista de Módulo > Veículos > Manutenção ganhou Data início e Data fim (opcionais, as duas pontas valem), com o botão Limpar período, que somam à busca. Início depois do fim mostra o aviso e deixa a lista vazia. O contador "N manutenção(ões)" acompanha o filtro. Só visual, sem Supabase.

## 298. Check list de veículos: painel de resultados e listas separadas

- A tela principal de Módulo > Veículos > Check list agora segue o modelo do painel de Viagens: no topo os botões Check list periódico e Check list avulso, depois os indicadores gerais (realizados e não realizados no prazo, previstos e a vencer, com o seletor de período) e abaixo os resultados de cada responsável (previstos, realizados no prazo, não realizados, a vencer e percentual no prazo, só do check list obrigatório). Cada botão abre a sua lista, com Voltar ao painel, o mês (começa no de hoje), a busca e o botão de novo check list. As duas listas têm as mesmas colunas, na mesma ordem: Prazo, Veículo, Periodicidade, Responsável, Situação, Pendências e a ação. No periódico, a vencer leva a Realizar (ou Continuar, se já foi iniciado), não realizado no prazo não tem ação, porque não pode mais ser feito, e realizado leva a Ver check list. No avulso o prazo é o dia do check list, a periodicidade é Avulso e a ação é Ver check list (ou Continuar). A antiga Situação por veículo e a lista Check lists saíram desta tela. Equipamentos continua com a tela anterior. Só visual, sem Supabase.

## 299. Parâmetros > Viagens: questionário de despesas, empregados habilitados e ramificação por resposta

- Nasce o menu Parâmetros > Viagens (no menu lateral e no cartão de Viagens da tela inicial) com dois itens: Questionário de Despesas, que saiu de Parâmetros > Veículos (o endereço antigo redireciona para o novo), e Parâmetros Específicos. Em Parâmetros Específicos há uma caixa dupla: à esquerda todos os empregados ativos que ainda não foram habilitados, à direita os habilitados a lançar despesas no questionário, cada um com a sua área (Oficina, PCM ou Administrativo). Dá para marcar e mover um a um ou todos da lista (os botões de setas ou duplo clique), buscar pelo nome em cada caixa, e nada vale até clicar em Salvar (Descartar volta ao salvo). A lista é a mesma da pergunta de quem está lançando (04) do questionário, então quem fica inativo no cadastro continua saindo do formulário sozinho. No construtor do questionário, a pergunta de várias respostas mostra todas as respostas, cada uma com o seu destino (continuar para a próxima pergunta, ir para a próxima seção, encerrar o formulário ou ir para uma pergunta mais adiante, para não criar ciclo) e o botão de excluir a resposta, que leva junto a ramificação dela; adicionar resposta nova continua pelo botão Adicionar opção. Pergunta que aceita mais de uma resposta só mostra as respostas e o excluir, porque não ramifica. A pergunta de tipos de despesa continua editada pelo botão Novo questionário. Só visual, sem Supabase.

## 300. Painel de Viagens: período nos resultados dos técnicos e sem valor total

- A área Resultados dos técnicos ganhou o seletor de período (mês e ano), o mesmo dos indicadores: mudar em uma das duas áreas muda as duas. O valor total saiu do painel geral: não há mais o indicador Custo total nem a coluna Valor total na tabela dos técnicos. O valor de gastos do empregado só aparece ao clicar no nome dele, no extrato. O texto de "nenhum técnico habilitado" agora aponta para Parâmetros > Viagens > Parâmetros Específicos. Só visual, sem Supabase.

## 301. Títulos de Veículos pelo nome da aba

- Em Módulo > Veículos, o título grande da página é o nome da aba aberta (Frota, Abastecimento, Manutenção, Ocorrências ou Check list) no lugar de "Veículos". Nas páginas de Parâmetros de veículos (Manutenção, Check list, Plano de manutenções, Associar itens e as listas), o texto pequeno do alto deixou de dizer "Parâmetros > Veículos" e passou a dizer só "Parâmetros": o nome de cada página já é o título. Só visual, sem Supabase.

## 302. Títulos pelo nome da aba em todos os módulos e correções pendentes da revisão

- O padrão da decisão 301 vale para todos os módulos: o título grande de EPIs, Uniformes, Ferramentas, Viagens, Equipamentos e Veículos é o nome da aba aberta, e o texto pequeno do alto das páginas de Parâmetros (de todos os módulos) diz só "Parâmetros". Também: check list periódico que não casa com nenhuma previsão aparece na lista como Sem previsão, com Ver check list ou Continuar, para as pendências dele não ficarem inalcançáveis; excluir uma resposta do questionário tira a ramificação dela de todos os questionários, até do que já não tem a pergunta, e grava tudo de uma vez; os habilitados passam a ser editados só pela caixa dupla (o card do questionário aponta para ela) e a caixa dupla ignora a ordem ao decidir se há alterações. Só visual, sem Supabase.

## 303. Nome do card em cima e nome da aba embaixo, em toda a navegação

- Em toda página (módulo e Parâmetros, por qualquer caminho: menu lateral, menu do topo ou card da tela inicial), o texto pequeno do alto é o nome do card a que ela pertence (EPIs, Uniformes, Ferramentas, Veículos, Viagens, Equipamentos, Gerais) e o título grande é o nome da aba ou do menu aberto. O nome do card sai do mesmo cálculo do menu do topo (areaDaRota), então não há lista paralela; as telas compartilhadas, como Parâmetros Específicos, usam o ?de= para saber de qual card vieram. Página que não é de nenhum card com submenu (Empresas, Clientes...) mantém o texto que tinha. Só visual, sem Supabase.

## 304. Frota: coluna Check list, bolinhas de vencimento e links no extrato

- A lista da Frota passa a ter as colunas Veículo, Responsável, Situação, Km atual, Preventivas, Ocorrências, Check list e Ver extrato. Preventivas, Ocorrências e Check list mostram uma bolinha e uma etiqueta: amarela "Vencimento próximo", vermelha "Vencida" ou verde "Em dia", com a quantidade entre parênteses quando há vencidas ou próximas; coluna que não se aplica ao veículo (sem plano de manutenções ou sem check list periódico associado) mostra um traço. Preventivas segue as sugestões do plano (vencida, atenção, em dia). Ocorrências: vencida passou de 7 dias aberta, vencimento próximo vence em até dois dias, sem ocorrência aberta está em dia. Check list: vencida é um prazo obrigatório dos últimos 30 dias que passou sem o check list; vencimento próximo é um prazo que acaba em até dois dias e ainda não foi feito; o opcional não conta. O mesmo aparece no PDF da frota. A janela do extrato do veículo ganhou os links Realizar manutenção, Tratar ocorrências e Realizar check list, que abrem a aba correspondente de Veículos. Só visual, sem Supabase.

## 305. Frota: bolinhas clicáveis e colunas alinhadas

- Na lista da Frota, a bolinha com a etiqueta de Preventivas, Ocorrências e Check list virou um botão que abre direto, em tela cheia, a informação que ela resume, sem passar pela janela do período e sem abrir o extrato da linha: Preventivas abre as manutenções sugeridas, Ocorrências abre as ocorrências em aberto do veículo (as vencidas em vermelho) e Check list abre os check lists periódicos do veículo, com prazo, periodicidade, responsável, situação, pendências e o código do realizado (prazos dos últimos 30 dias em diante). O extrato completo passa a ter também essa tabela de check lists. As colunas da lista têm largura fixa e o texto de cada coluna começa exatamente sob o título dela; Km atual alinha à direita com folga antes de Preventivas. Só visual, sem Supabase.

## 306. Abastecimento de veículos: busca por período

- A lista de Módulo > Veículos > Abastecimento ganhou Data início e Data fim (opcionais, as duas pontas valem), com Limpar período, somando ao veículo escolhido e à busca. O período corta a lista depois de montar o histórico de cada veículo, então os km rodados e o km/L de um abastecimento continuam contando com o anterior mesmo que ele esteja fora do período. Início depois do fim mostra o aviso, deixa a lista vazia e desativa o Gerar PDF. O PDF do abastecimento usa os mesmos filtros e escreve o período no cabeçalho. Só visual, sem Supabase.

## 307. Prazos das ocorrências de veículo em Parâmetros Específicos

- Em Parâmetros > Veículos > Parâmetros Específicos há o cartão Prazos das ocorrências, com o nº de dias para iniciar a tratativa (depois do dia da ocorrência; padrão 2) e o nº de dias para finalizar a tratativa (depois do início da tratativa; padrão 5), inteiros de 0 a 365, com Salvar prazos. A Frota passa a usar esses prazos no lugar dos 7 dias fixos da decisão 296: a ocorrência Aberta vence passados os dias de iniciar; a Em tratativa, passados os dias de finalizar contados do início da tratativa; a Encerrada nunca vence; vencimento próximo é o que vence em até dois dias. Só visual, sem Supabase.

## 308. Empregados das rotinas de veículos (caixa dupla em Parâmetros Específicos)

- Em Parâmetros > Veículos > Parâmetros Específicos há a mesma caixa dupla de Parâmetros > Viagens > Parâmetros Específicos (agora um componente só, CaixaDuplaEmpregados): à esquerda todos os empregados ativos que ainda não foram escolhidos, à direita os envolvidos nas rotinas de veículos, cada um com a sua área (Oficina, PCM ou Administrativo), com busca em cada caixa e Salvar/Descartar. A lista é só de Veículos (a de Viagens continua na pergunta de quem está lançando do questionário). Com a lista vazia nada muda: as rotinas oferecem todos os empregados ativos. Com a lista preenchida, o responsável do check list e da associação de itens, as pessoas das ocorrências e o responsável do cadastro do veículo só oferecem os escolhidos. Só visual, sem Supabase.

## 309. Ocorrências: relatório em PDF ao encerrar e renovação do prazo com validação do supervisor

- Ao encerrar a tratativa de uma ocorrência, o sistema pergunta se quer gerar o relatório em PDF (dados da ocorrência, tratativa e renovações de prazo, no padrão dos extratos, aberto no visualizador). O relatório também fica no botão Relatório (PDF) dos dados de toda ocorrência encerrada. Na tela de tratativa há o botão Renovar prazo: a renovação recomeça, a partir de hoje, a contagem do prazo do passo em que a ocorrência está (iniciar ou finalizar a tratativa, de Parâmetros Específicos) e fica registrada com quem autorizou e quem registrou, nos dados da ocorrência. Quem valida é um supervisor, escolhido numa lista dos habilitados, com a senha de login dele (a regra de quem já é supervisor renovar sem senha foi trocada na decisão 315). Os supervisores são usuários do sistema escolhidos no cartão Supervisores das ocorrências, em Parâmetros > Veículos > Parâmetros Específicos; sem escolha salva, valem os usuários do perfil Administrador. Na demonstração não há senhas de verdade: a senha de login de todos os usuários é "demo"; na Fase 2 a conferência passa a ser a do login do Supabase. Ocorrência encerrada não renova. Só visual, sem Supabase.

## 310. Check list de veículos: indicadores separados para técnicos e PCM

- Na tela principal do Check list de veículos, depois dos indicadores gerais, os mesmos quatro indicadores (realizados no prazo, não realizados no prazo, previstos e a vencer) e a tabela dos responsáveis aparecem separados por grupo: Técnicos (área Oficina) e PCM, sempre os dois, mesmo que um deles não tenha check list previsto no período. Administrativo e Sem área só aparecem quando há check list previsto para quem é dessa área. O período escolhido no topo vale para todos os grupos. A área de cada responsável vem das caixas duplas de Parâmetros Específicos: primeiro a lista de empregados das rotinas de veículos e, para quem não está nela, a lista de habilitados de Viagens; quem não está em nenhuma fica em Sem área. Só conta o check list obrigatório. Só visual, sem Supabase.

## 311. Questionário de despesas: toda pergunta pode ramificar

- Em Parâmetros > Viagens > Questionário de Despesas, toda pergunta passa a ter ramificação, menos a de tipos de despesa (cada tipo já tem o seu questionário; um texto no alto da montagem explica isso). Pergunta de uma única resposta com opções escritas continua ramificando por resposta. Todas as outras (texto, data, hora, valor, imagem, listas de clientes, municípios ou empregados, perguntas travadas e as de várias marcações) ganham o seletor Depois desta pergunta, com as mesmas escolhas: continuar para a próxima pergunta, ir para a próxima seção, encerrar o formulário ou ir a uma pergunta mais adiante (sem criar ciclo). O destino da resposta vale primeiro; o de qualquer resposta cobre as demais. No preenchimento o fluxo segue esses destinos, e a ação requerida não acusa o destino de qualquer resposta por falta de opção. Só visual, sem Supabase.

## 312. Busca por palavra-chave nos cadastros de empregados, clientes e fornecedores

- As telas de Empregados, Clientes e Fornecedores ganharam o campo "Buscar por palavra-chave". A busca olha todos os campos do cadastro (nome, documentos, contato, telefone, e-mail, cidade, matrícula, empresa, datas e situação, conforme o cadastro), sem diferenciar maiúsculas nem acentos; todas as palavras digitadas precisam aparecer, em campos quaisquer e em qualquer ordem. CPF, CNPJ e telefone também casam pelos dígitos, com ou sem pontuação. Em Empregados a busca vale para os dois blocos (ativos e demitidos / inativos) e os totais dos títulos acompanham; com busca, a tela diz quantos foram encontrados. A exportação em CSV de Empregados continua levando todos. Só visual, sem Supabase.

## 313. Questionário de despesas: ramificação em todas as perguntas e resposta limpa ao esconder a pergunta

- Fecha a decisão 311: a Unidade da Federação, que é travada e tem opções, ficava sem nenhum seletor de ramificação; agora também tem o Depois desta pergunta (as outras perguntas travadas já tinham). Toda pergunta, menos a de tipos de despesa, tem ramificação. As condições "aparece só se" de PCM responde continuam valendo: Técnico que não lançou a despesa só aparece com "Não conformidade – técnico monitorado não preencheu" e Nome do empregado só com "Avulso – técnico não monitorado". Agora, quando a escolha em PCM responde (ou uma ramificação) esconde uma pergunta, a resposta que já estava digitada nela é descartada na hora, inclusive o texto de "Outro", e não vai no envio. Só visual, sem Supabase.

## 314. Caminho no alto de toda página

- O texto pequeno do alto de toda página passa a ser o caminho até ela: o nome do card e, depois, se a tela é do Módulo ou dos Parâmetros dele, separados por ›. Ex.: "Veículos › Parâmetros" sobre o título "Tipos de ocorrência", e "Veículos › Módulo" sobre "Frota". Isso distingue a rotina do módulo do cadastro de parâmetros que tem o mesmo nome, em todo o sistema (módulos, Parâmetros e Gerais, por menu lateral, menu do topo ou card). Páginas que não são de nenhum card com submenu (Empresas, Empregados, Clientes, Fornecedores) mostram "Cadastros". Só visual, sem Supabase.

## 315. Renovar o prazo sempre pede a senha do supervisor

- A renovação do prazo da tratativa de uma ocorrência agora sempre pede a senha de login do usuário definido como autorização: o supervisor escolhido na lista dos supervisores habilitados. Mesmo quem já é supervisor digita a senha (a tela só deixa o próprio nome escolhido); a isenção de senha da decisão 309 foi retirada. Senha vazia, supervisor fora da lista ou senha errada não renovam. Na demonstração a senha de todos é "demo"; na Fase 2 vale a do login do Supabase. Só visual, sem Supabase.

## 316. Renovar prazo com a data da tratativa

- O formulário de Renovar prazo da tratativa ganhou o campo "Nova data da tratativa": até quando a tratativa pode ser iniciada (ocorrência Aberta) ou finalizada (Em tratativa). A data vem sugerida (hoje mais os dias do prazo dos Parâmetros Específicos), pode ser trocada, é obrigatória, tem de ser uma data de verdade e não pode ser anterior a hoje. Passa a valer como limite: a ocorrência fica vencida só depois dessa data, e em vencimento próximo nos dois dias anteriores. A data fica registrada na renovação (nos dados da ocorrência e no relatório em PDF, coluna Nova data); a renovação do passo anterior deixa de valer quando a tratativa muda de passo, e renovações antigas, sem data, só recomeçam a contagem no dia delas. A senha do supervisor continua sendo pedida (decisão 315). Só visual, sem Supabase.

## 317. Frota: cards do PCM e dos técnicos e média de consumo

- O alto da Frota trocou os três contadores de situação (ativos, em manutenção e inativos; a situação continua em cada linha da lista) pelos indicadores do PCM, em cards: Manutenções (das preventivas com registro, a parte que não está vencida), Check list PCM (check lists dos responsáveis da área PCM realizados no prazo), Ocorrências (das abertas, as dentro do prazo da tratativa; sem aberta, 100%) e Conformidade geral (média dos indicadores do PCM que têm valor). Em outro grupo (botão próprio, ver decisão 318), os indicadores dos técnicos (responsáveis da área Oficina), só de check list: realizados no prazo e não realizados. Cada card tem o percentual, a cor da faixa e a seta da faixa: verde com seta para cima, amarelo com setas nos dois sentidos e vermelho com seta para baixo. As faixas são as mesmas de Parâmetros Específicos (padrão: verde a partir de 90%, amarelo a partir de 70%); a cor dos não realizados segue a dos realizados no prazo (poucos não realizados é verde). A área de cada responsável vem das caixas duplas. A lista ganhou a coluna Média km/L, do histórico de abastecimentos do veículo (precisa de dois abastecimentos), que também sai no PDF da frota. Só visual, sem Supabase.

## 318. Frota: cards e colunas melhor distribuídos

- Os cards do alto da Frota (primeira versão; a grade mudou na atualização abaixo, com dois botões e quatro colunas): PCM em 8 colunas de 12 e técnicos em 4, com a mesma altura nos dois blocos; no celular, uma coluna. Cada card ganhou cantos mais redondos, percentual maior, barra colorida com o percentual e a seta da faixa.
- A lista de veículos e o PDF do relatório usam colunas com largura proporcional (tabela fixa): o veículo ganha mais espaço, os números ficam à direita com folga e as colunas de vencimento ficam do mesmo tamanho. O PDF passa a usar a folha larga.

- Atualização: os indicadores do PCM e dos técnicos agora são separados por dois botões (aparece um grupo por vez; PCM em 4 colunas, técnicos em 2), e as etiquetas de vencimento da lista têm todas a mesma largura.

- Atualização: os cards dos técnicos têm o mesmo tamanho dos do PCM (grade de 4 colunas); as etiquetas de vencimento viraram uma pílula só, com a bolinha dentro e a mesma largura, e o "Ver extrato" virou botão com contorno.

## 319. Manutenção: cards e lista de revisões

- O alto de Manutenção ganhou cards no modelo da Frota: Preventivas e Corretivas (quantidade registrada e parte do total) e, das revisões do plano de cada veículo, Realizadas no prazo e Não realizadas no prazo (cor e seta da faixa; sem registro não conta; a cor dos não realizados é a dos realizados no prazo).
- A lista passou a mostrar as revisões do plano: veículo, serviço, periodicidade, última realizada, próxima revisão, situação (pílula colorida: vencida, vencimento próximo, em dia ou sem registro). Os dois links (Sugeridas e Realizadas) que ficavam numa última coluna foram retirados. A revisão vence pelo que vier primeiro, o km atual do veículo ou a data: a situação diz o motivo (Vencida por km, por tempo...) e a próxima revisão mostra o km atual para a conta ficar visível, que abrem o relatório do veículo. Os registros de manutenção (relatório, editar, excluir, período) continuam nos botões Preventivas e Corretivas (decisão 319, atualização).

- (Substituída pela atualização seguinte.) Os cards de Manutenção ficavam separados por dois botões, como na Frota: "Manutenções" (Preventivas, Corretivas) e "Indicadores" (Realizadas no prazo, Não realizadas no prazo, Previstas). Previstas = revisões do plano dos veículos.

## 320. Ocorrências: cards, indicadores e prorrogação

- O alto de Ocorrências ganhou cards no modelo da Frota, separados por dois botões: "Ocorrências" (Abertas, Em tratativa, Encerradas e Todas, com a quantidade e a parte do total; clicar num card filtra a lista) e "Indicadores" (Realizadas no prazo e Não realizadas no prazo, com cor e seta da faixa). Os botões de filtro por status que ficavam ao lado da busca saíram, porque os cards fazem esse papel.
- Realizada no prazo é a ocorrência encerrada que cumpriu os dois prazos: a tratativa começou até o dia da ocorrência mais os dias de iniciar e terminou até o início da tratativa mais os dias de finalizar (em cada passo, a data da última renovação vale no lugar da padrão). Não realizada no prazo é a encerrada que perdeu algum dos dois prazos ou a ainda aberta que já venceu; a que está dentro do prazo não entra na conta.
- Parâmetros > Veículos > Parâmetros Específicos, cartão Prazos das ocorrências: além dos dias para iniciar e para finalizar a tratativa, o novo bloco "Prorrogar a tratativa" liga ou desliga o botão Renovar prazo da ocorrência e define quantos dias a nova data limite sugere (antes sugeria os dias do prazo do passo).

- Atualização: em Manutenção os cards são só os indicadores (Realizadas no prazo, Não realizadas no prazo e Previstas). Preventivas e Corretivas viraram botões ao lado de Revisões do plano: cada um mostra, no lugar da lista de revisões, os registros de manutenção do tipo (com período, relatório, editar e excluir).

## 321. Ocorrências: situações em botões, indicadores nos cards

- Em Ocorrências, os cards do alto são só os indicadores (Realizadas no prazo e Não realizadas no prazo). Abertas, Em tratativa, Encerradas e Todas viraram botões padrão do sistema, com a quantidade, ao lado da busca: cada um mostra na lista as ocorrências da situação. Substitui os cards clicáveis da decisão 320 (os botões "Ocorrências" e "Indicadores" que alternavam os cards saíram).

## 322. Dados de teste do PCM e atalho da associação no Novo check list

- Dados de teste: do sexto empregado de teste em diante (Patrícia Souza Nogueira e os outros) entram na lista de habilitados de Viagens com a área PCM, e os dois últimos veículos (TST4D56 e TST5E67) passam a ter como responsável do check list o Thiago e a Camila (da mesma empresa de cada veículo, para a associação valer), com os planos quinzenal e mensal (que têm lacunas). Assim os indicadores do PCM do Check list têm realizados no prazo, não realizados, previstos e a vencer. A versão dos dados de teste subiu para 29, para o navegador regravar sozinho.
- Novo check list: logo abaixo do campo Tipo de check list há sempre o link Associar itens de check list a um veículo. Ele abre a janela da associação ao lado, sem perder o que foi preenchido, e ao fechar volta ao Novo check list. O link deixou de se repetir nos avisos de sem itens e sem periodicidade.

## 323. Check list: campo "Check list de" (Técnicos ou PCM)

- O Novo check list ganhou o campo "Check list de", com Técnicos ou PCM, abaixo do tipo de check list (periódico e avulso). O padrão vem do último check list do veículo; sem nenhum, da área do responsável (PCM) ou Técnicos. O valor fica guardado no check list.
- Os indicadores (painel do Check list e Frota) separam técnicos e PCM por esse campo, e não mais pela área do responsável. A linha do painel ainda sem check list feito usa o grupo do último check list do veículo e da periodicidade; sem nenhum, ou em check list antigo sem o campo, vale a área do responsável como antes.
- Dados de teste: os três primeiros veículos têm check lists de Técnicos e os dois últimos de PCM (versão 30).

## 324. Todos os cards no padrão da Frota

- O card de indicador do sistema é um só, o da Frota: título, número grande, barra, detalhe e o ícone em círculo (com cor e seta da faixa quando há percentual). O StatCard (Check list, Estoque, Dashboard) e os indicadores de Viagens passaram a usá-lo; no Check list os percentuais ganharam a cor da faixa e a barra. No celular o card é menor (espaço interno, número e ícone).

## 325. Relatórios gráficos abaixo dos cards (Veículos)

- Abaixo dos cards de cada tela de Veículos há um bloco Comparativos, em gráficos no estilo de painel de BI: Frota (PCM x técnicos contra a meta de 90
## 324. Todos os cards no padrão da Frota

- O card de indicador do sistema é um só, o da Frota: título, número grande, barra, detalhe e o ícone em círculo (com cor e seta da faixa quando há percentual). O StatCard (Check list, Estoque, Dashboard) e os indicadores de Viagens passaram a usá-lo; no Check list os percentuais ganharam a cor da faixa e a barra. No celular o card é menor (espaço interno, número e ícone).

## 325. Relatórios gráficos abaixo dos cards (Veículos)

- Abaixo dos cards de cada tela de Veículos há um bloco Comparativos, em gráficos no estilo de painel de BI: Frota (PCM x técnicos contra a meta de 90%, e média km/L por veículo), Manutenção (revisões por veículo por situação, e preventivas x corretivas por mês), Ocorrências (rosca por situação, ocorrências por mês e situação por tipo) e Check list (técnicos x PCM, e percentual no prazo por responsável). Feitos com recharts, que já estava no projeto.

## 326. Título da página acompanha a lista do Check list

- No Check list de veículos, o título grande da página passa a ser Check list periódico ou Check list avulso quando uma dessas listas está aberta (e volta a Check list no painel). O mesmo texto que ficava ao lado do botão Voltar ao painel fica só para leitores de tela, para não repetir.

## 327. EPI: Entrada no Estoque, Devolução e Sugestão de Compras própria

- No módulo EPI, a aba Compras passou a se chamar Entrada no Estoque. A Sugestão de Compras saiu dela e virou uma aba própria (Sugestão de Compras), logo abaixo. Os uniformes continuam com Compras.
- Registrar Compra é compra de produto novo e exige todos os dados: empresa, EPI, fornecedor, nota fiscal, CA, data da compra, quantidade e valor unitário. O CA vem preenchido com o do cadastro do EPI, mas é conferido. Na escolha do EPI aparecem código, descrição e tamanho, com o link Cadastrar EPI (abre em outra aba) e, no fornecedor, o link Cadastrar fornecedor; a lista de fornecedores se atualiza quando a pessoa volta à aba.
- O botão Devolução fica ao lado de Registrar Compra. A primeira pergunta é o funcionário; dele sai a lista dos EPIs em posse (por EPI e tamanho) e a pessoa marca o que devolve, a quantidade (até o que está em posse) e o motivo. A devolução soma no estoque como produto usado (o estoque de usados do produto também aumenta) e a movimentação mantém os dados da compra original: data da compra, nota fiscal, fornecedor, tamanho e CA. Como a entrega não guarda de qual compra saiu cada unidade, vale a compra mais antiga do EPI no tamanho. Só o Administrador registra a devolução, como já era. As devoluções aparecem na tabela Entradas de usados.

## 328. EPI: Parâmetros Específicos (motivos e sugestão de compra)

- Em Parâmetros > EPI > Parâmetros Específicos há o cartão Parâmetros do EPI: os motivos de baixa definitiva (filtro do relatório de baixas), os motivos de devolução ao estoque (pedidos na Devolução) e os parâmetros da sugestão de compra.
- Sugestão de compra: escolher entre trabalhar com o estoque mínimo ou com o tempo de cobertura em dias (com os dias de cobertura desejados), mais o prazo de reposição do fornecedor (TR), os dias de segurança (15), a janela de planejamento (30) e o limite de excesso (90).
- A tabela de criticidade, tudo em dias, com TC o tempo de cobertura: Ruptura (TC < TR), Comprar já (TR a TR + segurança), Planejar (até TR + planejamento), Estável (até o limite de excesso) e Excesso (acima). No método do tempo de cobertura entram na sugestão Ruptura (prioridade urgente), Comprar já (alta) e Planejar (média); no do estoque mínimo, o item no mínimo ou abaixo dele. A quantidade cobre o consumo do prazo de reposição mais a cobertura desejada (ou o mínimo).

## 329. EPI: Estoque só de consulta, novos e usados

- No módulo EPI, a aba Estoque virou só consulta do estoque de EPIs (a configuração do estoque mínimo continua em Parâmetros > EPI > Cadastrar EPI). Dois botões azuis no topo escolhem Novos ou Usados, cada um com o total de unidades.
- Filtros: empresa, palavra-chave (código, descrição, tamanho, fornecedor, NF e CA), data da compra (de e até), fornecedor, CA e NF. Colunas, nesta ordem: Código, Item, Empresa, Data da compra, NF, Fornecedor, CA, Tamanho, Estoque mínimo, Quantidade disponível, Alerta e Média de consumo mensal. Há exportação em CSV.
- Uma linha por EPI, tamanho e compra de origem. O estoque não guarda de qual compra vem cada unidade; vale que as mais antigas saem primeiro, então os novos vêm das compras mais recentes. Os usados vêm das devoluções, com a compra original (data, NF, fornecedor e CA); o que passa do saldo não conta. EPI zerado ou sem compra registrada aparece sem dados de compra, para o alerta não sumir. A média de consumo mensal é a dos últimos 12 meses do EPI.

## 330. EPI: Sugestão de Compras com estoque único e Cotação de preços

- A aba Sugestão de Compras do EPI trata o estoque de novos e de usados como um só. Filtros por empresa e palavra-chave (código, descrição e CA). Colunas, nesta ordem: Descrição, Empresa, Estoque novos, Estoque usados, Estoque total, Média de consumo mensal, Tempo de cobertura (dias) e Status de criticidade. Aparecem todos os EPIs, não só os que pedem compra; o EPI sem consumo no último ano fica sem status, a não ser que o estoque esteja abaixo do mínimo, e então é Ruptura. Há exportação em CSV.
- O status segue Parâmetros > EPI > Parâmetros Específicos. No método do tempo de cobertura vale a tabela de criticidade (TC contra o prazo de reposição). No método do estoque mínimo: sem estoque é Ruptura, abaixo do mínimo é Comprar já, no mínimo é Planejar, e acima dele é Estável (ou Excesso, se a cobertura passa do limite).
- O botão azul Gerar relatório abre o passo a passo da Cotação de preços: primeiro a subcategoria (capacete, luvas, botina...) e os níveis de criticidade que a pessoa quer comprar; ao confirmar, a lista dos itens que atendem aos critérios, todos marcados, com a opção de marcar ou desmarcar um a um (ou todos) e de ajustar a quantidade (a sugerida cobre o consumo do prazo de reposição mais a cobertura desejada, ou o mínimo). O relatório sai em PDF (visualizador do sistema) ou em Excel (.xls, tabela HTML que o Excel abre), com as colunas de preço unitário e prazo de entrega em branco para o fornecedor preencher.

## 331. Frota: o extrato do veículo é uma tela interativa

- Ao escolher o veículo na Frota (Ver extrato), abre a tela do extrato, e não mais um PDF. Ela tem o período (data início e fim), o resumo (km atual, média de consumo, preventivas vencidas), as tabelas (manutenções preventivas sugeridas, realizadas, itens não realizados em atenção, abastecimentos, ocorrências e check lists periódicos) e os atalhos das rotinas do veículo: Realizar manutenção (abre o formulário aqui mesmo, com o veículo escolhido), Tratar ocorrências (e um botão por ocorrência em aberto, que abre a tratativa dela) e Realizar check list (abre o Novo check list do veículo).
- O PDF só sai quando a pessoa clica em Gerar PDF e escolhe as seções (decisão 340; os botões Gerar PDF desta seção saíram). As bolinhas da Frota (Preventivas, Ocorrências e Check list) abrem a mesma tela já na tabela que elas resumem; nas ocorrências em aberto, só com as abertas (há a opção Só em aberto).
- Para isso a rota de Veículos aceita ocorrencia e veiculo no endereço: a rotina abre a tratativa ou o Novo check list uma vez e tira o parâmetro do endereço.

## 332. Indicadores numa tela só, sem rolar

- Onde há indicadores, os resultados (cards e gráficos) cabem numa tela de notebook (1366 por 768), sem rolar: os gráficos têm altura que acompanha a da janela, sem o título solto, e os cards ficam mais baixos em janelas curtas; nas Ocorrências os três gráficos ficam lado a lado; no Check list os indicadores gerais, de Técnicos e de PCM ficam lado a lado, cada um com os quatro cards em duas colunas, e as tabelas por responsável e os gráficos vêm logo abaixo.

## 333. Check list, Manutenção e Ocorrências no mesmo desenho; fechamento do relatório em Viagens

- Check list (Veículos): o período fica no alto, à esquerda, na linha dos botões dos tipos de check list. Os resultados cabem numa tela: uma coluna com os indicadores gerais e os gráficos, e uma coluna para Técnicos e outra para PCM, cada uma com os seus indicadores e a tabela dos responsáveis. Nas tabelas, o "No prazo" de cada responsável tem a bolinha da faixa de desempenho. Os cards têm uma versão compacta (`compacto`), só para essas telas.
- Manutenção: o painel (indicadores e gráficos) cabe numa tela e dois botões azuis no alto, "Manutenções planejadas" (revisões do plano) e "Manutenções realizadas" (registros preventivos e corretivos, com os filtros Todas, Preventivas e Corretivas), abrem cada lista em outra tela do módulo, com o botão Voltar ao painel. Cada lista tem o seu período: nas planejadas vale a data da próxima revisão (revisão sem data prevista não aparece quando há período) e nas realizadas, a data da manutenção. As tabelas seguem o desenho da lista da Frota.
- Ocorrências: os botões Todas, Abertas, Em tratativa e Encerradas ficam no topo, no mesmo padrão, e cada um abre a lista da situação em outra tela do módulo (Voltar ao painel); a busca e o período (pela data em que a ocorrência aconteceu) ficam na tela da lista e são limpos a cada abertura. Os cards passam a se chamar Tratadas no prazo e Não tratadas (a não tratada é a encerrada que perdeu algum prazo ou a ainda aberta que já venceu).
- Nas três telas, ao abrir uma lista o foco do teclado vai para Voltar ao painel, e ao voltar ele retorna ao botão que abriu a lista.
- Viagens: o prazo "Nº de dias para fechar o relatório de despesas" (PCM) agora mede o índice de fechamento do relatório no prazo, com card e coluna por técnico, nas mesmas faixas de desempenho. Conta os dias entre o lançamento da despesa no sistema e a geração do relatório; despesa sem relatório e com o prazo vencido conta como fora do prazo; a ainda dentro do prazo não entra.
- Caixa dupla de empregados (Parâmetros): a caixa da esquerda lista sempre todos os empregados ativos; quem já foi incluído continua nela, marcado e travado, e a inclusão vai da esquerda para a direita.
- Check list de veículos: o Responsável de uma associação só pode ser técnico ou PCM (quem está como Administrativo ou sem área na lista de empregados de Veículos não aparece).

## 334. Prazos de lançamento e de fechamento em Parâmetros > Viagens > Parâmetros Específicos

- Em Parâmetros > Viagens > Parâmetros Específicos, abaixo da caixa dupla de empregados habilitados, há o cartão com o nº de dias para lançar a despesa (técnico mecânico) e o nº de dias para fechar o relatório de despesas (PCM), cada um com a caixa "aplicável". Os valores são os mesmos que já mediam os índices de Viagens (lançamento no prazo e fechamento do relatório no prazo); o que mudou foi o lugar.
- Em Parâmetros > Veículos > Parâmetros Específicos ficou só o cartão Faixas de desempenho (verde, amarelo e vermelho), que vale para Viagens, Check list e Frota, com o link para os prazos. Isso altera a decisão 199, que tinha levado os prazos para Veículos.

## 335. Faixas de desempenho também em Viagens > Parâmetros > Parâmetros Específicos

- O cartão Faixas de desempenho (limites do verde e do amarelo, classificação e significado de cada faixa) foi clonado de Parâmetros > Veículos > Parâmetros Específicos para Parâmetros > Viagens > Parâmetros Específicos, abaixo dos prazos de lançamento e de fechamento. É o mesmo componente e a mesma configuração: salvar numa tela vale na outra, porque as faixas também classificam os índices do Check list e da Frota. Continua em Veículos.

## 336. Questionário de despesas: toda pergunta ramifica e o link dos habilitados abre uma janela

- Toda pergunta do Questionário de Despesas tem como ramificar (decisão 311), menos a de tipo de despesa, que o módulo esconde quando o tipo vem do cartão. Fecha-se uma brecha: a pergunta de lista sem nenhuma opção escrita não mostrava controle algum e passa a ter o destino "Depois desta pergunta". Uma regra só (`ramificacaoDaPergunta`: por resposta, depois da pergunta ou nunca) decide o que cada card mostra, e um teste garante que toda pergunta, menos a de tipo, tenha uma forma de ramificar.
- O link "Parâmetros > Viagens > Parâmetros Específicos" dos cards das perguntas de empregados habilitados abre uma janela com a mesma caixa dupla, sem sair do formulário (sair da página descartaria o rascunho em montagem). A janela salva direto, como a tela de Parâmetros Específicos, e a lista do rascunho acompanha para o Salvar Formulário não desfazer o que foi salvo; ela carrega a lista do rascunho (que pode diferir da publicada depois de Restaurar configurações iniciais). Fechar com alteração não salva pede confirmação; fechar volta ao questionário no mesmo ponto.

## 337. Cards de indicadores no mesmo desenho e a lista cabendo na tela

- Todo resumo de números do sistema usa o card padrão compacto (`StatCard`/`Cartao` com `compacto`): Abastecimento de Veículos, Inventário, Abastecimento e Manutenção de Equipamentos e os relatórios de baixa e de funcionário de EPI e Uniformes trocaram as caixas simples por ele, com ícone.
- Na Frota, os cards (2x2) e os dois gráficos ficam na mesma faixa em tela larga, e a busca e a impressão sobem para a linha dos botões PCM e técnicos; a lista dos veículos usa o que sobra da janela e rola por dentro, então cards, gráficos, busca e as cinco linhas cabem sem rolar a página (1900x823 e 1536x864). Em notebook menor (1366x768 e 1440x800) sobram cerca de 15 px de rolagem, porque o cabeçalho do sistema já ocupa 230 px.
- As listas com cards em cima (Equipamentos, Abastecimento, relatórios de baixa) têm altura limitada à janela e rolam por dentro.
- Ainda não passam para uma tela só: Dashboard, Viagens (painel, lista de despesas e resultados), as abas de EPI e Uniformes e a aba Indicadores de Equipamentos, que tem cards grandes com o texto de cálculo aberto.

## 338. Consultar check list e ocorrência a partir do extrato do veículo

- No extrato do veículo, o código do check list (tabela Check lists periódicos) e o da ocorrência (tabela Ocorrências) são links. Clicar abre o registro só para ler, numa janela por cima do extrato (conteúdo das telas Check list e Ocorrências, sem os botões de editar ou tratar); "Voltar ao extrato" ou Esc fecha e devolve ao extrato no mesmo ponto. O PDF não muda. Mudar de veículo fecha a consulta.

## 339. Filtros e buscas sempre no topo, à direita

- Toda tela com busca ou filtro usa a `BarraDeFiltros`: os filtros (busca, seleções, datas, limpar período, contagem) ficam à direita da linha de cima da página, e os botões de ação (Novo, Gerar PDF, Voltar, os botões azuis das listas) à esquerda da mesma linha. O botão que abre ou filtra uma lista por situação fica entre os de ação, e o título da lista fica à esquerda.
- Isso muda posições decididas antes: o Período do Check list (decisão 332) passa para a direita e os botões Check list periódico e avulso para a esquerda; em Equipamentos o Inventário passa a ter os filtros acima dos cards.
- Nas telas de cadastro (Empresas, Empregados, Fornecedores, Clientes e o cadastro de cada módulo: veículos, equipamentos, EPI, uniformes, itens de ferramentas, caixas de ferramentas, ficha de EPI, endereçamento e código de fábrica) os botões de ação (Exportar CSV, Novo...) ficam numa linha no alto, à direita, e a busca vem logo abaixo, também à direita, na mesma barra de filtros das outras telas (decisão 341). As telas de parâmetros Check list e Questionário de Despesas têm layout próprio e não mudaram; as buscas dentro das caixas duplas de empregados e das janelas são internas e ficaram onde estão.
- Listas com altura limitada à janela têm um rolador só (o da própria tabela), com o cabeçalho fixo e a barra horizontal sempre à vista; os campos de busca da barra têm a mesma largura em todas as telas.
- Fora do padrão por enquanto: a lista de despesas de Viagens (os filtros estão no alto de uma seção que fica abaixo dos indicadores, porque a página reúne painel, lista e resultados).

## 340. PDF do extrato do veículo personalizado por seções

- Em Veículos › Frota, no extrato do veículo, o botão Gerar PDF abre a janela Personalizar o relatório: uma caixa de marcar para cada seção (manutenções preventivas sugeridas, manutenções realizadas, itens não realizados em atenção, histórico de abastecimentos, ocorrências e check lists periódicos), com os botões Marcar todos e Desmarcar todos; Gerar PDF fica desligado sem nenhuma seção marcada. O resumo do veículo sai sempre; o período e o "Só em aberto" valem como na tela. Os botões Gerar PDF desta seção, que havia em cada tabela, foram retirados.

## 341. Todo cadastro tem busca, Exportar CSV e o botão de novo

- Todas as telas de cadastro passam a ter o mesmo trio: busca por palavra-chave, Exportar CSV (com o que está filtrado na tela; desligado quando a lista está vazia; a exceção é Empregados, que exporta sempre a lista inteira, como definido antes) e o botão de novo. Empresas ganhou a busca (nome fantasia, razão social, CNPJ, endereço e status) e o Exportar CSV; Fornecedores, Clientes, EPI, Uniformes, Equipamentos (que também ganhou a busca), ficha de EPI, endereçamento e código de fábrica ganharam o Exportar CSV. A posição é a da decisão 339: botões no alto, à direita; busca logo abaixo, à direita.

## 342. Frota: indicadores sempre à vista e filtro por subcategoria

- Em Veículos › Módulo › Frota os indicadores de PCM e de técnicos aparecem juntos, sem botões para alternar. Os cartões ficaram mais estreitos (quatro por linha, ver decisão 343) para caber com os gráficos e a lista numa tela só (decisão 337).
- O título de cada cartão diz de quem é o indicador: "PCM ·", "Técnicos ·" ou "Frota ·" (geral). O subtítulo explica como ele é calculado.
- Ao lado da busca por palavra-chave há o filtro por subcategoria do veículo (utilitário, caminhão, carro...), com as subcategorias ativas de Parâmetros. Ele vale para a lista e para o relatório impresso; os indicadores e gráficos seguem sendo da frota toda.

## 343. Frota: conformidade geral é o SLA de tarefas, e o CPK entra como indicador da frota

- A Conformidade geral é o primeiro cartão e mede o SLA de resolução de tarefas: tarefas concluídas no prazo ÷ tarefas atribuídas, em percentual. As tarefas são as preventivas com registro (no prazo = não vencidas), os check lists obrigatórios (realizado no prazo ou não realizado, de PCM, técnicos e sem área) e as ocorrências abertas (no prazo ou vencidas). Substitui a média simples dos três indicadores do PCM.
- O segundo cartão é o Custo por km rodado (CPK): (total de abastecimento + total de manutenção) ÷ km rodados, em R$/km. Sem filtro de período, vale todo o histórico registrado. Os km rodados de cada veículo são o maior menos o menor km dos registros dele; os gastos só entram dos veículos que têm km rodados. É um valor em reais, sem faixa de cor.
- São sete cartões, quatro por linha.

## 344. Frota: tendência do CPK, proporção do custo preventivo e correções do code review

- Gráfico de linha "CPK da frota mês a mês (R$/km)" nos gráficos da Frota, com os seis meses mais recentes, para acompanhar a evolução dos custos. Os km do mês vão do maior km registrado até o mês anterior até o maior do mês; mês sem km rodados fica com vão na linha.
- Cartão "Frota · Custo preventivo (meta 80%)": gasto com manutenção preventiva ÷ gasto total com manutenção. Referência de mercado 80/20: verde a partir de 80%, amarelo de 70% a 79,9% e vermelho abaixo de 70%. Abaixo de 70% o cartão mostra o alerta "modo reativo". Os limites são fixos, não os das faixas de Parâmetros (que valem para os índices de prazo). São oito cartões, quatro por linha.
- CPK: o abastecimento feito no km de partida do veículo não entra (abasteceu o que rodou antes); registros sem km válido ficam de fora do custo e do km.
- Filtro de subcategoria: as opções incluem as subcategorias que os veículos ainda usam (desativadas ou antigas); se a escolhida deixar de existir, volta a "Todas". O relatório impresso informa a subcategoria filtrada.

## 345. Frota: ocorrências tratadas no prazo, interpretação, gráfico 100% e extrato em quatro seções

- Os indicadores do PCM levam "Índice de" no título: "Índice de manutenções preventivas em dia", "Índice de check lists realizados no prazo" e "Índice de ocorrências tratadas no prazo". O índice de ocorrências deixou de medir as abertas no prazo e passou a medir as tratadas no prazo: a tratativa começou até `iniciar` dias depois da ocorrência e, se já acabou, foi encerrada até `finalizar` dias depois de começar (ou, se ainda corre, o prazo de finalizar não estourou). Fora do prazo: o contrário, e a ocorrência aberta sem tratativa com o prazo de iniciar vencido. Aberta ainda no prazo não entra na conta. As renovações de prazo não entram. A conformidade geral (SLA) usa as mesmas contagens.
- Botão "Interpretar indicadores" na Frota: abre a leitura de cada indicador em linguagem simples (o que o resultado quer dizer e o que fazer), pela faixa em que ele está; o CPK traz a tendência contra o mês anterior.
- Gráfico de barras empilhadas 100% "Custo preventivo x corretivo por mês": seis meses, cada barra vai a 100% e se divide entre preventiva (verde) e corretiva (vermelho), com a linha da meta de 80%. O gráfico de linha do CPK ficou ao lado dele.
- Extrato do veículo em quatro seções, cada uma com o título grande numa faixa colorida: Manutenções (sugeridas, realizadas e itens em atenção), Abastecimentos, Ocorrências e Check lists. Manutenções tem o botão "Registrar manutenção" e Abastecimentos o "Registrar abastecimento", no canto direito (os dois abrem a janela de registro já com o veículo escolhido). Cada linha de ocorrência tem o botão "Tratativa", que leva à tratativa dela. O botão "Realizar check list" ficou na faixa de Check lists. O PDF não muda.

## 346. Extrato do veículo: vai e volta das rotinas e PDF gerado uma vez só

- Na seção Check lists do extrato, o botão do canto direito passou a ser "Registrar check list avulso" e cada check list periódico previsto que ainda não foi feito tem o botão "Realizar check list" (já na periodicidade da linha).
- Vai e volta: check list (periódico ou avulso) e tratativa de ocorrência abertos pelo extrato levam a pessoa à rotina e, ao fechar a tela dela (finalizar, salvar, cancelar ou fechar), de volta ao extrato do mesmo veículo. Registrar manutenção e abastecimento já abrem por cima do extrato, que continua atrás. A ida leva o veículo em `voltar` no endereço; a volta abre a Frota com `extrato`.
- O PDF do extrato: o botão Gerar PDF abre a escolha das seções (Manutenções, Abastecimentos, Ocorrências e Check lists, com Marcar todos e Desmarcar todos) e, ao confirmar, abre direto a janela de impressão (Salvar como PDF), sem o visualizador no meio: o PDF se gera uma vez só.
- O cabeçalho do relatório sempre informa o período ("Período: dd/mm/aaaa a dd/mm/aaaa", com "desde o início" ou "hoje" numa ponta aberta, ou "todo o histórico" sem período).

## 347. Check list: indicadores gerais no alto e técnicos e PCM lado a lado

- Na tela principal de Veículos › Módulo › Check list, os indicadores gerais ficam no alto, com os cards (à esquerda) e os gráficos (à direita) ocupando toda a largura. Abaixo, a tela se divide ao meio: os indicadores e a tabela de responsáveis dos técnicos de um lado e os do PCM do outro. Tudo cabe numa tela, sem rolar a página; a tabela de responsáveis usa o que sobra da janela e rola por dentro. Os gráficos do Check list ficaram mais baixos (decisão 332).

## 348. Manutenção: botão azul à direita e tabela de diagnóstico

- Em Veículos › Módulo › Manutenção, o botão "Cadastrar nova manutenção" ficou azul, à direita, acima dos botões "Manutenções planejadas" e "Manutenções realizadas".
- Depois dos gráficos (agora mais baixos, para caber na tela) vem a tabela da Frota só com dados de manutenção, um veículo por linha: km atual, última manutenção, situação das preventivas, quantidade de manutenções realizadas e de corretivas, custo total e % preventivo (parte do gasto que é preventiva, com a cor da faixa de 80%/70% da decisão 344). Clicar na linha, na etiqueta de preventivas ou em Ver extrato abre o extrato do veículo.

## 349. Ocorrências: Nova ocorrência azul, Ver ocorrências e tabela de diagnóstico

- Em Veículos › Módulo › Ocorrências, o botão "Nova ocorrência" fica azul, à direita, acima do botão "Ver ocorrências". Os quatro botões de situação saíram da tela inicial.
- "Ver ocorrências" abre outra tela do módulo, com a lista e os filtros: situação (Todas, Abertas, Em tratativa e Encerradas, com a contagem), palavra-chave e período (data início e fim), mais o botão de voltar ao painel.
- Depois dos gráficos (mais baixos, para caber na tela) vem a tabela da Frota só com dados de ocorrências, um veículo por linha: última ocorrência, total, abertas, em tratativa, encerradas, situação dos prazos (a etiqueta da Frota), custo da empresa informado nas tratativas e Ver extrato. Clicar na linha ou em Ver extrato abre o extrato do veículo; a etiqueta de prazos abre direto as ocorrências em aberto.

## 350. Faixas de desempenho separadas por domínio: Viagens e Veículos

- Os prazos (dias para lançar a despesa e dias para fechar o relatório de despesas) ficam só em Parâmetros › Viagens › Parâmetros Específicos; em Veículos › Parâmetros Específicos não há mais nenhuma menção a eles.
- As faixas de desempenho (limites de verde e amarelo, classificação e significado) agora são duas configurações independentes: a de Parâmetros › Viagens › Parâmetros Específicos vale para os índices de Viagens (conformidade de lançamento, lançamento no prazo e fechamento do relatório no prazo), e a cópia de Parâmetros › Veículos › Parâmetros Específicos vale para todos os indicadores de veículos (Frota, Check list, Manutenção e Ocorrências). Mudar uma não muda a outra.
- Enquanto Veículos não tem a sua gravada, vale uma cópia da de Viagens (o que já estava configurado não se perde); depois do primeiro Salvar ou Restaurar padrão, as duas seguem separadas.
- O índice "Custo preventivo" (decisão 344) segue com os limites fixos de 80% e 70%.

## 351. EPI, Entrada no Estoque: busca do EPI na compra e Devolução azul

- Em Registrar Compra, depois de escolher a empresa, há um campo de busca por palavra-chave (código, descrição, tamanho ou CA) e, logo abaixo, a lista dos EPIs daquela empresa. Cada EPI aparece como código + descrição + tamanho, uma linha por tamanho autorizado (EPI sem tamanho, uma linha só). Clicar na linha define o EPI e o tamanho da compra (o CA do cadastro vem preenchido). Sem a empresa escolhida a lista pede a empresa; sem EPI escolhido a compra não é registrada.
- O botão Devolução da tela inicial ficou azul, como o Registrar Compra.
- O motivo da devolução para o estoque continua vindo de Parâmetros › EPI › Parâmetros Específicos (lista de motivos de devolução).

## 352. EPI, compras: código do produto e estoque alimentado

- Toda compra de EPI mostra o código do produto comprado e qual estoque ela alimentou (Gemape, GMP ou Lapa, a empresa do item). A lista de compras ganhou a coluna Código e a coluna Estoque (antes "Empresa"); o Exportar CSV leva as duas. No Registrar Compra, o campo da empresa passou a se chamar "Estoque a alimentar (empresa)" e, ao escolher o EPI, a janela diz qual estoque a compra alimenta e o saldo do item hoje e com a compra.
- O item existe uma única vez em cada estoque e o saldo é um só: compras de fornecedores diferentes não geram estoques diferentes, elas se somam no saldo do mesmo item (o fornecedor fica só no registro da compra).

## 353. EPI, Estoque: Novos e Usados azuis no topo à direita

- Em EPI › Módulo › Estoque, os botões Novos e Usados são azuis e ficam no topo da página, à direita (decisão 339). O escolhido leva um anel de destaque e o outro fica mais claro; a contagem de cada um segue dentro do botão.

## 354. EPI, Sugestão de Compras: legenda e balão nos status

- Acima da tabela há uma legenda sempre visível, com cada status de criticidade (Ruptura, Comprar já, Planejar, Estável e Excesso), a criticidade e o significado, mais o "Sem consumo". Na tabela, passar o mouse (ou focar com o teclado) sobre a palavra do status abre um balão com a mesma explicação. Vale também para os status da lista de itens do relatório de cotação. Os textos vêm do significado de cada status em Parâmetros Específicos de EPI.

## 355. EPI: condição lógica de cada status por método e vai e volta com a Sugestão de Compras

- Em Parâmetros › EPI › Parâmetros Específicos, a tabela de status da sugestão de compra mostra, ao lado da tag colorida: criticidade, condição lógica (o gatilho, com a fórmula e com os dias configurados) e o significado prático. A explicação muda conforme o método escolhido, mesmo antes de salvar. Com o tempo de cobertura (TC, em dias): Ruptura TC < TR; Comprar já TC ≥ TR e TC ≤ TR + segurança; Planejar até TR + planejamento; Estável até o limite de excesso; Excesso acima dele; o ponto de pedido é TR + dias de segurança. Com o estoque mínimo: Ruptura estoque total = 0; Comprar já abaixo do mínimo; Planejar exatamente no mínimo; Estável acima do mínimo com cobertura até o limite de excesso; Excesso acima dele.
- A legenda e os balões da Sugestão de Compras (decisão 354) usam a mesma condição, do método em uso.
- O link Parâmetros Específicos da Sugestão de Compras abre essa tela com um botão "Voltar para Sugestão de Compras" e, ao salvar os parâmetros da sugestão, volta a ela sozinho.

## 356. EPI: textos do termo de entrega e da ficha de controle editáveis

- Em Parâmetros › EPI › Parâmetros Específicos há a área "Textos dos documentos", com três campos: a declaração do Termo de Entrega de EPI (antes da lista de EPIs), a ciência do termo (depois da lista) e a declaração da Ficha de Controle de Entrega de EPI. Os textos padrão são os do pedido. Salvar Textos e Restaurar texto padrão ficam abaixo.
- `{empresa}` no texto vira a razão social da empresa, em negrito, na hora de gerar o documento (no termo ela já vinha assim; na ficha, o texto padrão não cita a empresa, mas o marcador também vale). O texto é sempre escapado e as quebras de linha são mantidas. Os três textos são obrigatórios (até 1500 caracteres cada). Mudar o texto vale para os próximos documentos; os já impressos não mudam. Fase 1: fica só no navegador, no modo demonstração.

## 357. EPI: empregados habilitados e áreas da oficina

- Em Parâmetros > EPI > Parâmetros Específicos entram o cartão **Áreas da oficina** (Mecânico/montador, Ajudante/lavador, Pintor, Serralheiro/soldador e Auxiliar de serviços gerais, com novas áreas à vontade) e a caixa dupla **Empregados das rotinas de EPI**: à esquerda todos os empregados ativos, à direita os habilitados para entrega e recebimento de EPI, cada um com a sua área. Nada vale até clicar em Salvar.
- Nas telas de EPI em que se informa o empregado (Entrega, Termo de entrega, Ficha de EPI avulsa e Devolução ao estoque) só aparecem os habilitados.
- **Escolhas do Claude:** (a) lista vazia oferece todos os empregados ativos, como em Veículos (decisão 308); (b) relatórios e filtros de histórico continuam mostrando todos; (c) a área é só uma informação ao lado do nome; (d) uma área em uso não sai da lista antes de mudar a área do habilitado, e sempre sobra ao menos uma; (e) a lista de EPI é independente das de Veículos e Viagens. Só modo demonstração; nada no Supabase.

## 358. EPI: seção Relatórios, com cópias das três rotinas de consulta (substituída pela 359: mover, não clonar)

- No menu de EPIs (o seletor do topo e o cartão EPIs da tela Início) entra a seção **Relatórios**, entre Módulo e Parâmetros, com **Sugestão de Compras**, **Histórico do empregado** e **Baixar Definitivas**.
- Ordem do responsável: **clonar, não mover**. As três rotinas continuam na lista principal (seção Módulo) e as cópias abrem a mesma tela. Cada cópia tem a sua aba (`relatorio-sugestao-compras`, `relatorio-historico`, `relatorio-baixas`), para o menu marcar só a que está aberta; os endereços antigos (`?aba=sugestao-compras`, `historico`, `baixas`) não mudam.
- O cabeçalho da página mostra "EPIs › Relatórios" quando a tela vem da cópia.
- **Vai e volta com os Parâmetros Específicos:** o link "Parâmetros Específicos" da Sugestão de Compras abre a tela de configuração e o botão "Voltar para Sugestão de Compras" (e o salvar dos parâmetros da sugestão) devolve à tela de onde a pessoa saiu, na lista principal ou em Relatórios.
- Só modo demonstração; nada no Supabase.

## 359. EPI: as rotinas de consulta se movem para Relatórios

- Ordem do responsável, corrigindo a decisão 358 ("clonar"): **mover**. Sugestão de Compras, Histórico do empregado e Baixar Definitivas saem da seção Módulo do menu de EPIs e ficam **só** na seção Relatórios (menu do topo e cartão EPIs da tela Início).
- As abas mantêm os endereços de sempre (`?aba=sugestao-compras`, `historico`, `baixas`), então links e favoritos antigos abrem as mesmas telas. As abas de cópia (`relatorio-*`) deixam de existir.
- O vai e volta da Sugestão de Compras com os Parâmetros Específicos volta ao funcionamento simples: leva sempre à Sugestão de Compras.
- A matriz de acessos do modo demonstração passa a ter essas três rotinas na seção Relatórios; exceção de acesso já guardada para o nome antigo (seção Módulo) deixa de valer. Só modo demonstração; nada no Supabase.

## 360. EPI: responsável pela entrega no Termo de Entrega e confirmação na Ficha avulsa

- **Termo de Entrega (Módulo > EPI):** novo campo obrigatório **Responsável pela entrega**. O termo sai com o nome completo de quem entrega (linha "Entregue por" e sob a assinatura do responsável) e de quem recebe (sob a assinatura do empregado). **Escolhas do Claude:** (a) o responsável é um empregado ativo, entre os habilitados do EPI (decisão 357; lista vazia oferece todos), e não pode ser quem recebe; (b) o nome fica só no documento impresso, não nas movimentações gravadas, porque gravar exigiria coluna nova no banco real; (c) os termos de outras telas (Entrega EPI) saem como antes.
- **Ficha de EPI Avulsa:** gerar a ficha abre uma confirmação com o texto do responsável (a ficha serve a itens de consumo corriqueiro, como máscaras e luvas; botinas, capacetes e óculos vão pelo Termo de Entrega) e a pergunta "Deseja confirmar a geração da Ficha avulsa de entrega de EPI?". O caminho "EPIs >> módulo >> termo de entrega" é um link que abre o Termo de Entrega e fecha a janela. **Sim** gera a ficha; **Não** volta sem gerar.
- Só modo demonstração; nada no Supabase.

## 361. EPI: responsável pela entrega gravado no histórico

- Ordem do responsável, completando a decisão 360: o nome de quem entrega passa a ser gravado também no histórico. Cada saída do Termo de Entrega sai com a observação "Entrega de EPI - Termo Gerado em DD/MM/AAAA - Entregue por Nome Completo", que aparece no Histórico do empregado (tabela, busca, CSV e PDF).
- **Escolha do Claude:** o nome vai na observação e não numa coluna nova, porque o banco real não tem coluna de responsável nas movimentações e criar uma exigiria ordem explícita (CLAUDE.md). Se o responsável preferir uma coluna própria, vira migração à parte. No Histórico do empregado, a observação passa a quebrar linha (com o texto inteiro em dica) em vez de cortar. Movimentações antigas ficam como estão. Só modo demonstração; nada no Supabase.

## 362. EPI: Cadastrar Ordem de Serviço

- Em Parâmetros > EPI entra **Cadastrar Ordem de Serviço**, ao lado de Cadastrar Ficha de EPI (as duas ficam dentro de Cadastrar EPI). Cada ordem tem nove tópicos, todos obrigatórios: **Função, Setor, Objetivo, Descrição das atividades, Riscos ocupacionais, Equipamentos de proteção individual, Condutas proibidas, Procedimentos de segurança críticos e Treinamentos e autorizações** (modelo enviado pelo responsável: Mecânico / montador, Oficina mecânica).
- A tela tem lista com busca por qualquer palavra (ignora acento e maiúsculas), Exportar CSV, Nova ordem de serviço, e por linha Clonar, Editar e Excluir.
- **Escolhas do Claude:** (a) cada ordem é identificada por **Função + Setor**, sem repetir (mesma função em outro setor é outra ordem); (b) o texto fica **como digitado**, sem capitalização automática, porque siglas como FISPQ, LOTO e NR-26 seriam estragadas (mesmo critério das decisões 62 e 84 para listas técnicas); (c) nas listas (riscos, EPIs, condutas, procedimentos, treinamentos) escreve-se um item por linha, com ● ou como preferir; (d) Clonar copia o texto e deixa Função e Setor em branco; (e) texto até 4000 caracteres por tópico e 80 em Função e Setor; (f) a ordem ainda não é impressa nem entregue ao empregado: a emissão do documento fica à espera de ordem.
- Só modo demonstração, salvo no navegador; nada no Supabase (na Fase 2 vira tabela, como a ficha de EPI).

## 363. Ferramentas, Movimentações: campo de busca por palavra-chave

- Ordem do responsável: em Ferramentas > Movimentações entra o campo de busca no canto superior direito, ao lado do contador, no mesmo padrão de Veículos (decisão 339). A busca ignora acento e maiúsculas, aceita as palavras em qualquer ordem e procura em código e descrição do item, tamanho, tipo, empregado, motivo da baixa, ônus, tipo de vistoria, tipo de ocorrência, observação e data.
- O Exportar CSV continua exportando todas as movimentações, não só as filtradas. EPI não tem essa tela; Uniformes seguem como estavam (a decisão sobre Uniformes é à parte). Só ajuste de tela; nada no Supabase.

## 364. Uniformes: replica o que o EPI ganhou (habilitados, Relatórios, responsável pela entrega e busca no histórico)

- Ordem do responsável: as mudanças recentes do EPI valem também para Uniformes, respeitando o que é próprio deles.
- **Parâmetros > Uniformes > Parâmetros Específicos** (decisão 357): cartão **Áreas da oficina** e caixa dupla **Empregados das rotinas de uniformes**. As listas são **próprias dos Uniformes** (habilitar alguém no EPI não habilita nos Uniformes) e as áreas partem das mesmas cinco da oficina. Só os habilitados aparecem em Entrega Uniforme, Termo de Entrega e devolução (o Termo de Baixa e a Nova movimentação voltaram a oferecer todos, pela decisão 365); com a lista vazia aparecem todos. Relatórios e filtros de histórico continuam mostrando todos.
- **Uniformes > Relatórios** (decisão 359): **Histórico do empregado** e **Baixar Definitivas** saem da seção Módulo e ficam só em Relatórios, com os mesmos endereços de antes (`?aba=historico` e `baixas`).
- **Histórico do empregado** (busca e período): campo de busca por palavra-chave e datas de Início e Fim, valendo para tabela, CSV e PDF; os cartões seguem contando o histórico inteiro. A observação quebra linha em vez de cortar.
- **Termo de Entrega** (decisão 360): campo obrigatório **Responsável pela entrega** (empregado ativo, habilitado dos Uniformes, diferente de quem recebe); o termo sai com o nome completo de quem entrega e de quem recebe, e a observação de cada saída grava "Entregue por Nome" (decisão 361), sem coluna nova no banco real.
- Como no EPI, a matriz de acessos do modo demonstração passa a ter Histórico do empregado e Baixar Definitivas na seção Relatórios dos Uniformes; exceção de acesso já guardada para o nome antigo (seção Módulo) deixa de valer.
- **Sem equivalente nos Uniformes, por isso não replicado:** Sugestão de Compras, Ficha de EPI Avulsa (e a confirmação ao gerar) e Cadastrar Ordem de Serviço, que é sobre os EPIs de cada função. A busca nas Movimentações (decisão 363) é de Ferramentas e não foi estendida aos Uniformes. Só modo demonstração; nada no Supabase.

## 365. Uniformes: Termo de Baixa e Nova movimentação oferecem todos os empregados

- Ordem do responsável, ajustando a decisão 364 ("faça igual ao EPI"): só **Entrega Uniforme, Termo de Entrega e a devolução** oferecem apenas os empregados habilitados dos Uniformes, como Entrega, Termo de Entrega, Ficha avulsa e Devolução no EPI. O **Termo de Baixa** e a **Nova movimentação** dos Uniformes voltam a oferecer todos os empregados ativos, como a baixa definitiva do EPI e os relatórios, que nunca filtraram. Assim, quem já recebeu uniforme e não está habilitado continua podendo ter a baixa registrada. Só ajuste de tela; nada no Supabase.

## 366. EPI e Uniformes: as Ocorrências também só oferecem os habilitados

- Achado no code review: a tela de Ocorrências (que serve EPI, Uniformes, Ferramentas e Veículos) ainda oferecia todos os empregados ativos, apesar da ordem de que **toda rotina de EPI que informa o empregado** só mostre os habilitados (decisão 357). Passa a valer em **EPI > Ocorrências** e, como os Uniformes seguem o EPI (decisão 364), em **Uniformes > Ocorrências**. Ferramentas e Veículos seguem oferecendo todos os ativos.
- **Escolha do Claude:** ao editar uma ocorrência, o empregado já vinculado continua na lista, marcado como "inativo" ou "não habilitado", para a edição não apagar o vínculo.
- O EPI passa a ter filtro em: Entrega EPI, Termo de Entrega, Ficha avulsa, Devolução e Ocorrências; Relatórios e Baixar Definitivas mostram todos. Os textos das telas de habilitados do EPI e dos Uniformes dizem isso. Só modo demonstração; nada no Supabase.

## 367. Extrato do veículo: botão Registrar ocorrência

- Ordem do responsável: na faixa **Ocorrências** do extrato do veículo entra o botão **Registrar ocorrência**, ao lado de "Só em aberto" e no mesmo desenho de Registrar manutenção, Registrar abastecimento e Registrar check list avulso. Ele abre Veículos > Ocorrências com a **Nova ocorrência já com o veículo do extrato** e, ao salvar ou cancelar, devolve a pessoa ao extrato desse veículo (vai e volta da decisão 346). Só no modo demonstração, como a lista de ocorrências do extrato; nada no Supabase.

## 368. Manutenção: o veículo da lista abre só as informações de manutenção

- Ordem do responsável: em **Veículos > Manutenção**, clicar no veículo da lista (ou em Ver extrato) abre uma janela **só com o que é de manutenção do veículo**, chamada **Manutenção do veículo**: a seção Manutenções (sugeridas, realizadas e itens em atenção), o km atual e as preventivas vencidas. Abastecimentos, Ocorrências e Check lists não aparecem; o Gerar PDF sai direto com essas mesmas tabelas. O Registrar manutenção continua na seção.
- As outras telas (Frota, Ocorrências, Abastecimento) seguem abrindo o extrato completo. **Escolha do Claude:** a média de consumo também sai do resumo, por ser de abastecimento. Só ajuste de tela; nada no Supabase.

## 369. Ocorrências: o veículo da lista abre só as informações de ocorrências

- Ordem do responsável, no mesmo desenho da decisão 368: em **Veículos > Ocorrências**, clicar no veículo da lista (ou em Ver extrato) abre a janela **Ocorrências do veículo**, só com a seção Ocorrências (com o "Só em aberto", o Registrar ocorrência e a consulta ao código) e o km atual. Manutenções, Abastecimentos e Check lists não aparecem; o Gerar PDF sai direto com a tabela das ocorrências. **Escolha do Claude:** as preventivas vencidas e a média de consumo saem do resumo, por não serem de ocorrência. Só ajuste de tela; nada no Supabase.

## 370. Manutenção e Ocorrências: cards e botões menos alargados

- Ordem do responsável: nas telas **Veículos > Manutenção** e **Veículos > Ocorrências**, os cards de indicadores deixam de esticar na largura da tela. Cada card tem de 15 a 18 rem, em fileira alinhada à esquerda (os de Ocorrências passam ao desenho compacto, como os de Manutenção), e os botões azuis ficam compactos e arredondados numa **linha só, à direita** (em vez de empilhados): em Manutenção, Manutenções planejadas, Manutenções realizadas e Cadastrar nova manutenção; em Ocorrências, Ver ocorrências e Nova ocorrência. O mesmo estilo vale nas telas das listas (Nova ocorrência e Voltar ao painel). Os gráficos e a tabela de diagnóstico não mudam. Só ajuste visual; nada no Supabase.

## 371. EPI, Estoque: toda entrada e toda saída movimentam o estoque

- Ordem do responsável: o Estoque de EPI deve se atualizar com as entradas (compra e devolução) e toda **entrega de EPI deve dar baixa** no estoque. Conferido: a **compra** soma nos Novos, a **entrega** (Entrega EPI e Termo de Entrega) subtrai, e a **Devolução** da Entrada no Estoque soma nos Usados, tudo já refletido no Estoque sem recarregar a página.
- **Defeito corrigido:** a devolução feita pelo botão **Devolver EPI**, da tela Entrega EPI, entrava no saldo como produto **novo**, sem a compra de origem, e por isso a aba Usados do Estoque não mudava. Agora ela segue a decisão 327 como a Devolução da Entrada no Estoque: volta como usada, com a compra original mais antiga do EPI no tamanho (ou sem os dados da compra, se nunca houve compra registrada). Só no EPI; Uniformes não têm estoque de usados. Só modo demonstração; nada no Supabase.

## 372. EPI, Relatórios: média de consumo pelo período observado e dados de teste de ordens, fichas e EPIs usados

- **Sugestão de Compras e Estoque:** a média de consumo mensal passa a ser o consumo dos últimos 365 dias dividido pelos **meses realmente observados** do EPI (da primeira entrada, saída ou devolução até hoje, de 1 a 12), e não sempre por 12. Antes, um EPI com poucos meses de histórico parecia em excesso (cobertura de centenas de dias). Com um ano de histórico, ou mais, o número é o de antes. A Sugestão e o Estoque usam o mesmo campo (`mediaMensal`), então mostram a mesma média; a média anual da planilha segue no cálculo antigo (`consumoAnual`).
- **Dados de teste** (menu "Dados de teste", versão 33): cinco **ordens de serviço** (Mecânico / montador, com o modelo enviado pelo responsável, Ajudante / lavador, Pintor, Serralheiro / soldador e Auxiliar de serviços gerais), cinco **fichas de EPI** (uma por modelo do catálogo: botina, luva, capacete, óculos e protetor auricular) e **EPIs usados**: todas as devoluções de EPI passam a entrar como usadas, com a compra de origem e o motivo, e entram mais doze devoluções (botina e luva, nas três empresas), chegando a 19 unidades em Usados. O Limpar tira o que é de teste e deixa o que a pessoa cadastrou. Só modo demonstração; nada no Supabase.

## 373. EPI, Relatórios: valor das baixas e histórico por empregado

- **Baixar Definitivas:** o valor de cada baixa (e o total) saía sempre **R$ 0,00**, porque a baixa só traz o preço quando o banco o grava na hora. Agora, sem preço registrado, vale o preço da **compra do mesmo EPI** (e tamanho, se houver) **mais recente até a data da baixa**; sem compra anterior, a primeira compra depois dela; sem nenhuma compra, zero. A tela, a impressão e o CSV usam o mesmo cálculo.
- **Histórico do empregado:** (a) lê **todas as movimentações do empregado**, de qualquer empresa, em vez de só as da empresa do cadastro dele; (b) a coluna Tipo mostra "Saída (entrega)", "Saída (baixa)" ou "Devolução", em vez de "Saida" e "Devolucao"; (c) cada **entrega** mostra a sua situação: Em posse, Devolvido, Baixado, Devolvido e baixado, ou "Em posse: 2 de 5" (parcial). Como o histórico não diz de qual entrega saiu cada devolução ou baixa, vale a regra de que **o mais antigo sai primeiro**, por EPI e tamanho; os cartões (Entregues, Devolvidos, Baixados e Em posse) seguem contando o histórico inteiro. A busca também acha pelo tipo e pela situação. Só modo demonstração; nada no Supabase.

## 374. Uniformes: a mesma lógica de movimentação de estoque do EPI

- **Estoque:** a aba Estoque dos Uniformes passou a ser a mesma consulta do EPI (decisão 329), com os botões **Novos** e **Usados**, as compras de origem, o mínimo por tamanho, o alerta e a média de consumo mensal. Só não tem a coluna e o filtro de **CA**, que não existem em uniforme.
- **Entrega de uniforme:** continua dando baixa no saldo (por tamanho). A **devolução** feita na Entrega Uniforme agora entra no estoque como **usada**, com a compra mais antiga do uniforme no tamanho (data, nota fiscal e fornecedor) e o motivo.
- **Compras (Uniformes):** ganhou o botão **Devolução** ao lado de Registrar Compra (mesmo diálogo do EPI: escolhe o funcionário, vê o que ele tem em posse e devolve com motivo) e a lista **Entradas de usados (devoluções)**. A aba segue chamada "Compras" nos Uniformes; os motivos de devolução são os do EPI, pois os Uniformes não têm cadastro próprio deles.
- **Dados de teste (versão 34):** as devoluções de uniforme dos dados de teste entram como usadas, para a aba Usados ter o que mostrar.

## 375. Cartões e KPIs: uma grade padrão em todas as telas

- Todo cartão e KPI usa o card da Frota (compacto) e vive numa só grade, `GradeDeCartoes`, logo abaixo da barra de ações e filtros: mesmo espaçamento, mesma altura em cada fileira, duas colunas no celular e até 3, 4 ou 5 em tela larga.
- A grade vale para Dashboard, Dashboard do módulo, relatórios de EPI e Uniformes, Abastecimento, Check list, Manutenção e Ocorrências de Veículos, Viagens e Equipamentos.
- Em **Equipamentos > Indicadores** o card próprio (colorido, com a lista de cálculo aberta) passou ao card padrão; o "Como é calculado" abre no ícone de informação ao lado do título, e a pergunta e a meta ficam no subtítulo.

## 376. Movimentações: busca por palavra-chave em todos os módulos

Em Uniformes (e em qualquer módulo que use a tela de Movimentações), o campo **Buscar movimentação** passa a existir, como já existia em Veículos e Ferramentas. Acha por item, código, tamanho, tipo, empregado, motivo da baixa, ônus, ocorrência, observação e data, sem diferenciar acento e maiúsculas, com as palavras em qualquer ordem. O Exportar CSV continua exportando todas as movimentações.

## 377. Cadastros: relatório com os campos escolhidos por caixas de marcação

Em Cadastros > Clientes, Fornecedores, Empregados e Empresas, o botão **Relatório** (ao lado de Exportar CSV) abre uma janela com uma caixa de marcação por campo (com "Marcar todos" e "Limpar"). Os campos longos (observações, segundo telefone, e-mail do cliente, endereço do fornecedor, país) começam desmarcados. "Gerar relatório" abre o relatório no visualizador do sistema, no padrão de `relatorio-padrao.ts` (logomarca, quadro com o número de registros, tabela de cabeçalho azul e "Emitido em"), com a lista como está na tela: a busca vale, e em Empregados saem os ativos e depois os demitidos / inativos. As colunas seguem a ordem da lista de campos, e não a da marcação; campo vazio sai como "—". Sem nenhum campo marcado o botão fica desabilitado. Só modo demonstração; nada no Supabase.

## 378. Abastecimento de veículos: botão Relatório com colunas e opções personalizáveis

O botão **Gerar PDF** de Veículos > Abastecimento passa a se chamar **Relatório**. Ao clicar, abre a janela de personalização (a mesma dos Cadastros, decisão 377): uma caixa de marcação por coluna (Data e hora, Km, Km rodados, Litros, Valor, R$/L e Km/L, todas marcadas de início, com Marcar todos e Limpar) e duas opções, **Resumo no topo** e **Total de cada veículo**, também marcadas de início. "Gerar relatório" abre o mesmo relatório de antes, no visualizador em tela cheia, só com o que foi marcado e com os filtros da tela (veículo, busca e período). Sem nenhuma coluna o botão fica desabilitado. A janela de marcação virou o componente `EscolherCamposRelatorio`, usado também no Relatório dos Cadastros. Abastecimento de equipamentos mantém o Gerar PDF. Só modo demonstração; nada no Supabase.

## 379. Ferramentas, Estoque: o mesmo controle de entradas e saídas do EPI, com a posição por caixa

- **Saldo:** a **entrada** (compra, NF-e, entrada avulsa ou ajuste) soma e a **baixa definitiva** (perda, quebra, desgaste etc.), com ou sem caixa, subtrai. A **entrega** e a **devolução** pela caixa não mexem no saldo, pois a ferramenta continua sendo da empresa: só mudam onde ela está. Antes, a baixa pela caixa não reduzia o saldo.
- **Estoque (Ferramentas):** a tabela ganhou Caixa, Entradas, Baixas, Guardada na caixa, Com empregado e Sem caixa, e avisa "Não bate" quando o saldo difere de entradas menos baixas ou quando a caixa tem mais do que o estoque. Abaixo há a **Posição por caixa**: cada caixa com as suas ferramentas (cadastrada, baixas, com empregado, guardada, saldo no estoque) e o total. O CSV leva as mesmas colunas.
- **Caixa × estoque:** a caixa não guarda mais ferramentas do que o estoque tem (saldo mais o que já saiu dela por baixa); o cadastro da caixa recusa o excesso e pede a entrada antes.
- **Estoque inicial:** continua na tela de Configurar, mas só aumenta o saldo, e o aumento vira uma **entrada de ajuste** no histórico, para o saldo continuar batendo com as movimentações. Para reduzir, usa-se a baixa.
- **Correção:** o "Disponível" da caixa não descontava a baixa feita com o empregado (5 na caixa, 2 entregues e 1 perdido mostrava 4 guardadas; o certo é 3).
- **Dados de teste (versão 35):** a primeira ferramenta de cada caixa é entregue ao portador (a da caixa 4 volta), e a segunda das caixas 2 e 3 sofre baixa; o saldo bate em todas. No banco real (Fase 2) o gatilho de movimentações precisa da mesma regra; nada foi alterado no Supabase.

## 380. Uniformes, Compras: botões no topo e compras e devoluções em listas separadas

Em Uniformes > Compras, Exportar CSV, Importar NF-e, Registrar Compra e Devolução ficam no topo da tela, à esquerda (antes da Sugestão de compras), e a busca à direita. Dois botões, **Compras** e **Devoluções**, alternam as listas: Compras mostra a Sugestão de compras e a tabela das compras; Devoluções mostra as entradas de usados. A busca por fornecedor ou NF só aparece em Compras.

## 381. Uniformes, Compras: Sugestão de compras em botão próprio

Em Uniformes > Compras, a **Sugestão de compras** deixou de aparecer em cima da lista de compras e ganhou o seu botão, ao lado de **Compras** e **Devoluções**: cada botão mostra só a sua lista. A tela abre em Compras. A busca por fornecedor ou NF continua só em Compras.

## 382. Uniformes, Compras > Devoluções: busca por palavra-chave

Ao clicar em **Devoluções**, o campo **Buscar devolução** aparece no topo da tela, à direita, na barra padrão de filtros (no lugar da busca por fornecedor ou NF, que é só de Compras). Acha por data, código da devolução, funcionário, empresa, uniforme (código e nome), tamanho, motivo, data da compra original, NF e fornecedor, sem diferenciar acento e maiúsculas e com as palavras em qualquer ordem. Com a busca ativa a lista mostra "x de y devoluções" e, sem resultado, "Nenhuma devolução para a busca". O texto digitado se guarda enquanto se alterna entre as visões.

O botão **Imprimir** do Histórico do empregado e de Baixar Definitivas, no EPI e nos Uniformes, passou a se chamar **Relatório** (decisão 382, mesma rodada): continua abrindo o relatório no visualizador, onde se imprime ou se baixa o arquivo.

Na mesma rodada (decisão 382), nos relatórios de **Histórico do empregado** e **Baixar Definitivas**, do EPI e dos Uniformes, os botões (Relatório e Exportar CSV) ficam à esquerda e os campos de busca e de período (Buscar, Início e Fim; Data Inicial, Data Final e Motivo de Baixa) no topo à direita, na barra padrão de filtros.
