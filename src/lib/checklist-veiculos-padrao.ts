// Itens de check list de veículos (decisão 62), carregados pelo botão "Cadastrar padrão".
// Cada grupo é "tipo de veículo · seção", com os itens a conferir. SUVs e vans somam ao carro de
// passeio, pesados ao caminhão leve e médio, ônibus ao passeio e aos pesados; essa repetição não é
// copiada: o responsável escolhe os grupos que valem para cada veículo.
export const CHECKLIST_VEICULOS_PADRAO: readonly { nome: string; itens: readonly string[] }[] = [
  {
    nome: "Carros de passeio · Exterior",
    itens: [
      "Lataria e pintura (amassados, riscos, ferrugem)",
      "Para-choques, para-lamas e grade",
      "Faróis, lanternas, setas e luzes de freio (funcionamento e lentes)",
      "Retrovisores (estado e regulagem)",
      "Para-brisa e vidros (trincas, lascas)",
      "Limpadores de para-brisa e nível do reservatório",
      "Pneus (sulco, desgaste irregular, calibragem) e estepe",
      "Rodas, calotas e parafusos",
      "Portas, capô e porta-malas (fechamento e dobradiças)",
    ],
  },
  {
    nome: "Carros de passeio · Interior",
    itens: [
      "Bancos (estado, regulagem, fixação)",
      "Cintos de segurança (funcionamento e retração)",
      "Painel de instrumentos e luzes de advertência",
      "Ar-condicionado e aquecimento",
      "Vidros elétricos, travas e alarme",
      "Espelho interno e quebra-sol",
      "Carpete, forro e revestimentos",
    ],
  },
  {
    nome: "Carros de passeio · Mecânica",
    itens: [
      "Motor (ruídos, vazamentos, fumaça)",
      "Nível de óleo do motor",
      "Fluido de arrefecimento (radiador)",
      "Fluido de freio e embreagem",
      "Bateria, bornes e cabos",
      "Correias e mangueiras",
      "Freios (pastilhas, discos, resposta do pedal, freio de mão)",
      "Suspensão (amortecedores, buchas, molas)",
      "Direção (folga, fluido, alinhamento)",
      "Câmbio e embreagem",
      "Escapamento e catalisador",
    ],
  },
  {
    nome: "Carros de passeio · Segurança e equipamentos",
    itens: [
      "Triângulo de segurança",
      "Macaco e chave de roda",
      "Estepe em condições",
      "Extintor (quando aplicável)",
      "Chave de emergência / kit de ferramentas básico",
    ],
  },
  {
    nome: "Carros de passeio · Documentação",
    itens: ["CRLV/licenciamento em dia", "IPVA pago", "Seguro do veículo", "Multas pendentes"],
  },
  {
    nome: "SUVs, utilitários e picapes · Caçamba / carga",
    itens: [
      "Estado do assoalho e laterais",
      "Tampa traseira (funcionamento e travas)",
      "Lonas e amarrações",
      "Protetor de caçamba (quando houver)",
    ],
  },
  {
    nome: "SUVs, utilitários e picapes · Tração e uso off-road",
    itens: [
      "Teste de engate da tração 4x4",
      "Reduzida e bloqueio de diferencial",
      "Pneus de uso misto/off-road (sulco e desgaste)",
      "Estepe compatível",
    ],
  },
  {
    nome: "SUVs, utilitários e picapes · Reboque e acessórios",
    itens: [
      "Engate de reboque (estado e fixação)",
      "Conector elétrico do reboque",
      "Rack de teto e suportes (quando houver)",
      "Suspensão reforçada (molas e amortecedores)",
    ],
  },
  {
    nome: "Vans e furgões",
    itens: [
      "Portas laterais deslizantes e traseiras (funcionamento, travas, trilhos)",
      "Compartimento de carga: piso, revestimento e iluminação",
      "Bancos rebatíveis (quando houver)",
      "Capacidade de carga e distribuição de peso",
      "Degraus e alças de acesso",
      "Ventilação interna do compartimento",
    ],
  },
  {
    nome: "Caminhões leves e médios · Carroceria",
    itens: [
      "Estado do baú, grade ou carroceria aberta",
      "Portas e travas do baú",
      "Piso, laterais e cantoneiras",
      "Lonas, cintas e pontos de amarração",
      "Iluminação interna do baú",
    ],
  },
  {
    nome: "Caminhões leves e médios · Freios",
    itens: [
      "Sistema hidráulico ou pneumático (conforme modelo)",
      "Teste de vazamento do sistema de ar (quando pneumático)",
      "Freio de estacionamento",
      "Freio-motor e retarder (quando houver)",
    ],
  },
  {
    nome: "Caminhões leves e médios · Pneus e rodas",
    itens: [
      "Pneus dianteiros e traseiros (sulco, desgaste, calibragem)",
      "Estepe",
      "Parafusos e porcas das rodas",
      "Alinhamento e balanceamento",
    ],
  },
  {
    nome: "Caminhões leves e médios · Suspensão e eixos",
    itens: [
      "Molas, feixes e amortecedores",
      "Eixos, rolamentos e buchas",
      "Pino-rei e quinta roda (quando aplicável)",
      "Nível de fluido dos eixos",
    ],
  },
  {
    nome: "Caminhões leves e médios · Mecânica e elétrica",
    itens: [
      "Motor, óleo e filtros",
      "Sistema de arrefecimento",
      "Bateria e alternador",
      "Embreagem e câmbio",
      "Faróis, lanternas, setas, luzes de freio e ré",
      "Luzes de contorno e laterais",
      "Tacógrafo (quando aplicável)",
    ],
  },
  {
    nome: "Caminhões leves e médios · Equipamentos obrigatórios",
    itens: ["Triângulo, macaco e chave de roda", "Extintor", "Calços de roda", "Kit de ferramentas"],
  },
  {
    nome: "Caminhões leves e médios · Documentação e regulamentação",
    itens: [
      "CRLV/licenciamento",
      "RNTRC (ANTT) — para transporte rodoviário de cargas",
      "Seguro do veículo e da carga",
      "Tacógrafo calibrado",
      "Multas e pendências",
    ],
  },
  {
    nome: "Caminhões pesados e cavalo mecânico · Sistema pneumático",
    itens: [
      "Compressor e secador de ar",
      "Reservatórios e válvulas",
      "Teste completo de vazamento do circuito de ar",
      "Freios: lonas, discos, câmaras e ajuste",
    ],
  },
  {
    nome: "Caminhões pesados e cavalo mecânico · Acoplamento e carroceria",
    itens: [
      "Quinta roda: estado, travamento e pino-rei",
      "Suspensão a ar: bolsas, altura e válvulas",
      "Eixos e balanças (alinhamento)",
      "Para-choque traseiro e proteções laterais",
      "Conexões de freio e elétrica do reboque",
    ],
  },
  {
    nome: "Caminhões pesados e cavalo mecânico · Segurança e regulamentação",
    itens: [
      "Limitador de velocidade",
      "Tacógrafo (obrigatório)",
      "Retrovisores ampliados e espelhos de aproximação",
      "Extintores em quantidade adequada",
      "Documentação: RNTRC, AETC, licença de operação",
      "Inspeção de segurança veicular (quando exigida)",
    ],
  },
  {
    nome: "Ônibus e micro-ônibus · Área de passageiros",
    itens: [
      "Assentos (estado e fixação)",
      "Cintos de segurança",
      "Corrimãos e alças",
      "Iluminação interna",
      "Sistema de som/aviso",
    ],
  },
  {
    nome: "Ônibus e micro-ônibus · Portas e emergência",
    itens: [
      "Portas (funcionamento, travas, sensor de fechamento)",
      "Saídas de emergência",
      "Martelo quebra-vidro",
      "Extintores (quantidade e validade)",
    ],
  },
  {
    nome: "Ônibus e micro-ônibus · Acessibilidade",
    itens: [
      "Elevador ou rampa (quando houver)",
      "Espaço reservado para cadeirante",
      "Sinalização de acessibilidade",
    ],
  },
  {
    nome: "Ônibus e micro-ônibus · Documentação e higiene",
    itens: [
      "Licença de operação",
      "Seguro de passageiros",
      "Condições sanitárias e limpeza",
      "Higienização periódica",
    ],
  },
  {
    nome: "Motos",
    itens: [
      "Freios dianteiro e traseiro (discos, pastilhas, fluido)",
      "Pneus (sulco, desgaste, calibragem)",
      "Corrente e relação (tensão e lubrificação)",
      "Farol, setas, lanterna e luz de freio",
      "Buzina",
      "Retrovisores",
      "Escapamento (estado e ruído)",
      "Suspensão (garfo dianteiro e amortecedor traseiro)",
      "Nível de óleo do motor",
      "Bateria e partida",
      "Documentação: CRLV, seguro e multas",
    ],
  },
  {
    nome: "Empilhadeiras e veículos de movimentação",
    itens: [
      "Garfo e suporte de carga (deformações, desgaste)",
      "Correntes e cilindro de elevação",
      "Mastro e rolamentos",
      "Freios e direção",
      "Buzina e alarme de ré",
      "Nível de fluidos (hidráulico, óleo, arrefecimento)",
      "Bateria (carga e nível) — quando elétrica",
      "Pneus maciços ou pneumáticos",
      "Luzes de trabalho",
      "Inspeção diária de segurança do operador",
    ],
  },
  {
    nome: "Todos os veículos · Itens comuns",
    itens: [
      "Estado geral de limpeza e conservação",
      "Vazamentos visíveis (óleo, combustível, fluidos)",
      "Ruídos anormais em funcionamento",
      "Odores estranhos (queimado, combustível)",
      "Quilometragem registrada",
      "Data da última manutenção preventiva",
      "Observações e pendências para correção",
    ],
  },
];
