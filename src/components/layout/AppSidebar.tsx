import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAccess } from "@/lib/access-context";
import { MENU_EPI, MENU_FERRAMENTAS, MENU_GERAIS, URLS_GERAIS, type ItemMenu, type NomeIcone } from "@/lib/menu-parametros";
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
      { titulo: "Uniformes", url: "/uniformes", icone: Shirt },
      { titulo: "Ferramentas", url: "/ferramentas", icone: Wrench },
      { titulo: "Veículos", url: "/veiculos", icone: Car },
    ],
  },
  {
    titulo: "Parâmetros",
    itens: [
      { titulo: "Uniformes", url: "/cadastros/uniformes", icone: Shirt },
      { titulo: "Veículos", url: "/cadastros/veiculos", icone: Car },
      { titulo: "Empresas", url: "/empresas", icone: Building2 },
      { titulo: "Empregados", url: "/empregados", icone: Users },
      { titulo: "Fornecedores", url: "/cadastros/fornecedores", icone: Truck },
    ],
  },
] as const;

const ICONES = { Tags, Ruler, ListChecks, Barcode, Factory, MapPin, Hash, Wrench, HardHat, ClipboardList, Archive } as const;

function SubLink({ item, pathname }: { item: ItemMenu; pathname: string }) {
  const Icone = ICONES[item.icone];
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)} className="h-auto min-h-7 py-1">
        <Link to={item.url}>
          <Icone />
          {/* Nome inteiro, quebrando linha se precisar. */}
          <span className="!whitespace-normal leading-tight">{item.titulo}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

// Grupo que abre e fecha, com submenus dentro (Gerais, Tamanho e Medidas, Ferramentas).
function GrupoRecolhivel({
  titulo,
  icone: Icone,
  prefixos,
  pathname,
  inicialAberto = true,
  children,
}: {
  titulo: string;
  icone: ReactNode;
  prefixos: readonly string[];
  pathname: string;
  inicialAberto?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(inicialAberto);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={aberto}
        isActive={!aberto && prefixos.some((p) => pathname.startsWith(p))}
        onClick={() => setAberto(!aberto)}
      >
        {Icone}
        <span>{titulo}</span>
        <ChevronDown className={`ml-auto transition-transform ${aberto ? "" : "-rotate-90"}`} />
      </SidebarMenuButton>
      {aberto && <SidebarMenuSub>{children}</SidebarMenuSub>}
    </SidebarMenuItem>
  );
}

// Especificação rev1: Cadastros > Gerais, só o Administrador acessa.
function MenuGerais({ pathname }: { pathname: string }) {
  return (
    <GrupoRecolhivel titulo="Gerais" icone={<FolderCog />} prefixos={URLS_GERAIS} pathname={pathname}>
      {MENU_GERAIS.map((item) =>
        "filhos" in item ? (
          <SidebarMenuSubItem key={item.titulo}>
            <p className="px-2 pt-1 text-xs font-medium text-sidebar-foreground/70">{item.titulo}</p>
            <SidebarMenuSub className="mx-0 ml-2 px-1.5">
              {item.filhos.map((filho) => (
                <SubLink key={filho.url} item={filho} pathname={pathname} />
              ))}
            </SidebarMenuSub>
          </SidebarMenuSubItem>
        ) : (
          <SubLink key={item.url} item={item} pathname={pathname} />
        ),
      )}
    </GrupoRecolhivel>
  );
}

// Menu EPI (módulo): controle, Cadastrar EPI e, dentro dele, Cadastrar Ficha de EPI.
function MenuEpi({ pathname }: { pathname: string }) {
  return (
    <GrupoRecolhivel
      titulo="EPI"
      icone={<HardHat />}
      prefixos={MENU_EPI.flatMap((i) => [i.url, ...(i.filhos ?? []).map((f) => f.url)])}
      pathname={pathname}
    >
      {MENU_EPI.map((item) =>
        item.filhos ? (
          <SidebarMenuSubItem key={item.url}>
            <SidebarMenuSub className="mx-0 border-l-0 px-0">
              <SubLink item={item} pathname={pathname} />
              <SidebarMenuSub className="mx-0 ml-2 px-1.5">
                {item.filhos.map((filho) => (
                  <SubLink key={filho.url} item={filho} pathname={pathname} />
                ))}
              </SidebarMenuSub>
            </SidebarMenuSub>
          </SidebarMenuSubItem>
        ) : (
          <SubLink key={item.url} item={item} pathname={pathname} />
        ),
      )}
    </GrupoRecolhivel>
  );
}

// Parâmetros > Ferramentas: o cadastro e a tela Caixas de Ferramentas.
function MenuFerramentas({ pathname }: { pathname: string }) {
  return (
    <GrupoRecolhivel
      titulo="Ferramentas"
      icone={<Wrench />}
      prefixos={MENU_FERRAMENTAS.map((i) => i.url)}
      pathname={pathname}
    >
      {MENU_FERRAMENTAS.map((item) => (
        <SubLink key={item.url} item={item} pathname={pathname} />
      ))}
    </GrupoRecolhivel>
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
                {grupo.titulo === "Módulos" && <MenuEpi pathname={pathname} />}
                {grupo.titulo === "Parâmetros" && <MenuFerramentas pathname={pathname} />}
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
