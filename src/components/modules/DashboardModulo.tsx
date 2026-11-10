import { Boxes, PackageCheck, Wallet } from "lucide-react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { DashboardFerramentas } from "@/components/modules/DashboardFerramentas";
import { DashboardSugestaoCompras } from "@/components/modules/DashboardSugestaoCompras";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import {
  formatarData,
  formatarMoeda,
  valorTotalEmEstoque,
  TIPO_MOVIMENTACAO_LABEL,
  type Modulo,
} from "@/lib/gemape";
import { useEmpregados, useItens, useMovimentacoes } from "@/lib/hooks-gemape";

export function DashboardModulo({ modulo }: { modulo: Modulo }) {
  const { empresaId } = useEmpresa();
  const { data: itens = [] } = useItens(modulo, empresaId);
  const { data: movimentacoes = [] } = useMovimentacoes(modulo, empresaId, 20);
  const { data: empregados = [] } = useEmpregados(empresaId);

  const totalEstoque = itens.reduce((s, i) => s + i.estoque_atual, 0);
  const valorEstoque = valorTotalEmEstoque(itens);
  const emUso = movimentacoes
    .filter((m) => m.tipo_movimentacao === "Saida")
    .reduce((s, m) => s + m.quantidade, 0);

  const custoEmpresa = movimentacoes
    .filter((m) => m.onus_baixa === "Da Empresa")
    .reduce((s, m) => s + m.quantidade * (m.preco_unitario_registrado ?? 0), 0);
  const custoEmpregado = movimentacoes
    .filter((m) => m.onus_baixa === "Do Empregado")
    .reduce((s, m) => s + m.quantidade * (m.preco_unitario_registrado ?? 0), 0);


  const ocorrencias = movimentacoes.filter((m) => m.sinalizar_ocorrencia);
  const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";

  const cartoes = (
    <>
      <StatCard
        titulo="Itens nesta consulta"
        subtitulo="Itens da lista filtrada e o estoque somado deles."
        valor={itens.length}
        detalhe={`${totalEstoque} unidades em estoque`}
        icone={Boxes}
        compacto
      />
      <StatCard
        titulo="Saídas recentes"
        subtitulo="Unidades entregues nas últimas movimentações."
        valor={emUso}
        icone={PackageCheck}
        compacto
      />
      <StatCard
        titulo="Valor em estoque"
        subtitulo="Itens carregados × preço informado; sem preço conta como zero."
        valor={formatarMoeda(valorEstoque)}
        icone={Wallet}
        compacto
      />
    </>
  );

  return (
    <div className="space-y-5">
      {/* EPI e Uniformes: os cartões da Sugestão de Compras entram na mesma grade e a lista do que pede compra vem logo abaixo. Ferramentas: os do estoque por posição. */}
      {modulo === "uniforme" || modulo === "epi" ? (
        <DashboardSugestaoCompras modulo={modulo} cartoes={cartoes} />
      ) : modulo === "ferramenta" ? (
        <DashboardFerramentas cartoes={cartoes} />
      ) : (
        <GradeDeCartoes colunas={4}>{cartoes}</GradeDeCartoes>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimentações recentes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empregado</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Sem movimentações.
                    </TableCell>
                  </TableRow>
                ) : (
                  movimentacoes.slice(0, 10).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                      <TableCell>
                        {TIPO_MOVIMENTACAO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao}
                      </TableCell>
                      <TableCell>{nomeEmpregado(m.empregado_id)}</TableCell>
                      <TableCell className="text-right">{m.quantidade}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custos nas 20 movimentações recentes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-eyebrow">Da empresa</p>
              <p className="mt-1 font-display text-xl font-bold">{formatarMoeda(custoEmpresa)}</p>
            </div>
            <div className="rounded-md bg-muted p-4">
              <p className="text-eyebrow">Do empregado</p>
              <p className="mt-1 font-display text-xl font-bold">{formatarMoeda(custoEmpregado)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocorrências nas 20 movimentações recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ocorrencias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência sinalizada.</p>
            ) : (
              ocorrencias.slice(0, 6).map((o) => (
                <div key={o.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatarData(o.data_movimentacao)}</span>
                    <Badge variant="destructive">Sim</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{o.tipo_ocorrencia ?? "—"}</p>
                  <p className="text-muted-foreground">{o.conducao_ocorrencia ?? "—"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
