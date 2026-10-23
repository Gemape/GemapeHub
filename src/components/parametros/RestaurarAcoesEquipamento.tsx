import { useRef, useState } from "react";
import { toast } from "sonner";

import { AlertaPainelManutencao } from "@/components/parametros/AlertaPainelManutencao";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/lib/access-context";
import { filtrarPaisEFilhos } from "@/lib/busca-acoes-manutencao";
import { excluirItensCriadosAcoes, itensCriadosAcoes, restaurarAcoesEscolhidas, situacaoPadraoAcoes, type SituacaoPadraoAcao } from "@/lib/equipamentos-manutencao";
import { validarAntes } from "@/lib/use-parametros-base";

const ROTULO_SITUACAO: Record<SituacaoPadraoAcao, string> = { igual: "Igual ao padrão", alterado: "Alterado", ausente: "Não cadastrado" };
export const TEXTO_ALERTA_EQUIPAMENTO = "As alterações feitas modificarão os planos e os indicadores de manutenção dos equipamentos. Definitivamente. Tem certeza que deseja fazer isso?";

// Restaurar configurações iniciais das Ações de manutenção de equipamentos: igual ao de Veículos. Lista os pais e os filhos do padrão inicial, cada um com o seu
// checkbox, e restaura só o que foi marcado, tudo de uma vez; embaixo, o que a pessoa criou, que o Administrador pode marcar para excluir.
export function RestaurarAcoesEquipamento({ aoCadastrar, aoMudar }: { aoCadastrar: (nomeInicial?: string) => void; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false);
  // Pai marcado = chave presente; o valor são os filhos marcados dele.
  const [marcados, setMarcados] = useState<Record<string, string[]>>({});
  const salvando = useRef(false);
  const [travado, setTravado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null); // texto do que será feito, enquanto o alerta Sim/Não está aberto
  const padroes = aberto ? situacaoPadraoAcoes() : [];
  const itensCriados = aberto ? itensCriadosAcoes() : [];
  // Busca da ação ou do subitem; o que está marcado não se perde ao buscar.
  const [busca, setBusca] = useState("");
  const visiveis = filtrarPaisEFilhos(padroes, busca);
  const criadosVisiveis = filtrarPaisEFilhos(itensCriados, busca);
  // Itens criados por você marcados para exclusão; só o Administrador exclui. Editar continua na lista.
  const { canDelete } = useAccess();
  const [conferidos, setConferidos] = useState<string[]>([]);
  const alternarConferido = (chave: string, marcar: boolean) => setConferidos((a) => (marcar ? [...a.filter((c) => c !== chave), chave] : a.filter((c) => c !== chave)));
  const totalFilhos = Object.values(marcados).reduce((n, f) => n + f.length, 0);
  const totalPais = Object.keys(marcados).length;
  const totalCriados = conferidos.length;

  function abrir() {
    setMarcados({});
    setConferidos([]);
    setBusca("");
    setAberto(true);
  }
  // Marcar o pai marca os filhos que estão na tela (todos, quando não há busca).
  const marcarPai = (nome: string, marcar: boolean, filhosNaTela: string[]) =>
    setMarcados((atual) => {
      const { [nome]: _tirado, ...resto } = atual;
      return marcar ? { ...resto, [nome]: [...new Set([...(atual[nome] ?? []), ...filhosNaTela])] } : resto;
    });
  // Marcar um filho marca também o pai dele; desmarcar o último filho mantém o pai marcado.
  const marcarFilho = (pai: string, filho: string, marcar: boolean) =>
    setMarcados((atual) => {
      const filhos = atual[pai] ?? [];
      return { ...atual, [pai]: marcar ? [...filhos.filter((f) => f !== filho), filho] : filhos.filter((f) => f !== filho) };
    });

  function salvar() {
    if (salvando.current || (totalPais === 0 && totalCriados === 0)) return;
    const alterados = padroes.filter((p) => p.nome in marcados && p.situacao === "alterado").length;
    const novos = padroes.filter((p) => p.nome in marcados && p.situacao === "ausente").length;
    const exclusao = totalCriados > 0 ? `Excluir ${totalCriados} ${totalCriados === 1 ? "item criado por você" : "itens criados por você"}? Não dá para desfazer.` : "";
    const texto = totalPais === 0 ? exclusao : (exclusao ? `${exclusao} ` : "") +
      `Restaurar ${totalPais} ${totalPais === 1 ? "ação" : "ações"} e ${totalFilhos} ${totalFilhos === 1 ? "subitem" : "subitens"} ao padrão inicial?` +
      (alterados > 0 ? ` O nome de ${alterados} ${alterados === 1 ? "ação volta" : "ações voltam"} ao inicial e os subitens marcados são restaurados; os não marcados ficam como estão.` : "") +
      (novos > 0 ? ` ${novos} ${novos === 1 ? "excluída será cadastrada" : "excluídas serão cadastradas"} de novo.` : "");
    setAviso(texto);
  }

  function gravar() {
    if (salvando.current) return;
    setAviso(null);
    const escolhas = Object.entries(marcados).map(([nome, filhos]) => ({ nome, filhos }));
    // Excluir e restaurar valem juntos: ensaia os dois numa cópia, para um erro na restauração não deixar só a exclusão gravada.
    if (totalCriados > 0 && totalPais > 0 && !validarAntes((storage) => { excluirItensCriadosAcoes(conferidos, storage); restaurarAcoesEscolhidas(escolhas, storage); })) return;
    salvando.current = true;
    setTravado(true);
    let ok = true;
    try {
      if (totalCriados > 0) {
        const e = excluirItensCriadosAcoes(conferidos);
        toast.success(`Excluídos: ${e.acoes} ${e.acoes === 1 ? "ação" : "ações"} e ${e.subitens} ${e.subitens === 1 ? "subitem" : "subitens"} criados por você.`);
      }
      if (totalPais > 0) {
        const r = restaurarAcoesEscolhidas(escolhas);
        const partes = [r.restaurados > 0 ? `${r.restaurados} ${r.restaurados === 1 ? "ação restaurada" : "ações restauradas"}` : "", r.criados > 0 ? `${r.criados} ${r.criados === 1 ? "cadastrada" : "cadastradas"} de novo` : ""].filter(Boolean);
        toast.success(`Configurações iniciais: ${partes.join(" e ")}, com ${r.filhos} ${r.filhos === 1 ? "subitem" : "subitens"}.`);
      }
    } catch (erro) {
      ok = false;
      toast.error(erro instanceof Error ? erro.message : "Não foi possível restaurar.");
    }
    if (ok) setAberto(false);
    aoMudar();
    setTimeout(() => { salvando.current = false; setTravado(false); }, 400);
  }

  return (
    <>
      <Button requiresWrite variant="outline" onClick={abrir}>Restaurar configurações iniciais</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Restaurar configurações iniciais</DialogTitle>
            <DialogDescription>
              Marque as ações (pais) e os subitens (filhos) do padrão inicial que quer restaurar. Não é preciso restaurar todos os filhos: os não marcados ficam como estão, e o que foi excluído é cadastrado de novo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground" data-testid="restaurar-contagem">{totalPais} de {padroes.length} ações e {totalFilhos} subitens marcados</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setMarcados((atual) => ({ ...atual, ...Object.fromEntries(visiveis.map(({ pai, filhos }) => [pai.nome, [...new Set([...(atual[pai.nome] ?? []), ...filhos.map((f) => f.nome)])]])) }))}>
                Marcar todos
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMarcados((atual) => (busca.trim() ? Object.fromEntries(Object.entries(atual).filter(([nome]) => !visiveis.some((v) => v.pai.nome === nome))) : {}))}>
                Desmarcar todos
              </Button>
            </div>
          </div>
          <Input type="search" aria-label="Buscar ação ou subitem" placeholder="Buscar ação ou subitem (ex.: filtro, bateria, empilhadeira)" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {busca.trim() && visiveis.length === 0 && criadosVisiveis.length === 0 && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground" role="status">
              Nenhuma ação ou subitem encontrado para “{busca.trim()}”. Não achou a ação de manutenção?{" "}
              <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => aoCadastrar(busca.trim())}>Cadastrar a ação</button>
              . Ao salvar, você volta para esta busca.
            </p>
          )}
          <ul className="grid max-h-[55vh] gap-3 overflow-y-auto md:grid-cols-2">
            {visiveis.map(({ pai: p, filhos }) => { const n = padroes.indexOf(p); return (
              <li key={p.nome} className="space-y-2 rounded-md border p-3">
                <label htmlFor={`restaurar-pai-${n}`} className="flex cursor-pointer items-start gap-2">
                  <Checkbox id={`restaurar-pai-${n}`} className="mt-0.5" checked={p.nome in marcados} onCheckedChange={(v) => marcarPai(p.nome, v === true, filhos.map((f) => f.nome))} />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{p.nome}</span>
                    <span className={p.situacao === "igual" ? "text-xs text-muted-foreground" : "text-xs font-semibold"}>{ROTULO_SITUACAO[p.situacao]}</span>
                  </span>
                </label>
                <ul className="space-y-1 pl-6">
                  {filhos.map((f) => { const m = p.filhos.indexOf(f); return (
                    <li key={f.nome}>
                      <label htmlFor={`restaurar-filho-${n}-${m}`} className="flex cursor-pointer items-start gap-2 text-xs">
                        <Checkbox id={`restaurar-filho-${n}-${m}`} className="mt-0.5 size-3.5" checked={marcados[p.nome]?.includes(f.nome) ?? false} onCheckedChange={(v) => marcarFilho(p.nome, f.nome, v === true)} />
                        <span>{f.nome}{!f.existe && <span className="ml-1 font-semibold">(não cadastrado)</span>}</span>
                      </label>
                    </li>
                  ); })}
                </ul>
              </li>
            ); })}
          </ul>
          {criadosVisiveis.length > 0 && (
            <section className="space-y-2" data-testid="restaurar-criados">
              <h3 className="text-sm font-semibold">Criados por você</h3>
              <p className="text-xs text-muted-foreground">{canDelete ? "Ações e subitens que não vieram do padrão inicial. Marque os que quer excluir e clique em Salvar. Para editar, use Editar na lista de ações." : "Ações e subitens que não vieram do padrão inicial. Só quem tem permissão de excluir pode removê-los; para editar, use Editar na lista de ações."}</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {criadosVisiveis.map(({ pai: item, filhos }) => (
                  <li key={item.id} className="space-y-2 rounded-md border border-dashed p-3">
                    <label htmlFor={`criado-pai-${item.id}`} className="flex cursor-pointer items-start gap-2">
                      {canDelete && <Checkbox id={`criado-pai-${item.id}`} className="mt-0.5" checked={conferidos.includes(item.id)} onCheckedChange={(v) => alternarConferido(item.id, v === true)} />}
                      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{item.nome}</span>
                        <span className="text-xs text-muted-foreground">{item.doPadrao ? "Subitens criados em ação do padrão" : "Ação criada por você"}</span>
                      </span>
                    </label>
                    <ul className="space-y-1 pl-6">
                      {filhos.map((f) => (
                        <li key={f.id}>
                          <label htmlFor={`criado-filho-${f.id}`} className="flex cursor-pointer items-start gap-2 text-xs">
                            {canDelete && <Checkbox id={`criado-filho-${f.id}`} className="mt-0.5 size-3.5" checked={conferidos.includes(f.id)} onCheckedChange={(v) => alternarConferido(f.id, v === true)} />}
                            <span>{f.nome}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="button" onClick={salvar} disabled={(totalPais === 0 && totalCriados === 0) || travado}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertaPainelManutencao aberto={aviso !== null} detalhe={aviso ?? undefined} texto={TEXTO_ALERTA_EQUIPAMENTO} onSim={gravar} onNao={() => setAviso(null)} />
    </>
  );
}
