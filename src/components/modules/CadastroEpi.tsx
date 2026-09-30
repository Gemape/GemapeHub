import { Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { useExcluir, useItens, useSalvar, type Item } from "@/lib/hooks-gemape";
import { mesmoNome, proximoCodigo, subcategoriasDa } from "@/lib/parametros-base";
import { useParametrosBase } from "@/lib/use-parametros-base";

// Categoria EPI de Cadastros > Gerais (id fixo; o nome pode ser renomeado).
const CATEGORIA_EPI = "cat-epi";

// Todos os códigos de EPI já usados, de todas as empresas, para seguir a sequência.
async function codigosUsados(): Promise<string[]> {
  const { data, error } = await supabase.from("epis").select("codigo_sku");
  if (error) throw error;
  return ((data ?? []) as { codigo_sku: string | null }[]).map((e) => e.codigo_sku ?? "");
}

// Cadastrar EPI (especificação rev1): código automático, subcategoria, descrição e
// estoque mínimo. A empresa continua sendo informada porque cada EPI pertence a uma.
export function CadastroEpi() {
  const { empresas, empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const fichas = useFichasEpi();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [previa, setPrevia] = useState("");
  const { data: itens = [], isLoading } = useItens("epi", empresaId, busca);
  const salvar = useSalvar("epis", ["epis", "produtos-gemape", "saidas-por-item"]);
  const excluir = useExcluir("epis", ["epis", "produtos-gemape", "saidas-por-item"]);

  const regra = parametros.regrasCodigo.find((r) => r.categoriaId === CATEGORIA_EPI);
  const subcategorias = subcategoriasDa(parametros, CATEGORIA_EPI);
  // Ao editar um EPI antigo cuja subcategoria não está em Cadastros > Gerais, ela
  // continua aparecendo para não ser apagada sem querer.
  const subcategoriaAntiga =
    editando?.categoria && !subcategorias.some((s) => mesmoNome(s.nome, editando.categoria))
      ? editando.categoria
      : null;

  async function abrirNovo() {
    if (!regra) {
      toast.error(
        "Cadastre antes a regra do código de EPI em Cadastros > Gerais > Código do Produto.",
      );
      return;
    }
    setEditando(null);
    setPrevia("");
    setAberto(true);
    try {
      setPrevia(proximoCodigo(regra, await codigosUsados()));
    } catch {
      setPrevia("");
    }
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const categoria = String(f.get("categoria") ?? "").trim();
    const nome = String(f.get("nome") ?? "").trim();
    const empresa = String(f.get("empresa_id") ?? "").trim();
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
    const valores: Record<string, unknown> = {
      empresa_id: empresa,
      categoria,
      nome,
      estoque_minimo: Math.max(0, Number(f.get("estoque_minimo") ?? 0) || 0),
    };
    if (!editando) {
      if (!regra) {
        toast.error("Regra do código de EPI não encontrada.");
        return;
      }
      try {
        // O código é gerado na hora de salvar, para não repetir um já usado.
        valores["codigo_sku"] = proximoCodigo(regra, await codigosUsados());
      } catch (erro) {
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
      { onSuccess: () => setAberto(false) },
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
                "epi",
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
            Novo EPI
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
              <TableHead>Ficha</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum EPI cadastrado.
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
                  <TableCell>
                    <Link to="/cadastros/epi-ficha" search={{ epi: item.id }}>
                      <Badge variant={temFicha(item.id) ? "secondary" : "outline"}>
                        {temFicha(item.id) ? "Cadastrada" : "Pendente"}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
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
                          excluir.mutate(item.id);
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
              {editando ? `Editar ${editando.codigo_sku}` : "Cadastrar EPI"}
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
              <Select name="categoria" defaultValue={editando?.categoria ?? ""}>
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
                  Nenhuma subcategoria de EPI em Cadastros &gt; Gerais &gt; Categorias.
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Descrição do item</Label>
              <Textarea
                id="nome"
                name="nome"
                rows={2}
                defaultValue={editando?.nome ?? ""}
                placeholder="Ex.: capacete de segurança em ABS de alto impacto"
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
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select
                name="empresa_id"
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
