// Conjunto de dados de teste do modo demonstração: cinco registros por cadastro (cinco empregados por empresa), todos os campos preenchidos. As empresas são as do grupo (nome e CNPJ da
// planilha de controle); endereços, pessoas, documentos, e-mails e telefones são inventados. Só dados descritivos: quem grava e confere é aplicar.ts. Quem altera aqui sobe a VERSAO para os
// dados serem atualizados sozinhos no navegador.
import { gerarCnpj, gerarCpf } from "./documentos.ts";

export const VERSAO_DADOS_TESTE = 21;

// Prefixo dos ids escritos à mão: dá para reconhecer o que é de teste mesmo sem a lista de ids guardada.
export const PREFIXO = "teste-";

export type EmpresaTeste = {
  id: string; nome_fantasia: string; razao_social: string; cnpj: string; rua: string; numero: string; bairro: string; cep: string; cidade: string; estado: string;
};
export const EMPRESAS: readonly EmpresaTeste[] = [
  { id: `${PREFIXO}empresa-1`, nome_fantasia: "Gemape Máquinas", razao_social: "Gemape Máquinas e Peças Ltda", cnpj: "21.866.173/0001-67", rua: "Rua das Acácias", numero: "120", bairro: "Distrito Industrial", cep: "38400-100", cidade: "Uberlândia", estado: "MG" },
  { id: `${PREFIXO}empresa-2`, nome_fantasia: "GMP Locações", razao_social: "GMP Locações de Máquinas e Serviços Ltda", cnpj: "08.184.170/0001-85", rua: "Avenida Brasil", numero: "2500", bairro: "Centro", cep: "30110-010", cidade: "Belo Horizonte", estado: "MG" },
  { id: `${PREFIXO}empresa-3`, nome_fantasia: "Lapa Máquinas", razao_social: "Lapa Máquinas e Peças Ltda", cnpj: "44.578.791/0001-07", rua: "Rua do Comércio", numero: "45", bairro: "Jardim Europa", cep: "13010-050", cidade: "Campinas", estado: "SP" },
];

