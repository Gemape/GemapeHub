import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useEmpregados } from "@/lib/hooks-gemape";
import { useVistoriasDasCaixas } from "@/lib/use-vistorias-caixas";
import {
  MESES_DO_ANO, cargaPorMes, lerMesesBase, lerResponsaveisVistoria, mesesPrevistos, mesesSobrecarregados, rotuloMes, salvarMesBase, salvarResponsavelVistoria,
} from "@/lib/escalonamento-vistorias";

const SEM = "sem";

// Parâmetros > Ferramentas > Plano de vistorias: cada caixa recebe um mês-base e um responsável pela vistoria; os meses seguintes saem da periodicidade
// dos Parâmetros Específicos, contada a partir do mês-base. O contador mostra, mês a mês, quantas vistorias estão previstas.
export function FerramentasPlanoVistorias() {
  const { canWrite } = useAccess();
  const [mesesBase, setMesesBase] = useState(lerMesesBase);
  const [responsaveis, setResponsaveis] = useState(lerResponsaveisVistoria);
  const { linhas, isLoading, periodicidade, prazoDias, hoje } = useVistoriasDasCaixas(mesesBase);
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const caixas = linhas.map((l) => l.caixa);
  const situacoes = new Map(linhas.map((l) => [l.caixa.id, l.resultado]));
  const vencidas = linhas.filter((l) => l.resultado.situacao === "Vencida").length;
  const carga = cargaPorMes(caixas.map((c) => mesesBase[c.id]), periodicidade, hoje);
  const sobrecarregados = new Set(mesesSobrecarregados(carga).map(rotuloMes));
  const semMes = caixas.filter((c) => mesesBase[c.id] === undefined).length;

  function guardar(acao: () => void) {
    try { acao(); } catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar."); }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Escolha o mês-base e o responsável pela vistoria de cada caixa. As vistorias seguintes contam a partir do mês-base, com a periodicidade {periodicidade.toLowerCase()} e o prazo de {prazoDias} {prazoDias === 1 ? "dia" : "dias"} definidos em{" "}
        <Link to="/cadastros/gerais/categorias" search={{ de: "ferramentas" }} className="font-medium text-primary underline underline-offset-2">Parâmetros Específicos</Link>.
        {periodicidade === "Quinzenal" && " Na quinzenal a caixa cai em todos os meses; o mês-base só marca o início."}
        {vencidas > 0 && <strong className="text-destructive"> {vencidas} {vencidas === 1 ? "vistoria vencida" : "vistorias vencidas"}.</strong>}
        {semMes > 0 && ` ${semMes} ${semMes === 1 ? "caixa está" : "caixas estão"} sem mês-base e fora do calendário.`}
      </p>

      <section aria-label="Vistorias previstas nos próximos 12 meses" className="space-y-1.5">
        <h2 className="text-sm font-semibold">Vistorias por mês</h2>
        <ul className="flex flex-wrap gap-1.5">
          {carga.map((c) => {
            const rotulo = rotuloMes(c);
            const alto = sobrecarregados.has(rotulo);
            return (
              <li key={rotulo} title={alto ? "Concentração alta" : undefined} className={`rounded-md border px-2.5 py-1 text-xs ${alto ? "border-destructive font-medium text-destructive" : "text-muted-foreground"}`}>
                {rotulo} <strong className="ml-1 text-sm text-foreground">{c.caixas}</strong>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caixa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Mês-base</TableHead>
              <TableHead>Responsável pela vistoria</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Próximas vistorias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={6} />
              : caixas.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center">Nenhuma caixa habilitada.</TableCell></TableRow>
                : caixas.map((c) => {
                  const base = mesesBase[c.id];
                  const previstos = base === undefined ? [] : mesesPrevistos(base, periodicidade, hoje, 24).slice(0, 4);
                  const x = situacoes.get(c.id)!;
                  const doEmpregado = empregados.filter((e) => !c.empresa_id || e.empresa_id === c.empresa_id);
                  const atual = responsaveis[c.id];
                  const nomeAtual = empregados.find((e) => e.id === atual)?.nome;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                      <TableCell>{c.descricao || c.nome}</TableCell>
                      <TableCell>
                        <Select value={base === undefined ? SEM : String(base)} disabled={!canWrite}
                          onValueChange={(v) => guardar(() => setMesesBase(salvarMesBase(c.id, v === SEM ? null : Number(v))))}>
                          <SelectTrigger aria-label={`Mês-base da caixa ${c.codigo}`} className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM}>Sem mês-base</SelectItem>
                            {MESES_DO_ANO.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={atual && nomeAtual ? atual : SEM} disabled={!canWrite}
                          onValueChange={(v) => guardar(() => setResponsaveis(salvarResponsavelVistoria(c.id, v === SEM ? null : v)))}>
                          <SelectTrigger aria-label={`Responsável pela vistoria da caixa ${c.codigo}`} className="w-52"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM}>Sem responsável</SelectItem>
                            {doEmpregado.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {x.situacao === "Sem escalonamento" ? <span className="text-muted-foreground">Sem escalonamento</span> : (
                          <span className={x.situacao === "Vencida" ? "font-medium text-destructive" : x.situacao === "Pendente" ? "font-medium text-amber-600" : "text-emerald-600"}
                            title={`Prevista para ${formatarData(x.previstaEm!)}; limite ${formatarData(x.limite!)}`}>
                            {x.situacao === "Em dia" ? "Em dia" : x.situacao === "Pendente" ? `Pendente até ${formatarData(x.limite!)}` : `Vencida (limite ${formatarData(x.limite!)})`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{previstos.length === 0 ? <span className="text-muted-foreground">Fora do calendário</span> : previstos.map(rotuloMes).join(" · ")}</TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
