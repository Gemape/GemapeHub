import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { controleDeEstoque } from "@/lib/epi-controle-estoque";
import { hojeLocal } from "@/lib/empregados";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { useItens, useMovimentacoes } from "@/lib/hooks-gemape";

// Aba Estoque dos EPIs e dos Uniformes > Controle de estoque e consumo, como o REL_ESTOQUE da planilha: estoque crítico e atual, últimas e penúltimas entradas e saídas,
// médias de consumo (mensal, trimestral, semestral e anual) e cobertura em dias (estoque atual ÷ média diária do último ano).
const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const data = (d: string | null) => (d ? formatarData(d) : "—");

export function ControleEstoqueModulo({ modulo }: { modulo: "epi" | "uniforme" }) {
  const { empresaId } = useEmpresa();
  const { data: itens = [], isLoading: carregandoItens } = useItens(modulo, empresaId);
  const { data: movimentos = [], isLoading: carregandoMov } = useMovimentacoes(modulo, empresaId);
  const linhas = useMemo(() => controleDeEstoque(itens, movimentos, hojeLocal()), [itens, movimentos]);
  const carregando = carregandoItens || carregandoMov;
  const cobertura = (c: number | null) => (c === null ? "Sem consumo" : `${c.toLocaleString("pt-BR")}`);

  return (
    <section className="space-y-3" aria-label="Controle de estoque e consumo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Controle de estoque e consumo</h2>
          <p className="text-sm text-muted-foreground">
            Médias a partir das saídas: mensal (30 dias), trimestral (90 dias ÷ 3), semestral (180 dias ÷ 6) e anual (365 dias ÷ 12). Cobertura = estoque atual ÷ média anual por dia.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={carregando || linhas.length === 0}
          onClick={() => exportarCsv(`controle-estoque-${modulo}`, linhas.map((l) => ({
            Descrição: l.nome,
            "Estoque crítico": l.estoqueCritico,
            "Estoque atual": l.estoqueAtual,
            "Penúltima entrada": l.penultimaEntrada ?? "",
            "Última entrada": l.ultimaEntrada ?? "",
            "Penúltima saída": l.penultimaSaida ?? "",
            "Última saída": l.ultimaSaida ?? "",
            "Média mensal": l.consumoMensal,
            "Média trimestral": l.consumoTrimestral,
            "Média semestral": l.consumoSemestral,
            "Média anual": l.consumoAnual,
            "Cobertura (dias)": l.cobertura ?? "Sem consumo",
          })))}
        >Exportar CSV</Button>
      </div>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Estoque crítico</TableHead>
              <TableHead className="text-right">Estoque atual</TableHead>
              <TableHead>Penúltima entrada</TableHead>
              <TableHead>Última entrada</TableHead>
              <TableHead>Penúltima saída</TableHead>
              <TableHead>Última saída</TableHead>
              <TableHead className="text-right">Média mensal</TableHead>
              <TableHead className="text-right">Média trimestral</TableHead>
              <TableHead className="text-right">Média semestral</TableHead>
              <TableHead className="text-right">Média anual</TableHead>
              <TableHead className="text-right">Cobertura (dias)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando ? <TableRow><TableCell colSpan={12}>Carregando…</TableCell></TableRow>
              : linhas.length === 0 ? <TableRow><TableCell colSpan={12}>{modulo === "epi" ? "Nenhum EPI cadastrado." : "Nenhum uniforme cadastrado."}</TableCell></TableRow>
                : linhas.map((l) => (
                  <TableRow key={l.itemId}>
                    <TableCell>{l.nome}</TableCell>
                    <TableCell className="text-right">{l.estoqueCritico}</TableCell>
                    <TableCell className={`text-right ${l.estoqueAtual < l.estoqueCritico ? "font-bold text-destructive" : ""}`}>{l.estoqueAtual}</TableCell>
                    <TableCell>{data(l.penultimaEntrada)}</TableCell>
                    <TableCell>{data(l.ultimaEntrada)}</TableCell>
                    <TableCell>{data(l.penultimaSaida)}</TableCell>
                    <TableCell>{data(l.ultimaSaida)}</TableCell>
                    <TableCell className="text-right">{numero(l.consumoMensal)}</TableCell>
                    <TableCell className="text-right">{numero(l.consumoTrimestral)}</TableCell>
                    <TableCell className="text-right">{numero(l.consumoSemestral)}</TableCell>
                    <TableCell className="text-right">{numero(l.consumoAnual)}</TableCell>
                    <TableCell className="text-right">{cobertura(l.cobertura)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
