import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { RestaurarAcoesEquipamento, TEXTO_ALERTA_EQUIPAMENTO } from "@/components/parametros/RestaurarAcoesEquipamento";
import { ListaVeiculos } from "@/components/parametros/VeiculosListasParametros";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { listarEquipamentos, type Equipamento } from "@/lib/equipamentos-demo";
import {
  aplicarAcoesPadraoUmaVez, itensDoPlano, lerManutencaoEquipamento, opcoesDePlano, OUTROS, removerAcao, removerPlano, removerTipoOcorrencia, salvarAcao, salvarPlano, salvarTipoOcorrencia,
  type EntradaItemPlano, type PlanoEquipamento,
} from "@/lib/equipamentos-manutencao";
import { useVersaoArmazenamento } from "@/lib/use-versao-armazenamento";

// Parâmetros > Equipamentos > Manutenção (ações de manutenção e plano de manutenção por equipamento) e Tipos de ocorrência: as mesmas telas e
// regras de Parâmetros > Veículos, com horas de uso no lugar de km. Só modo demonstração (navegador).
const CAMINHO = "Parâmetros";
const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—");
const erroDe = (e: unknown, padrao: string) => (e instanceof Error ? e.message : padrao);

// Roda a gravação, mostra o aviso e devolve se deu certo.
function executar(acao: () => unknown, ok: string, aoMudar: () => void): boolean {
  try {
    acao();
  } catch (erro) {
    toast.error(erroDe(erro, "Não foi possível salvar."));
    return false;
  }
  toast.success(ok);
  aoMudar();
  return true;
}

