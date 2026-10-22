// Tela inicial (Início): o menu em cartões, nos mesmos grupos do menu lateral. Só dados: a tela desenha.
// Cada cartão abre a primeira tela do item, a mesma que o menu lateral abre.
export type IconeInicio =
  | "LayoutDashboard" | "HardHat" | "Shirt" | "Wrench" | "Car" | "Luggage" | "Forklift"
  | "FolderCog" | "Building2" | "Users" | "Truck" | "Handshake";

export type CartaoInicio = { titulo: string; url: string; icone: IconeInicio; soAdmin?: boolean };
export type GrupoInicio = { titulo: string; cartoes: readonly CartaoInicio[] };

export const GRUPOS_INICIO: readonly GrupoInicio[] = [
  { titulo: "Visão geral", cartoes: [{ titulo: "Dashboard", url: "/dashboard", icone: "LayoutDashboard" }] },
  {
    titulo: "Módulos",
    cartoes: [
      { titulo: "EPIs", url: "/epi", icone: "HardHat" },
      { titulo: "Uniformes", url: "/uniformes", icone: "Shirt" },
      { titulo: "Ferramentas", url: "/ferramentas", icone: "Wrench" },
      { titulo: "Veículos", url: "/veiculos", icone: "Car" },
      { titulo: "Viagens", url: "/viagens", icone: "Luggage" },
      { titulo: "Equipamentos", url: "/equipamentos", icone: "Forklift" },
    ],
  },
  {
    titulo: "Parâmetros",
    cartoes: [
      { titulo: "Gerais", url: "/cadastros/gerais/codigo-produto", icone: "FolderCog", soAdmin: true },
      { titulo: "EPI", url: "/epi-cadastrar", icone: "HardHat" },
      { titulo: "Uniformes", url: "/uniformes-cadastrar", icone: "Shirt" },
      { titulo: "Ferramentas", url: "/cadastros/ferramentas", icone: "Wrench" },
      { titulo: "Veículos", url: "/cadastros/veiculos", icone: "Car" },
      { titulo: "Equipamentos", url: "/cadastros/equipamentos", icone: "Forklift" },
      { titulo: "Empresas", url: "/empresas", icone: "Building2" },
      { titulo: "Empregados", url: "/empregados", icone: "Users" },
      { titulo: "Fornecedores", url: "/cadastros/fornecedores", icone: "Truck" },
      { titulo: "Clientes", url: "/cadastros/clientes", icone: "Handshake" },
    ],
  },
];

// Os cartões que o perfil pode ver (Gerais é só do Administrador, como no menu lateral).
export function gruposDoInicio(isAdmin: boolean): GrupoInicio[] {
  return GRUPOS_INICIO.map((g) => ({ ...g, cartoes: g.cartoes.filter((c) => !c.soAdmin || isAdmin) }));
}
