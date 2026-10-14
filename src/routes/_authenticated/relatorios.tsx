import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { lerEmpregadosRelatorio, lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { hojeLocal } from "@/lib/empregados";
import {
  exportarCsv,
  formatarData,
  MODULO_LABEL,
  TIPO_MOVIMENTACAO_LABEL,
  type Modulo,
} from "@/lib/gemape";


export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Relatórios de movimentações de patrimônio por empresa, módulo, período e empregado, com exportação em CSV para Excel.",
      },
      { property: "og:title", content: "Relatórios | Patrimônio GEMAPE" },
      {
        property: "og:description",
        content: "Relatórios e exportações do controle de patrimônio GEMAPE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaRelatorios,
});

const TODOS = "todos";

function PaginaRelatorios() {
  const { empresas, empresaId } = useEmpresa();
  const { data: empregados = [] } = useQuery({ queryKey: ["empregados-relatorio", empresaId], queryFn: () => lerEmpregadosRelatorio(supabase, empresaId) });
  const hoje = hojeLocal();
  const trintaDias = hojeLocal(new Date(Date.now() - 30 * 86_400_000));

  const [modulo, setModulo] = useState<string>(TODOS);
  const [empregadoId, setEmpregadoId] = useState<string>(TODOS);
  const [de, setDe] = useState(trintaDias);
  const [ate, setAte] = useState(hoje);

  const { data: linhas = [], isFetching, isError, error } = useQuery({
    queryKey: ["relatorio", empresaId, modulo, empregadoId, de, ate],
    staleTime: 60_000,
    queryFn: async () => {
      return lerMovimentacoesRelatorio(supabase, {
        empresaId: empresaId === TODAS ? undefined : empresaId,
        modulo: modulo === TODOS ? undefined : modulo,
        empregadoId: empregadoId === TODOS ? undefined : empregadoId,
        de, ate,
      });
    },
  });

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";

  const paraCsv = () =>
    linhas.map((m) => ({
      Data: formatarData(m.data_movimentacao),
      Modulo: MODULO_LABEL[m.modulo as Modulo] ?? m.modulo,
      Tipo: TIPO_MOVIMENTACAO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao,
      Empresa: nomeEmpresa(m.empresa_id),
      Empregado: nomeEmpregado(m.empregado_id),
      Quantidade: m.quantidade,
      MotivoBaixa: m.motivo_baixa,
      Onus: m.onus_baixa,
      Vistoria: m.tipo_vistoria,
      Ocorrencia: m.sinalizar_ocorrencia ? "Sim" : "Não",
      TipoOcorrencia: m.tipo_ocorrencia,
      Conducao: m.conducao_ocorrencia,
      Observacao: m.observacao,
    }));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Gestão</p>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtre as movimentações por empresa, módulo, período e empregado e exporte para Excel.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>O filtro de empresa usa a seleção no topo da página.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Módulo</Label>
            <Select value={modulo} onValueChange={setModulo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                <SelectItem value="epi">EPI</SelectItem>
                <SelectItem value="uniforme">Uniforme</SelectItem>
                <SelectItem value="ferramenta">Ferramenta</SelectItem>
                <SelectItem value="veiculo">Veículo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Empregado</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="de">De</Label>
            <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ate">Até</Label>
            <Input id="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {isError ? `Falha ao carregar o histórico completo: ${error.message}` : isFetching ? "Buscando…" : `${linhas.length} movimentações encontradas.`}
        </p>
        <Button
          className="ml-auto"
          variant="outline"
          disabled={isError || isFetching || linhas.length === 0}
          onClick={() => exportarCsv("relatorio-movimentacoes", paraCsv())}
        >
          Exportar CSV (Excel)
        </Button>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Empregado</TableHead>
              <TableHead className="text-right">Qtde</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Ônus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhuma movimentação no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                  <TableCell>{MODULO_LABEL[m.modulo as Modulo] ?? m.modulo}</TableCell>
                  <TableCell>
                    {TIPO_MOVIMENTACAO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao}
                  </TableCell>
                  <TableCell>{nomeEmpresa(m.empresa_id)}</TableCell>
                  <TableCell>{nomeEmpregado(m.empregado_id)}</TableCell>
                  <TableCell className="text-right">{m.quantidade}</TableCell>
                  <TableCell>{m.motivo_baixa ?? "—"}</TableCell>
                  <TableCell>{m.onus_baixa ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
