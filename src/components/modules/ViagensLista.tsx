import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Download, FileText } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { useEmpregados } from "@/lib/hooks-gemape";
import { registrarRelatorio, relatorioPorDespesa, type RelatorioSalvo } from "@/lib/relatorios-viagens";
import type { RespostaRegistrada } from "@/lib/respostas-despesas";
import { formatarMoeda, rotuloPeriodo, type PeriodoMes } from "@/lib/viagens";
import {
  FILTRO_VAZIO, STATUS_EM_ABERTO, listaDoPeriodo, periodoDeDatasValido, type FiltroLista, type LinhaDespesa,
} from "@/lib/viagens-lista";
import { linhasDasDespesas, montarRelatorioViagensHtml, type ComprovantesPorPagina } from "@/lib/viagens-relatorio";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TODOS = "__todos__";
const NENHUM = "__nenhum__";
const dataBr = (iso: string) => iso.split("-").reverse().join("/");

function abrirRelatorioSalvo(rel: RelatorioSalvo, lista: readonly RespostaRegistrada[]) {
  abrirDocumento({
    titulo: "Relatório de Viagens",
    html: montarRelatorioViagensHtml({
      empresa: rel.empresa, empregado: rel.empregado, de: rel.de, ate: rel.ate, linhas: linhasDasDespesas(lista, rel.despesaIds),
      comprovantesPorPagina: rel.comprovantesPorPagina, emitente: rel.emitente, supervisor: rel.supervisor, diretor: rel.diretor,
      geradoEm: rel.criadoEm, logoUrl: `${window.location.origin}${import.meta.env["BASE_URL"] ?? "/"}logo-relatorio-viagens.png`,
    }),
    arquivo: nomeArquivoDocumento("Relatorio de viagens", rel.empregado, rel.de, rel.ate),
  });
}

