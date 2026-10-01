import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData, formatarMoeda } from "@/lib/gemape";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresas, useItens, useEmpregados } from "@/lib/hooks-gemape";

export function EpiRelatorioBaixa() {
  const { empresaId } = useEmpresa();
  const [dataInicial, setDataInicial] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  );
  const [dataFinal, setDataFinal] = useState(new Date().toISOString().slice(0, 10));
  const [motivoFiltro, setMotivoFiltro] = useState(TODAS);
  const parametros = useParametrosBase();
  const tamanhoDe = (m: { tamanho_id?: string | null }) =>
    nomeTamanhoGravado(parametros, m.tamanho_id);

  const { data: movimentacoes = [], isLoading, isError, error } = useQuery({
    queryKey: ["relatorio-baixas", "epi", empresaId, dataInicial, dataFinal],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "epi", empresaId: empresaId === TODAS ? undefined : empresaId, de: dataInicial, ate: dataFinal }),
  });
  const { data: itens = [] } = useItens("epi", TODAS);
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);

  const baixas = movimentacoes.filter(
    (m) =>
      m.tipo_movimentacao === "Saida" &&
      m.motivo_baixa &&
      m.data_movimentacao >= dataInicial &&
      m.data_movimentacao <= dataFinal &&
      (motivoFiltro === TODAS || m.motivo_baixa === motivoFiltro),
  );

  const totalQuantidade = baixas.reduce((acc, b) => acc + b.quantidade, 0);
  const totalValor = baixas.reduce((acc, b) => {
    return acc + b.quantidade * 0;
  }, 0);

  if (isError) return <div role="alert">Não foi possível carregar o histórico completo: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
        <div className="space-y-1.5">
          <Label>Data Inicial</Label>
          <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data Final</Label>
          <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo de Baixa</Label>
          <Select value={motivoFiltro} onValueChange={setMotivoFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todos os motivos</SelectItem>
              <SelectItem value="Fornecimento ao Empregado">Fornecimento ao Empregado</SelectItem>
              <SelectItem value="Desligamento">Desligamento</SelectItem>
              <SelectItem value="Desgaste Natural">Desgaste Natural</SelectItem>
              <SelectItem value="Quebra">Quebra</SelectItem>
              <SelectItem value="Desaparecimento">Desaparecimento</SelectItem>
              <SelectItem value="Perda">Perda</SelectItem>
              <SelectItem value="Mau Uso">Mau Uso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            Imprimir
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              exportarCsv(
                "relatorio-baixas-epi",
                baixas.map((b) => ({
                  Data: formatarData(b.data_movimentacao),
                  Empresa: empresas.find((e) => e.id === b.empresa_id)?.nome_fantasia,
                  Empregado: empregados.find((e) => e.id === b.empregado_id)?.nome ?? "—",
                  EPI: itens.find((i) => i.id === b.item_id)?.nome,
                  Tamanho: tamanhoDe(b),
                  Motivo: b.motivo_baixa,
                  Qtd: b.quantidade,
                  Valor: "R$ 0,00",
                })),
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-4 text-center">
          <p className="text-sm text-muted-foreground">Total de Baixas</p>
          <p className="text-2xl font-black">{baixas.length}</p>
        </div>
        <div className="panel p-4 text-center">
          <p className="text-sm text-muted-foreground">Total de Peças</p>
          <p className="text-2xl font-black">{totalQuantidade}</p>
        </div>
        <div className="panel p-4 text-center border-l-4 border-l-red-500">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="text-2xl font-black text-red-600">{formatarMoeda(totalValor)}</p>
        </div>
      </div>

      <div className="panel overflow-x-auto print:border-none print:shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Empregado</TableHead>
              <TableHead>EPI</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : baixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Nenhuma baixa no período.
                </TableCell>
              </TableRow>
            ) : (
              baixas.map((b) => {
                const item = itens.find((i) => i.id === b.item_id);
                const valorB = b.quantidade * 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell>{formatarData(b.data_movimentacao)}</TableCell>
                    <TableCell>
                      {empresas.find((e) => e.id === b.empresa_id)?.nome_fantasia}
                    </TableCell>
                    <TableCell>
                      {empregados.find((e) => e.id === b.empregado_id)?.nome ?? "—"}
                    </TableCell>
                    <TableCell>{item?.nome}</TableCell>
                    <TableCell>{tamanhoDe(b) || "—"}</TableCell>
                    <TableCell>{b.motivo_baixa}</TableCell>
                    <TableCell className="text-right">{b.quantidade}</TableCell>
                    <TableCell className="text-right font-bold">{formatarMoeda(valorB)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
