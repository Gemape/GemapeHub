import { Lightbulb } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Faixa } from "@/lib/faixas-desempenho";
import type { Interpretacao } from "@/lib/frota-interpretacao";

// Interpretação dos indicadores da Frota (decisão 345): o botão abre a leitura de cada indicador em linguagem simples, com a cor da faixa, para o gestor saber o que o resultado quer dizer e o que fazer.
const PONTO: Record<Faixa, string> = { verde: "bg-emerald-500", amarelo: "bg-amber-400", vermelho: "bg-red-500" };
const ROTULO: Record<Faixa, string> = { verde: "Verde", amarelo: "Amarelo", vermelho: "Vermelho" };

export function InterpretacaoFrota({ itens }: { itens: Interpretacao[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Lightbulb className="mr-2 size-4" aria-hidden="true" />
        Interpretar indicadores
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Interpretação dos indicadores da frota</DialogTitle>
            <DialogDescription>O que cada resultado quer dizer e o que fazer, pela faixa em que o indicador está agora.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3" aria-label="Interpretação dos indicadores">
            {itens.map((i) => (
              <li key={i.titulo} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-eyebrow">{i.titulo}</p>
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <span aria-hidden="true" className={`size-2.5 rounded-full ${i.faixa ? PONTO[i.faixa] : "bg-slate-400"}`} />
                    {i.valor}
                    <span className="text-xs font-medium text-muted-foreground">{i.faixa ? ROTULO[i.faixa] : "Sem faixa"}</span>
                  </p>
                </div>
                <p className="mt-1.5 text-sm">{i.leitura}</p>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
