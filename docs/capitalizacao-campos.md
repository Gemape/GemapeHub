# Capitalização: mapa de campos (decisão 84)

Regra: `texto` = só a primeira letra maiúscula; `nome` = nome de pessoa, por palavra; `nenhum` = código, número, data, máscara, busca e demais campos que não se alteram. Gerado na aplicação da decisão 84; cada linha: arquivo | campo | modo | motivo.

## Grupo A

VeiculosCadastroModulo.tsx | busca | nenhum | busca/filtro
VeiculosCadastroModulo.tsx | codigo_sku | nenhum | readOnly, código
VeiculosCadastroModulo.tsx | placa | nenhum | placa
VeiculosCadastroModulo.tsx | modelo | texto | modelo do veículo
VeiculosCadastroModulo.tsx | ano | nenhum | number
VeiculosCadastroModulo.tsx | cor | texto | cor
VeiculosCadastroModulo.tsx | renavam | nenhum | RENAVAM
VeiculosCadastroModulo.tsx | data_aquisicao | nenhum | date
VeiculosCadastroModulo.tsx | custo | nenhum | number/valor
VeiculosCadastroModulo.tsx | numero_nota_fiscal | nenhum | número de NF
VeiculosCadastroModulo.tsx | quilometragem_atual | nenhum | number
VeiculosCadastroModulo.tsx | observacoes | texto | observações (também no salvamento)
OcorrenciasVeiculoModulo.tsx | busca | nenhum | busca
OcorrenciasVeiculoModulo.tsx | oc_data | nenhum | date
OcorrenciasVeiculoModulo.tsx | oc_hora | nenhum | time
OcorrenciasVeiculoModulo.tsx | oc_local | texto | local (também no salvamento)
OcorrenciasVeiculoModulo.tsx | oc_descricao | texto | descrição (também no salvamento)
OcorrenciasVeiculoModulo.tsx | tr_emp | texto | tratativa empresa (também no salvamento)
OcorrenciasVeiculoModulo.tsx | tr_ter | texto | tratativa terceiros (também no salvamento)
OcorrenciasVeiculoModulo.tsx | tr_custo | nenhum | valor R$
OcorrenciasVeiculoModulo.tsx | tr_pag | texto | pagamento terceiros (também no salvamento)
ManutencaoVeiculoModulo.tsx | busca | nenhum | busca
ManutencaoVeiculoModulo.tsx | data | nenhum | date
ManutencaoVeiculoModulo.tsx | km | nenhum | quilometragem
ManutencaoVeiculoModulo.tsx | descricao | texto | problema relatado (também no salvamento)
ManutencaoVeiculoModulo.tsx | observação do subitem | texto | observação (também no salvamento)
ManutencaoVeiculoModulo.tsx | localNome | texto | nome do local de terceiro (também no salvamento)
ManutencaoVeiculoModulo.tsx | custo_pecas | nenhum | valor R$
ManutencaoVeiculoModulo.tsx | custo_mao | nenhum | valor R$
AbastecimentoVeiculoModulo.tsx | busca | nenhum | busca
AbastecimentoVeiculoModulo.tsx | data | nenhum | date
AbastecimentoVeiculoModulo.tsx | hora | nenhum | time
AbastecimentoVeiculoModulo.tsx | km | nenhum | quilometragem
AbastecimentoVeiculoModulo.tsx | litros | nenhum | número
AbastecimentoVeiculoModulo.tsx | valor | nenhum | valor R$
FrotaModulo.tsx | busca | nenhum | busca
ChecklistVeiculoModulo.tsx | busca | nenhum | busca
ChecklistVeiculoModulo.tsx | observação do item | texto | observação (também no salvamento via onBlur)
ChecklistVeiculoModulo.tsx | Como foi resolvida | texto | texto de resolução (também no salvamento)
EdicaoCatalogoForm.tsx | edit-nome | texto | nome do item (também no salvamento)
EdicaoCatalogoForm.tsx | edit-minimo | nenhum | número
DialogTamanhoSubcategoria.tsx | tamanho-subcategoria | nenhum | tamanho/sigla (M, GG, 42)
ImportarNfeCodigoFabrica.tsx | CA na nota fiscal | nenhum | código CA
ImportarNfeCodigoFabrica.tsx | arquivo XML | nenhum | file
ListaEditavel.tsx | novo item (idCampo) | nenhum | usada só para tamanhos/medidas (siglas)
ListaEditavel.tsx | novo nome de item | nenhum | idem
NovoTamanhoRapido.tsx | novo-tamanho-rapido | nenhum | tamanho/sigla
PlanoManutencaoVeiculo.tsx | km-* | nenhum | quilometragem
PlanoManutencaoVeiculo.tsx | meses-* | nenhum | número
VeiculosListasParametros.tsx | veiculo-lista-nome | texto | nome da lista (também no salvamento)
VeiculosListasParametros.tsx | veiculo-lista-descricao | texto (só campoExtra=descricao) | em subitens/itens (uma linha por item) fica sem; salvamento idem

