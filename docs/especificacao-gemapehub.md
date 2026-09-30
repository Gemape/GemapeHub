# Especificação funcional — GEMAPE Hub (rev1)

Transcrição do documento enviado pelo responsável (md gemape rev1.pdf, 29/09/2026), que substitui a versão anterior. A implementação segue etapa por etapa, com aprovação entre cada uma. Fase 1: ambiente de teste com dados fictícios, sem Supabase real.

Leia junto com `docs/decisoes-especiais.md`: as decisões registradas lá complementam ou corrigem este texto e prevalecem em caso de conflito.

Regras permanentes do responsável:
- Nenhum módulo cria lista própria de subcategoria ou de código. Todos puxam de Cadastros > Gerais.
- Campo extra só com aprovação prévia no PR.

## Menu > Cadastros

### Gerais

Permissão de acesso: Administrador. Usuário simples: não tem acesso.

**Cadastrar categorias** (todos os tipos de produtos)
1. Mostra as categorias existentes para evitar cadastro redundante.
2. Permite cadastrar uma nova categoria.

**Cadastrar subcategorias** (dentro de uma categoria de produtos)
1. Seleciona a categoria (ex.: EPI).
2. Permite cadastrar as subcategorias (ex.: luvas, capacete, bota).

**Cadastrar código de fábrica**
Associa o código de produto de um fornecedor ao código interno do produto na GEMAPE. Ao dar entrada na nota fiscal, o sistema já entende a qual produto associar o estoque ao importar o arquivo XML.
1. Informa o produto cadastrado na GEMAPE (campo com busca dos produtos já cadastrados).
2. Seleciona o produto da GEMAPE desejado.
3. Informa o fornecedor (campo com busca dos fornecedores já cadastrados).
4. Seleciona o fornecedor.
5. Informa o código do produto que está na nota fiscal do fornecedor.
6. Se for EPI, informa o código do CA que está na nota fiscal do fornecedor.

**Cadastrar endereçamento de estoque**
Localização onde o item deve ser guardado (espaço físico no almoxarifado), depois da entrada da nota fiscal e da alimentação do estoque.
1. Informa o produto cadastrado na GEMAPE (campo com busca).
2. Seleciona o produto.
3. Informa a rua (corredor).
4. Informa o número (estante).
5. Informa o apartamento (nível da prateleira, sempre de cima para baixo).

**Tamanho e medidas de produto — cadastro base**
- Numeração e tamanho de produtos: cadastrar sequencialmente todas as possibilidades de tamanho e numeração para qualquer categoria de produto controlado.
- Unidade de medida de produtos: cadastrar todas as unidades de medida (ex.: unidade, par, jogo, caixa).

**Associar tamanho e medida ao produto**
Associa a uma categoria as opções de tamanho e unidade de medida de um produto.
1. Categoria (vem de Cadastro > Categoria de Produtos).
2. Subcategoria (vem de Cadastro > Subcategoria de Produtos).
3. Na lista da esquerda (Existentes), seleciono as opções desejadas e confirmo a transferência para a lista da direita (Autorizados).
4. Para desautorizar, seleciono na lista da direita (Autorizados) e confirmo a transferência de volta para a lista da esquerda (Existentes). O PDF original diz "direita" neste passo por erro de digitação (ver `docs/decisoes-especiais.md`).

**Código do produto** (ensina o sistema a gerar o código interno da GEMAPE)
1. Categoria (vem de Cadastro > Categoria de Produtos).
2. Sigla a ser usada.
3. Numeração inicial. Numeração de 4 dígitos, confirmada pelo responsável (ex.: EPI-0001).

### EPI

**Cadastrar EPI**
1. Código gerado automaticamente em sequência, conforme a regra de Cadastro > Código do Produto (ex.: EPI-0001).
2. Subcategoria (lista suspensa de Cadastro > Cadastrar Subcategoria) (ex.: capacete).
3. Descrição do item (campo aberto) (ex.: capacete de segurança em ABS de alto impacto).
4. Estoque mínimo (número, quantidade mínima).
5. Empresa (aprovado em 30/09/2026: o dashboard consolida por empresa).

**Cadastrar ficha de EPI**
1. Seleciona o EPI (busca por palavra-chave ou código do produto).
2. Setores aplicáveis (cadastro manual).
3. Finalidade e riscos protegidos (cadastro manual).
4. Instruções de uso e forma de vestir (cadastro manual).
5. Verificação de eficácia, antes do uso (cadastro manual).
6. Higienização e conservação (cadastro manual).
7. Descarte (cadastro manual).
8. Responsabilidades do empregado, NR6 (cadastro manual).

### Uniforme

