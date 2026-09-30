import { useRef, useState } from "react";
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
import { useEmpresas, useItens, useEmpregados, useRegistrarMovimentacoesLote } from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { montarTermoEntregaEpiHtml, observacaoEntregaEpi } from "@/lib/termo-entrega-epi-html";
import { validarSaidaDeEpis } from "@/lib/termos-atomicos";

interface ItemTermo {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
}

export function EpiTermoEntrega() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataEntrega, setDataEntrega] = useState(hojeLocal());
  const [itensTermo, setItensTermo] = useState<ItemTermo[]>([]);

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", TODAS);

  const registrarLote = useRegistrarMovimentacoesLote(["movimentacoes", "epis"]);
  const salvando = useRef(false);

  function adicionarItem() {
    setItensTermo([
      ...itensTermo,
      { id: Math.random().toString(36).substr(2, 9), item_id: "", quantidade: 1, estado: "Novo" },
    ]);
  }

  function removerItem(id: string) {
    setItensTermo(itensTermo.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemTermo, valor: string | number) {
    setItensTermo(itensTermo.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  }

  async function gerarTermo() {
    if (salvando.current) return;
    if (!empregadoId || itensTermo.length === 0) {
      alert("Selecione um empregado e adicione pelo menos um item.");
      return;
    }

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const bloqueio = bloqueioPorDemissao(empregado, "entrega", dataEntrega);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) return;

    // Não entrega mais do que o estoque disponível nem grava linha sem EPI.
    const erro = validarSaidaDeEpis(itensTermo, itens);
    if (erro) {
      alert(erro);
      return;
    }

    // Registra todas as saídas de uma vez: ou entram todas, ou nenhuma.
    const movimentacoesLote = itensTermo.map((item) => ({
      modulo: "epi",
      tipo_movimentacao: "Saida",
      quantidade: item.quantidade,
      data_movimentacao: dataEntrega,
      item_id: item.item_id,
      empresa_id: empresaSel,
      empregado_id: empregadoId,
      observacao: observacaoEntregaEpi(),
    }));

    salvando.current = true;
    try {
      await registrarLote.mutateAsync(movimentacoesLote);
    } catch {
      // O hook já mostra toast de erro. Paramos o processo.
      return;
    } finally {
      salvando.current = false;
    }
    // Limpa a lista para um segundo clique não registrar a mesma entrega de novo.
    const itensDoTermo = itensTermo;
    setItensTermo([]);

    const html = montarTermoEntregaEpiHtml({
      empresa,
      empregado,
      data: dataEntrega,
      linhas: itensDoTermo.map((it) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return {
          nome: itemInfo?.nome,
          ca: itemInfo?.ca,
          quantidade: it.quantidade,
          estado: it.estado,
        };
      }),
    });

    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
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
          <div className="space-y-1.5">
            <Label>Empregado</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empregado" />
              </SelectTrigger>
              <SelectContent>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data da Entrega</Label>
            <Input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-bold">Itens Entregues</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar EPI
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-40">Estado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensTermo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado. Clique em "+ Adicionar EPI".
                    </TableCell>
                  </TableRow>
                ) : (
                  itensTermo.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Select
                          value={it.item_id}
                          onValueChange={(v) => atualizarItem(it.id, "item_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o EPI" />
                          </SelectTrigger>
                          <SelectContent>
                            {itens.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.codigo_sku} · {i.nome}
                                {i.ca ? ` (CA: ${i.ca})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={it.quantidade}
                          onChange={(e) =>
                            atualizarItem(it.id, "quantidade", Number(e.target.value))
                          }
                        />
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
                          </SelectContent>
                        </Select>
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
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={registrarLote.isPending}>
            Gerar Termo de Entrega
          </Button>
        </div>
      </div>
    </div>
  );
}
