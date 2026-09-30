import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData, formatarMoeda } from "@/lib/gemape";
import {
  useComprasUniformes,
  useEmpresas,
  useItens,
  useSalvar,
  useExcluir,
  type CompraUniforme,
} from "@/lib/hooks-gemape";

const CHAVES = ["compras_uniformes", "itens", "movimentacoes"];

export function UniformesComprasModulo() {
  const { empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CompraUniforme | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(0);

  const { data: compras = [], isLoading } = useComprasUniformes(empresaId, busca);
  const { data: empresas = [] } = useEmpresas();
  const { data: itens = [] } = useItens("uniforme", TODAS);

  const salvar = useSalvar("compras_uniformes", CHAVES);
  const excluir = useExcluir("compras_uniformes", CHAVES);

  function abrirNovo() {
    setEditando(null);
    setQuantidade(0);
    setValorUnitario(0);
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    const valores = {
      empresa_id: String(f.get("empresa_id")),
      item_id: String(f.get("item_id")),
      fornecedor: String(f.get("fornecedor")),
      nota_fiscal: String(f.get("nota_fiscal") || ""),
      data_compra: String(f.get("data_compra")),
      quantidade: Number(f.get("quantidade")),
      valor_unitario: Number(f.get("valor_unitario")),
      observacao: String(f.get("observacao") || ""),
    };

    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false) },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por fornecedor ou NF"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "compras_uniformes",
                compras.map((c) => ({
                  Data: formatarData(c.data_compra),
                  Empresa: empresas.find((e) => e.id === c.empresa_id)?.nome_fantasia,
                  Uniforme: itens.find((i) => i.id === c.item_id)?.nome,
                  Fornecedor: c.fornecedor,
                  NF: c.nota_fiscal,
                  Qtd: c.quantidade,
                  Unitario: formatarMoeda(c.valor_unitario),
                  Total: formatarMoeda(c.valor_total ?? 0),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>Registrar Compra</Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Uniforme</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>NF</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Unitário</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : compras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Nenhuma compra registrada.
                </TableCell>
              </TableRow>
            ) : (
              compras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{formatarData(c.data_compra)}</TableCell>
                  <TableCell>
                    {empresas.find((e) => e.id === c.empresa_id)?.nome_fantasia}
                  </TableCell>
                  <TableCell>{itens.find((i) => i.id === c.item_id)?.nome}</TableCell>
                  <TableCell>{c.fornecedor}</TableCell>
                  <TableCell>{c.nota_fiscal || "—"}</TableCell>
                  <TableCell className="text-right">{c.quantidade}</TableCell>
                  <TableCell className="text-right">{formatarMoeda(c.valor_unitario)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatarMoeda(c.valor_total ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Excluir esta compra? (O estoque não será revertido automaticamente)",
                          )
                        ) {
                          excluir.mutate(c.id);
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Compra de Uniforme</DialogTitle>
            <DialogDescription>
              Os dados da compra atualizarão automaticamente o estoque e gerarão uma movimentação de
              entrada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                name="empresa_id"
                required
                defaultValue={empresaId !== TODAS ? empresaId : ""}
              >
                <SelectTrigger id="empresa_id">
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
              <Label htmlFor="item_id">Uniforme</Label>
              <Select name="item_id" required>
                <SelectTrigger id="item_id">
                  <SelectValue placeholder="Selecione o uniforme" />
                </SelectTrigger>
                <SelectContent>
                  {itens.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.codigo_sku} · {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input id="fornecedor" name="fornecedor" required placeholder="Nome do fornecedor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nota_fiscal">Nota Fiscal</Label>
              <Input id="nota_fiscal" name="nota_fiscal" placeholder="Número da NF" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_compra">Data da Compra</Label>
              <Input
                id="data_compra"
                name="data_compra"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                name="quantidade"
                type="number"
                required
                min="1"
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor_unitario">Valor Unitário (R$)</Label>
              <Input
                id="valor_unitario"
                name="valor_unitario"
                type="number"
                step="0.01"
                required
                min="0.01"
                onChange={(e) => setValorUnitario(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Total</Label>
              <Input
                value={formatarMoeda(quantidade * valorUnitario)}
                readOnly
                className="bg-muted font-bold"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" name="observacao" rows={3} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending}>
                Registrar Compra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
