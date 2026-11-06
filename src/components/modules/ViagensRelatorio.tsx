import { FileText, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { useEmpregados } from "@/lib/hooks-gemape";
import { ID_TECNICO_RESPONSAVEL, habilitadosDaPergunta, lerEstado } from "@/lib/questionario-despesas";
import { listarRespostas } from "@/lib/respostas-despesas";
import { dadosDoLancamento, formatarMoeda } from "@/lib/viagens";
import {
  clientesVisitados, linhasDoRelatorio, montarRelatorioViagensHtml, totaisPorTipo, type ComprovantesPorPagina,
} from "@/lib/viagens-relatorio";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TODOS = "__todos__";
const NENHUM = "__nenhum__";
const CONFERIDO_POR = ["PCM", "Administrativo"];

// Viagens > Relatório (dec 180): filtros, conferência rápida e geração do documento para imprimir ou salvar em PDF.
export function ViagensRelatorio({ emitente }: { emitente: string }) {
  const { empresaId, empresas } = useEmpresa();
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const hoje = hojeBrasilia();
  const [empregado, setEmpregado] = useState(TODOS);
  const [de, setDe] = useState(`${hoje.slice(0, 8)}01`);
  const [ate, setAte] = useState(hoje);
  const [porPagina, setPorPagina] = useState<ComprovantesPorPagina>(4);
  const [supervisor, setSupervisor] = useState(NENHUM);
  const [diretor, setDiretor] = useState(NENHUM);
  const [conferido, setConferido] = useState(NENHUM);

  const lista = useMemo(() => listarRespostas(), []);
  const nomes = useMemo(() => {
    const estado = lerEstado();
    const q14 = estado.perguntas.find((p) => p.id === ID_TECNICO_RESPONSAVEL);
    const habilitados = (q14 ? (habilitadosDaPergunta(estado, q14) ?? []) : []).map((h) => h.nome);
    const lancados = lista.map((r) => dadosDoLancamento(r).responsavel).filter((n): n is string => !!n);
    return [...new Set([...habilitados, ...lancados])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lista]);

  const periodoValido = !!de && !!ate && de <= ate;
  const linhas = useMemo(
    () => (periodoValido ? linhasDoRelatorio(lista, { empregado: empregado === TODOS ? null : empregado, de, ate }) : []),
    [lista, empregado, de, ate, periodoValido],
  );
  const clientes = clientesVisitados(linhas);
  const total = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
  const comprovantes = linhas.reduce((s, l) => s + l.imagens.length, 0);
  const nomesEmpregados = empregados.map((e) => e.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));

  function gerar() {
    const empresa = empresaId === TODAS ? "Todas as empresas" : (empresas.find((e) => e.id === empresaId)?.razao_social ?? "GEMAPE");
    const quem = empregado === TODOS ? null : empregado;
    abrirDocumento({
      titulo: "Relatório de Viagens",
      html: montarRelatorioViagensHtml({
        empresa, empregado: quem, de, ate, linhas, comprovantesPorPagina: porPagina, emitente,
        supervisor: supervisor === NENHUM ? "" : supervisor, diretor: diretor === NENHUM ? "" : diretor,
        conferido: conferido === NENHUM ? "" : conferido,
        geradoEm: new Date().toISOString(), logoUrl: `${window.location.origin}${import.meta.env["BASE_URL"] ?? "/"}logo-relatorio-viagens.png`,
      }),
      arquivo: nomeArquivoDocumento("Relatorio de viagens", quem ?? "todos", de, ate),
    });
  }

  const lista2 = (valor: string, aoMudar: (v: string) => void, rotulo: string, vazio: string, itens: string[]) => (
    <div className="space-y-1">
      <Label className="block text-center">{rotulo}</Label>
      <Select value={valor} onValueChange={(v) => { if (v) aoMudar(v); }}>
        <SelectTrigger aria-label={rotulo}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={vazio}>{vazio === TODOS ? "Todos os empregados" : "Em branco"}</SelectItem>
          {itens.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="panel space-y-4 p-4" aria-labelledby="viagens-relatorio-filtros">
        <h2 id="viagens-relatorio-filtros" className="text-lg font-semibold">Relatório de Viagens</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lista2(empregado, setEmpregado, "Empregado", TODOS, nomes)}
          <div className="space-y-1">
            <Label className="block text-center" htmlFor="relatorio-de">Data inicial</Label>
            <Input id="relatorio-de" name="relatorio-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="block text-center" htmlFor="relatorio-ate">Data final</Label>
            <Input id="relatorio-ate" name="relatorio-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="block text-center">Comprovantes por página</Label>
            <Select value={String(porPagina)} onValueChange={(v) => { if (v) setPorPagina(Number(v) as ComprovantesPorPagina); }}>
              <SelectTrigger aria-label="Comprovantes por página"><SelectValue /></SelectTrigger>
              <SelectContent>{["1", "2", "4"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Emitente</Label>
            <p className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">{emitente}</p>
          </div>
          {lista2(supervisor, setSupervisor, "Supervisor", NENHUM, nomesEmpregados)}
          {lista2(diretor, setDiretor, "Diretor", NENHUM, nomesEmpregados)}
        </div>
        {!periodoValido && <p role="alert" className="text-sm text-destructive">Informe um período válido: a data inicial não pode ser depois da final.</p>}
      </section>

      <section className="panel space-y-3 p-4" aria-labelledby="viagens-relatorio-conferencia">
        <h2 id="viagens-relatorio-conferencia" className="text-lg font-semibold">Conferência</h2>
        <p className="text-sm text-muted-foreground">
          {linhas.length} {linhas.length === 1 ? "despesa" : "despesas"} no período, {formatarMoeda(total)} no total, {comprovantes} {comprovantes === 1 ? "comprovante" : "comprovantes"}.
        </p>
        <ul className="text-sm">
          {totaisPorTipo(linhas).map((t) => <li key={t.tipo}>{t.tipo}: {t.quantidade} · {formatarMoeda(t.total)}</li>)}
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          <span><strong>Clientes visitados:</strong> {clientes.length ? clientes.join(" · ") : "Clientes não informados"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="relatorio-conferido" className="font-bold">Conferido:</Label>
          <Select value={conferido} onValueChange={(v) => { if (v) setConferido(v); }}>
            <SelectTrigger id="relatorio-conferido" aria-label="Conferido" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUM}>Em branco</SelectItem>
              {CONFERIDO_POR.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Button onClick={gerar} disabled={!periodoValido}><FileText className="mr-1 h-4 w-4" />Gerar relatório</Button>
        </div>
      </section>
    </div>
  );
}