## Grupo B

CaixasFerramentasModulo.tsx | busca (Buscar por código ou nome) | nenhum | busca
CaixasFerramentasModulo.tsx | numero | nenhum | readOnly, código calculado
CaixasFerramentasModulo.tsx | nome | texto | nome do kit/caixa (salvamento formatado)
CaixasFerramentasModulo.tsx | portador-ativo-caixa | nenhum | readOnly
CaixasFerramentasModulo.tsx | localizacao | texto | local (salvamento formatado)
CaixasFerramentasModulo.tsx | descricao (Textarea) | texto | descrição (salvamento formatado)
CaixasFerramentasModulo.tsx | quantidade do item | nenhum | número
CaixasFerramentasModulo.tsx | observacao do item | texto | observação (controlado)
FerramentasCaixasModulo.tsx | filtro de caixa | nenhum | busca/filtro
PortadoresCaixaModulo.tsx | busca-portador | nenhum | busca de empregado
PortadoresCaixaModulo.tsx | portador atual | nenhum | readOnly
PortadoresCaixaModulo.tsx | portador-observacao (Textarea) | texto | observação (salvamento formatado)
PortadoresCaixaModulo.tsx | busca histórico | nenhum | busca
FerramentasTermoEncerramento.tsx | dataEncerramento | nenhum | data
FerramentasTermoEncerramento.tsx | quantidade | nenhum | número
FerramentasTermoEncerramento.tsx | observacao do item | texto | observação (formatada ao gravar movimentação)
FerramentasTermoVistoria.tsx | dataVistoria | nenhum | data
FerramentasTermoVistoria.tsx | observacao do item | texto | observação (formatada ao gravar)
FerramentasTermoResponsabilidade.tsx | dataTermo | nenhum | data
FerramentasTermoResponsabilidade.tsx | quantidade | nenhum | número
ItensModulo.tsx | busca | nenhum | busca
ItensModulo.tsx | codigo_sku | nenhum | readOnly, código
ItensModulo.tsx | modelo | texto | modelo (já formatado no salvamento)
ItensModulo.tsx | estoque_minimo | nenhum | número
ItensModulo.tsx | observacoes (Textarea) | texto | observações (salvamento formatado)
ItensModulo.tsx | qual_ferramenta | (não existe) | ignorado
MovimentacoesModulo.tsx | busca | nenhum | busca
MovimentacoesModulo.tsx | data_movimentacao | nenhum | data
MovimentacoesModulo.tsx | quantidade | nenhum | número
MovimentacoesModulo.tsx | origem_local | texto | local (salvamento formatado)
MovimentacoesModulo.tsx | destino_local | texto | local (salvamento formatado)
MovimentacoesModulo.tsx | observacao (Textarea) | texto | observação (salvamento formatado)
EstoqueModulo.tsx | minimo:{id} | nenhum | número
EstoqueModulo.tsx | estoque_minimo | nenhum | número
EstoqueModulo.tsx | estoque_atual | nenhum | número
EnderecamentoModulo.tsx | busca | nenhum | busca
EnderecamentoModulo.tsx | rua/prateleira/apartamento | nenhum | códigos de endereço (ex.: A1, 03)