**Cadastrar uniforme**
1. Código gerado automaticamente em sequência, conforme a regra do Código do Produto (ex.: UNI-0001).
2. Subcategoria (lista suspensa de Cadastro > Cadastrar Subcategoria) (ex.: camiseta).
3. Descrição do item (campo aberto) (ex.: camiseta manga curta em algodão azul royal).
4. Estoque mínimo.
5. Preço de custo (aprovado pelo responsável em 30/09/2026, ver `docs/decisoes-especiais.md`).
6. Marca (aprovado em 30/09/2026).
7. Modelo (aprovado em 30/09/2026).
8. Empresa (aprovado em 30/09/2026).

O CA não entra no uniforme: é exigência da NR6 e pertence ao EPI e à Ficha de EPI.

### Veículo

**Cadastrar veículo**
1. Código gerado automaticamente em sequência, conforme a regra do Código do Produto (ex.: VEI-0001).
2. Subcategoria (lista suspensa de Cadastro > Cadastrar Subcategoria) (ex.: caminhonete).
3. Descrição do item (campo aberto) (ex.: caminhonete S10).
4. Placa.
5. Marca.
6. Modelo.
7. Ano de fabricação.
8. Cor.
9. Combustível.
10. Empresa (aprovado em 30/09/2026).
11. RENAVAM (aprovado em 30/09/2026).
12. Quilometragem atual (aprovado em 30/09/2026).
13. Situação (aprovado em 30/09/2026).
14. Empregado responsável (aprovado em 30/09/2026).
15. Observações (aprovado em 30/09/2026).

### Ferramentas

Permissão: Administrador cadastra caixa, portador, categoria e grupo. Usuário simples cadastra modelo.

**Cadastrar modelo**
1. Código automático, numeração sequencial.
2. Categoria (lista de Cadastro > Ferramentas > Cadastrar Categorias de Ferramentas).
3. Grupo (lista de Cadastro > Ferramentas > Cadastrar Grupos de Ferramentas).
4. Modelo (campo aberto).
5. Número de série (aprovado em 30/09/2026: essencial para garantia e baixa).
6. Patrimônio (aprovado em 30/09/2026: liga a ferramenta ao ativo).
7. Data de aquisição (aprovado em 30/09/2026: sustenta a depreciação).

**Cadastrar categorias de ferramentas:** Manual, Elétrica, Pneumático, Hidráulica, Medição, Corte. Permitir cadastrar novas se necessário.

**Cadastrar grupos de ferramentas:** Chave de fenda, Chave estria, Chave boca, Meia lua, Combinada, Canhão, Alicates, Lima, Chave Philips, Chave L, Chave Allen, Cachimbo, Diversos.

**Cadastrar marcas:** conforme necessidade.

**Cadastrar caixa:** caixas numeradas de 01 a 100; marcar com flag as que ficam habilitadas.

**Cadastrar portador**
1. Número da caixa (lista suspensa das caixas habilitadas).
2. Empregado portador (busca por palavra-chave).
3. Status (ativa ou inativa).
4. Observação.
5. Histórico de portadores.

### Empregados

Permissão: Administrador e usuário RH. Usuário simples: não tem acesso.

Campos: nome completo, CPF, matrícula interna (LxPx: livro x, página x), empresa, e-mail, data de admissão, data de demissão.

Não há campo de cargo nem botão "ativo": a situação vem só da data de demissão (confirmado em 30/09/2026).

- Ao entrar, vejo todos os empregados, com os ativos no bloco superior.
- Ao lançar data de demissão, o sistema inativa a pessoa automaticamente e a leva para um bloco inferior separado.
- Excluir o cadastro do empregado apenas com permissão de administrador.

### Empresas

Permissão: Administrador e usuário RH. Usuário simples: não tem acesso.

Campos: nome fantasia (aprovado em 30/09/2026), razão social, CNPJ, endereço, status (ativa ou inativa).

- Excluir o cadastro da empresa apenas com permissão de administrador.

### Fornecedores

Permissão: Administrador. Usuário simples: não tem acesso.

Campos:
1. Numeração sequencial automática de 5 dígitos.
2. Categorias: uma ou mais, vindas de Cadastros > Gerais > Categorias (aprovado em 30/09/2026; o fornecedor pode vender mais de um tipo de produto).
3. Razão social.
4. Nome fantasia.
5. CNPJ.
6. Endereço (rua/av., nº, bairro, CEP, cidade, estado, país).
7. Inscrição estadual.
8. Telefone.
9. Contato.
10. Observações.

## Fora do rev1

A versão anterior trazia também "Permissões de acesso" (grupos Administrador, RH e Padrão; cadastro de usuário; matriz de acesso) e um rascunho de cadastro de ferramentas com patrimônio. O rev1 não traz essas seções. As decisões já tomadas sobre perfis (Administrador, RH e Padrão, sem Gestor) continuam valendo até nova orientação.
