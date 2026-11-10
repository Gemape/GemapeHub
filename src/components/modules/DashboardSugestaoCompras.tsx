import { Link } from "@tanstack/react-router";
import { useMemo, type ReactNode } from "react";
import { AlertTriangle, ShoppingCart, TrendingDown } from "lucide-react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { EtiquetaStatusCompra } from "@/components/modules/LegendaStatusCompra";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresas } from "@/lib/hooks-gemape";
import { itensQuePedemCompra } from "@/lib/sugestao-epi";
import { useParametrosCompraEpi } from "@/lib/use-parametros-compra-epi";
import { useSugestaoCompras } from "@/lib/use-sugestao-compras";

// Dashboard de Uniformes: o que importa da Sugestão de Compras (quantos itens pedem compra, em que status, quanto comprar e quais são), com o caminho para o relatório completo.
// Os cartões do módulo (`cartoes`) e os da sugestão ficam numa só grade, como na Frota (decisão 375): mesma altura, quatro por linha.
export function DashboardSugestaoCompras({ modulo, cartoes }: { modulo: "epi" | "uniforme"; cartoes: ReactNode }) {
  const { todas, alertasMinimo, isLoading } = useSugestaoCompras(modulo);
  const parametrosCompra = useParametrosCompraEpi(modulo);
  const { data: empresas = [] } = useEmpresas();
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const pedem = useMemo(() => itensQuePedemCompra(todas), [todas]);
  const contar = (status: string) => todas.filter((l) => l.status === status).length;
  const unidades = useMemo(() => pedem.reduce((t, l) => t + l.quantidadeSugerida, 0), [pedem]);
  // Um item conta uma vez, mesmo com vários tamanhos no mínimo (os cartões vizinhos também contam itens).
  const abaixoDoMinimo = useMemo(() => new Set(alertasMinimo.map((a) => a.itemId)).size, [alertasMinimo]);
  const rotulo = modulo === "epi" ? "EPI" : "uniforme";

  return (
    <>
      <GradeDeCartoes colunas={4}>
        {cartoes}
        <StatCard
          titulo="Itens para comprar"
          subtitulo={`${rotulo}s em ruptura, comprar já ou planejar.`}
          valor={pedem.length}
          detalhe={`${unidades} unidades sugeridas`}
          icone={ShoppingCart}
          compacto
        />
        <StatCard titulo="Em ruptura" subtitulo="O estoque zera antes de o pedido chegar." valor={contar("ruptura")} icone={AlertTriangle} compacto />
        <StatCard titulo="Comprar já" subtitulo="Estoque de segurança acionado." valor={contar("comprar_ja")} icone={AlertTriangle} compacto />
        <StatCard titulo="Abaixo do mínimo" subtitulo="Itens no estoque mínimo ou abaixo dele." valor={abaixoDoMinimo} icone={TrendingDown} compacto />
      </GradeDeCartoes>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Itens que pedem compra</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to={modulo === "epi" ? "/epi" : "/uniformes"} search={{ aba: "sugestao-compras" }}>
                Abrir a Sugestão de Compras
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Estoque total</TableHead>
                <TableHead className="text-right">Consumo mensal</TableHead>
                <TableHead className="text-right">Cobertura (dias)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>Carregando…</TableCell>
                </TableRow>
              ) : pedem.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Nenhum {rotulo} pede compra no momento.
                  </TableCell>
                </TableRow>
              ) : (
                pedem.slice(0, 10).map((l) => (
                  <TableRow key={l.itemId}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span> {l.descricao}
                    </TableCell>
                    <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                    <TableCell className="text-right">{l.total}</TableCell>
                    <TableCell className="text-right">{l.mediaMensal.toFixed(1).replace(".", ",")}</TableCell>
                    <TableCell className="text-right">{l.cobertura ?? "—"}</TableCell>
                    <TableCell>
                      <EtiquetaStatusCompra status={l.status} parametros={parametrosCompra} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">{l.quantidadeSugerida}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {pedem.length > 10 && <p className="mt-2 text-xs text-muted-foreground">Mostrando 10 de {pedem.length}; o restante está na Sugestão de Compras.</p>}
        </CardContent>
      </Card>
    </>
  );
}