## Grupo C

CadastroProduto.tsx | busca (Buscar por código ou descrição) | nenhum | campo de busca
CadastroProduto.tsx | codigo_sku | nenhum | readOnly, código gerado
CadastroProduto.tsx | nome (Textarea, descrição) | texto | descrição do produto
CadastroProduto.tsx | preco_unitario | nenhum | número
CadastroProduto.tsx | modelo | texto | modelo (também capitalizarTexto no salvamento)
CadastroEpi.tsx | busca | nenhum | busca
CadastroEpi.tsx | nome (Textarea) | texto | descrição do EPI (capitalizarTexto no salvamento)
CadastroEpi.tsx | minimo | nenhum | número
CadastroEpi.tsx | minimo_clone | nenhum | número
CadastroUniforme.tsx | busca | nenhum | busca
CadastroUniforme.tsx | nome (Textarea) | texto | descrição do uniforme (capitalizarTexto no salvamento)
CadastroUniforme.tsx | minimo | nenhum | número
CadastroUniforme.tsx | minimo_clone | nenhum | número
EpiComprasModulo.tsx | busca | nenhum | busca
EpiComprasModulo.tsx | nota_fiscal | nenhum | número da NF
EpiComprasModulo.tsx | data_compra | nenhum | data
EpiComprasModulo.tsx | quantidade | nenhum | número
EpiComprasModulo.tsx | valor_unitario | nenhum | número
EpiComprasModulo.tsx | valor total | nenhum | readOnly calculado
EpiComprasModulo.tsx | observacao (Textarea) | texto | observação (capitalizarTexto no salvamento; fornecedor digitado também)
UniformesComprasModulo.tsx | busca | nenhum | busca
UniformesComprasModulo.tsx | nota_fiscal | nenhum | número da NF
UniformesComprasModulo.tsx | data_compra | nenhum | data
UniformesComprasModulo.tsx | quantidade | nenhum | número
UniformesComprasModulo.tsx | valor_unitario | nenhum | número
UniformesComprasModulo.tsx | valor total | nenhum | readOnly calculado
UniformesComprasModulo.tsx | observacao (Textarea) | texto | observação (capitalizarTexto no salvamento; fornecedor digitado também)
EpiTermoEntrega.tsx | data entrega | nenhum | data
EpiTermoEntrega.tsx | quantidade do item | nenhum | número
EpiRelatorioBaixa.tsx | data inicial | nenhum | data/filtro
EpiRelatorioBaixa.tsx | data final | nenhum | data/filtro
UniformesTermoEntrega.tsx | data entrega | nenhum | data
UniformesTermoEntrega.tsx | quantidade do item | nenhum | número
UniformesTermoBaixa.tsx | quantidade do item | nenhum | número
UniformesTermoBaixa.tsx | Justificativa item (observacao) | texto | justificativa (capitalizarTexto ao montar observação gravada)
UniformesRelatorioBaixa.tsx | data inicial | nenhum | data/filtro
UniformesRelatorioBaixa.tsx | data final | nenhum | data/filtro
SeletorFornecedorCompra.tsx | fornecedor | texto | nome de fornecedor digitado
ImportarNfeXml.tsx | arquivo XML | nenhum | type=file

## Grupo D

