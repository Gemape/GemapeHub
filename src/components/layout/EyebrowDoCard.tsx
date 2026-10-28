import { useRouterState } from "@tanstack/react-router";

import { useAccess } from "@/lib/access-context";
import { areaDaRota } from "@/lib/inicio";

// Texto pequeno do alto de toda página (decisão 303): o nome do card da tela inicial a que a página pertence (EPIs, Uniformes, Veículos, Viagens, Gerais...),
// e logo abaixo vem o nome da aba ou do menu aberto (o título grande). Vale para o módulo e para os Parâmetros do mesmo card, por qualquer caminho de acesso
// (menu lateral, menu do topo ou card). Página que não é de nenhum card com submenu mostra o texto `fallback`.
export function EyebrowDoCard({ fallback }: { fallback: string }) {
  const { isAdmin, podeVerCaminho } = useAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const buscaTexto = useRouterState({ select: (s) => JSON.stringify(s.location.search ?? {}) });
  const area = areaDaRota(pathname, JSON.parse(buscaTexto) as Record<string, unknown>, isAdmin, podeVerCaminho);
  return <p className="text-eyebrow">{area?.cartao.titulo ?? fallback}</p>;
}
