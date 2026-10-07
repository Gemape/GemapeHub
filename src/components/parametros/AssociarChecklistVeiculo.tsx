import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { descricaoVeiculo } from "@/lib/descricao-veiculo";
import {
  criarAssociacao, editarAssociacao, EVENTO_ASSOCIACOES_CHECKLIST, gruposDaAssociacao, lerAssociacoes,
  PERIODICIDADES_ASSOCIACAO, removerAssociacao,
  type AssociacaoChecklist, type EntradaItemAssociacao,
} from "@/lib/checklist-associacao-veiculo";
import { empregadoElegivelPortador } from "@/lib/portadores-caixa";
import { nomeSubcategoria } from "@/lib/subcategoria-referencia";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

type VeiculoLinha = Record<string, unknown> & { id: string };
const PAGINA = 50;
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
  const { data, error } = await supabase.from("empregados").select("*");
  if (error) throw error;
  return (data ?? []) as unknown as EmpregadoLinha[];
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
export function AssociarChecklistVeiculo() {
  const parametros = useParametrosBase();
  const associacoes = useAssociacoes();
  const { data: veiculos = [], isLoading: carregandoVeiculos } = useQuery({ queryKey: ["veiculos-checklist-assoc"], queryFn: lerVeiculos });
  const { data: empregados = [] } = useQuery({ queryKey: ["empregados-checklist-assoc"], queryFn: lerEmpregados });
  const grupos = parametros.itensChecklistVeiculo;

  const [aberto, setAberto] = useState(false);
  // veículo da associação que está sendo editada (null = nova ou clone)
  const [editando, setEditando] = useState<string | null>(null);
  const [veiculoId, setVeiculoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [itens, setItens] = useState<EntradaItemAssociacao[]>([]);
  const [travado, setTravado] = useState(false);
  const salvando = useRef(false);

  const rotuloVeiculo = (v: VeiculoLinha) =>
    descricaoVeiculo({
      placa: v["placa"] as string, subcategoria: nomeSubcategoria(parametros, CATEGORIA_VEICULO, v as never),
      marca: v["marca"] as string, modelo: v["modelo"] as string, ano: v["ano"] as string,
      cor: v["cor"] as string, combustivel: v["combustivel"] as string,
    }) || String(v["codigo_sku"] ?? v.id);
  const veiculoPorId = (id: string) => veiculos.find((v) => v.id === id);
  // Cada veículo tem uma associação só: ao criar ou clonar, só os sem associação; ao editar, mais o próprio.
  const veiculosLivres = veiculos.filter((v) => !associacoes.some((a) => a.veiculoId === v.id) || v.id === editando);

  const veiculoEscolhido = veiculoPorId(veiculoId);
  // Responsável: empregado ativo, da empresa do veículo (sem empresa no veículo, de qualquer empresa).
  const elegiveis = empregados.filter((e) =>
    empregadoElegivelPortador({ ativo: e.ativo ?? null, data_demissao: e.data_demissao ?? null } as never) &&
    (!veiculoEscolhido?.["empresa_id"] || e.empresa_id === veiculoEscolhido["empresa_id"]),
  );
  const responsavel = empregados.find((e) => e.id === responsavelId) ?? null;

  function abrir(a: AssociacaoChecklist | null, clonar: boolean) {
    setEditando(a && !clonar ? a.veiculoId : null);
    setVeiculoId(a && !clonar ? a.veiculoId : "");
    setResponsavelId(a && !clonar ? a.responsavel.id : "");
    // Clonar copia os grupos e periodicidades para outro veículo; o responsável é escolhido de novo.
    setItens(a ? gruposDaAssociacao(a, grupos).map((i) => ({ grupoId: i.grupoId, periodicidade: i.periodicidade })) : []);
    setAberto(true);
  }

  const habilitar = (grupoId: string) => setItens((atual) => (atual.some((i) => i.grupoId === grupoId) ? atual : [...atual, { grupoId, periodicidade: "" }]));
  const desabilitar = (grupoId: string) => setItens((atual) => atual.filter((i) => i.grupoId !== grupoId));
  const mudar = (grupoId: string, periodicidade: string) =>
    setItens((atual) => atual.map((i) => (i.grupoId === grupoId ? { ...i, periodicidade } : i)));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    setTravado(true);
    // O responsável salvo que deixou de ser elegível continua valendo enquanto estiver escolhido.
    const salvo = editando ? associacoes.find((a) => a.veiculoId === editando)?.responsavel : null;
    const escolhido = responsavel
      ? { id: responsavel.id, nome: responsavel.nome }
      : salvo && salvo.id === responsavelId ? salvo : null;
    const ok = executar(
      () => (editando
        ? editarAssociacao(editando, { veiculoId, responsavel: escolhido, itens }, undefined, undefined, grupos.map((g) => g.id))
        : criarAssociacao(veiculoId, escolhido, itens, undefined, undefined, grupos.map((g) => g.id))),
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

  const habilitados = new Set(itens.map((i) => i.grupoId));
  const disponiveis = grupos.filter((g) => !habilitados.has(g.id));
  // O responsável salvo pode ser de alguém que deixou de ser elegível; continua aparecendo para não sumir do campo.
  const salvoNaEdicao = editando ? associacoes.find((a) => a.veiculoId === editando)?.responsavel : null;
  const opcoesResponsavel = salvoNaEdicao && !elegiveis.some((e) => e.id === salvoNaEdicao.id)
    ? [...elegiveis.map((e) => ({ id: e.id, rotulo: e.nome })), { id: salvoNaEdicao.id, rotulo: `${salvoNaEdicao.nome} (atual)` }]
    : elegiveis.map((e) => ({ id: e.id, rotulo: e.matricula ? `${e.nome} · ${e.matricula}` : e.nome }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-eyebrow">Parâmetros &gt; Veículos</p>
          <h1 className="text-2xl font-bold">Associar itens de check list a um veículo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Para cada veículo, os grupos de itens de check list habilitados, a periodicidade de cada um e o responsável.
          </p>
        </div>
        <Button requiresWrite onClick={() => abrir(null, false)}>Associar itens</Button>
      </header>

      <section className="panel overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2">Grupos habilitados (periodicidade)</th>
              <th className="px-3 py-2">Atualizado em</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {associacoes.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-muted-foreground">Nenhum veículo com itens de check list associados ainda.</td></tr>
            )}
            {associacoes.map((a) => {
              const v = veiculoPorId(a.veiculoId);
              const rotulo = v ? rotuloVeiculo(v) : carregandoVeiculos ? "Carregando…" : "Veículo removido";
              return (
                <tr key={a.veiculoId}>
                  <td className="px-3 py-2 font-medium">{rotulo}</td>
                  <td className="px-3 py-2">{a.responsavel.nome || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {gruposDaAssociacao(a, grupos).map((i) => `${i.nome} (${i.periodicidade})`).join("; ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{dataBr(a.atualizadoEm)}</td>
                  <td className="px-3 py-2">
                    <AcoesLinha rotulo={rotulo} onClonar={() => abrir(a, true)} onEditar={() => abrir(a, false)} onExcluir={() => excluir(a)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar itens de check list do veículo" : "Associar itens de check list a um veículo"}</DialogTitle>
            <DialogDescription>
              Escolha o veículo, habilite os grupos de itens, escolha a periodicidade de cada um e defina o responsável.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assoc-veiculo">Veículo</Label>
                <Select value={veiculoId} onValueChange={setVeiculoId}>
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-responsavel">Responsável</Label>
                <Select key={`${veiculoId}-${opcoesResponsavel.length}`} value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger id="assoc-responsavel"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>
                    {opcoesResponsavel.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {opcoesResponsavel.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum empregado ativo encontrado para este veículo. Cadastre em Parâmetros &gt; Empregados.</p>
                )}
              </div>
            </div>

            {(veiculoId || itens.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">Grupos de itens</h3>
                  {grupos.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum grupo cadastrado. Cadastre em Parâmetros &gt; Veículos &gt; Itens check list.</p>
                  )}
                  {grupos.length > 0 && disponiveis.length === 0 && (
                    <p className="text-xs text-muted-foreground">Todos os grupos já estão habilitados.</p>
                  )}
                  <ul className="space-y-1">
                    {disponiveis.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1.5 text-sm">
                        <span>{g.nome}</span>
                        <Button type="button" size="sm" variant="outline" aria-label={`Habilitar ${g.nome}`} onClick={() => habilitar(g.id)}>
                          Habilitar →
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">Grupos habilitados</h3>
                  {itens.length === 0 && <p className="text-xs text-muted-foreground">Nenhum grupo habilitado ainda.</p>}
                  <ul className="space-y-2">
                    {itens.map((i) => {
                      const grupo = grupos.find((g) => g.id === i.grupoId);
                      return (
                        <li key={i.grupoId} className="space-y-1.5 rounded bg-muted/40 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{grupo?.nome ?? "Grupo removido"}</span>
                            <Button type="button" size="sm" variant="ghost" aria-label={`Desabilitar ${grupo?.nome ?? ""}`} onClick={() => desabilitar(i.grupoId)}>
                              ← Remover
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`periodicidade-${i.grupoId}`} className="text-xs">Periodicidade</Label>
                            <Select value={i.periodicidade} onValueChange={(valor) => mudar(i.grupoId, valor)}>
                              <SelectTrigger id={`periodicidade-${i.grupoId}`}><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {PERIODICIDADES_ASSOCIACAO.map((p) => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={travado}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
