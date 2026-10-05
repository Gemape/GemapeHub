// Cadastros padrão de Parâmetros > Veículos (decisão 46): ações de manutenção e tipos de
// ocorrência, carregados pelo botão "Cadastrar padrão".
export const ACOES_MANUTENCAO_PADRAO: readonly string[] = [
  "Troca de óleo do motor",
  "Troca de pneu",
  "Troca de filtro de óleo do motor",
  "Troca de filtro de ar",
  "Troca de filtro de combustível",
];

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
