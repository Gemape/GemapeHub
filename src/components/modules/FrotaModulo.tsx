import { Car, CircleSlash, Printer, Wrench } from "lucide-react";
import { useState } from "react";

import { ExtratoVeiculo } from "@/components/modules/ExtratoVeiculo";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { hojeLocal } from "@/lib/empregados";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { kmAtualDoVeiculo, sugestoesPreventivas } from "@/lib/extrato-veiculo";
import { useEmpregados, useVeiculos } from "@/lib/hooks-gemape";
import { montarFrotaHtml } from "@/lib/frota-relatorio-html";
import { combinaBusca } from "@/lib/parametros-base";
import { normalizarPlaca } from "@/lib/veiculos";
import { useAbastecimentos, useManutencoesVeiculo, usePlanosVeiculo } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const STATUS: Record<string, string> = { Ativo: "Ativo", Manutencao: "Em manutenção", Inativo: "Inativo" };

// Módulos > Veículos > Frota (decisão 57): página inicial com a lista de veículos da empresa.
// Clicar num veículo abre o extrato. O cadastro continua em Parâmetros > Veículos.
export function FrotaModulo() {
  const { empresaId, empresas } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: veiculos = [], isLoading } = useVeiculos(empresaId);
  const { data: empregados = [] } = useEmpregados(TODAS);
  const nomeResponsavel = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "";
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const hoje = hojeLocal();

  const lista = veiculos.filter((v) =>
    combinaBusca(busca.replace(/-/g, ""), rotuloDoVeiculo(parametros, v), normalizarPlaca(v.placa ?? ""), v.marca, v.modelo, nomeResponsavel(v.empregado_responsavel_id), STATUS[v.status] ?? v.status),
  );
  const vencidasDo = (id: string) => {
    const abast = abastecimentos.filter((a) => a.veiculoId === id);
    const manut = manutencoes.filter((m) => m.veiculoId === id);
    const v = veiculos.find((x) => x.id === id);
    return sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manut,
      kmAtual: kmAtualDoVeiculo(v?.quilometragem_atual ?? 0, abast, manut),
      hoje,
    }).filter((s) => s.status === "vencida").length;
  };

  const kmDo = (v: (typeof veiculos)[number]) =>
    kmAtualDoVeiculo(
      v.quilometragem_atual,
      abastecimentos.filter((a) => a.veiculoId === v.id),
      manutencoes.filter((m) => m.veiculoId === v.id),
    );

  // Relatório em PDF (visualizador do sistema): sai a lista como está na tela, com a busca aplicada.
  function imprimir() {
    const empresa = empresaId === TODAS ? "Todas as empresas" : (empresas.find((e) => e.id === empresaId)?.razao_social ?? "GEMAPE");
    abrirDocumento({
      titulo: "Relatório da frota",
      html: montarFrotaHtml({
        empresa,
        geradoEm: new Date().toISOString(),
        busca: busca.trim(),
        linhas: lista.map((v) => ({
          veiculo: rotuloDoVeiculo(parametros, v),
          responsavel: nomeResponsavel(v.empregado_responsavel_id),
          situacao: STATUS[v.status] ?? v.status,
          km: kmDo(v),
          vencidas: vencidasDo(v.id),
        })),
      }),
      arquivo: nomeArquivoDocumento("Relatorio da frota", empresa, hojeBrasilia()),
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
        <StatCard titulo="Ativos" valor={veiculos.filter((v) => v.status === "Ativo").length} icone={Car} />
        <StatCard titulo="Em manutenção" valor={veiculos.filter((v) => v.status === "Manutencao").length} icone={Wrench} />
        <StatCard titulo="Inativos" valor={veiculos.filter((v) => v.status === "Inativo").length} icone={CircleSlash} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Buscar veículo por descrição ou responsável"
          placeholder="Buscar por descrição ou responsável"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-md"
        />
        <Button type="button" variant="outline" onClick={imprimir} disabled={isLoading}>
          <Printer className="h-4 w-4" /> Imprimir relatório (PDF)
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Km atual</TableHead>
              <TableHead>Preventivas</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && lista.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum veículo encontrado.</TableCell></TableRow>
            )}
            {lista.map((v) => {
              const vencidas = vencidasDo(v.id);
              const km = kmDo(v);
              return (
                <TableRow key={v.id} className="cursor-pointer" onClick={() => setAberto(v.id)}>
                  <TableCell className="font-medium">{rotuloDoVeiculo(parametros, v)}</TableCell>
                  <TableCell>{nomeResponsavel(v.empregado_responsavel_id) || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{STATUS[v.status] ?? v.status}</Badge></TableCell>
                  <TableCell className="text-right">{km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className={vencidas > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                    {vencidas > 0 ? `🔴 ${vencidas} vencida(s)` : "Sem vencidas"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAberto(v.id); }}>Ver extrato</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ExtratoVeiculo veiculo={veiculos.find((v) => v.id === aberto) ?? null} onFechar={() => setAberto(null)} />
    </div>
  );
}
