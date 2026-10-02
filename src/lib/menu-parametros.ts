// Hierarquia do menu Parâmetros (decisão 34). Só dados: o AppSidebar desenha.
export type NomeIcone = "Tags" | "Ruler" | "ListChecks" | "Barcode" | "Factory" | "MapPin" | "Hash" | "Wrench" | "HardHat" | "ClipboardList" | "Archive";
export type ItemMenu = { titulo: string; url: string; icone: NomeIcone; soAdmin?: boolean };
export type ItemComFilhos = ItemMenu & { filhos?: readonly ItemMenu[] };
export type GrupoMenu = { titulo: string; filhos: readonly ItemMenu[] };

export const MENU_GERAIS: readonly (ItemMenu | GrupoMenu)[] = [
  { titulo: "Tabelas de Apoio", url: "/cadastros/gerais/categorias", icone: "Tags" },
  {
    titulo: "Tamanho e Medidas de Produto",
    filhos: [
      { titulo: "Cadastro de Tamanhos e Medidas", url: "/cadastros/gerais/tamanhos-unidades", icone: "Ruler" },
      { titulo: "Associar Tamanho e Medida ao Produto", url: "/cadastros/gerais/associar-tamanhos", icone: "ListChecks" },
    ],
  },
  { titulo: "Código do Produto", url: "/cadastros/gerais/codigo-produto", icone: "Barcode" },
  { titulo: "Código de Fábrica", url: "/cadastros/gerais/codigo-fabrica", icone: "Factory" },
  { titulo: "Endereçamento", url: "/cadastros/gerais/enderecamento", icone: "MapPin" },
];

// Menu Ferramentas (módulo, decisão 36): a tela Caixas de Ferramentas fica dentro dele e reúne a
// habilitação das caixas, que antes era um parâmetro à parte.
export const MENU_FERRAMENTAS: readonly ItemMenu[] = [
  { titulo: "Controle de Ferramentas", url: "/ferramentas", icone: "Wrench" },
  { titulo: "Caixas de Ferramentas", url: "/caixas-ferramentas", icone: "Archive" },
];

// URLs de Gerais, para o destaque do grupo .
export const URLS_GERAIS: readonly string[] = MENU_GERAIS.flatMap((i) => ("filhos" in i ? i.filhos.map((f) => f.url) : [i.url]));

// Menu EPI (módulo, decisão 35): "Cadastrar Ficha de EPI" fica dentro de "Cadastrar EPI".
export const MENU_EPI: readonly ItemComFilhos[] = [
  { titulo: "Controle de EPI", url: "/epi", icone: "HardHat" },
  {
    titulo: "Cadastrar EPI",
    url: "/epi-cadastrar",
    icone: "Tags",
    filhos: [{ titulo: "Cadastrar Ficha de EPI", url: "/epi-ficha", icone: "ClipboardList" }],
  },
];
