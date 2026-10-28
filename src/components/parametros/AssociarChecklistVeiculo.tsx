import { Table } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lerTodas } from "@/lib/ler-todas";
import { EditorItensChecklist } from "@/components/parametros/EditorItensChecklist";
import { CHECKLIST_VEICULOS_PADRAO } from "@/lib/checklist-veiculos-padrao";
import { adicionarGrupoChecklistVeiculo, editarGrupoChecklistVeiculo, removerGrupoChecklistVeiculo, TODOS_OS_TIPOS } from "@/lib/parametros-base";
import { ehGrupoPersonalizado, ehPersonalizadoDe, nomeGrupoPersonalizado } from "@/lib/grupo-personalizado";
import { DialogCadastroEmpregados } from "@/components/modules/DialogCadastroEmpregados";
import { DialogCadastroVeiculos } from "@/components/modules/DialogCadastroVeiculos";
import { DialogItensChecklist } from "@/components/modules/DialogItensChecklist";
import { useAccess } from "@/lib/access-context";
import { descricaoVeiculo } from "@/lib/descricao-veiculo";
import {
  checklistsDaAssociacao, criarAssociacao, editarAssociacao, EVENTO_ASSOCIACOES_CHECKLIST, gruposDaAssociacao, lerAssociacoes,
  NAO_DEFINIDO, removerAssociacao,
  type AssociacaoChecklist, type EntradaItemAssociacao, type PeriodicidadeAssociacao,
} from "@/lib/checklist-associacao-veiculo";
import { empregadoElegivelPortador } from "@/lib/portadores-caixa";
import { gruposAplicaveis } from "@/lib/checklist-veiculo";
import { nomeSubcategoria, resolverSubcategoria } from "@/lib/subcategoria-referencia";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

type VeiculoLinha = Record<string, unknown> & { id: string };
const PAGINA = 50;
// Decisão 137: um campo só define o check list do veículo; periódico (obrigatório, entra no KPI) ou Avulso (não obrigatório).
const AVULSO = "Avulso";
const PERIODICIDADES_CAMPO = ["Diária", "Semanal", "Quinzenal", "Mensal", AVULSO] as const;
const SEM_RESPONSAVEL = "__nao-definido__"; // valor do campo Responsável quando é "Não definido"
const CATEGORIA_VEICULO = "cat-veiculos";

// Lê todos os veículos, de página em página, sem o corte do seletor de cadastro.
async function lerVeiculos(): Promise<VeiculoLinha[]> {
  const cliente = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const todos: VeiculoLinha[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await cliente.from("veiculos").select("*").order("id").range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    const pagina = (data ?? []) as VeiculoLinha[];
    todos.push(...pagina);
    if (pagina.length < PAGINA) return todos;
  }
}

type EmpregadoLinha = { id: string; nome: string; matricula?: string | null; empresa_id?: string | null; ativo?: boolean | null; data_demissao?: string | null };

async function lerEmpregados(): Promise<EmpregadoLinha[]> {
  return lerTodas<EmpregadoLinha>(() => supabase.from("empregados").select("*"), (q) => q.order("id"));
}

