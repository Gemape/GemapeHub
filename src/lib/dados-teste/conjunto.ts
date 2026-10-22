// Conjunto de dados de teste do modo demonstração: três registros por cadastro, todos os campos preenchidos, todos fictícios (empresas, pessoas,
// documentos, e-mails e telefones inventados). Só dados descritivos: quem grava e confere é aplicar.ts. Quem altera aqui sobe a VERSAO para os
// dados serem atualizados sozinhos no navegador.
import { gerarCnpj, gerarCpf } from "./documentos.ts";

export const VERSAO_DADOS_TESTE = 1;

// Prefixo dos ids escritos à mão: dá para reconhecer o que é de teste mesmo sem a lista de ids guardada.
export const PREFIXO = "teste-";

export type EmpresaTeste = {
  id: string; nome_fantasia: string; razao_social: string; cnpj: string; rua: string; numero: string; bairro: string; cep: string; cidade: string; estado: string;
};
export const EMPRESAS: readonly EmpresaTeste[] = [
  { id: `${PREFIXO}empresa-1`, nome_fantasia: "Alfa Máquinas", razao_social: "Alfa Máquinas e Peças Ltda", cnpj: gerarCnpj("112223330001"), rua: "Rua das Acácias", numero: "120", bairro: "Distrito Industrial", cep: "38400-100", cidade: "Uberlândia", estado: "MG" },
  { id: `${PREFIXO}empresa-2`, nome_fantasia: "Beta Locações", razao_social: "Beta Locações de Máquinas Ltda", cnpj: gerarCnpj("223334440001"), rua: "Avenida Brasil", numero: "2500", bairro: "Centro", cep: "30110-010", cidade: "Belo Horizonte", estado: "MG" },
  { id: `${PREFIXO}empresa-3`, nome_fantasia: "Gama Serviços", razao_social: "Gama Serviços Industriais Ltda", cnpj: gerarCnpj("334445550001"), rua: "Rua do Comércio", numero: "45", bairro: "Jardim Europa", cep: "13010-050", cidade: "Campinas", estado: "SP" },
];

export type EmpregadoTeste = { id: string; empresaId: string; nome: string; cpf: string; matricula: string; email: string; admissao: string };
export const EMPREGADOS: readonly EmpregadoTeste[] = [
  { id: `${PREFIXO}empregado-1`, empresaId: EMPRESAS[0]!.id, nome: "Ana Beatriz Correia", cpf: gerarCpf("123456789"), matricula: "L1P10", email: "ana.correia@exemplo.com.br", admissao: "2022-03-14" },
  { id: `${PREFIXO}empregado-2`, empresaId: EMPRESAS[1]!.id, nome: "Carlos Eduardo Menezes", cpf: gerarCpf("987654321"), matricula: "L1P11", email: "carlos.menezes@exemplo.com.br", admissao: "2021-08-02" },
  { id: `${PREFIXO}empregado-3`, empresaId: EMPRESAS[2]!.id, nome: "Fernanda Lima Duarte", cpf: gerarCpf("456789123"), matricula: "L2P3", email: "fernanda.duarte@exemplo.com.br", admissao: "2023-01-09" },
];

export const FORNECEDORES = [
  {
    id: `${PREFIXO}fornecedor-1`, razao_social: "Segura Mais Equipamentos de Proteção Ltda", nome_fantasia: "Segura Mais", cnpj: gerarCnpj("445566770001"),
    rua: "Rua Dr. Almeida Prado", numero: "310", bairro: "Vila Industrial", cep: "14020-260", cidade: "Ribeirão Preto", estado: "SP", pais: "Brasil",
    inscricao_estadual: "110.042.490.114", telefone: "(16) 3210-4455", contato: "Marcos Vinícius Prado", observacoes: "Entrega em até 5 dias úteis; aceita pedido mínimo de R$ 300,00.",
    categorias: ["cat-epi", "cat-uniformes"],
  },
  {
    id: `${PREFIXO}fornecedor-2`, razao_social: "Ferramentas Forte Comércio e Representações Ltda", nome_fantasia: "Forte Ferramentas", cnpj: gerarCnpj("556677880001"),
    rua: "Avenida dos Metalúrgicos", numero: "980", bairro: "Distrito Industrial", cep: "32210-110", cidade: "Contagem", estado: "MG", pais: "Brasil",
    inscricao_estadual: "062.307.812.0045", telefone: "(31) 3355-7788", contato: "Patrícia Souza Andrade", observacoes: "Ferramentas manuais e elétricas; garantia de 12 meses.",
    categorias: ["cat-ferramentas", "cat-veiculos"],
  },
  {
    id: `${PREFIXO}fornecedor-3`, razao_social: "Vestir Bem Uniformes Industriais Ltda", nome_fantasia: "Vestir Bem", cnpj: gerarCnpj("667788990001"),
    rua: "Rua Padre Anchieta", numero: "75", bairro: "Centro", cep: "86010-090", cidade: "Londrina", estado: "PR", pais: "Brasil",
    inscricao_estadual: "905.118.762-30", telefone: "(43) 3322-9001", contato: "Roberto Alves Nogueira", observacoes: "Confecção sob medida; bordado do logotipo incluso.",
    categorias: ["cat-uniformes", "cat-epi"],
  },
] as const;

