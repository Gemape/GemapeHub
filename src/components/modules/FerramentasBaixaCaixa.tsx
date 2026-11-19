import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { hojeLocal } from "@/lib/empregados";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { MODO_DEMO } from "@/lib/modo-demo";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { ehBaixa } from "@/lib/historico-movimentacoes";
import { lerMotivosBaixaFerramenta } from "@/lib/ferramentas-motivos-baixa";
import { descricaoDaBaixaDefinitiva, ehDoGrupo, erroDaBaixaEmLote, gruposDasFerramentas } from "@/lib/movimentacoes-grupo-caixa";
import { portadorAtivo, rotuloDaCaixaComPortador } from "@/lib/portadores-caixa";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { useLinhasDaCaixa } from "@/lib/use-linhas-da-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useCaixasFerramentas, useItens, useMovimentacoes, useRegistrarMovimentacoesLote } from "@/lib/hooks-gemape";

// Ferramentas > Movimentações > Baixa definitiva: caixa, grupo, as ferramentas da caixa com caixa de seleção, e então quantidade, data e motivo (de Parâmetros Específicos).
// Salvar baixa as ferramentas marcadas e abre uma ocorrência para cada uma, para apurar a responsabilidade.
export function FerramentasBaixaCaixa() {
  const { empresaId } = useEmpresa();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const caixas = caixasHabilitadas(todasCaixas, habilitadas).filter((c) => empresaId === TODAS || c.empresa_id === empresaId);
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const portadores = usePortadoresCaixa();
  const registrar = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"], false);
  const [motivos] = useState(lerMotivosBaixaFerramenta);
  const [caixaId, setCaixaId] = useState("");
  const [grupo, setGrupo] = useState("");
  // Ferramentas marcadas, com a quantidade de cada uma.
  const [marcadas, setMarcadas] = useState<Record<string, number>>({});
  const [data, setData] = useState(hojeLocal());
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [gravando, setGravando] = useState(false);
  const [ocorrenciasAbertas, setOcorrenciasAbertas] = useState<number | null>(null);

  const caixa = caixas.find((c) => c.id === caixaId);
  const { pronto, linhas } = useLinhasDaCaixa(caixa);
  const grupos = gruposDasFerramentas(linhas.map((l) => l.ferramenta));
  const doGrupo = linhas.filter((l) => ehDoGrupo(l.ferramenta, grupo));
  const baixas = movimentos.filter((m) => m.tipo_movimentacao === "Saida" && ehBaixa(m) && (!caixaId || m.caixa_id === caixaId));
  const codigoDaCaixa = (id: string | null | undefined) => todasCaixas.find((c) => c.id === id)?.codigo ?? "—";
  const nomeFerramenta = (id: string | null) => { const f = ferramentas.find((x) => x.id === id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}` : "—"; };

  function escolherCaixa(id: string) { setCaixaId(id); setGrupo(""); setMarcadas({}); setOcorrenciasAbertas(null); }
  function escolherGrupo(g: string) { setGrupo(g); setMarcadas({}); }
  function marcar(id: string, ligada: boolean) {
    setMarcadas((atual) => {
      const { [id]: _, ...resto } = atual;
      return ligada ? { ...atual, [id]: 1 } : resto;
    });
  }

  async function baixar() {
    if (!caixa || gravando) return;
    const escolhidas = doGrupo.filter((l) => l.ferramenta.id in marcadas);
    const erro = erroDaBaixaEmLote({
      selecionadas: escolhidas.map((l) => ({ nome: l.ferramenta.nome, quantidade: marcadas[l.ferramenta.id] ?? Number.NaN, disponivel: l.disponivel, saldoEstoque: Number(l.ferramenta.estoque_atual) || 0 })),
      motivo, data,
    });
    if (erro) return void alert(erro);
    setGravando(true);
    try {
      const portador = portadorAtivo(portadores, caixa.id);
      const complemento = observacao.trim() ? ` ${capitalizarTexto(observacao.trim())}` : "";
      await registrar.mutateAsync(escolhidas.map((l) => ({
        modulo: "ferramenta", item_id: l.ferramenta.id, veiculo_id: null, empresa_id: l.ferramenta.empresa_id, empregado_id: null,
        tipo_movimentacao: "Saida", motivo_baixa: motivo, quantidade: marcadas[l.ferramenta.id], onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false,
        tipo_ocorrencia: null, conducao_ocorrencia: null, data_movimentacao: data, origem_local: null, destino_local: null,
        observacao: `Baixa definitiva pela caixa ${caixa.codigo}.${complemento}`.slice(0, 500),
        ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
      })));
      // A baixa já está gravada; a ocorrência vem logo depois e, se falhar, o aviso diz para registrá-la à mão.
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const { error } = await supabase.from("ocorrencias").insert(escolhidas.map((l) => ({
        data, hora, responsavel_registro: "Baixa definitiva", tipo_ocorrencia: "Ferramenta", empregado_id: portador?.empregado_id ?? null, item_id: l.ferramenta.id, veiculo_id: null,
        descricao_ocorrencia: descricaoDaBaixaDefinitiva({ ferramenta: l.ferramenta.nome, quantidade: marcadas[l.ferramenta.id] ?? 0, caixa: caixa.codigo, motivo, data, portador: portador?.empregado_nome, observacao }),
        ...(MODO_DEMO ? { caixa_id: caixa.id } : {}),
      })) as never);
      void queryClient.invalidateQueries();
      if (error) toast.error(`A baixa foi registrada, mas a ocorrência não foi aberta (${error.message}). Registre-a em Ocorrências de Ferramentas para apurar a responsabilidade.`);
      else { toast.success("Baixa registrada."); setOcorrenciasAbertas(escolhidas.length); }
      setMarcadas({}); setObservacao("");
    } catch {
      // O aviso de falha da baixa já aparece pela própria operação.
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel max-w-4xl space-y-4 p-5" aria-label="Baixa definitiva de ferramenta">
        <p className="text-sm text-muted-foreground">Escolha a caixa e o grupo; marque as ferramentas que saem de vez. Ao salvar, o estoque e a composição da caixa diminuem e abre-se uma ocorrência para apurar a responsabilidade.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="baixa-caixa">Caixa</Label>
            <Select value={caixaId} onValueChange={escolherCaixa}>
              <SelectTrigger id="baixa-caixa"><SelectValue placeholder={isLoading ? "Carregando..." : "Escolha a caixa"} /></SelectTrigger>
              <SelectContent>{[...caixas].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")).map((c) => <SelectItem key={c.id} value={c.id}>{rotuloDaCaixaComPortador(portadores, c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baixa-grupo">Grupo de ferramentas</Label>
            <Select value={grupo} onValueChange={escolherGrupo} disabled={!caixa || !pronto || grupos.length === 0}>
              <SelectTrigger id="baixa-grupo"><SelectValue placeholder={!caixa ? "Escolha a caixa primeiro" : !pronto ? "Carregando..." : grupos.length === 0 ? "A caixa não tem ferramentas" : "Escolha o grupo"} /></SelectTrigger>
              <SelectContent>{grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {caixa && grupo && (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead className="w-10"><span className="sr-only">Marcar</span></TableHead><TableHead>Ferramenta</TableHead><TableHead className="text-right">Guardadas na caixa</TableHead><TableHead className="w-32">Quantidade</TableHead></TableRow></TableHeader>
                <TableBody>
                  {doGrupo.map((l) => {
                    const id = l.ferramenta.id;
                    const marcada = id in marcadas;
                    return (
                      <TableRow key={id}>
                        <TableCell><input type="checkbox" aria-label={`Marcar para baixa: ${l.ferramenta.nome}`} checked={marcada} disabled={l.disponivel < 1} onChange={(e) => marcar(id, e.target.checked)} /></TableCell>
                        <TableCell>{l.ferramenta.codigo_sku} — {l.ferramenta.nome}{sufixoTamanhoFerramenta(l.ferramenta)}</TableCell>
                        <TableCell className="text-right">{l.disponivel}{l.comEmpregado > 0 ? ` (${l.comEmpregado} com empregado)` : ""}</TableCell>
                        <TableCell>
                          {marcada && <Input type="number" min={1} max={l.disponivel} step={1} aria-label={`Quantidade de ${l.ferramenta.nome}`} value={Number.isNaN(marcadas[id]) ? "" : marcadas[id]} onChange={(e) => setMarcadas((atual) => ({ ...atual, [id]: e.target.valueAsNumber }))} />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="baixa-data">Data</Label>
                <Input id="baixa-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="baixa-motivo">Motivo da baixa</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger id="baixa-motivo"><SelectValue placeholder="Escolha o motivo" /></SelectTrigger>
                  <SelectContent>{motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="baixa-observacao">Observação</Label>
                <Textarea id="baixa-observacao" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button requiresWrite="operar" type="button" disabled={gravando || Object.keys(marcadas).length === 0} onClick={() => void baixar()}>Registrar baixa</Button>
            </div>
          </>
        )}

        {ocorrenciasAbertas !== null && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <span>{ocorrenciasAbertas === 1 ? "Foi aberta 1 ocorrência" : `Foram abertas ${ocorrenciasAbertas} ocorrências`} para apurar a responsabilidade pela baixa.</span>
            <Button requiresWrite="operar" type="button" variant="outline" onClick={() => void navigate({ to: "/ferramentas", search: { aba: "ocorrencias" } })}>Realizar tratativa</Button>
          </div>
        )}
      </section>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Caixa</TableHead><TableHead>Ferramenta</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead>Motivo</TableHead><TableHead>Ônus</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={7} />
              : baixas.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">Nenhuma baixa registrada.</TableCell></TableRow>
                : baixas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                    <TableCell className="font-mono text-xs">{codigoDaCaixa(m.caixa_id)}</TableCell>
                    <TableCell>{nomeFerramenta(m.item_id)}</TableCell>
                    <TableCell className="text-right">{m.quantidade}</TableCell>
                    <TableCell>{m.motivo_baixa}</TableCell>
                    <TableCell>{m.onus_baixa ?? "A apurar"}</TableCell>
                    <TableCell className="max-w-64 truncate" title={m.observacao ?? ""}>{m.observacao}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
