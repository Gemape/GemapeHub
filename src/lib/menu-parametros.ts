// Hierarquia do menu Parâmetros (decisões 34 e 38). Só dados: o AppSidebar desenha.
export type NomeIcone = "Tags" | "Ruler" | "ListChecks" | "Barcode" | "Factory" | "MapPin" | "Hash" | "Wrench" | "HardHat" | "ClipboardList" | "Archive" | "Car";
// Submenus no menu lateral (decisão 43): cada aba antiga vira um item que abre a tela com ?aba=.
export type AbaMenu = { aba: string; titulo: string; soAdmin?: boolean };
export type ItemMenu = { titulo: string; url: string; icone: NomeIcone; soAdmin?: boolean; abas?: readonly AbaMenu[]; search?: { aba: string } };
export type ItemComFilhos = ItemMenu & { filhos?: readonly ItemMenu[] };
export type GrupoMenu = { titulo: string; filhos: readonly ItemMenu[] };

export const ABAS_EPI: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard" },
  { aba: "estoque", titulo: "Estoque" },
  { aba: "compras", titulo: "Compras" },
  { aba: "historico", titulo: "Histórico do empregado" },
  { aba: "baixas", titulo: "Baixar Definitivas" },
  { aba: "termo-entrega", titulo: "Termo de Entrega" },
  { aba: "ficha-avulsa", titulo: "Ficha de EPI Avulsa" },
  { aba: "ocorrencias", titulo: "Ocorrências" },
];

export const ABAS_UNIFORME: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard" },
  { aba: "estoque", titulo: "Estoque" },
  { aba: "movimentacoes", titulo: "Movimentações" },
  { aba: "compras", titulo: "Compras" },
  { aba: "historico", titulo: "Histórico Empregado" },
  { aba: "baixas", titulo: "Baixas Definitivas" },
  { aba: "termo-entrega", titulo: "Termo de Entrega" },
  { aba: "termo-baixa", titulo: "Termo de Baixa" },
  { aba: "ocorrencias", titulo: "Ocorrências" },
];

export const ABAS_FERRAMENTA: readonly AbaMenu[] = [
  { aba: "dashboard", titulo: "Dashboard" },
  { aba: "estoque", titulo: "Estoque" },
  { aba: "caixas", titulo: "Número da caixa" },
  { aba: "termo-responsabilidade", titulo: "Termo de responsabilidade individual" },
  { aba: "termo-encerramento", titulo: "Termo de encerramento responsabilidade" },
  { aba: "termo-vistoria", titulo: "Termo de vistoria periódica" },
  { aba: "movimentacoes", titulo: "Movimentações" },
  { aba: "ocorrencias", titulo: "Ocorrências" },
];

export const ABAS_VEICULO: readonly AbaMenu[] = [
  { aba: "frota", titulo: "Frota" },
  { aba: "abastecimento", titulo: "Abastecimento" },
  { aba: "manutencao", titulo: "Manutenção" },
  { aba: "movimentacoes", titulo: "Movimentações" },
  { aba: "ocorrencias", titulo: "Ocorrências" },
];

export const ABAS_TAMANHOS: readonly AbaMenu[] = [
  { aba: "cadastro", titulo: "Cadastro" },
  { aba: "associar", titulo: "Associar ao produto" },
];

export const MENU_GERAIS: readonly (ItemMenu | GrupoMenu)[] = [
  { titulo: "Tabelas de Apoio", url: "/cadastros/gerais/categorias", icone: "Tags" },
  { titulo: "Tamanho e Medidas de Produto", url: "/cadastros/gerais/tamanhos-unidades", icone: "Ruler", abas: ABAS_TAMANHOS },
  { titulo: "Código do Produto", url: "/cadastros/gerais/codigo-produto", icone: "Barcode" },
  { titulo: "Código de Fábrica", url: "/cadastros/gerais/codigo-fabrica", icone: "Factory" },
  { titulo: "Endereçamento", url: "/cadastros/gerais/enderecamento", icone: "MapPin" },
];

// Parâmetros > Ferramentas (decisões 36 e 54): Cadastrar Caixa, que abre direto em Habilitar caixas
// (só Administrador), e Cadastrar Ferramenta. Nada disso fica em Módulos.
export const MENU_FERRAMENTAS: readonly ItemMenu[] = [
  { titulo: "Cadastrar Caixa", url: "/caixas-ferramentas", icone: "Archive", soAdmin: true, search: { aba: "habilitar" } },
  { titulo: "Cadastrar Ferramenta", url: "/cadastros/ferramentas", icone: "Wrench" },
];

// Parâmetros > Uniformes (decisão 48): Cadastrar Uniforme, no mesmo desenho do Cadastrar EPI.
export const MENU_UNIFORMES: readonly ItemMenu[] = [
  { titulo: "Cadastrar Uniforme", url: "/uniformes-cadastrar", icone: "Tags" },
];

// Parâmetros > Veículos (decisões 46, 52 e 62): o cadastro da frota, as listas de apoio (ações de manutenção, tipos de ocorrência e itens de check list) e o plano de manutenções.
export const MENU_VEICULOS: readonly ItemMenu[] = [
  { titulo: "Cadastro de Veículos", url: "/cadastros/veiculos", icone: "Car" },
  { titulo: "Ações de manutenção", url: "/cadastros/veiculos-acoes-manutencao", icone: "Wrench" },
  { titulo: "Plano de manutenções", url: "/cadastros/veiculos-plano-manutencao", icone: "ListChecks" },
  { titulo: "Tipos de ocorrência", url: "/cadastros/veiculos-tipos-ocorrencia", icone: "ClipboardList" },
  { titulo: "Itens check list", url: "/cadastros/veiculos-checklist", icone: "ListChecks" },
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
];

// Aba aberta de um módulo: a pedida em ?aba= se existir nele, senão a primeira.
export function abaDoModulo(modulo: "epi" | "uniforme" | "ferramenta" | "veiculo", aba: string | undefined): string {
  const abas = { epi: ABAS_EPI, uniforme: ABAS_UNIFORME, ferramenta: ABAS_FERRAMENTA, veiculo: ABAS_VEICULO }[modulo];
  return abas.find((a) => a.aba === aba)?.aba ?? abas[0]!.aba;
}
