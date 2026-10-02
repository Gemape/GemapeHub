import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  listarFornecedores, proximoCodigoFornecedor, removerFornecedor, salvarFornecedor,
  type Fornecedor, type FornecedorDados,
} from "@/lib/fornecedores-demo";
import { avisoExclusaoDoFornecedor, vinculosDoFornecedor } from "@/lib/codigo-fabrica-vinculos";
import { lerParametros, removerCodigosFabricaPorIds, type CodigoFabrica } from "@/lib/parametros-base";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { formatarCep, formatarCnpj, formatarTelefone } from "@/lib/formatacao-cadastral";
import { aoDigitarMascarado } from "@/lib/mascaras";

export const Route = createFileRoute("/_authenticated/cadastros/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores | Patrimônio GEMAPE" }] }),
  component: PaginaFornecedores,
});

const camposEndereco = [
  { nome: "rua", rotulo: "Rua/Av." },
  { nome: "numero", rotulo: "Nº" },
  { nome: "bairro", rotulo: "Bairro" },
  { nome: "cep", rotulo: "CEP" },
  { nome: "cidade", rotulo: "Cidade" },
  { nome: "estado", rotulo: "Estado" },
  { nome: "pais", rotulo: "País" },
] as const;
const camposContato = [
  { nome: "inscricao_estadual", rotulo: "Inscrição Estadual" },
  { nome: "telefone", rotulo: "Telefone" },
  { nome: "contato", rotulo: "Contato" },
] as const;

function PaginaFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(listarFornecedores);
  // Categorias de Cadastros > Gerais (decisão especial 13: uma ou mais por fornecedor).
  const { categorias } = useParametrosBase();
  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome;
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  // Calculado ao abrir, para não trocar enquanto o diálogo fecha depois de salvar.
  const [codigoPrevisto, setCodigoPrevisto] = useState("");

  function abrir(fornecedor: Fornecedor | null) {
    setEditando(fornecedor);
    setCodigoPrevisto(fornecedor?.codigo ?? proximoCodigoFornecedor());
    setAberto(true);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const texto = (nome: string) => String(formulario.get(nome) ?? "").trim();
    const valores: FornecedorDados = {
      razao_social: texto("razao_social"),
      nome_fantasia: texto("nome_fantasia"),
      cnpj: texto("cnpj"),
      rua: texto("rua"),
      numero: texto("numero"),
      bairro: texto("bairro"),
      cep: texto("cep"),
      cidade: texto("cidade"),
      estado: texto("estado"),
      pais: texto("pais"),
      inscricao_estadual: texto("inscricao_estadual"),
      telefone: texto("telefone"),
      contato: texto("contato"),
      observacoes: texto("observacoes"),
      categorias: formulario.getAll("categorias").map(String),
    };
    try {
      salvarFornecedor(editando ? { ...valores, id: editando.id } : valores);
      setFornecedores(listarFornecedores());
      setAberto(false);
      toast.success("Fornecedor salvo");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o fornecedor.");
    }
  }

  function excluir(fornecedor: Fornecedor) {
    // Lê as associações na hora, para o aviso não usar dados velhos.
    let vinculos: CodigoFabrica[] = [];
    try {
      vinculos = vinculosDoFornecedor(lerParametros().codigosFabrica, fornecedor.id);
    } catch {
      toast.error("Não foi possível conferir os códigos de fábrica deste fornecedor.");
      return;
    }
    const aviso = avisoExclusaoDoFornecedor(fornecedor.nome_fantasia, vinculos);
    if (!confirm(aviso ? `${aviso}\n\nExcluir mesmo assim?` : `Excluir ${fornecedor.nome_fantasia}?`)) return;
    try {
      // As associações saem primeiro; se falhar, o fornecedor continua cadastrado.
      removerCodigosFabricaPorIds(vinculos.map((c) => c.id));
      removerFornecedor(fornecedor.id);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir o fornecedor.");
      return;
    }
    setFornecedores(listarFornecedores());
    toast.success("Fornecedor excluído");
  }

  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>O cadastro de fornecedores será conectado ao banco após a aprovação da demonstração.</p>;
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados cadastrais e categorias de produtos fornecidos.</p>
      </div>
      <Button requiresWrite onClick={() => abrir(null)}>Novo fornecedor</Button>
    </header>

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Código</TableHead><TableHead>Nome fantasia</TableHead><TableHead>Razão social</TableHead>
          <TableHead>CNPJ</TableHead><TableHead>Cidade/Estado</TableHead>
          <TableHead>Categorias</TableHead><TableHead>Contato</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {fornecedores.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum fornecedor cadastrado.</TableCell></TableRow> :
            fornecedores.map((fornecedor) => <TableRow key={fornecedor.id}>
              <TableCell className="font-mono text-xs">{fornecedor.codigo}</TableCell>
              <TableCell className="font-medium">{fornecedor.nome_fantasia}</TableCell>
              <TableCell>{fornecedor.razao_social}</TableCell>
              <TableCell>{formatarCnpj(fornecedor.cnpj)}</TableCell>
              <TableCell>{[fornecedor.cidade, fornecedor.estado].filter(Boolean).join("/") || "—"}</TableCell>
              <TableCell>{fornecedor.categorias.map((id) => nomeCategoria(id) ?? "(categoria excluída)").join(", ") || "—"}</TableCell>
              <TableCell>{fornecedor.contato || formatarTelefone(fornecedor.telefone) || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button requiresWrite variant="ghost" size="sm" onClick={() => abrir(fornecedor)}>Editar</Button>
                <Button requiresWrite variant="ghost" size="sm" onClick={() => excluir(fornecedor)}>Excluir</Button>
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>Informações cadastrais do fornecedor.</DialogDescription>
        </DialogHeader>
        <form key={editando?.id ?? "novo"} onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="codigo">Código do fornecedor</Label><Input id="codigo" readOnly tabIndex={-1} className="bg-muted font-mono" value={codigoPrevisto} /><p className="text-xs text-muted-foreground">Gerado automaticamente.</p></div>
          <div className="hidden sm:block" />
          <div className="space-y-1.5"><Label htmlFor="razao_social">Razão Social</Label><Input id="razao_social" name="razao_social" required defaultValue={editando?.razao_social ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="nome_fantasia">Nome Fantasia</Label><Input id="nome_fantasia" name="nome_fantasia" required defaultValue={editando?.nome_fantasia ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="cnpj">CNPJ</Label><Input id="cnpj" name="cnpj" inputMode="numeric" onInput={aoDigitarMascarado("cnpj")} required defaultValue={formatarCnpj(editando?.cnpj ?? "")} /></div>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">Categorias</legend>
            <p className="text-xs text-muted-foreground">Uma ou mais, de Cadastros &gt; Gerais &gt; Categorias.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {categorias.map((categoria) => <label key={categoria.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="categorias" value={categoria.id} defaultChecked={editando?.categorias.includes(categoria.id) ?? false} />{categoria.nome}
              </label>)}
              {/* Categoria já excluída de Cadastros > Gerais continua marcada até ser desmarcada. */}
              {editando?.categorias.filter((id) => !nomeCategoria(id)).map((id) => <label key={id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" name="categorias" value={id} defaultChecked />(categoria excluída)
              </label>)}
            </div>
          </fieldset>
          <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Endereço</h2>
          {camposEndereco.map((campo) => <div key={campo.nome} className="space-y-1.5">
            <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
            <Input id={campo.nome} name={campo.nome} inputMode={campo.nome === "cep" ? "numeric" : undefined} onInput={aoDigitarMascarado(campo.nome)} defaultValue={campo.nome === "cep" ? formatarCep(editando?.cep ?? "") : editando?.[campo.nome] ?? ""} />
          </div>)}
          <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Contato e informações adicionais</h2>
          {camposContato.map((campo) => <div key={campo.nome} className="space-y-1.5">
            <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
            <Input id={campo.nome} name={campo.nome} inputMode={campo.nome === "telefone" ? "tel" : undefined} onInput={aoDigitarMascarado(campo.nome)} defaultValue={campo.nome === "telefone" ? formatarTelefone(editando?.telefone ?? "") : editando?.[campo.nome] ?? ""} />
          </div>)}
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacoes">Observações</Label><Textarea id="observacoes" name="observacoes" defaultValue={editando?.observacoes ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
