import { Printer } from "lucide-react";
import { useState } from "react";

import { ExtratoVeiculo, type SecaoExtrato } from "@/components/modules/ExtratoVeiculo";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { CartoesIndicadoresFrota } from "@/components/modules/CartoesIndicadoresFrota";
import { GraficosFrota } from "@/components/modules/GraficosVeiculos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { hojeLocal } from "@/lib/empregados";
import { rotuloDaSituacao, situacaoChecklistDoVeiculo, situacaoOcorrenciasDoVeiculo, situacaoPreventivas, type SituacaoColuna, type Vencimento } from "@/lib/frota-situacao";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { grupoDeAreaPorNome } from "@/lib/area-responsaveis";
import { painelDoMes } from "@/lib/checklist-painel";
import { historicoAbastecimentos, kmAtualDoVeiculo, mediaKmPorLitro, sugestoesPreventivas } from "@/lib/extrato-veiculo";
import { custoPorKm, custoPorKmPorMes, indicadoresDaFrota, proporcaoPreventiva, proporcaoPreventivaPorMes } from "@/lib/frota-indicadores";
import { interpretacoesDaFrota } from "@/lib/frota-interpretacao";
import { InterpretacaoFrota } from "@/components/modules/InterpretacaoFrota";
import { locaisDaManutencao } from "@/lib/registros-veiculo";
import { lerPrazosOcorrencias } from "@/lib/prazo-ocorrencias";
import { useEmpregados, useVeiculos } from "@/lib/hooks-gemape";
import { montarFrotaHtml } from "@/lib/frota-relatorio-html";
import { combinaBusca, subcategoriasAtivasDa } from "@/lib/parametros-base";
import { nomeSubcategoria } from "@/lib/subcategoria-referencia";
import { normalizarPlaca } from "@/lib/veiculos";
import { useAbastecimentos, useChecklistsVeiculo, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo, usePrevisoesChecklist } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const STATUS: Record<string, string> = { Ativo: "Ativo", Manutencao: "Em manutenção", Inativo: "Inativo" };

