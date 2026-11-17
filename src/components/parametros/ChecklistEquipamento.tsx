import { useQueryClient } from "@tanstack/react-query";
import { confirmarExclusao } from "@/components/ConfirmarAcao";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { DialogCadastroEmpregados } from "@/components/modules/DialogCadastroEmpregados";
import { EditorItensChecklist } from "@/components/parametros/EditorItensChecklist";
import { RestaurarPadraoInicial } from "@/components/parametros/VeiculosListasParametros";
import { EquipamentoDialog } from "@/components/parametros/EquipamentoDialog";
import { useAccess } from "@/lib/access-context";
import { empregadoElegivelPortador } from "@/lib/portadores-caixa";
import { TODAS } from "@/lib/empresa-context";
import {
  aplicarPadraoUmaVez, checklistsDaAssociacao, type EntradaItemAssociacao, FINALIDADES, gruposAplicaveis, lerChecklistEquipamento, NAO_DEFINIDO, PERIODICIDADES, NAO_DEFINIDA,
  removerAssociacao, removerGrupoChecklist, restaurarPadroesChecklist, salvarAssociacao, situacaoPadraoChecklist, salvarGrupoChecklist, TODOS_OS_TIPOS,
  type AssociacaoChecklistEquipamento, type FinalidadeChecklist, type GrupoChecklistEquipamento,
} from "@/lib/equipamentos-checklist";
import { listarEquipamentos, type Equipamento } from "@/lib/equipamentos-demo";
import { GRUPOS_PADRAO_MANUTENCAO } from "@/lib/equipamentos-manutencao-padrao";
import { GRUPOS_PADRAO_VISTORIA } from "@/lib/equipamentos-vistoria-padrao";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";
import { useEmpregados } from "@/lib/hooks-gemape";
import { ehGrupoPersonalizado, ehPersonalizadoDe, nomeGrupoPersonalizado } from "@/lib/grupo-personalizado";
import { useVersaoArmazenamento } from "@/lib/use-versao-armazenamento";

// Parâmetros > Equipamentos > Check list (manutenção ou vistoria): no alto os grupos de itens, por tipo de equipamento; embaixo a
// associação deles a cada equipamento. Segue Parâmetros > Veículos > Check list. Só modo demonstração (navegador).
const SEM_RESPONSAVEL = "__nao-definido__";
const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const erroDe = (e: unknown, padrao: string) => (e instanceof Error ? e.message : padrao);

