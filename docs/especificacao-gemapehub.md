# Especificação funcional — GEMAPE Hub

Transcrição do documento enviado pelo responsável (md gemapehub.pdf, 29/09/2026). A implementação segue módulo por módulo, na ordem definida pelo responsável e com aprovação entre cada um. Fase 1: ambiente de teste com dados fictícios, sem Supabase real.

## Menu > Parâmetros Base

### Produtos

Permissão de acesso: Administrador. Usuário simples: não tem acesso.

**Cadastrar categorias** (todos os tipos de produtos)
1. Mostra as categorias existentes para evitar cadastro redundante.
2. Permite cadastrar uma nova categoria.

**Cadastrar subcategorias** (dentro de uma categoria de produtos)
1. Seleciona a categoria (ex.: EPI).
2. Permite cadastrar as subcategorias (ex.: luvas, capacete, bota).

**Cadastrar código de fábrica**
Associa o código de produto de um fornecedor ao código interno do produto na GEMAPE. Ao dar entrada na nota fiscal, o sistema já entende a qual produto associar o estoque ao importar o XML.
1. Informa o produto cadastrado na GEMAPE (campo com busca dos produtos já cadastrados).
2. Seleciona o produto da GEMAPE desejado.
3. Informa o fornecedor (campo com busca dos fornecedores já cadastrados).
4. Seleciona o fornecedor.
5. Informa o código do produto que está na nota fiscal do fornecedor.
6. Se for EPI, informa o código do CA que está na nota fiscal do fornecedor.

**Cadastrar endereçamento de estoque**
Localização onde o item deve ser guardado no almoxarifado, depois da entrada da nota fiscal.
1. Informa o produto cadastrado na GEMAPE (campo com busca).
2. Seleciona o produto.
3. Informa a rua (corredor).
4. Informa o número (estante).
5. Informa o apartamento (nível da prateleira, sempre de cima para baixo).

**Tamanho e medidas de produto — cadastro base**
- Numeração e tamanho de produtos: cadastrar sequencialmente todas as possibilidades de tamanho e numeração para qualquer categoria de produto controlado.
- Unidade de medida de produtos: cadastrar todas as unidades de medida (ex.: unidade, par, jogo, caixa).

**Associar tamanho e medida ao produto**
Associa a uma categoria as opções de tamanho e unidade de medida.
1. Categoria (vem de Cadastro > Categoria de Produtos).
2. Subcategoria (vem de Cadastro > Subcategoria de Produtos).
3. Na lista da esquerda (Existentes), seleciono as opções desejadas e confirmo a transferência para a lista da direita (Autorizados).
4. Para desautorizar, seleciono na lista da direita e confirmo a transferência de volta.

**Código do produto** (ensina o sistema a gerar o código interno da GEMAPE)
1. Categoria (vem de Cadastro > Categoria de Produtos).
2. Sigla a ser usada.
3. Numeração inicial.

### Empregados

Permissão: Administrador e usuário RH. Usuário simples: não tem acesso.

Campos: nome completo, CPF, matrícula interna (LxPx: livro x, página x), empresa, e-mail, data de admissão, data de demissão.

- Ao entrar, vejo todos os empregados, com os ativos no bloco superior.
- Ao lançar data de demissão, o sistema inativa a pessoa automaticamente e a leva para um bloco inferior separado.
- Excluir o cadastro do empregado apenas com permissão de administrador.

### Empresas

Permissão: Administrador e usuário RH. Usuário simples: não tem acesso.

Campos: razão social, CNPJ, endereço, status (ativa ou inativa).

- Excluir o cadastro da empresa apenas com permissão de administrador.

### Fornecedores

Permissão: Administrador. Usuário simples: não tem acesso.

Campos:
1. Numeração sequencial automática de 5 dígitos.
2. Categoria (vem de Cadastro > Categoria de Produtos).
3. Razão social.
4. Nome fantasia.
5. CNPJ.
6. Endereço (rua/av., nº, bairro, CEP, cidade, estado, país).
7. Inscrição estadual.
8. Telefone.
9. Contato.
10. Observações.

### Ferramentas

Permissão: Administrador cadastra caixa, portador, categoria e grupo. Usuário simples cadastra modelo.

**Cadastrar modelo (ferramentas)**
1. Código automático, numeração sequencial.
2. Categoria (lista de Cadastro > Ferramentas > Categorias de ferramentas).
3. Grupo (lista de Cadastro > Ferramentas > Grupos de ferramentas).
4. Modelo (campo aberto).

**Cadastrar categorias de ferramentas:** Manual, Elétrica, Pneumático, Hidráulica, Medição, Corte. Permitir cadastrar novas se necessário.

**Cadastrar grupos de ferramentas:** Chave de fenda, Chave estria, Chave boca, Meia lua, Combinada, Canhão, Alicates, Lima, Chave Philips, Chave L, Chave Allen, Cachimbo, Diversos.

**Cadastrar marcas:** conforme necessidade.

**Cadastrar caixa:** caixas numeradas de 01 a 100; marcar com flag as que ficam habilitadas.

**Cadastrar portador**
1. Número da caixa (lista das caixas habilitadas em Parâmetros Base).
2. Empregado portador (busca por palavra-chave).
3. Status (ativa ou inativa).
4. Observação.
5. Histórico de portadores.

## Menu > Cadastro

(Sem conteúdo no documento.)

## Menu > Permissões de acesso

**Cadastrar grupo:** Administrador, RH, Padrão.

**Cadastrar usuário**
1. Empregado (busca em Cadastros > Empregados).
2. Login no padrão primeiro.último nome (ex.: paula.vasconcelos).
3. Senha automática para o primeiro acesso; nova senha cadastrada no primeiro acesso.
4. Envio dos dados de primeiro acesso para o e-mail do usuário.

**Gerenciar acesso:** listar todas as rotinas; para cada rotina, informar se o usuário pode editar, consultar ou não ter acesso.

## Rascunho (destacado no documento)

**Cadastrar as ferramentas**
1. Código automático, numeração sequencial.
2. Categoria (Cadastro > Ferramentas > Categorias de ferramentas).
3. Marca (Cadastro > Ferramentas > Marcas).
4. Grupo (Cadastro > Ferramentas > Grupos de ferramentas).
5. Modelo (campo aberto).
6. Número de série (campo aberto).
7. Chave para informar se terá patrimônio associado; se sim, habilita o campo de patrimônio.
8. Patrimônio (código automático, numeração sequencial).
9. Data de aquisição.
