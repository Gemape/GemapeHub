import { Car, CircleSlash, Printer, Wrench } from "lucide-react";
import { useState } from "react";

import { ExtratoVeiculo, type SecaoExtrato } from "@/components/modules/ExtratoVeiculo";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { hojeLocal } from "@/lib/empregados";
import { rotuloDaSituacao, situacaoChecklistDoVeiculo, situacaoOcorrenciasDoVeiculo, situacaoPreventivas, type SituacaoColuna, type Vencimento } from "@/lib/frota-situacao";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { kmAtualDoVeiculo, sugestoesPreventivas } from "@/lib/extrato-veiculo";
import { useEmpregados, useVeiculos } from "@/lib/hooks-gemape";
import { montarFrotaHtml } from "@/lib/frota-relatorio-html";
import { combinaBusca } from "@/lib/parametros-base";
import { normalizarPlaca } from "@/lib/veiculos";
import { useAbastecimentos, useChecklistsVeiculo, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const STATUS: Record<string, string> = { Ativo: "Ativo", Manutencao: "Em manutenção", Inativo: "Inativo" };

const COR_VENCIMENTO: Record<Vencimento, { ponto: string; etiqueta: string }> = {
  vencida: { ponto: "bg-red-500", etiqueta: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" },
  proximo: { ponto: "bg-amber-400", etiqueta: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  em_dia: { ponto: "bg-emerald-500", etiqueta: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
};

// Bolinha e etiqueta de uma coluna de vencimento; coluna que não se aplica ao veículo (sem plano, sem check list associado) mostra um traço.
// Com `aoClicar`, a bolinha e a etiqueta são um botão que abre a informação que elas resumem (decisão 305), sem abrir o extrato da linha.
function EtiquetaVencimento({ valor, dica, aoClicar }: { valor: SituacaoColuna; dica?: string; aoClicar?: () => void }) {
  if (!valor) return <span className="text-muted-foreground">—</span>;
  const cor = COR_VENCIMENTO[valor.situacao];
  const conteudo = (
    <>
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${cor.ponto}`} />
      <Badge variant="outline" className={cor.etiqueta}>{rotuloDaSituacao(valor)}</Badge>
    </>
  );
  if (!aoClicar) return <span className="inline-flex items-center gap-2 whitespace-nowrap">{conteudo}</span>;
  return (
    <button
      type="button"
      title={dica}
      aria-label={`${dica ?? "Ver detalhes"}: ${rotuloDaSituacao(valor)}`}
      onClick={(e) => { e.stopPropagation(); aoClicar(); }}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      {conteudo}
    </button>
  );
}

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
  const ocorrencias = useOcorrenciasVeiculo();
  const checklists = useChecklistsVeiculo();
  const previsoes = usePrevisoesChecklist();
  const [busca, setBusca] = useState("");
  // Veículo escolhido e, se veio de uma bolinha, a seção do extrato que ela resume (sem seção, abre a janela do extrato).
  const [aberto, setAberto] = useState<{ id: string; secao: SecaoExtrato | null } | null>(null);
  const hoje = hojeLocal();

  const lista = veiculos.filter((v) =>
    combinaBusca(busca.replace(/-/g, ""), rotuloDoVeiculo(parametros, v), normalizarPlaca(v.placa ?? ""), v.marca, v.modelo, nomeResponsavel(v.empregado_responsavel_id), STATUS[v.status] ?? v.status),
  );
  // Cada coluna de vencimento (decisão 304): bolinha e etiqueta amarela (vencimento próximo), vermelha (vencida) ou verde (em dia).
  const preventivasDo = (id: string): SituacaoColuna => {
    const abast = abastecimentos.filter((a) => a.veiculoId === id);
    const manut = manutencoes.filter((m) => m.veiculoId === id);
    const v = veiculos.find((x) => x.id === id);
    return situacaoPreventivas(sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manut,
      kmAtual: kmAtualDoVeiculo(v?.quilometragem_atual ?? 0, abast, manut),
      hoje,
    }).map((s) => s.status));
  };
  const ocorrenciasDo = (id: string) => situacaoOcorrenciasDoVeiculo(ocorrencias, id, hoje);
  const checklistDo = (id: string) => situacaoChecklistDoVeiculo(previsoes, checklists, id, hoje);

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
          preventivas: preventivasDo(v.id),
          ocorrencias: ocorrenciasDo(v.id),
          checklist: checklistDo(v.id),
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
        <Table className="min-w-[1180px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead className="w-48">Responsável</TableHead>
              <TableHead className="w-28">Situação</TableHead>
              <TableHead className="w-28 pr-6 text-right">Km atual</TableHead>
              <TableHead className="w-52">Preventivas</TableHead>
              <TableHead className="w-52">Ocorrências</TableHead>
              <TableHead className="w-52">Check list</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && lista.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Nenhum veículo encontrado.</TableCell></TableRow>
            )}
            {lista.map((v) => {
              const km = kmDo(v);
              return (
                <TableRow key={v.id} className="cursor-pointer" onClick={() => setAberto({ id: v.id, secao: null })}>
                  <TableCell className="font-medium">{rotuloDoVeiculo(parametros, v)}</TableCell>
                  <TableCell className="truncate">{nomeResponsavel(v.empregado_responsavel_id) || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{STATUS[v.status] ?? v.status}</Badge></TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell><EtiquetaVencimento valor={preventivasDo(v.id)} dica="Ver as manutenções sugeridas" aoClicar={() => setAberto({ id: v.id, secao: "sugeridas" })} /></TableCell>
                  <TableCell><EtiquetaVencimento valor={ocorrenciasDo(v.id)} dica="Ver as ocorrências em aberto" aoClicar={() => setAberto({ id: v.id, secao: "ocorrenciasAbertas" })} /></TableCell>
                  <TableCell><EtiquetaVencimento valor={checklistDo(v.id)} dica="Ver os check lists" aoClicar={() => setAberto({ id: v.id, secao: "checklists" })} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAberto({ id: v.id, secao: null }); }}>Ver extrato</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ExtratoVeiculo veiculo={veiculos.find((v) => v.id === aberto?.id) ?? null} secao={aberto?.secao ?? null} onFechar={() => setAberto(null)} />
    </div>
  );
}
