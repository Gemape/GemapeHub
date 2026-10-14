import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
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
  formatarDocumento, listarClientes, proximoCodigoCliente, removerCliente, salvarCliente,
  type Cliente, type ClienteDados,
} from "@/lib/clientes-demo";
import { capitalizarNomePessoa, capitalizarTexto, formatarTelefone } from "@/lib/formatacao-cadastral";
import { aoDigitarMascarado } from "@/lib/mascaras";

export const Route = createFileRoute("/_authenticated/cadastros/clientes")({
  head: () => ({ meta: [{ title: "Clientes | Patrimônio GEMAPE" }] }),
  component: PaginaClientes,
});

function PaginaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(listarClientes);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  // Clonar: dados do cliente de origem num cadastro NOVO, com código novo (todos os campos copiados, decisão 138).
  const [modelo, setModelo] = useState<Cliente | null>(null);
  const base = editando ?? modelo;
  // Calculado ao abrir, para não trocar enquanto o diálogo fecha depois de salvar.
  const [codigoPrevisto, setCodigoPrevisto] = useState("");

  function abrir(cliente: Cliente | null, clonar = false) {
    setEditando(clonar ? null : cliente);
    setModelo(clonar ? cliente : null);
    setCodigoPrevisto(!clonar && cliente ? cliente.codigo : proximoCodigoCliente());
    setAberto(true);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const texto = (nome: string) => String(formulario.get(nome) ?? "").trim();
    const valores: ClienteDados = {
      nome: capitalizarTexto(texto("nome")),
      documento: texto("documento"),
      endereco: capitalizarTexto(texto("endereco")),
      contato: capitalizarNomePessoa(texto("contato")),
      telefone: texto("telefone"),
      telefone2: texto("telefone2"),
      email: texto("email"),
      observacao: capitalizarTexto(texto("observacao")),
    };
    try {
      salvarCliente(editando ? { ...valores, id: editando.id } : valores);
      setClientes(listarClientes());
      setAberto(false);
      toast.success("Cliente salvo");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o cliente.");
    }
  }

  function excluir(cliente: Cliente) {
    if (!confirm(`Excluir ${cliente.nome}?`)) return;
    try {
      removerCliente(cliente.id);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir o cliente.");
      return;
    }
    setClientes(listarClientes());
    toast.success("Cliente excluído");
  }

  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>O cadastro de clientes será conectado ao banco após a aprovação da demonstração.</p>;
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Clientes atendidos pela equipe em viagens e saídas externas.</p>
      </div>
      <Button requiresWrite onClick={() => abrir(null)}>Novo cliente</Button>
    </header>

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>CPF/CNPJ</TableHead>
          <TableHead>Contato</TableHead><TableHead>Telefone</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {clientes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum cliente cadastrado.</TableCell></TableRow> :
            clientes.map((cliente) => <TableRow key={cliente.id}>
              <TableCell className="font-mono text-xs">{cliente.codigo}</TableCell>
              <TableCell className="font-medium">{cliente.nome}</TableCell>
              <TableCell>{cliente.documento ? formatarDocumento(cliente.documento) : "—"}</TableCell>
              <TableCell>{cliente.contato || "—"}</TableCell>
              <TableCell>{formatarTelefone(cliente.telefone) || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <AcoesLinha rotulo={cliente.nome} onClonar={() => abrir(cliente, true)} onEditar={() => abrir(cliente)} onExcluir={() => excluir(cliente)} />
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cliente" : modelo ? "Clonar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Só o nome é obrigatório.</DialogDescription>
        </DialogHeader>
        <form key={editando?.id ?? (modelo ? `clone-${modelo.id}` : "novo")} onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="codigo">Código do cliente</Label><Input id="codigo" readOnly tabIndex={-1} className="bg-muted font-mono" value={codigoPrevisto} /><p className="text-xs text-muted-foreground">Gerado automaticamente.</p></div>
          <div className="hidden sm:block" />
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="nome">Nome do cliente</Label><Input id="nome" name="nome" capitalizar="texto" required defaultValue={base?.nome ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="documento">CNPJ ou CPF</Label><Input id="documento" name="documento" inputMode="numeric" onInput={aoDigitarMascarado("documento")} defaultValue={base ? formatarDocumento(base.documento) : ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="contato">Contato</Label><Input id="contato" name="contato" capitalizar="nome" defaultValue={base?.contato ?? ""} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" name="endereco" capitalizar="texto" defaultValue={base?.endereco ?? ""} /></div>
          <div className="space-y-1.5"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" inputMode="tel" onInput={aoDigitarMascarado("telefone")} defaultValue={formatarTelefone(base?.telefone ?? "")} /></div>
          <div className="space-y-1.5"><Label htmlFor="telefone2">Telefone 2</Label><Input id="telefone2" name="telefone2" inputMode="tel" onInput={aoDigitarMascarado("telefone2")} defaultValue={formatarTelefone(base?.telefone2 ?? "")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" defaultValue={base?.email ?? ""} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="observacao">Observação</Label><Textarea id="observacao" name="observacao" capitalizar="texto" defaultValue={base?.observacao ?? ""} /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button requiresWrite type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
