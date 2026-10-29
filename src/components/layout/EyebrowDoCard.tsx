import { useRouterState } from "@tanstack/react-router";

import { useAccess } from "@/lib/access-context";
import { areaDaRota, caminhoDoCard } from "@/lib/inicio";

// Texto pequeno do alto de toda página (decisões 303 e 314): o caminho até ela, o nome do card da tela inicial (EPIs, Uniformes, Veículos, Viagens, Gerais...) e se a
// tela é do Módulo ou dos Parâmetros dele ("Veículos › Parâmetros"); logo abaixo vem o nome da aba ou do menu aberto (o título grande). Vale por qualquer caminho de
// acesso (menu lateral, menu do topo ou card). Página que não é de nenhum card com submenu mostra o texto `fallback`.
export function EyebrowDoCard({ fallback }: { fallback: string }) {
  const { isAdmin, podeVerCaminho } = useAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const buscaTexto = useRouterState({ select: (s) => JSON.stringify(s.location.search ?? {}) });
  const area = areaDaRota(pathname, JSON.parse(buscaTexto) as Record<string, unknown>, isAdmin, podeVerCaminho);
  return <p className="text-eyebrow">{area ? caminhoDoCard(area.cartao.titulo, area.atual.secao) : fallback}</p>;
}