export const CLIENTES = [
  {
    id: `${PREFIXO}cliente-1`, nome: "Agropecuária Vale Verde Ltda", cpf: gerarCpf("246810121"), cnpj: gerarCnpj("778899000001"),
    endereco: "Fazenda Vale Verde, km 12 da Rodovia MG-050, Zona Rural, Passos/MG", contato: "Júlio César Antunes", telefone: "(35) 3521-1020", telefone2: "(35) 99912-3040",
    email: "compras@valeverde.exemplo.com.br", observacao: "Atendido pela equipe de campo; visitas às terças e quintas.",
  },
  {
    id: `${PREFIXO}cliente-2`, nome: "Usina Rio Claro Açúcar e Álcool S.A.", cpf: gerarCpf("135792468"), cnpj: gerarCnpj("889900110001"),
    endereco: "Estrada Municipal, 800, Distrito Rural, Rio Claro/SP", contato: "Helena Martins Prado", telefone: "(19) 3524-6677", telefone2: "(19) 99888-7766",
    email: "manutencao@rioclaro.exemplo.com.br", observacao: "Contrato de manutenção preventiva trimestral.",
  },
  {
    id: `${PREFIXO}cliente-3`, nome: "Cerâmica Pedra Bonita Ltda", cpf: gerarCpf("369258147"), cnpj: gerarCnpj("990011220001"),
    endereco: "Rua das Olarias, 15, Distrito Industrial, Itu/SP", contato: "Sérgio Luiz Carvalho", telefone: "(11) 4023-3344", telefone2: "(11) 98765-4321",
    email: "sergio@pedrabonita.exemplo.com.br", observacao: "Peças de reposição para forno e esteiras; pagamento em 30 dias.",
  },
] as const;

