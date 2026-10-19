import { useEffect, useRef, useState } from "react";

import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogAcoesManutencao } from "@/components/modules/DialogAcoesManutencao";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { useVeiculos } from "@/lib/hooks-gemape";
import { ehOutros } from "@/lib/veiculos-padrao";
import { custoNaoNegativo, editarManutencao, gruposDaManutencao, locaisDaManutencao, registrarManutencao, type LocalManutencao, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// Janela "Cadastrar nova manutenção" de Módulos > Veículos > Manutenção (decisões 57, 61, 79 e 161): veículo, preventiva ou corretiva,
// grupos de ações com as ações feitas, locais (empresa ou terceiros) e custos. É usada na tela do módulo e no card Manutenção do veículo
// de trabalho de Viagens (dec 226), que aproveita a data, os serviços e o custo total do registro gravado. Só modo demonstração.
const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Total mostrado na tela, com a mesma leitura de valores que vale ao salvar; "—" se algum não for válido.
function totalDigitado(pecas: string, mao: string): string {
  const a = custoNaoNegativo(pecas);
  const b = custoNaoNegativo(mao);
  return a === null || b === null ? "—" : moeda(a + b);
}
// Local em edição (dec 161): a Gemape ou um terceiro, cada um com descrição, pagamento combinado e custos.
type LocalForm = { chave: string; local: LocalManutencao; nome: string; descricao: string; condicaoPagamento: string; custoPecas: string; custoMao: string };
let sequenciaLocal = 0;
const novoLocal = (local: LocalManutencao): LocalForm => ({ chave: `local-${++sequenciaLocal}`, local, nome: "", descricao: "", condicaoPagamento: "", custoPecas: "", custoMao: "" });
const campoParaNumero = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));
// Soma dos custos digitados de todos os locais; "—" se algum valor não for válido.
function totalGeral(locais: LocalForm[]): string {
  let soma = 0;
  for (const l of locais) {
    const a = custoNaoNegativo(l.custoPecas);
    const b = custoNaoNegativo(l.custoMao);
    if (a === null || b === null) return "—";
    soma += a + b;
  }
  return moeda(soma);
}

