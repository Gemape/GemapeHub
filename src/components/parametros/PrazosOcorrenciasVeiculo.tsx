import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PRAZO_OCORRENCIA_MAXIMO_DIAS, lerPrazosOcorrencias, lerProrrogacaoOcorrencias, prazoOcorrenciaValido, salvarPrazosOcorrencias, salvarProrrogacaoOcorrencias } from "@/lib/prazo-ocorrencias";

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));

// Cartão de Parâmetros > Veículos > Parâmetros Específicos (decisão 307): em quantos dias a tratativa de uma ocorrência deve começar e em quantos deve terminar.
// Só parametriza: a Frota usa os dois prazos para marcar a ocorrência como vencida ou com vencimento próximo.
export function PrazosOcorrenciasVeiculo() {
  const [salvo, setSalvo] = useState(lerPrazosOcorrencias);
  const [iniciar, setIniciar] = useState(String(salvo.iniciar));
  const [finalizar, setFinalizar] = useState(String(salvo.finalizar));
  const [prorrogacaoSalva, setProrrogacaoSalva] = useState(lerProrrogacaoOcorrencias);
  const [permitir, setPermitir] = useState(prorrogacaoSalva.permitir);
  const [diasProrrogar, setDiasProrrogar] = useState(String(prorrogacaoSalva.dias));
  const novo = { iniciar: numeroDe(iniciar), finalizar: numeroDe(finalizar) };
  const novaProrrogacao = { permitir, dias: numeroDe(diasProrrogar) };
  const valido = prazoOcorrenciaValido(novo.iniciar) && prazoOcorrenciaValido(novo.finalizar) && (!permitir || prazoOcorrenciaValido(novaProrrogacao.dias));
  const igual = valido && novo.iniciar === salvo.iniciar && novo.finalizar === salvo.finalizar && permitir === prorrogacaoSalva.permitir && (!permitir || novaProrrogacao.dias === prorrogacaoSalva.dias);

  function salvar() {
    if (!valido) return;
    try {
      // Com a prorrogação desligada, os dias que já estavam guardados ficam como estão (o campo fica desabilitado).
      const prorrogacao = permitir ? novaProrrogacao : { permitir, dias: prorrogacaoSalva.dias };
      salvarPrazosOcorrencias(novo);
      salvarProrrogacaoOcorrencias(prorrogacao);
      setSalvo(novo);
      setProrrogacaoSalva(prorrogacao);
      setDiasProrrogar(String(prorrogacao.dias));
      toast.success("Prazos das ocorrências salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os prazos.");
    }
  }

  const campo = (id: string, titulo: string, ajuda: string, valor: string, definir: (v: string) => void) => (
    <div className="space-y-2 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <p className="text-xs text-muted-foreground">{ajuda}</p>
      <div className="space-y-1">
        <Label htmlFor={`prazo-ocorrencia-${id}`}>Dias</Label>
        <Input
          id={`prazo-ocorrencia-${id}`} type="number" inputMode="numeric" min={0} max={PRAZO_OCORRENCIA_MAXIMO_DIAS} step={1} value={valor}
          aria-invalid={!prazoOcorrenciaValido(numeroDe(valor))} onChange={(e) => definir(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <section className="space-y-3" aria-labelledby="prazos-ocorrencias">
      <div className="max-w-3xl">
        <h2 id="prazos-ocorrencias" className="text-lg font-semibold">Prazos das ocorrências</h2>
        <p className="text-sm text-muted-foreground">Dias para iniciar e para finalizar a tratativa das ocorrências de veículos e a prorrogação da tratativa. Passado o prazo, a ocorrência aparece como vencida na Frota.</p>
      </div>
      <div className="panel max-w-3xl space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {campo("iniciar", "Nº de dias para iniciar a tratativa", "Dias depois do dia da ocorrência. Com 0, a tratativa tem de começar no mesmo dia.", iniciar, setIniciar)}
          {campo("finalizar", "Nº de dias para finalizar a tratativa", "Dias depois do início da tratativa, para encerrar a ocorrência.", finalizar, setFinalizar)}
          <div className="space-y-2 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Prorrogar a tratativa</h3>
            <p className="text-xs text-muted-foreground">Mostra o botão Renovar prazo na ocorrência e define quantos dias a nova data limite sugere a partir de hoje.</p>
            <div className="flex items-center gap-2">
              <Checkbox id="prazo-ocorrencia-permitir" checked={permitir} onCheckedChange={(v) => setPermitir(v === true)} />
              <Label htmlFor="prazo-ocorrencia-permitir">Permitir prorrogar a tratativa</Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="prazo-ocorrencia-prorrogar">Dias</Label>
              <Input
                id="prazo-ocorrencia-prorrogar" type="number" inputMode="numeric" min={0} max={PRAZO_OCORRENCIA_MAXIMO_DIAS} step={1} value={diasProrrogar} disabled={!permitir}
                aria-invalid={!prazoOcorrenciaValido(numeroDe(diasProrrogar))} onChange={(e) => setDiasProrrogar(e.target.value)}
              />
            </div>
          </div>
        </div>
        {!valido && <p role="alert" className="text-sm text-destructive">Informe números inteiros de dias entre 0 e {PRAZO_OCORRENCIA_MAXIMO_DIAS}.</p>}
        <Button requiresWrite disabled={!valido || igual} onClick={salvar}>Salvar prazos</Button>
      </div>
    </section>
  );
}