const COR_VENCIMENTO: Record<Vencimento, { ponto: string; etiqueta: string }> = {
  vencida: { ponto: "bg-red-500", etiqueta: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200" },
  proximo: { ponto: "bg-amber-400", etiqueta: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  em_dia: { ponto: "bg-emerald-500", etiqueta: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
};

// Etiqueta de uma coluna de vencimento: uma pílula só, com a bolinha da cor dentro e todas do mesmo tamanho; coluna que não se aplica ao veículo (sem plano, sem check list associado) mostra um traço.
// Com `aoClicar`, a pílula é um botão que abre a informação que ela resume (decisão 305), sem abrir o extrato da linha.
function EtiquetaVencimento({ valor, dica, aoClicar }: { valor: SituacaoColuna; dica?: string; aoClicar?: () => void }) {
  if (!valor) return <span className="text-muted-foreground">—</span>;
  const cor = COR_VENCIMENTO[valor.situacao];
  const classes = `mx-auto flex h-8 w-full max-w-[12rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold shadow-sm ${cor.etiqueta}`;
  const conteudo = (
    <>
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/30 ${cor.ponto}`} />
      {rotuloDaSituacao(valor)}
    </>
  );
  if (!aoClicar) return <span className={classes}>{conteudo}</span>;
  return (
    <button
      type="button"
      title={dica}
      aria-label={`${dica ?? "Ver detalhes"}: ${rotuloDaSituacao(valor)}`}
      onClick={(e) => { e.stopPropagation(); aoClicar(); }}
      className={`${classes} transition hover:-translate-y-px hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
    >
      {conteudo}
    </button>
  );
}

// Módulos > Veículos > Frota (decisão 57): página inicial com a lista de veículos da empresa.
// Clicar num veículo abre o extrato. O cadastro continua em Parâmetros > Veículos.
const TODAS_AS_SUBCATEGORIAS = "__todas__";

// Custo da manutenção: a soma dos locais; registro sem locais usa o custo total (ou peças + mão de obra) do próprio registro.
const custoDaManutencao = (m: Parameters<typeof locaisDaManutencao>[0]): number => {
  const locais = locaisDaManutencao(m);
  return locais.length ? locais.reduce((t, l) => t + l.custoTotal, 0) : (m.custoTotal ?? (m.custoPecas ?? 0) + (m.custoMaoDeObra ?? 0));
};

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
  // Filtro por subcategoria do veículo (utilitário, caminhão, carro...), ao lado da busca (decisão 342): vale para a lista e para o relatório; os indicadores seguem sendo da frota toda.
  const [subcategoria, setSubcategoria] = useState(TODAS_AS_SUBCATEGORIAS);
  // Opções: as subcategorias ativas e também as que os veículos ainda usam (desativadas ou antigas), para nenhum veículo ficar sem como ser filtrado.
  const nomesDeSubcategoria = [...new Set([...subcategoriasAtivasDa(parametros, "cat-veiculos").map((s) => s.nome), ...veiculos.map((v) => nomeSubcategoria(parametros, "cat-veiculos", v as never))].filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  // Subcategoria escolhida que deixou de existir (desativada ou renomeada) volta a "todas", em vez de esvaziar a lista.
  const filtroSubcategoria = nomesDeSubcategoria.includes(subcategoria) ? subcategoria : TODAS_AS_SUBCATEGORIAS;
  // Veículo escolhido e, se veio de uma bolinha, a seção do extrato que ela resume (sem seção, abre a janela do extrato).
  const [aberto, setAberto] = useState<{ id: string; secao: SecaoExtrato | null } | null>(null);
  const hoje = hojeLocal();

  const lista = veiculos
    .filter((v) => filtroSubcategoria === TODAS_AS_SUBCATEGORIAS || nomeSubcategoria(parametros, "cat-veiculos", v as never) === filtroSubcategoria)
    .filter((v) =>
    combinaBusca(busca.replace(/-/g, ""), rotuloDoVeiculo(parametros, v), normalizarPlaca(v.placa ?? ""), v.marca, v.modelo, nomeResponsavel(v.empregado_responsavel_id), STATUS[v.status] ?? v.status),
  );
  // Cada coluna de vencimento (decisão 304): bolinha e etiqueta amarela (vencimento próximo), vermelha (vencida) ou verde (em dia).
  const statusPreventivasDo = (id: string) => {
    const abast = abastecimentos.filter((a) => a.veiculoId === id);
    const manut = manutencoes.filter((m) => m.veiculoId === id);
    const v = veiculos.find((x) => x.id === id);
    return sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manut,
      kmAtual: kmAtualDoVeiculo(v?.quilometragem_atual ?? 0, abast, manut),
      hoje,
    }).map((s) => s.status);
  };
  // Calculado uma vez por veículo: serve às linhas da lista e aos indicadores do alto.
  const statusPorVeiculo = new Map(veiculos.map((v) => [v.id, statusPreventivasDo(v.id)] as const));
  const preventivasDo = (id: string): SituacaoColuna => situacaoPreventivas(statusPorVeiculo.get(id) ?? []);
  const ocorrenciasDo = (id: string) => situacaoOcorrenciasDoVeiculo(ocorrencias, id, hoje);
  const checklistDo = (id: string) => situacaoChecklistDoVeiculo(previsoes, checklists, id, hoje);

  // Indicadores do alto (decisão 317): PCM (manutenções, check list do PCM, ocorrências, conformidade geral) e técnicos (check list), da frota da empresa escolhida.
  const idsDaFrota = new Set(veiculos.map((v) => v.id));
  const indicadores = indicadoresDaFrota({
    statusPreventivas: [...statusPorVeiculo.values()].flat(),
    ocorrencias: ocorrencias.filter((o) => idsDaFrota.has(o.veiculoId)),
    linhasDoChecklist: painelDoMes(null, previsoes.filter((p) => idsDaFrota.has(p.veiculoId)), checklists.filter((c) => idsDaFrota.has(c.veiculoId)), hoje).linhas,
    grupoDe: grupoDeAreaPorNome(),
    hoje,
    prazos: lerPrazosOcorrencias(),
  });
  const custosDeManutencao = manutencoes.map((m) => ({ veiculoId: m.veiculoId, data: m.data, km: m.km, tipo: m.tipo, custo: custoDaManutencao(m) }));
  const idsDeCusto = [...idsDaFrota];
  const cpk = custoPorKm(idsDeCusto, abastecimentos, custosDeManutencao);
  const custoPreventivo = proporcaoPreventiva(idsDeCusto, custosDeManutencao);
  const cpkMensal = custoPorKmPorMes(idsDeCusto, abastecimentos, custosDeManutencao, hoje);
  const preventivoMensal = proporcaoPreventivaPorMes(idsDeCusto, custosDeManutencao, hoje);
  // Média de consumo do veículo (km/L), do histórico de abastecimentos dele (Módulo > Veículos > Abastecimento); precisa de dois abastecimentos.
  const mediaDo = (id: string): number | null => mediaKmPorLitro(historicoAbastecimentos(abastecimentos.filter((a) => a.veiculoId === id)));
  const textoMedia = (m: number | null) => (m === null ? "—" : m.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

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
        ...(filtroSubcategoria !== TODAS_AS_SUBCATEGORIAS ? { subcategoria: filtroSubcategoria } : {}),
        linhas: lista.map((v) => ({
          veiculo: rotuloDoVeiculo(parametros, v),
          responsavel: nomeResponsavel(v.empregado_responsavel_id),
          situacao: STATUS[v.status] ?? v.status,
          km: kmDo(v),
          mediaKmL: mediaDo(v.id),
          preventivas: preventivasDo(v.id),
          ocorrencias: ocorrenciasDo(v.id),
          checklist: checklistDo(v.id),
        })),
      }),
      arquivo: nomeArquivoDocumento("Relatorio da frota", empresa, hojeBrasilia()),
    });
  }

  return (
    <div className="space-y-3">
      <CartoesIndicadoresFrota
        indicadores={indicadores}
        cpk={cpk}
        custoPreventivo={custoPreventivo}
        graficos={<GraficosFrota compacto indicadores={indicadores} cpkMensal={cpkMensal} preventivoMensal={preventivoMensal} medias={veiculos.map((v) => ({ veiculo: rotuloDoVeiculo(parametros, v), media: mediaDo(v.id) }))} />}
        filtros={
          <>
            <Select value={filtroSubcategoria} onValueChange={setSubcategoria}>
              <SelectTrigger aria-label="Filtrar por subcategoria do veículo" className="h-9 w-56">
                <SelectValue placeholder="Todas as subcategorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_AS_SUBCATEGORIAS}>Todas as subcategorias</SelectItem>
                {nomesDeSubcategoria.map((nome) => (
                  <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Buscar veículo por descrição ou responsável"
              placeholder="Buscar por descrição ou responsável"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </>
        }
        acoes={
          <>
            <Button type="button" variant="outline" size="sm" onClick={imprimir} disabled={isLoading}>
              <Printer className="h-4 w-4" /> Imprimir relatório (PDF)
            </Button>
            <InterpretacaoFrota itens={interpretacoesDaFrota(indicadores, cpk, custoPreventivo, cpkMensal)} />
          </>
        }
      />
      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar (decisão 337). */}
      <div className="max-h-[max(8rem,calc(100dvh-46rem))] flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table className="min-w-[1440px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[31%]">Veículo</TableHead>
              <TableHead className="w-[11%]">Responsável</TableHead>
              <TableHead className="w-[6%]">Situação</TableHead>
              <TableHead className="w-[6%] pr-6 text-right">Km atual</TableHead>
              <TableHead className="w-[8%] whitespace-nowrap pr-6 text-right">Média km/L</TableHead>
              <TableHead className="w-[10%] text-center">Preventivas</TableHead>
              <TableHead className="w-[10%] text-center">Ocorrências</TableHead>
              <TableHead className="w-[10%] text-center">Check list</TableHead>
              <TableHead className="w-[8%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && lista.length === 0 && (
              <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Nenhum veículo encontrado.</TableCell></TableRow>
            )}
            {lista.map((v) => {
              const km = kmDo(v);
              return (
                <TableRow key={v.id} className="cursor-pointer" onClick={() => setAberto({ id: v.id, secao: null })}>
                  <TableCell className="font-medium">{rotuloDoVeiculo(parametros, v)}</TableCell>
                  <TableCell className="truncate">{nomeResponsavel(v.empregado_responsavel_id) || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{STATUS[v.status] ?? v.status}</Badge></TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{textoMedia(mediaDo(v.id))}</TableCell>
                  <TableCell><EtiquetaVencimento valor={preventivasDo(v.id)} dica="Ver as manutenções sugeridas" aoClicar={() => setAberto({ id: v.id, secao: "sugeridas" })} /></TableCell>
                  <TableCell><EtiquetaVencimento valor={ocorrenciasDo(v.id)} dica="Ver as ocorrências em aberto" aoClicar={() => setAberto({ id: v.id, secao: "ocorrenciasAbertas" })} /></TableCell>
                  <TableCell><EtiquetaVencimento valor={checklistDo(v.id)} dica="Ver os check lists" aoClicar={() => setAberto({ id: v.id, secao: "checklists" })} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={(e) => { e.stopPropagation(); setAberto({ id: v.id, secao: null }); }}>Ver extrato</Button>
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
