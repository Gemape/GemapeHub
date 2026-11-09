import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SeletorComBusca } from "@/components/SeletorComBusca";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { controleDaFerramenta } from "@/lib/controle-caixa";
import { TODAS } from "@/lib/empresa-context";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { lerMotivosDevolucaoEpi } from "@/lib/epi-parametros";
import { useEmpregados, useItens, useMovimentacoes, useRegistrarMovimentacoesLote } from "@/lib/hooks-gemape";
import { MODO_DEMO } from "@/lib/modo-demo";

type Escolha = { marcado: boolean; quantidade: number; motivo: string };

// Devolução de ferramenta na Entrada no estoque, como a de EPIs e uniformes (decisão 327): a primeira pergunta é o empregado; dele sai a lista das ferramentas que
// ele tem em posse, e o que é devolvido volta para o estoque da empresa como usado. A ferramenta é da empresa, por isso a devolução muda a posição e não o saldo.
export function DevolucaoFerramentaDialog({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  const [empregadoId, setEmpregadoId] = useState("");
  const [data, setData] = useState(hojeLocal());
  const [observacao, setObservacao] = useState("");
  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>({});
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const { data: itens = [] } = useItens("ferramenta", TODAS);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", TODAS);
  const registrar = useRegistrarMovimentacoesLote(["estoque-modulo"]);
  // Lê de novo a cada abertura, para pegar o motivo recém-cadastrado.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const motivos = useMemo(() => lerMotivosDevolucaoEpi(), [aberto]);
  const empregado = empregados.find((e) => e.id === empregadoId);

  const emPosse = useMemo(() => {
    const doEmpregado = movimentos.filter((m) => m.empregado_id === empregadoId && m.item_id);
    return [...new Set(doEmpregado.map((m) => m.item_id as string))]
      .map((id) => ({ item: itens.find((i) => i.id === id), quantidade: controleDaFerramenta(doEmpregado, id).comEmpregado }))
      .filter((l): l is { item: NonNullable<typeof l.item>; quantidade: number } => !!l.item && l.quantidade > 0);
  }, [movimentos, itens, empregadoId]);
  const escolha = (id: string, posse: number): Escolha => escolhas[id] ?? { marcado: false, quantidade: posse, motivo: "" };
  const mudar = (id: string, posse: number, parte: Partial<Escolha>) => setEscolhas((a) => ({ ...a, [id]: { ...escolha(id, posse), ...parte } }));

  function fechar(a: boolean) {
    if (!a) {
      setEmpregadoId("");
      setEscolhas({});
      setObservacao("");
      setData(hojeLocal());
    }
    onAbrirMudou(a);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (registrar.isPending) return;
    if (!empregado) return void alert("Escolha o empregado.");
    const marcadas = emPosse.filter((l) => escolha(l.item.id, l.quantidade).marcado);
    if (marcadas.length === 0) return void alert("Marque pelo menos uma ferramenta para devolver.");
    if (!data) return void alert("Informe a data da devolução.");
    const bloqueio = bloqueioPorDemissao(empregado, "devolucao", data);
    if (bloqueio) return void alert(bloqueio);
    for (const l of marcadas) {
      const { quantidade, motivo } = escolha(l.item.id, l.quantidade);
      if (!Number.isInteger(Number(quantidade)) || quantidade < 1 || quantidade > l.quantidade) return void alert(`Informe uma quantidade inteira entre 1 e ${l.quantidade} para ${l.item.nome}.`);
      if (!motivo) return void alert(`Escolha o motivo da devolução de ${l.item.nome}.`);
    }
    registrar.mutate(
      marcadas.map((l) => ({
        modulo: "ferramenta", item_id: l.item.id, veiculo_id: null, empresa_id: l.item.empresa_id, empregado_id: empregado.id, tipo_movimentacao: "Devolucao",
        motivo_baixa: null, quantidade: Number(escolha(l.item.id, l.quantidade).quantidade), onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false,
        tipo_ocorrencia: null, conducao_ocorrencia: null, data_movimentacao: data, origem_local: null, destino_local: null, observacao: observacao.trim().slice(0, 500) || null,
        // Colunas só do modo demonstração: o banco real ainda não as tem (Fase 2).
        ...(MODO_DEMO ? { condicao: "usado", motivo_devolucao: escolha(l.item.id, l.quantidade).motivo } : {}),
      })),
      { onSuccess: () => { toast.success("Devolução registrada como entrada de usada"); fechar(false); } },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Devolução de ferramenta</DialogTitle>
          <DialogDescription>O que for devolvido volta para o estoque da empresa como usada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dev-fer-empregado">Empregado</Label>
              <SeletorComBusca id="dev-fer-empregado" nome="empregado_id" valor={empregadoId} opcoes={empregados.map((e) => ({ id: e.id, rotulo: e.nome }))} onChange={(v) => { setEmpregadoId(v); setEscolhas({}); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dev-fer-data">Data da devolução</Label>
              <Input id="dev-fer-data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          {empregado && (
            <div className="space-y-2">
              <Label className="text-lg font-bold">Ferramentas em posse do empregado</Label>
              {emPosse.length === 0 ? <p className="text-sm text-muted-foreground">Este empregado não tem ferramentas em posse.</p> : emPosse.map((l) => {
                const c = escolha(l.item.id, l.quantidade);
                return (
                  <div key={l.item.id} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[auto_1fr_6rem_12rem]">
                    <Checkbox aria-label={`Devolver ${l.item.nome}`} checked={c.marcado} onCheckedChange={(v) => mudar(l.item.id, l.quantidade, { marcado: v === true })} />
                    <div><p className="font-mono text-xs">{l.item.codigo_sku}</p><p>{l.item.nome}</p><p className="text-xs text-muted-foreground">Em posse: {l.quantidade}</p></div>
                    <div className="space-y-1"><Label htmlFor={`dev-fer-q-${l.item.id}`}>Qtde</Label><Input id={`dev-fer-q-${l.item.id}`} type="number" min={1} max={l.quantidade} value={c.quantidade} onChange={(e) => mudar(l.item.id, l.quantidade, { quantidade: Number(e.target.value) })} /></div>
                    <div className="space-y-1">
                      <Label>Motivo</Label>
                      <Select value={c.motivo} onValueChange={(v) => mudar(l.item.id, l.quantidade, { motivo: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dev-fer-obs">Observação</Label>
            <Textarea id="dev-fer-obs" capitalizar="texto" maxLength={500} rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
            <Button requiresWrite="operar" type="submit" disabled={registrar.isPending}>Registrar devolução</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
