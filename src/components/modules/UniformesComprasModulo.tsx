import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useState } from "react";
import { EnderecoDaEntrada } from "@/components/EnderecoDaEntrada";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
import { DevolucaoEpiDialog } from "@/components/modules/DevolucaoEpiDialog";
import { EntradasDeUsados } from "@/components/modules/EpiComprasModulo";
import { SeletorFornecedorCompra } from "@/components/modules/SeletorFornecedorCompra";
import { ImportarNfeXml } from "@/components/modules/ImportarNfeXml";
import { pedeTamanho, SeletorTamanho, TAMANHO_DISPONIVEL } from "@/components/SeletorTamanho";
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
import { empresasParaEscolha } from "@/lib/empresas";
import { exportarCsv, formatarData, formatarMoeda } from "@/lib/gemape";
import {
  useComprasUniformes,
  useEmpresas,
  useItens,
  useSalvar,
  useExcluir,
  type CompraUniforme,
} from "@/lib/hooks-gemape";
import { escolherFornecedorDaCompra } from "@/lib/compras-fornecedor";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import { MODO_DEMO } from "@/lib/modo-demo";
import { saldoParaCompra } from "@/lib/estoque-epi-saldos";
import { nomeTamanhoGravado, tamanhoParaGravar, validarLinhasTamanho } from "@/lib/estoque-tamanho";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { hojeLocal } from "@/lib/empregados";

const CHAVES = ["compras_uniformes", "itens", "movimentacoes"];