export function NovaManutencaoDialog({
  aberto, aoMudar, editando = null, aoSalvar, tipoFixo,
}: {
  aberto: boolean; aoMudar: (aberto: boolean) => void; editando?: ManutencaoVeiculo | null; aoSalvar: (registro: ManutencaoVeiculo, editou: boolean) => void;
  // Vindo de uma despesa de manutenção: abre neste tipo e o campo Tipo fica travado (a despesa é sempre Corretiva).
  tipoFixo?: string;
}) {
  const { empresaId } = useEmpresa();
  const { canWrite } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const [veiculoId, setVeiculoId] = useState("");
  const [tipo, setTipo] = useState("Preventiva");
  // Grupos marcados (pai) e, em cada um, as ações marcadas (filhos) com a observação livre.
  const [marcados, setMarcados] = useState<Record<string, Record<string, string>>>({});
  const [locais, setLocais] = useState<LocalForm[]>([]);
  // Ações não feitas de cada grupo, com a observação de por que merecem atenção antes do prazo do plano.
  const [naoFeitos, setNaoFeitos] = useState<Record<string, Record<string, string>>>({});
  const [acoesAberto, setAcoesAberto] = useState(false);
  const trava = useRef(false);
  // Ações e observações de um grupo desmarcado: voltam se o grupo for marcado de novo (clique errado não perde o texto).
  const guardados = useRef<Record<string, Record<string, string>>>({});
  const acoes = parametros.acoesManutencaoVeiculo;

  // Cada abertura recomeça do registro em edição ou vazia.
  useEffect(() => {
    if (!aberto) return;
    const m = editando ?? undefined;
    guardados.current = {};
    setVeiculoId(m?.veiculoId ?? "");
    setTipo(m?.tipo ?? tipoFixo ?? "Preventiva");
    setMarcados(
      Object.fromEntries(
        gruposDaManutencao(m ?? { acaoId: null, itens: [], grupos: [] }).map((g) => [
          g.acaoId, Object.fromEntries(g.itens.map((i) => [i.subitemId, i.observacao])),
        ]),
      ),
    );
    setNaoFeitos(
      Object.fromEntries(
        gruposDaManutencao(m ?? { acaoId: null, itens: [], grupos: [] }).map((g) => [
          g.acaoId, Object.fromEntries((g.naoRealizados ?? []).map((n) => [n.subitemId, n.observacao])),
        ]),
      ),
    );
    setLocais(
      m
        ? locaisDaManutencao(m).map((l) => ({
            ...novoLocal(l.local), nome: l.nome, descricao: l.descricao, condicaoPagamento: l.condicaoPagamento,
            custoPecas: campoParaNumero(l.custoPecas), custoMao: campoParaNumero(l.custoMaoDeObra),
          }))
        : [],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    const entrada = {
      veiculoId, tipo, data: String(f.get("data") ?? ""), km: String(f.get("km") ?? ""),
      descricao: capitalizarTexto(String(f.get("descricao") ?? "")),
      grupos: acoes
        .filter((g) => g.id in marcados)
        .map((g) => ({
          acaoId: g.id,
          itens: g.subitens.filter((x) => x.id in (marcados[g.id] ?? {})).map((x) => ({ subitemId: x.id, observacao: capitalizarTexto(marcados[g.id]?.[x.id] ?? "") })),
          naoRealizados: g.subitens
            .filter((x) => !(x.id in (marcados[g.id] ?? {})) && (naoFeitos[g.id]?.[x.id] ?? "").trim())
            .map((x) => ({ subitemId: x.id, observacao: capitalizarTexto(naoFeitos[g.id]?.[x.id] ?? "") })),
        })),
      locais: locais.map((l) => ({
        local: l.local, nome: capitalizarTexto(l.nome), descricao: capitalizarTexto(l.descricao),
        condicaoPagamento: capitalizarTexto(l.condicaoPagamento), custoPecas: l.custoPecas, custoMaoDeObra: l.custoMao,
      })),
    };
    let gravada: ManutencaoVeiculo | undefined;
    const ok = executar(
      () => {
        gravada = editando
          ? editarManutencao(editando.id, entrada, undefined, new Date(), acoes)
          : registrarManutencao(entrada, undefined, new Date(), acoes);
      },
      editando ? "Manutenção alterada" : "Manutenção registrada",
    );
    // Depois de gravar, a trava fica um instante: o diálogo ainda está na tela na animação de saída.
    if (ok) window.setTimeout(() => { trava.current = false; }, 800);
    else trava.current = false;
    if (ok && gravada) {
      aoMudar(false);
      aoSalvar(gravada, editando !== null);
    }
  }

  return (
    <>
      <Dialog open={aberto} onOpenChange={aoMudar}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar manutenção" : "Cadastrar nova manutenção"}</DialogTitle>
            <DialogDescription>Marque os grupos de ações abrangidos e o que foi feito em cada um; só a corretiva descreve o problema.</DialogDescription>
          </DialogHeader>
          <form key={editando?.id ?? "nova"} onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="veiculo">Veículo</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger id="veiculo"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => <SelectItem key={v.id} value={v.id}>{rotuloDoVeiculo(parametros, v)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo} disabled={Boolean(tipoFixo)}>
                <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={editando?.data ?? hojeLocal()} max={hojeLocal()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="km">Km do veículo</Label>
              <Input id="km" name="km" inputMode="numeric" placeholder="Ex.: 50.000" defaultValue={editando ? String(editando.km) : undefined} />
            </div>
            {tipo === "Corretiva" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="descricao">O que está acontecendo com o veículo</Label>
                <Textarea id="descricao" capitalizar="texto" name="descricao" rows={2} maxLength={300} defaultValue={editando?.descricao} placeholder="Ex.: barulho no freio dianteiro ao frear" />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Grupos de ações</Label>
              <p className="text-xs text-muted-foreground">Marque todos os grupos que a manutenção abrangeu e, em cada um, as ações feitas.</p>
              {acoes.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum grupo de ações cadastrado ainda.</p>
              )}
              {acoes.map((grupo) => {
                const grupoMarcado = grupo.id in marcados;
                const filhosMarcados = marcados[grupo.id] ?? {};
                return (
                  <div key={grupo.id} className="space-y-2 rounded-lg border p-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        aria-label={`Grupo ${grupo.nome}`}
                        checked={grupoMarcado}
                        onCheckedChange={(v) =>
                          setMarcados((m) => {
                            const { [grupo.id]: atuais, ...resto } = m;
                            if (v !== true) {
                              if (atuais) guardados.current[grupo.id] = atuais;
                              return resto;
                            }
                            return { ...resto, [grupo.id]: atuais ?? guardados.current[grupo.id] ?? {} };
                          })}
                      />
                      {grupo.nome}
                    </label>
                    {grupoMarcado && grupo.subitens.length === 0 && <p className="text-xs text-muted-foreground">Este grupo não tem ações cadastradas.</p>}
                    {grupoMarcado && grupo.subitens.map((sub) => {
                      const marcado = sub.id in filhosMarcados;
                      return (
                        <div key={sub.id} className="ml-6 space-y-1.5 rounded-lg border p-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              aria-label={`${grupo.nome}: ${sub.nome}`}
                              checked={marcado}
                              onCheckedChange={(v) =>
                                setMarcados((m) => {
                                  const atuais = m[grupo.id] ?? {};
                                  const { [sub.id]: _, ...resto } = atuais;
                                  return { ...m, [grupo.id]: v === true ? { ...resto, [sub.id]: atuais[sub.id] ?? "" } : resto };
                                })}
                            />
                            {sub.nome}
                          </label>
                          {!marcado && !ehOutros(sub.nome) && (
                            <Input
                              capitalizar="texto"
                              aria-label={`Observação do item não feito ${sub.nome}`}
                              placeholder="Não feito? Observação para voltar a olhar antes do prazo (opcional)"
                              maxLength={300}
                              value={naoFeitos[grupo.id]?.[sub.id] ?? ""}
                              onChange={(e) => setNaoFeitos((n) => ({ ...n, [grupo.id]: { ...(n[grupo.id] ?? {}), [sub.id]: e.target.value } }))}
                            />
                          )}
                          {marcado && (
                            <Textarea
                              capitalizar="texto"
                              aria-label={ehOutros(sub.nome) ? `Descrição de ${sub.nome}` : `Observação de ${sub.nome}`}
                              placeholder={ehOutros(sub.nome) ? "Descreva o que foi feito (obrigatório)" : "Observação (opcional)"}
                              rows={2}
                              maxLength={300}
                              value={filhosMarcados[sub.id] ?? ""}
                              onChange={(e) => setMarcados((m) => ({ ...m, [grupo.id]: { ...(m[grupo.id] ?? {}), [sub.id]: e.target.value } }))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {canWrite && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Falta um grupo ou uma ação?{" "}
                <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setAcoesAberto(true)}>
                  Cadastrar em Parâmetros &gt; Veículos &gt; Manutenção
                </button>
              </p>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Locais da manutenção</Label>
              <p className="text-xs text-muted-foreground">Lance a parte feita na Gemape e cada terceiro, cada um com o serviço, o pagamento combinado e os custos. O relatório mostra o custo de cada local.</p>
              {locais.length === 0 && <p className="text-xs text-muted-foreground">Nenhum local lançado ainda.</p>}
              {locais.map((l, i) => {
                const mudar = (parte: Partial<LocalForm>) => setLocais((ls) => ls.map((x) => (x.chave === l.chave ? { ...x, ...parte } : x)));
                const titulo = l.local === "empresa" ? "Na própria empresa (Gemape)" : `Terceiro ${locais.filter((x, j) => x.local === "terceiro" && j <= i).length}`;
                return (
                  <div key={l.chave} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{titulo}</p>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={`Remover ${titulo}`} onClick={() => setLocais((ls) => ls.filter((x) => x.chave !== l.chave))}>Remover</Button>
                    </div>
                    {l.local === "terceiro" && (
                      <Input capitalizar="texto" aria-label={`Nome do ${titulo}`} maxLength={120} value={l.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Nome do local (oficina, concessionária…)" />
                    )}
                    <Textarea capitalizar="texto" aria-label={`Descrição do serviço, ${titulo}`} rows={2} maxLength={300} value={l.descricao} onChange={(e) => mudar({ descricao: e.target.value })} placeholder="Descrição do serviço feito neste local" />
                    <Input capitalizar="texto" aria-label={`Condição de pagamento, ${titulo}`} maxLength={120} value={l.condicaoPagamento} onChange={(e) => mudar({ condicaoPagamento: e.target.value })} placeholder="Condição de pagamento combinada (ex.: 30 dias, à vista)" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`pecas-${l.chave}`}>Custo das peças (R$)</Label>
                        <Input id={`pecas-${l.chave}`} inputMode="decimal" placeholder="Ex.: 1.200,00 (0 se não houve)" value={l.custoPecas} onChange={(e) => mudar({ custoPecas: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`mao-${l.chave}`}>Custo da mão de obra (R$)</Label>
                        <Input id={`mao-${l.chave}`} inputMode="decimal" placeholder="Ex.: 300,00 (0 se não houve)" value={l.custoMao} onChange={(e) => mudar({ custoMao: e.target.value })} />
                      </div>
                    </div>
                    <p className="text-sm">Custo deste local: <strong>{totalDigitado(l.custoPecas, l.custoMao)}</strong></p>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={locais.some((l) => l.local === "empresa")} onClick={() => setLocais((ls) => [novoLocal("empresa"), ...ls])}>Adicionar local na Gemape</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setLocais((ls) => [...ls, novoLocal("terceiro")])}>Adicionar terceiro</Button>
              </div>
            </div>
            <p className="text-sm sm:col-span-2">
              Custo total da manutenção: <strong>{totalGeral(locais)}</strong>
            </p>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => aoMudar(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DialogAcoesManutencao aberto={acoesAberto} onAbrirMudou={setAcoesAberto} />
    </>
  );
}
