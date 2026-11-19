import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogBaixaCaixa, type LinhaCaixa } from "@/components/modules/CaixaGestaoDialogs";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { controleDaFerramenta, disponivelNaCaixa, movimentacoesDaCaixa } from "@/lib/controle-caixa";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useCaixaItens, useCaixasFerramentas, useItens, useMovimentacoes } from "@/lib/hooks-gemape";

// Ferramentas > Movimentações > Baixa definitiva: a ferramenta sai da caixa com motivo e ônus; a baixa fica na caixa, sem pessoa.
export function FerramentasBaixaCaixa() {
  const { empresaId } = useEmpresa();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const caixas = caixasHabilitadas(todasCaixas, habilitadas).filter((c) => empresaId === TODAS || c.empresa_id === empresaId);
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const [caixaId, setCaixaId] = useState("");
  const [aberto, setAberto] = useState(false);
  const caixa = caixas.find((c) => c.id === caixaId);
  const baixas = movimentos.filter((m) => m.tipo_movimentacao === "Saida" && ehBaixa(m) && (!caixaId || m.caixa_id === caixaId));
  const codigoDaCaixa = (id: string | null | undefined) => todasCaixas.find((c) => c.id === id)?.codigo ?? "—";
  const nomeFerramenta = (id: string | null) => { const f = ferramentas.find((x) => x.id === id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}` : "—"; };

  return (
    <div className="space-y-6">
      <section className="panel max-w-3xl space-y-4 p-5" aria-label="Baixa definitiva de ferramenta">
        <p className="text-sm text-muted-foreground">Escolha a caixa de onde a ferramenta sai. A baixa pede o motivo e o ônus e fica registrada na caixa, sem vínculo com pessoa.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="baixa-caixa">Caixa</Label>
            <Select value={caixaId} onValueChange={setCaixaId}>
              <SelectTrigger id="baixa-caixa" className="w-56 max-w-full"><SelectValue placeholder={isLoading ? "Carregando..." : "Escolha a caixa"} /></SelectTrigger>
              <SelectContent>{[...caixas].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")).map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button requiresWrite="operar" type="button" disabled={!caixa} onClick={() => setAberto(true)}>Dar baixa</Button>
        </div>
      </section>
      {aberto && caixa && <BaixaDaCaixa caixa={caixa} aoFechar={() => setAberto(false)} />}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Caixa</TableHead><TableHead>Ferramenta</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead>Motivo</TableHead><TableHead>Ônus</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={7} />
              : baixas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">Nenhuma baixa registrada.</TableCell></TableRow>
                : baixas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                    <TableCell className="font-mono text-xs">{codigoDaCaixa(m.caixa_id)}</TableCell>
                    <TableCell>{nomeFerramenta(m.item_id)}</TableCell>
                    <TableCell className="text-right">{m.quantidade}</TableCell>
                    <TableCell>{m.motivo_baixa}</TableCell>
                    <TableCell>{m.onus_baixa ?? "—"}</TableCell>
                    <TableCell className="max-w-64 truncate" title={m.observacao ?? ""}>{m.observacao}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Monta o que a janela de baixa precisa: as ferramentas da caixa, com o que está guardado e o histórico dela.
function BaixaDaCaixa({ caixa, aoFechar }: { caixa: NonNullable<ReturnType<typeof useCaixasFerramentas>["data"]>[number]; aoFechar: () => void }) {
  const { empresaId } = useEmpresa();
  const { data: itens = [], isSuccess } = useCaixaItens(caixa.id);
  const { data: movimentacoes = [], isSuccess: historicoPronto } = useQuery({
    queryKey: ["movimentacoes", "ferramenta", "caixas", empresaId],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaId === TODAS ? undefined : empresaId }),
  });
  const pronto = isSuccess && historicoPronto;
  const ferramentas = itens.flatMap((ci) => (ci.ferramenta ? [ci.ferramenta] : []));
  const semFerramentas = pronto && ferramentas.length === 0;
  useEffect(() => {
    if (!semFerramentas) return;
    alert("A caixa não tem ferramentas para dar baixa.");
    aoFechar();
    // aoFechar muda a cada desenho do pai; o aviso só depende de a caixa estar vazia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semFerramentas]);
  if (!pronto || semFerramentas) return null;
  const historico = movimentacoesDaCaixa(movimentacoes, caixa.id, ferramentas.map((f) => f.id), caixa.codigo);
  const linhas: LinhaCaixa[] = itens.flatMap((ci) => {
    if (!ci.ferramenta) return [];
    const c = controleDaFerramenta(historico, ci.ferramenta_id);
    return [{ ferramenta: ci.ferramenta, quantidade: ci.quantidade, comEmpregado: c.comEmpregado, disponivel: disponivelNaCaixa(ci.quantidade, c.comEmpregado, c.baixado + c.baixadoDaCaixa) }];
  });
  return <DialogBaixaCaixa caixa={caixa} aberto aoFechar={aoFechar} linhas={linhas} historico={historico} />;
}
