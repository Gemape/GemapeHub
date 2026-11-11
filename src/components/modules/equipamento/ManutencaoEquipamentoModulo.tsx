import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { Banknote, CircleDashed, ListChecks, Wrench } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { lerManutencaoEquipamento } from "@/lib/equipamentos-manutencao";
import { formatarData } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { atualizarManutencaoEq, custoDaManutencaoEq, registrarManutencaoEq, removerManutencaoEq, STATUS_OS_EQ, statusDaOsEq, ultimoHorimetro, type AcaoRealizada, type ManutencaoEquipamentoRegistro, type StatusOsEq } from "@/lib/registros-equipamento";
import { executar } from "@/lib/use-parametros-base";
import { hoje, horimetroEmTexto, numero, reais, rotuloDoEquipamento, TODOS, useEquipamentosDaEmpresa, useOrdensEq } from "./comum";

// Módulos > Equipamentos > Manutenção: ordens de serviço de manutenção preventiva ou corretiva. A ordem nasce Pendente, vai para Em andamento e termina Concluída
// (com as ações realizadas, as de Parâmetros > Equipamentos > Manutenção, e os custos) ou Cancelada; tem técnico responsável e previsão de conclusão.
// Só a concluída entra nos custos e indicadores. Só modo demonstração (as tabelas do banco real são da Fase 2).
// Cor da situação: um ponto e o texto, no tom dos selos de situação das outras telas (verde, laranja, azul e cinza), com variante para o tema escuro.
const COR_STATUS: Record<StatusOsEq, { selo: string; ponto: string }> = {
  "Pendente": { selo: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300", ponto: "bg-orange-500" },
  "Em andamento": { selo: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300", ponto: "bg-blue-500" },
  "Concluída": { selo: "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300", ponto: "bg-green-500" },
  "Cancelada": { selo: "border-border bg-muted text-muted-foreground", ponto: "bg-muted-foreground/60" },
};
export function ManutencaoEquipamentoModulo() {
  const { canDelete } = useAccess();
  const equipamentos = useEquipamentosDaEmpresa();
  const todas = useOrdensEq();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);
  const [situacao, setSituacao] = useState(TODOS);
  const [editando, setEditando] = useState<ManutencaoEquipamentoRegistro | null>(null);
  const [busca, setBusca] = useState("");
  const rotulos = new Map(equipamentos.map((e) => [e.id, rotuloDoEquipamento(e)]));
  const filtroValido = filtro === TODOS || rotulos.has(filtro) ? filtro : TODOS;

  // Os cartões "Em aberto" e de atraso não dependem do filtro de situação (senão marcariam 0 ao filtrar por Concluída); a lista e os demais, sim.
  const base = useMemo(
    () => todas
      .filter((m) => rotulos.has(m.equipamentoId) && (filtroValido === TODOS || m.equipamentoId === filtroValido) && (tipo === TODOS || m.tipo === tipo))
      .filter((m) => combinaBusca(busca, rotulos.get(m.equipamentoId) ?? "", m.tipo, formatarData(m.data), m.localNome, m.observacao, statusDaOsEq(m), m.responsavel ?? "", ...m.acoes.map((a) => a.nome)))
      .sort((a, b) => b.data.localeCompare(a.data) || b.horimetro - a.horimetro),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todas, equipamentos.length, filtroValido, tipo, busca],
  );
  const linhas = base.filter((m) => situacao === TODOS || statusDaOsEq(m) === situacao);
  const custo = linhas.filter((m) => statusDaOsEq(m) === "Concluída").reduce((s, m) => s + custoDaManutencaoEq(m), 0);
  const emAberto = base.filter((m) => ["Pendente", "Em andamento"].includes(statusDaOsEq(m))).length;
  const hojeIso = hoje();
  const atrasadas = base.filter((m) => ["Pendente", "Em andamento"].includes(statusDaOsEq(m)) && !!m.dataPrevista && m.dataPrevista < hojeIso).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <BarraDeFiltros>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_eq_manut">Histórico por equipamento</Label>
            <Select value={filtroValido} onValueChange={setFiltro}>
              <SelectTrigger id="filtro_eq_manut" className="w-80 max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os equipamentos</SelectItem>
                {equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_eq_tipo">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="filtro_eq_tipo" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem><SelectItem value="Preventiva">Preventiva</SelectItem><SelectItem value="Corretiva">Corretiva</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro_eq_situacao">Situação</Label>
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger id="filtro_eq_situacao" className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                {STATUS_OS_EQ.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input aria-label="Buscar manutenção" placeholder="Buscar por equipamento, técnico, ação ou local" className="max-w-xs" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </BarraDeFiltros>
        <Button requiresWrite onClick={() => setAberto(true)} disabled={equipamentos.length === 0}>Nova ordem de serviço</Button>
      </div>

      <GradeDeCartoes colunas={4}>
        <StatCard titulo="Manutenções" subtitulo="Ordens de serviço da lista abaixo." valor={linhas.length} detalhe={`${linhas.filter((m) => statusDaOsEq(m) === "Concluída").length} concluída(s)`} icone={Wrench} compacto />
        <StatCard titulo="Em aberto" subtitulo="Pendentes e em andamento." valor={emAberto} detalhe={atrasadas > 0 ? `${atrasadas} com a previsão vencida` : "Nenhuma atrasada"} icone={CircleDashed} compacto />
        <StatCard titulo="Preventivas / corretivas" subtitulo="Ordens de cada tipo na lista." valor={`${linhas.filter((m) => m.tipo === "Preventiva").length} / ${linhas.filter((m) => m.tipo === "Corretiva").length}`} detalhe={`${linhas.length} ordem(ns) na lista`} icone={ListChecks} compacto />
        <StatCard titulo="Custo total" subtitulo="Soma do custo das ordens concluídas da lista." valor={reais(custo)} detalhe="Peças e mão de obra" icone={Banknote} compacto />
      </GradeDeCartoes>

      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar (decisão 337). */}
      <div className="max-h-[max(12rem,calc(100dvh-27rem))] flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Abertura</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Situação</TableHead><TableHead>Técnico</TableHead><TableHead>Previsão</TableHead>
              <TableHead className="text-right">Horímetro</TableHead><TableHead>Ações realizadas</TableHead><TableHead className="text-right">Custo</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={10} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhuma ordem de serviço registrada."}</TableCell></TableRow>}
            {linhas.map((m) => {
              const st = statusDaOsEq(m);
              const aberta = st === "Pendente" || st === "Em andamento";
              const atrasada = aberta && !!m.dataPrevista && m.dataPrevista < hojeIso;
              return (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap">{formatarData(m.abertaEm ?? m.data)}</TableCell>
                <TableCell>{rotulos.get(m.equipamentoId)}</TableCell>
                <TableCell className="whitespace-nowrap">{m.tipo}</TableCell>
                <TableCell><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${COR_STATUS[st].selo}`}><span aria-hidden className={`size-1.5 rounded-full ${COR_STATUS[st].ponto}`} />{st}</span></TableCell>
                <TableCell>{m.responsavel || "—"}</TableCell>
                <TableCell className={`whitespace-nowrap ${atrasada ? "font-medium text-destructive" : ""}`}>{m.dataPrevista ? formatarData(m.dataPrevista) : "—"}{atrasada && <span className="block text-xs">Atrasada</span>}</TableCell>
                <TableCell className="whitespace-nowrap text-right">{st === "Concluída" ? `${numero(m.horimetro)} h` : "—"}</TableCell>
                <TableCell className="max-w-sm text-xs">{m.acoes.length === 0 && st !== "Concluída" ? <span className="text-muted-foreground">A definir ao concluir</span> : m.acoes.map((a) => (a.subitens.length ? `${a.nome} (${a.subitens.join(", ")})` : a.nome)).join("; ")}{m.observacao && <span className="block text-muted-foreground">{m.observacao}</span>}<span className="block text-muted-foreground">{m.localNome || "Empresa"}{m.horasParada ? ` · parado ${numero(m.horasParada)} h` : ""}</span></TableCell>
                <TableCell className="whitespace-nowrap text-right">{st === "Concluída" ? reais(custoDaManutencaoEq(m)) : "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  {aberta && <Button requiresWrite variant="outline" size="sm" aria-label="Atualizar ordem de serviço" onClick={() => setEditando(m)}>Atualizar</Button>}
                  {canDelete && <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir manutenção" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Excluir esta manutenção?")) executar(() => removerManutencaoEq(m.id), "Manutenção excluída"); }}>Excluir</Button>}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <NovaManutencao aberto={aberto} aoMudar={setAberto} equipamentos={equipamentos} />
      {editando && <NovaManutencao key={editando.id} aberto aoMudar={(v) => !v && setEditando(null)} equipamentos={equipamentos} equipamentoInicial={editando.equipamentoId} ordem={editando} />}
    </div>
  );
}

// Abre uma ordem de serviço nova ou, com `ordem`, atualiza uma em aberto (dados, situação, ações e custos até concluir).
export function NovaManutencao({ aberto, aoMudar, equipamentos, equipamentoInicial = "", ordem }: { aberto: boolean; aoMudar: (v: boolean) => void; equipamentos: { id: string; patrimonio: string; nome: string }[]; equipamentoInicial?: string; ordem?: ManutencaoEquipamentoRegistro }) {
  const acoesDisponiveis = lerManutencaoEquipamento().acoes;
  const [equipamentoId, setEquipamentoId] = useState(equipamentoInicial);
  const [tipo, setTipo] = useState<string>(ordem?.tipo ?? "Preventiva");
  const [local, setLocal] = useState<string>(ordem?.local ?? "empresa");
  const [status, setStatus] = useState<string>(ordem ? statusDaOsEq(ordem) : "Pendente");
  const [escolhidas, setEscolhidas] = useState<Record<string, string[]>>(() => Object.fromEntries((ordem?.acoes ?? []).map((a) => [a.acaoId, a.subitens])));
  const etapaAtual = ordem ? STATUS_OS_EQ.indexOf(statusDaOsEq(ordem)) : 0;
  const situacoes = STATUS_OS_EQ.filter((st, i) => st === "Cancelada" || i >= etapaAtual);
  const concluindo = status === "Concluída";
  const sugestao = equipamentoId ? ultimoHorimetro(equipamentoId) : null;
  // Fechar (cancelar ou salvar) limpa o que foi escolhido: o formulário reabre em branco, ações e equipamento incluídos.
  function fechar(v: boolean) {
    if (!v) { setEquipamentoId(equipamentoInicial); setTipo(ordem?.tipo ?? "Preventiva"); setLocal(ordem?.local ?? "empresa"); setStatus(ordem ? statusDaOsEq(ordem) : "Pendente"); setEscolhidas(Object.fromEntries((ordem?.acoes ?? []).map((a) => [a.acaoId, a.subitens]))); }
    aoMudar(v);
  }

  function alternarAcao(id: string, marcada: boolean) {
    setEscolhidas((atual) => { const novo = { ...atual }; if (marcada) novo[id] = novo[id] ?? []; else delete novo[id]; return novo; });
  }
  function alternarSubitem(id: string, nome: string, marcado: boolean) {
    setEscolhidas((atual) => ({ ...atual, [id]: marcado ? [...(atual[id] ?? []), nome] : (atual[id] ?? []).filter((n) => n !== nome) }));
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ordem ? "Atualizar ordem de serviço" : "Nova ordem de serviço de manutenção"}</DialogTitle>
          <DialogDescription>Informe o técnico responsável e a previsão. Para concluir, marque as ações realizadas (e, se quiser, os subitens), o horímetro e os custos.</DialogDescription>
        </DialogHeader>
        <form
          key={String(aberto)}
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            const acoes: AcaoRealizada[] = acoesDisponiveis.filter((a) => a.id in escolhidas).map((a) => ({ acaoId: a.id, nome: a.nome, subitens: escolhidas[a.id] ?? [] }));
            const entrada = {
              equipamentoId, tipo, status, data: String(f.get("data")), dataPrevista: String(f.get("dataPrevista") ?? ""), responsavel: String(f.get("responsavel") ?? ""), dataConclusao: String(f.get("dataConclusao") ?? ""),
              horimetro: String(f.get("horimetro") ?? ""), acoes, local, localNome: String(f.get("localNome") ?? ""),
              custoPecas: String(f.get("custoPecas") ?? ""), custoMaoDeObra: String(f.get("custoMaoDeObra") ?? ""), observacao: String(f.get("observacao") ?? ""), horasParada: String(f.get("horasParada") ?? ""),
            };
            const ok = executar(() => (ordem ? atualizarManutencaoEq(ordem.id, entrada) : registrarManutencaoEq(entrada)), ordem ? "Ordem de serviço atualizada" : "Ordem de serviço aberta");
            if (ok) fechar(false);
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="eq_manut">Equipamento</Label>
            <Select value={equipamentoId} onValueChange={setEquipamentoId}>
              <SelectTrigger id="eq_manut"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
              <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id}>{rotuloDoEquipamento(e)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo_manut">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo_manut"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Preventiva">Preventiva</SelectItem><SelectItem value="Corretiva">Corretiva</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="data">Data de abertura</Label><Input id="data" name="data" type="date" max={hoje()} defaultValue={ordem?.data ?? hoje()} required /></div>
          {concluindo && <div className="space-y-1.5"><Label htmlFor="dataConclusao">Data de conclusão</Label><Input id="dataConclusao" name="dataConclusao" type="date" max={hoje()} defaultValue={hoje()} required /></div>}
          <div className="space-y-1.5"><Label htmlFor="dataPrevista">Previsão de conclusão</Label><Input id="dataPrevista" name="dataPrevista" type="date" defaultValue={ordem?.dataPrevista ?? ""} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="status_manut">Situação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status_manut"><SelectValue /></SelectTrigger>
              <SelectContent>{situacoes.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="responsavel">Técnico responsável</Label><Input id="responsavel" name="responsavel" capitalizar="nome" defaultValue={ordem?.responsavel ?? ""} required={status === "Pendente" || status === "Em andamento"} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="horimetro">Horímetro (h){concluindo ? "" : " — pedido ao concluir"}</Label>
            <Input id="horimetro" name="horimetro" inputMode="decimal" key={`${equipamentoId}-${concluindo}`} defaultValue={concluindo ? horimetroEmTexto(sugestao) : ""} required={concluindo} />
            {sugestao !== null && <p className="text-xs text-muted-foreground">Último horímetro registrado: {numero(sugestao)} h.</p>}
          </div>
          <fieldset className="space-y-2 rounded-md border p-3 sm:col-span-2">
            <legend className="px-1 text-sm font-medium">Ações realizadas{concluindo ? "" : " (obrigatórias ao concluir)"}</legend>
            {acoesDisponiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma ação cadastrada. Cadastre em Parâmetros &gt; Equipamentos &gt; Manutenção.</p>}
            {acoesDisponiveis.map((a) => (
              <div key={a.id} className="space-y-1">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={a.id in escolhidas} onCheckedChange={(v) => alternarAcao(a.id, v === true)} aria-label={a.nome} />{a.nome}</label>
                {a.id in escolhidas && a.subitens.length > 0 && (
                  <div className="ml-6 grid gap-1 sm:grid-cols-2">
                    {a.subitens.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-xs"><Checkbox checked={(escolhidas[a.id] ?? []).includes(s.nome)} onCheckedChange={(v) => alternarSubitem(a.id, s.nome, v === true)} aria-label={`${a.nome}: ${s.nome}`} />{s.nome}</label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="local_manut">Onde foi feita</Label>
            <Select value={local} onValueChange={setLocal}>
              <SelectTrigger id="local_manut"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="empresa">Na empresa</SelectItem><SelectItem value="terceiro">Em terceiro</SelectItem></SelectContent>
            </Select>
          </div>
          {local === "terceiro" && <div className="space-y-1.5"><Label htmlFor="localNome">Nome do terceiro</Label><Input id="localNome" name="localNome" capitalizar="texto" defaultValue={ordem?.local === "terceiro" ? ordem.localNome : ""} /></div>}
          <div className="space-y-1.5"><Label htmlFor="custoPecas">Custo das peças (R$)</Label><Input id="custoPecas" name="custoPecas" inputMode="decimal" placeholder="0,00" defaultValue={ordem?.custoPecas ? String(ordem.custoPecas).replace(".", ",") : ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="custoMaoDeObra">Custo da mão de obra (R$)</Label><Input id="custoMaoDeObra" name="custoMaoDeObra" inputMode="decimal" placeholder="0,00" defaultValue={ordem?.custoMaoDeObra ? String(ordem.custoMaoDeObra).replace(".", ",") : ""} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="horasParada">Tempo parado por causa da manutenção (horas)</Label><Input id="horasParada" name="horasParada" inputMode="decimal" placeholder="0" defaultValue={ordem?.horasParada ? String(ordem.horasParada).replace(".", ",") : ""} /><p className="text-xs text-muted-foreground">Alimenta a disponibilidade do equipamento nos Indicadores.</p></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacao">Observação</Label><Textarea id="observacao" name="observacao" capitalizar="texto" rows={2} defaultValue={ordem?.observacao ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
