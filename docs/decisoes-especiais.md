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
