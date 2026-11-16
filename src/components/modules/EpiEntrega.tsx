import { avisarOutrasAbas } from "@/lib/sincronia-abas";
import { useDonoDosAtalhos } from "@/components/inicio/atalhosPessoais";
import { mensagemHumana, mensagemValidadeVencida } from "@/lib/erros-humanos";
import { ehErroDeRede, enfileirar } from "@/lib/fila-offline";
import { BlocoEsqueleto } from "@/components/Esqueletos";
import { AjudaTermo } from "@/components/AjudaTermo";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pedeTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { bloqueioPorDemissao, formatarCpf, hojeLocal } from "@/lib/empregados";
import { resumoEmpregado } from "@/lib/resumo-empregado";
import { SeletorComBusca } from "@/components/SeletorComBusca";
import { ResumoEmpregado } from "@/components/modules/ResumoEmpregado";
import { emPosseEpi, lerHistoricoEpiPorItem, mensagemSoAdmin, registrarDevolucaoEpi, registrarEntregaEpi, type CalculoAlerta, type ModuloEntrega } from "@/lib/entrega-epi";
import { origemDaLinhaDeDevolucao } from "@/lib/devolucao-estoque-epi";
import { estadoEstoqueModulo, nomeTamanho, nomeTamanhoGravado, opcoesTamanhoDevolucao, opcoesTamanhoSaida, SEM_TAMANHO, tamanhoParaGravar, validarLinhasTamanho } from "@/lib/estoque-tamanho";
import { alertasDeMinimoEpi } from "@/lib/estoque-epi-saldos";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { soEmpregadosDeUniforme } from "@/lib/empregados-uniforme";
import { useComprasEpis, useComprasUniformes, useEmpregados, useEmpresas, useItens } from "@/lib/hooks-gemape";
import { MODO_DEMO } from "@/lib/modo-demo";
import { montarTermoEntregaEpiHtml } from "@/lib/termo-entrega-epi-html";
import { montarTermoEntregaUniformeHtml } from "@/lib/termo-entrega-uniforme-html";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

type Linha = { id: string; item_id: string; quantidade: number; tamanho: string };
const TODOS = "todos";
// O EPI e o tamanho vão juntos na mesma lista: uma opção para cada tamanho do EPI.
const SEP = "::";
const novaLinha = (): Linha => ({ id: Math.random().toString(36).slice(2, 11), item_id: "", quantidade: 1, tamanho: "" });
const ROTULO_TIPO: Record<string, string> = { Saida: "Entrega", Devolucao: "Devolução", Entrada: "Entrada" };

// Palavras de cada módulo: a mesma tela de entrega e devolução serve ao EPI e ao Uniforme.
const ROTULO: Record<ModuloEntrega, { um: string; plural: string; Plural: string; termo: string; Sing: string }> = {
  epi: { um: "EPI", plural: "EPIs", Plural: "EPIs", Sing: "EPI", termo: "Termo de Entrega de EPI" },
  uniforme: { um: "uniforme", plural: "uniformes", Plural: "Uniformes", Sing: "Uniforme", termo: "Termo de Entrega de Uniformes" },
};

export const EpiEntrega = () => <EntregaModulo modulo="epi" />;
export const UniformesEntrega = () => <EntregaModulo modulo="uniforme" />;

