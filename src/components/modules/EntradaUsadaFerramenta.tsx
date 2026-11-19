import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compraOriginalDaFerramenta, erroDaEntradaUsada, ferramentasDoEmpregado, type MovimentoUsada } from "@/lib/entrada-usada-ferramenta";
import { TODAS } from "@/lib/empresa-context";
import { hojeLocal } from "@/lib/empregados";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { formatarData, formatarMoeda } from "@/lib/gemape";
import { useEmpregados, useItens, useMovimentacoes, useRegistrarMovimentacoesLote, useCaixasFerramentas, useTodosCaixaItens } from "@/lib/hooks-gemape";
import { MODO_DEMO } from "@/lib/modo-demo";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";

const MOTIVO_DEVOLUCAO = "Devolução";

// Entrada usada: o empregado devolve ferramentas que estavam na caixa dele. Cada uma volta ao estoque com a compra original
// (fornecedor, nota, data e custo) e recebe baixa na caixa de onde saiu.
export function EntradaUsadaFerramenta({ aoConcluir, aoCancelar }: { aoConcluir: () => void; aoCancelar: () => void }) {
  const { data: empregados = [] } = useEmpregados(TODAS);
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: caixas = [] } = useCaixasFerramentas(TODAS, "");
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", TODAS);
  const portadores = usePortadoresCaixa();
  const registrar = useRegistrarMovimentacoesLote(["estoque-modulo", "movimentacoes", "ferramentas"]);
  const [empregadoId, setEmpregadoId] = useState("");
  const [data, setData] = useState(hojeLocal());
  const [marcadas, setMarcadas] = useState<Record<string, number>>({});
  const historico = movimentos as unknown as MovimentoUsada[];

  const comFerramenta = (id: string) => ferramentasDoEmpregado(id, portadores, itensDeTodas, historico);
  const portadoresComFerramenta = empregados.filter((e) => comFerramenta(e.id).length > 0);
  const linhas = empregadoId ? comFerramenta(empregadoId) : [];
  const ferramenta = (id: string) => ferramentas.find((f) => f.id === id);
  const nome = (id: string) => { const f = ferramenta(id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}${sufixoTamanhoFerramenta(f)}` : "—"; };
  const codigoDaCaixa = (id: string) => caixas.find((c) => c.id === id)?.codigo ?? "—";
  const chave = (l: { caixaId: string; ferramentaId: string }) => `${l.caixaId}|${l.ferramentaId}`;

  function devolver() {
    const escolhidas = linhas.filter((l) => chave(l) in marcadas);
    const semCompra = escolhidas.filter((l) => !compraOriginalDaFerramenta(historico, l.ferramentaId)).map((l) => l.ferramentaId);
    const erro = erroDaEntradaUsada(empregadoId, data, escolhidas.map((l) => ({ ferramentaId: l.ferramentaId, nome: nome(l.ferramentaId), caixaId: l.caixaId, quantidade: marcadas[chave(l)] ?? 0, disponivel: l.disponivel })), semCompra);
    if (erro) return void alert(erro);
    const empregado = empregados.find((e) => e.id === empregadoId);
    const lote = escolhidas.flatMap((l) => {
      const f = ferramenta(l.ferramentaId);
      const compra = compraOriginalDaFerramenta(historico, l.ferramentaId);
      if (!f || !compra) return [];
      const qtde = marcadas[chave(l)] ?? 0;
      const base = { modulo: "ferramenta" as const, item_id: l.ferramentaId, veiculo_id: null, empresa_id: f.empresa_id, quantidade: qtde, sinalizar_ocorrencia: false, tipo_vistoria: null, tipo_ocorrencia: null, conducao_ocorrencia: null, origem_local: null, destino_local: null };
      const quem = `devolvida por ${empregado?.nome ?? "empregado"} da caixa ${codigoDaCaixa(l.caixaId)} em ${formatarData(data)}`;
      return [
        // A baixa sai da caixa de origem; o ônus é da empresa, porque a ferramenta não se perdeu.
        { ...base, empregado_id: null, tipo_movimentacao: "Saida", motivo_baixa: MOTIVO_DEVOLUCAO, onus_baixa: "Da Empresa", data_movimentacao: data, observacao: `Baixa pela caixa ${codigoDaCaixa(l.caixaId)}. Devolução ao estoque (entrada usada).`.slice(0, 500), ...(MODO_DEMO ? { caixa_id: l.caixaId } : {}) },
        // A entrada usada guarda a compra original: a data de compra é a da entrada que a trouxe, e a da devolução fica na observação.
        { ...base, empregado_id: null, tipo_movimentacao: "Entrada", motivo_baixa: null, onus_baixa: null, data_movimentacao: compra.dataCompra,
          observacao: capitalizarTexto(`Entrada usada: ferramenta ${quem}. Compra original: ${compra.fornecedor ?? "—"}${compra.notaFiscal ? ` · NF ${compra.notaFiscal}` : ""}`).slice(0, 500),
          ...(MODO_DEMO ? { condicao: "usado", fornecedor: compra.fornecedor, fornecedor_id: compra.fornecedorId, nota_fiscal: compra.notaFiscal, valor_unitario: compra.valorUnitario, valor_total: Math.round(qtde * compra.valorUnitario * 100) / 100 } : {}) },
      ];
    });
    registrar.mutate(lote, { onSuccess: aoConcluir });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="usada-empregado">Empregado que devolve</Label>
        <Select value={empregadoId} onValueChange={(v) => { setEmpregadoId(v); setMarcadas({}); }}>
          <SelectTrigger id="usada-empregado"><SelectValue placeholder={portadoresComFerramenta.length === 0 ? "Nenhum empregado com ferramenta" : "Escolha o empregado"} /></SelectTrigger>
          <SelectContent>{portadoresComFerramenta.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="usada-data">Data da devolução</Label>
        <Input id="usada-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      {empregadoId && (
        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="text-sm font-medium">Ferramentas que ele porta</legend>
          {linhas.map((l) => {
            const compra = compraOriginalDaFerramenta(historico, l.ferramentaId);
            const marcada = chave(l) in marcadas;
            return (
              <div key={chave(l)} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm">
                <input type="checkbox" id={`usada-${chave(l)}`} checked={marcada} onChange={(e) => setMarcadas((m) => { const { [chave(l)]: _tira, ...resto } = m; return e.target.checked ? { ...resto, [chave(l)]: 1 } : resto; })} />
                <label htmlFor={`usada-${chave(l)}`} className="min-w-0 flex-1">
                  <span className="font-medium">{nome(l.ferramentaId)}</span>
                  <span className="block text-xs text-muted-foreground">
                    Caixa {codigoDaCaixa(l.caixaId)} · na caixa {l.disponivel}
                    {compra ? ` · compra ${compra.fornecedor ?? "—"}${compra.notaFiscal ? ` NF ${compra.notaFiscal}` : ""}, ${formatarData(compra.dataCompra)}, ${formatarMoeda(compra.valorUnitario)}` : " · sem entrada registrada"}
                  </span>
                </label>
                {marcada && <Input aria-label={`Quantidade de ${nome(l.ferramentaId)}`} className="w-20" type="number" min={1} max={l.disponivel} step={1} value={marcadas[chave(l)] ?? 1} onChange={(e) => setMarcadas((m) => ({ ...m, [chave(l)]: e.target.valueAsNumber }))} />}
              </div>
            );
          })}
        </fieldset>
      )}
      <p className="text-xs text-muted-foreground sm:col-span-2">Cada ferramenta volta ao estoque como usada, com fornecedor, nota, data de compra e custo da compra original, e recebe baixa na caixa de onde saiu.</p>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={aoCancelar}>Cancelar</Button>
        <Button requiresWrite="operar" type="button" disabled={registrar.isPending} onClick={devolver}>Registrar entrada usada</Button>
      </DialogFooter>
    </div>
  );
}
