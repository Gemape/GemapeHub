import { Table } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { AlertaPainelManutencao } from "@/components/parametros/AlertaPainelManutencao";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { descricaoVeiculo } from "@/lib/descricao-veiculo";
import {
  criarPlano, editarPlano, EVENTO_PLANOS, itensDoPlano, lerPlanos, removerPlano,
  type EntradaItem, type PlanoManutencao,
} from "@/lib/plano-manutencao";
import { nomeSubcategoria } from "@/lib/subcategoria-referencia";
import { executar, useParametrosBase, validarAntes } from "@/lib/use-parametros-base";

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

function usePlanos(): PlanoManutencao[] {
  const [planos, setPlanos] = useState<PlanoManutencao[]>(() => lerPlanos());
  useEffect(() => {
    const atualizar = () => setPlanos(lerPlanos());
    atualizar();
    window.addEventListener(EVENTO_PLANOS, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO_PLANOS, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);
  return planos;
}

const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");

// Parâmetros > Veículos > Cadastrar Plano de Manutenções (decisão 52): escolhe o veículo, habilita
// grupos de ação (os de Ações de manutenção) e informa km e meses de cada um; vale o que vier
// primeiro. Só modo demonstração; nada no Supabase.
export function PlanoManutencaoVeiculo({ secao = false }: { secao?: boolean } = {}) {
  const parametros = useParametrosBase();
  const planos = usePlanos();
  const { data: veiculos = [], isLoading: carregandoVeiculos } = useQuery({ queryKey: ["veiculos-plano"], queryFn: lerVeiculos });
  const acoes = parametros.acoesManutencaoVeiculo;

  const [aberto, setAberto] = useState(false);
  // veiculo do plano que está sendo editado (null = novo ou clone)
  const [editando, setEditando] = useState<string | null>(null);
  const [veiculoId, setVeiculoId] = useState("");
  const [itens, setItens] = useState<EntradaItem[]>([]);
  const [travado, setTravado] = useState(false);
  const salvando = useRef(false);
  const [confirmando, setConfirmando] = useState(false);

  const rotuloVeiculo = (v: VeiculoLinha) =>
    descricaoVeiculo({
      placa: v["placa"] as string, subcategoria: nomeSubcategoria(parametros, CATEGORIA_VEICULO, v as never),
      marca: v["marca"] as string, modelo: v["modelo"] as string, ano: v["ano"] as string,
      cor: v["cor"] as string, combustivel: v["combustivel"] as string,
    }) || String(v["codigo_sku"] ?? v.id);
  const veiculoPorId = (id: string) => veiculos.find((v) => v.id === id);
  // Cada veículo tem um plano só: ao criar ou clonar, só os sem plano; ao editar, mais o próprio.
  const veiculosLivres = veiculos.filter((v) => !planos.some((p) => p.veiculoId === v.id) || v.id === editando);

  function abrir(plano: PlanoManutencao | null, clonar: boolean) {
    setEditando(plano && !clonar ? plano.veiculoId : null);
    setVeiculoId(plano && !clonar ? plano.veiculoId : "");
    // Clonar copia os grupos e limites para outro veículo.
    setItens(plano ? itensDoPlano(plano, acoes).map((i) => ({ acaoId: i.acaoId, km: String(i.km), meses: String(i.meses) })) : []);
    setAberto(true);
  }

  const habilitar = (acaoId: string) => setItens((atual) => (atual.some((i) => i.acaoId === acaoId) ? atual : [...atual, { acaoId, km: "", meses: "" }]));
  const desabilitar = (acaoId: string) => setItens((atual) => atual.filter((i) => i.acaoId !== acaoId));
  const mudar = (acaoId: string, campo: "km" | "meses", valor: string) =>
    setItens((atual) => atual.map((i) => (i.acaoId === acaoId ? { ...i, [campo]: valor } : i)));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    // Valida antes de perguntar: formulário inválido mostra o erro, não o alerta (decisão 149).
    const valido = validarAntes((storage) =>
      editando
        ? editarPlano(editando, { veiculoId, itens }, storage, undefined, acoes.map((a) => a.id))
        : criarPlano(veiculoId, itens, storage, undefined, acoes.map((a) => a.id)),
    );
    if (valido) setConfirmando(true); // alerta Sim ou Não antes de gravar (decisão 146)
  }

  function gravar() {
    if (salvando.current) return;
    salvando.current = true;
    setTravado(true);
    const ok = executar(
      () => (editando
        ? editarPlano(editando, { veiculoId, itens }, undefined, undefined, acoes.map((a) => a.id))
        : criarPlano(veiculoId, itens, undefined, undefined, acoes.map((a) => a.id))),
      "Plano de manutenção salvo.",
    );
    if (ok) setAberto(false);
    // Só solta a trava depois de o diálogo fechar ou de o erro aparecer.
    setTimeout(() => {
      salvando.current = false;
      setTravado(false);
    }, 400);
  }

  function excluir(plano: PlanoManutencao) {
    const v = veiculoPorId(plano.veiculoId);
    if (!confirm(`Excluir o plano de manutenção de ${v ? rotuloVeiculo(v) : "veículo removido"}?`)) return;
    executar(() => removerPlano(plano.veiculoId), "Plano excluído.");
  }

  const habilitados = new Set(itens.map((i) => i.acaoId));
  const disponiveis = acoes.filter((a) => !habilitados.has(a.id));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!secao && <p className="text-eyebrow">Parâmetros &gt; Veículos</p>}
          {secao ? <h2 className="text-xl font-bold">Cadastrar Plano de Manutenções</h2> : <h1 className="text-2xl font-bold">Cadastrar Plano de Manutenções</h1>}
          <p className="mt-1 text-sm text-muted-foreground">
            Para cada veículo, os grupos de ação habilitados e o limite de km e de tempo de cada um; vale o que vier primeiro.
          </p>
        </div>
        <Button requiresWrite onClick={() => abrir(null, false)}>Cadastrar plano</Button>
      </header>

      <section className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Veículo</th>
              <th className="px-3 py-2">Grupos habilitados (km · meses)</th>
              <th className="px-3 py-2">Atualizado em</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {planos.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">Nenhum plano cadastrado ainda.</td></tr>
            )}
            {planos.map((p) => {
              const v = veiculoPorId(p.veiculoId);
              const rotulo = v ? rotuloVeiculo(v) : carregandoVeiculos ? "Carregando…" : "Veículo removido";
              return (
                <tr key={p.veiculoId}>
                  <td className="px-3 py-2 font-medium">{rotulo}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {itensDoPlano(p, acoes).map((i) => `${i.nome} (${i.km.toLocaleString("pt-BR")} km · ${i.meses} meses)`).join("; ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{dataBr(p.atualizadoEm)}</td>
                  <td className="px-3 py-2">
                    <AcoesLinha rotulo={rotulo} onClonar={() => abrir(p, true)} onEditar={() => abrir(p, false)} onExcluir={() => excluir(p)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar plano de manutenção" : "Cadastrar plano de manutenção"}</DialogTitle>
            <DialogDescription>
              Escolha o veículo, habilite os grupos de ação e informe o limite de km e de meses de cada um. A manutenção vale pelo que vier primeiro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plano-veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger id="plano-veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => {
                    const ocupado = !veiculosLivres.includes(v);
                    return <SelectItem key={v.id} value={v.id} disabled={ocupado}>{rotuloVeiculo(v)}{ocupado ? " · já tem plano" : ""}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {veiculosLivres.length === 0 && (
                <p className="text-xs text-muted-foreground">Todos os veículos já têm plano, ou nenhum veículo está cadastrado.</p>
              )}
            </div>

            {(veiculoId || itens.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">Grupos de ação</h3>
                  {acoes.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum grupo cadastrado. Cadastre em Parâmetros &gt; Veículos &gt; Manutenção.</p>
                  )}
                  {acoes.length > 0 && disponiveis.length === 0 && (
                    <p className="text-xs text-muted-foreground">Todos os grupos já estão habilitados.</p>
                  )}
                  <ul className="space-y-1">
                    {disponiveis.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1.5 text-sm">
                        <span>{a.nome}</span>
                        <Button type="button" size="sm" variant="outline" aria-label={`Habilitar ${a.nome}`} onClick={() => habilitar(a.id)}>
                          Habilitar →
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">Ações habilitadas</h3>
                  {itens.length === 0 && <p className="text-xs text-muted-foreground">Nenhum grupo habilitado ainda.</p>}
                  <ul className="space-y-2">
                    {itens.map((i) => {
                      const acao = acoes.find((a) => a.id === i.acaoId);
                      return (
                        <li key={i.acaoId} className="space-y-1.5 rounded bg-muted/40 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{acao?.nome ?? "Grupo removido"}</span>
                            <Button type="button" size="sm" variant="ghost" aria-label={`Desabilitar ${acao?.nome ?? ""}`} onClick={() => desabilitar(i.acaoId)}>
                              ← Remover
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor={`km-${i.acaoId}`} className="text-xs">A cada (km)</Label>
                              <Input id={`km-${i.acaoId}`} inputMode="numeric" placeholder="Ex.: 10000" value={String(i.km)} onChange={(e) => mudar(i.acaoId, "km", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`meses-${i.acaoId}`} className="text-xs">Ou a cada (meses)</Label>
                              <Input id={`meses-${i.acaoId}`} inputMode="numeric" placeholder="Ex.: 6" value={String(i.meses)} onChange={(e) => mudar(i.acaoId, "meses", e.target.value)} />
                            </div>
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
      <AlertaPainelManutencao
        aberto={confirmando}
        onSim={() => {
          setConfirmando(false);
          gravar();
        }}
        onNao={() => setConfirmando(false)}
      />
    </div>
  );
}
