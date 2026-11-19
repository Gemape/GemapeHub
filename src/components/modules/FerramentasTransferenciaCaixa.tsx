import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { hojeLocal } from "@/lib/empregados";
import { MODO_DEMO } from "@/lib/modo-demo";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { grupoDaFerramenta, erroDaTransferenciaEmLote } from "@/lib/movimentacoes-grupo-caixa";
import { portadorAtivo, rotuloDaCaixaComPortador } from "@/lib/portadores-caixa";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { abrirTermoDeRecebimento } from "@/lib/termo-recebimento-caixa";
import { useLinhasDaCaixa } from "@/lib/use-linhas-da-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useCaixasFerramentas, useEmpregados, useItens, useMovimentacoes, useRegistrarMovimentacoesLote, useSalvarCaixa, useTodosCaixaItens, type CaixaFerramenta } from "@/lib/hooks-gemape";

const valoresDe = (c: CaixaFerramenta) => ({ codigo: c.codigo, codigo_num: c.codigo_num, empresa_id: c.empresa_id, nome: c.nome, descricao: c.descricao, localizacao: c.localizacao, status: c.status });

// Ferramentas > Movimentações > Transferência: caixa de origem, caixa de destino e as ferramentas que mudam de caixa.
// A origem perde e o destino ganha a mesma quantidade; o portador da caixa de destino recebe o termo de responsabilidade.
export function FerramentasTransferenciaCaixa() {
  const { empresaId, empresas } = useEmpresa();
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const { data: todasCaixas = [], isLoading } = useCaixasFerramentas(TODAS, "");
  const caixas = caixasHabilitadas(todasCaixas, habilitadas).filter((c) => empresaId === TODAS || c.empresa_id === empresaId);
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const { data: ferramentas = [] } = useItens("ferramenta", TODAS);
  const { data: movimentos = [] } = useMovimentacoes("ferramenta", empresaId);
  const { data: empregados = [] } = useEmpregados(TODAS);
  const portadores = usePortadoresCaixa();
  const salvarCaixa = useSalvarCaixa();
  const registrar = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"], false);
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [gravando, setGravando] = useState(false);

  const origem = caixas.find((c) => c.id === origemId);
  const destino = caixas.find((c) => c.id === destinoId);
  const { pronto, linhas } = useLinhasDaCaixa(origem);
  // O destino é de outra caixa e da mesma empresa: ferramenta não muda de empresa por transferência.
  const destinos = caixas.filter((c) => c.id !== origemId && (!origem || c.empresa_id === origem.empresa_id));
  const codigoDaCaixa = (id: string | null | undefined) => todasCaixas.find((c) => c.id === id)?.codigo ?? "—";
  const nomeFerramenta = (id: string | null) => { const f = ferramentas.find((x) => x.id === id); return f ? `${f.codigo_sku ? `${f.codigo_sku} — ` : ""}${f.nome}` : "—"; };
  // Só as que saem de uma caixa: a entrega à caixa e a reposição saem do Estoque.
  const transferencias = movimentos.filter((m) => m.tipo_movimentacao === "Transferencia" && todasCaixas.some((c) => c.codigo === m.origem_local));

  function escolherOrigem(id: string) { setOrigemId(id); setDestinoId(""); setMarcadas(new Set()); }
  function alternar(id: string, ligada: boolean) {
    setMarcadas((atual) => { const novo = new Set(atual); if (ligada) novo.add(id); else novo.delete(id); return novo; });
  }

  async function transferir() {
    if (!origem || !destino || gravando) return;
    const escolhidas = linhas.filter((l) => marcadas.has(l.ferramenta.id));
    const erro = erroDaTransferenciaEmLote({
      origemId: origem.id, destinoId: destino.id,
      selecionadas: escolhidas.map((l) => ({ nome: l.ferramenta.nome, comEmpregado: l.comEmpregado, quantidade: l.quantidade, disponivel: l.disponivel, jaNoDestino: itensDeTodas.some((i) => i.caixa_id === destino.id && i.ferramenta_id === l.ferramenta.id) })),
    });
    if (erro) return void alert(erro);
    const resumo = escolhidas.map((l) => l.ferramenta.nome).join(", ");
    if (!window.confirm(`Transferir da caixa ${origem.codigo} para a caixa ${destino.codigo}: ${resumo}?\n\nA caixa ${origem.codigo} perde essas ferramentas e a caixa ${destino.codigo} as recebe. O portador da caixa ${destino.codigo} passa a responder por elas e recebe o termo de responsabilidade.`)) return;
    setGravando(true);
    // A composição das duas caixas é lida de novo na hora de gravar: a lista em tela pode estar velha, e a gravação troca o conjunto inteiro.
    const itensDa = async (id: string) => {
      const { data: itens, error } = await supabase.from("caixa_ferramenta_itens").select("ferramenta_id, quantidade, observacao").eq("caixa_id", id);
      if (error) throw error;
      return (itens ?? []).map((i) => ({ ferramenta_id: i.ferramenta_id, quantidade: i.quantidade, observacao: i.observacao ?? "" }));
    };
    const idsMovidos = new Set(escolhidas.map((l) => l.ferramenta.id));
    try {
      const [itensOrigemAntes, itensDestinoAntes] = await Promise.all([itensDa(origem.id), itensDa(destino.id)]);
      const movidos = itensOrigemAntes.filter((i) => idsMovidos.has(i.ferramenta_id));
      if (movidos.length !== idsMovidos.size) throw new Error("A composição da caixa de origem mudou. Atualize a tela e escolha de novo.");
      if (itensDestinoAntes.some((i) => idsMovidos.has(i.ferramenta_id))) throw new Error("Uma das ferramentas já está na caixa de destino. Atualize a tela e escolha de novo.");
      // Sai da origem e depois entra no destino; se a entrada falhar, volta para a origem, para a ferramenta nunca ficar sem caixa.
      await salvarCaixa.mutateAsync({ id: origem.id, valores: valoresDe(origem), itens: itensOrigemAntes.filter((i) => !idsMovidos.has(i.ferramenta_id)) });
      try {
        await salvarCaixa.mutateAsync({ id: destino.id, valores: valoresDe(destino), itens: [...itensDestinoAntes, ...movidos] });
      } catch (erroDestino) {
        await salvarCaixa.mutateAsync({ id: origem.id, valores: valoresDe(origem), itens: itensOrigemAntes }).catch(() => {
          alert(`Não foi possível devolver as ferramentas à caixa ${origem.codigo}. Confira as caixas antes de tentar de novo.`);
        });
        throw erroDestino;
      }
      const data = hojeLocal();
      await registrar.mutateAsync(movidos.map((i) => {
        const f = escolhidas.find((l) => l.ferramenta.id === i.ferramenta_id)!.ferramenta;
        return {
          modulo: "ferramenta", item_id: i.ferramenta_id, veiculo_id: null, empresa_id: f.empresa_id, empregado_id: null, tipo_movimentacao: "Transferencia", motivo_baixa: null,
          quantidade: i.quantidade, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, tipo_ocorrencia: null, conducao_ocorrencia: null, data_movimentacao: data,
          origem_local: origem.codigo, destino_local: destino.codigo, observacao: `Transferida da caixa ${origem.codigo} para a caixa ${destino.codigo}.`,
          ...(MODO_DEMO ? { caixa_id: destino.id } : {}),
        };
      }));
      toast.success(`${movidos.length === 1 ? "Ferramenta transferida" : `${movidos.length} ferramentas transferidas`} para a caixa ${destino.codigo}.`);
      const portadorId = portadorAtivo(portadores, destino.id)?.empregado_id;
      abrirTermoDeRecebimento({
        empresa: empresas.find((e) => e.id === destino.empresa_id), portador: empregados.find((e) => e.id === portadorId), caixaCodigo: destino.codigo, data,
        ferramentas: movidos.map((i) => { const f = escolhidas.find((l) => l.ferramenta.id === i.ferramenta_id)!.ferramenta; return { codigo_sku: f.codigo_sku, nome: f.nome, marca: f.marca, quantidade: i.quantidade }; }),
      });
      setMarcadas(new Set());
    } catch (falha) {
      // Os erros das gravações já aparecem como aviso; este cobre a leitura e a falha do histórico, que deixa as caixas já trocadas.
      toast.error(falha instanceof Error ? falha.message : "A transferência não foi concluída. Confira as caixas e o histórico antes de tentar de novo.");
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel max-w-4xl space-y-4 p-5" aria-label="Transferência entre caixas">
        <p className="text-sm text-muted-foreground">Escolha a caixa de origem, a de destino e as ferramentas que mudam de caixa. A origem perde e o destino ganha a mesma quantidade, e o portador da caixa de destino recebe o termo de responsabilidade.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="transf-origem">Caixa de origem</Label>
            <Select value={origemId} onValueChange={escolherOrigem}>
              <SelectTrigger id="transf-origem"><SelectValue placeholder={isLoading ? "Carregando..." : "Escolha a caixa de origem"} /></SelectTrigger>
              <SelectContent>{[...caixas].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")).map((c) => <SelectItem key={c.id} value={c.id}>{rotuloDaCaixaComPortador(portadores, c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transf-destino-caixa">Caixa de destino</Label>
            <Select value={destinoId} onValueChange={setDestinoId} disabled={!origem}>
              <SelectTrigger id="transf-destino-caixa"><SelectValue placeholder={origem ? "Escolha a caixa de destino" : "Escolha a origem primeiro"} /></SelectTrigger>
              <SelectContent>{[...destinos].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")).map((c) => <SelectItem key={c.id} value={c.id}>{rotuloDaCaixaComPortador(portadores, c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {origem && destino && (
          <>
            {!pronto ? <p className="text-sm text-muted-foreground">Carregando as ferramentas da caixa...</p>
              : linhas.length === 0 ? <p className="text-sm text-muted-foreground">A caixa {origem.codigo} não tem ferramentas para transferir.</p> : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-10"><span className="sr-only">Transferir</span></TableHead><TableHead>Ferramenta</TableHead><TableHead>Grupo</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {linhas.map((l) => {
                        const id = l.ferramenta.id;
                        const impedida = l.comEmpregado > 0 || l.disponivel < l.quantidade || itensDeTodas.some((i) => i.caixa_id === destino.id && i.ferramenta_id === id);
                        return (
                          <TableRow key={id}>
                            <TableCell><input type="checkbox" aria-label={`Transferir ${l.ferramenta.nome}`} checked={marcadas.has(id)} disabled={impedida} onChange={(e) => alternar(id, e.target.checked)} /></TableCell>
                            <TableCell>{l.ferramenta.codigo_sku} — {l.ferramenta.nome}{sufixoTamanhoFerramenta(l.ferramenta)}{impedida ? <span className="ml-2 text-xs text-muted-foreground">{l.comEmpregado > 0 ? "com empregado" : l.disponivel < l.quantidade ? "com baixa registrada" : "já na caixa de destino"}</span> : null}</TableCell>
                            <TableCell>{grupoDaFerramenta(l.ferramenta)}</TableCell>
                            <TableCell className="text-right">{l.quantidade}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            <div className="flex justify-end">
              <Button requiresWrite="operar" type="button" disabled={gravando || marcadas.size === 0} onClick={() => void transferir()}>Transferir</Button>
            </div>
          </>
        )}
      </section>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Ferramenta</TableHead><TableHead className="text-right">Qtd</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={5} />
              : transferencias.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center">Nenhuma transferência registrada.</TableCell></TableRow>
                : transferencias.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                    <TableCell className="font-mono text-xs">{m.origem_local ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{m.destino_local ?? codigoDaCaixa(m.caixa_id)}</TableCell>
                    <TableCell>{nomeFerramenta(m.item_id)}</TableCell>
                    <TableCell className="text-right">{m.quantidade}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