function EntregaModulo({ modulo }: { modulo: ModuloEntrega }) {
  const rot = ROTULO[modulo];
  const { empresaId } = useEmpresa();
  const { isAdmin, canOperate } = useAccess();
  const queryClient = useQueryClient();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const responsavelPadrao = String((user?.user_metadata as { nome?: unknown } | undefined)?.nome ?? user?.email ?? "");

  // Vindo da busca da tela inicial ou de um alerta (?empresa=&empregado=&modo=devolucao): já abre com o empregado escolhido e no modo pedido.
  const pedido = useSearch({ strict: false }) as { empresa?: string; empregado?: string; modo?: string };
  const [modo, setModo] = useState<"entrega" | "devolucao">(pedido.modo === "devolucao" ? "devolucao" : "entrega");
  const [empresaSel, setEmpresaSel] = useState(pedido.empresa || (empresaId !== TODAS ? empresaId : ""));
  const [empregadoId, setEmpregadoId] = useState(pedido.empregado ?? "");
  // A tela continua aberta quando o pedido muda (outra busca): acompanha.
  useEffect(() => {
    if (pedido.empresa) setEmpresaSel(pedido.empresa);
    if (pedido.empregado) setEmpregadoId(pedido.empregado);
    if (pedido.modo === "devolucao") setModo("devolucao");
  }, [pedido.empresa, pedido.empregado, pedido.modo]);
  const [data, setData] = useState(hojeLocal());
  const [observacao, setObservacao] = useState("");
  const [responsavel, setResponsavel] = useState(responsavelPadrao);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [ultima, setUltima] = useState<{ codigos: string[]; html: string; arquivo: string } | null>(null);
  const [filtroItem, setFiltroItem] = useState(TODOS);
  const [filtroEmpregado, setFiltroEmpregado] = useState(TODOS);
  const dono = useDonoDosAtalhos();
  const salvando = useRef(false);
  const [gravando, setGravando] = useState(false);

  const { data: empresas = [] } = useEmpresas();
  // Empresa inativa não é escolhida: se o cabeçalho está nela, a escolha começa vazia.
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  // Só preenche quando o usuário carrega; apagar o campo para digitar outro nome não repõe o padrão.
  useEffect(() => { setResponsavel((atual) => atual || responsavelPadrao); }, [responsavelPadrao]);

  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens(modulo, empresaSel || TODAS);
  // Compras do EPI ou do uniforme, para a devolução levar a origem ao estoque de usados.
  const { data: comprasEpi = [] } = useComprasEpis(empresaSel || TODAS, "", modulo === "epi");
  const { data: comprasUniforme = [] } = useComprasUniformes(empresaSel || TODAS, "", modulo === "uniforme");
  const comprasOrigem = modulo === "epi" ? comprasEpi : comprasUniforme;
  const parametros = useParametrosBase();
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);

  // Histórico completo da empresa (sem o limite de 1000 linhas), filtrado por EPI e empregado.
  const historico = useQuery({
    queryKey: [`${modulo}-entrega-historico`, empresaSel, filtroItem, filtroEmpregado],
    enabled: Boolean(empresaSel),
    queryFn: () => lerHistoricoEpiPorItem(supabase, {
      empresaId: empresaSel,
      modulo,
      ...(filtroItem !== TODOS ? { itemId: filtroItem } : {}),
      ...(filtroEmpregado !== TODOS ? { empregadoId: filtroEmpregado } : {}),
    }),
  });
  // O que o empregado tem em posse, para a devolução.
  const doEmpregado = useQuery({
    queryKey: [`${modulo}-entrega-em-posse`, empresaSel, empregadoId],
    enabled: Boolean(empresaSel && empregadoId),
    queryFn: () => lerHistoricoEpiPorItem(supabase, { empresaId: empresaSel, empregadoId, modulo }),
  });
  const movimentosDoEmpregado = useMemo(() => doEmpregado.data ?? [], [doEmpregado.data]);
  // Ferramentas que o empregado ainda não devolveu (mesma conta de posse, no módulo de ferramentas).
  const ferramentasDoEmpregado = useQuery({
    queryKey: ["ferramenta-entrega-em-posse", empresaSel, empregadoId],
    enabled: Boolean(empresaSel && empregadoId),
    queryFn: () => lerHistoricoEpiPorItem(supabase, { empresaId: empresaSel, empregadoId, modulo: "ferramenta" as ModuloEntrega }),
  });
  const { data: ferramentas = [] } = useItens("ferramenta", empresaSel || TODAS);
  const resumo = useMemo(() => resumoEmpregado(movimentosDoEmpregado, itens, empregadoId, hojeLocal()), [movimentosDoEmpregado, itens, empregadoId]);
  const ferramentasPendentes = useMemo(
    () => resumoEmpregado(ferramentasDoEmpregado.data ?? [], ferramentas, empregadoId, hojeLocal()).emPosse.map((p) => ({ nome: p.nome, quantidade: p.quantidade })),
    [ferramentasDoEmpregado.data, ferramentas, empregadoId],
  );
  const itensEmPosse = useMemo(
    () => itens.filter((i) => emPosseEpi(movimentosDoEmpregado, empregadoId, i.id, null) > 0),
    [itens, movimentosDoEmpregado, empregadoId],
  );

  const calcularAlerta: CalculoAlerta = (item) => {
    // Mesma regra da aba Estoque (decisão 417): alerta por tamanho; o aviso traz o primeiro tamanho em alerta.
    const alertas = alertasDeMinimoEpi(parametros, item as never, modulo);
    if (alertas.length > 0) return { alerta: true, saldo: alertas[0]!.saldo, minimo: alertas[0]!.minimo };
    const e = estadoEstoqueModulo(parametros, modulo, item as never);
    return { alerta: false, saldo: e.saldo, minimo: e.minimo };
  };

  function mudarLinha(id: string, campo: keyof Linha, valor: string | number) {
    setLinhas((atuais) => atuais.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  }
  function trocarModo(novo: "entrega" | "devolucao") {
    setModo(novo);
    setResponsavel(responsavelPadrao); // o nome digitado numa tela não vale para a outra
    setLinhas([]);
    setUltima(null);
  }

  async function salvar() {
    if (salvando.current) return;
    if (!empregado || !empresa) { alert("Escolha a empresa e o empregado."); return; }
    if (linhas.length === 0) { alert(`Adicione pelo menos um ${rot.um}.`); return; }
    if (!data) { alert("Informe a data."); return; }
    const devolucao = modo === "devolucao";
    if (devolucao && !isAdmin) { alert(mensagemSoAdmin(modulo)); return; }
    const bloqueio = bloqueioPorDemissao(empregado, devolucao ? "devolucao" : "entrega", data);
    if (bloqueio) { alert(bloqueio); return; }
    if (!devolucao) {
      for (const l of linhas) {
        const vencido = mensagemValidadeVencida(itens.find((i) => i.id === l.item_id) ?? {}, data);
        if (vencido) { alert(vencido); return; }
      }
    }
    if (TAMANHO_DISPONIVEL) {
      const erroTamanho = validarLinhasTamanho(linhas, itens, parametros, modulo, devolucao ? "devolução" : "entrega");
      if (erroTamanho) { alert(erroTamanho); return; }
    }
    const entrada = {
      empresaId: empresa.id,
      empregado,
      linhas: linhas.map((l) => {
        const tamanho = tamanhoParaGravar(l.tamanho, devolucao);
        // A devolução de EPI entra no estoque como produto usado, com os dados da compra original (decisão 327), como na Devolução da Entrada no Estoque.
        const item = itens.find((i) => i.id === l.item_id);
        const origem = devolucao && item ? { origem: origemDaLinhaDeDevolucao(comprasOrigem, item as { id: string; ca?: string | null }, tamanho) } : {};
        return { item_id: l.item_id, quantidade: l.quantidade, ...(TAMANHO_DISPONIVEL ? { tamanho_id: tamanho ?? null } : {}), ...origem };
      }),
      data,
      observacao,
      modulo,
      comCodigo: MODO_DEMO,
      calcularAlerta,
    };
    salvando.current = true;
    setGravando(true);
    // Sem rede (ou rede que caiu no meio): guarda neste aparelho e envia sozinho quando voltar; o operador não perde o que preencheu.
    const guardarParaDepois = () => {
      const { calcularAlerta: _calculo, ...semFuncao } = entrada;
      const rotuloFila = `${devolucao ? "Devolução" : "Entrega"} de ${rot.um} — ${empregado.nome}`;
      if (!enfileirar("entrega-epi", rotuloFila, { dono, devolucao, entrada: semFuncao, responsavel })) {
        alert("Sem conexão e não foi possível guardar neste aparelho (armazenamento cheio ou bloqueado). Nada foi registrado: tente de novo quando a rede voltar.");
        return;
      }
      toast.info("Sem conexão: registro guardado neste aparelho", { description: "Ele será enviado sozinho assim que a rede voltar." });
      setLinhas([]);
      setObservacao("");
    };
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) { guardarParaDepois(); return; }
      const r = devolucao
        ? await registrarDevolucaoEpi(supabase, { ...entrada, administrador: isAdmin, responsavel })
        : await registrarEntregaEpi(supabase, { ...entrada, responsavel });
      queryClient.invalidateQueries();
      avisarOutrasAbas();
      toast.success(devolucao ? "Devolução registrada" : "Entrega registrada", { description: r.codigos.join(", ") || undefined });
      for (const a of r.alertas) toast.warning(`${a.nome} chegou ao estoque mínimo`, { description: `Saldo ${a.saldo} de mínimo ${a.minimo}.` });
      if (!devolucao) {
        setUltima({
          codigos: r.codigos,
          arquivo: nomeArquivoDocumento(rot.termo, empregado.nome, data),
          html: (modulo === "epi" ? montarTermoEntregaEpiHtml : montarTermoEntregaUniformeHtml)({
            empresa, empregado, data,
            linhas: linhas.map((l) => {
              const info = itens.find((i) => i.id === l.item_id);
              return { nome: info?.nome, ca: info?.ca, marca: info?.marca, modelo: info?.modelo, tamanho: tamanhoParaGravar(l.tamanho) ? nomeTamanho(parametros, l.tamanho) : undefined, quantidade: l.quantidade, estado: "Novo" };
            }),
          }),
        });
      }
      // Limpa a lista para um segundo clique não registrar a mesma movimentação de novo.
      setLinhas([]);
      setObservacao("");
    } catch (erro) {
      if (ehErroDeRede(erro)) guardarParaDepois();
      else alert(mensagemHumana(erro));
    } finally {
      salvando.current = false;
      setGravando(false);
    }
  }

  const nomeDoEmpregado = (id: string | null | undefined) => empregados.find((e) => e.id === id)?.nome ?? "—";
  const nomeDoItem = (id: string | null) => itens.find((i) => i.id === id);
  const movimentos = historico.data ?? [];
  const escolhaItens = modo === "devolucao" ? itensEmPosse : itens;
  // Uma opção por tamanho (entrega: com o saldo; devolução: tamanhos em que pode ter saído); EPI sem tamanho tem uma opção só.
  const opcoesDoItem = (i: (typeof itens)[number]): { valor: string; rotulo: string }[] => {
    if (!pedeTamanho(parametros, modulo, i)) return [{ valor: "", rotulo: "" }];
    const ops = modo === "entrega"
      ? opcoesTamanhoSaida(parametros, modulo, i).map((o) => ({ valor: o.valor, rotulo: `${o.rotulo} (saldo ${o.saldo})` }))
      : opcoesTamanhoDevolucao(parametros, modulo, i);
    return ops.length ? ops : [{ valor: "", rotulo: modo === "entrega" ? "sem saldo" : "" }];
  };

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={modo === "entrega" ? "default" : "outline"} onClick={() => trocarModo("entrega")}>Registrar entrega</Button>
          {isAdmin && <Button type="button" variant={modo === "devolucao" ? "default" : "outline"} onClick={() => trocarModo("devolucao")}>Devolver {rot.Sing}</Button>}
          {!isAdmin && <span className="text-xs text-muted-foreground">A devolução de {rot.um} é registrada somente pelo Administrador.</span>}
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
          <div className="space-y-1.5" data-tour="empregado">
            <Label>Empregado <span className="font-normal text-muted-foreground">(nome, matrícula ou CPF)</span></Label>
            <SeletorComBusca
              id={`empregado-${modulo}`}
              nome="empregado_id"
              valor={empregadoId}
              onChange={(v) => { setEmpregadoId(v); setLinhas([]); }}
              opcoes={(modulo === "epi" ? soEmpregadosDeEpi : soEmpregadosDeUniforme)(empregados.filter((e) => e.ativo !== false)).map((e) => ({ id: e.id, rotulo: `${e.nome} · ${e.matricula ?? "sem matrícula"} · ${formatarCpf(e.cpf)}` }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{modo === "entrega" ? "Data da entrega" : "Data da devolução"}</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`obs-entrega-${modulo}`}>Observações</Label>
            <Input id={`obs-entrega-${modulo}`} value={observacao} maxLength={500} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`responsavel-${modo}-${modulo}`}>{modo === "devolucao" ? "Responsável pela devolução" : "Responsável pela entrega"}</Label>
            <Input id={`responsavel-${modo}-${modulo}`} value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-bold">{modo === "entrega" ? `${rot.Plural} entregues` : `${rot.Plural} devolvidos`}</Label>
            <Button type="button" variant="outline" size="sm" data-tour="add-item" disabled={!empresaSel || (modo === "devolucao" && !empregadoId)} onClick={() => setLinhas([...linhas, novaLinha()])}>+ Adicionar {rot.Sing}</Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{rot.Sing}</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum {rot.um} adicionado. Clique em "+ Adicionar {rot.Sing}".</TableCell></TableRow>
                ) : linhas.map((l) => {
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Select value={l.item_id ? `${l.item_id}${SEP}${l.tamanho}` : ""} onValueChange={(v) => { const [item = "", tam = ""] = v.split(SEP); mudarLinha(l.id, "item_id", item); mudarLinha(l.id, "tamanho", tam); }}>
                          <SelectTrigger><SelectValue placeholder={`Selecione o ${rot.um}`} /></SelectTrigger>
                          <SelectContent>
                            {escolhaItens.flatMap((i) => opcoesDoItem(i).map((o) => (
                              <SelectItem key={`${i.id}${SEP}${o.valor}`} value={`${i.id}${SEP}${o.valor}`}>
                                {i.codigo_sku} · {i.nome}{o.rotulo ? ` · ${o.rotulo}` : ""}{i.ca ? ` (CA: ${i.ca})` : ""}{modo === "devolucao" ? ` · em posse: ${emPosseEpi(movimentosDoEmpregado, empregadoId, i.id, o.valor && o.valor !== SEM_TAMANHO ? o.valor : null)}` : ""}
                              </SelectItem>
                            )))}
                          </SelectContent>
                        </Select>
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
          {ultima && <Button type="button" variant="outline" onClick={() => abrirDocumento({ titulo: rot.termo, html: ultima.html, arquivo: ultima.arquivo })}>Gerar Termo de Entrega ({ultima.codigos.join(", ") || "entrega registrada"})</Button>}
          <Button requiresWrite="operar" data-tour="registrar" disabled={gravando || !canOperate} onClick={salvar}>{modo === "entrega" ? "Registrar entrega" : "Registrar devolução"}</Button>
          <AjudaTermo termo="Termo de Entrega">Documento assinado pelo empregado ao receber itens de maior custo ou durabilidade. Para itens de consumo corriqueiro use a Ficha de EPI Avulsa.</AjudaTermo>
        </div>
      </div>
      <ResumoEmpregado empregado={empregado} rotuloItens={rot.plural} posse={resumo.emPosse} vencidos={resumo.vencidos} ferramentas={ferramentasPendentes} nomeTamanho={(id) => nomeTamanhoGravado(parametros, id)} carregando={doEmpregado.isLoading} />
      </div>

      <div className="panel p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-bold">Histórico de movimentações de {rot.um}</h3>
          <Button type="button" variant="outline" disabled={movimentos.length === 0} onClick={() => exportarCsv(`entrega-${modulo}-historico`, movimentos.map((m) => ({
            Código: m.codigo_movimentacao ?? "", Data: formatarData(m.data_movimentacao), Tipo: ROTULO_TIPO[m.tipo_movimentacao] ?? m.tipo_movimentacao,
            [rot.Sing]: nomeDoItem(m.item_id)?.nome ?? "", Tamanho: nomeTamanhoGravado(parametros, m.tamanho_id) ?? "", Quantidade: m.quantidade,
            Empregado: nomeDoEmpregado(m.empregado_id), Responsável: m.responsavel_nome ?? "", Observação: m.observacao ?? "",
          })))}>Exportar CSV</Button>
        </div>
        {!empresaSel ? <p className="text-sm text-muted-foreground">Escolha a empresa para ver o histórico.</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{rot.Sing}</Label>
                <Select value={filtroItem} onValueChange={setFiltroItem}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os {rot.plural}</SelectItem>
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
            {historico.isError ? <div role="alert">Não foi possível carregar o histórico: {(historico.error as Error).message}</div> : historico.isLoading ? <BlocoEsqueleto cartoes={0} linhas={5} rotulo="Carregando histórico completo" /> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>{rot.Sing}</TableHead><TableHead>Tam.</TableHead>
                      <TableHead>Qtd</TableHead><TableHead>Empregado</TableHead><TableHead>Responsável</TableHead><TableHead>Observação</TableHead>
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
                        <TableCell>{m.quantidade}</TableCell>
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
