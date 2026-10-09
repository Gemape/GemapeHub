// Itens de check list de veículos (decisões 62 e 64), carregados pelo botão "Cadastrar padrão".
// Três listas por tipo de veículo: leves (carros, SUVs, picapes, vans), pesados (caminhões, cavalo
// mecânico, carreta, ônibus) e empilhadeiras. Cada grupo é "tipo · seção".
export const CHECKLIST_VEICULOS_PADRAO: readonly { nome: string; itens: readonly string[] }[] = [
  {
    nome: "Veículos leves · Mecânica",
    itens: [
      "Nível de óleo do motor",
      "Nível de arrefecimento (radiador)",
      "Nível de fluido de freio",
      "Nível de óleo da direção hidráulica",
      "Nível do reservatório do limpador",
      "Bateria e bornes",
      "Correias e mangueiras",
      "Freios (pedal, pastilhas, freio de mão)",
      "Suspensão e amortecedores",
      "Direção (folga e alinhamento)",
      "Câmbio e embreagem",
      "Vazamentos (óleo, combustível, fluidos)",
      "Ruídos anormais no motor",
    ],
  },
  {
    nome: "Veículos leves · Exterior e pneus",
    itens: [
      "Pneus (sulco, desgaste, calibragem) + estepe",
      "Rodas e parafusos",
      "Faróis e lanternas",
      "Setas e luz de freio",
      "Luz de ré e neblina",
      "Para-brisa e vidros (trincas, lascas)",
      "Limpadores e palhetas",
      "Retrovisores",
      "Lataria e pintura (amassados, riscos, ferrugem)",
      "Portas, capô e porta-malas (fechamento)",
      "Para-choques e grade",
    ],
  },
  {
    nome: "Veículos leves · Interior",
    itens: [
      "Painel e luzes de advertência",
      "Ar-condicionado",
      "Bancos e cintos de segurança",
      "Vidros elétricos e travas",
      "Espelhos internos",
      "Carpete e forro (estado e limpeza)",
    ],
  },
  {
    nome: "Veículos leves · Segurança e documentos",
    itens: [
      "Triângulo, macaco e chave de roda",
      "Extintor (quando aplicável)",
      "Estepe em condições",
      "CRLV/licenciamento em dia",
      "Multas pendentes",
      "Limpeza e conservação geral",
    ],
  },
  {
    nome: "Veículos pesados · Mecânica e sistema de ar",
    itens: [
      "Nível de óleo do motor",
      "Nível de arrefecimento",
      "Teste de vazamento do sistema pneumático",
      "Pressão dos reservatórios de ar",
      "Compressor e secador de ar",
      "Freios (lonas, discos, câmaras)",
      "Freio de estacionamento",
      "Freio-motor / retarder (quando houver)",
      "Bateria e alternador",
      "Correias e mangueiras",
      "Vazamentos de óleo, ar e combustível",
      "Ruídos anormais",
    ],
  },
  {
    nome: "Veículos pesados · Pneus, rodas e eixos",
    itens: [
      "Pneus dianteiros (sulco, desgaste, calibragem)",
      "Pneus traseiros e estepe",
      "Parafusos e porcas das rodas",
      "Molas, feixes e amortecedores",
      "Eixos, rolamentos e buchas",
      "Nível de fluido dos eixos (quando aplicável)",
    ],
  },
  {
    nome: "Veículos pesados · Iluminação e sinalização",
    itens: [
      "Faróis, lanternas e setas",
      "Luzes de freio e ré",
      "Luzes de contorno e laterais",
      "Luzes de identificação do reboque (quando houver)",
      "Conector elétrico do reboque",
    ],
  },
  {
    nome: "Veículos pesados · Acoplamento e carroceria",
    itens: [
      "Quinta roda e pino-rei (cavalo mecânico)",
      "Travamento e folga do acoplamento",
      "Suspensão a ar (bolsas e altura)",
      "Conexões de freio do reboque",
      "Estado da carroceria/baú (portas, travas, piso)",
      "Lonas, cintas e pontos de amarração",
      "Para-choque traseiro e proteções laterais",
    ],
  },
  {
    nome: "Veículos pesados · Cabine e segurança",
    itens: [
      "Cintos de segurança e bancos",
      "Retrovisores ampliados e espelhos de aproximação",
      "Tacógrafo (funcionamento e calibração)",
      "Extintores (quantidade e validade)",
      "Triângulo, macaco, chave de roda e calços",
      "Kit de ferramentas",
      "Limpeza e conservação",
    ],
  },
  {
    nome: "Veículos pesados · Documentação e regulamentação",
    itens: [
      "CRLV/licenciamento",
      "RNTRC/ANTT (transporte de cargas)",
      "Seguro do veículo e da carga",
      "Multas e pendências",
    ],
  },
  {
    nome: "Empilhadeiras · Elevação e mastro",
    itens: [
      "Mastro: rolamentos, guias e deslizamento suave",
      "Correntes de elevação (tensão, desgaste, lubrificação)",
      "Cilindros de elevação e inclinação (vazamentos)",
      "Travamento e folga do mastro",
      "Movimento de elevação/abaixamento sem trancos ou ruídos",
    ],
  },
  {
    nome: "Empilhadeiras · Garfo e estrutura de carga",
    itens: [
      "Garfos: deformações, trincas e desgaste",
      "Suporte do garfo e pinos de travamento",
      "Extensões do garfo (quando houver)",
      "Apoios e proteção traseira da carga",
      "Inclinador do garfo funcionando",
    ],
  },
  {
    nome: "Empilhadeiras · Pneus e rodas",
    itens: [
      "Pneus maciços/pneumáticos (desgaste, trincas)",
      "Rodas e parafusos",
      "Roda traseira (direção) alinhada",
    ],
  },
  {
    nome: "Empilhadeiras · Freios e direção",
    itens: [
      "Freio de serviço (teste de frenagem)",
      "Freio de estacionamento",
      "Direção hidráulica (folga e esforço)",
      "Vazamentos no sistema hidráulico",
    ],
  },
  {
    nome: "Empilhadeiras · Bateria (empilhadeira elétrica)",
    itens: [
      "Nível da bateria (carga)",
      "Nível de eletrólito e água destilada",
      "Cabos, bornes e conectores",
      "Carregador em boas condições",
    ],
  },
  {
    nome: "Empilhadeiras · Motor e combustível (empilhadeira a combustão)",
    itens: [
      "Nível de óleo do motor",
      "Nível de arrefecimento",
      "Filtro de ar e combustível",
      "Nível de GPL/diesel e vazamentos",
      "Ruídos e fumaça anormais",
    ],
  },
  {
    nome: "Empilhadeiras · Elétrica e iluminação",
    itens: [
      "Faróis, lanternas e pisca-alerta",
      "Buzina e alarme de ré",
      "Sinal de marcha à ré",
      "Luzes de trabalho (quando houver)",
      "Cinto/sensor de presença do operador",
    ],
  },
  {
    nome: "Empilhadeiras · Segurança do operador",
    itens: [
      "Estrutura de proteção (FOP) — capô e teto",
      "Espelho retrovisor (quando houver)",
      "Retrovisor e visibilidade geral",
      "Placa de capacidade de carga legível",
      "Extintor (quando aplicável)",
    ],
  },
  {
    nome: "Empilhadeiras · Documentação e inspeção",
    itens: [
      "Inspeção diária do operador registrada",
      "Checklist anterior assinado/resolvido",
      "Manutenção preventiva em dia",
      "Registro de pendências abertas",
    ],
  },
  {
    nome: "Avulso · Mecânicos e funcionamento",
    itens: [
      "Nível do óleo do motor",
      "Nível do fluido de freio",
      "Nível da água do radiador",
      "Nível do fluido da direção hidráulica",
      "Vazamentos (óleo, água, etc.)",
    ],
  },
  {
    nome: "Avulso · Pneus e rodas",
    itens: [
      "Calibragem dos pneus",
      "Estado geral dos pneus (desgaste, bolhas, furos)",
      "Estepe em boas condições",
      "Chave de roda e macaco",
    ],
  },
  {
    nome: "Avulso · Iluminação e sinalização",
    itens: [
      "Faróis dianteiros (alto e baixo)",
      "Lanternas traseiras",
    ],
  },
  {
    nome: "Avulso · Segurança",
    itens: [
      "Cinto de segurança (todos os assentos)",
    ],
  },
  {
    nome: "Avulso · Conforto e limpeza",
    itens: [
      "Ar-condicionado e ventilação",
      "Interior limpo e organizado",
      "Vidros limpos",
    ],
  },
  {
    nome: "Avulso · Outros",
    itens: [
      "Outros (descreva na observação)",
    ],
  },
];

