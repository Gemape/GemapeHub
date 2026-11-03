import { useState } from "react";

import { GaleriaFotos, VisorFoto } from "@/components/modules/FotosOcorrencia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resumoChecklist, type ChecklistVeiculo } from "@/lib/checklist-veiculo";
import { TODAS } from "@/lib/empresa-context";
import { dataHoraBrasilia, dataHoraLocal, formatarData } from "@/lib/gemape";
import { useEmpregados } from "@/lib/hooks-gemape";
import type { OcorrenciaVeiculo, StatusOcorrencia } from "@/lib/ocorrencias-veiculo";
import { formatarMoeda } from "@/lib/viagens";

// Consultas abertas a partir do extrato do veículo (decisão 338): clicar no código de um check list ou de uma ocorrência abre este registro só para ler, por cima do extrato, e
// "Voltar ao extrato" (ou Esc) fecha e devolve a pessoa ao extrato no mesmo ponto. Quem edita ou trata continua nas telas Check list e Ocorrências.

const COR_AVALIACAO: Record<string, string> = {
  OK: "border-emerald-500 bg-emerald-600 text-white",
  NOK: "border-red-500 bg-red-600 text-white",
  "N.A.": "border-slate-500 bg-slate-600 text-white",
};
const COR_STATUS: Record<StatusOcorrencia, string> = {
  Aberta: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  "Em tratativa": "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Encerrada: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

function Campo({ rotulo, children, largo = false }: { rotulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <div className={largo ? "sm:col-span-2" : ""}>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

export function ConsultaChecklist({ checklist, onFechar }: { checklist: ChecklistVeiculo | null; onFechar: () => void }) {
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const resumo = checklist ? resumoChecklist(checklist) : null;
  const grupos = checklist ? [...new Set(checklist.itens.map((i) => i.grupo))] : [];
  return (
    <>
      <Dialog open={!!checklist} onOpenChange={(a) => { if (!a) onFechar(); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          {checklist && resumo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {checklist.codigo} <Badge variant={checklist.status === "Em andamento" ? "outline" : "secondary"}>{checklist.status}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {checklist.veiculoRotulo} · {checklist.periodicidade ? `${checklist.periodicidade} · ${formatarData(checklist.data)} · responsável: ${checklist.responsavelNome}` : `avulso · ${formatarData(checklist.data)}`}
                  {checklist.concluidoEm && ` · concluído em ${dataHoraBrasilia(checklist.concluidoEm)}`}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm">
                {resumo.avaliados}/{resumo.total} avaliados · {resumo.ok} OK · <span className="text-red-700 dark:text-red-300">{resumo.nok} NOK</span> · {resumo.na} N.A.
                {resumo.pendenciasAbertas > 0 && ` · ${resumo.pendenciasAbertas} pendência(s) aberta(s)`}
              </p>
              {grupos.map((g) => (
                <section key={g} className="space-y-2">
                  <h3 className="text-sm font-semibold">{g}</h3>
                  {checklist.itens.filter((i) => i.grupo === g).map((i) => (
                    <div key={i.id} className="space-y-2 rounded-lg border p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 text-sm">{i.nome}</span>
                        {i.avaliacao ? <Badge variant="outline" className={COR_AVALIACAO[i.avaliacao]}>{i.avaliacao}</Badge> : <span className="text-xs text-muted-foreground">Não avaliado</span>}
                      </div>
                      {i.observacao && <p className="text-xs text-muted-foreground">Observação: {i.observacao}</p>}
                      <GaleriaFotos fotos={i.fotos} onAmpliar={(n) => setVisor({ foto: i.fotos[n] ?? "", titulo: `${i.nome} (${checklist.codigo})` })} />
                      {i.avaliacao === "NOK" && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {i.ocorrenciaCodigo && <Badge variant="outline">Ocorrência {i.ocorrenciaCodigo}</Badge>}
                          {i.resolucao ? (
                            <span className="text-emerald-700 dark:text-emerald-300">Pendência resolvida em {dataHoraBrasilia(i.resolucao.resolvidaEm)}: {i.resolucao.descricao}</span>
                          ) : (
                            <span className="font-medium text-red-700 dark:text-red-300">Pendência aberta</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onFechar}>Voltar ao extrato</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
    </>
  );
}

export function ConsultaOcorrencia({
  ocorrencia, veiculo, onFechar,
}: { ocorrencia: OcorrenciaVeiculo | null; veiculo: string; onFechar: () => void }) {
  // Só é montada com a consulta aberta: a lista de empregados (condutor e responsável da tratativa) não é lida enquanto o extrato está só na tabela.
  const { data: empregados = [] } = useEmpregados(TODAS);
  const nomeEmpregado = (id: string | null | undefined) => empregados.find((e) => e.id === id)?.nome ?? "—";
  const [visor, setVisor] = useState<{ foto: string; titulo: string } | null>(null);
  const t = ocorrencia?.tratativa ?? null;
  return (
    <>
      <Dialog open={!!ocorrencia} onOpenChange={(a) => { if (!a) onFechar(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {ocorrencia && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {ocorrencia.codigo} <Badge variant="outline" className={COR_STATUS[ocorrencia.status]}>{ocorrencia.status}</Badge>
                </DialogTitle>
                <DialogDescription>Cadastrada em {dataHoraBrasilia(ocorrencia.cadastradaEm)}.</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <Campo rotulo="Veículo">{veiculo}</Campo>
                <Campo rotulo="Tipo">{ocorrencia.tipoNome}</Campo>
                <Campo rotulo="Ocorrido em">{dataHoraLocal(ocorrencia.ocorridoEm)}</Campo>
                <Campo rotulo="Local">{ocorrencia.local}</Campo>
                <Campo rotulo="Condutor">{nomeEmpregado(ocorrencia.condutorId)}</Campo>
                <Campo rotulo="Danos">{[ocorrencia.danoEmpresa && "Veículo da empresa", ocorrencia.danoTerceiros && "Veículo de terceiros"].filter(Boolean).join(" e ") || "Sem danos informados"}</Campo>
                <Campo rotulo="Descrição" largo>{ocorrencia.descricao}</Campo>
              </dl>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Fotos</h3>
                {ocorrencia.fotos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma foto anexada.</p>}
                <GaleriaFotos fotos={ocorrencia.fotos} onAmpliar={(i) => setVisor({ foto: ocorrencia.fotos[i] ?? "", titulo: `${ocorrencia.codigo} · foto ${i + 1}` })} />
              </div>
              <section className="space-y-2 rounded-lg border p-3">
                <h3 className="text-sm font-semibold">Tratativa</h3>
                {!t ? (
                  <p className="text-sm text-muted-foreground">Ainda sem tratativa registrada.</p>
                ) : (
                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                    <Campo rotulo="Registrada em">{dataHoraBrasilia(t.registradaEm)}</Campo>
                    <Campo rotulo="Última atualização">{dataHoraBrasilia(t.atualizadaEm)}</Campo>
                    <Campo rotulo="Responsável">{nomeEmpregado(t.responsavelId)}</Campo>
                    <Campo rotulo="Custo para a empresa">{formatarMoeda(t.custoEmpresa)}</Campo>
                    {t.descricaoEmpresa && <Campo rotulo="Veículo da empresa" largo>{t.descricaoEmpresa}</Campo>}
                    {t.descricaoTerceiros && <Campo rotulo="Veículo de terceiros" largo>{t.descricaoTerceiros}</Campo>}
                    <Campo rotulo="Pagamento feito por terceiros">{t.pagamentoTerceiros || "—"}</Campo>
                    <Campo rotulo="Uso de seguradora">{t.seguradora ? "Sim" : "Não"}</Campo>
                    {ocorrencia.encerradaEm && <Campo rotulo="Encerrada em">{dataHoraBrasilia(ocorrencia.encerradaEm)}</Campo>}
                  </dl>
                )}
                {(ocorrencia.renovacoes ?? []).length > 0 && (
                  <div className="space-y-1 border-t pt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Renovações de prazo</h4>
                    <ul className="text-sm">
                      {(ocorrencia.renovacoes ?? []).map((r, n) => (
                        <li key={n}>{dataHoraBrasilia(r.em)}: prazo para {r.passo === "iniciar" ? "iniciar" : "finalizar"} a tratativa renovado{r.ate ? ` até ${formatarData(r.ate)}` : ""}, autorizado por {r.autorizadoPorNome}.</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onFechar}>Voltar ao extrato</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <VisorFoto foto={visor?.foto ?? null} titulo={visor?.titulo ?? ""} onFechar={() => setVisor(null)} />
    </>
  );
}
