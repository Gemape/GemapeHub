import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lerTodas } from "@/lib/ler-todas";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useCaixaItens, useCaixasFerramentas, useItens, useRegistrarMovimentacoesLote, useSalvar, type Empregado } from "@/lib/hooks-gemape";
import { MODO_DEMO } from "@/lib/modo-demo";
import { dataBrasilia, empregadoElegivelPortador, portadorAtivo, registrarPortador } from "@/lib/portadores-caixa";
import { lerTextosTermos } from "@/lib/termos-ferramentas-texto";
import { montarTermoResponsabilidadeHtml } from "@/lib/termo-responsabilidade-html";
import { montarTermoVistoriaHtml } from "@/lib/termo-vistoria-html";
import { descricaoDoDesaparecimento } from "@/lib/vistoria-ferramentas-ocorrencia";
import { erroDaDataDoVinculo, ehRetroativa, textoDaAutorizacao, validarSupervisor } from "@/lib/vinculacao-portador";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
type Conformidade = "" | "Conforme" | "Não Conforme" | "Ausente";
type PessoaComSupervisor = Empregado & { supervisor_id?: string | null };

// Ferramentas > Vinculação de portador: vincular e desvincular o portador de uma caixa. Data anterior a hoje exige o nome e a senha de um supervisor;
// desvincular exige a vistoria da caixa e confirmação, e gera o termo de encerramento de responsabilidade com a vistoria.
export function PortadoresCaixaModulo() {
  const { empresas, empresaId } = useEmpresa();
  const { data: todasCaixas = [] } = useCaixasFerramentas(TODAS);
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const caixas = caixasHabilitadas(todasCaixas, habilitadas).filter((caixa) => empresaId === TODAS || caixa.empresa_id === empresaId);
  const historico = usePortadoresCaixa();
  const { data: empregados = [] } = useQuery({
    queryKey: ["empregados-portadores"],
    queryFn: async () => lerTodas<PessoaComSupervisor>(() => supabase.from("empregados").select("*"), (q) => q.order("id")),
  });
  const [modo, setModo] = useState<"vincular" | "desvincular">("vincular");
  const [caixaId, setCaixaId] = useState("");
  const [empregadoId, setEmpregadoId] = useState("");
  const [data, setData] = useState(dataBrasilia());
  const [observacao, setObservacao] = useState("");
  const [buscaEmpregado, setBuscaEmpregado] = useState("");
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [vistoria, setVistoria] = useState<Record<string, { conformidade: Conformidade; observacao: string }>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [nomeSupervisor, setNomeSupervisor] = useState("");
  const [senhaSupervisor, setSenhaSupervisor] = useState("");
  const [pendente, setPendente] = useState(false);
  const salvando = useRef(false);
  const registrarVistorias = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"], false);
  const salvarOcorrencia = useSalvar("ocorrencias", ["ocorrencias"]);

  const hoje = dataBrasilia();
  const caixa = caixas.find((item) => item.id === caixaId);
  const atual = caixa ? portadorAtivo(historico, caixa.id) : null;
  const { data: itensDaCaixa = [] } = useCaixaItens(modo === "desvincular" && caixa ? caixa.id : null);
  const caixasDoModo = caixas.filter((c) => (modo === "desvincular" ? !!portadorAtivo(historico, c.id) : true));
  const pessoasDaEmpresa = empregados.filter((pessoa) => pessoa.empresa_id === caixa?.empresa_id && empregadoElegivelPortador(pessoa));
  const termos = normalizar(buscaEmpregado).split(/\s+/).filter(Boolean);
  const encontrados = pessoasDaEmpresa.filter((pessoa) => termos.every((termo) => normalizar(`${pessoa.nome} ${pessoa.matricula ?? ""}`).includes(termo)));
  const historicoVisivel = historico.filter((registro) => {
    if (empresaId !== TODAS && registro.empresa_id !== empresaId) return false;
    const texto = normalizar(`${registro.caixa_codigo} ${registro.empregado_nome} ${registro.observacao}`);
    return normalizar(buscaHistorico).split(/\s+/).filter(Boolean).every((termo) => texto.includes(termo));
  }).slice().reverse();
  const nomeDaFerramenta = (id: string) => { const f = ferramentas.find((x) => x.id === id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}` : "Ferramenta"; };
  const empregadoEscolhido = empregados.find((p) => p.id === empregadoId);

  function trocarModo(novo: "vincular" | "desvincular") {
    setModo(novo); setCaixaId(""); setEmpregadoId(""); setBuscaEmpregado(""); setVistoria({}); setData(hoje); setObservacao("");
  }

  // Valida tudo antes de pedir senha ou confirmação, para o supervisor nunca autorizar algo que depois falharia.
  function seguir(evento: React.FormEvent) {
    evento.preventDefault();
    if (!caixa) return void toast.error("Selecione uma caixa habilitada.");
    if (modo === "vincular") {
      if (atual) return void toast.error(`A caixa ${caixa.codigo} tem o portador ${atual.empregado_nome}. Desvincule o portador atual (com a vistoria da caixa) antes de vincular outro.`);
      if (!empregadoEscolhido) return void toast.error("Selecione o empregado portador.");
    } else {
      if (!atual) return void toast.error("A caixa não tem portador ativo para desvincular.");
      const faltando = itensDaCaixa.find((i) => !vistoria[i.ferramenta_id]?.conformidade);
      if (faltando) return void toast.error(`Faça a vistoria da caixa: informe a situação de ${nomeDaFerramenta(faltando.ferramenta_id)}.`);
    }
    const erroData = erroDaDataDoVinculo(data, hoje, modo === "desvincular" ? atual?.data_inicio : null);
    if (erroData) return void toast.error(erroData);
    if (modo === "desvincular") setConfirmando(true);
    else if (ehRetroativa(data, hoje)) setAutorizando(true);
    else void executar();
  }

  function aposConfirmar() {
    setConfirmando(false);
    if (ehRetroativa(data, hoje)) setAutorizando(true);
    else void executar();
  }

  function autorizar() {
    const r = validarSupervisor(nomeSupervisor, senhaSupervisor, empregados, hoje);
    if ("erro" in r) return void toast.error(r.erro);
    setAutorizando(false); setNomeSupervisor(""); setSenhaSupervisor("");
    void executar(r.supervisor.nome);
  }

  async function executar(autorizadoPor?: string) {
    if (salvando.current || !caixa) return;
    salvando.current = true;
    setPendente(true);
    try {
      if (modo === "vincular") {
        if (!empregadoEscolhido) throw new Error("Selecione o empregado portador.");
        registrarPortador({ caixa, empregado: empregadoEscolhido, habilitadas, status: "Ativa", observacao: capitalizarTexto(observacao), data, ...(autorizadoPor ? { autorizadoPor } : {}) });
        toast.success("Portador vinculado.");
        void gerarTermoDeEntrega(caixa, empregadoEscolhido, data);
      } else if (atual) {
        await encerrar(autorizadoPor);
      }
      setCaixaId(""); setEmpregadoId(""); setBuscaEmpregado(""); setObservacao(""); setVistoria({}); setData(hoje);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o vínculo.");
    } finally {
      salvando.current = false;
      setPendente(false);
    }
  }

  // Desvincular: grava a vistoria de encerramento, abre a ocorrência do que está ausente, encerra o vínculo e abre o termo.
  async function encerrar(autorizadoPor: string | undefined) {
    if (!caixa || !atual) return;
    const linhas = itensDaCaixa.map((i) => ({ item: i, ...(vistoria[i.ferramenta_id] ?? { conformidade: "" as Conformidade, observacao: "" }) }));
    await registrarVistorias.mutateAsync(linhas.map((l) => ({
      modulo: "ferramenta", tipo_movimentacao: "Vistoria", quantidade: l.item.quantidade, data_movimentacao: data, item_id: l.item.ferramenta_id,
      empresa_id: caixa.empresa_id, empregado_id: atual.empregado_id, tipo_vistoria: "Encerramento",
      ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
      observacao: `Vistoria de encerramento - Caixa: ${caixa.codigo} - Status: ${l.conformidade}. Obs: ${capitalizarTexto(l.observacao)}`.slice(0, 500),
    })));
    const ausentes = linhas.filter((l) => l.conformidade === "Ausente");
    let abertas = 0;
    for (const l of ausentes) {
      try {
        await salvarOcorrencia.mutateAsync({ valores: {
          data, hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), responsavel_registro: "Vistoria de encerramento",
          descricao_ocorrencia: descricaoDoDesaparecimento({ ferramenta: nomeDaFerramenta(l.item.ferramenta_id), quantidade: l.item.quantidade, caixa: caixa.codigo, data, observacao: l.observacao }).replace("na vistoria periódica", "na vistoria de encerramento"),
          tipo_ocorrencia: "Ferramenta", empregado_id: atual.empregado_id, item_id: l.item.ferramenta_id, veiculo_id: null, ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
        } });
        abertas += 1;
      } catch { /* o aviso abaixo diz quantas não foram abertas */ }
    }
    registrarPortador({ caixa, empregado: null, habilitadas, status: "Inativa", observacao: capitalizarTexto(observacao), data, ...(autorizadoPor ? { autorizadoPor } : {}) });
    toast.success("Portador desvinculado.");
    if (ausentes.length > 0) toast.warning(`${abertas} de ${ausentes.length} ocorrência(s) de desaparecimento aberta(s). Para repor, use Movimentações > Reposição.`);
    gerarTermoDeEncerramento(linhas.map((l) => ({ id: l.item.ferramenta_id, conformidade: l.conformidade, observacao: l.observacao })), atual.empregado_id, atual.empregado_nome);
  }

  function gerarTermoDeEncerramento(linhas: { id: string; conformidade: string; observacao: string }[], portadorId: string, portadorNome: string) {
    if (!caixa) return;
    const empresa = empresas.find((e) => e.id === caixa.empresa_id);
    if (!empresa) return void toast.warning("O portador foi desvinculado, mas a caixa não tem empresa cadastrada; o termo não foi gerado.");
    const portador = empregados.find((p) => p.id === portadorId);
    abrirDocumento({
      titulo: "Termo de Encerramento de Responsabilidade",
      html: montarTermoVistoriaHtml({
        empresa, caixa, responsavel: portador?.nome ?? portadorNome, data, titulo: "Termo de Encerramento de Responsabilidade com Vistoria da Caixa", texto: lerTextosTermos().encerramento,
        linhas: linhas.map((l) => { const f = ferramentas.find((x) => x.id === l.id); return { codigo: f?.codigo_sku, nome: f?.nome, conformidade: l.conformidade, estado: "—", observacao: capitalizarTexto(l.observacao) }; }),
      }),
      arquivo: nomeArquivoDocumento("Termo de Encerramento", caixa.codigo, data),
    });
  }

  async function gerarTermoDeEntrega(daCaixa: NonNullable<typeof caixa>, portador: Empregado, dia: string) {
    try {
      const empresa = empresas.find((e) => e.id === daCaixa.empresa_id);
      if (!empresa) return void toast.warning("O portador foi registrado, mas a caixa não tem empresa cadastrada; o termo de entrega não foi gerado.");
      const { data: itens, error } = await supabase.from("caixa_ferramenta_itens").select("*, ferramenta:ferramentas(*)").eq("caixa_id", daCaixa.id);
      if (error) throw error;
      const lista = (itens ?? []) as { quantidade: number; ferramenta?: { codigo_sku?: string | null; nome?: string | null; marca?: string | null } | null }[];
      if (lista.length === 0) return void toast.warning(`A caixa ${daCaixa.codigo} não tem ferramentas; o termo de entrega não foi gerado.`);
      abrirDocumento({
        titulo: "Termo de Responsabilidade",
        html: montarTermoResponsabilidadeHtml({
          empresa, empregado: { nome: portador.nome, cpf: portador.cpf ?? "" }, caixaCodigo: daCaixa.codigo, data: dia, texto: lerTextosTermos().entrega,
          linhas: lista.map((i) => ({ codigo: i.ferramenta?.codigo_sku, nome: i.ferramenta?.nome, marca: i.ferramenta?.marca, quantidade: i.quantidade, estado: "—" })),
        }),
        arquivo: nomeArquivoDocumento("Termo de Responsabilidade", portador.nome, dia),
      });
    } catch (erro) {
      toast.error(erro instanceof Error ? `O portador foi registrado, mas o termo de entrega falhou: ${erro.message}` : "O portador foi registrado, mas o termo de entrega falhou.");
    }
  }

  const retroativa = ehRetroativa(data, hoje);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Vincular ou desvincular portador">
        {([["vincular", "Vincular portador"], ["desvincular", "Desvincular portador"]] as const).map(([id, rotulo]) => (
          <Button key={id} type="button" variant={modo === id ? "default" : "outline"} aria-pressed={modo === id} onClick={() => trocarModo(id)}>{rotulo}</Button>
        ))}
      </div>
      <form onSubmit={seguir} className="panel space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{modo === "vincular" ? "Vincular portador" : "Desvincular portador"}</h2>
          <p className="text-sm text-muted-foreground">
            {modo === "vincular"
              ? "Escolha a caixa, o empregado e a data em que ele assume a responsabilidade. Data anterior a hoje pede a autorização de um supervisor."
              : "Escolha a caixa, faça a vistoria dela e informe a data do encerramento. A confirmação gera o termo de encerramento de responsabilidade com a vistoria da caixa."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portador-caixa">Caixa</Label>
            <Select value={caixaId} onValueChange={(valor) => { setCaixaId(valor); setEmpregadoId(""); setVistoria({}); }}>
              <SelectTrigger id="portador-caixa"><SelectValue placeholder="Selecione a caixa" /></SelectTrigger>
              <SelectContent>{caixasDoModo.map((item) => <SelectItem key={item.id} value={item.id}>{item.codigo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portador-data">{modo === "vincular" ? "Data de início" : "Data do encerramento"}</Label>
            <Input id="portador-data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            {retroativa && <p className="text-xs text-destructive">Data anterior a hoje: será pedida a autorização de um supervisor.</p>}
          </div>
          {modo === "vincular" ? <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="busca-portador">Empregado portador — busca por palavra-chave</Label>
            <Input id="busca-portador" value={buscaEmpregado} onChange={(e) => { setBuscaEmpregado(e.target.value); setEmpregadoId(""); }} placeholder="Nome ou matrícula" disabled={!caixa} />
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger aria-label="Empregado portador"><SelectValue placeholder="Selecione o empregado" /></SelectTrigger>
              <SelectContent>{encontrados.map((pessoa) => <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>)}</SelectContent>
            </Select>
            {atual && <p className="text-sm text-destructive">A caixa tem o portador {atual.empregado_nome}. Desvincule-o antes de vincular outro.</p>}
          </div> : <div className="space-y-1.5 sm:col-span-2">
            <Label>Portador atual</Label>
            <Input readOnly value={caixa ? (atual ? `${atual.empregado_nome} (desde ${formatarData(atual.data_inicio)})` : "Nenhum portador ativo") : "Escolha a caixa"} />
          </div>}
          {modo === "desvincular" && atual && (
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="text-sm font-medium">Vistoria de encerramento da caixa</legend>
              {itensDaCaixa.length === 0 && <p className="text-sm text-muted-foreground">A caixa não tem ferramentas cadastradas.</p>}
              {itensDaCaixa.map((i) => (
                <div key={i.ferramenta_id} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm">
                  <span className="min-w-0 flex-1 font-medium">{nomeDaFerramenta(i.ferramenta_id)} <span className="font-normal text-muted-foreground">(qtd {i.quantidade})</span></span>
                  <Select value={vistoria[i.ferramenta_id]?.conformidade ?? ""} onValueChange={(v) => setVistoria((s) => ({ ...s, [i.ferramenta_id]: { conformidade: v as Conformidade, observacao: s[i.ferramenta_id]?.observacao ?? "" } }))}>
                    <SelectTrigger className="w-48" aria-label={`Situação de ${nomeDaFerramenta(i.ferramenta_id)}`}><SelectValue placeholder="Situação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conforme">Conforme</SelectItem>
                      <SelectItem value="Não Conforme">Não Conforme</SelectItem>
                      <SelectItem value="Ausente">Ausente (perdida)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input className="w-56" placeholder="Observação" aria-label={`Observação de ${nomeDaFerramenta(i.ferramenta_id)}`} value={vistoria[i.ferramenta_id]?.observacao ?? ""} onChange={(e) => setVistoria((s) => ({ ...s, [i.ferramenta_id]: { conformidade: s[i.ferramenta_id]?.conformidade ?? "", observacao: e.target.value } }))} />
                </div>
              ))}
            </fieldset>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="portador-observacao">Observação</Label>
            <Textarea id="portador-observacao" capitalizar="texto" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <Button requiresWrite type="submit" disabled={pendente}>{modo === "vincular" ? "Vincular portador" : "Desvincular portador"}</Button>
      </form>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar a desvinculação?</DialogTitle>
            <DialogDescription>
              Você vai encerrar a responsabilidade de {atual?.empregado_nome} pela caixa {caixa?.codigo} em {formatarData(data)}, com a vistoria informada. Será gerado o termo de encerramento de responsabilidade com a vistoria da caixa. Isso não pode ser desfeito aqui.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmando(false)}>Voltar</Button>
            <Button type="button" onClick={aposConfirmar}>Confirmar desvinculação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={autorizando} onOpenChange={(a) => { setAutorizando(a); if (!a) { setNomeSupervisor(""); setSenhaSupervisor(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorização do supervisor</DialogTitle>
            <DialogDescription>
              {caixa && textoDaAutorizacao({ acao: modo, caixa: caixa.codigo, empregado: (modo === "vincular" ? empregadoEscolhido?.nome : atual?.empregado_nome) ?? "o empregado", data, hoje })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="sup-nome">Nome do supervisor</Label><Input id="sup-nome" value={nomeSupervisor} onChange={(e) => setNomeSupervisor(e.target.value)} autoComplete="off" /></div>
            <div className="space-y-1.5"><Label htmlFor="sup-senha">Senha do supervisor</Label><Input id="sup-senha" type="password" value={senhaSupervisor} onChange={(e) => setSenhaSupervisor(e.target.value)} autoComplete="off" /></div>
            <p className="text-xs text-muted-foreground">Modo demonstração: a senha de teste é “supervisor”. A autenticação real vem na Fase 2.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAutorizando(false)}>Cancelar</Button>
            <Button type="button" onClick={autorizar}>Autorizar e registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="panel space-y-3 p-5">
        <div className="flex flex-col items-start gap-3">
          <div><h2 className="font-semibold">Histórico de portadores</h2><p className="text-sm text-muted-foreground">Todos os registros das caixas desta empresa, inclusive caixas não habilitadas atualmente.</p></div>
          <BarraDeFiltros>
            <Input className="max-w-xs" value={buscaHistorico} onChange={(e) => setBuscaHistorico(e.target.value)} placeholder="Buscar caixa ou empregado" />
          </BarraDeFiltros>
        </div>
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Caixa</TableHead><TableHead>Empresa</TableHead><TableHead>Empregado</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Status</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
          <TableBody>{historicoVisivel.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum portador registrado.</TableCell></TableRow> : historicoVisivel.map((registro) => <TableRow key={registro.id}>
            <TableCell className="font-mono">{registro.caixa_codigo}</TableCell>
            <TableCell>{empresas.find((empresa) => empresa.id === registro.empresa_id)?.nome_fantasia ?? registro.empresa_id}</TableCell>
            <TableCell>{registro.empregado_nome}</TableCell>
            <TableCell>{formatarData(registro.data_inicio)}</TableCell>
            <TableCell>{formatarData(registro.data_fim)}</TableCell>
            <TableCell>{registro.status}</TableCell>
            <TableCell>{registro.observacao || "—"}</TableCell>
          </TableRow>)}</TableBody>
        </Table></div>
      </section>
    </div>
  );
}
