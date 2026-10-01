import { useRef, useState } from "react";

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
  STATUS_FERRAMENTA,
  exportarCsv,
  formatarData,
  formatarMoeda,
} from "@/lib/gemape";
import { useExcluir, useItens, useSalvar, type Item } from "@/lib/hooks-gemape";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { codigosReservadosFerramenta, marcaDaSelecao, prepararCadastroFerramenta, reservarCodigoFerramenta, SELECAO_MARCA_LEGADA, SELECAO_SEM_MARCA, selecaoMarcaCadastrada, valoresItemNaEdicao } from "@/lib/cadastro-ferramentas";
import { estaAtivo, paraSelecao, proximoCodigo } from "@/lib/parametros-base";
import { useParametrosBase } from "@/lib/use-parametros-base";

// Cadastro de ferramentas. EPI e uniforme usam CadastroProduto, e todas as listas
// vêm de Cadastros > Gerais. Ferramenta não tem subcategoria (decisão 25).
export function ItensModulo({ modulo }: { modulo: "ferramenta" }) {
  const { empresas, empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [previaCodigo, setPreviaCodigo] = useState("");
  const salvando = useRef(false);
  const parametros = useParametrosBase();
  const regraFerramenta = parametros.regrasCodigo.find((r) => r.categoriaId === "cat-ferramentas");
  // Ferramenta antiga sem categoria de ferramenta usa a categoria gravada como valor inicial.
  const categoriaFerramentaInicial = editando?.categoria_ferramenta ?? (editando?.categoria === "Pneumática" ? "Pneumático" : editando?.categoria ?? "");
  // Parâmetro desativado em Gerais sai da escolha; o que a ferramenta já usa continua na edição.
  const parametrosSelecao = {
    ...parametros,
    categoriasFerramenta: paraSelecao(parametros, parametros.categoriasFerramenta, (c) => c.nome === categoriaFerramentaInicial),
    gruposFerramenta: paraSelecao(parametros, parametros.gruposFerramenta, (g) => g.nome === editando?.grupo_ferramenta),
    marcasFerramenta: paraSelecao(parametros, parametros.marcasFerramenta, (m) => m.nome === editando?.marca),
  };
  const rotulo = (item: { id: string; nome: string }) => (estaAtivo(parametros, item.id) ? item.nome : `${item.nome} (desativado)`);
  const marcaCadastrada = parametros.marcasFerramenta.find((m) => m.nome === editando?.marca);
  const marcaAntiga = editando?.marca && !marcaCadastrada ? editando.marca : null;
  const tabela = "ferramentas";
  const { data: itens = [], isLoading } = useItens(modulo, empresaId, busca);
  const salvar = useSalvar(tabela, [tabela, "saidas-por-item"]);
  const excluir = useExcluir(tabela, [tabela, "saidas-por-item"]);

  async function codigosFerramenta(): Promise<string[]> {
    const { data, error } = await supabase.from("ferramentas").select("codigo_sku");
    if (error) throw error;
    const ativos = ((data ?? []) as { codigo_sku: string | null }[]).map((item) => item.codigo_sku ?? "");
    return [...ativos, ...codigosReservadosFerramenta()];
  }

  async function abrirNovo() {
    if (!regraFerramenta) {
      toast.error("Cadastre antes a regra do código de Ferramentas em Cadastros > Gerais.");
      return;
    }
    setEditando(null);
    setPreviaCodigo("");
    setAberto(true);
    try {
      setPreviaCodigo(proximoCodigo(regraFerramenta, await codigosFerramenta()));
    } catch {
      setPreviaCodigo("");
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? null : v;
    };
    let valores: Record<string, unknown> = {
      empresa_id: texto("empresa_id"),
      codigo_sku: String(f.get("codigo_sku") ?? "").trim(),
      nome: String(f.get("nome") ?? "").trim(),
      marca: texto("marca"),
      modelo: texto("modelo"),
      numero_serie: texto("numero_serie"),
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
      status: String(f.get("status") ?? "Ativo"),
      observacoes: texto("observacoes"),
    };
    valores = valoresItemNaEdicao(valores, !!editando);
    try {
      const cadastro = prepararCadastroFerramenta({
        parametros: parametrosSelecao,
        codigosExistentes: editando ? [] : await codigosFerramenta(),
        descricao: String(f.get("nome") ?? ""),
        estoqueMinimo: String(f.get("estoque_minimo") ?? ""),
        categoriaFerramenta: String(f.get("categoria_ferramenta") ?? ""),
        grupoFerramenta: String(f.get("grupo_ferramenta") ?? ""),
        marca: marcaDaSelecao(String(f.get("marca") ?? ""), parametrosSelecao.marcasFerramenta, editando?.marca ?? null),
        marcaAtual: editando?.marca ?? "",
        numeroSerie: String(f.get("numero_serie") ?? ""),
        precoCusto: String(f.get("preco_unitario") ?? ""),
        ...(editando ? { codigoAtual: editando.codigo_sku } : {}),
      });
      Object.assign(valores, cadastro);
    } catch (erro) {
      salvando.current = false;
      toast.error(erro instanceof Error ? erro.message : "Não foi possível gerar o código da ferramenta.");
      return;
    }
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false), onSettled: () => { salvando.current = false; } },
    );
  }

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
                  "Categoria de ferramenta": i.categoria_ferramenta,
                  "Grupo de ferramenta": i.grupo_ferramenta,
                  Marca: i.marca,
                  "Número de série": i.numero_serie,
                  Patrimônio: i.patrimonio,
                  "Data de aquisição": i.data_aquisicao,
                  "Preço de custo (R$)": i.preco_unitario,
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
              <TableHead>Categoria de ferramenta</TableHead>
              <TableHead>Grupo de ferramenta</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Número de série</TableHead>
              <TableHead>Patrimônio</TableHead>
              <TableHead>Aquisição</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground">
                  Nenhum item cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell>{item.categoria_ferramenta ?? "—"}</TableCell>
                  <TableCell>{item.grupo_ferramenta ?? "—"}</TableCell>
                  <TableCell>{item.marca ?? "—"}</TableCell>
                  <TableCell>{item.numero_serie ?? "—"}</TableCell>
                  <TableCell>{item.patrimonio ?? "—"}</TableCell>
                  <TableCell>{formatarData(item.data_aquisicao)}</TableCell>
                  <TableCell className="text-right">{item.preco_unitario == null ? "—" : formatarMoeda(item.preco_unitario)}</TableCell>
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
                        if (confirm(`Excluir ${item.nome}?`)) {
                          try {
                            reservarCodigoFerramenta(item.codigo_sku);
                          } catch (erro) {
                            toast.error(erro instanceof Error ? erro.message : "Não foi possível reservar o código.");
                            return;
                          }
                          excluir.mutate(item.id);
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
            <DialogTitle>
              {editando
                ? `Editar ${modulo.toUpperCase()}`
                : `Cadastrar Novo ${modulo.toUpperCase()}`}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cadastro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_sku">Código/SKU</Label>
              <Input id="codigo_sku" readOnly value={editando?.codigo_sku ?? previaCodigo} placeholder="Gerado ao salvar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Descrição do item</Label>
              <Input
                id="nome"
                name="nome"
                required
                defaultValue={editando?.nome ?? ""}
                placeholder="Descrição clara do item"
              />
            </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoria_ferramenta">Categoria de ferramenta</Label>
                <Select name="categoria_ferramenta" required defaultValue={categoriaFerramentaInicial}>
                  <SelectTrigger id="categoria_ferramenta"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {parametrosSelecao.categoriasFerramenta.map((c) => <SelectItem key={c.id} value={c.nome}>{rotulo(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grupo_ferramenta">Grupo de ferramenta</Label>
                <Select name="grupo_ferramenta" required defaultValue={editando?.grupo_ferramenta ?? ""}>
                  <SelectTrigger id="grupo_ferramenta"><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                  <SelectContent>
                    {parametrosSelecao.gruposFerramenta.map((g) => <SelectItem key={g.id} value={g.nome}>{rotulo(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marca">Marca</Label>
                <Select name="marca" defaultValue={marcaCadastrada ? selecaoMarcaCadastrada(marcaCadastrada.id) : marcaAntiga ? SELECAO_MARCA_LEGADA : SELECAO_SEM_MARCA}>
                  <SelectTrigger id="marca"><SelectValue placeholder="Selecione a marca" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECAO_SEM_MARCA}>Sem marca</SelectItem>
                    {parametrosSelecao.marcasFerramenta.map((m) => <SelectItem key={m.id} value={selecaoMarcaCadastrada(m.id)}>{rotulo(m)}</SelectItem>)}
                    {marcaAntiga && <SelectItem value={SELECAO_MARCA_LEGADA}>{marcaAntiga} (fora de Cadastros &gt; Gerais)</SelectItem>}
                  </SelectContent>
                </Select>
                {parametrosSelecao.marcasFerramenta.length === 0 && <p className="text-xs text-muted-foreground">Cadastre marcas em Cadastros &gt; Gerais &gt; Categorias.</p>}
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
                  <SelectItem value="Unidade">Unidade</SelectItem>
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
              <Label htmlFor="status">Status</Label>
              <Select name="status" required defaultValue={editando?.status ?? "Ativo"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FERRAMENTA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="preco_unitario">Preço de custo (R$)</Label>
              <Input
                id="preco_unitario"
                name="preco_unitario"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={editando?.preco_unitario ?? ""}
              />
            </div>

            <div className="space-y-1.5"><Label htmlFor="nota_fiscal">Nota fiscal</Label><Input id="nota_fiscal" name="nota_fiscal" defaultValue={editando?.nota_fiscal ?? ""} /></div>
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
