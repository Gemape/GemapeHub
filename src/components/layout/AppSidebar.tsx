import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import logoMarca from "@/assets/logo-gemape-40-anos.png";
import { useAccess } from "@/lib/access-context";
import {
  ABAS_EPI,
  ABAS_FERRAMENTA,
  ABAS_UNIFORME,
  ABAS_VEICULO,
  ABAS_VIAGEM,
  MENU_EPI,
  MENU_EQUIPAMENTOS,
  MENU_FERRAMENTAS,
  MENU_GERAIS,
  MENU_UNIFORMES,
  MENU_VEICULOS,
  URLS_APOIO,
  URLS_GERAIS,
  type AbaMenu,
  type ItemMenu,
} from "@/lib/menu-parametros";
import {
  Building2,
  Car,
  Forklift,
  House,
  HardHat,
  LayoutDashboard,
  Shirt,
  Users,
  Wrench,
  ClipboardList,
  History,
  ShoppingCart,
  FileText,
  Archive,
  Hash,
  Truck,
  Handshake,
  MapPin,
  Tags,
  Ruler,
  ListChecks,
  Barcode,
  Factory,
  ChevronDown,
  FolderCog,
  Boxes,
  PackageMinus,
  PackageCheck,
  FileSignature,
  FileMinus,
  FileCheck,
  FileX,
  ClipboardCheck,
  ArrowLeftRight,
  TriangleAlert,
  Fuel,
  Box,
  ListPlus,
  Luggage as IconeViagens,
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

// Visual do menu lateral (decisões 98, 99 e 100): vidro fosco, botões com animação e item ativo em destaque.
const BOTAO_MENU =
  "menu-vidro icone-menu h-12 gap-3 rounded-xl px-2.5 text-[15px] font-medium tracking-wide text-sidebar-foreground/90 hover:text-white [&>svg:not(.icone-seta)]:size-8 [&>svg]:stroke-[1.75] data-[active=true]:font-semibold data-[active=true]:text-white";
const BOTAO_SUBMENU =
  "menu-vidro-sub icone-menu !items-start h-auto min-h-9 gap-2.5 rounded-lg py-1 text-[14px] [&>svg:not(.icone-seta)]:size-7 [&>svg]:stroke-[1.75] data-[active=true]:font-semibold";
// Títulos de grupo em faixa de vidro, para separar Visão geral, Módulos e Parâmetros.
const TITULO_GRUPO =
  "mb-2 h-9 rounded-xl border border-white/15 bg-white/10 px-3 text-[13px] font-bold uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md";
const SEPARADOR_GRUPO = "mt-3 border-t border-white/20 pt-5";

const grupos = [
  {
    titulo: "Visão geral",
    itens: [
      { titulo: "Início", url: "/inicio", icone: House },
      { titulo: "Dashboard", url: "/dashboard", icone: LayoutDashboard },
    ],
  },
  {
    titulo: "Módulos",
    itens: [
      { titulo: "EPIs", url: "/epi", icone: HardHat, abas: ABAS_EPI },
      { titulo: "Uniformes", url: "/uniformes", icone: Shirt, abas: ABAS_UNIFORME },
      { titulo: "Ferramentas", url: "/ferramentas", icone: Wrench, abas: ABAS_FERRAMENTA },
      { titulo: "Veículos", url: "/veiculos", icone: Car, abas: ABAS_VEICULO },
      { titulo: "Viagens", url: "/viagens", icone: IconeViagens, abas: ABAS_VIAGEM },
      { titulo: "Equipamentos", url: "/equipamentos", icone: Forklift },
    ],
  },
  {
    titulo: "Parâmetros",
    itens: [
      { titulo: "Empresas", url: "/empresas", icone: Building2 },
      { titulo: "Empregados", url: "/empregados", icone: Users },
      { titulo: "Fornecedores", url: "/cadastros/fornecedores", icone: Truck },
      { titulo: "Clientes", url: "/cadastros/clientes", icone: Handshake },
    ],
  },
] as const;

type ItemGrupo = { titulo: string; url: string; icone: typeof LayoutDashboard; abas?: readonly AbaMenu[] };

export const ICONES = {
  Tags, Ruler, ListChecks, Barcode, Factory, MapPin, Hash, Wrench, HardHat, ClipboardList, Archive, Car,
  LayoutDashboard, Boxes, ShoppingCart, History, PackageMinus, PackageCheck, FileSignature, FileMinus, FileCheck, FileX,
  ClipboardCheck, ArrowLeftRight, TriangleAlert, Fuel, Box, ListPlus, FileText, Forklift,
} as const;

function useDeAtual(): string | undefined {
  const de = useRouterState({ select: (s) => (s.location.search as Record<string, unknown>)["de"] });
  return typeof de === "string" ? de : undefined;
}

// Item de tela repetida em vários menus (decisão 86): só conta como aberto no menu de onde a pessoa veio (?de=).
const doMenuAtual = (item: ItemMenu, deAtual: string | undefined) => !item.de || item.de === deAtual;
// Grupo do menu: os endereços próprios e, se a pessoa veio dele, também os das telas repetidas.
const prefixosDoGrupo = (de: string, proprios: readonly string[], deAtual: string | undefined) =>
  deAtual === de ? [...proprios, ...URLS_APOIO] : proprios;

function useAbaAtual(): string | undefined {
  const aba = useRouterState({ select: (s) => (s.location.search as Record<string, unknown>)["aba"] });
  return typeof aba === "string" ? aba : undefined;
}

// Submenus que antes eram abas (decisão 43). Sem ?aba=, vale a primeira aba que a pessoa pode ver.
function SubAbas({ url, abas, pathname, abaAtual, isAdmin }: { url: string; abas: readonly AbaMenu[]; pathname: string; abaAtual: string | undefined; isAdmin: boolean }) {
  const visiveis = abas.filter((a) => !a.soAdmin || isAdmin);
  const ativa = visiveis.some((a) => a.aba === abaAtual) ? abaAtual : visiveis[0]?.aba;
  return (
    <>
      {visiveis.map((a) => {
        const Icone = ICONES[a.icone];
        return (
        <SidebarMenuSubItem key={a.aba}>
          <SidebarMenuSubButton asChild isActive={pathname === url && ativa === a.aba} className={BOTAO_SUBMENU}>
            <Link to={url} search={{ aba: a.aba } as never}>
              <Icone />
              <span className="!whitespace-normal pt-[5px] leading-snug">{a.titulo}</span>
            </Link>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        );
      })}
    </>
  );
}

function SubLink({ item, pathname }: { item: ItemMenu; pathname: string }) {
  const deAtual = useDeAtual();
  const doMenu = doMenuAtual(item, deAtual);
  const searchDe = item.de ? { de: item.de } : {};
  const Icone = ICONES[item.icone];
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={doMenu && (pathname === item.url || pathname.startsWith(`${item.url}/`))} className={BOTAO_SUBMENU}>
        <Link to={item.url} {...(item.search ? { search: item.search as never } : item.de ? { search: searchDe as never } : {})}>
          <Icone />
          {/* Nome inteiro, quebrando linha se precisar. */}
          <span className="!whitespace-normal pt-[5px] leading-snug">{item.titulo}</span>
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
  const casa = prefixos.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [aberto, setAberto] = useState(inicialAberto || casa);
  // Chegando na tela por outro caminho (link, redirecionamento), o grupo dela abre.
  useEffect(() => {
    if (casa) setAberto(true);
  }, [casa]);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={aberto}
        className={BOTAO_MENU}
        isActive={!aberto && casa}
        onClick={() => setAberto(!aberto)}
      >
        {Icone}
        <span>{titulo}</span>
        <ChevronDown className={`icone-seta ml-auto !size-4 opacity-70 transition-transform ${aberto ? "" : "-rotate-90"}`} />
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
            <p className="px-2 pt-1.5 text-[13px] font-semibold text-sidebar-foreground/70">{item.titulo}</p>
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

// Parâmetros > EPI: Cadastrar EPI e, dentro dele, Cadastrar Ficha de EPI.
function MenuEpi({ pathname }: { pathname: string }) {
  const deAtual = useDeAtual();
  return (
    <GrupoRecolhivel
      titulo="EPI"
      icone={<HardHat />}
      prefixos={prefixosDoGrupo("epi", MENU_EPI.filter((i) => !i.de).flatMap((i) => [i.url, ...(i.filhos ?? []).map((f) => f.url)]), deAtual)}
      pathname={pathname}
    >
      {/* Todos os ícones na mesma coluna (decisão 139): a Ficha vem logo abaixo de Cadastrar EPI, sem recuo. */}
      {MENU_EPI.flatMap((item) => [item, ...(item.filhos ?? [])]).map((item) => (
        <SubLink key={item.url} item={item} pathname={pathname} />
      ))}
    </GrupoRecolhivel>
  );
}

// Parâmetros > Ferramentas: Cadastrar Caixa (habilitar caixas) e Cadastrar Ferramenta (decisão 54).
function MenuFerramentas({ pathname }: { pathname: string }) {
  const { isAdmin } = useAccess();
  const deAtual = useDeAtual();
  return (
    <GrupoRecolhivel
      titulo="Ferramentas"
      icone={<Wrench />}
      prefixos={prefixosDoGrupo("ferramentas", MENU_FERRAMENTAS.filter((i) => !i.de).map((i) => i.url), deAtual)}
      pathname={pathname}
    >
      {MENU_FERRAMENTAS.filter((item) => !item.soAdmin || isAdmin).map((item) => (
        <SubLink key={item.url} item={item} pathname={pathname} />
      ))}
    </GrupoRecolhivel>
  );
}

// Parâmetros > Uniformes: Cadastrar Uniforme (decisão 48).
function MenuUniformes({ pathname }: { pathname: string }) {
  const deAtual = useDeAtual();
  return (
    <GrupoRecolhivel
      titulo="Uniformes"
      icone={<Shirt />}
      prefixos={prefixosDoGrupo("uniformes", MENU_UNIFORMES.filter((i) => !i.de).map((i) => i.url), deAtual)}
      pathname={pathname}
    >
      {MENU_UNIFORMES.map((item) => (
        <SubLink key={item.url} item={item} pathname={pathname} />
      ))}
    </GrupoRecolhivel>
  );
}

// Parâmetros > Veículos: o cadastro da frota e as listas de apoio (decisão 46).
function MenuVeiculos({ pathname }: { pathname: string }) {
  const deAtual = useDeAtual();
  return (
    <GrupoRecolhivel
      titulo="Veículos"
      icone={<Car />}
      prefixos={prefixosDoGrupo("veiculos", MENU_VEICULOS.filter((i) => !i.de).map((i) => i.url), deAtual)}
      pathname={pathname}
    >
      {MENU_VEICULOS.map((item) => (
        <SubLink key={item.url} item={item} pathname={pathname} />
      ))}
    </GrupoRecolhivel>
  );
}

// Parâmetros > Equipamentos: o cadastro dos equipamentos (os dados que o módulo Equipamentos vai usar).
function MenuEquipamentos({ pathname }: { pathname: string }) {
  return (
    <GrupoRecolhivel titulo="Equipamentos" icone={<Forklift />} prefixos={MENU_EQUIPAMENTOS.map((i) => i.url)} pathname={pathname}>
      {MENU_EQUIPAMENTOS.map((item) => (
        <SubLink key={item.url} item={item} pathname={pathname} />
      ))}
    </GrupoRecolhivel>
  );
}

// Módulos: o menu abre e lista as antigas abas como submenus (decisão 43).
function ModuloComAbas({ item, pathname }: { item: ItemGrupo; pathname: string }) {
  const { isAdmin } = useAccess();
  const abaAtual = useAbaAtual();
  const Icone = item.icone;
  return (
    <GrupoRecolhivel
      titulo={item.titulo}
      icone={<Icone />}
      prefixos={[item.url]}
      pathname={pathname}
      inicialAberto={false}
    >
      <SubAbas url={item.url} abas={item.abas ?? []} pathname={pathname} abaAtual={abaAtual} isAdmin={isAdmin} />
    </GrupoRecolhivel>
  );
}

export function AppSidebar() {
  const { isAdmin } = useAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-8">
        <div className="text-center leading-tight">
          <Link to="/inicio" aria-label="Ir para a tela inicial" title="Ir para a tela inicial" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <div
              className="logo-marca"
              role="img"
              aria-label="GEMAPE, 40 anos, máquinas e peças"
              style={{ maskImage: `url(${logoMarca})`, WebkitMaskImage: `url(${logoMarca})` }}
            />
          </Link>
          <div className="marca-linha mt-3" aria-hidden="true" />
          <p className="marca-subtitulo mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/80">
            Gestão de Patrimônio
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isAdmin && import.meta.env["VITE_DEMO_MODE"] === "false" && (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className={BOTAO_MENU}>
                  <Link to="/usuarios">
                    <Users />
                    <span>Usuários e permissões</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
        {grupos.map((grupo, indice) => (
          <SidebarGroup key={grupo.titulo} className={indice > 0 ? SEPARADOR_GRUPO : undefined}>
            <SidebarGroupLabel className={TITULO_GRUPO}>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Gerais, com seus submenus, é o primeiro item de Parâmetros (decisão 44). */}
                {grupo.titulo === "Parâmetros" && isAdmin && <MenuGerais pathname={pathname} />}
                {grupo.titulo === "Parâmetros" && (
                  <>
                    <MenuEpi pathname={pathname} />
                    <MenuUniformes pathname={pathname} />
                    <MenuFerramentas pathname={pathname} />
                    <MenuVeiculos pathname={pathname} />
                    <MenuEquipamentos pathname={pathname} />
                  </>
                )}
                {grupo.itens.map((item: ItemGrupo) =>
                  item.abas ? (
                    <ModuloComAbas key={item.url} item={item} pathname={pathname} />
                  ) : (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className={BOTAO_MENU} isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}>
                      <Link to={item.url}>
                        <item.icone />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