export function UniformesComprasModulo() {
  const { empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [devolucaoAberta, setDevolucaoAberta] = useState(false);
  const [buscaDevolucao, setBuscaDevolucao] = useState("");
  const [visao, setVisao] = useState<"compras" | "devolucoes">("compras");
  const [editando, setEditando] = useState<CompraUniforme | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(0);
  // Produto e tamanho escolhidos: produto com tamanho em Gerais pede o tamanho (decisão 23).
  const [itemSel, setItemSel] = useState("");
  // Empresa da compra: o item escolhido tem de ser do cadastro dela (cada empresa tem o seu registro do mesmo produto).
  const [empresaCompra, setEmpresaCompra] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const parametros = useParametrosBase();

  const { data: compras = [], isLoading } = useComprasUniformes(empresaId, busca);
  const { data: empresas = [] } = useEmpresas();
  const { data: itens = [] } = useItens("uniforme", TODAS);

  const salvar = useSalvar("compras_uniformes", CHAVES);
  const excluir = useExcluir("compras_uniformes", CHAVES);

  // Saldo do produto (e do tamanho escolhido) no estoque da empresa: todas as compras, de qualquer fornecedor, somam nele, como no EPI (decisão 412).
  const itemEscolhido = itens.find((i) => i.id === itemSel);
  // Sem tamanho escolhido (ou produto sem tamanho), vale o saldo total do item; com tamanho, o saldo dele.
  const saldoDoEscolhido = saldoParaCompra(parametros, itemEscolhido, "uniforme", tamanho, editando, itemSel);

  function abrirNovo() {
    setEditando(null);
    setQuantidade(0);
    setValorUnitario(0);
    setItemSel("");
    setTamanho("");
    setFornecedorId("");
    setEmpresaCompra(empresasParaEscolha(empresas).some((e) => e.id === empresaId) ? empresaId : "");
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const itemId = String(f.get("item_id"));
    const quantidadeCompra = Number(f.get("quantidade"));
    if (TAMANHO_DISPONIVEL) {
      const erro = validarLinhasTamanho(
        [{ item_id: itemId, quantidade: quantidadeCompra, tamanho }],
        itens,
        parametros,
        "uniforme",
        "entrada",
      );
      if (erro) {
        alert(erro);
        return;
      }
    }

    // No demonstrativo o fornecedor vem do cadastro e é conferido de novo na hora de gravar.
    let fornecedor = capitalizarTexto(String(f.get("fornecedor") ?? ""));
    let fornecedorGravado: { id: string } | null = null;
    if (MODO_DEMO) {
      const escolha = escolherFornecedorDaCompra(listarFornecedores(), "cat-uniformes", fornecedorId);
      if ("erro" in escolha) {
        alert(escolha.erro);
        return;
      }
      fornecedor = escolha.nome;
      fornecedorGravado = { id: escolha.id };
    }

    const valores: Record<string, unknown> = {
      empresa_id: String(f.get("empresa_id")),
      item_id: itemId,
      fornecedor,
      nota_fiscal: String(f.get("nota_fiscal") || ""),
      data_compra: String(f.get("data_compra")),
      quantidade: quantidadeCompra,
      valor_unitario: Number(f.get("valor_unitario")),
      observacao: capitalizarTexto(String(f.get("observacao") || "")),
    };
    if (fornecedorGravado) valores["fornecedor_id"] = fornecedorGravado.id;
    if (TAMANHO_DISPONIVEL) valores["tamanho_id"] = tamanhoParaGravar(tamanho);

    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => { setAberto(false); void avisarEnderecamentoObrigatorio(parametros, "cat-uniformes", empresaCompra, itemEscolhido?.codigo_sku ?? ""); } },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        {visao === "devolucoes" && (
          <BarraDeFiltros>
            <Input
              aria-label="Buscar devolução"
              placeholder="Buscar por funcionário, uniforme, motivo, NF ou fornecedor"
              value={buscaDevolucao}
              onChange={(e) => setBuscaDevolucao(e.target.value)}
            />
          </BarraDeFiltros>
        )}
        {visao === "compras" && (
          <BarraDeFiltros>
            <Input
              placeholder="Buscar por fornecedor ou NF"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </BarraDeFiltros>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "compras_uniformes",
                compras.map((c) => ({
                  Data: formatarData(c.data_compra),
                  Empresa: empresas.find((e) => e.id === c.empresa_id)?.nome_fantasia,
                  Uniforme: itens.find((i) => i.id === c.item_id)?.nome,
                  Tamanho: nomeTamanhoGravado(parametros, c.tamanho_id),
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
          <ImportarNfeXml />
          <Button requiresWrite onClick={abrirNovo}>Registrar Compra</Button>
          <Button requiresWrite onClick={() => setDevolucaoAberta(true)}>Devolução</Button>
        </div>
      </div>

      {/* Compras e devoluções em listas separadas (decisão 380): um botão para cada, e só a lista escolhida aparece. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Compras ou devoluções">
        {([["compras", "Compras"], ["devolucoes", "Devoluções"]] as const).map(([id, rotulo]) => (
          <Button key={id} type="button" className={visao === id ? "ring-2 ring-primary ring-offset-2" : "opacity-70"} aria-pressed={visao === id} onClick={() => setVisao(id)}>
            {rotulo}
          </Button>
        ))}
      </div>

      {visao === "compras" && <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Uniforme</TableHead>
              <TableHead>Tamanho</TableHead>
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
                <TableCell colSpan={10} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : compras.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
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
                  <TableCell>{nomeTamanhoGravado(parametros, c.tamanho_id) || "—"}</TableCell>
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
      </div>}

      {visao === "devolucoes" && <EntradasDeUsados modulo="uniforme" empresaId={empresaId} itens={itens} empresas={empresas} busca={buscaDevolucao} mostrarVazio />}
      <DevolucaoEpiDialog modulo="uniforme" aberto={devolucaoAberta} onAbrirMudou={setDevolucaoAberta} />

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
                value={empresaCompra}
                onValueChange={(v) => {
                  if (!v) return;
                  setEmpresaCompra(v);
                  setItemSel("");
                  setTamanho("");
                }}
              >
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParaEscolha(empresas).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item_id">Uniforme</Label>
              <Select
                name="item_id"
                required
                value={itemSel}
                onValueChange={(v) => {
                  setItemSel(v);
                  setTamanho("");
                }}
              >
                <SelectTrigger id="item_id">
                  <SelectValue placeholder="Selecione o uniforme" />
                </SelectTrigger>
                <SelectContent>
                  {itens.filter((i) => i.empresa_id === empresaCompra).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.codigo_sku} · {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {itemSel && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Esta compra alimenta o estoque {empresas.find((e) => e.id === empresaCompra)?.nome_fantasia}, onde o item existe uma vez só: compras de qualquer fornecedor somam no mesmo saldo (saldo {tamanho ? "do tamanho escolhido " : ""}hoje: {saldoDoEscolhido}{quantidade > 0 ? `; com esta compra: ${saldoDoEscolhido + quantidade}` : ""}).
              </p>
            )}
            {itemSel && (
              <div className="sm:col-span-2">
                <EnderecoDaEntrada categoriaId="cat-uniformes" empresaId={empresaCompra} codigo={itemEscolhido?.codigo_sku ?? ""} />
              </div>
            )}
            {pedeTamanho(
              parametros,
              "uniforme",
              itemEscolhido,
            ) && (
              <div className="space-y-1.5">
                <Label htmlFor="tamanho_compra">Tamanho</Label>
                <SeletorTamanho
                  id="tamanho_compra"
                  parametros={parametros}
                  modulo="uniforme"
                  produto={itemEscolhido}
                  uso="entrada"
                  valor={tamanho}
                  onChange={setTamanho}
                />
              </div>
            )}
            <SeletorFornecedorCompra categoriaId="cat-uniformes" valor={fornecedorId} onChange={setFornecedorId} />
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
                defaultValue={hojeLocal()}
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
              <Textarea id="observacao" name="observacao" capitalizar="texto" rows={3} />
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