routes/auth.tsx | email | nenhum | login, e-mail
routes/auth.tsx | senha | nenhum | senha
routes/auth.tsx | confirmacao | nenhum | senha
routes/_authenticated/relatorios.tsx | de | nenhum | data
routes/_authenticated/relatorios.tsx | ate | nenhum | data
routes/_authenticated/usuarios.tsx | email (new-email) | nenhum | e-mail
routes/_authenticated/usuarios.tsx | password (new-password) | nenhum | senha
routes/_authenticated/epi-ficha.tsx | busca | nenhum | busca/filtro
routes/_authenticated/epi-ficha.tsx | ficha-{campo.chave} (Textarea: setores, riscos, uso etc.) | texto | texto livre; salvar formata com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | codigo | nenhum | readOnly, gerado
routes/_authenticated/cadastros/fornecedores.tsx | razao_social | texto | nome de empresa; salvo com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | nome_fantasia | texto | nome de empresa; salvo com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | cnpj | nenhum | CNPJ
routes/_authenticated/cadastros/fornecedores.tsx | rua | texto | endereço; salvo com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | numero | nenhum | número
routes/_authenticated/cadastros/fornecedores.tsx | bairro | texto | endereço; salvo com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | cep | nenhum | CEP
routes/_authenticated/cadastros/fornecedores.tsx | cidade | texto | endereço; salvo com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | estado | nenhum | UF
routes/_authenticated/cadastros/fornecedores.tsx | pais | texto | endereço; salvo com capitalizarTexto
routes/_authenticated/cadastros/fornecedores.tsx | inscricao_estadual | nenhum | identificador
routes/_authenticated/cadastros/fornecedores.tsx | telefone | nenhum | telefone
routes/_authenticated/cadastros/fornecedores.tsx | contato | nome | pessoa de contato; salvo com capitalizarNomePessoa
routes/_authenticated/cadastros/fornecedores.tsx | observacoes (Textarea) | texto | observação; salvo com capitalizarTexto
routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx | busca | nenhum | busca/filtro
routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx | codigo_fornecedor | nenhum | código do fabricante
routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx | ca | nenhum | número CA
routes/_authenticated/cadastros/gerais/codigo-produto.tsx | sigla | nenhum | sigla
routes/_authenticated/cadastros/gerais/codigo-produto.tsx | inicial | nenhum | número
routes/_authenticated/empresas.tsx | nome_fantasia | texto | nome de empresa (lib valoresDaEmpresa já formata)
routes/_authenticated/empresas.tsx | razao_social | texto | nome de empresa (lib já formata)
routes/_authenticated/empresas.tsx | cnpj | nenhum | CNPJ
routes/_authenticated/empresas.tsx | rua | texto | endereço (lib já formata)
routes/_authenticated/empresas.tsx | numero | nenhum | número
routes/_authenticated/empresas.tsx | bairro | texto | endereço (lib já formata)
routes/_authenticated/empresas.tsx | cep | nenhum | CEP
routes/_authenticated/empresas.tsx | cidade | texto | endereço (lib já formata)
routes/_authenticated/empresas.tsx | estado | nenhum | UF
routes/_authenticated/empregados.tsx | nome | nome | nome de pessoa (lib já usa capitalizarNomePessoa)
routes/_authenticated/empregados.tsx | cpf | nenhum | CPF
routes/_authenticated/empregados.tsx | matricula | nenhum | código LxPx
routes/_authenticated/empregados.tsx | email | nenhum | e-mail
routes/_authenticated/empregados.tsx | data_admissao | nenhum | data
routes/_authenticated/empregados.tsx | data_demissao | nenhum | data
components/CampoBusca.tsx | combobox de busca | nenhum | busca
components/modules/OcorrenciasModulo.tsx | busca | nenhum | busca/filtro
components/modules/OcorrenciasModulo.tsx | data | nenhum | data
components/modules/OcorrenciasModulo.tsx | hora | nenhum | hora
components/modules/OcorrenciasModulo.tsx | tipoOcorrencia (módulo) | nenhum | readOnly
components/modules/OcorrenciasModulo.tsx | responsavel_registro | nome | pessoa; salvo com capitalizarNomePessoa
components/modules/OcorrenciasModulo.tsx | descricao_ocorrencia (Textarea) | texto | descrição; salvo com capitalizarTexto
components/modules/FerramentasCaixasModulo.tsx | buscaCaixa | nenhum | filtro
components/modules/EpiRelatorioFuncionario.tsx | buscar no histórico | nenhum | busca
components/modules/EpiRelatorioFuncionario.tsx | início, fim | nenhum | data
components/parametros/ParametrosEpi.tsx | novo motivo, nova área (CartaoDeMotivos) | texto | motivos de baixa e devolução e áreas da oficina
