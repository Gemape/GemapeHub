import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { useState, useEffect } from "react";
import { exemploCaixa } from "@/lib/dados-teste/exemplos";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import {
  controleDaFerramenta,
  ferramentasComEmpregadoRemovidas,
  ferramentasEmOutraCaixa,
  movimentacoesDaCaixa,
  validarFerramentasDaCaixa,
} from "@/lib/controle-caixa";
import { Plus, Trash2, Search, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
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
import {
  codigoCaixa,
  numeroDaCaixa,
  numerosDisponiveis,
  rotuloNumeroCaixa,
  validarNumeroCaixa,
} from "@/lib/caixas-habilitadas";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import { STATUS_CAIXA, exportarCsv, formatarData } from "@/lib/gemape";
import {
  useExcluir,
  useItens,
  useCaixasFerramentas,
  useCaixaItens,
  useTodosCaixaItens,
  useSalvarCaixa,
  type CaixaFerramenta,
  type Item,
} from "@/lib/hooks-gemape";
import { portadorAtivo, validarAlteracaoCaixaComPortador } from "@/lib/portadores-caixa";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { toast } from "sonner";

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
  // Clonar: caixa de origem usada só para preencher o formulário de novo cadastro.
  const [modelo, setModelo] = useState<CaixaFerramenta | null>(null);
  const base = editando ?? modelo;
  const [itensVinculados, setItensVinculados] = useState<ItemVinculado[]>([]);

  const { data: caixas = [], isLoading } = useCaixasFerramentas(empresaId, busca);
  const portadores = usePortadoresCaixa();
  const nomePortador = (caixaId: string) => portadorAtivo(portadores, caixaId)?.empregado_nome ?? "—";
  const { data: todasFerramentas = [] } = useItens("ferramenta", empresaId);
  // Numeração única de CX-0001 a CX-0100 para as três empresas: confere com todas as caixas.
  const { caixasHabilitadas: habilitadas } = useParametrosBase();
  const { data: todasCaixas = [] } = useCaixasFerramentas(TODAS);
  const [numero, setNumero] = useState<number | null>(null);
  const numeroFixo = editando ? numeroDaCaixa(editando) : null;
  const disponiveis = numerosDisponiveis(habilitadas, todasCaixas, editando?.id);
  const { data: itensCarregados = [] } = useCaixaItens(base?.id ?? null);
  // Uma ferramenta só fica em uma caixa, e quem está com empregado não sai da caixa: as mesmas regras do diálogo de ferramentas da caixa.
  const { data: itensDeTodas = [] } = useTodosCaixaItens();
  const { data: movimentacoesFerramenta = [] } = useQuery({
    queryKey: ["movimentacoes", "ferramenta", "validar-caixa"],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta" }),
    enabled: Boolean(editando),
  });

  const salvar = useSalvarCaixa();
  const excluir = useExcluir("caixas_ferramentas", ["caixas_ferramentas"]);

  // Combobox state
  const [openCombo, setOpenCombo] = useState(false);

  // Cada abertura do formulário (novo, clone ou edição) recarrega os itens, mesmo da mesma caixa.
  const [abertura, setAbertura] = useState(0);
  useEffect(() => {
    if (base && itensCarregados.length > 0) {
      setItensVinculados(
        itensCarregados.map((i) => ({
          ferramenta_id: i.ferramenta_id,
          quantidade: i.quantidade,
          observacao: i.observacao ?? "",
          ferramenta: i.ferramenta,
        })) as ItemVinculado[],
      );
    }
  }, [base, itensCarregados, abertura]);

  function abrirNovo() {
    setAbertura((n) => n + 1);
    setEditando(null);
    // Demonstração (2.8): abre já preenchido com uma caixa fictícia e o primeiro número livre; só é gravada se a pessoa salvar.
    const exemplo = import.meta.env.VITE_DEMO_MODE !== "false" ? exemploCaixa(empresaPadraoParaEscolha(empresas, empresaId)) : null;
    setModelo(exemplo as unknown as CaixaFerramenta | null);
    setNumero(exemplo ? (disponiveis[0] ?? null) : null);
    setItensVinculados([]);
    setAberto(true);
  }

  // Clonar: novo cadastro com os dados da origem; o número da caixa fica em branco para ser escolhido
  // entre as habilitadas livres, e o portador não é herdado.
  function abrirClone(c: CaixaFerramenta) {
    setAbertura((n) => n + 1);
    setEditando(null);
    setModelo(c);
    setNumero(null);
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

    const erroNumero = validarNumeroCaixa(numero, habilitadas, todasCaixas, editando?.id);
    if (erroNumero || numero === null) {
      toast.error(erroNumero ?? "Selecione o número da caixa.");
      return;
    }

    const nomeFerramenta = (id: string) =>
      itensVinculados.find((i) => i.ferramenta_id === id)?.ferramenta?.nome ??
      itensCarregados.find((i) => i.ferramenta_id === id)?.ferramenta?.nome ??
      "Ferramenta";
    const historicoDaCaixa = editando
      ? movimentacoesDaCaixa(movimentacoesFerramenta, editando.id, itensCarregados.map((i) => i.ferramenta_id), editando.codigo)
      : [];
    const comEmpregado = (id: string) => controleDaFerramenta(historicoDaCaixa, id).comEmpregado;
    const erroItens =
      validarFerramentasDaCaixa(itensVinculados, comEmpregado, nomeFerramenta) ??
      ferramentasComEmpregadoRemovidas(editando ? itensCarregados : [], itensVinculados, comEmpregado, nomeFerramenta) ??
      ferramentasEmOutraCaixa(
        itensVinculados,
        itensDeTodas.filter((o) => o.caixa_id !== editando?.id),
        editando?.id,
        nomeFerramenta,
        (id) => todasCaixas.find((c) => c.id === id)?.codigo ?? "outra caixa",
      );
    if (erroItens) {
      toast.error(erroItens);
      return;
    }

    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? null : v;
    };

    const valores = {
      codigo: codigoCaixa(numero),
      codigo_num: numero,
      empresa_id: texto("empresa_id"),
      // A caixa só tem o número como identificação; o nome do banco repete o código.
      nome: codigoCaixa(numero),
      descricao: texto("descricao") ? capitalizarTexto(texto("descricao")) : null,
      localizacao: texto("localizacao") ? capitalizarTexto(texto("localizacao")) : null,
      status: String(f.get("status") ?? "Ativa"),
    };

    if (editando) {
      const erroPortador = validarAlteracaoCaixaComPortador(editando, portadores, valores);
      if (erroPortador) { toast.error(erroPortador); return; }
    }

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
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Buscar caixa por número"
              placeholder="Buscar por número da caixa"
              className="pl-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </BarraDeFiltros>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportarCsv(
                  "caixas-ferramentas",
                  caixas.map((c) => ({
                    Codigo: c.codigo,
                    PortadorAtivo: nomePortador(c.id),
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
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono">Código</TableHead>
              <TableHead>Portador ativo</TableHead>
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
                  <TableCell>{nomePortador(c.id)}</TableCell>
                  <TableCell>{c.localizacao ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "Ativa" ? "secondary" : "outline"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {formatarData(c.created_at)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <AcoesLinha
                      rotulo={`caixa ${c.codigo}`}
                      onClonar={() => abrirClone(c)}
                      onEditar={() => {
                        setAbertura((n) => n + 1);
                        setItensVinculados([]);
                        setModelo(null);
                        setEditando(c);
                        setNumero(numeroDaCaixa(c));
                        setAberto(true);
                      }}
                      onExcluir={() => {
                        const erroPortador = validarAlteracaoCaixaComPortador(c, portadores, null);
                        if (erroPortador) { toast.error(erroPortador); return; }
                        if (confirm(`Excluir a caixa ${c.codigo}?`)) excluir.mutate(c.id);
                      }}
                    />
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
                <Label htmlFor="numero">Número da Caixa</Label>
                {numeroFixo !== null ? (
                  <Input
                    id="numero"
                    readOnly
                    disabled
                    value={`${rotuloNumeroCaixa(numeroFixo)} · ${codigoCaixa(numeroFixo)}`}
                    className="bg-muted font-mono"
                  />
                ) : disponiveis.length === 0 ? (
                  <p className="rounded-md border border-dashed p-2 text-sm text-muted-foreground">
                    Nenhuma caixa habilitada livre. Habilite caixas em Caixas de
                    Ferramentas &gt; Habilitar caixas.
                  </p>
                ) : (
                  <Select
                    value={numero === null ? "" : String(numero)}
                    onValueChange={(v) => setNumero(Number(v))}
                  >
                    <SelectTrigger id="numero" className="font-mono">
                      <SelectValue placeholder="Selecione o número" />
                    </SelectTrigger>
                    <SelectContent>
                      {disponiveis.map((n) => (
                        <SelectItem key={n} value={String(n)} className="font-mono">
                          {rotuloNumeroCaixa(n)} · {codigoCaixa(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>


              <div className="space-y-1.5">
                <Label htmlFor="empresa_id">Empresa</Label>
                <Select
                  name="empresa_id"
                  required
                  defaultValue={
                    base?.empresa_id ??
                    empresaPadraoParaEscolha(empresas, empresaId)
                  }
                >
                  <SelectTrigger id="empresa_id">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasParaEscolha(empresas, [base?.empresa_id]).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portador-ativo-caixa">Portador ativo</Label>
                <Input id="portador-ativo-caixa" readOnly value={editando ? nomePortador(editando.id) : "—"} />
                <p className="text-xs text-muted-foreground">Gerencie o vínculo na aba Portadores.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  name="localizacao"
                  capitalizar="texto"
                  defaultValue={base?.localizacao ?? ""}
                  placeholder="Ex: Almoxarifado"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select name="status" required defaultValue={base?.status ?? "Ativa"}>
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
                  capitalizar="texto"
                  defaultValue={base?.descricao ?? ""}
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
                                  <span>{t.nome}{sufixoTamanhoFerramenta(t)}</span>
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
                              capitalizar="texto"
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
