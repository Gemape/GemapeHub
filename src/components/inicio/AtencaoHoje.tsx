import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { BlocoEsqueleto } from "@/components/Esqueletos";
import { useDonoDosAtalhos } from "@/components/inicio/atalhosPessoais";
import type { Pendencias } from "@/components/inicio/usePendencias";
import { totalPendencias, type GrupoPendencia } from "@/lib/atencao-hoje";

const COR: Record<GrupoPendencia["prioridade"], string> = {
  alta: "border-destructive/50 bg-destructive/10 text-destructive",
  media: "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  baixa: "border-border bg-muted/50 text-foreground",
};
const CHAVE_FECHADO = "gemape-atencao-hoje-fechado";
const ROTULO: Record<GrupoPendencia["prioridade"], string> = { alta: "Urgente", media: "Atenção", baixa: "Em breve" };

// Bloco do topo da tela inicial: pendências reais por prioridade. Cada cartão é um botão: ao clicar, a lista abaixo mostra só aqueles itens,
// cada um com o botão da ação (agendar troca, repor estoque...) que já abre a tela certa. Os dados vêm de usePendencias (a mesma leitura dos alertas dos cartões).
export function AtencaoHoje({ pendencias }: { pendencias: Pendencias }) {
  const { pode, carregando, grupos, erroLocais, podeEquipamentos, podeViagens } = pendencias;
  const [aberto, setAberto] = useState<string | null>(null);
  // O X fecha o bloco nesta sessão do navegador, por usuário. Se aparecer pendência nova (o total cresce), ele volta sozinho.
  // Lido depois de montar para não divergir do HTML do servidor.
  const dono = useDonoDosAtalhos();
  const chave = `${CHAVE_FECHADO}:${dono ?? ""}`;
  const [fechadoCom, setFechadoCom] = useState<number | null>(null);
  useEffect(() => { try { const v = sessionStorage.getItem(chave); setFechadoCom(v === null ? null : Number(v)); } catch { setFechadoCom(null); } }, [chave]);
  const fechar = (total: number) => { setFechadoCom(total); try { sessionStorage.setItem(chave, String(total)); } catch { /* sem armazenamento: fecha só nesta tela */ } };

  if (!pode) return null;
  if (carregando) return <BlocoEsqueleto cartoes={0} linhas={3} rotulo="Carregando o que precisa da sua atenção" />;

  const total = totalPendencias(grupos);
  if (fechadoCom !== null && total <= fechadoCom) return null;
  const escolhido = grupos.find((g) => g.id === aberto) ?? null;
  return (
    <section aria-labelledby="atencao-hoje" className="vidro-cartao mx-auto w-full max-w-5xl space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-2">
      <h2 id="atencao-hoje" className="flex min-w-0 items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-primary/80">
        {total > 0 ? <AlertTriangle className="size-4 text-destructive motion-safe:animate-[pulso-icone_1.2s_ease-in-out_4]" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />}
        O que precisa da sua atenção hoje
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-primary">{total}</span>
      </h2>
        <button type="button" onClick={() => fechar(total)} aria-label="Fechar o aviso de atenção de hoje" title="Fechar" className="ml-auto grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="size-4" aria-hidden="true" /></button>
      </div>
      {total === 0 && !erroLocais && <p className="text-sm text-muted-foreground">Tudo em dia: nenhuma pendência encontrada.</p>}
      {erroLocais && (podeEquipamentos || podeViagens) && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Não foi possível ler os dados de Equipamentos e Viagens neste navegador; esses avisos ficam de fora por enquanto.</p>}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {grupos.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              aria-expanded={aberto === g.id}
              aria-controls="atencao-lista"
              disabled={g.itens.length === 0}
              onClick={() => setAberto(aberto === g.id ? null : g.id)}
              className={`flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-60 disabled:hover:shadow-none ${g.itens.length > 0 ? COR[g.prioridade] : "border-border text-muted-foreground"} ${aberto === g.id ? "ring-2 ring-primary" : ""} ${g.itens.length > 0 && g.prioridade === "alta" ? "motion-safe:animate-[pulso-atencao_2.4s_ease-in-out_2]" : ""}`}
            >
              <span className="text-2xl font-bold tabular-nums">{g.itens.length}</span>
              <span className="text-sm font-medium leading-tight">{g.titulo}</span>
              <span className="text-xs">{g.itens.length > 0 ? ROTULO[g.prioridade] : g.vazio}</span>
            </button>
          </li>
        ))}
      </ul>
      <div id="atencao-lista" aria-live="polite">
        {escolhido && (
          <ul className="divide-y rounded-xl border bg-background/70">
            {escolhido.itens.slice(0, 20).map((i) => (
              <li key={i.chave} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0"><span className="font-medium">{i.texto}</span><span className="block truncate text-xs text-muted-foreground">{i.detalhe}</span></span>
                <Link to={i.acao.url} search={(i.acao.search ?? {}) as never} className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{i.acao.rotulo}</Link>
              </li>
            ))}
            {escolhido.itens.length > 20 && <li className="px-3 py-2 text-xs text-muted-foreground">E mais {escolhido.itens.length - 20}. Resolva estes primeiro; a lista se atualiza.</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