export type EmpregadoTeste = { id: string; empresaId: string; nome: string; cpf: string; matricula: string; email: string; admissao: string };
// Cinco por empresa: o empregado n é da empresa n % 3, então os três primeiros são o primeiro de cada empresa (os responsáveis das entregas).
const NOMES_EMPREGADOS = [
  "Ana Beatriz Correia", "Carlos Eduardo Menezes", "Fernanda Lima Duarte", "Juliana Martins Ribeiro", "Marcelo Henrique Alves", "Patrícia Souza Nogueira",
  "Thiago Ferreira Lopes", "Camila Rocha Barbosa", "Diego Santana Pires", "Larissa Gomes Cardoso", "Bruno Cavalcante Dias", "Renata Oliveira Campos",
  "Gustavo Pereira Mota", "Aline Cristina Farias", "Leandro Batista Freitas",
] as const;
const MATRICULAS_FIXAS = ["L1P10", "L1P11", "L2P3"] as const;
const BASES_CPF_FIXAS = ["123456789", "987654321", "456789123"] as const;
const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const doisDigitos = (n: number) => String(n).padStart(2, "0");
export const EMPREGADOS: readonly EmpregadoTeste[] = NOMES_EMPREGADOS.map((nome, n) => {
  const [primeiro, ...resto] = semAcento(nome).split(" ");
  return {
    id: `${PREFIXO}empregado-${n + 1}`, empresaId: EMPRESAS[n % 3]!.id, nome, cpf: gerarCpf(BASES_CPF_FIXAS[n] ?? String(111222333 + n * 4135711)),
    matricula: MATRICULAS_FIXAS[n] ?? `L${3 + (n % 4)}P${20 + n}`, email: `${primeiro}.${resto[resto.length - 1]}@exemplo.com.br`,
    admissao: `${2020 + (n % 4)}-${doisDigitos(1 + (n % 12))}-${doisDigitos(5 + (n % 20))}`,
  };
});

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
  {
    id: `${PREFIXO}fornecedor-4`, razao_social: "Proteção Total Comércio de EPIs Ltda", nome_fantasia: "Proteção Total", cnpj: gerarCnpj("778899110001"),
    rua: "Avenida T-63", numero: "1450", bairro: "Setor Bueno", cep: "74230-100", cidade: "Goiânia", estado: "GO", pais: "Brasil",
    inscricao_estadual: "10.402.177-5", telefone: "(62) 3241-7700", contato: "Daniela Freitas Moura", observacoes: "Especialista em EPIs com CA vigente; emite certificado de entrega.",
    categorias: ["cat-epi"],
  },
  {
    id: `${PREFIXO}fornecedor-5`, razao_social: "Aliança Ferramentas e Fixações Ltda", nome_fantasia: "Aliança Ferramentas", cnpj: gerarCnpj("889900220001"),
    rua: "Rua XV de Novembro", numero: "620", bairro: "Centro", cep: "89201-001", cidade: "Joinville", estado: "SC", pais: "Brasil",
    inscricao_estadual: "255.118.342", telefone: "(47) 3433-2100", contato: "Henrique Bastos Lima", observacoes: "Ferramentas manuais de alta durabilidade; frete grátis acima de R$ 800,00.",
    categorias: ["cat-ferramentas", "cat-veiculos"],
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
  {
    id: `${PREFIXO}cliente-4`, nome: "Mineração Serra Dourada S.A.", cpf: gerarCpf("482916357"), cnpj: gerarCnpj("101122330001"),
    endereco: "Estrada da Mina, km 4, Zona Rural, Ouro Preto/MG", contato: "Valéria Campos Reis", telefone: "(31) 3551-8800", telefone2: "(31) 99722-4411",
    email: "suprimentos@serradourada.exemplo.com.br", observacao: "Manutenção de britadores e correias transportadoras.",
  },
  {
    id: `${PREFIXO}cliente-5`, nome: "Transportadora Estrela do Sul Ltda", cpf: gerarCpf("753159486"), cnpj: gerarCnpj("112233440001"),
    endereco: "Avenida Anselmo Alves dos Santos, 3200, Distrito Industrial, Uberlândia/MG", contato: "Márcio Antunes Vieira", telefone: "(34) 3236-9090", telefone2: "(34) 99655-1020",
    email: "frota@estreladosul.exemplo.com.br", observacao: "Revisão de empilhadeiras e compressores do pátio de cargas.",
  },
] as const;

