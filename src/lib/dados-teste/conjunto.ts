// Conjunto de dados de teste do modo demonstração: cinco registros por cadastro (cinco empregados por empresa), todos os campos preenchidos. As empresas são as do grupo (nome e CNPJ da
// planilha de controle); endereços, pessoas, documentos, e-mails e telefones são inventados. Só dados descritivos: quem grava e confere é aplicar.ts. Quem altera aqui sobe a VERSAO para os
// dados serem atualizados sozinhos no navegador.
import { gerarCnpj, gerarCpf } from "./documentos.ts";

export const VERSAO_DADOS_TESTE = 47;

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

// Veículos: dez, distribuídos pelas empresas, cada um com um empregado responsável.
export const VEICULOS = [
  { id: `${PREFIXO}veiculo-1`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[0]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST1A23", marca: "Fiat", modelo: "Strada Endurance", ano: 2022, cor: "Branca", combustivel: "Flex", renavam: "00123456789", km: 38500, aquisicao: "2022-02-18", custo: 98500, nota: "NF-004512", observacoes: "Veículo da equipe de campo da Gemape Máquinas." },
  { id: `${PREFIXO}veiculo-2`, empresaId: EMPRESAS[1]!.id, responsavelId: EMPREGADOS[1]!.id, tipo: "Caminhão", subId: "sub-veiculos-caminhao", placa: "TST2B34", marca: "Volkswagen", modelo: "Delivery 11.180", ano: 2020, cor: "Branco", combustivel: "Diesel", renavam: "00234567890", km: 112300, aquisicao: "2020-06-05", custo: 285000, nota: "NF-001873", observacoes: "Transporte de máquinas até o cliente." },
  { id: `${PREFIXO}veiculo-3`, empresaId: EMPRESAS[2]!.id, responsavelId: EMPREGADOS[2]!.id, tipo: "Carro", subId: "sub-veiculos-carro", placa: "TST3C45", marca: "Chevrolet", modelo: "Onix LT", ano: 2023, cor: "Prata", combustivel: "Flex", renavam: "00345678901", km: 15200, aquisicao: "2023-03-22", custo: 84900, nota: "NF-007790", observacoes: "Uso administrativo e visitas comerciais." },
  { id: `${PREFIXO}veiculo-4`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[3]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST4D56", marca: "Toyota", modelo: "Hilux CD 4x4", ano: 2021, cor: "Preta", combustivel: "Diesel", renavam: "00456789012", km: 61800, aquisicao: "2021-09-10", custo: 245000, nota: "NF-003340", observacoes: "Atendimento a clientes em área rural." },
  { id: `${PREFIXO}veiculo-5`, empresaId: EMPRESAS[1]!.id, responsavelId: EMPREGADOS[4]!.id, tipo: "Caminhão", subId: "sub-veiculos-caminhao", placa: "TST5E67", marca: "Mercedes-Benz", modelo: "Accelo 815", ano: 2022, cor: "Branco", combustivel: "Diesel", renavam: "00567890123", km: 47200, aquisicao: "2022-04-28", custo: 318000, nota: "NF-005128", observacoes: "Entrega de peças e equipamentos pesados." },
  { id: `${PREFIXO}veiculo-6`, empresaId: EMPRESAS[2]!.id, responsavelId: EMPREGADOS[5]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST6F78", marca: "Volkswagen", modelo: "Saveiro Robust", ano: 2023, cor: "Cinza", combustivel: "Flex", renavam: "00678901234", km: 22100, aquisicao: "2023-05-12", custo: 91500, nota: "NF-008214", observacoes: "Apoio técnico da Lapa Máquinas." },
  { id: `${PREFIXO}veiculo-7`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[6]!.id, tipo: "Carro", subId: "sub-veiculos-carro", placa: "TST7G89", marca: "Toyota", modelo: "Corolla XEi", ano: 2022, cor: "Preto", combustivel: "Flex", renavam: "00789012345", km: 41800, aquisicao: "2022-11-03", custo: 152000, nota: "NF-006021", observacoes: "Diretoria e visitas a clientes." },
  { id: `${PREFIXO}veiculo-8`, empresaId: EMPRESAS[1]!.id, responsavelId: EMPREGADOS[7]!.id, tipo: "Utilitário", subId: "sub-veiculos-utilitario", placa: "TST8H90", marca: "Ford", modelo: "Ranger XLS", ano: 2021, cor: "Prata", combustivel: "Diesel", renavam: "00890123456", km: 73400, aquisicao: "2021-07-19", custo: 231000, nota: "NF-004477", observacoes: "Atendimento externo de locações." },
  { id: `${PREFIXO}veiculo-9`, empresaId: EMPRESAS[2]!.id, responsavelId: EMPREGADOS[8]!.id, tipo: "Caminhão", subId: "sub-veiculos-caminhao", placa: "TST9I01", marca: "Iveco", modelo: "Daily 35S14", ano: 2020, cor: "Branco", combustivel: "Diesel", renavam: "00901234567", km: 126900, aquisicao: "2020-10-08", custo: 247000, nota: "NF-002951", observacoes: "Entrega de peças na região de Campinas." },
  { id: `${PREFIXO}veiculo-10`, empresaId: EMPRESAS[0]!.id, responsavelId: EMPREGADOS[9]!.id, tipo: "Carro", subId: "sub-veiculos-carro", placa: "TST0A12", marca: "Renault", modelo: "Kwid Zen", ano: 2023, cor: "Vermelho", combustivel: "Flex", renavam: "00012345678", km: 9800, aquisicao: "2023-08-25", custo: 69900, nota: "NF-009310", observacoes: "Uso administrativo e malote." },
] as const;

// Itens do catálogo de EPI e de uniforme: um registro por tamanho (decisão 35). O código e o id saem em ordem.
export type ItemCatalogoTeste = { nome: string; sub: string; subNome: string; unidade: "uni-par" | "uni-unidade"; unidadeNome: string; tamanhos: readonly (string | null)[]; minimos: readonly number[]; fornecedor: 0 | 1 | 2 | 3 | 4; ca?: string; marca?: (typeof MARCAS_UNIFORME)[number] };
export const EPIS: readonly ItemCatalogoTeste[] = [
  { nome: "Botina de Segurança com Biqueira de Aço", sub: "sub-epi-botina", subNome: "Botina", unidade: "uni-par", unidadeNome: "Par", tamanhos: ["tam-38", "tam-40", "tam-42"], minimos: [4, 10, 6], fornecedor: 0, ca: "42158" },
  { nome: "Luva Nitrílica Antiderrapante", sub: "sub-epi-luva", subNome: "Luva", unidade: "uni-par", unidadeNome: "Par", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [6, 12, 8], fornecedor: 2, ca: "35671" },
  { nome: "Capacete de Segurança Classe B", sub: "sub-epi-capacete", subNome: "Capacete", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [5], fornecedor: 0, ca: "31469" },
  { nome: "Óculos de Proteção Incolor Antiembaçante", sub: "sub-epi-oculos", subNome: "Óculos", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [8], fornecedor: 3, ca: "28911" },
  { nome: "Protetor Auricular Tipo Concha", sub: "sub-epi-protetor-auricular", subNome: "Protetor Auricular", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [6], fornecedor: 3, ca: "5745" },
  { nome: "Colete Refletivo de Alta Visibilidade", sub: "sub-epi-colete", subNome: "Colete", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-m", "tam-g"], minimos: [6, 6], fornecedor: 3, ca: "40233" },
  { nome: "Máscara Respiratória PFF2", sub: "sub-epi-mascara", subNome: "Máscara", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: [null], minimos: [20], fornecedor: 0, ca: "38744" },
  { nome: "Cinto de Segurança Tipo Paraquedista", sub: "sub-epi-cinto-de-seguranca", subNome: "Cinto de Segurança", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-m", "tam-g"], minimos: [3, 3], fornecedor: 2, ca: "29810" },
];
export const UNIFORMES: readonly ItemCatalogoTeste[] = [
  { nome: "Camisa Operacional Manga Longa", sub: "sub-uniformes-camisa", subNome: "Camisa", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [8, 12, 10], fornecedor: 2, marca: "Vestir Bem" },
  { nome: "Calça Operacional com Faixa Refletiva", sub: "sub-uniformes-calca", subNome: "Calça", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-40", "tam-42", "tam-44"], minimos: [6, 10, 6], fornecedor: 2, marca: "Trabalho Forte" },
  { nome: "Jaqueta Térmica Impermeável", sub: "sub-uniformes-jaqueta", subNome: "Jaqueta", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-m", "tam-g"], minimos: [4, 4], fornecedor: 0, marca: "Vestir Bem" },
  { nome: "Camisa Polo Institucional Bordada", sub: "sub-uniformes-camisa", subNome: "Camisa", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [5, 8, 6], fornecedor: 2, marca: "Norte Uniformes" },
  { nome: "Calça Jeans Operacional Reforçada", sub: "sub-uniformes-calca", subNome: "Calça", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-40", "tam-42", "tam-44"], minimos: [4, 6, 4], fornecedor: 0, marca: "Trabalho Forte" },
  { nome: "Camisa Térmica Proteção UV", sub: "sub-uniformes-camisa", subNome: "Camisa", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-p", "tam-m", "tam-g"], minimos: [4, 6, 4], fornecedor: 2, marca: "Norte Uniformes" },
  { nome: "Bermuda Operacional Ripstop", sub: "sub-uniformes-calca", subNome: "Calça", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-40", "tam-42", "tam-44"], minimos: [3, 5, 3], fornecedor: 0, marca: "Trabalho Forte" },
  { nome: "Jaqueta Corta-Vento Refletiva", sub: "sub-uniformes-jaqueta", subNome: "Jaqueta", unidade: "uni-unidade", unidadeNome: "Unidade", tamanhos: ["tam-m", "tam-g"], minimos: [3, 3], fornecedor: 2, marca: "Norte Uniformes" },
];
// Tamanhos que cada subcategoria passa a aceitar em Gerais (somam-se aos que já estavam autorizados).
export const TAMANHOS_AUTORIZADOS: Record<string, readonly string[]> = {
  "sub-uniformes-camisa": ["tam-p", "tam-m", "tam-g"],
  "sub-uniformes-calca": ["tam-40", "tam-42", "tam-44"],
  "sub-uniformes-jaqueta": ["tam-m", "tam-g"],
  "sub-epi-botina": ["tam-38", "tam-40", "tam-42"],
  "sub-epi-luva": ["tam-p", "tam-m", "tam-g"],
  "sub-epi-colete": ["tam-m", "tam-g"],
  "sub-epi-cinto-de-seguranca": ["tam-m", "tam-g"],
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
  // As outras quinze completam as vinte: a ferramenta de ordem n vai para a caixa n mod 5 (a quinta caixa leva a primeira, a sexta, a segunda...), então tem a
  // mesma empresa dessa caixa. Cada ferramenta fica em uma caixa só.
  { empresaIndice: 0, categoria: "Manual", grupo: "Combinada", qual: "", marca: "Ferrotec", modelo: "Aço Cromo-Vanádio", tamanho: "10", minimo: 3, entrada: 6, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Meia lua", qual: "", marca: "Maxforça", modelo: "Forjada Cromada", tamanho: "14-16", minimo: 2, entrada: 5, fornecedor: 4 },
  { empresaIndice: 2, categoria: "Manual", grupo: "Diversos", qual: "Martelo de Borracha", marca: "Duramax", modelo: "MB-500", tamanho: "", minimo: 2, entrada: 4, fornecedor: 1 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Alicates", qual: "", marca: "Duramax", modelo: "Corte Diagonal", tamanho: "6 pol", minimo: 3, entrada: 7, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Chave Philips", qual: "", marca: "Ferrotec", modelo: "Ponta Imantada", tamanho: "", minimo: 3, entrada: 8, fornecedor: 4 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Chave estria", qual: "", marca: "Maxforça", modelo: "Cromo-Vanádio 12 Pontos", tamanho: "13-15", minimo: 2, entrada: 5, fornecedor: 4 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Canhão", qual: "", marca: "Duramax", modelo: "Longo Cromado", tamanho: "8", minimo: 3, entrada: 6, fornecedor: 1 },
  { empresaIndice: 2, categoria: "Manual", grupo: "Diversos", qual: "Trena de Aço 5 m", marca: "Ferrotec", modelo: "TR-5000", tamanho: "", minimo: 2, entrada: 6, fornecedor: 4 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Lima", qual: "", marca: "Maxforça", modelo: "Murça Bastarda", tamanho: "Chata", minimo: 2, entrada: 5, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Cachimbo", qual: "", marca: "Ferrotec", modelo: "Jogo Sextavado", tamanho: "17", minimo: 2, entrada: 4, fornecedor: 4 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Chave Allen", qual: "", marca: "Duramax", modelo: "Longa Cromada", tamanho: "6", minimo: 2, entrada: 6, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Chave L", qual: "", marca: "Maxforça", modelo: "Cromada Reforçada", tamanho: "11", minimo: 3, entrada: 7, fornecedor: 4 },
  { empresaIndice: 2, categoria: "Manual", grupo: "Diversos", qual: "Nível de Bolha 40 cm", marca: "Duramax", modelo: "NB-400", tamanho: "", minimo: 2, entrada: 4, fornecedor: 1 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Combinada", qual: "", marca: "Maxforça", modelo: "Aço Carbono", tamanho: "13", minimo: 3, entrada: 8, fornecedor: 4 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Alicates", qual: "", marca: "Ferrotec", modelo: "Bico Meia Cana", tamanho: "8 pol", minimo: 2, entrada: 5, fornecedor: 1 },
  // Mais dez ferramentas (a ordem 21 a 30 segue a mesma regra de empresa da caixa n mod 5).
  { empresaIndice: 0, categoria: "Manual", grupo: "Alicates", qual: "", marca: "Maxforça", modelo: "Bico Curvo", tamanho: "8 pol", minimo: 2, entrada: 5, fornecedor: 4 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Chave L", qual: "", marca: "Duramax", modelo: "Cromada Longa", tamanho: "14", minimo: 3, entrada: 6, fornecedor: 1 },
  { empresaIndice: 2, categoria: "Elétrica", grupo: "Diversos", qual: "Parafusadeira a Bateria", marca: "Ferrotec", modelo: "PB-12V", tamanho: "", minimo: 2, entrada: 3, fornecedor: 4 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Chave Philips", qual: "", marca: "Duramax", modelo: "Ponta Imantada", tamanho: "", minimo: 3, entrada: 8, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Chave boca", qual: "", marca: "Maxforça", modelo: "Aço Cromo-Vanádio", tamanho: "14-15", minimo: 2, entrada: 5, fornecedor: 4 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Meia lua", qual: "", marca: "Ferrotec", modelo: "Forjada Cromada", tamanho: "12-14", minimo: 2, entrada: 4, fornecedor: 1 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Canhão", qual: "", marca: "Maxforça", modelo: "Curto Cromado", tamanho: "10", minimo: 3, entrada: 6, fornecedor: 4 },
  { empresaIndice: 2, categoria: "Elétrica", grupo: "Diversos", qual: "Esmerilhadeira Angular", marca: "Duramax", modelo: "EA-4.1/2 850W", tamanho: "", minimo: 2, entrada: 3, fornecedor: 1 },
  { empresaIndice: 0, categoria: "Manual", grupo: "Lima", qual: "", marca: "Duramax", modelo: "Murça Bastarda", tamanho: "Redonda", minimo: 2, entrada: 5, fornecedor: 4 },
  { empresaIndice: 1, categoria: "Manual", grupo: "Cachimbo", qual: "", marca: "Duramax", modelo: "Jogo Sextavado", tamanho: "19", minimo: 2, entrada: 4, fornecedor: 1 },
] as const;
export const CAIXAS_TESTE = 5;

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

// Equipamentos de teste para a associação de check list e os demais cadastros: completam cinco em cada um dos oito tipos (os cinco acima já cobrem parte deles).
// Ficam sem associação, check list nem registros, para dar o que escolher na janela de Associar itens de check list a um equipamento.
type TecnicoTeste = Record<string, string>;
const MOTOR = (propulsao: string, carga: string, unidade: string, horas: string, consumo: string, tanque: string): TecnicoTeste => ({ propulsao, capacidadeCarga: carga, capacidadeCargaUnidade: unidade, horimetroInicial: horas, consumoEstimado: consumo, capacidadeTanque: tanque });
const ELETRICO = (tensao: string, potencia: string, unidade: string, corrente: string, pressao = "0", vazao = "0"): TecnicoTeste => ({ tensao, potencia, potenciaUnidade: unidade, correnteNominal: corrente, pressaoTrabalho: pressao, pressaoTrabalhoUnidade: "PSI", vazaoAgua: vazao });
const EXTINTOR = (agente: string, capacidade: string, unidade: string, recarga: string, teste: string): TecnicoTeste => ({ agente, capacidade, capacidadeUnidade: unidade, ultimaRecarga: recarga, vencimentoTesteHidrostatico: teste });
const FAMILIAS_EXTRAS: readonly { tipoId: string; setor: string; itens: readonly { nome: string; marca: string; modelo: string; valor: string; tecnico: TecnicoTeste }[] }[] = [
  { tipoId: "tipo-empilhadeiras", setor: "Almoxarifado Central", itens: [
    { nome: "Empilhadeira a Diesel 3 t", marca: "Toyota", modelo: "8FD30", valor: "210.000,00", tecnico: MOTOR("Diesel", "3", "t", "240", "4", "70") },
    { nome: "Empilhadeira Elétrica 1,6 t", marca: "Hyster", modelo: "E40XN", valor: "142.000,00", tecnico: MOTOR("Elétrico", "1,6", "t", "95", "5", "0") },
    { nome: "Empilhadeira a Gás 2 t", marca: "Yale", modelo: "GLP20", valor: "158.000,00", tecnico: MOTOR("GLP/Gás", "2", "t", "130", "3", "13") },
  ] },
  { tipoId: "tipo-munck", setor: "Pátio de Cargas", itens: [
    { nome: "Caminhão Munck 8 t", marca: "Volkswagen", modelo: "Constellation 24.280", valor: "560.000,00", tecnico: MOTOR("Diesel", "8", "t", "1.250", "9", "300") },
    { nome: "Caminhão Munck 12 t", marca: "Mercedes-Benz", modelo: "Atego 2430", valor: "610.000,00", tecnico: MOTOR("Diesel", "12", "t", "980", "10", "320") },
    { nome: "Munck Articulado 6 t", marca: "Madal", modelo: "MD 6000", valor: "280.000,00", tecnico: MOTOR("Diesel", "6", "t", "640", "7", "200") },
    { nome: "Caminhão Munck 10 t", marca: "Iveco", modelo: "Tector 240E28", valor: "520.000,00", tecnico: MOTOR("Diesel", "10", "t", "1.480", "9", "280") },
    { nome: "Munck Telescópico 15 t", marca: "Hiab", modelo: "XS 322", valor: "720.000,00", tecnico: MOTOR("Diesel", "15", "t", "310", "11", "340") },
  ] },
  { tipoId: "tipo-ponte-rolante", setor: "Galpão de Produção", itens: [
    { nome: "Ponte Rolante 5 t", marca: "Konecranes", modelo: "CXT 5", valor: "180.000,00", tecnico: ELETRICO("380V", "10", "CV", "16") },
    { nome: "Ponte Rolante 10 t", marca: "Demag", modelo: "EKDR 10", valor: "265.000,00", tecnico: ELETRICO("440V", "15", "CV", "22") },
    { nome: "Ponte Rolante 3 t", marca: "Stahl", modelo: "SH 3", valor: "120.000,00", tecnico: ELETRICO("380V", "7,5", "CV", "12") },
    { nome: "Ponte Rolante 20 t", marca: "Konecranes", modelo: "CXT 20", valor: "410.000,00", tecnico: ELETRICO("440V", "25", "CV", "34") },
    { nome: "Ponte Rolante Monoviga 2 t", marca: "Demag", modelo: "KBK 2", valor: "95.000,00", tecnico: ELETRICO("220V Trifásico", "5", "CV", "10") },
  ] },
  { tipoId: "tipo-serra-de-corte", setor: "Oficina Mecânica", itens: [
    { nome: "Serra de Fita Horizontal", marca: "Franho", modelo: "FM-300", valor: "18.500,00", tecnico: ELETRICO("220V Trifásico", "2", "CV", "6") },
    { nome: "Serra Circular de Bancada", marca: "Bosch", modelo: "GTS 10", valor: "4.900,00", tecnico: ELETRICO("110V", "2", "HP", "14") },
    { nome: "Serra de Disco Abrasivo", marca: "Makita", modelo: "2414NB", valor: "3.200,00", tecnico: ELETRICO("220V Monofásico", "2", "kW", "9") },
    { nome: "Serra Mármore Industrial", marca: "DeWalt", modelo: "D28720", valor: "1.850,00", tecnico: ELETRICO("220V Monofásico", "1,5", "kW", "7") },
    { nome: "Serra Sabre Industrial", marca: "Milwaukee", modelo: "2821", valor: "2.400,00", tecnico: ELETRICO("110V", "1,3", "kW", "12") },
  ] },
  { tipoId: "tipo-maquina-de-solda", setor: "Oficina de Solda", itens: [
    { nome: "Máquina de Solda MIG 250 A", marca: "Esab", modelo: "Smashweld 257", valor: "14.800,00", tecnico: ELETRICO("220V Trifásico", "8", "kW", "28") },
    { nome: "Máquina de Solda Inversora TIG", marca: "Lincoln", modelo: "Invertec 200", valor: "9.600,00", tecnico: ELETRICO("220V Monofásico", "6", "kW", "26") },
    { nome: "Máquina de Solda Eletrodo 400 A", marca: "Bambozzi", modelo: "Master 400", valor: "11.200,00", tecnico: ELETRICO("380V", "12", "kW", "30") },
    { nome: "Máquina de Solda MIG 180 A", marca: "Esab", modelo: "Origo Mig 180", valor: "7.900,00", tecnico: ELETRICO("220V Monofásico", "5", "kW", "22") },
    { nome: "Máquina de Solda Plasma", marca: "Thermal Dynamics", modelo: "Cutmaster 60", valor: "21.300,00", tecnico: ELETRICO("380V", "9", "kW", "20") },
  ] },
  { tipoId: "tipo-compressor-de-ar", setor: "Oficina Mecânica", itens: [
    { nome: "Compressor de Ar 10 Pés", marca: "Schulz", modelo: "CSL 10/100", valor: "6.800,00", tecnico: ELETRICO("220V Monofásico", "2", "HP", "10", "140") },
    { nome: "Compressor de Ar Parafuso 30 HP", marca: "Atlas Copco", modelo: "GA 22", valor: "58.000,00", tecnico: ELETRICO("380V", "30", "HP", "45", "125") },
    { nome: "Compressor de Ar 15 Pés", marca: "Chiaperini", modelo: "CJ 15", valor: "9.400,00", tecnico: ELETRICO("220V Trifásico", "3", "HP", "11", "175") },
    { nome: "Compressor de Ar Portátil", marca: "Pressure", modelo: "Shulz 7.6", valor: "2.900,00", tecnico: ELETRICO("110V", "1", "HP", "9", "116") },
  ] },
  { tipoId: "tipo-jato-alta-pressao", setor: "Lavagem", itens: [
    { nome: "Lavadora de Alta Pressão a Gasolina", marca: "Karcher", modelo: "HD 1050", valor: "7.500,00", tecnico: { ...MOTOR("Gasolina", "0", "kg", "60", "2", "8"), ...ELETRICO("110V", "5", "CV", "0", "3000", "13") } },
    { nome: "Lavadora de Alta Pressão Elétrica", marca: "Karcher", modelo: "HD 585", valor: "4.200,00", tecnico: { ...MOTOR("Elétrico", "0", "kg", "45", "0", "0"), ...ELETRICO("220V Monofásico", "3", "kW", "13", "2175", "9") } },
    { nome: "Lavadora de Alta Pressão a Diesel", marca: "Wap", modelo: "Industrial 6000", valor: "11.800,00", tecnico: { ...MOTOR("Diesel", "0", "kg", "120", "1,5", "12"), ...ELETRICO("220V Trifásico", "6", "CV", "0", "2500", "15") } },
    { nome: "Lavadora de Alta Pressão Trifásica", marca: "Stihl", modelo: "RE 232", valor: "5.600,00", tecnico: { ...MOTOR("Elétrico", "0", "kg", "30", "0", "0"), ...ELETRICO("220V Trifásico", "4", "kW", "12", "2300", "11") } },
    { nome: "Lavadora de Alta Pressão Compacta", marca: "Black+Decker", modelo: "PW 1700", valor: "1.350,00", tecnico: { ...MOTOR("Elétrico", "0", "kg", "20", "0", "0"), ...ELETRICO("110V", "2", "kW", "13", "1740", "6") } },
  ] },
  { tipoId: "tipo-extintores", setor: "Galpão de Estoque", itens: [
    { nome: "Extintor de Incêndio CO2 6 kg", marca: "Kidde", modelo: "CO2-6", valor: "780,00", tecnico: EXTINTOR("CO2", "6", "kg", "2025-09-14", "2030-09-14") },
    { nome: "Extintor de Incêndio Água 10 L", marca: "Resil", modelo: "AP-10", valor: "260,00", tecnico: EXTINTOR("Água", "10", "L", "2025-07-02", "2030-07-02") },
    { nome: "Extintor de Incêndio Pó BC 4 kg", marca: "Kidde", modelo: "BC-4", valor: "190,00", tecnico: EXTINTOR("Pó PQS BC", "4", "kg", "2025-05-20", "2030-05-20") },
  ] },
];
const EMPRESA_DOS_EXTRAS = [0, 1, 2] as const;
// PAT-0006 em diante, em ordem; a empresa gira entre as três.
export const EQUIPAMENTOS_CATALOGO = FAMILIAS_EXTRAS.flatMap((f) => f.itens.map((i) => ({ tipoId: f.tipoId, setor: f.setor, ...i }))).map((e, n) => ({
  empresaIndice: EMPRESA_DOS_EXTRAS[n % 3]!,
  patrimonio: `PAT-${String(EQUIPAMENTOS.length + n + 1).padStart(4, "0")}`,
  nome: e.nome, tipoId: e.tipoId, marca: e.marca, modelo: e.modelo, numeroSerie: `SN-TESTE-EQ-${String(EQUIPAMENTOS.length + n + 1).padStart(3, "0")}`,
  dataAquisicao: `${2019 + (n % 6)}-${String(1 + (n % 12)).padStart(2, "0")}-${String(3 + (n % 25)).padStart(2, "0")}`, valorCompra: e.valor, status: "Ativo", setor: e.setor, tecnico: e.tecnico,
}));

// Todos os equipamentos de teste na ordem do cadastro (PAT-0001 a PAT-0040) e os dez que levam registros (associação, plano, abastecimento, manutenção, ocorrência e
// check lists): PAT-0006, 0007, 0009, 0014, 0019, 0024, 0029, 0033, 0038 e 0039, ao menos um de cada tipo. Os outros trinta ficam só cadastrados.
export const EQUIPAMENTOS_DE_TESTE: readonly { tipoId: string; patrimonio: string; nome: string; tecnico: Record<string, string> }[] = [...EQUIPAMENTOS, ...EQUIPAMENTOS_CATALOGO];
export const INDICES_COM_DADOS: readonly number[] = [5, 6, 8, 13, 18, 23, 28, 32, 37, 38];
