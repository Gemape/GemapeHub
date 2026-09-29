import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import {
  ESTADOS_ITEM,
  STATUS_EPI,
  STATUS_FERRAMENTA,
  STATUS_UNIFORME,
  TAMANHOS_EPI,
  TAMANHOS_UNIFORME,
  UNIDADES_EPI,
  UNIDADES_UNIFORME,
  exportarCsv,
  formatarMoeda,
  type Modulo,
} from "@/lib/gemape";
import { opcoesSubcategoria } from "@/lib/categorias-produto";
import { useSubcategorias } from "@/lib/use-subcategorias";
import { useExcluir, useItens, useProximoCodigo, useSalvar, type Item } from "@/lib/hooks-gemape";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const getTabela = (modulo: Modulo): "epis" | "uniformes" | "ferramentas" => {
  if (modulo === "epi") return "epis";
  if (modulo === "uniforme") return "uniformes";
  return "ferramentas";
};

export function ItensModulo({ modulo }: { modulo: Modulo }) {
  const { empresas, empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const tabela = getTabela(modulo);
  const subcategorias = useSubcategorias(modulo);
  const { data: itens = [], isLoading } = useItens(modulo, empresaId, busca);
  const salvar = useSalvar(tabela, [tabela, "saidas-por-item"]);
  const excluir = useExcluir(tabela, [tabela, "saidas-por-item"]);

  function abrirNovo() {
    setEditando(null);
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? null : v;
    };
    const valores = {
      empresa_id: texto("empresa_id"),
      codigo_sku: String(f.get("codigo_sku") ?? "").trim(),
      nome: String(f.get("nome") ?? "").trim(),
      categoria: texto("categoria"),
      marca: texto("marca"),
      modelo: texto("modelo"),
      numero_serie:
        modulo === "ferramenta"
          ? (texto("numero_serie") ?? `SN-${Date.now()}`)
          : texto("numero_serie"),
      ca: texto("ca"),
      tamanho: texto("tamanho"),
      cor: texto("cor"),
      unidade_medida: texto("unidade_medida"),
      estoque_minimo: Number(f.get("estoque_minimo") ?? 0),
      estoque_atual: Number(f.get("estoque_atual") ?? 0),
      fornecedor: texto("fornecedor"),
      data_validade: texto("data_validade"),
      data_aquisicao: texto("data_aquisicao"),
      patrimonio: texto("patrimonio"),
      preco_unitario: f.get("preco_unitario") ? Number(f.get("preco_unitario")) : null,
      nota_fiscal: texto("nota_fiscal"),
      ...(modulo === "epi" ? { ca_validade: texto("ca_validade") } : {}),
      status: String(f.get("status") ?? "Ativo"),
      observacoes: texto("observacoes"),
    };
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false) },
    );
  }

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por código ou descrição"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                modulo,
                itens.map((i) => ({
                  "Código/SKU": i.codigo_sku,
                  Nome: i.nome,
                  Categoria: i.categoria,
                  Estoque: i.estoque_atual,
                  Mínimo: i.estoque_minimo,
                  Status: i.status,
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>Novo item</Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código/SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              {modulo === "epi" ? <TableHead>Empresa</TableHead> : null}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Nenhum item cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.categoria ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        item.estoque_atual <= item.estoque_minimo
                          ? "font-bold text-destructive"
                          : ""
                      }
                    >
                      {item.estoque_atual}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Ativo" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  {modulo === "epi" ? <TableCell>{nomeEmpresa(item.empresa_id)}</TableCell> : null}
                  <TableCell className="text-right whitespace-nowrap">
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(item);
                        setAberto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir ${item.nome}?`)) excluir.mutate(item.id);
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
            <DialogTitle>
              {editando
                ? `Editar ${modulo.toUpperCase()}`
                : `Cadastrar Novo ${modulo.toUpperCase()}`}
            </DialogTitle>
            <DialogDescription>
              {modulo === "epi" && !editando
                ? "O código será gerado automaticamente ao salvar."
                : "Preencha os dados do cadastro."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_sku">Código/SKU</Label>
              <Input
                id="codigo_sku"
                name="codigo_sku"
                required
                defaultValue={editando?.codigo_sku ?? ""}
                placeholder="Ex: SKU-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do Item</Label>
              <Input
                id="nome"
                name="nome"
                required
                defaultValue={editando?.nome ?? ""}
                placeholder="Descrição clara do item"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Select name="categoria" required defaultValue={editando?.categoria ?? ""}>
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesSubcategoria(subcategorias, editando?.categoria).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {modulo === "epi" && (
              <div className="space-y-1.5">
                <Label htmlFor="ca">CA - Certificado de Aprovação</Label>
                <Input id="ca" name="ca" required defaultValue={editando?.ca ?? ""} />
              </div>
            )}

            {modulo === "ferramenta" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="marca">Marca</Label>
                  <Input id="marca" name="marca" defaultValue={editando?.marca ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input id="modelo" name="modelo" defaultValue={editando?.modelo ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numero_serie">Número de Série</Label>
                  <Input
                    id="numero_serie"
                    name="numero_serie"
                    required
                    defaultValue={editando?.numero_serie ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patrimonio">Patrimônio</Label>
                  <Input
                    id="patrimonio"
                    name="patrimonio"
                    defaultValue={editando?.patrimonio ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="data_aquisicao">Data de Aquisição</Label>
                  <Input
                    id="data_aquisicao"
                    name="data_aquisicao"
                    type="date"
                    defaultValue={editando?.data_aquisicao?.slice(0, 10) ?? ""}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                name="empresa_id"
                required
                defaultValue={
                  editando?.empresa_id ??
                  (empresaId !== TODAS ? empresaId : (empresas[0]?.id ?? ""))
                }
              >
                <SelectTrigger id="empresa_id">
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

            {modulo !== "ferramenta" && (
              <div className="space-y-1.5">
                <Label htmlFor="tamanho">Tamanho</Label>
                <Select name="tamanho" required defaultValue={editando?.tamanho ?? ""}>
                  <SelectTrigger id="tamanho">
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    {modulo === "epi" &&
                      TAMANHOS_EPI.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    {modulo === "uniforme" &&
                      TAMANHOS_UNIFORME.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="unidade_medida">Unidade de Medida</Label>
              <Select
                name="unidade_medida"
                required
                defaultValue={editando?.unidade_medida ?? "Unidade"}
              >
                <SelectTrigger id="unidade_medida">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modulo === "epi" &&
                    UNIDADES_EPI.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  {modulo === "uniforme" &&
                    UNIDADES_UNIFORME.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  {modulo === "ferramenta" && <SelectItem value="Unidade">Unidade</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
              <Input
                id="estoque_minimo"
                name="estoque_minimo"
                type="number"
                min={0}
                defaultValue={editando?.estoque_minimo ?? 0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estoque_atual">Estoque Atual</Label>
              <Input
                id="estoque_atual"
                name="estoque_atual"
                type="number"
                min={0}
                defaultValue={editando?.estoque_atual ?? 0}
                disabled={!!editando}
                className={editando ? "bg-muted" : ""}
              />
              {editando && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ajuste via módulo de movimentações
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" name="marca" defaultValue={editando?.marca ?? ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" name="modelo" defaultValue={editando?.modelo ?? ""} />
            </div>

            {modulo === "uniforme" && (
              <div className="space-y-1.5">
                <Label htmlFor="cor">Cor</Label>
                <Input id="cor" name="cor" defaultValue={editando?.cor ?? ""} />
              </div>
            )}

            {modulo !== "ferramenta" && (
              <div className="space-y-1.5">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  name="fornecedor"
                  defaultValue={editando?.fornecedor ?? ""}
                />
              </div>
            )}

            {modulo === "epi" && (
              <div className="space-y-1.5">
                <Label htmlFor="data_validade">Data de Validade</Label>
                <Input
                  id="data_validade"
                  name="data_validade"
                  type="date"
                  defaultValue={editando?.data_validade ?? ""}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" required defaultValue={editando?.status ?? "Ativo"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modulo === "epi" &&
                    STATUS_EPI.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  {modulo === "uniforme" &&
                    STATUS_UNIFORME.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  {modulo === "ferramenta" &&
                    STATUS_FERRAMENTA.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preco_unitario">Preço unitário (R$)</Label>
              <Input
                id="preco_unitario"
                name="preco_unitario"
                type="number"
                step="0.01"
                min={0}
                defaultValue={editando?.preco_unitario ?? ""}
              />
            </div>

            <div className="space-y-1.5"><Label htmlFor="nota_fiscal">Nota fiscal</Label><Input id="nota_fiscal" name="nota_fiscal" defaultValue={editando?.nota_fiscal ?? ""} /></div>
            {modulo === "epi" && <div className="space-y-1.5"><Label htmlFor="ca_validade">Vencimento do CA</Label><Input id="ca_validade" name="ca_validade" type="date" defaultValue={editando?.ca_validade ?? ""} /></div>}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                name="observacoes"
                defaultValue={editando?.observacoes ?? ""}
                placeholder="Detalhes adicionais..."
              />
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
