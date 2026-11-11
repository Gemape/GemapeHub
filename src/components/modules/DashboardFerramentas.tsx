import { useMemo, type ReactNode } from "react";
import { AlertTriangle, Archive, Package, UserRound } from "lucide-react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { ferramentasAbaixoDoMinimo, posicaoDasFerramentas, type PosicaoDaFerramenta } from "@/lib/estoque-ferramentas-posicao";
import { useEmpresas, useItens, useMovimentacoes, useTodosCaixaItens } from "@/lib/hooks-gemape";
import { indicadorDeEstoque, textoPercentual } from "@/lib/indicador-estoque";

// Dashboard de Ferramentas: o que importa do estoque das ferramentas (quantas estão abaixo do mínimo, guardadas nas caixas, com empregado ou sem caixa) e quais pedem reposição.
// Os cartões ocupam 7/12 da largura em tela larga, como na Frota (os gráficos dela ficam nos outros 5/12), para não esticarem. Os cartões do módulo (`cartoes`) e os daqui ficam numa só grade, como na Frota (decisão 375).
export function DashboardFerramentas({ cartoes }: { cartoes: ReactNode }) {
  const { empresaId } = useEmpresa();
  const { data: ferramentas = [], isLoading } = useItens("ferramenta", empresaId);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const { data: itensDeCaixa = [] } = useTodosCaixaItens();
  const { data: empresas = [] } = useEmpresas();
  const nomeDaEmpresa = (id: string | null) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const posicoes = useMemo(
    () => new Map<string, PosicaoDaFerramenta>(posicaoDasFerramentas(ferramentas, movimentos, itensDeCaixa).map((p) => [p.ferramentaId, p])),
    [ferramentas, movimentos, itensDeCaixa],
  );
  const abaixo = useMemo(() => ferramentasAbaixoDoMinimo(ferramentas, posicoes), [ferramentas, posicoes]);
  const soma = (campo: "guardada" | "comEmpregado") => [...posicoes.values()].reduce((t, p) => t + p[campo], 0);
  // Valor real, sem esconder a divergência: negativo quer dizer que as caixas guardam mais do que o estoque (a aba Estoque mostra o aviso).
  const semCaixa = [...posicoes.values()].reduce((t, p) => t + p.semCaixa, 0);
  // Cada cartão é um percentual com a cor e a seta da faixa, como os da Frota. Com empregado e sem caixa só informam (barra neutra).
  const saldoTotal = [...posicoes.values()].reduce((t, p) => t + p.saldo, 0);
  const ativas = ferramentas.filter((f) => f.status !== "Inativo").length;
  const zeradas = abaixo.filter((l) => l.situacao === "Zerado").length;
  const acimaDoMinimo = indicadorDeEstoque(ativas - abaixo.length, ativas);
  const guardadas = indicadorDeEstoque(soma("guardada"), saldoTotal);
  const comEmpregado = indicadorDeEstoque(soma("comEmpregado"), saldoTotal, false);
  const foraDaCaixa = indicadorDeEstoque(semCaixa, saldoTotal, false);

  return (
    <>
      <GradeDeCartoes colunas={4} classe="xl:w-7/12">
        {cartoes}
        <StatCard titulo="Estoque · Ferramentas acima do mínimo" subtitulo="Ferramentas ativas acima do estoque mínimo ÷ todas as ativas." valor={textoPercentual(acimaDoMinimo.pct)} {...acimaDoMinimo} detalhe={`${abaixo.length} de ${ativas} no mínimo ou abaixo · ${zeradas} zerada(s)`} icone={AlertTriangle} compacto />
        <StatCard titulo="Estoque · Guardadas nas caixas" subtitulo="Unidades nas caixas, disponíveis ÷ unidades em estoque." valor={textoPercentual(guardadas.pct)} {...guardadas} detalhe={`${soma("guardada")} de ${saldoTotal} unidades`} icone={Archive} compacto />
        <StatCard titulo="Estoque · Com empregado" subtitulo="Unidades entregues e ainda não devolvidas ÷ unidades em estoque." valor={textoPercentual(comEmpregado.pct)} {...comEmpregado} detalhe={`${soma("comEmpregado")} de ${saldoTotal} unidades`} icone={UserRound} compacto />
        <StatCard titulo="Estoque · Sem caixa" subtitulo="Unidades fora das caixas ÷ unidades em estoque." valor={textoPercentual(foraDaCaixa.pct)} {...foraDaCaixa} detalhe={semCaixa < 0 ? `Caixas guardam ${-semCaixa} a mais que o estoque` : `${semCaixa} de ${saldoTotal} unidades`} icone={Package} compacto />
      </GradeDeCartoes>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ferramentas que pedem reposição</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Guardadas</TableHead>
                <TableHead className="text-right">Com empregado</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>Carregando…</TableCell>
                </TableRow>
              ) : abaixo.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Nenhuma ferramenta pede reposição no momento.
                  </TableCell>
                </TableRow>
              ) : (
                abaixo.slice(0, 10).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span> {l.nome}
                    </TableCell>
                    <TableCell>{nomeDaEmpresa(l.empresaId)}</TableCell>
                    <TableCell className="text-right">{l.saldo}</TableCell>
                    <TableCell className="text-right">{l.minimo}</TableCell>
                    <TableCell className="text-right">{l.guardada}</TableCell>
                    <TableCell className="text-right">{l.comEmpregado}</TableCell>
                    <TableCell className={l.situacao === "Zerado" ? "font-medium text-destructive" : ""}>{l.situacao}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {abaixo.length > 10 && <p className="mt-2 text-xs text-muted-foreground">Mostrando 10 de {abaixo.length}; o restante está em Estoque.</p>}
        </CardContent>
      </Card>
    </>
  );
}
