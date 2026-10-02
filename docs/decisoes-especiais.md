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

## 13. FORNECEDORES — CATEGORIAS
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

