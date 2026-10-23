import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { exemploEquipamento } from "@/lib/dados-teste/exemplos";
import { EquipamentoDialog } from "@/components/parametros/EquipamentoDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmpresa } from "@/lib/empresa-context";
import { empresaPadraoParaEscolha } from "@/lib/empresas";
import { listarEquipamentos, removerEquipamento, type Equipamento } from "@/lib/equipamentos-demo";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";

export const Route = createFileRoute("/_authenticated/cadastros/equipamentos")({
  head: () => ({ meta: [{ title: "Cadastrar equipamento | Patrimônio GEMAPE" }] }),
  component: PaginaEquipamentos,
});

function PaginaEquipamentos() {
  const { empresas, empresaId } = useEmpresa();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(listarEquipamentos);
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

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-eyebrow">Parâmetros &gt; Equipamentos</p>
          <h1 className="text-2xl font-bold">Cadastrar equipamento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dados gerais e especificações técnicas por categoria. O módulo Equipamentos usa estes cadastros.</p>
        </div>
        <Button requiresWrite onClick={() => import.meta.env.VITE_DEMO_MODE !== "false" ? abrir(exemploEquipamento(equipamentos, empresaPadraoParaEscolha(empresas, empresaId)), true) : abrir(null)}>Cadastrar equipamento</Button>
      </header>

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
            {equipamentos.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhum equipamento cadastrado.</TableCell></TableRow>
            ) : (
              equipamentos.map((e) => (
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
