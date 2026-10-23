// Hierarquia do menu Parâmetros (decisões 34 e 38). Só dados: o AppSidebar desenha.
export type NomeIcone =
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
  { aba: "compras", titulo: "Compras", icone: "ShoppingCart" },
  { aba: "historico", titulo: "Histórico do empregado", icone: "History" },
  { aba: "baixas", titulo: "Baixar Definitivas", icone: "PackageMinus" },
  { aba: "entrega", titulo: "Entrega EPI", icone: "PackageCheck" },
  { aba: "termo-entrega", titulo: "Termo de Entrega", icone: "FileSignature" },
  { aba: "ficha-avulsa", titulo: "Ficha de EPI Avulsa", icone: "ClipboardList" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
];

export const ABAS_UNIFORME: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard", icone: "LayoutDashboard" },
  { aba: "estoque", titulo: "Estoque", icone: "Boxes" },
  { aba: "movimentacoes", titulo: "Movimentações", icone: "ArrowLeftRight" },
  { aba: "compras", titulo: "Compras", icone: "ShoppingCart" },
  { aba: "historico", titulo: "Histórico do empregado", icone: "History" },
  { aba: "baixas", titulo: "Baixar Definitivas", icone: "PackageMinus" },
  { aba: "entrega", titulo: "Entrega Uniforme", icone: "PackageCheck" },
  { aba: "termo-entrega", titulo: "Termo de Entrega", icone: "FileSignature" },
  { aba: "termo-baixa", titulo: "Termo de Baixa", icone: "FileMinus" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
];

export const ABAS_FERRAMENTA: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard", icone: "LayoutDashboard" },
  { aba: "estoque", titulo: "Estoque", icone: "Boxes" },
  { aba: "caixas", titulo: "Número da caixa", icone: "Box" },
  { aba: "termo-responsabilidade", titulo: "Termo de responsabilidade individual", icone: "FileSignature" },
  { aba: "termo-encerramento", titulo: "Termo de encerramento responsabilidade", icone: "FileX" },
  { aba: "termo-vistoria", titulo: "Termo de vistoria periódica", icone: "ClipboardCheck" },
  { aba: "movimentacoes", titulo: "Movimentações", icone: "ArrowLeftRight" },
  { aba: "ocorrencias", titulo: "Ocorrências", icone: "TriangleAlert" },
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
];

// Parâmetros > Uniformes (decisão 48): Cadastrar Uniforme, no mesmo desenho do Cadastrar EPI.
export const MENU_UNIFORMES: readonly ItemMenu[] = [
  { titulo: "Cadastrar Uniforme", url: "/uniformes-cadastrar", icone: "Tags" },
  ...itensApoio("uniformes"),
];

// Parâmetros > Veículos (decisões 46, 52 e 62): o cadastro da frota, a página Manutenção (ações de manutenção e plano de manutenções, decisão 112), os tipos de ocorrência, os itens de check list, os Parâmetros Específicos e, por último, o Questionário de Despesas (decisão 198).
export const MENU_VEICULOS: readonly ItemMenu[] = [
  { titulo: "Cadastro de Veículos", url: "/cadastros/veiculos", icone: "Car" },
  { titulo: "Manutenção", url: "/cadastros/veiculos-manutencao", icone: "Wrench" },
  { titulo: "Tipos de ocorrência", url: "/cadastros/veiculos-tipos-ocorrencia", icone: "ClipboardList" },
  { titulo: "Check list", url: "/cadastros/veiculos-checklist", icone: "ListChecks" },
  itemEspecificos("veiculos"),
  { titulo: "Questionário de Despesas", url: "/cadastros/veiculos-questionario-despesas", icone: "ListPlus" },
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

// Parâmetros > EPI (decisão 37): "Cadastrar Ficha de EPI" fica dentro de "Cadastrar EPI".
export const MENU_EPI: readonly ItemComFilhos[] = [
  {
    titulo: "Cadastrar EPI",
    url: "/epi-cadastrar",
    icone: "Tags",
    filhos: [{ titulo: "Cadastrar Ficha de EPI", url: "/epi-ficha", icone: "ClipboardList" }],
  },
  ...itensApoio("epi"),
];

// Aba aberta de um módulo: a pedida em ?aba= se existir nele, senão a primeira.
export function abaDoModulo(modulo: "epi" | "uniforme" | "ferramenta" | "veiculo" | "viagem" | "equipamento", aba: string | undefined): string {
  const abas = { epi: ABAS_EPI, uniforme: ABAS_UNIFORME, ferramenta: ABAS_FERRAMENTA, veiculo: ABAS_VEICULO, viagem: ABAS_VIAGEM, equipamento: ABAS_EQUIPAMENTO }[modulo];
  return abas.find((a) => a.aba === aba)?.aba ?? abas[0]!.aba;
}
