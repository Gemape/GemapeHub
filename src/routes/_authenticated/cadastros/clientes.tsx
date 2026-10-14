import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { ClienteDialog } from "@/components/parametros/ClienteDialog";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listarClientes, proximoCodigoCliente, removerCliente, type Cliente } from "@/lib/clientes-demo";
import { formatarTelefone } from "@/lib/formatacao-cadastral";

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
  // Calculado ao abrir, para não trocar enquanto o diálogo fecha depois de salvar.
  const [codigoPrevisto, setCodigoPrevisto] = useState("");

  function abrir(cliente: Cliente | null, clonar = false) {
    setEditando(clonar ? null : cliente);
    setModelo(clonar ? cliente : null);
    setCodigoPrevisto(!clonar && cliente ? cliente.codigo : proximoCodigoCliente());
    setAberto(true);
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
          <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>CNPJ</TableHead>
          <TableHead>Contato</TableHead><TableHead>Telefone</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {clientes.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum cliente cadastrado.</TableCell></TableRow> :
            clientes.map((cliente) => <TableRow key={cliente.id}>
              <TableCell className="font-mono text-xs">{cliente.codigo}</TableCell>
              <TableCell className="font-medium">{cliente.nome}</TableCell>
              <TableCell>{cliente.cpf || "—"}</TableCell>
              <TableCell>{cliente.cnpj || "—"}</TableCell>
              <TableCell>{cliente.contato || "—"}</TableCell>
              <TableCell>{formatarTelefone(cliente.telefone) || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <AcoesLinha rotulo={cliente.nome} onClonar={() => abrir(cliente, true)} onEditar={() => abrir(cliente)} onExcluir={() => excluir(cliente)} />
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <ClienteDialog aberto={aberto} onAberto={setAberto} editando={editando} modelo={modelo} codigoPrevisto={codigoPrevisto} onSalvo={() => setClientes(listarClientes())} />
  </div>;
}
