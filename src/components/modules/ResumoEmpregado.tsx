import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BadgeCheck, Briefcase, Wrench } from "lucide-react";

import { formatarCpf } from "@/lib/empregados";
import type { PosseDoResumo } from "@/lib/resumo-empregado";

type Dados = { nome: string; cargo: string | null; matricula: string | null; cpf: string; data_admissao: string | null };

// Mini-resumo ao lado da entrega: quem é, o que já tem em posse (com tamanho), o que está vencido e as ferramentas ainda pendentes.
export function ResumoEmpregado({ empregado, rotuloItens, posse, vencidos, ferramentas, nomeTamanho, carregando }: {
  empregado: Dados | undefined; rotuloItens: string; posse: readonly PosseDoResumo[]; vencidos: number; ferramentas: readonly { nome: string; quantidade: number }[];
  nomeTamanho: (id: string) => string | null; carregando: boolean;
}) {
  if (!empregado) {
    return <aside className="panel hidden p-4 text-sm text-muted-foreground lg:block">Escolha o empregado (nome, matrícula ou CPF) para ver aqui o resumo dele.</aside>;
  }
  return (
    <aside aria-label="Resumo do colaborador" className="panel space-y-3 p-4 text-sm lg:sticky lg:top-4">
      <div>
        <p className="font-semibold leading-tight">{empregado.nome}</p>
        {/* Só o que existe: sem "Cargo não informado" nem "Matrícula —". */}
        {empregado.cargo && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Briefcase className="size-3.5" aria-hidden="true" />{empregado.cargo}</p>}
        <p className="text-xs text-muted-foreground">{[empregado.matricula && `Matrícula ${empregado.matricula}`, empregado.cpf && `CPF ${formatarCpf(empregado.cpf)}`].filter(Boolean).join(" · ")}</p>
      </div>
      {vencidos > 0
        ? <p role="status" className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"><AlertTriangle className="size-3.5" aria-hidden="true" />{vencidos} {rotuloItens} com validade vencida</p>
        : !carregando && <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><BadgeCheck className="size-3.5" aria-hidden="true" />Nada vencido</p>}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rotuloItens} em posse</p>
        {carregando ? <div role="status" aria-label="Carregando" className="space-y-1.5"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-4/5" /><Skeleton className="h-3.5 w-3/5" /></div>
          : posse.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum no momento.</p>
          : <ul className="space-y-1">{posse.map((p) => {
              const tam = p.tamanhos.map(nomeTamanho).filter(Boolean).join(", ");
              return <li key={p.itemId} className="flex justify-between gap-2"><span className={p.vencido ? "text-destructive" : ""}>{p.nome}{tam ? ` · tam. ${tam}` : ""}{p.vencido ? " (vencido)" : ""}</span><span className="tabular-nums text-muted-foreground">{p.quantidade}</span></li>;
            })}</ul>}
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Wrench className="size-3.5" aria-hidden="true" />Ferramentas pendentes</p>
        {ferramentas.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma.</p>
          : <ul className="space-y-1">{ferramentas.map((f) => <li key={f.nome} className="flex justify-between gap-2"><span>{f.nome}</span><span className="tabular-nums text-muted-foreground">{f.quantidade}</span></li>)}</ul>}
      </div>
    </aside>
  );
}
