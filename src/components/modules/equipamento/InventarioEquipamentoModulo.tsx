import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Banknote, Forklift, TriangleAlert, Wrench } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import type { Equipamento } from "@/lib/equipamentos-demo";
import { STATUS_EQUIPAMENTO } from "@/lib/equipamentos";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { pendenciasAbertasEq } from "@/lib/checklist-equipamento-exec";
import { custoDaManutencaoEq, ocorrenciaPendenteEq, ultimoHorimetro } from "@/lib/registros-equipamento";
import { ExtratoEquipamento } from "./ExtratoEquipamento";
import { faixaEq, nomeDoTipo, pctDe, seloDaSituacao, numero, reais, TODOS, useChecklistsEq, useEquipamentosDaEmpresa, useManutencoesEq, useOcorrenciasEq } from "./comum";

// Módulos > Equipamentos > Inventário dos Equipamentos: a lista dos equipamentos cadastrados em Parâmetros > Equipamentos com a situação de cada um
// (status, horímetro, última manutenção, ocorrências abertas e último check list) e o extrato interativo por equipamento. Só leitura: o cadastro
// continua em Parâmetros. Só modo demonstração.
export function InventarioEquipamentoModulo() {
  const { empresas } = useEmpresa();
  const equipamentos = useEquipamentosDaEmpresa();
  const manutencoes = useManutencoesEq();
  const ocorrencias = useOcorrenciasEq();
  const checklists = useChecklistsEq();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(TODOS);
  // O Extrato abre o extrato interativo do equipamento (período, seções, registrar e PDF), como o de Veículos.
  const [extratoDe, setExtratoDe] = useState<Equipamento | null>(null);
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  const situacao = (e: Equipamento) => {
    const ultimaManut = manutencoes.filter((m) => m.equipamentoId === e.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    const ultimoCheck = checklists.filter((c) => c.equipamentoId === e.id && c.status === "Concluído").sort((a, b) => b.data.localeCompare(a.data))[0];
    return {
      horimetro: ultimoHorimetro(e.id, localStorage) ?? (Number(e.tecnico["horimetroInicial"]) || null),
      ultimaManut, ultimoCheck, abertas: ocorrencias.filter((o) => o.equipamentoId === e.id && ocorrenciaPendenteEq(o)).length,
    };
  };
  const linhas = equipamentos
    .filter((e) => status === TODOS || e.status === status)
    .filter((e) => combinaBusca(busca, e.patrimonio, e.nome, nomeDoTipo(e), e.marca, e.modelo, e.setor, e.numeroSerie, nomeEmpresa(e.empresaId)));
  const abertasTotal = ocorrencias.filter((o) => ocorrenciaPendenteEq(o) && equipamentos.some((e) => e.id === o.equipamentoId)).length;
  const manutencoesDaLista = manutencoes.filter((m) => equipamentos.some((e) => e.id === m.equipamentoId));
  const custoTotal = manutencoesDaLista.reduce((s, m) => s + custoDaManutencaoEq(m), 0);
  const ativos = equipamentos.filter((e) => e.status === "Ativo").length;
  const emManutencao = equipamentos.filter((e) => e.status === "Em manutenção").length;
  const semOcorrencia = equipamentos.filter((e) => !ocorrencias.some((o) => o.equipamentoId === e.id && ocorrenciaPendenteEq(o))).length;

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap items-end gap-3">
        <BarraDeFiltros>
          <Input aria-label="Buscar equipamento" placeholder="Buscar por patrimônio, nome, tipo, marca ou setor" className="max-w-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="space-y-1.5">
            <Label htmlFor="status_inventario">Situação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status_inventario" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={TODOS}>Todas</SelectItem>{STATUS_EQUIPAMENTO.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </BarraDeFiltros>
      </div>

      {/* Como na Frota: cartões compactos (menos largos) em 7/12 da linha e, ao lado, a distribuição por situação. */}
      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <GradeDeCartoes colunas={4} rotulo="Indicadores dos equipamentos">
        <StatCard titulo="Equipamentos" subtitulo="Equipamentos cadastrados, com os ativos em destaque." valor={equipamentos.length} pct={pctDe(ativos, equipamentos.length)} detalhe={`${ativos} ativo(s) de ${equipamentos.length}`} icone={Forklift} compacto />
        <StatCard titulo="Em manutenção" subtitulo="Equipamentos em manutenção ÷ equipamentos cadastrados." valor={emManutencao} pct={pctDe(emManutencao, equipamentos.length)} faixa={faixaEq(pctDe(equipamentos.length - emManutencao, equipamentos.length))} detalhe={`${emManutencao} de ${equipamentos.length} equipamentos`} icone={Wrench} compacto />
        <StatCard titulo="Ocorrências abertas" subtitulo="Equipamentos sem ocorrência aberta ÷ equipamentos cadastrados." valor={abertasTotal} pct={pctDe(semOcorrencia, equipamentos.length)} faixa={faixaEq(pctDe(semOcorrencia, equipamentos.length))} detalhe={`${semOcorrencia} de ${equipamentos.length} equipamentos sem ocorrência aberta`} icone={TriangleAlert} compacto />
        <StatCard titulo="Custo de manutenção" subtitulo="Soma das manutenções concluídas dos equipamentos." valor={reais(custoTotal)} detalhe={`${manutencoesDaLista.length} manutenção(ões) · ${reais(equipamentos.length ? custoTotal / equipamentos.length : 0)} por equipamento`} icone={Banknote} compacto />
      </GradeDeCartoes>
      <section aria-label="Equipamentos por situação" className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-eyebrow">Equipamentos por situação</h3>
        <ul className="mt-3 space-y-2.5">
          {[...new Set([...STATUS_EQUIPAMENTO, ...equipamentos.map((e) => e.status)])].map((st) => {
            const n = equipamentos.filter((e) => e.status === st).length;
            return (
              <li key={st} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className={`w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${seloDaSituacao(st)}`}>{st}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted" role="presentation"><span className="block h-full rounded-full bg-primary" style={{ width: `${pctDe(n, equipamentos.length) ?? 0}%` }} /></span>
                <span className="text-right font-semibold tabular-nums">{n}</span>
              </li>
            );
          })}
        </ul>
      </section>
      </div>

      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar (decisão 337). */}
      <div className="max-h-[max(12rem,calc(100dvh-33rem))] flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patrimônio</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Empresa / setor</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Horímetro</TableHead><TableHead>Última manutenção</TableHead><TableHead>Ocorrências abertas</TableHead><TableHead>Último check list</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={10} className="py-6 text-center text-muted-foreground">{busca.trim() || status !== TODOS ? "Nenhum resultado para o filtro." : "Nenhum equipamento cadastrado. Cadastre em Parâmetros > Equipamentos."}</TableCell></TableRow>}
            {linhas.map((e) => {
              const s = situacao(e);
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.patrimonio}</TableCell>
                  <TableCell className="font-medium">{e.nome}<span className="block text-xs font-normal text-muted-foreground">{e.marca} {e.modelo}</span></TableCell>
                  <TableCell>{nomeDoTipo(e)}</TableCell>
                  <TableCell>{nomeEmpresa(e.empresaId)}<span className="block text-xs text-muted-foreground">{e.setor}</span></TableCell>
                  <TableCell><Badge variant="outline" className={seloDaSituacao(e.status)}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right">{s.horimetro === null ? "—" : `${numero(s.horimetro)} h`}</TableCell>
                  <TableCell>{s.ultimaManut ? `${formatarData(s.ultimaManut.data)} · ${s.ultimaManut.tipo}` : "—"}</TableCell>
                  <TableCell>{s.abertas > 0 ? <Badge variant="destructive">{s.abertas}</Badge> : "0"}</TableCell>
                  <TableCell>{s.ultimoCheck ? <>{formatarData(s.ultimoCheck.data)} {pendenciasAbertasEq([s.ultimoCheck], e.id).length > 0 ? <Badge variant="destructive">{pendenciasAbertasEq([s.ultimoCheck], e.id).length} pend.</Badge> : <Badge variant="secondary">OK</Badge>}</> : "—"}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" aria-label={`Extrato de ${e.nome}`} onClick={() => setExtratoDe(e)}>Extrato</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ExtratoEquipamento equipamento={extratoDe} onFechar={() => setExtratoDe(null)} />
    </div>
  );
}
