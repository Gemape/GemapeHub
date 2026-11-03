import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { exportarCsv } from "@/lib/gemape";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { exemploFornecedor } from "@/lib/dados-teste/exemplos";
import { FornecedorDialog } from "@/components/parametros/FornecedorDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  listarFornecedores, proximoCodigoFornecedor, removerFornecedor,
  type Fornecedor,
} from "@/lib/fornecedores-demo";
import { avisoExclusaoDoFornecedor, vinculosDoFornecedor } from "@/lib/codigo-fabrica-vinculos";
import { nomeDoFornecedor } from "@/lib/compras-fornecedor";
import { camposDeBusca } from "@/lib/busca-cadastro";
import { combinaBusca, lerParametros, removerCodigosFabricaPorIds, type CodigoFabrica } from "@/lib/parametros-base";
import { formatarCnpj, formatarTelefone } from "@/lib/formatacao-cadastral";

export const Route = createFileRoute("/_authenticated/cadastros/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores | Patrimônio GEMAPE" }] }),
  component: PaginaFornecedores,
});

function PaginaFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(listarFornecedores);
  const [busca, setBusca] = useState("");
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
      // O fornecedor sai primeiro: se a leitura ou a gravação falhar, nada foi apagado e as associações continuam.
      removerFornecedor(fornecedor.id);
      removerCodigosFabricaPorIds(vinculos.map((c) => c.id));
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

  const lista = fornecedores.filter((f) => combinaBusca(busca, ...camposDeBusca(f, [formatarCnpj(f.cnpj), formatarTelefone(f.telefone)])));

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados cadastrais dos fornecedores.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={lista.length === 0} onClick={() => exportarCsv("fornecedores", lista.map((x) => ({
          Código: x.codigo,
          "Nome fantasia": x.nome_fantasia ?? "",
          "Razão social": x.razao_social,
          CNPJ: formatarCnpj(x.cnpj),
          "Cidade/Estado": [x.cidade, x.estado].filter(Boolean).join("/"),
          Contato: x.contato || formatarTelefone(x.telefone) || "",
        })))}>Exportar CSV</Button>
        <Button requiresWrite onClick={() => import.meta.env.VITE_DEMO_MODE !== "false" ? abrir(exemploFornecedor(fornecedores), true) : abrir(null)}>Novo fornecedor</Button>
      </div>
    </header>

    <div className="flex flex-wrap items-end gap-2">
      <BarraDeFiltros>
        <Input aria-label="Buscar fornecedor por palavra-chave" placeholder="Buscar por palavra-chave" className="max-w-md" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {busca.trim() && <p className="text-sm text-muted-foreground">{lista.length} de {fornecedores.length} fornecedor(es).</p>}
      </BarraDeFiltros>
    </div>

    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Código</TableHead><TableHead>Nome fantasia</TableHead><TableHead>Razão social</TableHead>
          <TableHead>CNPJ</TableHead><TableHead>Cidade/Estado</TableHead>
          <TableHead>Contato</TableHead><TableHead />
        </TableRow></TableHeader>
        <TableBody>
          {lista.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{fornecedores.length === 0 ? "Nenhum fornecedor cadastrado." : "Nenhum fornecedor encontrado para a busca."}</TableCell></TableRow> :
            lista.map((fornecedor) => <TableRow key={fornecedor.id}>
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
