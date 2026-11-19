// Hierarquia do menu Parâmetros (decisões 34 e 38). Só dados: o AppSidebar desenha.
export type NomeIcone =
  | "CalendarDays"
  | "UserCheck"
  | "Tags"
  | "Ruler"
  | "ListChecks"
  | "Barcode"
  | "Factory"
  | "MapPin"
  | "Hash"
  | "Wrench"
  | "HardHat"
  | "ClipboardList"
  | "Archive"
  | "Car"
  | "LayoutDashboard"
  | "Boxes"
  | "ShoppingCart"
  | "History"
  | "PackageMinus"
  | "PackageCheck"
  | "FileSignature"
  | "FileMinus"
  | "FileCheck"
  | "FileX"
  | "ClipboardCheck"
  | "ArrowLeftRight"
  | "TriangleAlert"
  | "Fuel"
  | "Box"
  | "ListPlus"
  | "FileText"
  | "Forklift";
// Submenus no menu lateral (decisão 43): cada aba antiga vira um item que abre a tela com ?aba=.
export type AbaMenu = { aba: string; titulo: string; icone: NomeIcone; soAdmin?: boolean };
export type DeMenu = "epi" | "uniformes" | "ferramentas" | "veiculos";
// `de`: em que menu o item aparece quando a mesma tela está em mais de um (decisão 86); vai na URL como ?de=.
export type ItemMenu = { titulo: string; url: string; icone: NomeIcone; soAdmin?: boolean; search?: { aba: string }; de?: DeMenu };
export type ItemComFilhos = ItemMenu & { filhos?: readonly ItemMenu[] };
export type GrupoMenu = { titulo: string; filhos: readonly ItemMenu[] };

export const ABAS_EPI: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard", icone: "LayoutDashboard" },
  { aba: "estoque", titulo: "Estoque", icone: "Boxes" },
  { aba: "compras", titulo: "Entrada no Estoque", icone: "ShoppingCart" },
  { aba: "entrega", titulo: "Entrega EPI", icone: "PackageCheck" },
  { aba: "termo-entrega", titulo: "Termo de Entrega", icone: "FileSignature" },
  { aba: "ficha-avulsa", titulo: "Ficha de EPI Avulsa", icone: "ClipboardList" },
  { aba: "ordem-servico", titulo: "Ordem de Serviço", icone: "FileText" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
];

// EPI > Relatórios (decisão 359): as três rotinas de consulta saíram da lista do Módulo e ficam só aqui. As abas mantêm os endereços de sempre
// (?aba=sugestao-compras, historico e baixas), então links e favoritos antigos continuam abrindo as mesmas telas.
export const ABAS_EPI_RELATORIOS: readonly AbaMenu[] = [
  { aba: "sugestao-compras", titulo: "Sugestão de Compras", icone: "ClipboardList" },
  { aba: "historico", titulo: "Histórico do empregado", icone: "History" },
  { aba: "baixas", titulo: "Baixas definitivas", icone: "PackageMinus" },
  { aba: "inventario", titulo: "Inventário (contagem física)", icone: "ClipboardCheck" },
  { aba: "consulta", titulo: "Monte sua consulta", icone: "ListChecks" },
];

// Uniformes > Relatórios (decisão 364): como no EPI, Histórico do empregado e Baixas definitivas saem da lista do Módulo e ficam só aqui, com os mesmos endereços de sempre
// (?aba=historico e baixas). A Sugestão de Compras entra aqui com a mesma lógica do EPI (?aba=sugestao-compras) e saiu da aba Compras.
export const ABAS_UNIFORME_RELATORIOS: readonly AbaMenu[] = [
  { aba: "sugestao-compras", titulo: "Sugestão de Compras", icone: "ClipboardList" },
  { aba: "historico", titulo: "Histórico do empregado", icone: "History" },
  { aba: "baixas", titulo: "Baixas definitivas", icone: "PackageMinus" },
  { aba: "inventario", titulo: "Inventário (contagem física)", icone: "ClipboardCheck" },
  { aba: "consulta", titulo: "Monte sua consulta", icone: "ListChecks" },
];

