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
import { filtrarPaisEFilhos } from "@/lib/busca-acoes-manutencao";
import { custoNaoNegativo, editarManutencao, gruposDaManutencao, locaisDaManutencao, registrarManutencao, servicoDoLocal, type LocalManutencao, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// Janela "Cadastrar nova manutenção" de Módulos > Veículos > Manutenção (decisões 57, 61, 79 e 161): veículo, preventiva ou corretiva,
// grupos de ações com as ações feitas, locais (empresa ou terceiros) e custos. É usada na tela do módulo e no card Manutenção do veículo
// de trabalho de Viagens (dec 226), que aproveita a data, os serviços e o custo total do registro gravado. Só modo demonstração.
const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Local em edição (dec 161): a Gemape ou um terceiro, cada um com descrição, pagamento combinado e custos.
type LocalForm = { chave: string; local: LocalManutencao; nome: string; descricao: string; condicaoPagamento: string; custoPecas: string; custoMao: string };
let sequenciaLocal = 0;
const novoLocal = (local: LocalManutencao): LocalForm => ({ chave: `local-${++sequenciaLocal}`, local, nome: "", descricao: "", condicaoPagamento: "", custoPecas: "", custoMao: "" });
const campoParaNumero = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));
// Onde foi feita cada ação marcada e os custos dela (dec 232): o custo e o serviço do local vêm dos itens ligados a ele.
type DetalheItem = { chaveLocal: string; pecas: string; mao: string };
const chaveItem = (grupoId: string, subId: string) => `${grupoId}/${subId}`;
const semDetalhe: DetalheItem = { chaveLocal: "", pecas: "", mao: "" };
const valorOuZero = (t: string) => (t.trim() === "" ? 0 : custoNaoNegativo(t));
// Soma dos custos dos itens; vazio vale 0 e `null` se algum valor não for válido.
function custosDosItens(itens: DetalheItem[]): { pecas: number; mao: number } | null {
  let pecas = 0;
  let mao = 0;
  for (const d of itens) {
    const a = valorOuZero(d.pecas);
    const b = valorOuZero(d.mao);
    if (a === null || b === null) return null;
    pecas += a;
    mao += b;
  }
  return { pecas, mao };
}
// Soma do custo de todos os locais; "—" se algum valor não for válido.
function totalGeral(locais: LocalForm[], totalDoLocal: (l: LocalForm) => number | null): string {
  let soma = 0;
  for (const l of locais) {
    const t = totalDoLocal(l);
    if (t === null) return "—";
    soma += t;
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
  const [busca, setBusca] = useState("");
  const [detalhes, setDetalhes] = useState<Record<string, DetalheItem>>({});
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
    const locaisIniciais = m
      ? locaisDaManutencao(m).map((l) => ({
          ...novoLocal(l.local), nome: l.nome, descricao: l.descricao, condicaoPagamento: l.condicaoPagamento,
          custoPecas: campoParaNumero(l.custoPecas), custoMao: campoParaNumero(l.custoMaoDeObra),
        }))
      : [];
    setLocais(locaisIniciais);
    setBusca("");
    setDetalhes(
      Object.fromEntries(
        gruposDaManutencao(m ?? { acaoId: null, itens: [], grupos: [] }).flatMap((g) =>
          g.itens
            .filter((i) => i.localIndice !== undefined)
            .map((i) => [chaveItem(g.acaoId, i.subitemId), {
              chaveLocal: locaisIniciais[i.localIndice as number]?.chave ?? "",
              pecas: campoParaNumero(i.custoPecas), mao: campoParaNumero(i.custoMaoDeObra),
            }] as const),
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Busca nos grupos e ações (o grupo que combina mostra todas as ações; senão, só as que combinam).
  const visiveis = filtrarPaisEFilhos(acoes.map((g) => ({ ...g, nome: g.nome ?? "", filhos: g.subitens })), busca);
  // Ações marcadas com o local e os custos de cada uma.
  const acoesMarcadas = acoes
    .filter((g) => g.id in marcados)
    .flatMap((g) => g.subitens.filter((x) => x.id in (marcados[g.id] ?? {})).map((x) => ({ grupo: g, sub: x, d: detalhes[chaveItem(g.id, x.id)] ?? semDetalhe })));
  const itensDoLocal = (chave: string) => acoesMarcadas.filter((a) => a.d.chaveLocal === chave);
  const indiceDoLocal = (chave: string) => {
    const i = locais.findIndex((l) => l.chave === chave);
    return i >= 0 ? i : undefined;
  };
  // Serviço de cada local, montado das ações ligadas a ele (o mesmo texto que a gravação usa).
  const servicoDe = (chave: string) => {
    const i = indiceDoLocal(chave);
    if (i === undefined) return "";
    return servicoDoLocal(
      acoes.filter((g) => g.id in marcados).map((g) => ({
        nome: g.nome ?? "",
        itens: g.subitens.filter((x) => x.id in (marcados[g.id] ?? {})).map((x) => ({ nome: x.nome, localIndice: indiceDoLocal((detalhes[chaveItem(g.id, x.id)] ?? semDetalhe).chaveLocal) })),
      })),
      i,
    );
  };
  // Local com ações: custo é a soma delas. Sem ações, vale o que foi digitado no próprio local.
  const totalDoLocal = (l: LocalForm): number | null => {
    const itens = itensDoLocal(l.chave);
    if (itens.length > 0) {
      const c = custosDosItens(itens.map((a) => a.d));
      return c ? c.pecas + c.mao : null;
    }
    const a = custoNaoNegativo(l.custoPecas);
    const b = custoNaoNegativo(l.custoMao);
    return a === null || b === null ? null : a + b;
  };
  const tituloDoLocal = (l: LocalForm, i: number) =>
    l.local === "empresa" ? "Na própria empresa (Gemape)" : `Terceiro ${locais.filter((x, j) => x.local === "terceiro" && j <= i).length}${l.nome.trim() ? `: ${l.nome.trim()}` : ""}`;
  const mudarDetalhe = (grupoId: string, subId: string, parte: Partial<DetalheItem>) =>
    setDetalhes((d) => ({ ...d, [chaveItem(grupoId, subId)]: { ...(d[chaveItem(grupoId, subId)] ?? semDetalhe), ...parte } }));
  // Com um único local, as ações marcadas já vão para ele (sem o usuário escolher).
  function adicionarLocal(tipoLocal: LocalManutencao) {
    const novo = novoLocal(tipoLocal);
    const resultado = tipoLocal === "empresa" ? [novo, ...locais] : [...locais, novo];
    setLocais(resultado);
    if (resultado.length === 1) {
      setDetalhes((d) => {
        const n = { ...d };
        for (const a of acoesMarcadas) {
          const k = chaveItem(a.grupo.id, a.sub.id);
          n[k] = { ...(n[k] ?? semDetalhe), chaveLocal: n[k]?.chaveLocal || novo.chave };
        }
        return n;
      });
    }
  }
  // Remover um local solta as ações dele (voltam a ficar sem local); os custos digitados ficam.
  function removerLocal(chave: string) {
    setLocais((ls) => ls.filter((x) => x.chave !== chave));
    setDetalhes((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.chaveLocal === chave ? { ...v, chaveLocal: "" } : v])));
  }

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
          itens: g.subitens.filter((x) => x.id in (marcados[g.id] ?? {})).map((x) => {
            const d = detalhes[chaveItem(g.id, x.id)] ?? semDetalhe;
            const indice = indiceDoLocal(d.chaveLocal);
            return {
              subitemId: x.id, observacao: capitalizarTexto(marcados[g.id]?.[x.id] ?? ""),
              ...(indice !== undefined ? { localIndice: indice } : {}), custoPecas: d.pecas, custoMaoDeObra: d.mao,
            };
          }),
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
              {acoes.length > 0 && (
                <Input aria-label="Buscar grupo ou ação" type="search" placeholder="Buscar grupo ou ação…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              )}
              {acoes.length > 0 && visiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhum grupo ou ação encontrado para “{busca}”.</p>}
              {visiveis.map(({ pai: grupo, filhos }) => {
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
                    {grupoMarcado && filhos.map((sub) => {
                      const marcado = sub.id in filhosMarcados;
                      return (
                        <div key={sub.id} className="ml-6 space-y-1.5 rounded-lg border p-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              aria-label={`${grupo.nome}: ${sub.nome}`}
                              checked={marcado}
                              onCheckedChange={(v) => {
                                setMarcados((m) => {
                                  const atuais = m[grupo.id] ?? {};
                                  const { [sub.id]: _, ...resto } = atuais;
                                  return { ...m, [grupo.id]: v === true ? { ...resto, [sub.id]: atuais[sub.id] ?? "" } : resto };
                                });
                                // Com um único local lançado, a ação marcada já vai para ele.
                                if (v === true && locais.length === 1) mudarDetalhe(grupo.id, sub.id, { chaveLocal: detalhes[chaveItem(grupo.id, sub.id)]?.chaveLocal || locais[0]!.chave });
                              }}
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
                          {marcado && (locais.length !== 1 || !detalhes[chaveItem(grupo.id, sub.id)]?.chaveLocal) && (
                            <Select
                              value={detalhes[chaveItem(grupo.id, sub.id)]?.chaveLocal ?? ""}
                              onValueChange={(v) => v && mudarDetalhe(grupo.id, sub.id, { chaveLocal: v })}
                              disabled={locais.length === 0}
                            >
                              <SelectTrigger aria-label={`Onde foi feito: ${sub.nome}`}>
                                <SelectValue placeholder={locais.length === 0 ? "Adicione um local abaixo para levar esta ação a ele" : "Onde foi feito"} />
                              </SelectTrigger>
                              <SelectContent>
                                {locais.map((l, i) => <SelectItem key={l.chave} value={l.chave}>{tituloDoLocal(l, i)}</SelectItem>)}
                              </SelectContent>
                            </Select>
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
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={`Remover ${titulo}`} onClick={() => removerLocal(l.chave)}>Remover</Button>
                    </div>
                    {l.local === "terceiro" && (
                      <Input capitalizar="texto" aria-label={`Nome do ${titulo}`} maxLength={120} value={l.nome} onChange={(e) => mudar({ nome: e.target.value })} placeholder="Nome do local (oficina, concessionária…)" />
                    )}
                    {itensDoLocal(l.chave).length > 0 ? (
                      <p className="rounded-md border bg-muted/40 p-2 text-sm">Serviço (das ações marcadas): {servicoDe(l.chave)}</p>
                    ) : (
                      <Textarea capitalizar="texto" aria-label={`Descrição do serviço, ${titulo}`} rows={2} maxLength={300} value={l.descricao} onChange={(e) => mudar({ descricao: e.target.value })} placeholder="Descrição do serviço feito neste local" />
                    )}
                    <Input capitalizar="texto" aria-label={`Condição de pagamento, ${titulo}`} maxLength={120} value={l.condicaoPagamento} onChange={(e) => mudar({ condicaoPagamento: e.target.value })} placeholder="Condição de pagamento combinada (ex.: 30 dias, à vista)" />
                    {itensDoLocal(l.chave).length > 0 ? (
                      <div className="space-y-2">
                        <ul className="space-y-1.5">
                          {itensDoLocal(l.chave).map((a) => {
                            const pecas = valorOuZero(a.d.pecas);
                            const mao = valorOuZero(a.d.mao);
                            const obs = marcados[a.grupo.id]?.[a.sub.id]?.trim();
                            return (
                              <li key={`${a.grupo.id}/${a.sub.id}`} data-detalhe-item className="rounded-md border bg-muted/40 p-2 text-sm">
                                <p className="font-medium">{a.sub.nome} <span className="text-xs font-normal text-muted-foreground">({a.grupo.nome})</span></p>
                                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                  <Input
                                    inputMode="decimal"
                                    aria-label={`Custo das peças de ${a.sub.nome}`}
                                    placeholder="Peças (R$)"
                                    value={a.d.pecas}
                                    onChange={(e) => mudarDetalhe(a.grupo.id, a.sub.id, { pecas: e.target.value })}
                                  />
                                  <Input
                                    inputMode="decimal"
                                    aria-label={`Custo da mão de obra de ${a.sub.nome}`}
                                    placeholder="Mão de obra (R$)"
                                    value={a.d.mao}
                                    onChange={(e) => mudarDetalhe(a.grupo.id, a.sub.id, { mao: e.target.value })}
                                  />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Total desta ação: {pecas === null || mao === null ? "—" : moeda(pecas + mao)}
                                </p>
                                {obs && <p className="text-xs">{obs}</p>}
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-xs text-muted-foreground">
                          Peças e mão de obra somados das ações marcadas neste local
                          {(() => { const c = custosDosItens(itensDoLocal(l.chave).map((a) => a.d)); return c ? `: ${moeda(c.pecas)} em peças e ${moeda(c.mao)} em mão de obra.` : "."; })()}
                        </p>
                      </div>
                    ) : (
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
                    )}
                    <p className="text-sm">Custo deste local: <strong>{(() => { const t = totalDoLocal(l); return t === null ? "—" : moeda(t); })()}</strong></p>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={locais.some((l) => l.local === "empresa")} onClick={() => adicionarLocal("empresa")}>Adicionar local na Gemape</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => adicionarLocal("terceiro")}>Adicionar terceiro</Button>
              </div>
            </div>
            <p className="text-sm sm:col-span-2">
              Custo total da manutenção: <strong>{totalGeral(locais, totalDoLocal)}</strong>
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
