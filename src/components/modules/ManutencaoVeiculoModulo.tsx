import { useRef, useState } from "react";

import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { combinaBusca } from "@/lib/parametros-base";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { montarManutencaoHtml } from "@/lib/manutencao-relatorio-html";
import { useVeiculos } from "@/lib/hooks-gemape";
import { custoNaoNegativo, editarManutencao, gruposDaManutencao, registrarManutencao, removerManutencao, resumoManutencao, type LocalManutencao, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { useManutencoesVeiculo } from "@/lib/use-registros-veiculo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// Módulos > Veículos > Manutenção (decisões 57 e 61): veículo, preventiva ou corretiva (só a
// corretiva descreve o que acontece), grupos de ações (pai, quantos a manutenção abranger), ações de
// cada grupo (filhos) com observação livre cada uma, local (empresa ou terceiro) e custo de peças e de mão de obra. A última
// preventiva de cada grupo alimenta as sugestões do extrato. Só modo demonstração.
const moeda = (n: number | undefined) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Total mostrado na tela, com a mesma leitura de valores que vale ao salvar; "—" se algum não for válido.
function totalDigitado(pecas: string, mao: string): string {
  const a = custoNaoNegativo(pecas);
  const b = custoNaoNegativo(mao);
  return a === null || b === null ? "—" : moeda(a + b);
}
const LOCAL: Record<LocalManutencao, string> = { empresa: "Na empresa", terceiro: "Terceiro" };

export function ManutencaoVeiculoModulo() {
  const { empresaId, empresas } = useEmpresa();
  const { isAdmin } = useAccess();
  const parametros = useParametrosBase();
  const { data: veiculos = [] } = useVeiculos(empresaId);
  const todas = useManutencoesVeiculo();
  const [aberto, setAberto] = useState(false);
  // Manutenção em edição; null é o cadastro de uma nova.
  const [editando, setEditando] = useState<ManutencaoVeiculo | null>(null);
  const [veiculoId, setVeiculoId] = useState("");
  const [tipo, setTipo] = useState("Preventiva");
  // Grupos marcados (pai) e, em cada um, as ações marcadas (filhos) com a observação livre.
  const [marcados, setMarcados] = useState<Record<string, Record<string, string>>>({});
  const [local, setLocal] = useState<LocalManutencao | "">("");
  const [custoPecas, setCustoPecas] = useState("");
  const [custoMao, setCustoMao] = useState("");
  const [busca, setBusca] = useState("");
  const trava = useRef(false);
  // Ações e observações de um grupo desmarcado: voltam se o grupo for marcado de novo (clique errado não perde o texto).
  const guardados = useRef<Record<string, Record<string, string>>>({});

  const acoes = parametros.acoesManutencaoVeiculo;
  const idsDaEmpresa = new Set(veiculos.map((v) => v.id));
  const servicoDe = (m: (typeof todas)[number]) => resumoManutencao(m, (id) => acoes.find((a) => a.id === id)?.nome);
  const lista = todas
    .filter((m) => idsDaEmpresa.has(m.veiculoId))
    .filter((m) => {
      const v = veiculos.find((x) => x.id === m.veiculoId);
      return combinaBusca(busca, v ? rotuloDoVeiculo(parametros, v) : "", m.tipo, servicoDe(m), formatarData(m.data), String(m.km));
    })
    .sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);

  if (!MODO_DEMO) {
    return <p className="text-sm text-muted-foreground">A manutenção de veículos estará disponível após a Fase 2 (banco real).</p>;
  }

  const numeroParaCampo = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

  function abrir(m?: ManutencaoVeiculo) {
    guardados.current = {};
    setEditando(m ?? null);
    setVeiculoId(m?.veiculoId ?? "");
    setTipo(m?.tipo ?? "Preventiva");
    setMarcados(
      Object.fromEntries(
        gruposDaManutencao(m ?? { acaoId: null, itens: [], grupos: [] }).map((g) => [
          g.acaoId, Object.fromEntries(g.itens.map((i) => [i.subitemId, i.observacao])),
        ]),
      ),
    );
    setLocal(m?.local ?? "");
    setCustoPecas(numeroParaCampo(m?.custoPecas));
    setCustoMao(numeroParaCampo(m?.custoMaoDeObra));
    setAberto(true);
  }

  // Relatório da manutenção, separado por grupo de serviço, no visualizador do sistema (imprimir ou salvar em PDF).
  function gerarRelatorio(m: ManutencaoVeiculo) {
    const v = veiculos.find((x) => x.id === m.veiculoId);
    const veiculo = v ? rotuloDoVeiculo(parametros, v) : "Veículo";
    const empresa = empresas.find((e) => e.id === v?.empresa_id)?.razao_social ?? "GEMAPE";
    abrirDocumento({
      titulo: "Relatório de manutenção",
      html: montarManutencaoHtml(m, { empresa, veiculo, nomeGrupo: (id) => acoes.find((a) => a.id === id)?.nome }),
      arquivo: nomeArquivoDocumento("Manutencao", veiculo, m.data),
    });
  }

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trava.current) return;
    const f = new FormData(e.currentTarget);
    trava.current = true;
    const entrada = {
      veiculoId, tipo, data: String(f.get("data") ?? ""), km: String(f.get("km") ?? ""),
      descricao: String(f.get("descricao") ?? ""),
      grupos: acoes
        .filter((g) => g.id in marcados)
        .map((g) => ({
          acaoId: g.id,
          itens: g.subitens.filter((x) => x.id in (marcados[g.id] ?? {})).map((x) => ({ subitemId: x.id, observacao: marcados[g.id]?.[x.id] ?? "" })),
        })),
      local, localNome: String(f.get("localNome") ?? ""), custoPecas, custoMaoDeObra: custoMao,
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
    if (ok) {
      setAberto(false);
      // Ao cadastrar, o relatório da manutenção abre na hora, separado por grupo de serviço.
      if (gravada && !editando) gerarRelatorio(gravada);
    }
  }

  function excluir(id: string) {
    if (!confirm("Excluir esta manutenção?")) return;
    executar(() => removerManutencao(id), "Manutenção excluída");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar manutenção"
          placeholder="Buscar por veículo, serviço ou tipo"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">{lista.length} manutenção(ões).</p>
        <Button requiresWrite className="ml-auto" onClick={() => abrir()}>Cadastrar nova manutenção</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Custo total</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhum resultado para a busca." : "Nenhuma manutenção registrada."}</TableCell></TableRow>
            )}
            {lista.map((m) => {
              const v = veiculos.find((x) => x.id === m.veiculoId);
              const servico = servicoDe(m);
              return (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.data)}</TableCell>
                  <TableCell>{v ? rotuloDoVeiculo(parametros, v) : "—"}</TableCell>
                  <TableCell><Badge variant={m.tipo === "Preventiva" ? "secondary" : "outline"}>{m.tipo}</Badge></TableCell>
                  <TableCell>
                    {gruposDaManutencao(m).length === 0 ? servico : (
                      <div className="space-y-1">
                        {gruposDaManutencao(m).map((g) => (
                          <p key={g.acaoId} className="leading-snug">
                            <span className="font-medium">{acoes.find((a) => a.id === g.acaoId)?.nome ?? (g.nome || "Ação removida de Parâmetros")}</span>
                            {g.itens.length > 0 && <span className="text-muted-foreground">: {g.itens.map((i) => i.nome).join(", ")}</span>}
                            {g.itens.filter((i) => i.observacao).map((i) => (
                              <span key={i.subitemId} className="block text-xs text-muted-foreground">{i.nome}: {i.observacao}</span>
                            ))}
                          </p>
                        ))}
                        {m.tipo === "Corretiva" && m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{m.local ? (m.local === "terceiro" && m.localNome ? `${LOCAL.terceiro}: ${m.localNome}` : LOCAL[m.local]) : "—"}</TableCell>
                  <TableCell className="text-right" title={m.custoTotal === undefined ? undefined : `Peças ${moeda(m.custoPecas)} + mão de obra ${moeda(m.custoMaoDeObra)}`}>
                    {m.custoTotal === undefined ? "—" : moeda(m.custoTotal)}
                  </TableCell>
                  <TableCell className="text-right">{m.km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" aria-label="Relatório da manutenção" onClick={() => gerarRelatorio(m)}>Relatório</Button>
                    <Button requiresWrite variant="ghost" size="sm" aria-label="Editar manutenção" onClick={() => abrir(m)}>Editar</Button>
                    {isAdmin && (
                      <Button requiresWrite variant="ghost" size="sm" aria-label="Excluir manutenção" className="text-destructive hover:text-destructive" onClick={() => excluir(m.id)}>
                        Excluir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
              <Select value={tipo} onValueChange={setTipo}>
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
                <Textarea id="descricao" name="descricao" rows={2} maxLength={300} defaultValue={editando?.descricao} placeholder="Ex.: barulho no freio dianteiro ao frear" />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Grupos de ações</Label>
              <p className="text-xs text-muted-foreground">Marque todos os grupos que a manutenção abrangeu e, em cada um, as ações feitas.</p>
              {acoes.length === 0 && (
                <p className="text-xs text-muted-foreground">Cadastre os grupos em Parâmetros &gt; Veículos &gt; Ações de manutenção.</p>
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
                          {marcado && (
                            <Textarea
                              aria-label={`Observação de ${sub.nome}`}
                              placeholder="Observação (opcional)"
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Local da manutenção</Label>
              <RadioGroup value={local} onValueChange={(v) => setLocal(v as LocalManutencao)} className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="empresa" id="local_empresa" />Na própria empresa</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="terceiro" id="local_terceiro" />Local de terceiro</label>
              </RadioGroup>
              {local === "terceiro" && <Input name="localNome" aria-label="Local de terceiro" maxLength={120} defaultValue={editando?.localNome} placeholder="Nome do local (oficina, concessionária…)" />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custo_pecas">Custo das peças (R$)</Label>
              <Input id="custo_pecas" inputMode="decimal" placeholder="Ex.: 1.200,00 (0 se não houve)" value={custoPecas} onChange={(e) => setCustoPecas(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custo_mao">Custo da mão de obra (R$)</Label>
              <Input id="custo_mao" inputMode="decimal" placeholder="Ex.: 300,00 (0 se não houve)" value={custoMao} onChange={(e) => setCustoMao(e.target.value)} />
            </div>
            <p className="text-sm sm:col-span-2">
              Custo total: <strong>{totalDigitado(custoPecas, custoMao)}</strong>
            </p>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
