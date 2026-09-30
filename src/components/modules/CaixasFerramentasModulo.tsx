import { useState, useEffect } from "react";
import { Plus, Trash2, Search, Check, ChevronsUpDown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { STATUS_CAIXA, exportarCsv, formatarData } from "@/lib/gemape";
import {
  useEmpregados,
  useExcluir,
  useItens,
  useCaixasFerramentas,
  useCaixaItens,
  useProximoCodigoCaixa,
  useSalvarCaixa,
  type CaixaFerramenta,
  type Item,
} from "@/lib/hooks-gemape";
import { toast } from "sonner";

const NENHUM = "nenhum";

interface ItemVinculado {
  ferramenta_id: string;
  quantidade: number;
  observacao: string;
  // Metadata for display
  ferramenta?: Item;
}

export function CaixasFerramentasModulo() {
  const { empresas, empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CaixaFerramenta | null>(null);
  const [itensVinculados, setItensVinculados] = useState<ItemVinculado[]>([]);

  const { data: caixas = [], isLoading } = useCaixasFerramentas(empresaId, busca);
  const { data: empregados = [] } = useEmpregados(empresaId, true);
  // Lista completa: o responsável atual continua na lista mesmo se já foi demitido, para a
  // edição da caixa não apagar o vínculo sem querer.
  const { data: todosEmpregados = [] } = useEmpregados(empresaId);
  const responsavelFora = editando?.responsavel_id
    ? todosEmpregados.find(
        (e) => e.id === editando.responsavel_id && !empregados.some((a) => a.id === e.id),
      )
    : undefined;
  const { data: todasFerramentas = [] } = useItens("ferramenta", empresaId);
  const { data: proximoCodigo } = useProximoCodigoCaixa();
  const { data: itensCarregados = [] } = useCaixaItens(editando?.id ?? null);

  const salvar = useSalvarCaixa();
  const excluir = useExcluir("caixas_ferramentas", ["caixas_ferramentas"]);

  // Combobox state
  const [openCombo, setOpenCombo] = useState(false);

  useEffect(() => {
    if (editando && itensCarregados.length > 0) {
      setItensVinculados(
        itensCarregados.map((i) => ({
          ferramenta_id: i.ferramenta_id,
          quantidade: i.quantidade,
          observacao: i.observacao ?? "",
          ferramenta: i.ferramenta,
        })) as ItemVinculado[],
      );
    }
  }, [editando, itensCarregados]);

  function abrirNovo() {
    setEditando(null);
    setItensVinculados([]);
    setAberto(true);
  }

  function adicionarFerramenta(ferramenta: Item) {
    if (itensVinculados.some((i) => i.ferramenta_id === ferramenta.id)) {
      toast.error("Ferramenta já vinculada a esta caixa");
      return;
    }

    setItensVinculados([
      ...itensVinculados,
      {
        ferramenta_id: ferramenta.id,
        quantidade: 1,
        observacao: "",
        ferramenta: ferramenta,
      },
    ]);
    setOpenCombo(false);
  }

  function removerFerramenta(id: string) {
    setItensVinculados(itensVinculados.filter((i) => i.ferramenta_id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemVinculado, valor: string | number) {
    setItensVinculados(
      itensVinculados.map((i) => (i.ferramenta_id === id ? { ...i, [campo]: valor } : i)),
    );
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (itensVinculados.length === 0) {
      toast.error("Adicione pelo menos uma ferramenta à caixa");
      return;
    }

    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" || v === NENHUM ? null : v;
    };

    const valores = {
      empresa_id: texto("empresa_id"),
      nome: String(f.get("nome") ?? "").trim(),
      descricao: texto("descricao"),
      responsavel_id: texto("responsavel_id"),
      localizacao: texto("localizacao"),
      status: String(f.get("status") ?? "Ativa"),
    };

    salvar.mutate(
      {
        id: editando?.id,
        valores: valores as Record<string, unknown>,
        itens: itensVinculados.map((i) => ({
          ferramenta_id: i.ferramenta_id,
          quantidade: i.quantidade,
          observacao: i.observacao ?? "",
        })) as { ferramenta_id: string; quantidade: number; observacao: string }[],
      } as {
        id?: string;
        valores: Record<string, unknown>;
        itens: { ferramenta_id: string; quantidade: number; observacao: string }[];
      },
      { onSuccess: () => setAberto(false) },
    );
  }

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome"
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "caixas-ferramentas",
                caixas.map((c) => ({
                  Codigo: c.codigo,
                  Nome: c.nome,
                  Responsavel: c.responsavel?.nome ?? "—",
                  Localizacao: c.localizacao ?? "—",
                  Status: c.status,
                  DataCadastro: formatarData(c.created_at),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>Nova caixa</Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : caixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma caixa cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              caixas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.codigo}</TableCell>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>{c.responsavel?.nome ?? "—"}</TableCell>
                  <TableCell>{c.localizacao ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "Ativa" ? "secondary" : "outline"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditando(c);
                        setAberto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir a caixa ${c.codigo}?`)) excluir.mutate(c.id);
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
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar ${editando.codigo}` : "Nova Caixa de Ferramentas"}
            </DialogTitle>
            <DialogDescription>
              Gerencie os dados da caixa e as ferramentas vinculadas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código da Caixa</Label>
                <Input
                  id="codigo"
                  readOnly
                  disabled
                  value={editando?.codigo ?? proximoCodigo ?? "Gerando..."}
                  className="bg-muted font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome/Identificação da Caixa</Label>
                <Input
                  id="nome"
                  name="nome"
                  required
                  defaultValue={editando?.nome ?? ""}
                  placeholder="Ex: Kit Elétrica"
                />
              </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="responsavel_id">Responsável Atual</Label>
                <Select name="responsavel_id" defaultValue={editando?.responsavel_id ?? NENHUM}>
                  <SelectTrigger id="responsavel_id">
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Sem responsável</SelectItem>
                    {responsavelFora && (
                      <SelectItem value={responsavelFora.id}>
                        {responsavelFora.nome} (inativo)
                      </SelectItem>
                    )}
                    {empregados.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  name="localizacao"
                  defaultValue={editando?.localizacao ?? ""}
                  placeholder="Ex: Almoxarifado"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" required defaultValue={editando?.status ?? "Ativa"}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CAIXA.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  defaultValue={editando?.descricao ?? ""}
                  placeholder="Detalhes adicionais sobre a caixa..."
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4 bg-accent/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Ferramentas Vinculadas
                </h3>

                <Popover open={openCombo} onOpenChange={setOpenCombo}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Ferramenta
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Buscar ferramenta..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma ferramenta encontrada.</CommandEmpty>
                        <CommandGroup>
                          {todasFerramentas
                            .filter((t) => t.status === "Ativo")
                            .map((t) => (
                              <CommandItem
                                key={t.id}
                                value={`${t.codigo_sku} ${t.nome}`}
                                onSelect={() => adicionarFerramenta(t)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    itensVinculados.some((i) => i.ferramenta_id === t.id)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono text-[10px]">{t.codigo_sku}</span>
                                  <span>{t.nome}</span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="overflow-hidden rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px]">Código/SKU</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>N° Série</TableHead>
                      <TableHead className="w-[80px] text-center">Qtd.</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensVinculados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhuma ferramenta vinculada. Use o botão acima para adicionar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      itensVinculados.map((item) => (
                        <TableRow key={item.ferramenta_id}>
                          <TableCell className="font-mono text-xs">
                            {item.ferramenta?.codigo_sku}
                          </TableCell>
                          <TableCell className="text-sm">{item.ferramenta?.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.ferramenta?.numero_serie ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantidade}
                              onChange={(e) =>
                                atualizarItem(
                                  item.ferramenta_id,
                                  "quantidade",
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="h-8 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.observacao}
                              onChange={(e) =>
                                atualizarItem(item.ferramenta_id, "observacao", e.target.value)
                              }
                              className="h-8 text-xs"
                              placeholder="Obs..."
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removerFerramenta(item.ferramenta_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending}>
                Salvar Caixa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
