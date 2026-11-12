import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { hojeLocal } from "@/lib/empregados";
import { lerSaldosSobResponsabilidade } from "@/lib/encerramento-ferramentas";
import { MOTIVOS_DESLIGAMENTO } from "@/lib/configuracoes-demo";

type Alvo = { id: string; nome: string; empresa_id: string | null; data_admissao?: string | null };

// Ação rápida de desligamento: confirma, pede data e motivo e mostra o que ainda está com o empregado antes de efetivar.
export function DemitirEmpregadoDialog({ alvo, salvando, demo, aoFechar, aoConfirmar }: {
  alvo: Alvo | null;
  demo: boolean;
  salvando: boolean;
  aoFechar: () => void;
  aoConfirmar: (dados: { data: string; motivo: string; pendentes: number }) => void;
}) {
  const [data, setData] = useState(hojeLocal());
  const [motivo, setMotivo] = useState<string>(MOTIVOS_DESLIGAMENTO[0]);
  const [pendentes, setPendentes] = useState<number | null>(null);

  useEffect(() => {
    if (!alvo) return;
    setData(hojeLocal());
    setMotivo(MOTIVOS_DESLIGAMENTO[0]);
    setPendentes(null);
    if (!alvo.empresa_id) return void setPendentes(0);
    let vivo = true;
    lerSaldosSobResponsabilidade(supabase as never, { empregadoId: alvo.id, empresaId: alvo.empresa_id })
      .then((saldos) => vivo && setPendentes(saldos.size))
      .catch(() => vivo && setPendentes(0));
    return () => { vivo = false; };
  }, [alvo]);

  return (
    <Dialog open={!!alvo} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desligar {alvo?.nome}?</DialogTitle>
          <DialogDescription>
            {demo
              ? "Registra o desligamento, aplica o bloqueio de acesso da configuração de segurança (simulado neste teste) e confere as pendências de ferramentas."
              : "Registra o desligamento e confere as pendências de ferramentas."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="data-desligamento">Data do desligamento</Label>
            <Input id="data-desligamento" type="date" min={alvo?.data_admissao ?? undefined} max={hojeLocal()} value={data} onChange={(e) => setData(e.target.value)} />
            <p className="text-xs text-muted-foreground">Desligamento imediato: da admissão até hoje. Para data futura, edite o cadastro.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-desligamento">Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo-desligamento"><SelectValue /></SelectTrigger>
              <SelectContent>{MOTIVOS_DESLIGAMENTO.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className={`rounded-md border px-3 py-2 text-xs ${pendentes ? "border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200" : "bg-muted/40 text-muted-foreground"}`} role="status">
            {pendentes === null
              ? "Conferindo ferramentas sob responsabilidade…"
              : pendentes > 0
                ? `${pendentes} ${pendentes === 1 ? "ferramenta ainda está" : "ferramentas ainda estão"} com o empregado. Um alerta vai ao almoxarifado para recolher no Termo de Encerramento.`
                : "Nenhuma ferramenta pendente com o empregado."}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button>
          <Button requiresWrite type="button" disabled={!data || data > hojeLocal() || (!!alvo?.data_admissao && data < alvo.data_admissao) || pendentes === null || salvando} onClick={() => aoConfirmar({ data, motivo, pendentes: pendentes ?? 0 })}>
            Confirmar desligamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
