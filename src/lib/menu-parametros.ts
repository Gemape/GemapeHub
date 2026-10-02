// Hierarquia do menu Parâmetros (decisão 34). Só dados: o AppSidebar desenha.
export type NomeIcone = "Tags" | "Ruler" | "ListChecks" | "Barcode" | "Factory" | "MapPin" | "Hash" | "Wrench";
export type ItemMenu = { titulo: string; url: string; icone: NomeIcone; soAdmin?: boolean };
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

// Caixas (parâmetro) fica dentro de Ferramentas; a tela operacional continua em Módulos.
export const SUBMENU_FERRAMENTAS: readonly ItemMenu[] = [
  { titulo: "Cadastro de Ferramentas", url: "/cadastros/ferramentas", icone: "Wrench" },
  { titulo: "Caixas", url: "/cadastros/gerais/caixas", icone: "Hash", soAdmin: true },
];

// URLs de Gerais, para o destaque do grupo (Caixas não conta: pertence a Ferramentas).
export const URLS_GERAIS: readonly string[] = MENU_GERAIS.flatMap((i) => ("filhos" in i ? i.filhos.map((f) => f.url) : [i.url]));
