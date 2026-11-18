import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { ONUS_BAIXA, formatarData } from "@/lib/gemape";
import { hojeLocal } from "@/lib/empregados";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { MODO_DEMO } from "@/lib/modo-demo";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { MOTIVOS_BAIXA_CAIXA } from "@/lib/controle-caixa";
import { posicaoDasFerramentas } from "@/lib/estoque-ferramentas-posicao";
import { reporFerramentaNaCaixa } from "@/lib/movimentacoes-caixa";
import { portadorNaData } from "@/lib/portadores-caixa";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { lerTextosTermos } from "@/lib/termos-ferramentas-texto";
import { montarTermoReposicaoHtml } from "@/lib/termo-reposicao-html";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import {
  useCaixaItens, useCaixasFerramentas, useEmpregados, useEmpresas, useItens, useMovimentacoes, useRegistrarMovimentacoesLote, useSalvarCaixa, useTodosCaixaItens,
} from "@/lib/hooks-gemape";

// Ferramentas > Movimentações > Reposição: uma ferramenta da caixa sai (baixa, com motivo e ônus) e uma nova entra no lugar dela.
// A troca grava a baixa e a entrega à caixa e gera o Termo de reposição, com o texto de Parâmetros Específicos.
export function FerramentasReposicaoCaixa() {
  const { empresaId } = useEmpresa();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const caixas = caixasHabilitadas(todasCaixas, habilitadas).filter((c) => empresaId === TODAS || c.empresa_id === empresaId);
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);
  const portadores = usePortadoresCaixa();
  const salvarCaixa = useSalvarCaixa();
  const registrar = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"]);
  const [caixaId, setCaixaId] = useState("");
  const [antigaId, setAntigaId] = useState("");
  const [novaId, setNovaId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [onus, setOnus] = useState<string>(ONUS_BAIXA[0]);
  const [data, setData] = useState(hojeLocal());
  const [observacao, setObservacao] = useState("");
  const { data: itensDaCaixa = [] } = useCaixaItens(caixaId || null);

  const caixa = caixas.find((c) => c.id === caixaId);
  const posicoes = new Map(posicaoDasFerramentas(ferramentas, movimentos, itensDeTodas).map((p) => [p.ferramentaId, p]));
  const ferramentaPor = (id: string) => ferramentas.find((f) => f.id === id);
  const rotulo = (id: string) => { const f = ferramentaPor(id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}${sufixoTamanhoFerramenta(f)}` : "—"; };
  const caixaDaFerramenta = (id: string) => itensDeTodas.find((i) => i.ferramenta_id === id)?.caixa_id ?? null;
  const codigoDaCaixa = (id: string | null | undefined) => todasCaixas.find((c) => c.id === id)?.codigo ?? "—";
  // Candidatas à nova: ativas, da empresa da caixa, e fora de outra caixa; a própria ferramenta que sai também vale (outra unidade dela).
  const candidatas = ferramentas.filter((f) => f.status === "Ativo" && (!caixa?.empresa_id || f.empresa_id === caixa.empresa_id) && (!caixaDaFerramenta(f.id) || caixaDaFerramenta(f.id) === caixaId));

  function repor() {
    if (!caixa) return void alert("Escolha a caixa.");
    const nova = ferramentaPor(novaId);
    const antiga = ferramentaPor(antigaId);
    const resultado = reporFerramentaNaCaixa({
      antigaId, novaId, nomeNova: nova?.nome ?? "A ferramenta nova", quantidade, motivo, data,
      empresaDaCaixa: caixa.empresa_id, empresaDaNova: nova?.empresa_id ?? null,
      itensDaCaixa: itensDaCaixa.map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao })),
      novaEmOutraCaixa: caixaDaFerramenta(novaId) && caixaDaFerramenta(novaId) !== caixaId ? codigoDaCaixa(caixaDaFerramenta(novaId)) : null,
      semCaixaDaNova: posicoes.get(novaId)?.semCaixa ?? 0,
      saldoEstoqueDaAntiga: Number(antiga?.estoque_atual) || 0,
    });
    if ("erro" in resultado) return void alert(resultado.erro);
    const novosItens = resultado.itens;
    const complemento = observacao.trim() ? ` ${capitalizarTexto(observacao.trim())}` : "";
    const base = {
      modulo: "ferramenta" as const, veiculo_id: null, empregado_id: null, quantidade, sinalizar_ocorrencia: false, tipo_vistoria: null, tipo_ocorrencia: null,
      conducao_ocorrencia: null, data_movimentacao: data, ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
    };
    salvarCaixa.mutate(
      {
        id: caixa.id,
        valores: { codigo: caixa.codigo, codigo_num: caixa.codigo_num, empresa_id: caixa.empresa_id, nome: caixa.nome, descricao: caixa.descricao, localizacao: caixa.localizacao, status: caixa.status },
        itens: novosItens.map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao ?? "" })),
      },
      {
        // O histórico só é gravado depois de a caixa gravar, para não registrar troca que não aconteceu.
        onSuccess: () => {
          registrar.mutate(
            [
              { ...base, item_id: antigaId, empresa_id: antiga?.empresa_id ?? caixa.empresa_id, tipo_movimentacao: "Saida", motivo_baixa: motivo, onus_baixa: onus, origem_local: null, destino_local: null, observacao: `Reposição na caixa ${caixa.codigo}: baixa.${complemento}`.slice(0, 500) },
              { ...base, item_id: novaId, empresa_id: nova?.empresa_id ?? caixa.empresa_id, tipo_movimentacao: "Transferencia", motivo_baixa: null, onus_baixa: null, origem_local: "Estoque", destino_local: caixa.codigo, observacao: `Reposição na caixa ${caixa.codigo}: entrega da ferramenta nova.${complemento}`.slice(0, 500) },
            ],
            // O formulário só é limpo depois de a baixa e a entrega gravarem; se falhar, os dados continuam na tela.
            { onSuccess: () => { abrirTermo(novosItens); setAntigaId(""); setNovaId(""); setQuantidade(1); setMotivo(""); setObservacao(""); } },
          );
        },
      },
    );
  }

  // O termo lista a composição da caixa depois da troca; o texto e o portador da data da reposição saem dos parâmetros e do histórico de portadores.
  function abrirTermo(itens: { ferramenta_id: string; quantidade: number }[]) {
    if (!caixa) return;
    const empresa = empresas.find((e) => e.id === caixa.empresa_id);
    if (!empresa) return void alert("A reposição foi registrada, mas a caixa não tem empresa cadastrada; o termo não foi gerado.");
    let portador: ReturnType<typeof portadorNaData> = null;
    try { portador = portadorNaData(portadores, caixa.id, data); } catch { portador = null; }
    if (!portador) return void alert(`A reposição foi registrada, mas a caixa ${caixa.codigo} não tinha portador em ${formatarData(data)}; o termo não foi gerado. Registre o portador da caixa e gere o termo depois.`);
    const empregado = empregados.find((e) => e.id === portador.empregado_id);
    const html = montarTermoReposicaoHtml({
      empresa,
      empregado: { nome: portador.empregado_nome, cpf: empregado?.cpf },
      caixaCodigo: caixa.codigo,
      data,
      texto: lerTextosTermos().reposicao,
      linhas: itens.map((i) => ({ codigo: ferramentaPor(i.ferramenta_id)?.codigo_sku, nome: `${ferramentaPor(i.ferramenta_id)?.nome ?? "—"}${sufixoTamanhoFerramenta(ferramentaPor(i.ferramenta_id) ?? {})}`, quantidade: i.quantidade, reposta: i.ferramenta_id === novaId })),
    });
    abrirDocumento({ titulo: "Termo de Reposição", html, arquivo: nomeArquivoDocumento("Termo de Reposição", caixa.codigo, data) });
  }

  return (
    <div className="space-y-6">
      <section className="panel max-w-3xl space-y-4 p-5" aria-label="Reposição de ferramenta na caixa">
        <p className="text-sm text-muted-foreground">Uma ferramenta da caixa é substituída por outra. A que sai recebe a baixa, com o motivo e o ônus; a nova vem do estoque. Ao final abre o Termo de reposição.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-caixa">Caixa</Label>
            <Select value={caixaId} onValueChange={(v) => { setCaixaId(v); setAntigaId(""); setNovaId(""); }}>
              <SelectTrigger id="reposicao-caixa"><SelectValue placeholder={isLoading ? "Carregando..." : "Escolha a caixa"} /></SelectTrigger>
              <SelectContent>{[...caixas].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true })).map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-antiga">Ferramenta que sai</Label>
            <Select value={antigaId} onValueChange={setAntigaId} disabled={!caixa}>
              <SelectTrigger id="reposicao-antiga"><SelectValue placeholder={caixa ? "Escolha a ferramenta" : "Escolha a caixa primeiro"} /></SelectTrigger>
              <SelectContent>{itensDaCaixa.map((i) => <SelectItem key={i.ferramenta_id} value={i.ferramenta_id}>{rotulo(i.ferramenta_id)} (na caixa {i.quantidade})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-nova">Ferramenta nova</Label>
            <Select value={novaId} onValueChange={setNovaId} disabled={!caixa}>
              <SelectTrigger id="reposicao-nova"><SelectValue placeholder="Escolha a ferramenta" /></SelectTrigger>
              <SelectContent>{candidatas.map((f) => <SelectItem key={f.id} value={f.id}>{rotulo(f.id)} (sem caixa: {Math.max(posicoes.get(f.id)?.semCaixa ?? 0, 0)})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-quantidade">Quantidade</Label>
            <Input id="reposicao-quantidade" type="number" min={1} step={1} value={Number.isNaN(quantidade) ? "" : quantidade} onChange={(e) => setQuantidade(e.target.valueAsNumber)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-motivo">Motivo da baixa</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="reposicao-motivo"><SelectValue placeholder="Escolha o motivo" /></SelectTrigger>
              <SelectContent>{MOTIVOS_BAIXA_CAIXA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-onus">Ônus da baixa</Label>
            <Select value={onus} onValueChange={setOnus}>
              <SelectTrigger id="reposicao-onus"><SelectValue /></SelectTrigger>
              <SelectContent>{ONUS_BAIXA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reposicao-data">Data</Label>
            <Input id="reposicao-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reposicao-observacao">Observação</Label>
            <Textarea id="reposicao-observacao" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <Button requiresWrite="operar" type="button" disabled={salvarCaixa.isPending || registrar.isPending} onClick={repor}>Registrar reposição e gerar termo</Button>
        <p className="text-xs text-muted-foreground">A baixa da reposição aparece também em Baixa e no relatório de Entradas e saídas.</p>
      </section>
    </div>
  );
}
