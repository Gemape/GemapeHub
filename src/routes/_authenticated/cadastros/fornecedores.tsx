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
  listarFornecedores, NATUREZAS_FORNECEDOR, removerFornecedor, salvarFornecedor,
  type Fornecedor, type FornecedorDados, type NaturezaFornecedor,
} from "@/lib/fornecedores-demo";

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
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);

  function abrir(fornecedor: Fornecedor | null) {
    setEditando(fornecedor);
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
      naturezas: formulario.getAll("naturezas") as NaturezaFornecedor[],
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
    if (!confirm(`Excluir ${fornecedor.nome_fantasia}?`)) return;
    removerFornecedor(fornecedor.id);
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
        <p className="mt-1 text-sm text-muted-foreground">Dados cadastrais e naturezas de fornecimento.</p>
      </div>
      <Button requiresWrite onClick={() => abrir(null)}>Novo fornecedor</Button>
    </header>

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Nome fantasia</TableHead><TableHead>Razão social</TableHead>
          <TableHead>CNPJ</TableHead><TableHead>Cidade/Estado</TableHead>
          <TableHead>Natureza</TableHead><TableHead>Contato</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {fornecedores.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum fornecedor cadastrado.</TableCell></TableRow> :
            fornecedores.map((fornecedor) => <TableRow key={fornecedor.id}>
              <TableCell className="font-medium">{fornecedor.nome_fantasia}</TableCell>
              <TableCell>{fornecedor.razao_social}</TableCell>
              <TableCell>{fornecedor.cnpj}</TableCell>
              <TableCell>{[fornecedor.cidade, fornecedor.estado].filter(Boolean).join("/") || "—"}</TableCell>
              <TableCell>{fornecedor.naturezas.join(", ")}</TableCell>
              <TableCell>{fornecedor.contato || fornecedor.telefone || "—"}</TableCell>
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
          <div className="space-y-1.5"><Label htmlFor="razao_social">Razão Social</Label><Input id="razao_social" name="razao_social" required defaultValue={editando?.razao_social ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="nome_fantasia">Nome Fantasia</Label><Input id="nome_fantasia" name="nome_fantasia" required defaultValue={editando?.nome_fantasia ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="cnpj">CNPJ</Label><Input id="cnpj" name="cnpj" inputMode="numeric" required defaultValue={editando?.cnpj ?? ""} /></div>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">Natureza</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {NATUREZAS_FORNECEDOR.map((natureza) => <label key={natureza} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="naturezas" value={natureza} defaultChecked={editando?.naturezas.includes(natureza) ?? false} />{natureza}
              </label>)}
            </div>
          </fieldset>
          <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Endereço</h2>
          {camposEndereco.map((campo) => <div key={campo.nome} className="space-y-1.5">
            <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
            <Input id={campo.nome} name={campo.nome} defaultValue={editando?.[campo.nome] ?? ""} />
          </div>)}
          <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Contato e informações adicionais</h2>
          {camposContato.map((campo) => <div key={campo.nome} className="space-y-1.5">
            <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
            <Input id={campo.nome} name={campo.nome} defaultValue={editando?.[campo.nome] ?? ""} />
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
