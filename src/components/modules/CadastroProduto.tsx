import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { useFichasEpi } from "@/lib/use-fichas-epi";
import { exportarCsv } from "@/lib/gemape";
import type { Modulo } from "@/lib/gemape";
import { useExcluir, useItens, useSalvar, type Item } from "@/lib/hooks-gemape";
import { removerFicha } from "@/lib/fichas-epi";
import { combinaBusca, mesmoNome, proximoCodigo, subcategoriasDa } from "@/lib/parametros-base";
import { useParametrosBase } from "@/lib/use-parametros-base";

type Tabela = "epis" | "uniformes";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// Cada tipo de produto: tabela, categoria de Cadastros > Gerais (id fixo; o nome pode ser
// renomeado) e textos da tela.
const CONFIG: Record<
  Tabela,
  {
    modulo: Modulo;
    categoriaId: string;
    nome: string;
    exemplo: string;
    ficha: boolean;
    // Preço de custo, marca e modelo: exceção aprovada pelo responsável para uniforme
    // (dashboard e termo de entrega dependem deles).
    custoMarcaModelo: boolean;
  }
> = {
  epis: {
    modulo: "epi",
    categoriaId: "cat-epi",
    nome: "EPI",
    exemplo: "capacete de segurança em ABS de alto impacto",
    ficha: true,
    custoMarcaModelo: false,
  },
  uniformes: {
    modulo: "uniforme",
    categoriaId: "cat-uniformes",
    nome: "uniforme",
    exemplo: "camiseta manga curta em algodão azul royal",
    ficha: false,
    custoMarcaModelo: true,
  },
};

// Todos os códigos já usados na tabela, de todas as empresas, para seguir a sequência.
async function codigosUsados(tabela: Tabela): Promise<string[]> {
  const { data, error } = await supabase.from(tabela).select("codigo_sku");
  if (error) throw error;
  return ((data ?? []) as { codigo_sku: string | null }[]).map((e) => e.codigo_sku ?? "");
}

