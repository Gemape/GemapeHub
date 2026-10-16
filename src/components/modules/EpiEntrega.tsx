import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeletorTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { emPosseEpi, lerHistoricoEpiPorItem, MENSAGEM_SO_ADMIN, registrarDevolucaoEpi, registrarEntregaEpi, type CalculoAlerta } from "@/lib/entrega-epi";
import { estadoEstoqueModulo, nomeTamanho, nomeTamanhoGravado, tamanhoParaGravar, validarLinhasTamanho } from "@/lib/estoque-tamanho";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { useEmpregados, useEmpresas, useItens } from "@/lib/hooks-gemape";
import { MODO_DEMO } from "@/lib/modo-demo";
import { montarTermoEntregaEpiHtml } from "@/lib/termo-entrega-epi-html";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

type Linha = { id: string; item_id: string; quantidade: number; tamanho: string };
const TODOS = "todos";
const novaLinha = (): Linha => ({ id: Math.random().toString(36).slice(2, 11), item_id: "", quantidade: 1, tamanho: "" });
const ROTULO_TIPO: Record<string, string> = { Saida: "Entrega", Devolucao: "Devolução", Entrada: "Entrada" };

export function EpiEntrega() {
  const { empresaId } = useEmpresa();
  const { isAdmin, canOperate } = useAccess();
  const queryClient = useQueryClient();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const responsavelPadrao = String((user?.user_metadata as { nome?: unknown } | undefined)?.nome ?? user?.email ?? "");

  const [modo, setModo] = useState<"entrega" | "devolucao">("entrega");
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [data, setData] = useState(hojeLocal());
  const [observacao, setObservacao] = useState("");
  const [responsavel, setResponsavel] = useState(responsavelPadrao);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [ultima, setUltima] = useState<{ codigos: string[]; html: string; arquivo: string } | null>(null);
  const [filtroItem, setFiltroItem] = useState(TODOS);
  const [filtroEmpregado, setFiltroEmpregado] = useState(TODOS);
  const salvando = useRef(false);
  const [gravando, setGravando] = useState(false);

  const { data: empresas = [] } = useEmpresas();
  // Empresa inativa não é escolhida: se o cabeçalho está nela, a escolha começa vazia.
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  useEffect(() => { if (!responsavel) setResponsavel(responsavelPadrao); }, [responsavelPadrao, responsavel]);

  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", empresaSel || TODAS);
  const parametros = useParametrosBase();
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);

  // Histórico completo da empresa (sem o limite de 1000 linhas), filtrado por EPI e empregado.
  const historico = useQuery({
    queryKey: ["epi-entrega-historico", empresaSel, filtroItem, filtroEmpregado],
    enabled: Boolean(empresaSel),
    queryFn: () => lerHistoricoEpiPorItem(supabase, {
      empresaId: empresaSel,
      ...(filtroItem !== TODOS ? { itemId: filtroItem } : {}),
      ...(filtroEmpregado !== TODOS ? { empregadoId: filtroEmpregado } : {}),
    }),
  });
  // O que o empregado tem em posse, para a devolução.
  const doEmpregado = useQuery({
    queryKey: ["epi-entrega-em-posse", empresaSel, empregadoId],
    enabled: Boolean(empresaSel && empregadoId && modo === "devolucao"),
    queryFn: () => lerHistoricoEpiPorItem(supabase, { empresaId: empresaSel, empregadoId }),
  });
  const movimentosDoEmpregado = doEmpregado.data ?? [];
  const itensEmPosse = useMemo(
    () => itens.filter((i) => emPosseEpi(movimentosDoEmpregado, empregadoId, i.id, null) > 0),
    [itens, movimentosDoEmpregado, empregadoId],
  );

  const alertas = useMemo(
    () => itens.map((i) => ({ item: i, estado: estadoEstoqueModulo(parametros, "epi", i) })).filter((x) => x.estado.alerta && (x.estado.minimo > 0 || x.estado.saldo === 0)),
    [itens, parametros],
  );
  const calcularAlerta: CalculoAlerta = (item) => {
    const e = estadoEstoqueModulo(parametros, "epi", item as never);
    return { alerta: e.alerta, saldo: e.saldo, minimo: e.minimo };
  };

  function mudarLinha(id: string, campo: keyof Linha, valor: string | number) {
    setLinhas((atuais) => atuais.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  }
  function trocarModo(novo: "entrega" | "devolucao") {
    setModo(novo);
    setLinhas([]);
    setUltima(null);
  }

  async function salvar() {
    if (salvando.current) return;
    if (!empregado || !empresa) { alert("Escolha a empresa e o empregado."); return; }
    if (linhas.length === 0) { alert("Adicione pelo menos um EPI."); return; }
    if (!data) { alert("Informe a data."); return; }
    const devolucao = modo === "devolucao";
    if (devolucao && !isAdmin) { alert(MENSAGEM_SO_ADMIN); return; }
    const bloqueio = bloqueioPorDemissao(empregado, devolucao ? "devolucao" : "entrega", data);
    if (bloqueio) { alert(bloqueio); return; }
    if (TAMANHO_DISPONIVEL) {
      const erroTamanho = validarLinhasTamanho(linhas, itens, parametros, "epi", devolucao ? "devolução" : "entrega");
      if (erroTamanho) { alert(erroTamanho); return; }
    }
    const entrada = {
      empresaId: empresa.id,
      empregado,
      linhas: linhas.map((l) => {
        const tamanho = tamanhoParaGravar(l.tamanho, devolucao);
        return { item_id: l.item_id, quantidade: l.quantidade, ...(TAMANHO_DISPONIVEL ? { tamanho_id: tamanho ?? null } : {}) };
      }),
      data,
      observacao,
      comCodigo: MODO_DEMO,
      calcularAlerta,
    };
    salvando.current = true;
    setGravando(true);
    try {
      const r = devolucao
        ? await registrarDevolucaoEpi(supabase, { ...entrada, administrador: isAdmin, responsavel })
        : await registrarEntregaEpi(supabase, entrada);
      queryClient.invalidateQueries();
      toast.success(devolucao ? "Devolução registrada" : "Entrega registrada", { description: r.codigos.join(", ") || undefined });
      for (const a of r.alertas) toast.warning(`${a.nome} chegou ao estoque mínimo`, { description: `Saldo ${a.saldo} de mínimo ${a.minimo}.` });
      if (!devolucao) {
        setUltima({
          codigos: r.codigos,
          arquivo: nomeArquivoDocumento("Termo de Entrega de EPI", empregado.nome, data),
          html: montarTermoEntregaEpiHtml({
            empresa, empregado, data,
            linhas: linhas.map((l) => {
              const info = itens.find((i) => i.id === l.item_id);
              return { nome: info?.nome, ca: info?.ca, tamanho: tamanhoParaGravar(l.tamanho) ? nomeTamanho(parametros, l.tamanho) : undefined, quantidade: l.quantidade, estado: "Novo" };
            }),
          }),
        });
      }
      // Limpa a lista para um segundo clique não registrar a mesma movimentação de novo.
      setLinhas([]);
      setObservacao("");
    } catch (erro) {
      alert((erro as Error).message);
    } finally {
      salvando.current = false;
      setGravando(false);
    }
  }

  const nomeDoEmpregado = (id: string | null | undefined) => empregados.find((e) => e.id === id)?.nome ?? "—";
  const nomeDoItem = (id: string | null) => itens.find((i) => i.id === id);
  const movimentos = historico.data ?? [];
  const escolhaItens = modo === "devolucao" ? itensEmPosse : itens;

  return (
    <div className="space-y-6">
      {alertas.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Estoque no mínimo ou abaixo:</strong>{" "}
          {alertas.map(({ item, estado }) => `${item.codigo_sku} ${item.nome} (saldo ${estado.saldo}, mínimo ${estado.minimo})`).join("; ")}
        </div>
      )}

      <div className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={modo === "entrega" ? "default" : "outline"} onClick={() => trocarModo("entrega")}>Registrar entrega</Button>
          {isAdmin && <Button type="button" variant={modo === "devolucao" ? "default" : "outline"} onClick={() => trocarModo("devolucao")}>Devolver EPI</Button>}
          {!isAdmin && <span className="text-xs text-muted-foreground">A devolução de EPI é registrada somente pelo Administrador.</span>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={(v) => { if (!v) return; setEmpresaSel(v); setEmpregadoId(""); setLinhas([]); setFiltroItem(TODOS); setFiltroEmpregado(TODOS); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {empresasParaEscolha(empresas).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Empregado</Label>
            <Select value={empregadoId} onValueChange={(v) => { setEmpregadoId(v); setLinhas([]); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o empregado" /></SelectTrigger>
              <SelectContent>
                {empregados.filter((e) => e.ativo !== false).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{modo === "entrega" ? "Data da entrega" : "Data da devolução"}</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="obs-entrega-epi">Observações</Label>
            <Input id="obs-entrega-epi" value={observacao} maxLength={500} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          {modo === "devolucao" && (
            <div className="space-y-1.5">
              <Label htmlFor="resp-devolucao-epi">Responsável pela devolução</Label>
              <Input id="resp-devolucao-epi" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-bold">{modo === "entrega" ? "EPIs entregues" : "EPIs devolvidos"}</Label>
            <Button type="button" variant="outline" size="sm" disabled={!empresaSel || (modo === "devolucao" && !empregadoId)} onClick={() => setLinhas([...linhas, novaLinha()])}>+ Adicionar EPI</Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead className="w-40">Tamanho</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum EPI adicionado. Clique em "+ Adicionar EPI".</TableCell></TableRow>
                ) : linhas.map((l) => {
                  const produto = itens.find((i) => i.id === l.item_id);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Select value={l.item_id} onValueChange={(v) => { mudarLinha(l.id, "item_id", v); mudarLinha(l.id, "tamanho", ""); }}>
                          <SelectTrigger><SelectValue placeholder="Selecione o EPI" /></SelectTrigger>
                          <SelectContent>
                            {escolhaItens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.codigo_sku} · {i.nome}{i.ca ? ` (CA: ${i.ca})` : ""}{modo === "devolucao" ? ` · em posse: ${emPosseEpi(movimentosDoEmpregado, empregadoId, i.id, null)}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <SeletorTamanho parametros={parametros} modulo="epi" produto={produto} uso={modo === "entrega" ? "saida" : "devolucao"} valor={l.tamanho} onChange={(v) => mudarLinha(l.id, "tamanho", v)} />
                      </TableCell>
                      <TableCell><Input type="number" min="1" value={l.quantidade} onChange={(e) => mudarLinha(l.id, "quantidade", Number(e.target.value))} /></TableCell>
                      <TableCell><Button variant="ghost" size="sm" className="text-red-500" onClick={() => setLinhas(linhas.filter((x) => x.id !== l.id))}>Remover</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {ultima && <Button type="button" variant="outline" onClick={() => abrirDocumento({ titulo: "Termo de Entrega de EPI", html: ultima.html, arquivo: ultima.arquivo })}>Gerar Termo de Entrega ({ultima.codigos.join(", ") || "entrega registrada"})</Button>}
          <Button requiresWrite="operar" disabled={gravando || !canOperate} onClick={salvar}>{modo === "entrega" ? "Registrar entrega" : "Registrar devolução"}</Button>
        </div>
      </div>

      <div className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-bold">Histórico de movimentações de EPI</h3>
          <Button type="button" variant="outline" disabled={movimentos.length === 0} onClick={() => exportarCsv("entrega-epi-historico", movimentos.map((m) => ({
            Código: m.codigo_movimentacao ?? "", Data: formatarData(m.data_movimentacao), Tipo: ROTULO_TIPO[m.tipo_movimentacao] ?? m.tipo_movimentacao,
            EPI: nomeDoItem(m.item_id)?.nome ?? "", Tamanho: nomeTamanhoGravado(parametros, m.tamanho_id) ?? "", Quantidade: m.quantidade,
            Empregado: nomeDoEmpregado(m.empregado_id), Responsável: m.responsavel_nome ?? "", Observação: m.observacao ?? "",
          })))}>Exportar CSV</Button>
        </div>
        {!empresaSel ? <p className="text-sm text-muted-foreground">Escolha a empresa para ver o histórico.</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>EPI</Label>
                <Select value={filtroItem} onValueChange={setFiltroItem}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os EPIs</SelectItem>
                    {itens.map((i) => <SelectItem key={i.id} value={i.id}>{i.codigo_sku} · {i.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Empregado</Label>
                <Select value={filtroEmpregado} onValueChange={setFiltroEmpregado}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os empregados</SelectItem>
                    {empregados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {historico.isError ? <div role="alert">Não foi possível carregar o histórico: {(historico.error as Error).message}</div> : historico.isLoading ? <div>Carregando histórico completo…</div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>EPI</TableHead><TableHead>Tam.</TableHead>
                      <TableHead className="text-right">Qtd</TableHead><TableHead>Empregado</TableHead><TableHead>Responsável</TableHead><TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhuma movimentação encontrada.</TableCell></TableRow>
                    ) : movimentos.map((m, i) => (
                      <TableRow key={m.id ?? i}>
                        <TableCell>{m.codigo_movimentacao ?? "—"}</TableCell>
                        <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                        <TableCell>{ROTULO_TIPO[m.tipo_movimentacao] ?? m.tipo_movimentacao}</TableCell>
                        <TableCell>{nomeDoItem(m.item_id)?.nome ?? "—"}</TableCell>
                        <TableCell>{nomeTamanhoGravado(parametros, m.tamanho_id) ?? "—"}</TableCell>
                        <TableCell className="text-right">{m.quantidade}</TableCell>
                        <TableCell>{nomeDoEmpregado(m.empregado_id)}</TableCell>
                        <TableCell>{m.responsavel_nome ?? "—"}</TableCell>
                        <TableCell className="max-w-xs truncate">{m.observacao || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
