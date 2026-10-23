// Ações de manutenção já disponíveis para cada tipo de equipamento (lista fornecida pela Gemape): um grupo por rotina, valendo só para o tipo.
// Entram no check list de manutenção pelo botão "Cadastrar padrão".
export type GrupoPadrao = { tipoId: string; nome: string; itens: readonly string[] };

const GRUPOS_PERIODICOS_MANUTENCAO: readonly GrupoPadrao[] = [
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

// Ações de manutenção do padrão inicial de Parâmetros > Equipamentos > Manutenção (lista fornecida pela Gemape): um pai por rotina de cada família de
// equipamento, com os subitens (filhos). O nome do pai leva a família ("Geradores · Revisão do sistema..."), como os grupos de check list de Veículos.
// Todo pai tem também o subitem Outros, de descrição aberta, acrescentado ao gravar.
const LUBRIFICACAO = "Revisão do sistema de lubrificação e filtros";
const TRANSMISSAO = "Revisão do sistema de transmissão e fluidos";
const ELETRICO = "Revisão do sistema elétrico e iluminação";
const FAMILIAS: readonly { familia: string; acoes: readonly (readonly [string, readonly string[]])[] }[] = [
  { familia: "Geradores (todas as potências)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Troca de filtro de óleo", "Troca de filtro de ar", "Troca de filtro de combustível"]],
    [TRANSMISSAO, ["Troca/verificação do líquido de arrefecimento"]],
    [ELETRICO, ["Troca de bateria", "Troca de velas de ignição (se aplicável a gasolina)", "Reparo no alternador", "Reparo no motor de partida", "Substituição de lâmpadas de sinalização/painel"]],
    ["Outros serviços", ["Serviços em painéis de controle, QTA e quadros com tomada associados"]],
  ] },
  { familia: "Empilhadeiras (2,5 ton e Clark C70D)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Filtro de óleo", "Filtro de ar", "Filtro de combustível"]],
    [TRANSMISSAO, ["Fluido de freio", "Líquido de arrefecimento", "Óleo do câmbio", "Fluido da direção hidráulica"]],
    ["Manutenção do sistema de freios", ["Pastilhas/lonas dianteiras e traseiras", "Discos/tambores de freio", "Cilindro mestre"]],
    ["Manutenção de pneus e alinhamento", ["Calibragem", "Troca de pneus industriais", "Vulcanização", "Balanceamento"]],
    ["Revisão de suspensão e direção", ["Amortecedores", "Buchas", "Pivôs", "Terminais de direção", "Molas"]],
    [ELETRICO, ["Troca de bateria", "Substituição de faróis e lanternas de trabalho", "Reparo no alternador e motor de partida"]],
  ] },
  { familia: "Compressores diesel (190 PCM a 900 PCM)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Filtro de óleo", "Filtro de ar do motor", "Filtro de combustível"]],
    [TRANSMISSAO, ["Líquido de arrefecimento", "Óleo do compressor/separador de ar-óleo"]],
    [ELETRICO, ["Troca de bateria", "Reparo no alternador", "Reparo no motor de partida", "Lâmpadas do painel de instrumentos"]],
  ] },
  { familia: "Torres de iluminação diesel", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Filtro de óleo", "Filtro de ar", "Filtro de combustível"]],
    [TRANSMISSAO, ["Líquido de arrefecimento"]],
    [ELETRICO, ["Substituição de lâmpadas (projetores/faróis de alta potência)", "Troca de bateria", "Reparo no alternador", "Reparo no motor de partida"]],
    ["Manutenção de pneus e rodagem", ["Calibragem e troca de pneus do reboque da torre"]],
  ] },
  { familia: "Compactadores de solo e motores (placas reversíveis e percussão)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Filtro de ar", "Filtro de combustível"]],
    [TRANSMISSAO, ["Óleo do sistema de vibração/câmbio"]],
    [ELETRICO, ["Troca de velas de ignição (motores a gasolina)", "Reparo no sistema de partida retrátil/motor de partida"]],
  ] },
  { familia: "Martelos rompedores, perfuradores e pneumáticos (10 kg a 40 kg)", acoes: [
    ["Manutenção operacional e mecânica", ["Limpeza e lubrificação pneumática/mecânica interna", "Troca de retentores", "Troca de ponteiros", "Troca de talhadeiras"]],
    [TRANSMISSAO, ["Lubrificação com óleos específicos para ferramentas pneumáticas (no caso dos pneumáticos)"]],
  ] },
  { familia: "Betoneiras (400 litros, com motor)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor (quando a combustão)", "Lubrificação de mancais, cremalheira e redutores"]],
    [ELETRICO, ["Revisão de chaves liga/desliga, cabos e motores elétricos (se versão elétrica)"]],
  ] },
  { familia: "Motobombas e bombas submersas (2\", 3\", mangote)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor a combustão", "Lubrificação dos selos mecânicos e rolamentos das bombas submersas/mangotes"]],
    ["Manutenção hidráulica", ["Inspeção de rotores", "Inspeção de volutas", "Inspeção de conexões", "Inspeção de vedações"]],
  ] },
  { familia: "Cortadoras de piso a gasolina", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Limpeza/troca do filtro de ar"]],
    [ELETRICO, ["Troca de velas de ignição"]],
    ["Manutenção de corte", ["Inspeção e troca de discos de corte diamantados", "Inspeção e troca de correias de transmissão"]],
  ] },
  { familia: "Motores estacionários e diversos (Agrale, Yanmar, Tobata, etc.)", acoes: [
    [LUBRIFICACAO, ["Troca de óleo do motor", "Substituição de filtros de óleo, ar e combustível"]],
    [TRANSMISSAO, ["Líquido de arrefecimento"]],
    [ELETRICO, ["Troca de velas (gasolina)", "Revisão de bicos e bomba injetora (diesel)", "Troca de bateria", "Motor de partida e alternador"]],
  ] },
  { familia: "Equipamentos de apoio e elétricos (QTA/QTM, painéis, transformadores, lavadora, serras, esmerilhadeiras)", acoes: [
    [ELETRICO, ["Inspeção de conexões e disjuntores em quadros de transferência (QTA/QTM) e painéis com tomada", "Testes em transformadores de energia"]],
    ["Manutenção eletromecânica", ["Troca de escovas de carvão", "Troca de rolamentos", "Verificação de cabos elétricos em ferramentas portáteis (serra mármore, esmerilhadeira 7\", lavadora Karcher HD585)"]],
    ["Inspeção de estruturas", ["Verificação de integridade física em bacias de contenção e reservatórios de abastecimento"]],
  ] },
  // Fica por último: as ações anteriores mantêm a posição, e quem já tinha o padrão recebe só esta (ver aplicarAcoesPadraoUmaVez).
  { familia: "Extintores de incêndio", acoes: [
    ["Manutenção e inspeção de extintores de incêndio", [
      "Inspeção visual mensal: verificar o lacre, o manômetro (pressão na faixa verde), o bico difusor/mangueira e se o extintor está desobstruído e com o acesso livre",
      "Verificação da sinalização e suporte: checar as placas de sinalização de solo/parede e a fixação correta do suporte (de parede ou solo)",
      "Manutenção de 1º nível (recarga e revisão anual): realizada por empresa certificada para recarga do agente extintor e pressurização anual",
      "Teste hidrostático (manutenção de 3º nível): realizado a cada 5 anos (ou conforme norma aplicável para o tipo de extintor, como pó químico, água ou CO2) para testar a resistência do cilindro sob pressão",
    ]],
  ] },
];
export type AcaoPadraoEquipamento = { nome: string; subitens: readonly string[] };
export const ACOES_PADRAO_EQUIPAMENTO: readonly AcaoPadraoEquipamento[] = FAMILIAS.flatMap((f) => f.acoes.map(([acao, subitens]) => ({ nome: `${f.familia} · ${acao}`, subitens })));
// Nome do pai por família e ação, para quem precisa apontar para uma ação do padrão (dados de teste e planos).
export const nomeAcaoPadrao = (familiaInicio: string, acao: string): string => ACOES_PADRAO_EQUIPAMENTO.find((a) => a.nome.startsWith(familiaInicio) && a.nome.endsWith(` · ${acao}`))?.nome ?? `${familiaInicio} · ${acao}`;
export const ROTULOS_ACAO = { LUBRIFICACAO, TRANSMISSAO, ELETRICO } as const;

