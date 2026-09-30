import { useRef, useState } from "react";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { portadorNaData } from "@/lib/portadores-caixa";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import {
  useEmpresas,
  useItens,
  useEmpregados,
  useRegistrarMovimentacoesLote,
  useCaixasFerramentas,
  useCaixaItens,
} from "@/lib/hooks-gemape";
import { empregadoDoTermo, validarTermoVistoria } from "@/lib/termos-atomicos";
import { montarTermoVistoriaHtml } from "@/lib/termo-vistoria-html";

interface ItemVistoria {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
  conformidade: "Conforme" | "Não Conforme";
  observacao: string;
}

export function FerramentasTermoVistoria() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [caixaSel, setCaixaSel] = useState("");
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().slice(0, 10));
  const [itensVistoria, setItensVistoria] = useState<ItemVistoria[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("ferramenta", TODAS);
  const { data: todasAsCaixas = [] } = useCaixasFerramentas(empresaSel || TODAS);
  // Só caixas habilitadas em Cadastros > Gerais > Caixas.
  const caixas = caixasHabilitadas(todasAsCaixas, useParametrosBase().caixasHabilitadas);
  const portadores = usePortadoresCaixa();

  const { data: itensCaixa = [], refetch: buscarItensCaixa } = useCaixaItens(caixaSel || null);

  const registrarVistorias = useRegistrarMovimentacoesLote(["movimentacoes", "ferramentas"]);
  const salvando = useRef(false);

  async function carregarItensDaCaixa() {
    if (!caixaSel) {
      alert("Selecione uma caixa.");
      return;
    }

    const { data: novosItens } = await buscarItensCaixa();

    if (!novosItens || novosItens.length === 0) {
      alert("Nenhum item encontrado nesta caixa.");
      return;
    }

    setItensVistoria(
      novosItens.map((ci) => ({
        id: Math.random().toString(36).substr(2, 9),
        item_id: ci.ferramenta_id,
        quantidade: ci.quantidade,
        estado: ci.ferramenta?.status || "Usado",
        conformidade: "Conforme",
        observacao: ci.observacao || "",
      })),
    );
  }

  function adicionarItem() {
    setItensVistoria([
      ...itensVistoria,
      {
        id: Math.random().toString(36).substr(2, 9),
        item_id: "",
        quantidade: 1,
        estado: "Usado",
        conformidade: "Conforme",
        observacao: "",
      },
    ]);
  }

  function removerItem(id: string) {
    setItensVistoria(itensVistoria.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemVistoria, valor: string | number) {
    setItensVistoria(itensVistoria.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }

  async function gerarTermo() {
    if (salvando.current) return;
    const erro = validarTermoVistoria(itensVistoria);
    if (erro) {
      alert(erro);
      return;
    }

    const empresa = empresas.find((e) => e.id === empresaSel);
    const empregado = empregados.find((e) => e.id === empregadoId);
    const caixa = caixas.find((c) => c.id === caixaSel);

    if (!empresa) return;

    // Registra todas as vistorias de uma vez: ou entram todas, ou nenhuma.
    salvando.current = true;
    try {
      await registrarVistorias.mutateAsync(
        itensVistoria.map((item) => ({
          modulo: "ferramenta",
          tipo_movimentacao: "Vistoria", // Só registra a vistoria; o banco não altera o estoque
          quantidade: item.quantidade,
          data_movimentacao: dataVistoria,
          item_id: item.item_id,
          empresa_id: empresaSel,
          empregado_id: empregadoDoTermo(empregadoId),
          tipo_vistoria: "Periódica",
          observacao: `Vistoria Periódica - Caixa: ${caixa?.codigo || "N/A"} - Status: ${item.conformidade}. Obs: ${item.observacao}`,
        })),
      );
    } catch {
      // A falha já aparece no aviso da gravação.
      return;
    } finally {
      salvando.current = false;
    }
    // Limpa a lista para um segundo clique não registrar a mesma vistoria de novo.
    const itensDoTermo = itensVistoria;
    setItensVistoria([]);

    const html = montarTermoVistoriaHtml({
      empresa,
      caixa,
      responsavel: empregado?.nome || (caixa ? portadorNaData(portadores, caixa.id, dataVistoria)?.empregado_nome : undefined),
      data: dataVistoria,
      linhas: itensDoTermo.map((it) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return {
          codigo: itemInfo?.codigo_sku,
          nome: itemInfo?.nome,
          conformidade: it.conformidade,
          estado: it.estado,
          observacao: it.observacao,
        };
      }),
    });

    abrirDocumento({
      titulo: "Termo de Vistoria",
      html,
      arquivo: nomeArquivoDocumento("Termo de Vistoria", caixa?.codigo, dataVistoria),
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Responsável (Empregado)</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Nenhum / Empresa</SelectItem>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Caixa de Ferramentas</Label>
            <div className="flex gap-2">
              <Select value={caixaSel} onValueChange={setCaixaSel}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione a caixa" />
                </SelectTrigger>
                <SelectContent>
                  {caixas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} - {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={carregarItensDaCaixa}>
                Carregar
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Data da Vistoria</Label>
            <Input
              type="date"
              value={dataVistoria}
              onChange={(e) => setDataVistoria(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-bold">Itens Vistoriados</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar Item
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead>Observação/Ação</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensVistoria.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  itensVistoria.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Select
                          value={it.item_id}
                          onValueChange={(v) => atualizarItem(it.id, "item_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {itens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome} ({i.codigo_sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={it.conformidade}
                          onValueChange={(v: "Conforme" | "Não Conforme") =>
                            atualizarItem(it.id, "conformidade", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Conforme">Conforme</SelectItem>
                            <SelectItem value="Não Conforme">Não Conforme</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={it.estado}
                          onValueChange={(v) => atualizarItem(it.id, "estado", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Novo">Novo</SelectItem>
                            <SelectItem value="Usado">Usado</SelectItem>
                            <SelectItem value="Danificado">Danificado</SelectItem>
                            <SelectItem value="Manutenção">Manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.observacao}
                          onChange={(e) => atualizarItem(it.id, "observacao", e.target.value)}
                          placeholder="Ex: Necessita limpeza"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerItem(it.id)}
                          className="text-red-500"
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={registrarVistorias.isPending}>
            Gerar Termo de Vistoria
          </Button>
        </div>
      </div>
    </div>
  );
}
