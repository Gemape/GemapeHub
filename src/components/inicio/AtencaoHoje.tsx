import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BlocoEsqueleto } from "@/components/Esqueletos";
import { useAccess } from "@/lib/access-context";
import { pendenciasDeHoje, totalPendencias, type GrupoPendencia } from "@/lib/atencao-hoje";
import { hojeLocal } from "@/lib/empregados";
import { TODAS } from "@/lib/empresa-context";
import { useEmpregados, useItens, useMovimentacoes } from "@/lib/hooks-gemape";
import { estadoEstoqueModulo } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";

const COR: Record<GrupoPendencia["prioridade"], string> = {
  alta: "border-destructive/50 bg-destructive/10 text-destructive",
  media: "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  baixa: "border-border bg-muted/50 text-foreground",
};
const ROTULO: Record<GrupoPendencia["prioridade"], string> = { alta: "Urgente", media: "Atenção", baixa: "Em breve" };

// Bloco do topo da tela inicial: pendências reais por prioridade. Cada cartão é um botão: ao clicar, a lista abaixo mostra só aqueles itens,
// cada um com o botão da ação (agendar troca, repor estoque...) que já abre a tela certa.
export function AtencaoHoje() {
  const { podeVerCaminho } = useAccess();
  const pode = podeVerCaminho("/epi");
  const parametros = useParametrosBase();
  // O histórico inteiro é pesado: a leitura começa um instante depois de a tela inicial aparecer, para os cartões do menu não esperarem por ela.
  const [pronto, setPronto] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPronto(true), 600); return () => clearTimeout(t); }, []);
  const ler = pode && pronto;
  const { data: empregados = [], isLoading: l1 } = useEmpregados(TODAS, false, ler);
  const { data: epis = [], isLoading: l2 } = useItens("epi", TODAS, "", ler);
  const { data: uniformes = [] } = useItens("uniforme", TODAS, "", ler);
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS, "", ler);
  const { data: movsEpi = [], isLoading: l3 } = useMovimentacoes("epi", TODAS, undefined, ler);
  const { data: movsFerramenta = [] } = useMovimentacoes("ferramenta", TODAS, undefined, ler);
  const [aberto, setAberto] = useState<string | null>(null);

  const grupos = useMemo(
    () => pendenciasDeHoje({ hoje: hojeLocal(), empregados, epis, uniformes, ferramentas, movsEpi, movsFerramenta, estado: (modulo, item) => estadoEstoqueModulo(parametros, modulo, item as never) }),
    [empregados, epis, uniformes, ferramentas, movsEpi, movsFerramenta, parametros],
  );
  if (!pode) return null;
  if (!pronto || l1 || l2 || l3) return <BlocoEsqueleto cartoes={0} linhas={3} rotulo="Carregando o que precisa da sua atenção" />;

  const total = totalPendencias(grupos);
  const escolhido = grupos.find((g) => g.id === aberto) ?? null;
  return (
    <section aria-labelledby="atencao-hoje" className="vidro-cartao mx-auto w-full max-w-4xl space-y-3 rounded-2xl p-4">
      <h2 id="atencao-hoje" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-primary/80">
        {total > 0 ? <AlertTriangle className="size-4 text-destructive" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />}
        O que precisa da sua atenção hoje
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-primary">{total}</span>
      </h2>
      {total === 0 && <p className="text-sm text-muted-foreground">Tudo em dia: nenhuma pendência encontrada.</p>}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {grupos.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              aria-expanded={aberto === g.id}
              aria-controls="atencao-lista"
              disabled={g.itens.length === 0}
              onClick={() => setAberto(aberto === g.id ? null : g.id)}
              className={`flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-60 disabled:hover:shadow-none ${g.itens.length > 0 ? COR[g.prioridade] : "border-border text-muted-foreground"} ${aberto === g.id ? "ring-2 ring-primary" : ""}`}
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