// Grupos do check list avulso (decisão 130): os de nome "Avulso · ..." são os itens mais simples do avulso; os demais são do periódico.
export const PREFIXO_GRUPO_AVULSO = "Avulso ·";
export const ehGrupoAvulso = (nome: string): boolean => nome.trim().startsWith(PREFIXO_GRUPO_AVULSO);

// Nomes dos grupos do padrão antigo (decisão 62: 26 grupos por tipo de veículo). A decisão 64 substitui
// esse padrão: ao cadastrar o novo, os grupos com estes nomes são retirados.
export const NOMES_PADRAO_ANTIGO: readonly string[] = [
  "Carros de passeio · Exterior", "Carros de passeio · Interior", "Carros de passeio · Mecânica", "Carros de passeio · Segurança e equipamentos", "Carros de passeio · Documentação", "SUVs, utilitários e picapes · Caçamba / carga", "SUVs, utilitários e picapes · Tração e uso off-road", "SUVs, utilitários e picapes · Reboque e acessórios", "Vans e furgões", "Caminhões leves e médios · Carroceria", "Caminhões leves e médios · Freios", "Caminhões leves e médios · Pneus e rodas", "Caminhões leves e médios · Suspensão e eixos", "Caminhões leves e médios · Mecânica e elétrica", "Caminhões leves e médios · Equipamentos obrigatórios", "Caminhões leves e médios · Documentação e regulamentação", "Caminhões pesados e cavalo mecânico · Sistema pneumático", "Caminhões pesados e cavalo mecânico · Acoplamento e carroceria", "Caminhões pesados e cavalo mecânico · Segurança e regulamentação", "Ônibus e micro-ônibus · Área de passageiros", "Ônibus e micro-ônibus · Portas e emergência", "Ônibus e micro-ônibus · Acessibilidade", "Ônibus e micro-ônibus · Documentação e higiene", "Motos", "Empilhadeiras e veículos de movimentação", "Todos os veículos · Itens comuns",
];