// Veículos: um por empresa, cada um com um empregado responsável.
export const VEICULOS = [
  { id: `${PREFIXO}veiculo-1`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[0]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST1A23", marca: "Fiat", modelo: "Strada Endurance", ano: 2022, cor: "Branca", combustivel: "Flex", renavam: "00123456789", km: 38500, aquisicao: "2022-02-18", custo: 98500, nota: "NF-004512", observacoes: "Veículo da equipe de campo da Alfa Máquinas." },
  { id: `${PREFIXO}veiculo-2`, empresaId: EMPRESAS[1]!.id, responsavelId: EMPREGADOS[1]!.id, tipo: "Caminhão", subId: "sub-veiculos-caminhao", placa: "TST2B34", marca: "Volkswagen", modelo: "Delivery 11.180", ano: 2020, cor: "Branco", combustivel: "Diesel", renavam: "00234567890", km: 112300, aquisicao: "2020-06-05", custo: 285000, nota: "NF-001873", observacoes: "Transporte de máquinas até o cliente." },
  { id: `${PREFIXO}veiculo-3`, empresaId: EMPRESAS[2]!.id, responsavelId: EMPREGADOS[2]!.id, tipo: "Carro", subId: "sub-veiculos-carro", placa: "TST3C45", marca: "Chevrolet", modelo: "Onix LT", ano: 2023, cor: "Prata", combustivel: "Flex", renavam: "00345678901", km: 15200, aquisicao: "2023-03-22", custo: 84900, nota: "NF-007790", observacoes: "Uso administrativo e visitas comerciais." },
] as const;

// Itens do catálogo de EPI e de uniforme: um registro por tamanho (decisão 35). O código e o id saem em ordem.
export type ItemCatalogoTeste = { nome: string; sub: string; subNome: string; unidade: "uni-par" | "uni-unidade"; unidadeNome: string; tamanhos: readonly (string | null)[]; minimos: readonly number[]; fornecedor: 0 | 1 | 2; ca?: string };
export const EPIS: readonly ItemCatalogoTeste[] = [
  { nome: "Botina de Segurança com Biqueira de Aço", sub: "sub-epi-botina", subNome: "Botina", unidade: "uni-par", unidadeNome: "Par", tamanhos: ["tam-38", "tam-40", "tam-42"], minimos: [4, 10, 6], fornecedor: 0, ca: "42158" },
  { nome: "Luva Nitrílica Antiderrapante", sub: "sub-epi-luva", subNome: "Luva", unidade: "uni-par", unidadeNome: "Par", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [6, 12, 8], fornecedor: 2, ca: "35671" },
  { nome: "Capacete de Segurança Classe B", sub: "sub-epi-capacete", subNome: "Capacete", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [5], fornecedor: 0, ca: "31469" },
];
export const UNIFORMES: readonly ItemCatalogoTeste[] = [
  { nome: "Camisa Operacional Manga Longa", sub: "sub-uniformes-camisa", subNome: "Camisa", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [8, 12, 10], fornecedor: 2 },
  { nome: "Calça Operacional com Faixa Refletiva", sub: "sub-uniformes-calca", subNome: "Calça", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-40", "tam-42", "tam-44"], minimos: [6, 10, 6], fornecedor: 2 },
  { nome: "Jaqueta Térmica Impermeável", sub: "sub-uniformes-jaqueta", subNome: "Jaqueta", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-m", "tam-g"], minimos: [4, 4], fornecedor: 0 },
];
// Tamanhos que cada subcategoria passa a aceitar em Gerais (somam-se aos que já estavam autorizados).
export const TAMANHOS_AUTORIZADOS: Record<string, readonly string[]> = {
  "sub-uniformes-camisa": ["tam-p", "tam-m", "tam-g"],
  "sub-uniformes-calca": ["tam-40", "tam-42", "tam-44"],
  "sub-uniformes-jaqueta": ["tam-m", "tam-g"],
  "sub-epi-botina": ["tam-38", "tam-40", "tam-42"],
  "sub-epi-luva": ["tam-p", "tam-m", "tam-g"],
};

export const MARCAS_FERRAMENTA = ["Ferrotec", "Maxforça", "Duramax"] as const;
export const MARCAS_UNIFORME = ["Vestir Bem", "Trabalho Forte", "Norte Uniformes"] as const;

// Ferramentas: uma por empresa. `grupo` e `categoria` são das listas de Gerais; `qual` só vale para grupos que pedem "qual é".
export const FERRAMENTAS = [
  { empresaIndice: 0, categoria: "Manual", grupo: "Alicates", qual: "", marca: "Ferrotec", modelo: "Universal Isolado 1000V", tamanho: "8 pol", minimo: 3, entrada: 8, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Medição", grupo: "Chave Allen", qual: "", marca: "Maxforça", modelo: "Jogo Hexagonal Cromo-Vanádio", tamanho: "10 mm", minimo: 2, entrada: 5, fornecedor: 1 },
  { empresaIndice: 2, categoria: "Elétrica", grupo: "Diversos", qual: "Furadeira de Impacto", marca: "Duramax", modelo: "DX-650 650W", tamanho: "", minimo: 2, entrada: 4, fornecedor: 1 },
] as const;

export const TIPOS_OCORRENCIA_VEICULO = [
  { nome: "Colisão leve", descricao: "Batida sem vítimas, com danos à lataria ou ao para-choque." },
  { nome: "Pane mecânica na estrada", descricao: "Veículo parou em viagem e precisou de guincho ou socorro mecânico." },
  { nome: "Multa de trânsito", descricao: "Infração registrada em nome da empresa, para identificar o condutor." },
] as const;

export const ACOES_MANUTENCAO_VEICULO = [
  { nome: "Troca de óleo e filtros", subitens: ["Óleo do motor", "Filtro de óleo", "Filtro de ar", "Filtro de combustível"] },
  { nome: "Freios e suspensão", subitens: ["Pastilhas de freio", "Discos de freio", "Amortecedores", "Fluido de freio"] },
  { nome: "Pneus e alinhamento", subitens: ["Rodízio de pneus", "Alinhamento", "Balanceamento", "Calibragem"] },
] as const;

export const EQUIPAMENTOS = [
  {
    empresaIndice: 0, patrimonio: "PAT-0001", nome: "Empilhadeira Elétrica 2,5 t", tipoId: "tipo-empilhadeiras", marca: "Hyster", modelo: "E50XN", numeroSerie: "HY-2210-0457", dataAquisicao: "2021-05-17",
    valorCompra: "185.000,00", status: "Ativo", setor: "Almoxarifado Central",
    tecnico: { propulsao: "Elétrico", capacidadeCarga: "2,5", capacidadeCargaUnidade: "t", horimetroInicial: "120", consumoEstimado: "6", capacidadeTanque: "0" },
  },
  {
    empresaIndice: 1, patrimonio: "PAT-0002", nome: "Compressor de Ar 20 Pés Industrial", tipoId: "tipo-compressor-de-ar", marca: "Schulz", modelo: "CSL 20/200", numeroSerie: "SC-1903-8821", dataAquisicao: "2020-09-03",
    valorCompra: "12.400,00", status: "Ativo", setor: "Oficina Mecânica",
    tecnico: { tensao: "220V Trifásico", potencia: "5", potenciaUnidade: "CV", correnteNominal: "14", pressaoTrabalho: "175", pressaoTrabalhoUnidade: "PSI", vazaoAgua: "0" },
  },
  {
    empresaIndice: 2, patrimonio: "PAT-0003", nome: "Extintor de Incêndio Pó ABC 6 kg", tipoId: "tipo-extintores", marca: "Kidde", modelo: "ABC-6", numeroSerie: "KD-7745-2210", dataAquisicao: "2023-02-10",
    valorCompra: "290,00", status: "Ativo", setor: "Galpão de Estoque",
    tecnico: { agente: "Pó PQS ABC", capacidade: "6", capacidadeUnidade: "kg", ultimaRecarga: "2025-08-12", vencimentoTesteHidrostatico: "2028-08-12" },
  },
] as const;