// Cadastrar EPI e Cadastrar uniforme (especificação rev1): código automático,
// subcategoria, descrição e estoque mínimo. A empresa continua sendo informada porque
// cada produto pertence a uma.
export function CadastroProduto({ tabela }: { tabela: Tabela }) {
  const config = CONFIG[tabela];
  const { empresas, empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const fichas = useFichasEpi();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [previa, setPrevia] = useState("");
  const [empresaSel, setEmpresaSel] = useState("");
  // Evita dois cadastros com o mesmo código num clique duplo em Salvar.
  // O ref bloqueia na hora; o estado só serve para desabilitar o botão. Depois de salvo,
  // o formulário fica travado até ser aberto de novo (o diálogo ainda está fechando).
  const salvando = useRef(false);
  const [gerando, setGerando] = useState(false);
  const { data: lista = [], isLoading } = useItens(config.modulo, empresaId, busca);
  // Filtro também na tela, porque o modo demonstração não filtra pela busca.
  const itens = lista.filter((i) => combinaBusca(busca, i.codigo_sku, i.nome, i.categoria));
  const salvar = useSalvar(tabela, [tabela, "produtos-gemape", "saidas-por-item"]);
  const excluir = useExcluir(tabela, [tabela, "produtos-gemape", "saidas-por-item"]);

  const regra = parametros.regrasCodigo.find((r) => r.categoriaId === config.categoriaId);
  const subcategorias = subcategoriasDa(parametros, config.categoriaId);
  // Ao editar um produto antigo cuja subcategoria não está em Cadastros > Gerais, ela
  // continua aparecendo para não ser apagada sem querer.
  const subcategoriaAtual = editando?.categoria
    ? (subcategorias.find((s) => mesmoNome(s.nome, editando.categoria))?.nome ?? editando.categoria)
    : "";
  const subcategoriaAntiga =
    subcategoriaAtual && !subcategorias.some((s) => s.nome === subcategoriaAtual)
      ? subcategoriaAtual
      : null;
  const empresaPadrao = empresaId !== TODAS ? empresaId : (empresas[0]?.id ?? "");

  function destravar() {
    salvando.current = false;
    setGerando(false);
  }

  async function abrirNovo() {
    if (!regra) {
      toast.error(
        `Cadastre antes a regra do código de ${config.nome} em Cadastros > Gerais > Código do Produto.`,
      );
      return;
    }
    destravar();
    setEditando(null);
    setEmpresaSel("");
    setPrevia("");
    setAberto(true);
    try {
      setPrevia(proximoCodigo(regra, await codigosUsados(tabela)));
    } catch {
      setPrevia("");
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const categoria = String(f.get("categoria") ?? "").trim();
    const nome = String(f.get("nome") ?? "").trim();
    // A empresa não muda na edição: os códigos de fábrica ficam ligados a ela.
    const empresa = editando ? (editando.empresa_id ?? "") : empresaSel || empresaPadrao;
    if (!categoria) {
      toast.error("Selecione a subcategoria.");
      return;
    }
    if (!nome) {
      toast.error("Informe a descrição do item.");
      return;
    }
    if (!empresa) {
      toast.error("Selecione a empresa.");
      return;
    }
    if (salvando.current) return;
    const valores: Record<string, unknown> = {
      categoria,
      nome,
      estoque_minimo: Math.max(0, Number(f.get("estoque_minimo") ?? 0) || 0),
    };
    if (config.custoMarcaModelo) {
      const preco = String(f.get("preco_unitario") ?? "").trim();
      const precoNumero = Number(preco);
      if (preco && (!Number.isFinite(precoNumero) || precoNumero < 0)) {
        toast.error("Preço de custo inválido.");
        return;
      }
      // Centavos: arredonda para 2 casas (preços antigos podem ter mais).
      valores["preco_unitario"] = preco ? Math.round(precoNumero * 100) / 100 : null;
      // Marca e modelo ainda não existem na tabela real de uniformes: nesta fase só são
      // gravados no modo demonstração. As colunas entram na Fase 2.
      if (MODO_DEMO) {
        valores["marca"] = String(f.get("marca") ?? "").trim() || null;
        valores["modelo"] = String(f.get("modelo") ?? "").trim() || null;
      }
    }
    if (!editando) {
      valores["empresa_id"] = empresa;
      if (!regra) {
        toast.error(`Regra do código de ${config.nome} não encontrada.`);
        return;
      }
    }
    salvando.current = true;
    setGerando(true);
    const liberar = destravar;
    if (!editando && regra) {
      try {
        // O código é gerado na hora de salvar, para não repetir um já usado.
        valores["codigo_sku"] = proximoCodigo(regra, await codigosUsados(tabela));
      } catch (erro) {
        liberar();
        toast.error("Não foi possível gerar o código.", {
          description: erro instanceof Error ? erro.message : undefined,
        });
        return;
      }
      valores["estoque_atual"] = 0;
      valores["status"] = "Ativo";
    }
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false), onError: liberar },
    );
  }

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const temFicha = (id: string) => fichas.some((f) => f.epiId === id);

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
                config.modulo,
                itens.map((i) => ({
                  Código: i.codigo_sku,
                  Subcategoria: i.categoria,
                  Descrição: i.nome,
                  "Estoque mínimo": i.estoque_minimo,
                  Estoque: i.estoque_atual,
                  Empresa: nomeEmpresa(i.empresa_id),
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={abrirNovo}>
            Novo {config.nome}
          </Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Estoque mínimo</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Empresa</TableHead>
              {config.ficha && <TableHead>Ficha</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={config.ficha ? 8 : 7}
                  className="text-center text-muted-foreground"
                >
                  Carregando…
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={config.ficha ? 8 : 7}
                  className="text-center text-muted-foreground"
                >
                  Nenhum {config.nome} cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.codigo_sku}</TableCell>
                  <TableCell>{item.categoria || "—"}</TableCell>
                  <TableCell className="font-medium">{item.nome}</TableCell>
                  <TableCell className="text-right">{item.estoque_minimo ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        (item.estoque_atual ?? 0) <= (item.estoque_minimo ?? 0)
                          ? "font-bold text-destructive"
                          : ""
                      }
                    >
                      {item.estoque_atual ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>{nomeEmpresa(item.empresa_id)}</TableCell>
                  {config.ficha && (
                    <TableCell>
                      <Link to="/cadastros/epi-ficha" search={{ epi: item.id }}>
                        <Badge variant={temFicha(item.id) ? "secondary" : "outline"}>
                          {temFicha(item.id) ? "Cadastrada" : "Pendente"}
                        </Badge>
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        destravar();
                        setEditando(item);
                        setAberto(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir ${item.codigo_sku} ${item.nome}?`))
                          excluir.mutate(item.id, {
                            // A ficha do EPI excluído sai junto (só EPI tem ficha).
                            onSuccess: () => {
                              try {
                                if (config.ficha) removerFicha(item.id);
                              } catch {
                                // Fichas ilegíveis ficam como estão.
                              }
                            },
                          });
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar ${editando.codigo_sku}` : `Cadastrar ${config.nome}`}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "O código do produto não muda."
                : "O código é gerado automaticamente ao salvar, pela regra de Cadastros > Gerais > Código do Produto."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="codigo_sku">Código</Label>
              <Input
                id="codigo_sku"
                readOnly
                className="bg-muted font-mono"
                value={editando?.codigo_sku ?? (previa || "Gerado ao salvar")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Subcategoria</Label>
              <Select name="categoria" defaultValue={subcategoriaAtual}>
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {subcategorias.map((s) => (
                    <SelectItem key={s.id} value={s.nome}>
                      {s.nome}
                    </SelectItem>
                  ))}
                  {subcategoriaAntiga && (
                    <SelectItem value={subcategoriaAntiga}>
                      {subcategoriaAntiga} (fora de Cadastros &gt; Gerais)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {subcategorias.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma subcategoria de {config.nome} em Cadastros &gt; Gerais &gt; Categorias.
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Descrição do item</Label>
              <Textarea
                id="nome"
                aria-required
                name="nome"
                rows={2}
                defaultValue={editando?.nome ?? ""}
                placeholder={`Ex.: ${config.exemplo}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estoque_minimo">Estoque mínimo</Label>
              <Input
                id="estoque_minimo"
                name="estoque_minimo"
                type="number"
                min={0}
                step={1}
                defaultValue={editando?.estoque_minimo ?? 0}
              />
            </div>
            {config.custoMarcaModelo && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="preco_unitario">Preço de custo (R$)</Label>
                  <Input
                    id="preco_unitario"
                    name="preco_unitario"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={editando?.preco_unitario ?? ""}
                  />
                </div>
                {MODO_DEMO && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="marca">Marca</Label>
                      <Input id="marca" name="marca" defaultValue={editando?.marca ?? ""} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input id="modelo" name="modelo" defaultValue={editando?.modelo ?? ""} />
                    </div>
                  </>
                )}
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                value={editando ? (editando.empresa_id ?? "") : empresaSel || empresaPadrao}
                onValueChange={setEmpresaSel}
                disabled={!!editando}
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

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending || gerando}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
