import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useAccess } from "@/lib/access-context";
import {
  Building2,
  Car,
  HardHat,
  LayoutDashboard,
  Shirt,
  Users,
  Wrench,
  Cog,
  ClipboardList,
  History,
  ShoppingCart,
  FileText,
  Archive,
  Hash,
  Truck,
  MapPin,
  Tags,
  Ruler,
  ListChecks,
  Barcode,
  Factory,
  ChevronDown,
  FolderCog,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

const grupos = [
  {
    titulo: "Visão geral",
    itens: [{ titulo: "Dashboard", url: "/dashboard", icone: LayoutDashboard }],
  },
  {
    titulo: "Módulos",
    itens: [
      { titulo: "EPIs", url: "/epi", icone: HardHat },
      { titulo: "Uniformes", url: "/uniformes", icone: Shirt },
      { titulo: "Ferramentas", url: "/ferramentas", icone: Wrench },
      { titulo: "Caixas de Ferramentas", url: "/caixas-ferramentas", icone: Archive },
      { titulo: "Veículos", url: "/veiculos", icone: Car },
    ],
  },
  {
    titulo: "Parâmetros",
    itens: [
      { titulo: "EPIs", url: "/cadastros/epi", icone: HardHat },
      { titulo: "Ficha de EPI", url: "/cadastros/epi-ficha", icone: ClipboardList },
      { titulo: "Uniformes", url: "/cadastros/uniformes", icone: Shirt },
      { titulo: "Ferramentas", url: "/cadastros/ferramentas", icone: Wrench },
      { titulo: "Veículos", url: "/cadastros/veiculos", icone: Car },
      { titulo: "Empresas", url: "/empresas", icone: Building2 },
      { titulo: "Empregados", url: "/empregados", icone: Users },
      { titulo: "Fornecedores", url: "/cadastros/fornecedores", icone: Truck },
    ],
  },
] as const;

// Especificação rev1: Cadastros > Gerais, só o Administrador acessa.
const cadastrosGerais = [
  { titulo: "Categorias", url: "/cadastros/gerais/categorias", icone: Tags },
  { titulo: "Tamanhos e Unidades", url: "/cadastros/gerais/tamanhos-unidades", icone: Ruler },
  {
    titulo: "Associar Tamanho e Medida",
    url: "/cadastros/gerais/associar-tamanhos",
    icone: ListChecks,
  },
  { titulo: "Código do Produto", url: "/cadastros/gerais/codigo-produto", icone: Barcode },
  { titulo: "Código de Fábrica", url: "/cadastros/gerais/codigo-fabrica", icone: Factory },
  { titulo: "Endereçamento", url: "/cadastros/gerais/enderecamento", icone: MapPin },
  { titulo: "Caixas", url: "/cadastros/gerais/caixas", icone: Hash },
] as const;

function MenuGerais({ pathname }: { pathname: string }) {
  const [aberto, setAberto] = useState(true);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={aberto}
        isActive={!aberto && pathname.startsWith("/cadastros/gerais")}
        onClick={() => setAberto(!aberto)}
      >
        <FolderCog />
        <span>Gerais</span>
        <ChevronDown className={`ml-auto transition-transform ${aberto ? "" : "-rotate-90"}`} />
      </SidebarMenuButton>
      {aberto && (
        <SidebarMenuSub>
          {cadastrosGerais.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith(item.url)}
                className="h-auto min-h-7 py-1"
              >
                <Link to={item.url}>
                  <item.icone />
                  {/* Nome inteiro, quebrando linha se precisar. */}
                  <span className="!whitespace-normal leading-tight">{item.titulo}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { isAdmin } = useAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg ring-1 ring-white/40">
            <Cog className="engrenagem-girando size-6" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <h2 className="font-display text-lg font-black tracking-tighter text-white">GEMAPE</h2>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Gestão de Patrimônio
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isAdmin && import.meta.env["VITE_DEMO_MODE"] === "false" && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/usuarios">
                    <Users />
                    <span>Usuários e permissões</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.titulo === "Parâmetros" && isAdmin && <MenuGerais pathname={pathname} />}
                {grupo.itens.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}>
                      <Link to={item.url}>
                        <item.icone />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