export const ABAS_UNIFORME: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard", icone: "LayoutDashboard" },
  { aba: "estoque", titulo: "Estoque", icone: "Boxes" },
  { aba: "compras", titulo: "Entrada no Estoque", icone: "ShoppingCart" },
  { aba: "entrega", titulo: "Entrega Uniforme", icone: "PackageCheck" },
  { aba: "termo-entrega", titulo: "Termo de Entrega", icone: "FileSignature" },
  { aba: "termo-baixa", titulo: "Termo de Baixa", icone: "FileMinus" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
];

export const ABAS_FERRAMENTA: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard", icone: "LayoutDashboard" },
  { aba: "estoque", titulo: "Estoque", icone: "Boxes" },
  { aba: "movimentacoes", titulo: "Movimentações", icone: "ArrowLeftRight" },
  { aba: "caixas", titulo: "Número da caixa", icone: "Box" },
  { aba: "vinculacao-portador", titulo: "Vinculação de portador", icone: "UserCheck" },
  { aba: "termo-responsabilidade", titulo: "Termo de responsabilidade individual", icone: "FileSignature" },
  { aba: "termo-encerramento", titulo: "Termo de encerramento responsabilidade", icone: "FileX" },
  { aba: "termo-vistoria", titulo: "Termo de vistoria periódica", icone: "ClipboardCheck" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
];

// Ferramentas > Relatórios: as mesmas três rotinas de EPI e Uniformes, com os mesmos endereços (?aba=sugestao-compras, historico e baixas), e Ferramentas por caixas (o antigo botão Relatório de Número da caixa).
export const ABAS_FERRAMENTA_RELATORIOS: readonly AbaMenu[] = [
  { aba: "sugestao-compras", titulo: "Sugestão de Compras", icone: "ClipboardList" },
  { aba: "historico", titulo: "Histórico do empregado", icone: "History" },
  { aba: "baixas", titulo: "Baixas definitivas", icone: "PackageMinus" },
  { aba: "entradas-saidas", titulo: "Entradas e saídas", icone: "ArrowLeftRight" },
  { aba: "ferramentas-por-caixa", titulo: "Ferramentas por caixas", icone: "Archive" },
  { aba: "inventario", titulo: "Inventário (contagem física)", icone: "ClipboardCheck" },
  { aba: "consulta", titulo: "Monte sua consulta", icone: "ListChecks" },
];