// Check list avulso (como em Veículos): grupos "Avulso · ..." com os itens mais simples, um por tipo de equipamento, para registrar uma conferência rápida fora do
// check list periódico. Entram no fim de cada padrão, depois dos grupos do periódico.
export const PREFIXO_GRUPO_AVULSO = "Avulso ·";
export const ehGrupoAvulsoEq = (nome: string): boolean => nome.trim().startsWith(PREFIXO_GRUPO_AVULSO);
const TIPOS_AVULSO: readonly (readonly [string, string])[] = [
  ["tipo-empilhadeiras", "Empilhadeiras"], ["tipo-munck", "Munck"], ["tipo-ponte-rolante", "Ponte rolante"], ["tipo-serra-de-corte", "Serra de corte"],
  ["tipo-maquina-de-solda", "Máquina de solda"], ["tipo-compressor-de-ar", "Compressor de ar"], ["tipo-jato-alta-pressao", "Jato de alta pressão"], ["tipo-extintores", "Extintores"],
];
export const GRUPOS_AVULSOS_MANUTENCAO: readonly GrupoPadrao[] = TIPOS_AVULSO.map(([tipoId, nome]) => ({ tipoId, nome: `${PREFIXO_GRUPO_AVULSO} ${nome}`, itens: ({
  "tipo-empilhadeiras": ["Completar o nível de óleo e dos fluidos", "Calibrar os pneus", "Lubrificar as correntes e as articulações", "Limpar o filtro de ar e o radiador"],
  "tipo-munck": ["Lubrificar os pinos e as articulações", "Completar o nível do óleo hidráulico", "Reapertar as fixações", "Limpeza geral"],
  "tipo-ponte-rolante": ["Lubrificar rolamentos e redutores", "Conferir a folga e a fixação do gancho", "Limpar trilhos e carro", "Testar o fim de curso"],
  "tipo-serra-de-corte": ["Trocar o disco desgastado", "Limpar e lubrificar as guias", "Conferir as correias", "Limpeza geral"],
  "tipo-maquina-de-solda": ["Limpar as entradas de ar", "Trocar cabos ou garras danificados", "Reapertar as conexões", "Conferir o gás ou o arame"],
  "tipo-compressor-de-ar": ["Drenar o reservatório", "Completar o óleo", "Limpar o filtro de ar", "Reapertar as conexões"],
  "tipo-jato-alta-pressao": ["Trocar o bico", "Limpar o filtro de entrada de água", "Completar o óleo", "Trocar a mangueira danificada"],
  "tipo-extintores": ["Trocar o lacre", "Fixar o suporte", "Limpar o extintor e a sinalização", "Substituir a etiqueta de inspeção"],
} as Record<string, string[]>)[tipoId]! }));
export const GRUPOS_AVULSOS_VISTORIA: readonly GrupoPadrao[] = TIPOS_AVULSO.map(([tipoId, nome]) => ({ tipoId, nome: `${PREFIXO_GRUPO_AVULSO} ${nome}`, itens: ({
  "tipo-empilhadeiras": ["Limpeza e organização da máquina", "Aparência geral dos pneus e rodas", "Buzina e alarme de ré funcionando", "Cinto de segurança do operador", "Nível de combustível, gás ou carga da bateria"],
  "tipo-munck": ["Lança e cilindros sem vazamentos aparentes", "Gancho e trava de segurança", "Cabos de aço sem fios rompidos visíveis", "Limpeza geral"],
  "tipo-ponte-rolante": ["Botoeira e comandos funcionando", "Gancho e trava de segurança", "Aparência geral do cabo de aço e da corrente", "Sinal sonoro e luminoso"],
  "tipo-serra-de-corte": ["Disco sem trincas e bem fixado", "Proteção do disco no lugar", "Cabos elétricos sem danos", "Área de trabalho limpa"],
  "tipo-maquina-de-solda": ["Cabos e garras sem danos", "Aterramento conectado", "Máscara e EPI disponíveis", "Ventilação e conexões"],
  "tipo-compressor-de-ar": ["Purgar a água do reservatório", "Nível de óleo no visor", "Manômetro na faixa de trabalho", "Vazamentos de ar audíveis"],
  "tipo-jato-alta-pressao": ["Mangueira sem trincas ou bolhas", "Pistola e trava do gatilho", "Nível de óleo e de combustível", "Bico limpo e fixado"],
  "tipo-extintores": ["Lacre intacto", "Ponteiro do manômetro na faixa verde", "Acesso livre e sinalização visível", "Etiqueta de recarga dentro da validade"],
} as Record<string, string[]>)[tipoId]! }));

export const GRUPOS_PADRAO_MANUTENCAO: readonly GrupoPadrao[] = [...GRUPOS_PERIODICOS_MANUTENCAO, ...GRUPOS_AVULSOS_MANUTENCAO];