// Lista das despesas do mês do painel (dec 186): filtros, detalhe de cada despesa e geração do relatório das marcadas.
export function ViagensLista({ lista, periodo, tipos, tecnicos, emitente, relatorios, aoGerarRelatorio }: {
  lista: readonly RespostaRegistrada[]; periodo: PeriodoMes; tipos: readonly string[]; tecnicos: readonly string[]; emitente: string;
  // Os relatórios gerados vivem no painel (que também mede o fechamento no prazo); a lista só os mostra e avisa quando gera um novo.
  relatorios: readonly RelatorioSalvo[]; aoGerarRelatorio: () => void;
}) {
  const { empresaId, empresas } = useEmpresa();
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const [filtro, setFiltro] = useState<FiltroLista>(FILTRO_VAZIO);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [aberta, setAberta] = useState<LinhaDespesa | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [supervisor, setSupervisor] = useState(NENHUM);
  const [diretor, setDiretor] = useState(NENHUM);
  const [porPagina, setPorPagina] = useState<ComprovantesPorPagina>(4);
  const [erro, setErro] = useState("");
  const travado = useRef(false);

  const finalizadas = useMemo(() => relatorioPorDespesa(relatorios), [relatorios]);
  const valido = periodoDeDatasValido(filtro);
  const linhas = useMemo(() => (valido ? listaDoPeriodo(lista, periodo, finalizadas, filtro) : []), [lista, periodo, finalizadas, filtro, valido]);
  const selecionadas = linhas.filter((l) => marcadas.has(l.id));
  const nomesEmpregados = empregados.map((e) => e.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const mudar = (parcial: Partial<FiltroLista>) => setFiltro((f) => ({ ...f, ...parcial }));

  function alternar(id: string, marcar: boolean) {
    setMarcadas((m) => { const n = new Set(m); if (marcar) n.add(id); else n.delete(id); return n; });
  }

  function gerar() {
    if (travado.current) return;
    travado.current = true;
    try {
      const empresa = empresaId === TODAS ? "Todas as empresas" : (empresas.find((e) => e.id === empresaId)?.razao_social ?? "GEMAPE");
      const salvo = registrarRelatorio({
        emitente, empresa, comprovantesPorPagina: porPagina,
        supervisor: supervisor === NENHUM ? "" : supervisor, diretor: diretor === NENHUM ? "" : diretor,
        despesas: selecionadas.map((l) => ({ id: l.id, data: l.data, responsavel: l.responsavel })),
      });
      aoGerarRelatorio();
      setMarcadas(new Set());
      setErro("");
      setConfirmando(false);
      abrirRelatorioSalvo(salvo, lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      travado.current = false;
    }
  }

  const seletor = (rotulo: string, valor: string, aoMudar: (v: string) => void, todos: string, itens: readonly string[]) => (
    <div className="space-y-1">
      <Label>{rotulo}</Label>
      <Select value={valor} onValueChange={(v) => { if (v) aoMudar(v); }}>
        <SelectTrigger aria-label={rotulo} className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>{todos}</SelectItem>
          {itens.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <section className="space-y-3" aria-labelledby="viagens-lista">
      <div className="flex flex-wrap items-end gap-2">
      <h2 id="viagens-lista" className="sr-only">Despesas de {rotuloPeriodo(periodo)}</h2>
      <BarraDeFiltros>
        {seletor("Tipo", filtro.tipo ?? TODOS, (v) => mudar({ tipo: v === TODOS ? null : v }), "Todos os tipos", tipos)}
        {seletor("Técnico", filtro.tecnico ?? TODOS, (v) => mudar({ tecnico: v === TODOS ? null : v }), "Todos os técnicos", tecnicos)}
        <div className="space-y-1">
          <Label htmlFor="lista-de">Data inicial</Label>
          <Input id="lista-de" name="lista-de" type="date" className="w-40" value={filtro.de} onChange={(e) => mudar({ de: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lista-ate">Data final</Label>
          <Input id="lista-ate" name="lista-ate" type="date" className="w-40" value={filtro.ate} onChange={(e) => mudar({ ate: e.target.value })} />
        </div>
      </BarraDeFiltros>
      </div>
      {!valido && <p role="alert" className="text-sm text-destructive">A data inicial não pode ser depois da final.</p>}

      <div className="panel flex max-h-[max(6rem,calc(100dvh-54rem))] flex-col overflow-hidden [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 px-2" />
              <TableHead className="px-2">Data</TableHead>
              <TableHead className="px-2">Local</TableHead>
              <TableHead className="px-2 text-center">Foto</TableHead>
              <TableHead className="px-2">Cliente</TableHead>
              <TableHead className="px-2">Técnico</TableHead>
              <TableHead className="px-2">Tipo</TableHead>
              <TableHead className="px-2 text-right">Valor</TableHead>
              <TableHead className="px-2">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Nenhuma despesa para este filtro.</TableCell></TableRow>}
            {linhas.map((l) => (
              <TableRow
                key={l.id} className="cursor-pointer" tabIndex={0} onClick={() => setAberta(l)}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setAberta(l); } }}
              >
                <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                  {l.status === STATUS_EM_ABERTO && (
                    <Checkbox disabled={!l.responsavel} title={l.responsavel ? undefined : "Sem técnico responsável: não entra em relatório"} aria-label={`Marcar despesa de ${dataBr(l.data)}, ${l.tipo}`} checked={marcadas.has(l.id)} onCheckedChange={(c) => alternar(l.id, c === true)} />
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2">{dataBr(l.data)}</TableCell>
                <TableCell className="px-2">{l.local ?? "—"}</TableCell>
                <TableCell className="px-2 text-center">
                  {l.fotos[0] ? <img src={l.fotos[0].dataUrl} alt={`Comprovante: ${l.tipo}`} className="mx-auto h-9 w-9 rounded object-cover" /> : "—"}
                </TableCell>
                <TableCell className="px-2">{l.cliente ?? "—"}</TableCell>
                <TableCell className="px-2">{l.tecnico ?? "—"}</TableCell>
                <TableCell className="px-2">{l.tipo}</TableCell>
                <TableCell className="whitespace-nowrap px-2 text-right">{l.valor === null ? "—" : formatarMoeda(l.valor)}</TableCell>
                <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={l.status === STATUS_EM_ABERTO ? "outline" : "secondary"}>{l.status}</Badge>
                    {l.relatorioId && (
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
                        const rel = relatorios.find((r) => r.id === l.relatorioId);
                        if (rel) abrirRelatorioSalvo(rel, lista);
                      }}>
                        <Download className="mr-1 h-3 w-3" />Baixar relatório
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {linhas.length} {linhas.length === 1 ? "despesa" : "despesas"}; {selecionadas.length} {selecionadas.length === 1 ? "marcada" : "marcadas"}.
        </p>
        <Button disabled={selecionadas.length === 0} onClick={() => { setErro(""); setConfirmando(true); }}>
          <FileText className="mr-1 h-4 w-4" />Gerar relatório
        </Button>
      </div>

      <Dialog open={aberta !== null} onOpenChange={(o) => { if (!o) setAberta(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {aberta && (
            <>
              <DialogHeader>
                <DialogTitle>{aberta.tipo} · {dataBr(aberta.data)}</DialogTitle>
                <DialogDescription>{aberta.tecnico ?? "Técnico não informado"} · {aberta.status}</DialogDescription>
              </DialogHeader>
              <dl className="space-y-2 text-sm">
                {aberta.itens.map((i) => (
                  <div key={i.perguntaId}>
                    <dt className="text-xs text-muted-foreground">{i.titulo}</dt>
                    <dd className="break-words">{i.resposta}</dd>
                  </div>
                ))}
              </dl>
              {aberta.fotos.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {aberta.fotos.map((f, n) => <img key={`${f.nome}-${n}`} src={f.dataUrl} alt={f.nome} className="w-full rounded border object-contain" />)}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar relatório</DialogTitle>
            <DialogDescription>
              {selecionadas.length} {selecionadas.length === 1 ? "despesa marcada" : "despesas marcadas"}. Elas ficam Finalizadas ao gerar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Comprovantes por página</Label>
              <Select value={String(porPagina)} onValueChange={(v) => { if (v) setPorPagina(Number(v) as ComprovantesPorPagina); }}>
                <SelectTrigger aria-label="Comprovantes por página"><SelectValue /></SelectTrigger>
                <SelectContent>{["1", "2", "4"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {([["Supervisor", supervisor, setSupervisor], ["Diretor", diretor, setDiretor]] as const).map(([rotulo, valor, aoMudar]) => (
              <div key={rotulo} className="space-y-1">
                <Label>{rotulo}</Label>
                <Select value={valor} onValueChange={(v) => { if (v) aoMudar(v); }}>
                  <SelectTrigger aria-label={rotulo}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Em branco</SelectItem>
                    {nomesEmpregados.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
            <Button onClick={gerar}>Gerar relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
