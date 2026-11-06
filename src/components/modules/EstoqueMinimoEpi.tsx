import { AlertTriangle, PackageX } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportarCsv } from "@/lib/gemape";
import { abaixoDoMinimo } from "@/lib/sugestao-epi";

// Um alerta por tamanho (decisão 417): o saldo e o mínimo daquele tamanho, como na aba Estoque.
export type LinhaDeMinimo = { chave: string; itemId: string; codigo: string; descricao: string; empresaId: string | null; total: number; minimo: number };

type Empresa = { id: string; nome_fantasia: string };

// Botão "Estoque mínimo" (decisão 410): abre uma janela com uma tela por empresa (botões para trocar de empresa), cada uma com os EPIs no mínimo ou abaixo em cartões (saldo, mínimo, quanto falta e uma barra).
export function EstoqueMinimoEpi({ linhas, empresas, rotulo = "EPIs" }: { linhas: LinhaDeMinimo[]; empresas: Empresa[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [escolhida, setEscolhida] = useState("");
  const alertas = useMemo(() => abaixoDoMinimo(linhas), [linhas]);
  // Sem useMemo: `empresas` chega como array novo a cada render do pai, então a memoização nunca valeria.
  const porEmpresa = empresas.map((e) => ({ empresa: e, itens: alertas.filter((l) => l.empresaId === e.id) }));
  // O contador do botão só soma o que a janela consegue mostrar (empresa inativa ou sem empresa não tem tela).
  const visiveis = porEmpresa.reduce((t, p) => t + p.itens.length, 0);
  const primeira = porEmpresa.find((p) => p.itens.length > 0)?.empresa.id ?? empresas[0]?.id ?? "";
  const atual = porEmpresa.find((p) => p.empresa.id === escolhida) ?? porEmpresa.find((p) => p.empresa.id === primeira);

  return (
    <>
      <Button type="button" variant={visiveis > 0 ? "destructive" : "outline"} onClick={() => { setEscolhida(""); setAberto(true); }}>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Estoque mínimo
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-semibold">{visiveis}</span>
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Estoque no mínimo ou abaixo</DialogTitle>
            <DialogDescription>
              {rotulo} com saldo menor ou igual ao estoque mínimo, uma tela por empresa. O saldo soma novos e usados.
            </DialogDescription>
          </DialogHeader>
          {empresas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Empresa">
                {porEmpresa.map(({ empresa, itens }) => (
                  <Button
                    key={empresa.id}
                    type="button"
                    size="sm"
                    variant={atual?.empresa.id === empresa.id ? "default" : "outline"}
                    aria-pressed={atual?.empresa.id === empresa.id}
                    onClick={() => setEscolhida(empresa.id)}
                  >
                    {empresa.nome_fantasia}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${itens.length > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>{itens.length}</span>
                  </Button>
                ))}
              </div>
              {atual && <PainelDaEmpresa nome={atual.empresa.nome_fantasia} itens={atual.itens} rotulo={rotulo} />}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PainelDaEmpresa({ nome, itens, rotulo }: { nome: string; itens: LinhaDeMinimo[]; rotulo: string }) {
  if (itens.length === 0)
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-8 text-center dark:border-emerald-800 dark:from-emerald-950/50 dark:via-transparent dark:to-emerald-950/30">
        <p className="font-display text-lg font-bold text-emerald-700 dark:text-emerald-200">Tudo certo em {nome}</p>
        <p className="mt-1 text-sm text-muted-foreground">Nenhum item de {rotulo} no mínimo ou abaixo nesta empresa.</p>
      </div>
    );
  const rupturas = itens.filter((l) => l.total <= 0).length;
  const faltam = itens.reduce((t, l) => t + Math.max(0, l.minimo - l.total), 0);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Resumo rotulo="Itens em alerta" valor={itens.length} />
          <Resumo rotulo="Sem estoque" valor={rupturas} destaque={rupturas > 0} />
          <Resumo rotulo="Unidades até o mínimo" valor={faltam} />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportarCsv(
              `estoque-minimo-${nome.replace(/[^\p{L}\p{N}]+/gu, "-")}`,
              itens.map((l) => ({ Código: l.codigo, Descrição: l.descricao, Empresa: nome, Saldo: l.total, Mínimo: l.minimo, Faltam: Math.max(0, l.minimo - l.total) })),
            )
          }
        >
          Exportar CSV
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {itens.map((l) => (
          <CartaoDoItem key={l.chave} l={l} />
        ))}
      </ul>
    </>
  );
}

function Resumo({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 ${destaque ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" : "bg-muted/60"}`}>
      {rotulo}: <strong>{valor}</strong>
    </span>
  );
}

function CartaoDoItem({ l }: { l: LinhaDeMinimo }) {
  const ruptura = l.total <= 0;
  const abaixo = l.total < l.minimo;
  const pct = l.minimo > 0 ? Math.max(0, Math.min(100, Math.round((l.total / l.minimo) * 100))) : 0;
  const falta = Math.max(0, l.minimo - l.total);
  const tom = abaixo
    ? "border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50 dark:border-red-800 dark:from-red-950/50 dark:via-transparent dark:to-red-950/30"
    : "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:border-amber-800 dark:from-amber-950/50 dark:via-transparent dark:to-amber-950/30";
  return (
    <li className={`flex flex-col gap-2 rounded-2xl border p-3 shadow-sm ${tom}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{l.codigo}</p>
          <p className="text-sm font-semibold leading-snug">{l.descricao}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${abaixo ? "bg-red-600" : "bg-amber-500"}`}>
          {ruptura ? <PackageX className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
          {ruptura ? "Sem estoque" : abaixo ? "Abaixo do mínimo" : "No mínimo"}
        </span>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className="font-display text-2xl font-bold leading-none">{l.total}</p>
          <p className="text-xs text-muted-foreground">saldo</p>
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none text-muted-foreground">{l.minimo}</p>
          <p className="text-xs text-muted-foreground">mínimo</p>
        </div>
        {falta > 0 && <p className="ml-auto text-xs font-semibold text-red-700 dark:text-red-300">faltam {falta} para o mínimo</p>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15" role="presentation">
        <div className={`h-full rounded-full ${abaixo ? "bg-red-500" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