export function AcoesManutencaoEquipamentoLista({ secao = false, versao, aoMudar }: { secao?: boolean; versao: number; aoMudar: () => void }) {
  const { acoes } = useMemo(() => lerManutencaoEquipamento(), [versao]);
  const subitensDe = (texto: string) => texto.split("\n");
  // Como em Veículos, as ações do padrão inicial já vêm cadastradas (uma vez só); depois, o botão Restaurar configurações iniciais as devolve.
  useEffect(() => { if (aplicarAcoesPadraoUmaVez()) aoMudar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ListaVeiculos
      eyebrow={CAMINHO}
      titulo="Ações de manutenção"
      subtitulo="Cada ação é um grupo (pai) com seus subitens (filhos). Ao registrar uma manutenção, escolhe-se o pai e marcam-se os filhos. Todo grupo tem também o item Outros, de descrição aberta."
      singular="ação de manutenção"
      secao={secao}
      linhas={acoes.map((a) => ({ id: a.id, nome: a.nome, extra: a.subitens.filter((i) => i.nome !== OUTROS).map((i) => i.nome).join("\n") }))}
      campoExtra="subitens"
      onSalvar={(id, nome, extra) => executar(() => salvarAcao({ ...(id ? { id } : {}), nome, subitens: subitensDe(extra) }), "Ação de manutenção salva.", aoMudar)}
      onExcluir={(l) => executar(() => removerAcao(l.id), "Ação de manutenção excluída.", aoMudar)}
      acaoExtra={(cadastrar) => <RestaurarAcoesEquipamento aoCadastrar={cadastrar} aoMudar={aoMudar} />}
      alertaPainel
      textoAlerta={TEXTO_ALERTA_EQUIPAMENTO}
      onValidar={(id, nome, extra, storage) => salvarAcao({ ...(id ? { id } : {}), nome, subitens: subitensDe(extra) }, storage)}
    />
  );
}

export function TiposOcorrenciaEquipamentoLista({ versao, aoMudar }: { versao: number; aoMudar: () => void }) {
  const { tiposOcorrencia } = useMemo(() => lerManutencaoEquipamento(), [versao]);
  return (
    <ListaVeiculos
      eyebrow={CAMINHO}
      titulo="Tipos de ocorrência"
      subtitulo="As possibilidades de ocorrência com equipamentos, cada uma com a sua descrição."
      singular="tipo de ocorrência"
      linhas={tiposOcorrencia.map((t) => ({ id: t.id, nome: t.nome, extra: t.descricao }))}
      campoExtra="descricao"
      onSalvar={(id, nome, descricao) => executar(() => salvarTipoOcorrencia({ ...(id ? { id } : {}), nome, descricao }), "Tipo de ocorrência salvo.", aoMudar)}
      onExcluir={(l) => executar(() => removerTipoOcorrencia(l.id), "Tipo de ocorrência excluído.", aoMudar)}
    />
  );
}

export function PlanoManutencaoEquipamento({ secao = false, versao, aoMudar }: { secao?: boolean; versao: number; aoMudar: () => void }) {
  const { acoes, planos } = useMemo(() => lerManutencaoEquipamento(), [versao]);
  const equipamentos = useMemo(() => listarEquipamentos(), [versao]);
  const [aberto, setAberto] = useState(false);
  // equipamento do plano que está sendo editado (null = novo ou clone)
  const [editando, setEditando] = useState<string | null>(null);
  const [equipamentoId, setEquipamentoId] = useState("");
  const [itens, setItens] = useState<EntradaItemPlano[]>([]);
  const trava = useRef(false);

  const porId = (id: string): Equipamento | undefined => equipamentos.find((e) => e.id === id);
  const rotulo = (e: Equipamento) => `${e.patrimonio} · ${e.nome}`;
  // Cada equipamento tem um plano só: ao criar ou clonar, só os sem plano podem ser escolhidos; ao editar, o próprio.
  const opcoes = opcoesDePlano(equipamentos, planos, editando);
  const temLivre = opcoes.some((o) => !o.ocupado);

  function abrir(plano: PlanoEquipamento | null, clonar: boolean) {
    if (plano && !clonar && !porId(plano.equipamentoId)) {
      toast.error("Este equipamento foi removido; exclua o plano.");
      return;
    }
    setEditando(plano && !clonar ? plano.equipamentoId : null);
    setEquipamentoId(plano && !clonar ? plano.equipamentoId : "");
    // Clonar copia as ações e os limites para outro equipamento.
    setItens(plano ? itensDoPlano(plano, acoes).map((i) => ({ acaoId: i.acaoId, horas: String(i.horas), meses: String(i.meses) })) : []);
    setAberto(true);
  }

  const habilitar = (acaoId: string) => setItens((atual) => (atual.some((i) => i.acaoId === acaoId) ? atual : [...atual, { acaoId, horas: "", meses: "" }]));
  const desabilitar = (acaoId: string) => setItens((atual) => atual.filter((i) => i.acaoId !== acaoId));
  const mudar = (acaoId: string, campo: "horas" | "meses", valor: string) =>
    setItens((atual) => atual.map((i) => (i.acaoId === acaoId ? { ...i, [campo]: valor } : i)));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true;
    const ok = executar(() => salvarPlano({ modo: editando ? "editar" : "criar", equipamentoId, itens }), "Plano de manutenção salvo.", aoMudar);
    if (ok) setAberto(false);
    setTimeout(() => { trava.current = false; }, 400);
  }

  function excluir(plano: PlanoEquipamento) {
    const e = porId(plano.equipamentoId);
    if (!confirm(`Excluir o plano de manutenção de ${e ? rotulo(e) : "equipamento removido"}?`)) return;
    executar(() => removerPlano(plano.equipamentoId), "Plano excluído.", aoMudar);
  }

  const habilitados = new Set(itens.map((i) => i.acaoId));
  const disponiveis = acoes.filter((a) => !habilitados.has(a.id));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!secao && <EyebrowDoCard fallback={CAMINHO} />}
          {secao ? <h2 className="text-xl font-bold">Cadastrar Plano de Manutenções</h2> : <h1 className="text-2xl font-bold">Cadastrar Plano de Manutenções</h1>}
          <p className="mt-1 text-sm text-muted-foreground">Para cada equipamento, as ações habilitadas e o limite de horas de uso e de tempo de cada uma; vale o que vier primeiro.</p>
        </div>
        <Button requiresWrite onClick={() => abrir(null, false)}>Cadastrar plano</Button>
      </header>

      <section className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Equipamento</th>
              <th className="px-3 py-2">Ações habilitadas (horas · meses)</th>
              <th className="px-3 py-2">Atualizado em</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {planos.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">Nenhum plano cadastrado ainda.</td></tr>}
            {planos.map((p) => {
              const e = porId(p.equipamentoId);
              const nome = e ? rotulo(e) : "Equipamento removido";
              return (
                <tr key={p.equipamentoId}>
                  <td className="px-3 py-2 font-medium">{nome}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {itensDoPlano(p, acoes).map((i) => `${i.nome} (${i.horas.toLocaleString("pt-BR")} h · ${i.meses} meses)`).join("; ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{dataBr(p.atualizadoEm)}</td>
                  <td className="px-3 py-2"><AcoesLinha rotulo={nome} onClonar={() => abrir(p, true)} onEditar={() => abrir(p, false)} onExcluir={() => excluir(p)} /></td>
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
            <DialogDescription>Escolha o equipamento, habilite as ações e informe o limite de horas de uso e de meses de cada uma. A manutenção vale pelo que vier primeiro.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plano-equipamento">Equipamento</Label>
              <Select value={equipamentoId} disabled={!!editando} onValueChange={(v) => v && setEquipamentoId(v)}>
                <SelectTrigger id="plano-equipamento"><SelectValue placeholder="Selecione o equipamento" /></SelectTrigger>
                <SelectContent>{opcoes.map(({ equipamento: e, ocupado }) => <SelectItem key={e.id} value={e.id} disabled={ocupado}>{rotulo(e)}{ocupado ? " · já tem plano" : ""}</SelectItem>)}</SelectContent>
              </Select>
              {!temLivre && <p className="text-xs text-muted-foreground">{opcoes.length === 0 ? "Nenhum equipamento disponível (ativo) cadastrado" : "Todos os equipamentos já têm plano"}: cadastre outro equipamento em {CAMINHO} &gt; Cadastrar equipamento{opcoes.length > 0 ? " ou edite o plano existente" : ""}.</p>}
            </div>

            {(equipamentoId || itens.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">Ações de manutenção</h3>
                  {acoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma ação cadastrada. Cadastre em Parâmetros &gt; Equipamentos &gt; Manutenção.</p>}
                  {acoes.length > 0 && disponiveis.length === 0 && <p className="text-xs text-muted-foreground">Todas as ações já estão habilitadas.</p>}
                  <ul className="space-y-1">
                    {disponiveis.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1.5 text-sm">
                        <span>{a.nome}</span>
                        <Button type="button" size="sm" variant="outline" aria-label={`Habilitar ${a.nome}`} onClick={() => habilitar(a.id)}>Habilitar →</Button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">Ações habilitadas</h3>
                  {itens.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma ação habilitada ainda.</p>}
                  <ul className="space-y-2">
                    {itens.map((i) => {
                      const acao = acoes.find((a) => a.id === i.acaoId);
                      return (
                        <li key={i.acaoId} className="space-y-1.5 rounded bg-muted/40 p-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{acao?.nome ?? "Ação removida"}</span>
                            <Button type="button" size="sm" variant="ghost" aria-label={`Desabilitar ${acao?.nome ?? ""}`} onClick={() => desabilitar(i.acaoId)}>← Remover</Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor={`horas-${i.acaoId}`} className="text-xs">A cada (horas de uso)</Label>
                              <Input id={`horas-${i.acaoId}`} inputMode="numeric" placeholder="Ex.: 250" value={String(i.horas)} onChange={(e) => mudar(i.acaoId, "horas", e.target.value)} />
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
              <Button requiresWrite type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Parâmetros > Equipamentos > Manutenção: numa só página, as ações de manutenção e o plano de cada equipamento, que usa essas ações.
export function ManutencaoEquipamentoPagina() {
  const [versao, aoMudar] = useVersaoArmazenamento();
  return (
    <div className="space-y-10">
      <header>
        <EyebrowDoCard fallback={CAMINHO} />
        <h1 className="text-2xl font-bold">Manutenção</h1>
        <p className="mt-1 text-sm text-muted-foreground">As ações de manutenção (grupos e subitens) e o plano de manutenções de cada equipamento, que usa essas ações: primeiro as ações, depois o plano.</p>
      </header>
      <AcoesManutencaoEquipamentoLista secao versao={versao} aoMudar={aoMudar} />
      <PlanoManutencaoEquipamento secao versao={versao} aoMudar={aoMudar} />
    </div>
  );
}

export function TiposOcorrenciaEquipamentoPagina() {
  const [versao, aoMudar] = useVersaoArmazenamento();
  return <TiposOcorrenciaEquipamentoLista versao={versao} aoMudar={aoMudar} />;
}
