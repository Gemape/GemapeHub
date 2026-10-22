import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TODAS } from "@/lib/empresa-context";
import {
  cadastrarPadraoManutencao, checklistsDaAssociacao, FINALIDADES, gruposAplicaveis, lerChecklistEquipamento, NAO_DEFINIDO, PERIODICIDADES, NAO_DEFINIDA,
  removerAssociacao, removerGrupoChecklist, salvarAssociacao, salvarGrupoChecklist, TODOS_OS_TIPOS,
  type AssociacaoChecklistEquipamento, type FinalidadeChecklist, type GrupoChecklistEquipamento, type TipoAssociacao,
} from "@/lib/equipamentos-checklist";
import { listarEquipamentos, type Equipamento } from "@/lib/equipamentos-demo";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";
import { useEmpregados } from "@/lib/hooks-gemape";

// Parâmetros > Equipamentos > Check list (manutenção ou vistoria): no alto os grupos de itens, por tipo de equipamento; embaixo a
// associação deles a cada equipamento. Segue Parâmetros > Veículos > Check list. Só modo demonstração (navegador).
const SEM_RESPONSAVEL = "__nao-definido__";
const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const erroDe = (e: unknown, padrao: string) => (e instanceof Error ? e.message : padrao);

function ListaGrupos({ finalidade, nomeFinalidade, versao, aoMudar }: { finalidade: FinalidadeChecklist; nomeFinalidade: string; versao: number; aoMudar: () => void }) {
  void versao;
  const grupos = lerChecklistEquipamento()[finalidade].grupos;
  const tipos = lerParametrosEquipamento().tipos;
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<GrupoChecklistEquipamento | null>(null);
  const [modelo, setModelo] = useState<GrupoChecklistEquipamento | null>(null);
  const [nome, setNome] = useState("");
  const [itens, setItens] = useState("");
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const trava = useRef(false);

  function abrir(g: GrupoChecklistEquipamento | null, clonar: boolean) {
    setEditando(clonar ? null : g);
    setModelo(clonar ? g : null);
    setNome(g?.nome ?? "");
    setItens(g ? g.itens.map((i) => i.nome).join("\n") : "");
    setEscolhidos((g?.tipos ?? []).filter((t) => t === TODOS_OS_TIPOS || tipos.some((x) => x.id === t)));
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    try {
      salvarGrupoChecklist(finalidade, { ...(editando ? { id: editando.id } : {}), nome, itens: itens.split("\n"), tipos: escolhidos }, undefined, tipos.map((t) => t.id));
    } catch (erro) {
      toast.error(erroDe(erro, "Não foi possível salvar o grupo."));
      return;
    }
    trava.current = true;
    setAberto(false);
    toast.success("Grupo salvo");
    aoMudar();
    setTimeout(() => { trava.current = false; }, 400);
  }

  function padrao() {
    try {
      const { criados } = cadastrarPadraoManutencao();
      toast.success(criados === 0 ? "As ações de manutenção padrão já estão cadastradas." : `${criados} ações de manutenção padrão cadastradas.`);
      aoMudar();
    } catch (erro) {
      toast.error(erroDe(erro, "Não foi possível cadastrar o padrão."));
    }
  }

  function excluir(g: GrupoChecklistEquipamento) {
    if (!confirm(`Excluir o grupo ${g.nome}?`)) return;
    try {
      removerGrupoChecklist(finalidade, g.id);
    } catch (erro) {
      toast.error(erroDe(erro, "Não foi possível excluir o grupo."));
      return;
    }
    toast.success("Grupo excluído");
    aoMudar();
  }

  const nomesDosTipos = (g: GrupoChecklistEquipamento) =>
    g.tipos.includes(TODOS_OS_TIPOS)
      ? "Todos os tipos"
      : g.tipos.map((t) => tipos.find((x) => x.id === t)?.nome).filter(Boolean).join(", ") || "Nenhum (não aparece em check list)";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Itens check list</h2>
          <p className="mt-1 text-sm text-muted-foreground">Os grupos de itens do check list de {nomeFinalidade.toLowerCase()}, cada um para os tipos de equipamento a que se aplica.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {finalidade === "manutencao" && <Button requiresWrite variant="outline" onClick={padrao}>Cadastrar padrão</Button>}
          <Button requiresWrite onClick={() => abrir(null, false)}>Cadastrar grupo do check list</Button>
        </div>
      </header>
      <section className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Itens</th>
              <th className="px-3 py-2">Tipo de equipamento</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grupos.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">Nada cadastrado ainda. Use “Cadastrar grupo do check list”.</td></tr>}
            {grupos.map((g) => (
              <tr key={g.id}>
                <td className="px-3 py-2 font-medium">{g.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">{g.itens.map((i) => i.nome).join(" · ")}</td>
                <td className="px-3 py-2 text-muted-foreground">{nomesDosTipos(g)}</td>
                <td className="px-3 py-2"><AcoesLinha rotulo={g.nome} onClonar={() => abrir(g, true)} onEditar={() => abrir(g, false)} onExcluir={() => excluir(g)} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar grupo do check list" : modelo ? "Clonar grupo do check list" : "Cadastrar grupo do check list"}</DialogTitle>
            <DialogDescription>{modelo ? `Cópia de ${modelo.nome}: informe um nome novo.` : "O nome não pode repetir neste check list."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="grupo-equip-nome">Nome</Label>
              <Input id="grupo-equip-nome" capitalizar="texto" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="grupo-equip-itens">Itens do check list (um por linha)</Label>
              <Textarea id="grupo-equip-itens" rows={8} maxLength={5000} value={itens} onChange={(e) => setItens(e.target.value)} />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Tipo de equipamento</legend>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={escolhidos.includes(TODOS_OS_TIPOS)} onCheckedChange={(v) => setEscolhidos(v === true ? [TODOS_OS_TIPOS] : [])} />
                Todos os tipos de equipamento
              </label>
              {!escolhidos.includes(TODOS_OS_TIPOS) && (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {tipos.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={escolhidos.includes(t.id)} onCheckedChange={(v) => setEscolhidos((atuais) => (v === true ? [...atuais, t.id] : atuais.filter((x) => x !== t.id)))} />
                      {t.nome}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Os tipos vêm de Parâmetros Específicos. O check list do equipamento traz os grupos do tipo dele e os de todos os tipos.</p>
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={!nome.trim()}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type EscolhaGrupo = { marcado: boolean; tipo: TipoAssociacao; periodicidade: string };

function AssociarEquipamento({ finalidade, versao, aoMudar }: { finalidade: FinalidadeChecklist; versao: number; aoMudar: () => void }) {
  void versao;
  const { grupos, associacoes } = lerChecklistEquipamento()[finalidade];
  const equipamentos = listarEquipamentos();
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [equipamentoId, setEquipamentoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [escolhas, setEscolhas] = useState<Record<string, EscolhaGrupo>>({});
  const trava = useRef(false);

  const porId = (id: string): Equipamento | undefined => equipamentos.find((e) => e.id === id);
  const rotulo = (e: Equipamento) => `${e.patrimonio} · ${e.nome}`;
  const livres = equipamentos.filter((e) => e.tipoId && (!associacoes.some((a) => a.equipamentoId === e.id) || e.id === editando));
  const escolhido = porId(equipamentoId);
  const aplicaveis = escolhido ? gruposAplicaveis(escolhido.tipoId, grupos) : [];
  const escolhaDe = (id: string): EscolhaGrupo => escolhas[id] ?? { marcado: false, tipo: "periodico", periodicidade: "" };
  const mudar = (id: string, parcial: Partial<EscolhaGrupo>) => setEscolhas((atuais) => ({ ...atuais, [id]: { ...escolhaDe(id), ...parcial } }));

  function abrir(a: AssociacaoChecklistEquipamento | null) {
    setEditando(a?.equipamentoId ?? null);
    setEquipamentoId(a?.equipamentoId ?? "");
    setResponsavelId(a ? (a.responsavel?.id ?? SEM_RESPONSAVEL) : "");
    setEscolhas(Object.fromEntries((a?.itens ?? []).map((i) => [i.grupoId, { marcado: true, tipo: i.tipo, periodicidade: i.tipo === "periodico" ? i.periodicidade : "" }])));
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current || !escolhido) {
      if (!escolhido) toast.error("Selecione o equipamento.");
      return;
    }
    if (!responsavelId) {
      toast.error("Escolha o responsável ou marque Não definido.");
      return;
    }
    const emp = empregados.find((x) => x.id === responsavelId);
    const atual = associacoes.find((a) => a.equipamentoId === editando)?.responsavel;
    const responsavel = responsavelId === SEM_RESPONSAVEL ? null : emp ? { id: emp.id, nome: emp.nome } : atual && atual.id === responsavelId ? atual : null;
    try {
      salvarAssociacao(finalidade, {
        modo: editando ? "editar" : "criar",
        equipamentoId: escolhido.id,
        tipoId: escolhido.tipoId,
        responsavel,
        itens: aplicaveis.filter((g) => escolhaDe(g.id).marcado).map((g) => ({ grupoId: g.id, tipo: escolhaDe(g.id).tipo, periodicidade: escolhaDe(g.id).periodicidade })),
      });
    } catch (erro) {
      toast.error(erroDe(erro, "Não foi possível salvar a associação."));
      return;
    }
    trava.current = true;
    setAberto(false);
    toast.success("Itens de check list associados ao equipamento.");
    aoMudar();
    setTimeout(() => { trava.current = false; }, 400);
  }

  function excluir(a: AssociacaoChecklistEquipamento) {
    const e = porId(a.equipamentoId);
    if (!confirm(`Excluir os itens de check list associados a ${e ? rotulo(e) : "equipamento removido"}?`)) return;
    try {
      removerAssociacao(finalidade, a.equipamentoId);
    } catch (erro) {
      toast.error(erroDe(erro, "Não foi possível excluir a associação."));
      return;
    }
    toast.success("Associação excluída");
    aoMudar();
  }

  const atualResponsavel = associacoes.find((a) => a.equipamentoId === editando)?.responsavel;
  const opcoes = empregados.map((x) => ({ id: x.id, rotulo: x.matricula ? `${x.nome} · ${x.matricula}` : x.nome }));
  if (atualResponsavel && !opcoes.some((o) => o.id === atualResponsavel.id)) opcoes.push({ id: atualResponsavel.id, rotulo: `${atualResponsavel.nome} (atual)` });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Associar itens de check list a um equipamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">Para cada equipamento, escolha o responsável e, por grupo, se é periódico (obrigatório, entra nos KPI) ou avulso (não obrigatório).</p>
        </div>
        <Button requiresWrite onClick={() => abrir(null)}>Associar itens</Button>
      </header>
      <section className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Check list (Patrimônio &gt;&gt; Periodicidade &gt;&gt; Responsável)</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Obrigatório</th>
              <th className="px-3 py-2">Grupos</th>
              <th className="px-3 py-2">Atualizado em</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {associacoes.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground">Nenhum equipamento com itens de check list associados ainda.</td></tr>}
            {associacoes.map((a) => {
              const e = porId(a.equipamentoId);
              const listas = checklistsDaAssociacao(e?.patrimonio ?? "Equipamento removido", a, grupos);
              return (
                <Fragment key={a.equipamentoId}>
                  <tr className="bg-muted/50">
                    <td colSpan={4} className="px-3 py-2 font-semibold">{e ? rotulo(e) : "Equipamento removido"} <span className="font-normal text-muted-foreground">· responsável: {a.responsavel?.nome ?? NAO_DEFINIDO}</span></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{dataBr(a.atualizadoEm)}</td>
                    <td className="px-3 py-2"><AcoesLinha rotulo={e ? rotulo(e) : "equipamento"} onEditar={() => abrir(a)} onExcluir={() => excluir(a)} /></td>
                  </tr>
                  {listas.length === 0 && <tr><td colSpan={6} className="px-3 py-2 text-muted-foreground">Nenhum grupo habilitado existente.</td></tr>}
                  {listas.map((c) => (
                    <tr key={c.periodicidade}>
                      <td className="px-3 py-2 pl-6 font-medium">{c.nome}</td>
                      <td className="px-3 py-2">
                        {c.tipo === "Livre" ? "Avulso" : c.tipo}
                        {c.tipo === "Livre" && <span className="block text-xs text-muted-foreground">livre: qualquer hora, qualquer pessoa</span>}
                      </td>
                      <td className="px-3 py-2">{c.obrigatorio}</td>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={3}>{c.grupos.map((g) => g.nome).join("; ")}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar itens de check list do equipamento" : "Associar itens de check list a um equipamento"}</DialogTitle>
            <DialogDescription>Escolha o equipamento e o responsável, marque os grupos e diga se cada um é periódico ou avulso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assoc-equipamento">Equipamento</Label>
                <Select value={equipamentoId} disabled={!!editando} onValueChange={(v) => { if (v) { setEquipamentoId(v); setEscolhas({}); } }}>
                  <SelectTrigger id="assoc-equipamento"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                  <SelectContent>{livres.map((e) => <SelectItem key={e.id} value={e.id}>{rotulo(e)}</SelectItem>)}</SelectContent>
                </Select>
                {livres.length === 0 && <p className="text-xs text-muted-foreground">Todos os equipamentos já têm itens associados, ou nenhum equipamento com tipo está cadastrado.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-equip-responsavel">Responsável</Label>
                <Select value={responsavelId} onValueChange={(v) => v && setResponsavelId(v)}>
                  <SelectTrigger id="assoc-equip-responsavel"><SelectValue placeholder="Selecione o responsável ou Não definido" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_RESPONSAVEL}>{NAO_DEFINIDO}</SelectItem>
                    {opcoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <fieldset className="space-y-2" data-testid="associar-itens">
              <legend className="text-sm font-medium">Grupos de itens</legend>
              {!escolhido ? (
                <p className="text-sm text-muted-foreground">Escolha o equipamento para ver os grupos.</p>
              ) : aplicaveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum grupo serve ao tipo deste equipamento. Cadastre em Itens check list.</p>
              ) : (
                <ul className="grid max-h-80 gap-2 overflow-y-auto">
                  {aplicaveis.map((g) => {
                    const c = escolhaDe(g.id);
                    return (
                      <li key={g.id} className="rounded-md border p-2">
                        <label className="flex cursor-pointer items-start gap-2 text-sm">
                          <Checkbox className="mt-0.5" checked={c.marcado} onCheckedChange={(v) => mudar(g.id, { marcado: v === true })} aria-label={g.nome} />
                          <span>
                            <span className="font-medium">{g.nome}</span>
                            <span className="block text-xs text-muted-foreground">{g.itens.map((i) => i.nome).join(" · ")}</span>
                          </span>
                        </label>
                        {c.marcado && (
                          <div className="mt-2 grid gap-2 pl-6 sm:grid-cols-2">
                            <Select value={c.tipo} onValueChange={(v) => v && mudar(g.id, { tipo: v as TipoAssociacao })}>
                              <SelectTrigger aria-label={`Tipo de ${g.nome}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="periodico">Periódico</SelectItem>
                                <SelectItem value="avulso">Avulso</SelectItem>
                              </SelectContent>
                            </Select>
                            {c.tipo === "periodico" ? (
                              <Select value={c.periodicidade} onValueChange={(v) => v && mudar(g.id, { periodicidade: v })}>
                                <SelectTrigger aria-label={`Periodicidade de ${g.nome}`}><SelectValue placeholder="Periodicidade" /></SelectTrigger>
                                <SelectContent>{PERIODICIDADES.filter((p) => p !== NAO_DEFINIDA).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <p className="self-center text-xs text-muted-foreground">Avulso: não obrigatório, sem periodicidade.</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ChecklistEquipamento({ finalidade, aoEscolher }: { finalidade: FinalidadeChecklist | null; aoEscolher: (f: FinalidadeChecklist) => void }) {
  const [versao, setVersao] = useState(0);
  const aoMudar = () => setVersao((v) => v + 1);
  const atual = FINALIDADES.find((f) => f.id === finalidade);

  if (!atual) {
    return (
      <div className="space-y-5">
        <header>
          <p className="text-eyebrow">Parâmetros &gt; Equipamentos</p>
          <h1 className="text-2xl font-bold">Check list</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o check list: manutenção ou vistoria. Cada um tem os seus itens e as suas associações aos equipamentos.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {FINALIDADES.map((f) => (
            <button key={f.id} type="button" onClick={() => aoEscolher(f.id)} className="panel p-5 text-left transition-colors hover:bg-accent">
              <span className="text-lg font-semibold">Check list de {f.nome.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-eyebrow">Parâmetros &gt; Equipamentos &gt; Check list</p>
        <h1 className="text-2xl font-bold">Check list de {atual.nome.toLowerCase()}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Primeiro os itens do check list, por tipo de equipamento; depois a associação deles a cada equipamento.</p>
        <div className="mt-3 flex gap-2">
          {FINALIDADES.map((f) => (
            <Button key={f.id} type="button" size="sm" variant={f.id === atual.id ? "default" : "outline"} onClick={() => aoEscolher(f.id)}>{f.nome}</Button>
          ))}
        </div>
      </header>
      <ListaGrupos key={`g-${atual.id}`} finalidade={atual.id} nomeFinalidade={atual.nome} versao={versao} aoMudar={aoMudar} />
      <AssociarEquipamento key={`a-${atual.id}`} finalidade={atual.id} versao={versao} aoMudar={aoMudar} />
    </div>
  );
}
