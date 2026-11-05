import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { rotuloDoMes, SITUACAO } from "@/components/modules/ChecklistPainelMensal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checklistVisivelNaLista, pendenciaAberta, type ChecklistVeiculo } from "@/lib/checklist-veiculo";
import { mesDe, mesesDisponiveis, noMesDaLista, painelDoMes, type Previsao } from "@/lib/checklist-painel";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";

const TODOS_OS_MESES = "todos";
const pendenciasDe = (c: ChecklistVeiculo | undefined) => (c ? c.itens.filter(pendenciaAberta).length : 0);
const CelulaPendencias = ({ n }: { n: number | null }) =>
  n === null ? <span className="text-muted-foreground">—</span> : n > 0 ? <span className="font-semibold text-red-700 dark:text-red-300">{n}</span> : <>0</>;

// Cabeçalho comum das duas listas: Voltar ao painel, o mês, a busca e o botão de novo check list.
function BarraDaLista({
  titulo, mes, onMes, hoje, busca, onBusca, onVoltar, voltarRef, acao,
}: { titulo: string; mes: string; onMes: (m: string) => void; hoje: string; busca: string; onBusca: (b: string) => void; onVoltar: () => void; voltarRef?: React.Ref<HTMLButtonElement> | undefined; acao: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Button ref={voltarRef} type="button" variant="outline" size="sm" className="order-first" onClick={onVoltar}><ArrowLeft className="h-4 w-4" /> Voltar ao painel</Button>
      <h2 className="sr-only">{titulo}</h2>
      <div>{acao}</div>
      <BarraDeFiltros>
      <div className="flex items-center gap-1.5">
        <Label htmlFor="lista_mes" className="text-xs">Mês</Label>
        <Select value={mes} onValueChange={onMes}>
          <SelectTrigger id="lista_mes" className="h-8 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS_OS_MESES}>Todos os meses</SelectItem>
            {mesesDisponiveis(hoje).map((m) => <SelectItem key={m} value={m}>{rotuloDoMes(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Input aria-label="Buscar check list" placeholder="Buscar por veículo ou responsável" className="max-w-xs" value={busca} onChange={(e) => onBusca(e.target.value)} />
      </BarraDeFiltros>
    </div>
  );
}

const CABECALHO = ["Prazo", "Veículo", "Periodicidade", "Responsável", "Situação", "Pendências", ""];

// Check list periódico (decisão 298): a lista completa do mês, uma linha por prazo previsto, na ordem Prazo, Veículo, Periodicidade, Responsável, Situação,
// Pendências e o link da ação: a vencer leva a Realizar (ou Continuar, se já foi iniciado); não realizado no prazo não tem ação, porque não pode mais ser feito;
// realizado leva a Ver o check list realizado.
export function ChecklistListaPeriodica({
  previsoes, checklists, idsDosVeiculos, hoje, onVer, onRealizar, onNovo, onVoltar, voltarRef,
}: {
  previsoes: Previsao[];
  checklists: ChecklistVeiculo[];
  idsDosVeiculos: Set<string>;
  hoje: string;
  onVer: (checklistId: string) => void;
  onRealizar: (veiculoId: string, periodicidade: string) => void;
  onNovo: () => void;
  onVoltar: () => void; voltarRef?: React.Ref<HTMLButtonElement>;
}) {
  // Sem escolha, o mês acompanha o dia de hoje (inclusive na virada do mês).
  const [escolhido, setMes] = useState<string | null>(null);
  const mes = escolhido ?? mesDe(hoje);
  const [busca, setBusca] = useState("");
  const { linhas } = painelDoMes(
    mes === TODOS_OS_MESES ? null : mes,
    previsoes.filter((p) => idsDosVeiculos.has(p.veiculoId)),
    checklists.filter((c) => idsDosVeiculos.has(c.veiculoId)),
    hoje,
  );
  const filtradas = linhas.filter((l) => combinaBusca(busca, l.veiculoRotulo, l.responsavelNome, l.periodicidade));
  // Check list periódico que não casa com nenhuma linha de previsão (feito antes da associação, de periodicidade que saiu dela, o segundo do mesmo prazo ou de veículo
  // que ficou inativo) não pode sumir: as pendências dele continuam valendo. Aparece depois das previsões, como Sem previsão.
  // Todas as previsões, de todos os meses: o prazo que atravessa a virada do mês fica na linha do mês em que termina, e o check list feito antes da virada não é "sem previsão".
  const todasLinhas = mes === TODOS_OS_MESES ? linhas : painelDoMes(null, previsoes.filter((p) => idsDosVeiculos.has(p.veiculoId)), checklists.filter((c) => idsDosVeiculos.has(c.veiculoId)), hoje).linhas;
  const usados = new Set(todasLinhas.flatMap((l) => (l.checklistId ? [l.checklistId] : [])));
  const semPrevisao = checklists
    .filter((c) => idsDosVeiculos.has(c.veiculoId) && checklistVisivelNaLista(c) && noMesDaLista(c, mes === TODOS_OS_MESES ? null : mes) && !usados.has(c.id))
    .filter((c) => !(c.status === "Em andamento" && todasLinhas.some((l) => l.veiculoId === c.veiculoId && l.periodicidade === c.periodicidade && c.data >= l.inicio && c.data <= l.fim)))
    .filter((c) => combinaBusca(busca, c.veiculoRotulo, c.responsavelNome, c.periodicidade ?? ""))
    .sort((a, b) => a.data.localeCompare(b.data));

  return (
    <section className="space-y-3" aria-label="Check list periódico">
      <BarraDaLista
        titulo="Check list periódico" mes={mes} onMes={setMes} hoje={hoje} busca={busca} onBusca={setBusca} onVoltar={onVoltar} voltarRef={voltarRef}
        acao={<Button requiresWrite="operar" size="sm" onClick={onNovo}>Novo check list</Button>}
      />
      <p className="text-xs text-muted-foreground">
        {mes === TODOS_OS_MESES ? "Todos os meses" : rotuloDoMes(mes)}: {filtradas.length} {filtradas.length === 1 ? "check list previsto" : "check lists previstos"}{semPrevisao.length > 0 ? `, mais ${semPrevisao.length} sem previsão` : ""}.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>{CABECALHO.map((t, n) => <TableHead key={n} className={t === "Pendências" ? "text-right" : undefined}>{t}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 && semPrevisao.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhum check list previsto neste mês."}</TableCell></TableRow>
            )}
            {filtradas.map((l) => {
              const feito = l.checklistId ? checklists.find((c) => c.id === l.checklistId) : undefined;
              const andamento = checklists.find((c) => c.veiculoId === l.veiculoId && c.periodicidade === l.periodicidade && c.status === "Em andamento" && c.data >= l.inicio && c.data <= l.fim);
              const aberto = l.situacao === "a_vencer" || (l.situacao === "opcional" && l.fim >= hoje);
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{l.inicio === l.fim ? formatarData(l.fim) : `${formatarData(l.inicio)} a ${formatarData(l.fim)}`}</TableCell>
                  <TableCell>{l.veiculoRotulo}</TableCell>
                  <TableCell>{l.periodicidade}</TableCell>
                  <TableCell>{l.responsavelNome || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={SITUACAO[l.situacao].classe}>{SITUACAO[l.situacao].rotulo}</Badge></TableCell>
                  <TableCell className="text-right"><CelulaPendencias n={feito ? pendenciasDe(feito) : null} /></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {l.situacao === "realizado" && l.checklistId ? (
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onVer(l.checklistId!)}>Ver check list</Button>
                    ) : andamento ? (
                      // Em andamento sempre pode continuar (ou descartar), mesmo com o prazo vencido: senão o check list iniciado fica sem como abrir.
                      <Button requiresWrite="operar" variant="link" size="sm" className="h-auto p-0" onClick={() => onVer(andamento.id)}>Continuar</Button>
                    ) : aberto ? (
                      <Button requiresWrite="operar" variant="link" size="sm" className="h-auto p-0" onClick={() => onRealizar(l.veiculoId, l.periodicidade)}>Realizar</Button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
            {semPrevisao.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap">{formatarData(c.data)}</TableCell>
                <TableCell>{c.veiculoRotulo}</TableCell>
                <TableCell>{c.periodicidade ?? "—"}</TableCell>
                <TableCell>{c.responsavelNome || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={SITUACAO.opcional.classe}>Sem previsão</Badge></TableCell>
                <TableCell className="text-right"><CelulaPendencias n={pendenciasDe(c)} /></TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {c.status === "Em andamento"
                    ? <Button requiresWrite="operar" variant="link" size="sm" className="h-auto p-0" onClick={() => onVer(c.id)}>Continuar</Button>
                    : <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onVer(c.id)}>Ver check list</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

const SITUACAO_AVULSO: Record<string, { rotulo: string; classe: string }> = {
  "Concluído": { rotulo: "Realizado", classe: SITUACAO.realizado.classe },
  "Em andamento": { rotulo: "Em andamento", classe: SITUACAO.a_vencer.classe },
};

// Check list avulso (decisão 298): as mesmas colunas, na mesma ordem. O avulso não tem prazo nem periodicidade: o prazo é o dia do check list e a periodicidade
// é "Avulso"; o responsável vem em branco quando ninguém foi definido.
export function ChecklistListaAvulsa({
  avulsos, hoje, nomeDoVeiculo, onVer, onNovo, onVoltar, voltarRef,
}: {
  avulsos: ChecklistVeiculo[];
  hoje: string;
  nomeDoVeiculo: (c: ChecklistVeiculo) => string;
  onVer: (checklistId: string) => void;
  onNovo: () => void;
  onVoltar: () => void; voltarRef?: React.Ref<HTMLButtonElement>;
}) {
  // Sem escolha, o mês acompanha o dia de hoje (inclusive na virada do mês).
  const [escolhido, setMes] = useState<string | null>(null);
  const mes = escolhido ?? mesDe(hoje);
  const [busca, setBusca] = useState("");
  const lista = avulsos
    .filter((c) => noMesDaLista(c, mes === TODOS_OS_MESES ? null : mes))
    .filter((c) => combinaBusca(busca, c.codigo, nomeDoVeiculo(c), c.responsavelNome, c.status, formatarData(c.data)))
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));

  return (
    <section className="space-y-3" aria-label="Check list avulso">
      <BarraDaLista
        titulo="Check list avulso" mes={mes} onMes={setMes} hoje={hoje} busca={busca} onBusca={setBusca} onVoltar={onVoltar} voltarRef={voltarRef}
        acao={<Button requiresWrite="operar" size="sm" onClick={onNovo}>Novo check list avulso</Button>}
      />
      <p className="text-xs text-muted-foreground">
        {mes === TODOS_OS_MESES ? "Todos os meses" : rotuloDoMes(mes)}: {lista.length} {lista.length === 1 ? "check list avulso" : "check lists avulsos"}.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>{CABECALHO.map((t, n) => <TableHead key={n} className={t === "Pendências" ? "text-right" : undefined}>{t}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhum check list avulso neste mês."}</TableCell></TableRow>
            )}
            {lista.map((c) => {
              const sit = SITUACAO_AVULSO[c.status] ?? { rotulo: c.status, classe: SITUACAO.opcional.classe };
              return (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">{formatarData(c.data)}</TableCell>
                  <TableCell>{nomeDoVeiculo(c)}</TableCell>
                  <TableCell>Avulso</TableCell>
                  <TableCell>{c.responsavelNome || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={sit.classe}>{sit.rotulo}</Badge></TableCell>
                  <TableCell className="text-right"><CelulaPendencias n={pendenciasDe(c)} /></TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {c.status === "Em andamento"
                      ? <Button requiresWrite="operar" variant="link" size="sm" className="h-auto p-0" onClick={() => onVer(c.id)}>Continuar</Button>
                      : <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onVer(c.id)}>Ver check list</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
