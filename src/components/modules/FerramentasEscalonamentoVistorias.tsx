import { useState } from "react";
import { toast } from "sonner";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { hojeBrasilia } from "@/lib/checklist-veiculo";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { useCaixasFerramentas, useMovimentacoes } from "@/lib/hooks-gemape";
import { formatarData } from "@/lib/gemape";
import { situacaoDaVistoria } from "@/lib/situacao-vistoria";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { lerParametrosVistoria } from "@/lib/vistoria-ferramentas-parametros";
import { MESES_DO_ANO, cargaPorMes, lerMesesBase, mesesPrevistos, mesesSobrecarregados, rotuloMes, salvarMesBase } from "@/lib/escalonamento-vistorias";

const SEM_MES = "sem";

// Ferramentas > Escalonamento de Vistorias: cada caixa recebe um mês-base e as vistorias seguintes saem da periodicidade dos Parâmetros Específicos.
// Os grupos se formam sozinhos pelo mês-base; o resumo mostra quantas caixas vencem em cada mês, para espalhar a carga.
export function FerramentasEscalonamentoVistorias() {
  const { empresaId } = useEmpresa();
  const { canWrite } = useAccess();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const caixas = caixasHabilitadas(todasCaixas, habilitadas)
    .filter((c) => empresaId === TODAS || c.empresa_id === empresaId)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
  const { periodicidade, prazoDias } = lerParametrosVistoria();
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const [mesesBase, setMesesBase] = useState(lerMesesBase);
  const hoje = hojeBrasilia();

  // Última vistoria de cada caixa, pelo histórico (a caixa vem gravada na vistoria em modo demonstração).
  const ultimaVistoria = new Map<string, string>();
  for (const m of movimentos) {
    if (m.tipo_movimentacao !== "Vistoria" || !m.caixa_id) continue;
    const dia = m.data_movimentacao.slice(0, 10);
    if (dia > (ultimaVistoria.get(m.caixa_id) ?? "")) ultimaVistoria.set(m.caixa_id, dia);
  }
  const situacoes = new Map(caixas.map((c) => [c.id, situacaoDaVistoria({ mesBase: mesesBase[c.id], periodicidade, prazoDias, hoje, ultimaVistoria: ultimaVistoria.get(c.id) })]));
  const vencidas = [...situacoes.values()].filter((x) => x.situacao === "Vencida").length;
  const carga = cargaPorMes(caixas.map((c) => mesesBase[c.id]), periodicidade, hoje);
  const sobrecarregados = new Set(mesesSobrecarregados(carga).map(rotuloMes));
  const semMes = caixas.filter((c) => mesesBase[c.id] === undefined).length;

  function alterar(caixaId: string, valor: string) {
    try {
      setMesesBase(salvarMesBase(caixaId, valor === SEM_MES ? null : Number(valor)));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o mês-base.");
    }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Escolha o mês-base de cada caixa. As vistorias seguintes saem da periodicidade <strong>{periodicidade.toLowerCase()}</strong>, definida em Parâmetros &gt; Ferramentas &gt; Parâmetros Específicos, e se repetem nos anos seguintes.
        {periodicidade === "Quinzenal" && " Na periodicidade quinzenal a caixa cai em todos os meses; o mês-base só marca o início."}
        {vencidas > 0 && <strong className="text-destructive"> {vencidas} {vencidas === 1 ? "vistoria vencida" : "vistorias vencidas"}.</strong>}
        {semMes > 0 && ` ${semMes} ${semMes === 1 ? "caixa está" : "caixas estão"} sem mês-base e fora do calendário.`}
      </p>

      <section aria-label="Caixas a vistoriar nos próximos 12 meses" className="space-y-2">
        <h2 className="text-lg font-semibold">Carga dos próximos 12 meses</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {carga.map((c) => {
            const rotulo = rotuloMes(c);
            const alto = sobrecarregados.has(rotulo);
            return (
              <li key={rotulo} className={`panel p-3 ${alto ? "border-destructive" : ""}`}>
                <p className="text-xs text-muted-foreground">{rotulo}</p>
                <p className="text-xl font-semibold">{c.caixas}</p>
                <p className={`text-xs ${alto ? "font-medium text-destructive" : "text-muted-foreground"}`}>{alto ? "Concentração alta" : c.caixas === 1 ? "vistoria" : "vistorias"}</p>
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
              <TableHead>Localização</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Mês-base</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Próximas vistorias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={7} />
              : caixas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">Nenhuma caixa habilitada.</TableCell></TableRow>
                : caixas.map((c) => {
                  const base = mesesBase[c.id];
                  const previstos = base === undefined ? [] : mesesPrevistos(base, periodicidade, hoje, 24).slice(0, 4);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                      <TableCell>{c.descricao || c.nome}</TableCell>
                      <TableCell>{c.localizacao || "—"}</TableCell>
                      <TableCell>{periodicidade}</TableCell>
                      <TableCell>
                        <Select value={base === undefined ? SEM_MES : String(base)} onValueChange={(v) => alterar(c.id, v)} disabled={!canWrite}>
                          <SelectTrigger aria-label={`Mês-base da caixa ${c.codigo}`} className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM_MES}>Sem mês-base</SelectItem>
                            {MESES_DO_ANO.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const x = situacoes.get(c.id)!;
                          if (x.situacao === "Sem escalonamento") return <span className="text-muted-foreground">Sem escalonamento</span>;
                          const cor = x.situacao === "Vencida" ? "text-destructive font-medium" : x.situacao === "Pendente" ? "text-amber-600 font-medium" : "text-emerald-600";
                          return <span className={cor} title={`Prevista para ${formatarData(x.previstaEm!)}; limite ${formatarData(x.limite!)}`}>{x.situacao === "Em dia" ? "Em dia" : x.situacao === "Pendente" ? `Pendente até ${formatarData(x.limite!)}` : `Vencida (limite ${formatarData(x.limite!)})`}</span>;
                        })()}
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
