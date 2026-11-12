import { Link, useRouterState } from "@tanstack/react-router";
import { Car, Forklift, HardHat, House, LayoutGrid, Luggage, Shirt, Wrench } from "lucide-react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccess } from "@/lib/access-context";
import { areaDaRota, gruposDoInicio, type IconeInicio } from "@/lib/inicio";

const ICONES_MODULO: Partial<Record<IconeInicio, typeof Car>> = { HardHat, Shirt, Wrench, Car, Luggage, Forklift };

// Rota atual em primitivos (o roteador compara por valor e o componente não renderiza à toa).
function useRotaAtual() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const buscaTexto = useRouterState({ select: (s) => JSON.stringify(s.location.search ?? {}) });
  return { pathname, search: JSON.parse(buscaTexto) as Record<string, unknown> };
}

// Seletor de módulos (ícone de grade) no canto superior esquerdo: pula direto entre EPIs, Uniformes, Ferramentas, Veículos... sem voltar ao início.
export function TrocaDeModulo() {
  const { isAdmin, podeVerCaminho } = useAccess();
  const { pathname, search } = useRotaAtual();
  const modulos = gruposDoInicio(isAdmin, podeVerCaminho).find((g) => g.titulo === "Módulos")?.cartoes ?? [];
  const atual = areaDaRota(pathname, search, isAdmin, podeVerCaminho)?.cartao.titulo;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Trocar de módulo" title="Trocar de módulo" className="size-8 shrink-0">
          <LayoutGrid className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">Ir para o módulo</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1">
          {modulos.map((m) => {
            const primeiro = m.itens?.[0];
            const Icone = ICONES_MODULO[m.icone] ?? HardHat;
            if (!primeiro) return null;
            return (
              <DropdownMenuItem key={m.titulo} asChild className="p-0">
                <Link to={primeiro.url} search={primeiro.search as never} aria-current={m.titulo === atual ? "page" : undefined} className={`flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center text-xs ${m.titulo === atual ? "bg-primary/10 font-semibold" : ""}`}>
                  <Icone className="size-5 text-primary" aria-hidden="true" />
                  {m.titulo}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Trilha no alto do conteúdo: Início / módulo / tela, com links para voltar a cada nível. Sem trilha em telas que não são de um cartão com submenu.
export function TrilhaDeNavegacao() {
  const { isAdmin, podeVerCaminho } = useAccess();
  const { pathname, search } = useRotaAtual();
  const area = areaDaRota(pathname, search, isAdmin, podeVerCaminho);
  if (!area) return null;
  const { cartao, atual } = area;
  const primeiro = cartao.itens?.[0];
  return (
    <Breadcrumb className="mb-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/inicio" className="inline-flex items-center gap-1"><House className="size-3.5" aria-hidden="true" />Início</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {primeiro && primeiro !== atual ? (
            <BreadcrumbLink asChild>
              <Link to={primeiro.url} search={primeiro.search as never}>{cartao.titulo}</Link>
            </BreadcrumbLink>
          ) : (
            <span>{cartao.titulo}</span>
          )}
        </BreadcrumbItem>
        {atual.secao !== "Módulo" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem><span>{atual.secao}</span></BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{atual.titulo}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
