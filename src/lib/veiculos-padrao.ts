// Cadastros padrão de Parâmetros > Veículos (decisão 46): ações de manutenção e tipos de
// ocorrência, carregados pelo botão "Cadastrar padrão".
// Cada ação de manutenção é um pai com seus subitens (filhos).
// Todo grupo de ações de manutenção tem também o item Outros, com descrição aberta (decisão 163).
export const NOME_OUTROS = "Outros";
export const ehOutros = (nome: string): boolean => nome.trim().toLowerCase() === NOME_OUTROS.toLowerCase();

const ACOES_MANUTENCAO_BASE: readonly { nome: string; subitens: readonly string[] }[] = [
  {
    nome: "Revisão do Sistema de Lubrificação e Filtros",
    subitens: ["Troca de óleo do motor", "Filtro de óleo", "Filtro de ar do motor", "Filtro de combustível", "Filtro de cabine (Ar-condicionado)"],
  },
  {
    nome: "Revisão do Sistema de Transmissão e Fluídos",
    subitens: ["Fluído de freio", "Líquido de arrefecimento", "Óleo do câmbio", "Fluído da direção hidráulica"],
  },
  {
    nome: "Manutenção do Sistema de Freios",
    subitens: ["Pastilhas dianteiras", "Pastilhas traseiras", "Discos de freio dianteiros", "Discos de freio traseiros", "Lonas de freio", "Tambores de freio", "Cilindro mestre"],
  },
  {
    nome: "Manutenção de Pneus e Alinhamento",
    subitens: ["Alinhamento 3D", "Balanceamento de rodas", "Rodízio de pneus", "Troca de pneus (parcial ou total)", "Vulcanização", "Calibragem"],
  },
  {
    nome: "Revisão de Suspensão e Direção",
    subitens: ["Amortecedores dianteiros", "Amortecedores traseiros", "Buchas da balança", "Pivôs de suspensão", "Terminais de direção", "Molas"],
  },
  {
    nome: "Revisão do Sistema Elétrico e Iluminação",
    subitens: ["Troca de bateria", "Troca de velas de ignição", "Substituição de lâmpadas (Farol/Lanterna)", "Reparo no alternador", "Reparo no motor de partida"],
  },
  {
    nome: "Inspeção de Segurança e Correias",
    subitens: ["Correia dentada", "Correia de acessórios", "Palhetas do limpador", "Kit de embreagem", "Coxim do motor"],
  },
];

export const ACOES_MANUTENCAO_PADRAO: readonly { nome: string; subitens: readonly string[] }[] =
  ACOES_MANUTENCAO_BASE.map((a) => ({ nome: a.nome, subitens: [...a.subitens, NOME_OUTROS] }));

export const TIPOS_OCORRENCIA_VEICULO_PADRAO: readonly { nome: string; descricao: string }[] = [
  { nome: "Furto", descricao: "Subtração do veículo sem violência." },
  { nome: "Roubo", descricao: "Subtração do veículo com violência." },
  {
    nome: "Avaria em manobra",
    descricao: "Encostadas, raspadas em colunas de garagem, batidas leves em portões ou pequenos incidentes ao estacionar.",
  },
  {
    nome: "Avaria por fator externo",
    descricao: "Queda de objetos no veículo (galhos, pedras de obras), danos causados por chuva de granizo ou atos de vandalismo com o carro estacionado.",
  },
  {
    nome: "Avaria interna",
    descricao: "Danos em estofados, quebra de botões, rasgos no banco ou danos no painel causados pela própria operação ou descuido.",
  },
  {
    nome: "Infração de trânsito",
    descricao: "Termo formal para substituir \"multa\", englobando também a gestão da pontuação da CNH do motorista.",
  },
  {
    nome: "Sinistro com vítima",
    descricao: "Qualquer acidente de trânsito que resulte em pessoas feridas, sejam colaboradores ou terceiros.",
  },
  {
    nome: "Colisão em trânsito",
    descricao: "Batidas, capotamentos ou colisões contra outros veículos ou obstáculos enquanto o veículo estava em movimento em vias públicas.",
  },
];

// Marcas de veículos pré-cadastradas em Gerais (decisão 67): carros, caminhões, motos e
// empilhadeiras numa lista só, sem repetir a marca que serve a mais de um tipo.
const MARCAS_CARROS = ["Fiat", "Volkswagen", "Chevrolet", "Toyota", "Hyundai", "Renault", "Nissan", "Honda", "Jeep", "Ford", "Peugeot", "Citroën", "Mitsubishi", "BYD", "GWM", "Suzuki"];
const MARCAS_EQUIPAMENTOS = ["Mercedes-Benz", "Volvo", "Scania", "MAN", "Volkswagen Caminhões", "Iveco", "Ford Caminhões", "DAF", "Foton", "Sinotruk"];
const MARCAS_MOTOS = ["Honda", "Yamaha", "Suzuki", "Kawasaki", "Harley-Davidson", "Royal Enfield", "BMW Motorrad", "Dafra", "Shineray", "Haojue"];
const MARCAS_EMPILHADEIRAS = ["Toyota", "Caterpillar (CAT)", "Hyster", "Yale", "Clark", "Still", "Jungheinrich", "Crown", "Paletrans", "Total"];

export const MARCAS_VEICULO_PADRAO: readonly string[] = [
  ...new Map(
    [...MARCAS_CARROS, ...MARCAS_EQUIPAMENTOS, ...MARCAS_MOTOS, ...MARCAS_EMPILHADEIRAS].map((n) => [n.toLowerCase(), n]),
  ).values(),
];
