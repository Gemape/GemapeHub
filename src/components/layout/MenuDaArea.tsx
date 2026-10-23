import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { ICONES } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccess } from "@/lib/access-context";
import { areaDaRota, type SecaoInicio } from "@/lib/inicio";

const SECOES: readonly SecaoInicio[] = ["Módulo", "Parâmetros"];

// Topo, ao lado do Voltar ao início: as outras rotinas do mesmo cartão da tela inicial (módulo e parâmetros), para trocar de rotina
// sem voltar ao início. Telas que não pertencem a um cartão com submenu (Dashboard, Empresas...) não mostram o menu.
export function MenuDaArea() {
  const { isAdmin, podeVerCaminho } = useAccess();
  // Primitivos separados: o roteador compara por valor e o menu não renderiza de novo sem a rota mudar.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const buscaTexto = useRouterState({ select: (s) => JSON.stringify(s.location.search ?? {}) });
  const search = JSON.parse(buscaTexto) as Record<string, unknown>;
  const area = areaDaRota(pathname, search, isAdmin, podeVerCaminho);
  if (!area) return null;
  const { cartao, atual } = area;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Rotinas de ${cartao.titulo}`}>
          {cartao.titulo}
          <ChevronDown className="ml-1 size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] min-w-56 overflow-y-auto">
        {SECOES.map((secao, n) => {
          const itens = (cartao.itens ?? []).filter((i) => i.secao === secao);
          if (itens.length === 0) return null;
          return (
            <div key={secao}>
              {n > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">{secao}</DropdownMenuLabel>
              {itens.map((sub) => {
                const Icone = ICONES[sub.icone];
                const ehAtual = sub === atual;
                return (
                  <DropdownMenuItem key={`${sub.titulo}-${sub.url}-${JSON.stringify(sub.search ?? {})}`} asChild>
                    <Link to={sub.url} search={sub.search as never} aria-current={ehAtual ? "page" : undefined} className={ehAtual ? "bg-primary/10 font-medium" : ""}>
                      <Icone className="mr-2 size-4 shrink-0 text-primary" aria-hidden="true" />
                      {sub.titulo}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