// Veículos: um por empresa, cada um com um empregado responsável.
export const VEICULOS = [
  { id: `${PREFIXO}veiculo-1`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[0]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST1A23", marca: "Fiat", modelo: "Strada Endurance", ano: 2022, cor: "Branca", combustivel: "Flex", renavam: "00123456789", km: 38500, aquisicao: "2022-02-18", custo: 98500, nota: "NF-004512", observacoes: "Veículo da equipe de campo da Gemape Máquinas." },
  { id: `${PREFIXO}veiculo-2`, empresaId: EMPRESAS[1]!.id, responsavelId: EMPREGADOS[1]!.id, tipo: "Caminhão", subId: "sub-veiculos-caminhao", placa: "TST2B34", marca: "Volkswagen", modelo: "Delivery 11.180", ano: 2020, cor: "Branco", combustivel: "Diesel", renavam: "00234567890", km: 112300, aquisicao: "2020-06-05", custo: 285000, nota: "NF-001873", observacoes: "Transporte de máquinas até o cliente." },
  { id: `${PREFIXO}veiculo-3`, empresaId: EMPRESAS[2]!.id, responsavelId: EMPREGADOS[2]!.id, tipo: "Carro", subId: "sub-veiculos-carro", placa: "TST3C45", marca: "Chevrolet", modelo: "Onix LT", ano: 2023, cor: "Prata", combustivel: "Flex", renavam: "00345678901", km: 15200, aquisicao: "2023-03-22", custo: 84900, nota: "NF-007790", observacoes: "Uso administrativo e visitas comerciais." },
  { id: `${PREFIXO}veiculo-4`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[3]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST4D56", marca: "Toyota", modelo: "Hilux CD 4x4", ano: 2021, cor: "Preta", combustivel: "Diesel", renavam: "00456789012", km: 61800, aquisicao: "2021-09-10", custo: 245000, nota: "NF-003340", observacoes: "Atendimento a clientes em área rural." },
  { id: `${PREFIXO}veiculo-5`, empresaId: EMPRESAS[1]!.id, responsavelId: EMPREGADOS[4]!.id, tipo: "Caminhão", subId: "sub-veiculos-caminhao", placa: "TST5E67", marca: "Mercedes-Benz", modelo: "Accelo 815", ano: 2022, cor: "Branco", combustivel: "Diesel", renavam: "00567890123", km: 47200, aquisicao: "2022-04-28", custo: 318000, nota: "NF-005128", observacoes: "Entrega de peças e equipamentos pesados." },
] as const;

// Itens do catálogo de EPI e de uniforme: um registro por tamanho (decisão 35). O código e o id saem em ordem.
export type ItemCatalogoTeste = { nome: string; sub: string; subNome: string; unidade: "uni-par" | "uni-unidade"; unidadeNome: string; tamanhos: readonly (string | null)[]; minimos: readonly number[]; fornecedor: 0 | 1 | 2 | 3 | 4; ca?: string };
export const EPIS: readonly ItemCatalogoTeste[] = [
  { nome: "Botina de Segurança com Biqueira de Aço", sub: "sub-epi-botina", subNome: "Botina", unidade: "uni-par", unidadeNome: "Par", tamanhos: ["tam-38", "tam-40", "tam-42"], minimos: [4, 10, 6], fornecedor: 0, ca: "42158" },
  { nome: "Luva Nitrílica Antiderrapante", sub: "sub-epi-luva", subNome: "Luva", unidade: "uni-par", unidadeNome: "Par", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [6, 12, 8], fornecedor: 2, ca: "35671" },
  { nome: "Capacete de Segurança Classe B", sub: "sub-epi-capacete", subNome: "Capacete", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [5], fornecedor: 0, ca: "31469" },
  { nome: "Óculos de Proteção Incolor Antiembaçante", sub: "sub-epi-oculos", subNome: "Óculos", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [8], fornecedor: 3, ca: "28911" },
  { nome: "Protetor Auricular Tipo Concha", sub: "sub-epi-protetor-auricular", subNome: "Protetor Auricular", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [6], fornecedor: 3, ca: "5745" },
];
export const UNIFORMES: readonly ItemCatalogoTeste[] = [
  { nome: "Camisa Operacional Manga Longa", sub: "sub-uniformes-camisa", subNome: "Camisa", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [8, 12, 10], fornecedor: 2 },
  { nome: "Calça Operacional com Faixa Refletiva", sub: "sub-uniformes-calca", subNome: "Calça", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-40", "tam-42", "tam-44"], minimos: [6, 10, 6], fornecedor: 2 },
  { nome: "Jaqueta Térmica Impermeável", sub: "sub-uniformes-jaqueta", subNome: "Jaqueta", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-m", "tam-g"], minimos: [4, 4], fornecedor: 0 },
  { nome: "Camisa Polo Institucional Bordada", sub: "sub-uniformes-camisa", subNome: "Camisa", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [5, 8, 6], fornecedor: 2 },
  { nome: "Calça Jeans Operacional Reforçada", sub: "sub-uniformes-calca", subNome: "Calça", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-40", "tam-42", "tam-44"], minimos: [4, 6, 4], fornecedor: 0 },
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
  { empresaIndice: 1, categoria: "Manual", grupo: "Chave Allen", qual: "", marca: "Maxforça", modelo: "Jogo Hexagonal Cromo-Vanádio", tamanho: "10", minimo: 2, entrada: 5, fornecedor: 1 },
  { empresaIndice: 2, categoria: "Elétrica", grupo: "Diversos", qual: "Furadeira de Impacto", marca: "Duramax", modelo: "DX-650 650W", tamanho: "", minimo: 2, entrada: 4, fornecedor: 1 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Chave L", qual: "", marca: "Duramax", modelo: "Cromada Reforçada", tamanho: "13", minimo: 4, entrada: 10, fornecedor: 4 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Chave boca", qual: "", marca: "Ferrotec", modelo: "Aço Cromo-Vanádio", tamanho: "12-13", minimo: 3, entrada: 6, fornecedor: 4 },
] as const;

// Tamanhos de alguns grupos de ferramenta, como na planilha de controle de ferramentas (entram em Gerais junto com os dados de teste).
export const TAMANHOS_GRUPO_FERRAMENTA: Record<string, readonly string[]> = {
  "Chave L": ["8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "3/8"],
  "Chave Allen": ["1,5", "2", "2,5", "3", "4", "5", "6", "8", "10"],
  "Chave boca": ["10-11", "12-13", "14-15"],
  Alicates: ["Corte", "Universal", "Terminal elétrico", "Pressão", "Bico", "Amperímetro", "Desencapador"],
};

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

// Periodicidade e datas (dias atrás) dos cinco check lists periódicos de cada veículo e de cada equipamento (a ordem é a dos cadastros de teste). A associação
// vale desde `desde` dias atrás, para o painel do mês ter as previsões do período: nele há semanas, quinzenas e meses feitos no prazo, outros sem check
// list (não realizados) e um mês em aberto (a vencer).
export const PLANOS_CHECKLIST_TESTE: readonly { periodicidade: "Semanal" | "Quinzenal" | "Mensal"; dias: readonly number[]; desde: number }[] = [
  { periodicidade: "Semanal", dias: [7, 14, 28, 35, 49], desde: 56 },
  { periodicidade: "Quinzenal", dias: [18, 33, 48, 64, 79], desde: 90 },
  { periodicidade: "Mensal", dias: [46, 77, 108, 138, 170], desde: 175 },
  { periodicidade: "Semanal", dias: [7, 21, 28, 42, 49], desde: 56 },
  { periodicidade: "Semanal", dias: [14, 21, 35, 42, 49], desde: 56 },
];

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
  {
    empresaIndice: 0, patrimonio: "PAT-0004", nome: "Empilhadeira a Gás 2,5 t", tipoId: "tipo-empilhadeiras", marca: "Yale", modelo: "GLP25", numeroSerie: "YL-2304-1182", dataAquisicao: "2022-11-08",
    valorCompra: "168.000,00", status: "Ativo", setor: "Expedição",
    tecnico: { propulsao: "GLP/Gás", capacidadeCarga: "2,5", capacidadeCargaUnidade: "t", horimetroInicial: "85", consumoEstimado: "3", capacidadeTanque: "13" },
  },
  {
    empresaIndice: 1, patrimonio: "PAT-0005", nome: "Extintor de Incêndio Pó ABC 12 kg", tipoId: "tipo-extintores", marca: "Kidde", modelo: "ABC-12", numeroSerie: "KD-8120-3345", dataAquisicao: "2024-01-22",
    valorCompra: "520,00", status: "Ativo", setor: "Oficina Mecânica",
    tecnico: { agente: "Pó PQS ABC", capacidade: "12", capacidadeUnidade: "kg", ultimaRecarga: "2025-10-02", vencimentoTesteHidrostatico: "2029-01-22" },
  },
] as const;
