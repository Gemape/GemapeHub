import { useMemo, type ReactNode } from "react";
import { AlertTriangle, Archive, Package, UserRound } from "lucide-react";

import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { ferramentasAbaixoDoMinimo, posicaoDasFerramentas, type PosicaoDaFerramenta } from "@/lib/estoque-ferramentas-posicao";
import { useEmpresas, useItens, useMovimentacoes, useTodosCaixaItens } from "@/lib/hooks-gemape";

// Dashboard de Ferramentas: o que importa do estoque das ferramentas (quantas estão abaixo do mínimo, guardadas nas caixas, com empregado ou sem caixa) e quais pedem reposição.
// Os cartões do módulo (`cartoes`) e os daqui ficam numa só grade, como na Frota (decisão 375).
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

  return (
    <>
      <GradeDeCartoes colunas={4}>
        {cartoes}
        <StatCard titulo="Abaixo do mínimo" subtitulo="Ferramentas no estoque mínimo ou abaixo dele." valor={abaixo.length} detalhe={`${abaixo.filter((l) => l.situacao === "Zerado").length} zerada(s)`} icone={AlertTriangle} compacto />
        <StatCard titulo="Guardadas nas caixas" subtitulo="Unidades que estão nas caixas, disponíveis." valor={soma("guardada")} icone={Archive} compacto />
        <StatCard titulo="Com empregado" subtitulo="Unidades entregues e ainda não devolvidas." valor={soma("comEmpregado")} icone={UserRound} compacto />
        <StatCard titulo="Sem caixa" subtitulo="Unidades em estoque fora das caixas; negativo = caixas com mais do que o estoque." valor={semCaixa} icone={Package} compacto />
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
