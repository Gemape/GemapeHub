import { useEffect, useRef, useState } from "react";
import { capitalizarCadastro } from "@/lib/formatacao-cadastral";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
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
import { avisoExclusaoDoProduto, vinculosDoProduto } from "@/lib/codigo-fabrica-vinculos";
import { empresaPadraoParaEscolha } from "@/lib/empresas";
import {
  ESTADOS_ITEM,
  STATUS_FERRAMENTA,
  exportarCsv,
} from "@/lib/gemape";
import { useExcluir, useItens, useSalvar, type Item } from "@/lib/hooks-gemape";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { codigosReservadosFerramenta, grupoPedeQualFerramenta, marcaDaSelecao, prepararCadastroFerramenta, reservarCodigoFerramenta, SELECAO_MARCA_LEGADA, SELECAO_SEM_MARCA, qualFerramentaDe, selecaoMarcaCadastrada } from "@/lib/cadastro-ferramentas";
import {
  estaAtivo,
  lerParametros,
  paraSelecao,
  proximoCodigo,
  subcategoriasDa,
  removerCodigosFabricaPorIds,
  type CodigoFabrica,
} from "@/lib/parametros-base";
import { useParametrosBase } from "@/lib/use-parametros-base";

// Cadastro de ferramentas. EPI e uniforme usam CadastroProduto, e todas as listas
// vêm de Cadastros > Gerais. Ferramenta não tem subcategoria (decisão 25).
export function ItensModulo({ modulo }: { modulo: "ferramenta" }) {
  const { empresas, empresaId } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  // Clonar: item de origem que preenche o formulário de cadastro NOVO. Só os defaultValue
  // leem dele (base); `editando` continua sendo a flag de edição.
  const [modelo, setModelo] = useState<Item | null>(null);
  const base = editando ?? modelo;
  // Grupo escolhido no formulário: "Outros" e "Diversos" abrem o campo para digitar qual ferramenta é (decisão 83).
  const [grupoEscolhido, setGrupoEscolhido] = useState("");
  useEffect(() => { if (aberto) setGrupoEscolhido(base?.grupo_ferramenta ?? ""); }, [aberto, base]);
  const [previaCodigo, setPreviaCodigo] = useState("");
  const salvando = useRef(false);
  const parametros = useParametrosBase();
  const regraFerramenta = parametros.regrasCodigo.find((r) => r.categoriaId === "cat-ferramentas");
  // Ferramenta antiga sem categoria de ferramenta usa a categoria gravada como valor inicial.
  const categoriaFerramentaInicial = base?.categoria_ferramenta ?? (base?.categoria === "Pneumática" ? "Pneumático" : base?.categoria ?? "");
  // Parâmetro desativado em Gerais sai da escolha; o que a ferramenta já usa continua na edição.
  const parametrosSelecao = {
    ...parametros,
    categoriasFerramenta: paraSelecao(parametros, subcategoriasDa(parametros, "cat-ferramentas"), (c) => c.nome === categoriaFerramentaInicial),
    gruposFerramenta: paraSelecao(parametros, parametros.gruposFerramenta, (g) => g.nome === base?.grupo_ferramenta),
    marcasFerramenta: paraSelecao(parametros, parametros.marcasFerramenta, (m) => m.nome === base?.marca),
  };
  const rotulo = (item: { id: string; nome: string }) => (estaAtivo(parametros, item.id) ? item.nome : `${item.nome} (desativado)`);
  const marcaCadastrada = parametros.marcasFerramenta.find((m) => m.nome === base?.marca);
  const marcaAntiga = base?.marca && !marcaCadastrada ? base.marca : null;
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

  // Sem origem: cadastro novo em branco. Com origem (Clonar): mesmo formulário, preenchido com
  // os dados dela, mas número de série e patrimônio (únicos) em branco. O código sai da
  // mesma geração do cadastro novo; estoque começa em zero.
  async function abrirNovo(origem?: Item) {
    if (!regraFerramenta) {
      toast.error("Cadastre antes a regra do código de Ferramentas em Cadastros > Gerais.");
      return;
    }
    setEditando(null);
    setModelo(origem ?? null);
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
      // A empresa não aparece no cadastro (decisão 54): a ferramenta nova usa a do cabeçalho e a
      // edição mantém a que já tinha.
      empresa_id: editando?.empresa_id ?? (empresaPadraoParaEscolha(empresas, empresaId) || null),
      codigo_sku: String(f.get("codigo_sku") ?? "").trim(),
      marca: texto("marca"),
      unidade_medida: texto("unidade_medida"),
      status: String(f.get("status") ?? "Ativo"),
      observacoes: texto("observacoes"),
    };
    if (!editando && !valores["empresa_id"]) {
      salvando.current = false;
      toast.error("Cadastre ou ative uma empresa antes de cadastrar a ferramenta.");
      return;
    }
    if (!editando) {
      // A série não é mais pedida (decisão 54), mas a coluna é obrigatória e única no banco: valor gerado.
      valores['numero_serie'] = `SN-${crypto.randomUUID()}`;
      valores['estoque_atual'] = 0;
    }
    try {
      const cadastro = prepararCadastroFerramenta({
        parametros: parametrosSelecao,
        codigosExistentes: editando ? [] : await codigosFerramenta(),
        categoriaFerramenta: String(f.get("categoria_ferramenta") ?? ""),
        categoriaAtual: base?.categoria_ferramenta ?? "",
        grupoFerramenta: grupoEscolhido,
        qualFerramenta: String(f.get("qual_ferramenta") ?? ""),
        marca: marcaDaSelecao(String(f.get("marca") ?? ""), parametrosSelecao.marcasFerramenta, base?.marca ?? null),
        marcaAtual: base?.marca ?? "",
        modelo: capitalizarCadastro(String(f.get("modelo") ?? "")),
        estoqueMinimo: String(f.get("estoque_minimo") ?? ""),
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
      { onSuccess: () => {
        setAberto(false);
        void avisarEnderecamentoObrigatorio(parametros, "cat-ferramentas",
          String(valores["empresa_id"] ?? ""), String(valores["codigo_sku"] ?? ""));
      }, onSettled: () => { salvando.current = false; } },
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
                  Descrição: i.nome,
                  "Categoria de ferramenta": i.categoria_ferramenta,
                  "Grupo de ferramenta": i.grupo_ferramenta,
                  Marca: i.marca,
                  Modelo: i.modelo,
                  "Estoque mínimo": i.estoque_minimo,
                  Status: i.status,
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={() => void abrirNovo()}>Novo item</Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código/SKU</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria de ferramenta</TableHead>
              <TableHead>Grupo de ferramenta</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
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
                  <TableCell>{item.modelo ?? "—"}</TableCell>
                  <TableCell className="text-right">{item.estoque_minimo ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Ativo" ? "secondary" : "outline"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <AcoesLinha
                      rotulo={`${item.codigo_sku} ${item.nome}`}
                      onClonar={() => void abrirNovo(item)}
                      onEditar={() => {
                        setModelo(null);
                        setEditando(item);
                        setAberto(true);
                      }}
                      onExcluir={() => {
                        // Lê as associações na hora, para o aviso não usar dados velhos.
                        let vinculos: CodigoFabrica[] = [];
                        try {
                          vinculos = vinculosDoProduto(lerParametros().codigosFabrica, {
                            tabela,
                            codigo_sku: item.codigo_sku ?? "",
                            empresa_id: item.empresa_id ?? null,
                          });
                        } catch {
                          toast.error("Não foi possível conferir os códigos de fábrica desta ferramenta.");
                          return;
                        }
                        const aviso = avisoExclusaoDoProduto(`${item.codigo_sku} ${item.nome}`, vinculos);
                        if (confirm(aviso ? `${aviso}\n\nExcluir mesmo assim?` : `Excluir ${item.nome}?`)) {
                          try {
                            reservarCodigoFerramenta(item.codigo_sku);
                          } catch (erro) {
                            toast.error(erro instanceof Error ? erro.message : "Não foi possível reservar o código.");
                            return;
                          }
                          excluir.mutate(item.id, {
                            onSuccess: () => {
                              try {
                                removerCodigosFabricaPorIds(vinculos.map((c) => c.id));
                              } catch {
                                toast.error("A ferramenta foi excluída, mas os códigos de fábrica dela não puderam ser removidos.");
                              }
                            },
                          });
                        }
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? "Editar ferramenta"
                : modelo
                  ? "Clonar ferramenta"
                  : "Cadastrar ferramenta"}
            </DialogTitle>
            <DialogDescription>
              {modelo && !editando ? "Informe só o modelo novo; categoria, grupo, marca e estoque mínimo vêm da ferramenta copiada." : "Preencha os dados do cadastro."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_sku">Código/SKU</Label>
              <Input id="codigo_sku" readOnly value={editando?.codigo_sku ?? previaCodigo} placeholder="Gerado ao salvar" />
            </div>
            <p className="text-xs text-muted-foreground sm:pt-6">
              A descrição é montada sozinha: grupo, modelo e marca.
            </p>

              <div className="space-y-1.5">
                <Label htmlFor="categoria_ferramenta">Categoria de ferramenta</Label>
                <Select name="categoria_ferramenta" required defaultValue={categoriaFerramentaInicial}>
                  <SelectTrigger id="categoria_ferramenta"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {parametrosSelecao.categoriasFerramenta.map((c) => <SelectItem key={c.id} value={c.nome}>{rotulo(c)}</SelectItem>)}
                    {base?.categoria_ferramenta && !parametrosSelecao.categoriasFerramenta.some((c) => c.nome === base.categoria_ferramenta) && (
                      <SelectItem value={base.categoria_ferramenta}>{base.categoria_ferramenta} (fora de Gerais)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grupo_ferramenta">Grupo de ferramenta</Label>
                <Select name="grupo_ferramenta" required value={grupoEscolhido} onValueChange={setGrupoEscolhido}>
                  <SelectTrigger id="grupo_ferramenta"><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                  <SelectContent>
                    {parametrosSelecao.gruposFerramenta.map((g) => <SelectItem key={g.id} value={g.nome}>{rotulo(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {grupoPedeQualFerramenta(grupoEscolhido) && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="qual_ferramenta">Qual ferramenta?</Label>
                  <Input id="qual_ferramenta" name="qual_ferramenta" required maxLength={60} defaultValue={qualFerramentaDe(base)} placeholder="Digite o nome da ferramenta" />
                  <p className="text-xs text-muted-foreground">O nome digitado entra na descrição no lugar do grupo.</p>
                </div>
              )}

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
                <Input id="modelo" name="modelo" required defaultValue={editando?.modelo ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
                <Input
                  id="estoque_minimo"
                  name="estoque_minimo"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={base?.estoque_minimo ?? 0}
                />
              </div>

            <div className="space-y-1.5">
              <Label htmlFor="unidade_medida">Unidade de Medida</Label>
              <Select
                name="unidade_medida"
                required
                defaultValue={base?.unidade_medida ?? "Unidade"}
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

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                name="observacoes"
                defaultValue={base?.observacoes ?? ""}
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
