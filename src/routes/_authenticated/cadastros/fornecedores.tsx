import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { FornecedorDialog } from "@/components/parametros/FornecedorDialog";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  listarFornecedores, proximoCodigoFornecedor, removerFornecedor,
  type Fornecedor,
} from "@/lib/fornecedores-demo";
import { avisoExclusaoDoFornecedor, vinculosDoFornecedor } from "@/lib/codigo-fabrica-vinculos";
import { nomeDoFornecedor } from "@/lib/compras-fornecedor";
import { lerParametros, removerCodigosFabricaPorIds, type CodigoFabrica } from "@/lib/parametros-base";
import { formatarCnpj, formatarTelefone } from "@/lib/formatacao-cadastral";

export const Route = createFileRoute("/_authenticated/cadastros/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores | Patrimônio GEMAPE" }] }),
  component: PaginaFornecedores,
});

function PaginaFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(listarFornecedores);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  // Clonar: dados do fornecedor de origem num cadastro NOVO (todos os campos copiados, código novo, decisão 138).
  const [modelo, setModelo] = useState<Fornecedor | null>(null);
  const base = editando ?? modelo;
  // Calculado ao abrir, para não trocar enquanto o diálogo fecha depois de salvar.
  const [codigoPrevisto, setCodigoPrevisto] = useState("");

  function abrir(fornecedor: Fornecedor | null, clonar = false) {
    setEditando(clonar ? null : fornecedor);
    setModelo(clonar ? fornecedor : null);
    setCodigoPrevisto(!clonar && fornecedor ? fornecedor.codigo : proximoCodigoFornecedor());
    setAberto(true);
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
    const nome = nomeDoFornecedor(fornecedor);
    const aviso = avisoExclusaoDoFornecedor(nome, vinculos);
    if (!confirm(aviso ? `${aviso}\n\nExcluir mesmo assim?` : `Excluir ${nome}?`)) return;
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
        <p className="mt-1 text-sm text-muted-foreground">Dados cadastrais dos fornecedores.</p>
      </div>
      <Button requiresWrite onClick={() => abrir(null)}>Novo fornecedor</Button>
    </header>

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Código</TableHead><TableHead>Nome fantasia</TableHead><TableHead>Razão social</TableHead>
          <TableHead>CNPJ</TableHead><TableHead>Cidade/Estado</TableHead>
          <TableHead>Contato</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {fornecedores.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum fornecedor cadastrado.</TableCell></TableRow> :
            fornecedores.map((fornecedor) => <TableRow key={fornecedor.id}>
              <TableCell className="font-mono text-xs">{fornecedor.codigo}</TableCell>
              <TableCell className="font-medium">{fornecedor.nome_fantasia || "—"}</TableCell>
              <TableCell>{fornecedor.razao_social}</TableCell>
              <TableCell>{formatarCnpj(fornecedor.cnpj)}</TableCell>
              <TableCell>{[fornecedor.cidade, fornecedor.estado].filter(Boolean).join("/") || "—"}</TableCell>
              <TableCell>{fornecedor.contato || formatarTelefone(fornecedor.telefone) || "—"}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <AcoesLinha rotulo={nomeDoFornecedor(fornecedor)} onClonar={() => abrir(fornecedor, true)} onEditar={() => abrir(fornecedor)} onExcluir={() => excluir(fornecedor)} />
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <FornecedorDialog aberto={aberto} onAberto={setAberto} editando={editando} modelo={modelo} codigoPrevisto={codigoPrevisto} onSalvo={() => setFornecedores(listarFornecedores())} />
  </div>;
}
