// Ações de manutenção já disponíveis para cada tipo de equipamento (lista fornecida pela Gemape): um grupo por rotina, valendo só para o tipo.
// Entram no check list de manutenção pelo botão "Cadastrar padrão".
export type GrupoPadrao = { tipoId: string; nome: string; itens: readonly string[] };

export const GRUPOS_PADRAO_MANUTENCAO: readonly GrupoPadrao[] = [
  {
    tipoId: "tipo-extintores", nome: "Extintores: preventiva de 2º grau (anual, empresa credenciada)", itens: [
      "Recarga de componentes: despressurizar o cilindro, esvaziar por completo e trocar o agente extintor (água, pó ABC/BC ou CO2)",
      "Mecânica e vedações: trocar o anel de vedação da válvula, raspar oxidações na rosca e trocar o bico de descarga se ressecado",
    ],
  },
  {
    tipoId: "tipo-extintores", nome: "Extintores: preventiva de 3º grau (a cada 5 anos, teste hidrostático)", itens: [
      "Estrutural: ensaio hidrostático de alta pressão para medir a expansão volumétrica permanente do cilindro e checar microfissuras na carcaça de aço",
    ],
  },
  {
    tipoId: "tipo-compressor-de-ar", nome: "Compressor de ar: mecânica e pneumática (semestral ou a cada 500 horas)", itens: [
      "Lubrificação: drenar o cárter e trocar o óleo lubrificante específico para compressores de pistão",
      "Filtros e correias: trocar os elementos filtrantes de ar, ajustar a tensão das correias e alinhar as polias do motor",
      "Vedações: inspecionar e trocar as juntas do cabeçote e as placas de válvula se houver perda de rendimento",
    ],
  },
  {
    tipoId: "tipo-compressor-de-ar", nome: "Compressor de ar: elétrica e calibração (anual, NR-13)", itens: [
      "Elétrica: reapertar conexões do painel de comando, medir a corrente do motor e testar a atuação do pressostato (desarme automático)",
      "Calibração: aferir e calibrar manômetro e válvula de segurança em laboratório certificado, com relatório técnico e ART de Engenheiro Mecânico",
    ],
  },
  {
    tipoId: "tipo-jato-alta-pressao", nome: "Jato de alta pressão: hidráulica e mecânica (trimestral)", itens: [
      "Bomba de alta pressão: trocar o óleo do cárter da bomba de pistões, o kit de gaxetas de vedação de água e os retentores de óleo",
      "Válvulas: limpar e trocar as válvulas de sucção e pressão (esferas e molas internas) para evitar perda de pressão",
    ],
  },
  {
    tipoId: "tipo-jato-alta-pressao", nome: "Jato de alta pressão: elétrica (semestral, NR-10)", itens: [
      "Segurança elétrica: testar fuga de corrente do motor, medir o isolamento das bobinas e trocar prensa-cabos e vedações da caixa de ligação para evitar infiltração de água",
    ],
  },
  {
    tipoId: "tipo-serra-de-corte", nome: "Serra de corte: mecânica e estrutural (semestral)", itens: [
      "Guias e rolamentos: trocar os rolamentos do eixo principal e as guias de apoio da lâmina de corte",
      "Lubrificação e alinhamento: lubrificar as engrenagens da caixa de redução, verificar o alinhamento perpendicular do braço de corte e trocar o fluido de refrigeração/corte",
    ],
  },
  {
    tipoId: "tipo-serra-de-corte", nome: "Serra de corte: elétrica (semestral, NR-12)", itens: [
      "Segurança da NR-12: testar física e eletricamente o módulo de segurança e o freio motor (parada instantânea ao desligar) e aferir o aterramento da carcaça",
    ],
  },
  {
    tipoId: "tipo-maquina-de-solda", nome: "Máquina de solda: elétrica e eletrônica (semestral, NR-10)", itens: [
      "Limpeza interna: abrir as carenagens e jatear ar comprimido seco para remover poeira metálica condutiva das placas eletrônicas e do transformador",
      "Conexões de potência: reapertar os bornes internos, trocar tomadas danificadas e calibrar os potenciômetros de amperagem com multímetro de bancada",
    ],
  },
  {
    tipoId: "tipo-empilhadeiras", nome: "Empilhadeiras: trem de força e mecânica (a cada 250 horas ou semestral)", itens: [
      "Motor a combustão (diesel, gasolina ou GLP): trocar óleo do motor e filtros de óleo, combustível e ar; regular válvulas e trocar velas, se aplicável",
      "Transmissão: trocar o óleo da transmissão e os filtros do sistema de tração",
    ],
  },
  {
    tipoId: "tipo-empilhadeiras", nome: "Empilhadeiras: hidráulica (anual ou a cada 1000 horas)", itens: [
      "Sistema de içamento: trocar todo o fluido hidráulico da torre, os reparos e anéis O-ring dos pistões de elevação e inclinação, e ajustar a tensão e lubrificar as correntes de elevação",
    ],
  },
  {
    tipoId: "tipo-munck", nome: "Munck: hidráulica do equipamento (semestral)", itens: [
      "Filtragem e fluidos: trocar o óleo hidráulico ou fazer a microfiltragem (diálise) e trocar os filtros de retorno e de sucção",
      "Comandos e cilindros: trocar vedações dos blocos de comando (joysticks e válvulas de retenção das patolas) e mangueiras hidráulicas com trincas na cobertura de borracha",
    ],
  },
  {
    tipoId: "tipo-munck", nome: "Munck: mecânica e estrutural (anual)", itens: [
      "Lubrificação pesada: engraxar com graxa de alta pressão todas as articulações dos braços e pinos centrais pelas graxeiras",
      "Ensaios estruturais: ensaio não destrutivo (líquido penetrante ou partícula magnética) nas juntas soldadas críticas da lança telescópica para detectar fadiga e trincas",
    ],
  },
  {
    tipoId: "tipo-ponte-rolante", nome: "Ponte rolante: mecânica e estrutural (trimestral)", itens: [
      "Freios e redutores: regular o entreferro dos freios eletromagnéticos dos motores de içamento e translação e trocar ou completar o óleo da caixa de redução do cabo de aço",
      "Cabos e polias: lubrificar o cabo de aço com graxa grafitada específica e verificar o desgaste do tambor de enrolamento",
    ],
  },
  {
    tipoId: "tipo-ponte-rolante", nome: "Ponte rolante: elétrica (semestral)", itens: [
      "Sistemas de alimentação: inspecionar o desgaste das escovas coletoras da linha elétrica (barramento blindado) e reapertar contatores, inversores de frequência e relés térmicos do painel de translação",
    ],
  },
  {
    tipoId: "tipo-ponte-rolante", nome: "Ponte rolante: estrutural e certificação (anual)", itens: [
      "Engenharia: reapertar os parafusos de fixação dos trilhos do caminho de rolamento, inspecionar as soldas das vigas principais e fazer o teste de carga estática/dinâmica, com laudo técnico assinado por Engenheiro Mecânico",
    ],
  },
];
