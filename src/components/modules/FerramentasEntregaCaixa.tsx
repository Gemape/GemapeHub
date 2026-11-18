import { useState } from "react";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { hojeLocal } from "@/lib/empregados";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { MODO_DEMO } from "@/lib/modo-demo";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { posicaoDasFerramentas } from "@/lib/estoque-ferramentas-posicao";
import { entregarFerramentaNaCaixa } from "@/lib/movimentacoes-caixa";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { rotuloDaCaixaComPortador } from "@/lib/portadores-caixa";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useCaixasFerramentas, useItens, useMovimentacoes, useRegistrarMovimentacoesLote, useSalvarCaixa, useTodosCaixaItens } from "@/lib/hooks-gemape";

// Origem gravada na movimentação: é o que separa a entrega à caixa das transferências entre caixas.
export const ORIGEM_ENTREGA_CAIXA = "Estoque";

// Ferramentas > Movimentações > Entrega à caixa: a ferramenta do estoque vai para uma caixa, sem pessoa no vínculo.
export function FerramentasEntregaCaixa() {
  const { empresaId } = useEmpresa();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const caixas = caixasHabilitadas(todasCaixas, habilitadas).filter((c) => empresaId === TODAS || c.empresa_id === empresaId);
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const portadores = usePortadoresCaixa();
  const salvarCaixa = useSalvarCaixa();
  const registrar = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"], false);
  const [caixaId, setCaixaId] = useState("");
  const [ferramentaId, setFerramentaId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [data, setData] = useState(hojeLocal());
  const [observacao, setObservacao] = useState("");

  const posicoes = new Map(posicaoDasFerramentas(ferramentas, movimentos, itensDeTodas).map((p) => [p.ferramentaId, p]));
  const caixa = caixas.find((c) => c.id === caixaId);
  const ferramenta = ferramentas.find((f) => f.id === ferramentaId);
  const codigoDaCaixa = (id: string | null | undefined) => todasCaixas.find((c) => c.id === id)?.codigo ?? "—";
  const nomeFerramenta = (id: string | null) => { const f = ferramentas.find((x) => x.id === id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}` : "—"; };
  // Só as ferramentas ativas da empresa da caixa; as que estão em outra caixa aparecem travadas, como no vínculo da caixa.
  const candidatas = ferramentas.filter((f) => f.status === "Ativo" && (!caixa || !caixa.empresa_id || f.empresa_id === caixa.empresa_id));
  const caixaDaFerramenta = (id: string) => itensDeTodas.find((i) => i.ferramenta_id === id)?.caixa_id ?? null;
  const entregas = movimentos.filter((m) => m.tipo_movimentacao === "Transferencia" && m.origem_local === ORIGEM_ENTREGA_CAIXA);

  function entregar() {
    if (!caixa) return void alert("Escolha a caixa.");
    const outra = ferramenta ? caixaDaFerramenta(ferramenta.id) : null;
    const resultado = entregarFerramentaNaCaixa({
      ferramentaId,
      nomeFerramenta: ferramenta?.nome ?? "A ferramenta",
      quantidade,
      data,
      empresaDaCaixa: caixa.empresa_id,
      empresaDaFerramenta: ferramenta?.empresa_id ?? null,
      itensDaCaixa: itensDeTodas.filter((i) => i.caixa_id === caixa.id).map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao })),
      emOutraCaixa: outra && outra !== caixa.id ? codigoDaCaixa(outra) : null,
      semCaixa: posicoes.get(ferramentaId)?.semCaixa ?? 0,
    });
    if ("erro" in resultado) return void alert(resultado.erro);
    salvarCaixa.mutate(
      {
        id: caixa.id,
        valores: { codigo: caixa.codigo, codigo_num: caixa.codigo_num, empresa_id: caixa.empresa_id, nome: caixa.nome, descricao: caixa.descricao, localizacao: caixa.localizacao, status: caixa.status },
        itens: resultado.itens.map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao ?? "" })),
      },
      {
        // O registro da movimentação só sai depois de a caixa gravar, para o histórico não ter entrega que não aconteceu.
        onSuccess: () => {
          registrar.mutate([{
            modulo: "ferramenta", item_id: ferramentaId, veiculo_id: null, empresa_id: ferramenta?.empresa_id ?? caixa.empresa_id, empregado_id: null,
            tipo_movimentacao: "Transferencia", motivo_baixa: null, quantidade, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false,
            tipo_ocorrencia: null, conducao_ocorrencia: null, data_movimentacao: data, origem_local: ORIGEM_ENTREGA_CAIXA, destino_local: caixa.codigo,
            observacao: `Entrega à caixa ${caixa.codigo}.${observacao.trim() ? ` ${capitalizarTexto(observacao.trim())}` : ""}`.slice(0, 500),
            ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
          }]);
          setFerramentaId(""); setQuantidade(1); setObservacao("");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel max-w-3xl space-y-4 p-5" aria-label="Entrega à caixa">
        <p className="text-sm text-muted-foreground">A ferramenta do estoque é entregue a uma caixa. Quem usa a caixa é o portador dela; o vínculo é com a caixa, não com a pessoa.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="entrega-caixa">Caixa</Label>
            <Select value={caixaId} onValueChange={(v) => { setCaixaId(v); setFerramentaId(""); }}>
              <SelectTrigger id="entrega-caixa"><SelectValue placeholder={isLoading ? "Carregando..." : "Escolha a caixa"} /></SelectTrigger>
              <SelectContent>{[...caixas].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")).map((c) => <SelectItem key={c.id} value={c.id}>{rotuloDaCaixaComPortador(portadores, c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entrega-ferramenta">Ferramenta</Label>
            <Select value={ferramentaId} onValueChange={setFerramentaId} disabled={!caixa}>
              <SelectTrigger id="entrega-ferramenta"><SelectValue placeholder={caixa ? "Escolha a ferramenta" : "Escolha a caixa primeiro"} /></SelectTrigger>
              <SelectContent>
                {candidatas.map((f) => {
                  const outra = caixaDaFerramenta(f.id);
                  const travada = !!outra && outra !== caixaId;
                  return <SelectItem key={f.id} value={f.id} disabled={travada}>{f.codigo_sku} — {f.nome}{sufixoTamanhoFerramenta(f)} (sem caixa: {Math.max(posicoes.get(f.id)?.semCaixa ?? 0, 0)}){travada ? ` — já na caixa ${codigoDaCaixa(outra)}` : ""}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entrega-quantidade">Quantidade</Label>
            <Input id="entrega-quantidade" type="number" min={1} step={1} value={Number.isNaN(quantidade) ? "" : quantidade} onChange={(e) => setQuantidade(e.target.valueAsNumber)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entrega-data">Data</Label>
            <Input id="entrega-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="entrega-observacao">Observação</Label>
            <Textarea id="entrega-observacao" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button requiresWrite="operar" type="button" disabled={salvarCaixa.isPending || registrar.isPending} onClick={entregar}>Entregar à caixa</Button>
        </div>
      </section>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Caixa</TableHead><TableHead>Ferramenta</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={5} />
              : entregas.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center">Nenhuma entrega à caixa registrada.</TableCell></TableRow>
                : entregas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                    <TableCell className="font-mono text-xs">{m.destino_local ?? codigoDaCaixa(m.caixa_id)}</TableCell>
                    <TableCell>{nomeFerramenta(m.item_id)}</TableCell>
                    <TableCell className="text-right">{m.quantidade}</TableCell>
                    <TableCell className="max-w-64 truncate" title={m.observacao ?? ""}>{m.observacao}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