// Tipo de veículo a que cada grupo padrão se destina (decisões 63 e 64).
export type ChaveTipoVeiculo = "passeio" | "suv" | "van" | "pesado" | "onibus" | "empilhadeira";
const POR_PREFIXO: readonly (readonly [string, readonly ChaveTipoVeiculo[]])[] = [
  ["Veículos leves", ["passeio", "suv", "van"]],
  ["Veículos pesados", ["pesado", "onibus"]],
  ["Empilhadeiras", ["empilhadeira"]],
];

// Chaves dos tipos a que o grupo padrão se aplica; "todos" quando vale para qualquer veículo.
export function tiposDoGrupoPadrao(nome: string): readonly ChaveTipoVeiculo[] | "todos" {
  return POR_PREFIXO.find(([prefixo]) => nome.startsWith(prefixo))?.[1] ?? "todos";
}

// O check list avulso só vale para veículos leves: carro de passeio, SUV/utilitário/picape e van (decisão 153).
export const tipoPermiteAvulso = (nomeSubcategoria: string | null | undefined): boolean => {
  const chave = chaveDoTipoVeiculo(nomeSubcategoria ?? "");
  return chave === "passeio" || chave === "suv" || chave === "van";
};

// Chave do tipo a partir do nome de uma subcategoria de Veículos de Cadastros > Gerais. Caminhão, cavalo
// mecânico e carreta são pesados; moto e outros tipos não têm lista padrão.
export function chaveDoTipoVeiculo(nomeSubcategoria: string): ChaveTipoVeiculo | null {
  const n = nomeSubcategoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/empilh/.test(n)) return "empilhadeira";
  if (/onibus/.test(n)) return "onibus";
  if (/caminhonete|utilit|suv|picape|pick-?up/.test(n)) return "suv";
  if (/caminh|pesad|carreta|cavalo|bitrem/.test(n)) return "pesado";
  if (/\bvan|furg/.test(n)) return "van";
  if (/carro|passeio|automovel/.test(n)) return "passeio";
  return null;
}
