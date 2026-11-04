import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { exemploEquipamento } from "@/lib/dados-teste/exemplos";
import { EquipamentoDialog } from "@/components/parametros/EquipamentoDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { empresaPadraoParaEscolha } from "@/lib/empresas";
import { listarEquipamentos, removerEquipamento, type Equipamento } from "@/lib/equipamentos-demo";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";
import { exportarCsv } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";

export const Route = createFileRoute("/_authenticated/cadastros/equipamentos")({
  head: () => ({ meta: [{ title: "Cadastrar equipamento | Patrimônio GEMAPE" }] }),
  component: PaginaEquipamentos,
});

function PaginaEquipamentos() {
  const { empresas, empresaId } = useEmpresa();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(listarEquipamentos);
  // Busca por palavra-chave (decisão 341): patrimônio, nome, subcategoria, tipo, marca, modelo, setor, status e empresa.
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Equipamento | null>(null);
  // Clonar: dados do equipamento de origem num cadastro NOVO (decisão 138); patrimônio e série voltam em branco.
  const [modelo, setModelo] = useState<Equipamento | null>(null);

  function abrir(e: Equipamento | null, clonar = false) {
    setEditando(clonar ? null : e);
    setModelo(clonar ? e : null);
    setAberto(true);
  }

  function excluir(e: Equipamento) {
    if (!confirm(`Excluir ${e.nome} (${e.patrimonio})?`)) return;
    try {
      removerEquipamento(e.id);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir o equipamento.");
      return;
    }
    setEquipamentos(listarEquipamentos());
    toast.success("Equipamento excluído");
  }

  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>O cadastro de equipamentos será conectado ao banco após a aprovação da demonstração.</p>;
  }

  // Tipo (filho) e subcategoria (pai) de Parâmetros Específicos; equipamento antigo, sem tipo, mostra traço até ser editado.
  const parametros = lerParametrosEquipamento();
  const tipoDe = (id: string) => parametros.tipos.find((t) => t.id === id);
  const nomeSubcategoria = (id: string) => parametros.subcategorias.find((s) => s.id === tipoDe(id)?.subcategoriaId)?.nome ?? "—";
  const nomeEmpresa = (id: string) => empresas.find((x) => x.id === id)?.nome_fantasia ?? "—";
  const lista = equipamentos.filter((e) => combinaBusca(busca, e.patrimonio, e.nome, nomeSubcategoria(e.tipoId), tipoDe(e.tipoId)?.nome, e.marca, e.modelo, e.setor, e.status, nomeEmpresa(e.empresaId)));

  return (
    <div className="space-y-5">
      <header className="flex flex-col items-start gap-3">
        <div>
          <EyebrowDoCard fallback="Parâmetros" />
          <h1 className="text-2xl font-bold">Cadastrar equipamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dados gerais e especificações técnicas por categoria. O módulo Equipamentos usa estes cadastros.</p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={lista.length === 0}
              onClick={() =>
                exportarCsv(
                  "equipamentos",
                  lista.map((e) => ({
                    Patrimônio: e.patrimonio,
                    Equipamento: e.nome,
                    Subcategoria: nomeSubcategoria(e.tipoId),
                    Tipo: tipoDe(e.tipoId)?.nome ?? "",
                    "Marca / modelo": `${e.marca} ${e.modelo}`.trim(),
                    Setor: e.setor,
                    Status: e.status,
                    Empresa: nomeEmpresa(e.empresaId),
                  })),
                )
              }
            >
              Exportar CSV
            </Button>
            <Button requiresWrite onClick={() => import.meta.env.VITE_DEMO_MODE !== "false" ? abrir(exemploEquipamento(equipamentos, empresaPadraoParaEscolha(empresas, empresaId)), true) : abrir(null)}>Cadastrar equipamento</Button>
          </div>
        </div>
        <BarraDeFiltros>
          <Input
            aria-label="Buscar equipamento por palavra-chave"
            placeholder="Buscar por palavra-chave"
            className="max-w-md"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca.trim() && <p className="text-sm text-muted-foreground">{lista.length} de {equipamentos.length} equipamento(s).</p>}
        </BarraDeFiltros>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patrimônio</TableHead><TableHead>Equipamento</TableHead><TableHead>Subcategoria</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Marca / modelo</TableHead><TableHead>Setor</TableHead><TableHead>Status</TableHead>
              <TableHead>Empresa</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">{equipamentos.length === 0 ? "Nenhum equipamento cadastrado." : "Nenhum equipamento encontrado para a busca."}</TableCell></TableRow>
            ) : (
              lista.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.patrimonio}</TableCell>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell>{nomeSubcategoria(e.tipoId)}</TableCell>
                  <TableCell>{tipoDe(e.tipoId)?.nome ?? "—"}</TableCell>
                  <TableCell>{e.marca} {e.modelo}</TableCell>
                  <TableCell>{e.setor}</TableCell>
                  <TableCell>{e.status}</TableCell>
                  <TableCell>{nomeEmpresa(e.empresaId)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <AcoesLinha rotulo={e.nome} onClonar={() => abrir(e, true)} onEditar={() => abrir(e)} onExcluir={() => excluir(e)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EquipamentoDialog aberto={aberto} onAberto={setAberto} editando={editando} modelo={modelo} onSalvo={() => setEquipamentos(listarEquipamentos())} />
    </div>
  );
}
