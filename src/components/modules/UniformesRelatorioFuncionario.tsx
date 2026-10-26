import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerEmpregadosRelatorio, lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { TODAS } from "@/lib/empresa-context";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { nomeTamanhoGravado } from "@/lib/estoque-tamanho";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresas, useItens } from "@/lib/hooks-gemape";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { montarRelatorioTabelaHtml } from "@/lib/relatorio-padrao";

export function UniformesRelatorioFuncionario() {
  const [empresaSel, setEmpresaSel] = useState(TODAS);
  const [empregadoId, setEmpregadoId] = useState("");
  const parametros = useParametrosBase();
  const tamanhoDe = (m: { tamanho_id?: string | null }) =>
    nomeTamanhoGravado(parametros, m.tamanho_id);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useQuery({ queryKey: ["empregados-relatorio", empresaSel], queryFn: () => lerEmpregadosRelatorio(supabase, empresaSel) });
  const { data: itens = [] } = useItens("uniforme", TODAS);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const { data: movimentacoes = [], isLoading, isError, error } = useQuery({
    queryKey: ["relatorio-funcionario", "uniforme", empregadoId, empregado?.empresa_id],
    enabled: Boolean(empregadoId && empregado?.empresa_id),
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "uniforme", empregadoId, empresaId: empregado?.empresa_id ?? undefined }),
  });

  const historico = movimentacoes.filter((m) => m.empregado_id === empregadoId);

  const totalEntregue = historico
    .filter((m) => m.tipo_movimentacao === "Saida" && !ehBaixa(m))
    .reduce((acc, m) => acc + m.quantidade, 0);
  const totalDevolvido = historico
    .filter((m) => m.tipo_movimentacao === "Devolucao")
    .reduce((acc, m) => acc + m.quantidade, 0);
  const totalBaixado = historico
    .filter((m) => ehBaixa(m))
    .reduce((acc, m) => acc + m.quantidade, 0);
  const emPosse = totalEntregue - totalDevolvido - totalBaixado;

  const imprimir = () =>
    abrirDocumento({
      titulo: "Histórico de movimentações de uniforme",
      html: montarRelatorioTabelaHtml({
        titulo: "Histórico de movimentações de uniforme",
        subtitulos: [empregado?.nome],
        empresa: empresas.find((e) => e.id === empregado?.empresa_id)?.nome_fantasia,
        resumo: [["Entregues", String(totalEntregue)], ["Devolvidos", String(totalDevolvido)], ["Baixados", String(totalBaixado)], ["Em posse", String(emPosse)]],
        colunas: [{ titulo: "Data" }, { titulo: "Uniforme" }, { titulo: "Tamanho" }, { titulo: "Tipo" }, { titulo: "Qtd", direita: true }, { titulo: "Status/Motivo" }, { titulo: "Observação" }],
        linhas: historico.map((h) => [
          formatarData(h.data_movimentacao),
          itens.find((i) => i.id === h.item_id)?.nome ?? "—",
          tamanhoDe(h) || "—",
          h.tipo_movimentacao,
          String(h.quantidade),
          h.tipo_movimentacao === "Devolucao" ? "Devolvido" : ehBaixa(h) ? `Baixado: ${h.motivo_baixa ?? "—"}` : "Em posse",
          h.observacao || "—",
        ]),
        vazio: "Nenhuma movimentação para este empregado.",
      }),
      arquivo: nomeArquivoDocumento("Histórico de movimentações de uniforme", empregado?.nome),
    });

  if (isError) return <div role="alert">Não foi possível carregar o histórico completo: {error.message}</div>;
  if (empregado && isLoading) return <div>Carregando histórico completo…</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 items-end">
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Select value={empresaSel} onValueChange={setEmpresaSel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Empregado</Label>
          <Select value={empregadoId} onValueChange={setEmpregadoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o empregado" />
            </SelectTrigger>
            <SelectContent>
              {empregados.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {empregado && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="panel p-4 text-center bg-blue-50/50">
              <p className="text-xs text-muted-foreground uppercase font-bold">Entregues</p>
              <p className="text-2xl font-black">{totalEntregue}</p>
            </div>
            <div className="panel p-4 text-center bg-green-50/50">
              <p className="text-xs text-muted-foreground uppercase font-bold">Devolvidos</p>
              <p className="text-2xl font-black">{totalDevolvido}</p>
            </div>
            <div className="panel p-4 text-center bg-red-50/50">
              <p className="text-xs text-muted-foreground uppercase font-bold">Baixados</p>
              <p className="text-2xl font-black">{totalBaixado}</p>
            </div>
            <div className="panel p-4 text-center bg-primary/10 border-primary/20">
              <p className="text-xs text-primary uppercase font-bold">Em Posse</p>
              <p className="text-2xl font-black text-primary">{emPosse}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Histórico de Movimentações</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={imprimir}>
                Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportarCsv(
                    `historico-${empregado.nome}`,
                    historico.map((h) => ({
                      Data: formatarData(h.data_movimentacao),
                      Uniforme: itens.find((i) => i.id === h.item_id)?.nome,
                      Tamanho: tamanhoDe(h),
                      Tipo: h.tipo_movimentacao,
                      Qtd: h.quantidade,
                      Motivo: h.motivo_baixa || "Entrega/Uso",
                      Obs: h.observacao,
                    })),
                  )
                }
              >
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Uniforme</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Status/Motivo</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Nenhuma movimentação para este empregado.
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{formatarData(h.data_movimentacao)}</TableCell>
                      <TableCell>{itens.find((i) => i.id === h.item_id)?.nome}</TableCell>
                      <TableCell>{tamanhoDe(h) || "—"}</TableCell>
                      <TableCell>{h.tipo_movimentacao}</TableCell>
                      <TableCell className="text-right">{h.quantidade}</TableCell>
                      <TableCell>
                        {h.tipo_movimentacao === "Devolucao"
                          ? "Devolvido"
                          : ehBaixa(h)
                            ? `Baixado: ${h.motivo_baixa}`
                            : "Em posse"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{h.observacao || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