export const ABAS_VEICULO: readonly AbaMenu[] = [
  { aba: "frota", titulo: "Frota", icone: "Car" },
  { aba: "abastecimento", titulo: "Abastecimento", icone: "Fuel" },
  { aba: "manutencao", titulo: "Manutenção", icone: "Wrench" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
  { aba: "checklist", titulo: "Check list", icone: "ListChecks" },
];

// Equipamentos: a mesma lógica dos controles de Veículos, voltada a equipamentos (horímetro no lugar do km).
export const ABAS_EQUIPAMENTO: readonly AbaMenu[] = [
  { aba: "inventario", titulo: "Inventário dos Equipamentos", icone: "Forklift" },
  { aba: "indicadores", titulo: "Indicadores", icone: "LayoutDashboard" },
  { aba: "abastecimento", titulo: "Abastecimento", icone: "Fuel" },
  { aba: "manutencao", titulo: "Manutenção", icone: "Wrench" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
  { aba: "checklist-manutencao", titulo: "Check list de Manutenção", icone: "ClipboardCheck" },
  { aba: "checklist-vistoria", titulo: "Check list de vistoria", icone: "ListChecks" },
];

// Viagens (decisão 176): o painel é a primeira aba; o relatório entra na etapa 4.
export const ABAS_VIAGEM: readonly AbaMenu[] = [
  { aba: "painel", titulo: "Painel", icone: "LayoutDashboard" },
  { aba: "relatorio", titulo: "Relatório", icone: "FileText" },
];

// Tabelas de Apoio e Tamanho e Medidas de Produto ficam dentro de EPI, Uniformes e Ferramentas (decisão 86): é a mesma
// tela nos três menus (cadastro e associação juntos, decisão 89), e ?de= diz de qual deles a pessoa veio, para marcar só aquele no menu lateral.
export const URLS_APOIO: readonly string[] = ["/cadastros/gerais/categorias", "/cadastros/gerais/tamanhos-unidades"];
// "Parâmetros Específicos" (decisão 91, antes Tabelas de Apoio): abre direto na categoria do menu de origem.
export const itemEspecificos = (de: DeMenu): ItemMenu => ({ titulo: "Parâmetros Específicos", url: URLS_APOIO[0]!, icone: "Tags", de });
export const itensApoio = (de: DeMenu): readonly ItemMenu[] => [
  itemEspecificos(de),
  { titulo: "Tamanho e Medidas de Produto", url: URLS_APOIO[1]!, icone: "Ruler", de },
];

export const MENU_GERAIS: readonly (ItemMenu | GrupoMenu)[] = [
  { titulo: "Código do Produto", url: "/cadastros/gerais/codigo-produto", icone: "Barcode" },
  { titulo: "Código de Fábrica", url: "/cadastros/gerais/codigo-fabrica", icone: "Factory" },
  { titulo: "Endereçamento", url: "/cadastros/gerais/enderecamento", icone: "MapPin" },
];

// Parâmetros > Ferramentas (decisões 36 e 54): Cadastrar Caixa, que abre direto em Habilitar caixas
// (só Administrador), e Cadastrar Ferramenta. Nada disso fica em Módulos.
export const MENU_FERRAMENTAS: readonly ItemMenu[] = [
  { titulo: "Cadastrar Caixa", url: "/caixas-ferramentas", icone: "Archive", soAdmin: true, search: { aba: "habilitar" } },
  { titulo: "Cadastrar Ferramenta", url: "/cadastros/ferramentas", icone: "Wrench" },
  // Sem Tamanho e Medidas de Produto: ferramenta não tem tamanho (decisão 115).
  itemEspecificos("ferramentas"),
  // Antes "Escalonamento de vistorias", no módulo: é parâmetro, então fica aqui (a periodicidade vem dos Parâmetros Específicos).
  { titulo: "Plano de vistorias", url: "/cadastros/ferramentas-plano-vistorias", icone: "CalendarDays" },
];

// Parâmetros > Uniformes (decisão 48): Cadastrar Uniforme, no mesmo desenho do Cadastrar EPI.
export const MENU_UNIFORMES: readonly ItemMenu[] = [
  { titulo: "Cadastrar Uniforme", url: "/uniformes-cadastrar", icone: "Tags" },
  ...itensApoio("uniformes"),
];

// Parâmetros > Veículos (decisões 46, 52 e 62): o cadastro da frota, a página Manutenção (ações de manutenção e plano de manutenções, decisão 112), os tipos de ocorrência, os itens de check list, e os Parâmetros Específicos. O Questionário de Despesas foi para Parâmetros > Viagens (decisão 299).
export const MENU_VEICULOS: readonly ItemMenu[] = [
  { titulo: "Cadastro de Veículos", url: "/cadastros/veiculos", icone: "Car" },
  { titulo: "Manutenção", url: "/cadastros/veiculos-manutencao", icone: "Wrench" },
  { titulo: "Tipos de ocorrência", url: "/cadastros/veiculos-tipos-ocorrencia", icone: "ClipboardList" },
  { titulo: "Check list", url: "/cadastros/veiculos-checklist", icone: "ListChecks" },
  itemEspecificos("veiculos"),
];

// Parâmetros > Viagens (decisão 299): o Questionário de Despesas (que estava em Veículos) e os Parâmetros Específicos, com a escolha dos empregados habilitados a lançar despesas.
export const MENU_VIAGENS: readonly ItemMenu[] = [
  { titulo: "Questionário de Despesas", url: "/cadastros/viagens-questionario-despesas", icone: "ListPlus" },
  { titulo: "Parâmetros Específicos", url: "/cadastros/viagens-especificos", icone: "Tags" },
];

// Parâmetros > Equipamentos: os dados cadastrados aqui alimentam o módulo Equipamentos (a lógica do módulo vem depois).
export const MENU_EQUIPAMENTOS: readonly ItemMenu[] = [
  { titulo: "Cadastrar equipamento", url: "/cadastros/equipamentos", icone: "Forklift" },
  // Como em Veículos: ações de manutenção e plano por equipamento, e os tipos de ocorrência.
  { titulo: "Manutenção", url: "/cadastros/equipamentos-manutencao", icone: "Wrench" },
  { titulo: "Tipos de ocorrência", url: "/cadastros/equipamentos-tipos-ocorrencia", icone: "ClipboardList" },
  // Check list de manutenção e de vistoria: itens por tipo de equipamento e associação a cada equipamento.
  { titulo: "Check list de manutenção", url: "/cadastros/equipamentos-checklist", icone: "ClipboardCheck", search: { aba: "manutencao" } },
  { titulo: "Check list de vistoria", url: "/cadastros/equipamentos-checklist", icone: "ClipboardCheck", search: { aba: "vistoria" } },
  // Subcategorias (pai) e tipos (filho) de equipamento, o endereçamento de estoque e os indicadores.
  { titulo: "Parâmetros Específicos", url: "/cadastros/equipamentos-especificos", icone: "Tags" },
];

// URLs de Gerais, para o destaque do grupo.
export const URLS_GERAIS: readonly string[] = MENU_GERAIS.flatMap((i) => ("filhos" in i ? i.filhos.map((f) => f.url) : [i.url]));

// Parâmetros > EPI (decisão 37): "Cadastrar Ficha de EPI" e, depois, "Cadastrar Ordem de Serviço" ficam dentro de "Cadastrar EPI".
export const MENU_EPI: readonly ItemComFilhos[] = [
  {
    titulo: "Cadastrar EPI",
    url: "/epi-cadastrar",
    icone: "Tags",
    filhos: [
      { titulo: "Cadastrar Ficha de EPI", url: "/epi-ficha", icone: "ClipboardList" },
      { titulo: "Cadastrar Ordem de Serviço", url: "/epi-ordem-servico", icone: "FileText" },
    ],
  },
  ...itensApoio("epi"),
];

// Aba aberta de um módulo: a pedida em ?aba= se existir nele, senão a primeira.
type ModuloComAbas = "epi" | "uniforme" | "ferramenta" | "veiculo" | "viagem" | "equipamento";
const ABAS_EPI_COM_RELATORIOS: readonly AbaMenu[] = [...ABAS_EPI, ...ABAS_EPI_RELATORIOS];
const ABAS_UNIFORME_COM_RELATORIOS: readonly AbaMenu[] = [...ABAS_UNIFORME, ...ABAS_UNIFORME_RELATORIOS];
const ABAS_FERRAMENTA_COM_RELATORIOS: readonly AbaMenu[] = [...ABAS_FERRAMENTA, ...ABAS_FERRAMENTA_RELATORIOS];
const ABAS_DO_MODULO = (modulo: ModuloComAbas): readonly AbaMenu[] =>
  ({ epi: ABAS_EPI_COM_RELATORIOS, uniforme: ABAS_UNIFORME_COM_RELATORIOS, ferramenta: ABAS_FERRAMENTA_COM_RELATORIOS, veiculo: ABAS_VEICULO, viagem: ABAS_VIAGEM, equipamento: ABAS_EQUIPAMENTO })[modulo];
export function abaDoModulo(modulo: ModuloComAbas, aba: string | undefined): string {
  const abas = ABAS_DO_MODULO(modulo);
  return abas.find((a) => a.aba === aba)?.aba ?? abas[0]!.aba;
}
// Nome da aba aberta (Frota, Painel, Estoque...): é o título grande da página do módulo (decisão 301), no lugar do nome do módulo.
export function tituloDaAba(modulo: ModuloComAbas, aba: string | undefined): string {
  const abas = ABAS_DO_MODULO(modulo);
  return (abas.find((a) => a.aba === aba) ?? abas[0]!).titulo;
}

// Texto abaixo do nome da tela (decisão 424): cada aba explica o que ela faz, no lugar de repetir a descrição do módulo.
const OCORR = "Registra e acompanha as ocorrências ligadas aos itens do módulo, com a situação e o tratamento de cada uma.";
const DESCRICAO_DAS_ABAS: Record<ModuloComAbas, Record<string, string>> = {
  epi: {
    dashboard: "Resumo do estoque de EPIs: itens consultados, saídas recentes, valor em estoque e alertas de reposição.",
    estoque: "Consulta o saldo de cada EPI por empresa e tamanho, separado em novos e usados, e permite ajustar o estoque mínimo que gera os alertas.",
    compras: "Registra a entrada de EPIs no estoque (compra, nota fiscal ou devolução), com fornecedor, CA, tamanho e valor.",
    entrega: "Lança a entrega de EPIs ao empregado, ou a devolução, e atualiza o saldo do estoque.",
    "termo-entrega": "Gera o termo de entrega de EPI para o empregado assinar. O termo só documenta a entrega e não movimenta o estoque.",
    "ficha-avulsa": "Gera a ficha de controle de EPI de um empregado, com o histórico de entregas, devoluções e baixas, pronta para impressão.",
    "ordem-servico": "Emite a ordem de serviço de segurança do empregado, conforme a função e o setor cadastrados.",
    ocorrencias: OCORR,
    "sugestao-compras": "Indica o que comprar e em que quantidade, com base no consumo, no estoque e nos parâmetros de compra do módulo.",
    historico: "Mostra, por empregado, o que recebeu, devolveu e baixou e o que está em posse dele.",
    baixas: "Lista as baixas definitivas de EPIs, com motivo, quantidade e valor, por período, para consulta e exportação.",
    consulta: "Relatório sob demanda: marque os campos que quer cruzar e o que somar, veja o resultado na hora e salve a consulta no seu perfil.",
    inventario: "Inventário em etapas: escolha o setor, conte o que está na prateleira, revise as diferenças com o sistema e baixe o relatório. É conferência: não movimenta o estoque.",
  },
  uniforme: {
    dashboard: "Resumo do estoque de uniformes: itens consultados, saídas recentes, valor em estoque e alertas de reposição.",
    estoque: "Consulta o saldo de cada uniforme por empresa e tamanho, separado em novos e usados, e permite ajustar o estoque mínimo que gera os alertas.",
    compras: "Registra a entrada de uniformes no estoque (compra, nota fiscal ou devolução), com fornecedor, tamanho e valor.",
    entrega: "Lança a entrega de uniformes ao empregado, ou a devolução, e atualiza o saldo do estoque.",
    "termo-entrega": "Gera o termo de entrega de uniforme para o empregado assinar. O termo só documenta a entrega e não movimenta o estoque.",
    "termo-baixa": "Gera o termo de baixa de uniforme do empregado, para documentar a baixa definitiva. É só um documento: não movimenta o estoque.",
    ocorrencias: OCORR,
    "sugestao-compras": "Indica o que comprar e em que quantidade, com base no consumo, no estoque e nos parâmetros de compra dos uniformes.",
    historico: "Mostra, por empregado, o que recebeu, devolveu e baixou e o que está em posse dele.",
    baixas: "Lista as baixas definitivas de uniformes, com motivo, quantidade e valor, por período, para consulta e exportação.",
    consulta: "Relatório sob demanda: marque os campos que quer cruzar e o que somar, veja o resultado na hora e salve a consulta no seu perfil.",
    inventario: "Inventário em etapas: escolha o setor, conte o que está na prateleira, revise as diferenças com o sistema e baixe o relatório. É conferência: não movimenta o estoque.",
  },
  ferramenta: {
    dashboard: "Resumo do estoque de ferramentas: quantas estão acima do mínimo, guardadas nas caixas, com empregado ou fora das caixas, e as que pedem reposição.",
    estoque: "Consulta o saldo de cada ferramenta por empresa, a posição de cada uma nas caixas e com os empregados, e permite ajustar o estoque mínimo.",
    caixas: "Mostra as caixas de ferramentas e quais ferramentas estão guardadas em cada uma.",
    "termo-responsabilidade": "Gera o termo de responsabilidade individual do empregado pelas ferramentas que recebeu.",
    "termo-encerramento": "Gera o termo que encerra a responsabilidade do empregado sobre as ferramentas devolvidas.",
    "termo-vistoria": "Gera o termo da vistoria periódica das ferramentas que estão com o empregado.",
    movimentacoes: "Controla a entrada no estoque (nova ou usada), a saída do estoque para a caixa, a reposição, a baixa definitiva (com o motivo e a ocorrência para apurar a responsabilidade) e a transferência entre caixas. A ferramenta se liga à caixa, não a uma pessoa.",
    "vinculacao-portador": "Vincula e desvincula o portador de cada caixa, com a data, a autorização do supervisor quando a data é anterior a hoje e o termo de encerramento com a vistoria da caixa.",
    "sugestao-compras": "Indica quais ferramentas repor e em que quantidade, pelo estoque mínimo e pelas baixas definitivas dos últimos 12 meses.",
    historico: "Mostra, por empregado, as ferramentas que recebeu, devolveu e baixou e as que estão em posse dele.",
    baixas: "Lista as baixas definitivas de ferramentas, com motivo, quantidade e valor, por período, para consulta e exportação.",
    consulta: "Relatório sob demanda: marque os campos que quer cruzar e o que somar, veja o resultado na hora e salve a consulta no seu perfil.",
    inventario: "Inventário em etapas: escolha o setor, conte o que está na prateleira, revise as diferenças com o sistema e baixe o relatório. É conferência: não movimenta o estoque.",
    "entradas-saidas": "Entradas e saídas de ferramentas por caixa e por empregado, com o motivo de cada saída.",
    "ferramentas-por-caixa": "Gera o relatório das caixas de ferramentas: você escolhe as caixas e as seções (ferramentas, histórico e ocorrências) que entram.",
    ocorrencias: OCORR,
  },
  veiculo: {
    frota: "Lista a frota com o extrato de cada veículo, os indicadores de conformidade e custo por km e os dados de cada veículo.",
    abastecimento: "Registra os abastecimentos de cada veículo e calcula litros, gasto e média de consumo.",
    manutencao: "Acompanha as revisões e manutenções do plano de cada veículo: o que está em dia e o que venceu.",
    ocorrencias: "Registra e acompanha as ocorrências dos veículos, com a situação e o tratamento de cada uma.",
    checklist: "Faz os check lists periódicos e avulsos dos veículos e acompanha o que foi feito no prazo.",
  },
  viagem: {
    painel: "Registra as despesas de viagens e saídas externas dos técnicos, com os comprovantes, e mostra o painel dos gastos.",
    relatorio: "Emite o relatório de despesas de viagens por empregado e período, com os comprovantes prontos para impressão.",
  },
  equipamento: {
    inventario: "Lista os equipamentos com o extrato de cada um: abastecimentos, manutenções, ocorrências e custo.",
    indicadores: "Mostra os indicadores de gestão dos equipamentos: disponibilidade, custo de manutenção por hora, aderência ao plano e conformidade legal.",
    abastecimento: "Registra os abastecimentos dos equipamentos e calcula litros, gasto e preço médio por litro.",
    manutencao: "Registra e acompanha as manutenções dos equipamentos, preventivas e corretivas, com o custo de cada uma.",
    ocorrencias: "Registra e acompanha as ocorrências dos equipamentos, com a situação e o tratamento de cada uma.",
    "checklist-manutencao": "Faz o check list de manutenção dos equipamentos e acompanha o que foi realizado.",
    "checklist-vistoria": "Faz o check list de vistoria dos equipamentos e acompanha o que foi realizado.",
  },
};
export const descricaoDaAba = (modulo: ModuloComAbas, aba: string | undefined, padrao: string): string =>
  DESCRICAO_DAS_ABAS[modulo][abaDoModulo(modulo, aba)] ?? padrao;
