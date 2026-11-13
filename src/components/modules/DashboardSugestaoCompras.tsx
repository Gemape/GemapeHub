import { LinhasEsqueleto } from "@/components/Esqueletos";
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
import { indicadorDeEstoque, textoPercentual } from "@/lib/indicador-estoque";
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
  // Cada cartão é um percentual de itens "em ordem", com a cor e a seta da faixa, como os da Frota.
  const total = todas.length;
  const ruptura = contar("ruptura");
  const comprarJa = contar("comprar_ja");
  const semCompra = indicadorDeEstoque(total - pedem.length, total);
  const semRuptura = indicadorDeEstoque(total - ruptura, total);
  const foraDeComprarJa = indicadorDeEstoque(total - comprarJa, total);
  const acimaDoMinimo = indicadorDeEstoque(total - abaixoDoMinimo, total);

  return (
    <>
      <GradeDeCartoes colunas={4} classe="xl:w-7/12">
        {cartoes}
        <StatCard
          titulo="Estoque · Itens sem necessidade de compra"
          subtitulo={`${rotulo}s fora de ruptura, comprar já e planejar ÷ todos os itens.`}
          valor={textoPercentual(semCompra.pct)}
          {...semCompra}
          detalhe={`${pedem.length} de ${total} pedem compra · ${unidades} unidades sugeridas`}
          icone={ShoppingCart}
          compacto
        />
        <StatCard
          titulo="Estoque · Itens sem ruptura"
          subtitulo="Itens cujo estoque não zera antes de o pedido chegar ÷ todos os itens."
          valor={textoPercentual(semRuptura.pct)}
          {...semRuptura}
          detalhe={`${ruptura} de ${total} em ruptura`}
          icone={AlertTriangle}
          compacto
        />
        <StatCard
          titulo="Estoque · Itens fora de comprar já"
          subtitulo="Itens sem o estoque de segurança acionado ÷ todos os itens."
          valor={textoPercentual(foraDeComprarJa.pct)}
          {...foraDeComprarJa}
          detalhe={`${comprarJa} de ${total} em comprar já`}
          icone={AlertTriangle}
          compacto
        />
        <StatCard
          titulo="Estoque · Itens acima do mínimo"
          subtitulo="Itens acima do estoque mínimo ÷ todos os itens."
          valor={textoPercentual(acimaDoMinimo.pct)}
          {...acimaDoMinimo}
          detalhe={`${abaixoDoMinimo} de ${total} no mínimo ou abaixo`}
          icone={TrendingDown}
          compacto
        />
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
                <LinhasEsqueleto colunas={7} />
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
