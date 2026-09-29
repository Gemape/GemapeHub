import { Link, useRouterState } from "@tanstack/react-router";
import { useAccess } from "@/lib/access-context";
import {
  Building2,
  Car,
  HardHat,
  LayoutDashboard,
  Shirt,
  Users,
  Wrench,
  FileSpreadsheet,
  Settings2,
  ClipboardList,
  History,
  ShoppingCart,
  FileText,
  Archive,
  Truck,
  MapPin,
  Barcode,
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
      { titulo: "Endereçamento", url: "/enderecamento", icone: MapPin },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { titulo: "EPIs", url: "/cadastros/epi", icone: HardHat },
      { titulo: "Uniformes", url: "/cadastros/uniformes", icone: Shirt },
      { titulo: "Ferramentas", url: "/cadastros/ferramentas", icone: Wrench },
      { titulo: "Veículos", url: "/cadastros/veiculos", icone: Car },
      { titulo: "Empresas", url: "/empresas", icone: Building2 },
      { titulo: "Empregados", url: "/empregados", icone: Users },
      { titulo: "Fornecedores", url: "/cadastros/fornecedores", icone: Truck },
      { titulo: "Código de Fábrica", url: "/cadastros/codigo-fabrica", icone: Barcode },
      { titulo: "Relatórios", url: "/relatorios", icone: FileSpreadsheet },
    ],
  },
] as const;

export function AppSidebar() {
  const { isAdmin } = useAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-white text-primary">
            <Settings2 className="size-6 animate-spin-slow" />
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
        {isAdmin && import.meta.env["VITE_DEMO_MODE"] === "false" && <SidebarGroup><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild><Link to="/usuarios"><Users /><span>Usuários e permissões</span></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup>}
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
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