function useAssociacoes(): AssociacaoChecklist[] {
  const [lista, setLista] = useState<AssociacaoChecklist[]>(() => lerAssociacoes());
  useEffect(() => {
    const atualizar = () => setLista(lerAssociacoes());
    atualizar();
    window.addEventListener(EVENTO_ASSOCIACOES_CHECKLIST, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_ASSOCIACOES_CHECKLIST, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return lista;
}

const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

// Parâmetros > Veículos > Associar itens de check list a um veículo (decisão 74): escolhe o veículo,
// habilita grupos de Itens check list com a periodicidade de cada um e define o responsável. Só modo
// demonstração; nada no Supabase.
export function AssociarChecklistVeiculo({ secao = false }: { secao?: boolean } = {}) {
  const parametros = useParametrosBase();
  const associacoes = useAssociacoes();
  const { data: veiculos = [], isLoading: carregandoVeiculos } = useQuery({ queryKey: ["veiculos-checklist-assoc"], queryFn: lerVeiculos });
  const { data: empregados = [] } = useQuery({ queryKey: ["empregados-checklist-assoc"], queryFn: lerEmpregados });
  const grupos = parametros.itensChecklistVeiculo;
  const queryClient = useQueryClient();
  const { canWrite } = useAccess();
  // Telas de cadastro abertas por cima da janela (decisão 120): ficam ao lado dela, nunca dentro, para não perder o que já foi escolhido.
  const [veiculosAberto, setVeiculosAberto] = useState(false);
  const [empregadosAberto, setEmpregadosAberto] = useState(false);
  const [itensAberto, setItensAberto] = useState(false);

  const [aberto, setAberto] = useState(false);
  // veículo da associação que está sendo editada (null = nova ou clone)
  const [editando, setEditando] = useState<string | null>(null);
  // veículo do check list que está sendo clonado: aparece preenchido, mas o clone precisa de outro veículo (decisão 156).
  const [clonandoDe, setClonandoDe] = useState<string | null>(null);
  const [veiculoId, setVeiculoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [periodicidade, setPeriodicidade] = useState("");
  // Itens escolhidos, um a um, dentro dos grupos que valem para o veículo; null = ainda não mexeu, vale todos os itens dos grupos que se aplicam.
  const [escolhidos, setEscolhidos] = useState<string[] | null>(null);
  const [travado, setTravado] = useState(false);
  const salvando = useRef(false);
  // Itens personalizados deste veículo (um por linha): viram um grupo próprio ao salvar, além dos grupos marcados.
  // null = ainda não mexeu: o bloco mostra os itens do grupo personalizado já salvo do veículo, se houver.
  const [personalizados, setPersonalizados] = useState<string | null>(null);

  const rotuloVeiculo = (v: VeiculoLinha) =>
    descricaoVeiculo({
      placa: v["placa"] as string, subcategoria: nomeSubcategoria(parametros, CATEGORIA_VEICULO, v as never),
      marca: v["marca"] as string, modelo: v["modelo"] as string, ano: v["ano"] as string,
      cor: v["cor"] as string, combustivel: v["combustivel"] as string,
    }) || String(v["codigo_sku"] ?? v.id);
  const veiculoPorId = (id: string) => veiculos.find((v) => v.id === id);
  // Cada veículo tem uma associação só: ao criar, só os sem associação; ao editar ou clonar, mais o do original.
  const veiculosLivres = veiculos.filter((v) => !associacoes.some((a) => a.veiculoId === v.id) || v.id === editando || v.id === clonandoDe);

  const veiculoEscolhido = veiculoPorId(veiculoId);
  // Responsável: empregado ativo, da empresa do veículo (sem empresa no veículo, de qualquer empresa).
  const elegiveis = empregados.filter((e) =>
    empregadoElegivelPortador({ ativo: e.ativo ?? null, data_demissao: e.data_demissao ?? null } as never) &&
    (!veiculoEscolhido?.["empresa_id"] || e.empresa_id === veiculoEscolhido["empresa_id"]),
  );
  const responsavel = elegiveis.find((e) => e.id === responsavelId) ?? null;
  // Itens que se aplicam ao tipo do veículo e à periodicidade escolhida (Avulso traz só os grupos avulsos).
  const subcategoriaEscolhida = veiculoEscolhido ? resolverSubcategoria(parametros, "cat-veiculos", veiculoEscolhido as never) : null;
  const subcategoriaIdEscolhida = subcategoriaEscolhida?.id ?? null;
  // Os itens vêm do tipo do veículo, já antes de escolher a periodicidade; Avulso traz os itens simples, para qualquer veículo (decisão 155).
  // Grupos personalizados não entram na lista comum: o de cada veículo é cuidado no bloco "Personalizar itens".
  const aplicaveis = veiculoEscolhido ? gruposAplicaveis(grupos, subcategoriaIdEscolhida, periodicidade === AVULSO).filter((g) => !ehGrupoPersonalizado(g.nome)) : [];
  const placaEscolhida = String(veiculoEscolhido?.["placa"] ?? "").trim().toUpperCase() || "veículo";
  const personalizadoSalvo = veiculoEscolhido ? grupos.find((g) => g.nome === nomeGrupoPersonalizado(placaEscolhida, periodicidade === AVULSO)) : undefined;
  const valorPersonalizados = personalizados ?? personalizadoSalvo?.itens.map((i) => i.nome).join("\n") ?? "";
  const todosItensIds = aplicaveis.flatMap((g) => g.itens.map((i) => i.id));
  const marcados = escolhidos === null ? todosItensIds : escolhidos.filter((id) => todosItensIds.includes(id));
  const marcadosDoGrupo = (g: { itens: { id: string }[] }) => g.itens.filter((i) => marcados.includes(i.id)).map((i) => i.id);
  const alternarItem = (id: string, marcar: boolean) =>
    setEscolhidos(marcar ? [...marcados.filter((m) => m !== id), id] : marcados.filter((m) => m !== id));
  // Marcar ou desmarcar o grupo marca ou desmarca todos os itens dele.
  const alternarGrupo = (g: { itens: { id: string }[] }, marcar: boolean) => {
    const ids = g.itens.map((i) => i.id);
    setEscolhidos(marcar ? [...marcados.filter((m) => !ids.includes(m)), ...ids] : marcados.filter((m) => !ids.includes(m)));
  };

  // Ao fechar a tela de cadastro, a lista de veículos ou de empregados da janela é lida de novo e o que foi escolhido continua.
  const aoFecharVeiculos = (a: boolean) => { setVeiculosAberto(a); if (!a) void queryClient.invalidateQueries({ queryKey: ["veiculos-checklist-assoc"] }); };
  const aoFecharEmpregados = (a: boolean) => { setEmpregadosAberto(a); if (!a) void queryClient.invalidateQueries({ queryKey: ["empregados-checklist-assoc"] }); };
  const linkCadastro = (rotulo: string, abrirTela: () => void) => (canWrite ? (
    <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={abrirTela}>{rotulo}</button>
  ) : null);

  // Trocar o veículo mantém o responsável só se ele ainda pode responder por ele (ativo e da mesma empresa do novo veículo).
  function trocarVeiculo(id: string) {
    const empresaNova = (veiculosLivres.find((x) => x.id === id) as { empresa_id?: string | null } | undefined)?.empresa_id;
    const continua = elegiveis.some((e) => e.id === responsavelId && (!empresaNova || e.empresa_id === empresaNova));
    setVeiculoId(id);
    setEscolhidos(null);
    if (responsavelId !== SEM_RESPONSAVEL && !continua) setResponsavelId("");
  }

  function abrir(a: AssociacaoChecklist | null, clonar: boolean) {
    setEditando(a && !clonar ? a.veiculoId : null);
    setClonandoDe(a && clonar ? a.veiculoId : null);
    // Editar e Clonar abrem com tudo do original, inclusive o veículo (decisão 156).
    setVeiculoId(a ? a.veiculoId : "");
    setResponsavelId(a ? (a.responsavel?.id ?? SEM_RESPONSAVEL) : "");
    // Clonar copia veículo, responsável, periodicidade e itens (decisões 138 e 156); tudo pode ser editado, e o veículo tem de mudar.
    const daAssociacao = a ? gruposDaAssociacao(a, grupos) : [];
    const escolhida = a ? (daAssociacao.find((i) => i.tipo === "periodico")?.periodicidade ?? AVULSO) : "";
    setPeriodicidade(escolhida);
    // A janela guarda uma periodicidade só (decisão 148). Um check list antigo com mais de uma mostra só os itens da escolhida, e o aviso diz o que sai ao salvar.
    const daEscolhida = daAssociacao.filter((i) => (escolhida === AVULSO ? i.tipo === "avulso" : i.tipo === "periodico" && i.periodicidade === escolhida));
    if (a && daEscolhida.length < daAssociacao.length) {
      toast.warning(`Este check list tinha mais de uma periodicidade. A janela mostra só ${escolhida}; ao salvar, os itens das outras periodicidades saem.`);
    }
    setEscolhidos(a ? daEscolhida.flatMap((i) => i.itensIds ?? grupos.find((g) => g.id === i.grupoId)?.itens.map((x) => x.id) ?? []) : null);
    setPersonalizados(null);
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    if (clonandoDe && veiculoId === clonandoDe) {
      toast.error("Escolha outro veículo para o clone: este já tem o check list original.");
      return;
    }
    salvando.current = true;
    setTravado(true);
    // O responsável salvo que deixou de ser elegível continua valendo enquanto estiver escolhido.
    const salvo = editando || clonandoDe ? associacoes.find((a) => a.veiculoId === (editando ?? clonandoDe))?.responsavel : null;
    // "Não definido" (decisão 116) grava sem responsável; só um campo vazio é erro.
    if (!responsavelId) {
      salvando.current = false;
      setTravado(false);
      toast.error("Escolha o responsável ou marque Não definido.");
      return;
    }
    const escolhido = responsavelId === SEM_RESPONSAVEL
      ? null
      : responsavel
        ? { id: responsavel.id, nome: responsavel.nome }
        : salvo && salvo.id === responsavelId ? salvo : null;
    if (!periodicidade) {
      salvando.current = false;
      setTravado(false);
      toast.error("Escolha a periodicidade do check list ou Avulso.");
      return;
    }
    // Os itens são os grupos escolhidos entre os que valem para o tipo do veículo: periódico (obrigatórios) ou avulso (grupos Avulso, não obrigatórios); a periodicidade é uma só para todos.
    const avulso = periodicidade === AVULSO;
    const itensDosGrupos = Object.fromEntries(grupos.map((g) => [g.id, g.itens.map((i) => i.id)]));
    // Grupo com todos os itens marcados vale inteiro (os itens que entrarem nele depois também); com parte, guarda só os escolhidos.
    const itens: EntradaItemAssociacao[] = aplicaveis.filter((g) => marcadosDoGrupo(g).length > 0).map((g) => {
      const ids = marcadosDoGrupo(g);
      const escolha = ids.length === g.itens.length ? {} : { itensIds: ids };
      return avulso
        ? { grupoId: g.id, tipo: "avulso", periodicidade: "", obrigatorio: false, ...escolha }
        : { grupoId: g.id, tipo: "periodico", periodicidade: periodicidade as PeriodicidadeAssociacao, obrigatorio: true, ...escolha };
    });
    // Itens personalizados viram um grupo próprio ("Personalizado · PLACA", ou "Avulso · Personalizado · PLACA" no avulso), do tipo do veículo;
    // se o veículo já tem esse grupo, ele é atualizado, não duplicado.
    const proprios = valorPersonalizados.split("\n").map((t) => t.trim()).filter(Boolean);
    const placa = placaEscolhida;
    const ok = executar(
      () => {
        let novoId: string | null = null;
        let usadoId: string | null = null;
        const idsValidos = grupos.map((g) => g.id);
        try {
          if (proprios.length > 0) {
            if (personalizadoSalvo) {
              editarGrupoChecklistVeiculo(personalizadoSalvo.id, personalizadoSalvo.nome, proprios, personalizadoSalvo.tiposVeiculo);
              usadoId = personalizadoSalvo.id;
            } else {
              const novo = adicionarGrupoChecklistVeiculo(nomeGrupoPersonalizado(placa, avulso), proprios, subcategoriaIdEscolhida ? [subcategoriaIdEscolhida] : [TODOS_OS_TIPOS]);
              novoId = novo.id;
              usadoId = novo.id;
              idsValidos.push(novo.id);
            }
            itens.push(avulso
              ? { grupoId: usadoId, tipo: "avulso", periodicidade: "", obrigatorio: false }
              : { grupoId: usadoId, tipo: "periodico", periodicidade: periodicidade as PeriodicidadeAssociacao, obrigatorio: true });
          }
          const salva = editando
            ? editarAssociacao(editando, { veiculoId, responsavel: escolhido, itens }, undefined, undefined, idsValidos, itensDosGrupos)
            : criarAssociacao(veiculoId, escolhido, itens, undefined, undefined, idsValidos, itensDosGrupos);
          // Grupos personalizados antigos deste veículo (outro tipo de check list, ou sufixos de versões antigas) que ficaram sem uso saem.
          for (const g of grupos) {
            if (g.id !== usadoId && ehPersonalizadoDe(g.nome, placa)) { try { removerGrupoChecklistVeiculo(g.id); } catch { /* sem o que fazer */ } }
          }
          return salva;
        } catch (erro) {
          // A associação não saiu: o grupo personalizado recém-criado não fica sobrando.
          if (novoId) { try { removerGrupoChecklistVeiculo(novoId); } catch { /* sem o que fazer */ } }
          throw erro;
        }
      },
      "Itens de check list associados ao veículo.",
    );
    if (ok) setAberto(false);
    // Só solta a trava depois de o diálogo fechar ou de o erro aparecer.
    setTimeout(() => {
      salvando.current = false;
      setTravado(false);
    }, 400);
  }

  function excluir(a: AssociacaoChecklist) {
    const v = veiculoPorId(a.veiculoId);
    if (!confirm(`Excluir os itens de check list associados a ${v ? rotuloVeiculo(v) : "veículo removido"}?`)) return;
    executar(() => removerAssociacao(a.veiculoId), "Associação excluída.");
  }

  // O responsável salvo pode ser de alguém que deixou de ser elegível; continua aparecendo para não sumir do campo.
  const salvoNaEdicao = editando || clonandoDe ? associacoes.find((a) => a.veiculoId === (editando ?? clonandoDe))?.responsavel : null;
  const opcoesResponsavel = salvoNaEdicao && !elegiveis.some((e) => e.id === salvoNaEdicao.id)
    ? [...elegiveis.map((e) => ({ id: e.id, rotulo: e.nome })), { id: salvoNaEdicao.id, rotulo: `${salvoNaEdicao.nome} (atual)` }]
    : elegiveis.map((e) => ({ id: e.id, rotulo: e.matricula ? `${e.nome} · ${e.matricula}` : e.nome }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!secao && <p className="text-eyebrow">Parâmetros</p>}
          {secao ? <h2 className="text-xl font-bold">Associar itens de check list a um veículo</h2> : <h1 className="text-2xl font-bold">Associar itens de check list a um veículo</h1>}
          <p className="mt-1 text-sm text-muted-foreground">
            Para cada veículo, escolha o responsável e a periodicidade do check list. Periódico é obrigatório e entra nos KPI; avulso não é obrigatório e não entra nos KPI.
          </p>
        </div>
        <Button requiresWrite onClick={() => abrir(null, false)}>Associar itens</Button>
      </header>

      <section className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Check list (Placa &gt;&gt; Periodicidade &gt;&gt; Responsável)</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Obrigatório</th>
              <th className="px-3 py-2">Grupos</th>
              <th className="px-3 py-2">Atualizado em</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {associacoes.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-muted-foreground">Nenhum veículo com itens de check list associados ainda.</td></tr>
            )}
            {associacoes.map((a) => {
              const v = veiculoPorId(a.veiculoId);
              const rotulo = v ? rotuloVeiculo(v) : carregandoVeiculos ? "Carregando…" : "Veículo removido";
              const placa = String(v?.["placa"] ?? "").trim().toUpperCase() || rotulo;
              const listas = checklistsDaAssociacao(placa, a, grupos);
              return (
                <Fragment key={a.veiculoId}>
                  <tr className="bg-muted/50">
                    <td colSpan={4} className="px-3 py-2 font-semibold">{rotulo} <span className="font-normal text-muted-foreground">· responsável: {a.responsavel?.nome ?? NAO_DEFINIDO}</span></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{dataBr(a.atualizadoEm)}</td>
                    <td className="px-3 py-2">
                      <AcoesLinha rotulo={rotulo} onClonar={() => abrir(a, true)} onEditar={() => abrir(a, false)} onExcluir={() => excluir(a)} />
                    </td>
                  </tr>
                  {listas.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-2 text-muted-foreground">Nenhum grupo habilitado existente.</td></tr>
                  )}
                  {listas.map((c) => (
                    <tr key={c.periodicidade}>
                      <td className="px-3 py-2 pl-6 font-medium">{c.nome}</td>
                      <td className="px-3 py-2">
                        {c.tipo === "Livre" ? "Avulso" : c.tipo}
                        {c.tipo === "Livre" && <span className="block text-xs text-muted-foreground">livre: qualquer hora, qualquer pessoa; fora da lista do menu</span>}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar itens de check list do veículo" : clonandoDe ? "Clonar itens de check list do veículo" : "Associar itens de check list a um veículo"}</DialogTitle>
            <DialogDescription>
              Escolha o veículo, o responsável e a periodicidade do check list (ou Avulso) e marque os itens que o compõem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="assoc-veiculo">Veículo</Label>
                <Select value={veiculoId} onValueChange={(v) => { if (v) trocarVeiculo(v); }}>
                  <SelectTrigger id="assoc-veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                  <SelectContent>
                    {veiculosLivres.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{rotuloVeiculo(v)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {veiculosLivres.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todos os veículos já têm itens associados, ou nenhum veículo está cadastrado.</p>
                )}
                <p className="text-xs">{linkCadastro("Cadastrar veículo", () => setVeiculosAberto(true))}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-responsavel">Responsável</Label>
                <Select key={`${veiculoId}-${opcoesResponsavel.length}`} value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger id="assoc-responsavel"><SelectValue placeholder="Selecione o responsável ou Não definido" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_RESPONSAVEL}>{NAO_DEFINIDO}</SelectItem>
                    {opcoesResponsavel.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {opcoesResponsavel.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum empregado ativo encontrado para este veículo. Cadastre em Parâmetros &gt; Empregados.</p>
                )}
                <p className="text-xs">{linkCadastro("Cadastrar empregado", () => setEmpregadosAberto(true))}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-periodicidade">Periodicidade</Label>
                <Select value={periodicidade} onValueChange={(v) => { setPeriodicidade(v); setEscolhidos(null); }}>
                  <SelectTrigger id="assoc-periodicidade"><SelectValue placeholder="Selecione a periodicidade" /></SelectTrigger>
                  <SelectContent>
                    {PERIODICIDADES_CAMPO.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Diária, semanal, quinzenal ou mensal: check list periódico, obrigatório (entra nos KPI). Avulso: não obrigatório (não entra nos KPI), com os itens simples, para qualquer veículo.</p>
              </div>
            </div>

            <fieldset className="space-y-2" data-testid="associar-itens">
              <legend className="text-sm font-medium">Itens que compõem o check list</legend>
              <p className="text-xs text-muted-foreground">
                Marque o grupo para trazer a lista de itens dele e escolha, item a item, os que compõem o check list. A periodicidade vale para todos os itens marcados.
              </p>
              <p className="text-xs">{linkCadastro("Cadastrar itens de check list", () => setItensAberto(true))}</p>
              {!veiculoEscolhido ? (
                <p className="text-sm text-muted-foreground">Escolha o veículo para ver os itens.</p>
              ) : aplicaveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum grupo de itens serve a este veículo. Personalize os itens abaixo ou cadastre em Itens check list.</p>
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
              {veiculoEscolhido && (
                <div className="space-y-1.5 rounded-md border p-3" data-testid="itens-personalizados">
                  <h3 className="text-sm font-semibold">Personalizar itens deste veículo</h3>
                  <p className="text-xs text-muted-foreground">Marque itens do padrão ou adicione itens próprios: eles formam o grupo “Personalizado · placa”, que só entra neste veículo, junto com os grupos marcados acima. Ao abrir de novo, os itens salvos voltam aqui.</p>
                  <EditorItensChecklist
                    id="assoc-personalizados"
                    value={valorPersonalizados}
                    onChange={setPersonalizados}
                    catalogo={CHECKLIST_VEICULOS_PADRAO.filter((g) => (periodicidade === AVULSO) === g.nome.startsWith("Avulso ·")).map((g) => ({ titulo: g.nome, itens: g.itens }))}
                  />
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

      {/* Ao lado do diálogo da associação, nunca dentro dele (decisão 120). */}
      <DialogCadastroVeiculos aberto={veiculosAberto} onAbrirMudou={aoFecharVeiculos} />
      <DialogCadastroEmpregados aberto={empregadosAberto} onAbrirMudou={aoFecharEmpregados} />
      <DialogItensChecklist aberto={itensAberto} onAbrirMudou={setItensAberto} />
    </div>
  );
}