export function ListaGrupos({ finalidade, nomeFinalidade, versao, aoMudar }: { finalidade: FinalidadeChecklist; nomeFinalidade: string; versao: number; aoMudar: () => void }) {
  // Lido de novo só quando algo muda (versao), não a cada tecla digitada nas janelas.
  const grupos = useMemo(() => lerChecklistEquipamento()[finalidade].grupos, [finalidade, versao]);
  const tipos = useMemo(() => lerParametrosEquipamento().tipos, [versao]);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<GrupoChecklistEquipamento | null>(null);
  const [modelo, setModelo] = useState<GrupoChecklistEquipamento | null>(null);
  const [nome, setNome] = useState("");
  const [itens, setItens] = useState("");
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const trava = useRef(false);
  // Itens do padrão do check list (manutenção ou vistoria) dos tipos escolhidos; sem tipo escolhido, ou com Todos os tipos, vêm todos.
  const catalogo = (finalidade === "vistoria" ? GRUPOS_PADRAO_VISTORIA : GRUPOS_PADRAO_MANUTENCAO)
    .filter((p) => escolhidos.length === 0 || escolhidos.includes(TODOS_OS_TIPOS) || escolhidos.includes(p.tipoId))
    .map((p) => ({ titulo: p.nome, itens: p.itens }));

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
      salvarGrupoChecklist(finalidade, { ...(editando ? { id: editando.id } : {}), nome, itens: itens.split("\n"), tipos: escolhidos }, undefined, tipos.map((t) => t.id), (id) => listarEquipamentos().find((e) => e.id === id)?.tipoId);
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

  async function excluir(g: GrupoChecklistEquipamento) {
    if (!(await confirmarExclusao(`o grupo ${g.nome}`))) return;
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
      <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <h2 className="text-xl font-bold">Itens check list</h2>
          <p className="mt-1 text-sm text-muted-foreground">Os grupos de itens do check list de {nomeFinalidade.toLowerCase()}, cada um para os tipos de equipamento a que se aplica.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RestaurarPadraoInicial
            singular="grupo"
            plural="grupos"
            perdas="(nome, itens e tipo de equipamento) "
            semTipoTexto="sem o tipo de equipamento em Parâmetros Específicos: o tipo foi mantido como estava, escolha em Editar."
            situacoes={() => situacaoPadraoChecklist(finalidade)}
            restaurar={(nomes) => { const r = restaurarPadroesChecklist(finalidade, nomes); aoMudar(); return r; }}
          />
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
              <Label htmlFor="grupo-equip-itens">Itens do check list</Label>
              <EditorItensChecklist id="grupo-equip-itens" value={itens} onChange={setItens} catalogo={catalogo} />
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

// Como em Veículos (decisão 137): um campo de periodicidade só define o check list do equipamento; periódico (Diária, Semanal, Quinzenal ou Mensal,
// obrigatório e entra nos KPI) ou Avulso (não obrigatório). Os itens são escolhidos um a um dentro dos grupos que valem para o tipo do equipamento.
const AVULSO = "Avulso";
const PERIODICIDADES_CAMPO = [...PERIODICIDADES.filter((p) => p !== NAO_DEFINIDA), AVULSO] as const;

// `abrirDireto`: abre o formulário de associação já ao montar, com o equipamento escolhido (a janela aberta de dentro do Novo check list); se ele já tem
// associação, abre a edição dela.
export function AssociarEquipamento({ finalidade, versao, aoMudar, abrirDireto }: { finalidade: FinalidadeChecklist; versao: number; aoMudar: () => void; abrirDireto?: { equipamentoId: string } | undefined }) {
  const { grupos, associacoes } = useMemo(() => lerChecklistEquipamento()[finalidade], [finalidade, versao]);
  const equipamentos = useMemo(() => listarEquipamentos(), [versao]);
  const { data: empregados = [] } = useEmpregados(TODAS, true);
  const queryClient = useQueryClient();
  const { canWrite } = useAccess();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  // equipamento da associação que está sendo clonada: aparece preenchido, mas o clone precisa de outro equipamento (como em Veículos).
  const [clonandoDe, setClonandoDe] = useState<string | null>(null);
  const clonando = clonandoDe !== null;
  const [equipamentoId, setEquipamentoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [periodicidade, setPeriodicidade] = useState("");
  // Itens escolhidos, um a um, dentro dos grupos que valem para o equipamento; null = ainda não mexeu, vale todos os itens dos grupos que se aplicam.
  const [escolhidos, setEscolhidos] = useState<string[] | null>(null);
  const [travado, setTravado] = useState(false);
  const trava = useRef(false);
  // Itens personalizados deste equipamento (um por linha): viram um grupo próprio ao salvar, além dos grupos marcados.
  // null = ainda não mexeu: o bloco mostra os itens do grupo personalizado já salvo do equipamento, se houver.
  const [personalizados, setPersonalizados] = useState<string | null>(null);
  // Telas de cadastro abertas ao lado da janela, nunca dentro, para não perder o que já foi escolhido (decisão 120).
  const [equipamentosAberto, setEquipamentosAberto] = useState(false);
  const [empregadosAberto, setEmpregadosAberto] = useState(false);
  const [itensAberto, setItensAberto] = useState(false);

  const porId = (id: string): Equipamento | undefined => equipamentos.find((e) => e.id === id);
  const rotulo = (e: Equipamento) => `${e.patrimonio} · ${e.nome}`;
  // Cada equipamento tem uma associação só: todos os cadastrados aparecem; os que já têm itens (menos o do original, ao editar) ficam desabilitados.
  const temItens = (id: string) => associacoes.some((a) => a.equipamentoId === id) && id !== editando;
  const livres = equipamentos.filter((e) => !temItens(e.id));
  const escolhido = porId(equipamentoId);
  const avulso = periodicidade === AVULSO;
  // Responsável: empregado ativo, da empresa do equipamento.
  const elegiveis = empregados.filter((x) => empregadoElegivelPortador({ ativo: x.ativo ?? null, data_demissao: x.data_demissao ?? null } as never) && (!escolhido?.empresaId || x.empresa_id === escolhido.empresaId));
  // Grupos personalizados não entram na lista comum: o de cada equipamento é cuidado no bloco "Personalizar itens".
  // Periódico traz os grupos do periódico; Avulso, só os grupos "Avulso · ..." (os itens simples), como em Veículos.
  const aplicaveis = escolhido ? gruposAplicaveis(escolhido.tipoId, grupos, avulso).filter((g) => !ehGrupoPersonalizado(g.nome)) : [];
  const personalizadoSalvo = escolhido ? grupos.find((g) => g.nome === nomeGrupoPersonalizado(escolhido.patrimonio, avulso)) : undefined;
  const valorPersonalizados = personalizados ?? personalizadoSalvo?.itens.map((i) => i.nome).join("\n") ?? "";
  const todosItensIds = aplicaveis.flatMap((g) => g.itens.map((i) => i.id));
  const marcados = escolhidos === null ? todosItensIds : escolhidos.filter((id) => todosItensIds.includes(id));
  const marcadosDoGrupo = (g: { itens: { id: string }[] }) => g.itens.filter((i) => marcados.includes(i.id)).map((i) => i.id);
  const alternarItem = (id: string, marcar: boolean) => setEscolhidos(marcar ? [...marcados.filter((m) => m !== id), id] : marcados.filter((m) => m !== id));
  // Marcar ou desmarcar o grupo marca ou desmarca todos os itens dele.
  const alternarGrupo = (g: { itens: { id: string }[] }, marcar: boolean) => {
    const ids = g.itens.map((i) => i.id);
    setEscolhidos(marcar ? [...marcados.filter((m) => !ids.includes(m)), ...ids] : marcados.filter((m) => !ids.includes(m)));
  };
  const catalogoPadrao = (finalidade === "vistoria" ? GRUPOS_PADRAO_VISTORIA : GRUPOS_PADRAO_MANUTENCAO).filter((p) => !escolhido || p.tipoId === escolhido.tipoId).map((p) => ({ titulo: p.nome, itens: p.itens }));

  const aoFecharEquipamentos = (a: boolean) => { setEquipamentosAberto(a); if (!a) aoMudar(); };
  const aoFecharEmpregados = (a: boolean) => { setEmpregadosAberto(a); if (!a) void queryClient.invalidateQueries({ queryKey: ["empregados"] }); };
  const linkCadastro = (texto: string, abrirTela: () => void) => (canWrite ? (
    <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={abrirTela}>{texto}</button>
  ) : null);

  // Trocar o equipamento mantém o responsável só se ele ainda pode responder por ele (ativo e da mesma empresa do novo equipamento).
  function trocarEquipamento(id: string) {
    const empresaNova = porId(id)?.empresaId;
    const continua = empregados.some((x) => x.id === responsavelId && (!empresaNova || x.empresa_id === empresaNova));
    setEquipamentoId(id);
    setEscolhidos(null);
    setPersonalizados(null);
    if (responsavelId !== SEM_RESPONSAVEL && !continua) setResponsavelId("");
  }

  function abrir(a: AssociacaoChecklistEquipamento | null, clonar = false) {
    if (a && !clonar && !porId(a.equipamentoId)) {
      toast.error("Este equipamento foi removido; exclua a associação.");
      return;
    }
    setClonandoDe(a && clonar ? a.equipamentoId : null);
    setEditando(a && !clonar ? a.equipamentoId : null);
    // Editar e Clonar abrem com tudo do original, inclusive o equipamento (o clone precisa de outro, como em Veículos).
    setEquipamentoId(a ? a.equipamentoId : "");
    setResponsavelId(a ? (a.responsavel?.id ?? SEM_RESPONSAVEL) : "");
    const doGrupo = (a?.itens ?? []).filter((i) => grupos.some((g) => g.id === i.grupoId));
    const escolhida = a ? (doGrupo.find((i) => i.tipo === "periodico")?.periodicidade ?? AVULSO) : "";
    setPeriodicidade(escolhida);
    // A janela guarda uma periodicidade só. Um check list antigo com mais de uma mostra só os itens da escolhida, e o aviso diz o que sai ao salvar.
    const daEscolhida = doGrupo.filter((i) => (escolhida === AVULSO ? i.tipo === "avulso" : i.tipo === "periodico" && i.periodicidade === escolhida));
    if (a && daEscolhida.length < doGrupo.length) toast.warning(`Este check list tinha mais de uma periodicidade. A janela mostra só ${escolhida}; ao salvar, os itens das outras periodicidades saem.`);
    setEscolhidos(a ? daEscolhida.flatMap((i) => i.itensIds ?? grupos.find((g) => g.id === i.grupoId)?.itens.map((x) => x.id) ?? []) : null);
    setPersonalizados(null);
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    if (!escolhido) return void toast.error("Selecione o equipamento.");
    if (clonandoDe && equipamentoId === clonandoDe) return void toast.error("Escolha outro equipamento para o clone: este já tem o check list original.");
    if (!responsavelId) return void toast.error("Escolha o responsável ou marque Não definido.");
    if (!periodicidade) return void toast.error("Escolha a periodicidade do check list ou Avulso.");
    const emp = empregados.find((x) => x.id === responsavelId);
    const atual = associacoes.find((a) => a.equipamentoId === (editando ?? clonandoDe))?.responsavel;
    const achado = emp ? { id: emp.id, nome: emp.nome } : atual && atual.id === responsavelId ? atual : null;
    // Responsável escolhido que não está mais na lista não vira "Não definido" sem aviso.
    if (responsavelId !== SEM_RESPONSAVEL && !achado) return void toast.error("Não encontrei o responsável escolhido; escolha de novo.");
    const responsavel = responsavelId === SEM_RESPONSAVEL ? null : achado;
    trava.current = true;
    setTravado(true);
    // Itens personalizados viram um grupo próprio ("Personalizado · PATRIMÔNIO", ou "Avulso · Personalizado · PATRIMÔNIO"), do tipo do equipamento,
    // associado junto com os marcados; se o equipamento já tem esse grupo, ele é atualizado, não duplicado.
    const proprios = valorPersonalizados.split("\n").map((t) => t.trim()).filter(Boolean);
    let novoGrupoId: string | null = null;
    let usadoId: string | null = null;
    let salvou = false;
    try {
      // Grupo com todos os itens marcados vale inteiro (os itens que entrarem nele depois também); com parte, guarda só os escolhidos.
      const itensAssoc: EntradaItemAssociacao[] = aplicaveis.filter((g) => marcadosDoGrupo(g).length > 0).map((g) => {
        const ids = marcadosDoGrupo(g);
        const escolha = ids.length === g.itens.length ? {} : { itensIds: ids };
        return avulso ? { grupoId: g.id, tipo: "avulso", periodicidade: "", ...escolha } : { grupoId: g.id, tipo: "periodico", periodicidade, ...escolha };
      });
      if (proprios.length > 0) {
        const grupo = salvarGrupoChecklist(finalidade, {
          ...(personalizadoSalvo ? { id: personalizadoSalvo.id } : {}),
          nome: personalizadoSalvo?.nome ?? nomeGrupoPersonalizado(escolhido.patrimonio, avulso),
          itens: proprios,
          tipos: personalizadoSalvo?.tipos ?? [escolhido.tipoId || TODOS_OS_TIPOS],
        });
        if (!personalizadoSalvo) novoGrupoId = grupo.id;
        usadoId = grupo.id;
        itensAssoc.push(avulso ? { grupoId: grupo.id, tipo: "avulso", periodicidade: "" } : { grupoId: grupo.id, tipo: "periodico", periodicidade });
      }
      salvarAssociacao(finalidade, { modo: editando && escolhido.id === editando ? "editar" : "criar", equipamentoId: escolhido.id, tipoId: escolhido.tipoId, responsavel, itens: itensAssoc });
      salvou = true;
      // Editar trocando de equipamento move a associação: a do equipamento antigo sai, com os itens personalizados dele.
      if (editando && escolhido.id !== editando) {
        try { removerAssociacao(finalidade, editando); } catch (erro) { removerAssociacao(finalidade, escolhido.id); salvou = false; throw erro; } // sem a antiga sair, a nova também não fica
        const antigo = porId(editando);
        if (antigo) for (const g of grupos) if (g.id !== usadoId && ehPersonalizadoDe(g.nome, antigo.patrimonio)) { try { removerGrupoChecklist(finalidade, g.id); } catch { /* sem o que fazer */ } }
      }
      // Grupos personalizados antigos deste equipamento (outro tipo de check list, ou sufixos de versões antigas) que ficaram sem uso saem.
      for (const g of grupos) {
        if (g.id !== usadoId && ehPersonalizadoDe(g.nome, escolhido.patrimonio)) { try { removerGrupoChecklist(finalidade, g.id); } catch { /* sem o que fazer */ } }
      }
    } catch (erro) {
      // A associação não saiu: o grupo personalizado recém-criado não fica sobrando.
      if (novoGrupoId && !salvou) { try { removerGrupoChecklist(finalidade, novoGrupoId); } catch { /* sem o que fazer */ } }
      toast.error(erroDe(erro, "Não foi possível salvar a associação."));
    }
    if (salvou) {
      setAberto(false);
      toast.success("Itens de check list associados ao equipamento.");
      aoMudar();
    }
    // Só solta a trava depois de o diálogo fechar ou de o erro aparecer.
    setTimeout(() => { trava.current = false; setTravado(false); }, 400);
  }

  async function excluir(a: AssociacaoChecklistEquipamento) {
    const e = porId(a.equipamentoId);
    if (!(await confirmarExclusao(`os itens de check list associados a ${e ? rotulo(e) : "equipamento removido"}`))) return;
    try {
      removerAssociacao(finalidade, a.equipamentoId);
    } catch (erro) {
      toast.error(erroDe(erro, "Não foi possível excluir a associação."));
      return;
    }
    toast.success("Associação excluída");
    aoMudar();
  }

  // O responsável salvo pode ser de alguém que deixou de ser elegível; continua aparecendo para não sumir do campo.
  const salvoNaEdicao = associacoes.find((a) => a.equipamentoId === (editando ?? clonandoDe))?.responsavel;
  const opcoes = salvoNaEdicao && !elegiveis.some((x) => x.id === salvoNaEdicao.id)
    ? [...elegiveis.map((x) => ({ id: x.id, rotulo: x.nome })), { id: salvoNaEdicao.id, rotulo: `${salvoNaEdicao.nome} (atual)` }]
    : elegiveis.map((x) => ({ id: x.id, rotulo: x.matricula ? `${x.nome} · ${x.matricula}` : x.nome }));

  useEffect(() => {
    if (!abrirDireto) return;
    const existente = associacoes.find((a) => a.equipamentoId === abrirDireto.equipamentoId);
    if (existente) abrir(existente);
    else if (abrirDireto.equipamentoId) { abrir(null); setEquipamentoId(abrirDireto.equipamentoId); }
    else abrir(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <h2 className="text-xl font-bold">Associar itens de check list a um equipamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">Para cada equipamento, escolha o responsável e a periodicidade do check list. Periódico é obrigatório e entra nos KPI; avulso não é obrigatório e não entra nos KPI.</p>
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
                    <td className="px-3 py-2"><AcoesLinha rotulo={e ? rotulo(e) : "equipamento"} onClonar={() => abrir(a, true)} onEditar={() => abrir(a)} onExcluir={() => excluir(a)} /></td>
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
                      <td className="px-3 py-2 text-muted-foreground" colSpan={3}>{c.grupos.map((g) => {
                        const total = grupos.find((x) => x.id === g.grupoId)?.itens.length;
                        return g.itensIds && total ? `${g.nome} (${g.itensIds.length} de ${total} itens)` : g.nome;
                      }).join("; ")}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar itens de check list do equipamento" : clonando ? "Clonar itens de check list do equipamento" : "Associar itens de check list a um equipamento"}</DialogTitle>
            <DialogDescription>Escolha o equipamento, o responsável e a periodicidade do check list (ou Avulso) e marque os itens que o compõem.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="assoc-equipamento">Equipamento</Label>
                <Select value={equipamentoId} onValueChange={(v) => { if (v) trocarEquipamento(v); }}>
                  <SelectTrigger id="assoc-equipamento"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                  <SelectContent>{equipamentos.map((e) => <SelectItem key={e.id} value={e.id} disabled={!livres.includes(e)}>{rotulo(e)}{livres.includes(e) ? "" : " · já tem itens associados"}</SelectItem>)}</SelectContent>
                </Select>
                {livres.length === 0 && <p className="text-xs text-muted-foreground">Todos os equipamentos já têm itens associados, ou nenhum equipamento está cadastrado.</p>}
                <p className="text-xs">{linkCadastro("Cadastrar equipamento", () => setEquipamentosAberto(true))}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-equip-responsavel">Responsável</Label>
                <Select key={`${equipamentoId}-${opcoes.length}`} value={responsavelId} onValueChange={(v) => v && setResponsavelId(v)}>
                  <SelectTrigger id="assoc-equip-responsavel"><SelectValue placeholder="Selecione o responsável ou Não definido" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_RESPONSAVEL}>{NAO_DEFINIDO}</SelectItem>
                    {opcoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>)}
                  </SelectContent>
                </Select>
                {opcoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhum empregado ativo encontrado para este equipamento. Cadastre em Parâmetros &gt; Empregados.</p>}
                <p className="text-xs">{linkCadastro("Cadastrar empregado", () => setEmpregadosAberto(true))}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-equip-periodicidade">Periodicidade</Label>
                <Select value={periodicidade} onValueChange={(v) => { setPeriodicidade(v); setEscolhidos(null); }}>
                  <SelectTrigger id="assoc-equip-periodicidade"><SelectValue placeholder="Selecione a periodicidade" /></SelectTrigger>
                  <SelectContent>{PERIODICIDADES_CAMPO.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Diária, semanal, quinzenal ou mensal: check list periódico, obrigatório (entra nos KPI). Avulso: não obrigatório (não entra nos KPI), para qualquer equipamento.</p>
              </div>
            </div>

            <fieldset className="space-y-2" data-testid="associar-itens">
              <legend className="text-sm font-medium">Itens que compõem o check list</legend>
              <p className="text-xs text-muted-foreground">Marque o grupo para trazer a lista de itens dele e escolha, item a item, os que compõem o check list. A periodicidade vale para todos os itens marcados.</p>
              <p className="text-xs">{linkCadastro("Cadastrar itens de check list", () => setItensAberto(true))}</p>
              {!escolhido ? (
                <p className="text-sm text-muted-foreground">Escolha o equipamento para ver os itens.</p>
              ) : aplicaveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum grupo de itens serve a este equipamento. Personalize os itens abaixo ou cadastre em Itens check list.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{marcados.length} de {todosItensIds.length} itens marcados</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEscolhidos(todosItensIds)}>Marcar todos</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEscolhidos([])}>Desmarcar todos</Button>
                    </div>
                  </div>
                  <ul className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
                    {aplicaveis.map((g) => {
                      const doGrupo = marcadosDoGrupo(g);
                      const estado = doGrupo.length === 0 ? false : doGrupo.length === g.itens.length ? true : "indeterminate";
                      return (
                        <li key={g.id} className="rounded-md border p-2">
                          <label htmlFor={`assoc-grupo-${g.id}`} className="flex cursor-pointer items-start gap-2 text-sm">
                            <Checkbox id={`assoc-grupo-${g.id}`} className="mt-0.5" checked={estado} onCheckedChange={(v) => alternarGrupo(g, v === true)} />
                            <span className="font-medium">{g.nome} <span className="font-normal text-muted-foreground">({doGrupo.length} de {g.itens.length})</span></span>
                          </label>
                          <ul className="mt-1.5 space-y-1 pl-6" aria-label={`Itens de ${g.nome}`}>
                            {g.itens.map((i) => (
                              <li key={i.id}>
                                <label htmlFor={`assoc-item-${i.id}`} className="flex cursor-pointer items-start gap-2 text-sm">
                                  <Checkbox id={`assoc-item-${i.id}`} className="mt-0.5" checked={marcados.includes(i.id)} onCheckedChange={(v) => alternarItem(i.id, v === true)} />
                                  <span>{i.nome}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {escolhido && (
                <div className="space-y-1.5 rounded-md border p-3" data-testid="itens-personalizados">
                  <h3 className="text-sm font-semibold">Personalizar itens deste equipamento</h3>
                  <p className="text-xs text-muted-foreground">Marque itens do padrão ou adicione itens próprios: eles formam o grupo “Personalizado · patrimônio”, que só entra neste equipamento, junto com os grupos marcados acima. Ao abrir de novo, os itens salvos voltam aqui.</p>
                  <EditorItensChecklist id="assoc-equip-personalizados" value={valorPersonalizados} onChange={setPersonalizados} catalogo={catalogoPadrao} />
                </div>
              )}
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={travado}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ao lado da janela da associação, nunca dentro dela (decisão 120). */}
      <EquipamentoDialog aberto={equipamentosAberto} onAberto={aoFecharEquipamentos} editando={null} modelo={null} onSalvo={aoMudar} />
      <DialogCadastroEmpregados aberto={empregadosAberto} onAbrirMudou={aoFecharEmpregados} />
      {/* Os grupos de itens numa janela ao lado: cadastra, fecha e a associação continua de onde parou. */}
      <Dialog open={itensAberto} onOpenChange={setItensAberto}>
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Itens check list</DialogTitle>
            <DialogDescription>Cadastra os grupos de itens do check list. Ao fechar, a associação continua de onde parou.</DialogDescription>
          </DialogHeader>
          {itensAberto && <ListaGrupos finalidade={finalidade} nomeFinalidade={FINALIDADES.find((f) => f.id === finalidade)?.nome ?? ""} versao={versao} aoMudar={aoMudar} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ChecklistEquipamento({ finalidade, aoEscolher }: { finalidade: FinalidadeChecklist | null; aoEscolher: (f: FinalidadeChecklist) => void }) {
  const [versao, aoMudar] = useVersaoArmazenamento();
  // Como em Veículos, os grupos de itens padrão já vêm cadastrados (uma vez só; o que for excluído depois não volta).
  useEffect(() => { if (aplicarPadraoUmaVez()) aoMudar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const atual = FINALIDADES.find((f) => f.id === finalidade);

  if (!atual) {
    return (
      <div className="space-y-5">
        <header>
          <EyebrowDoCard fallback="Parâmetros" />
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
        <EyebrowDoCard fallback="Parâmetros" />
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
