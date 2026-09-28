import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { useEmpregados, useExcluir, useSalvar, type Empregado } from "@/lib/hooks-gemape";

export const Route = createFileRoute("/_authenticated/empregados")({
  head: () => ({
    meta: [
      { title: "Empregados | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de empregados do grupo GEMAPE com cargo, matrícula, datas de admissão e demissão para vincular às movimentações.",
      },
      { property: "og:title", content: "Empregados | Patrimônio GEMAPE" },
      { property: "og:description", content: "Cadastro de empregados do grupo GEMAPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaEmpregados,
});

function PaginaEmpregados() {
  const { empresas, empresaId } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [editando, setEditando] = useState<Empregado | null>(null);
  const { data: empregados = [], isLoading } = useEmpregados(empresaId);
  const salvar = useSalvar("empregados", ["empregados", "empregados-total"]);
  const excluir = useExcluir("empregados", ["empregados", "empregados-total"]);

  function abrir(empregado: Empregado | null) {
    setEditando(empregado);
    setAtivo(empregado?.ativo ?? true);
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(f.get(k) ?? "").trim();
      return v === "" ? null : v;
    };
    const valores = {
      empresa_id: texto("empresa_id"),
      nome: String(f.get("nome") ?? "").trim(),
      cpf: String(f.get("cpf") ?? "").trim(),
      cargo: texto("cargo"),
      matricula: texto("matricula"),
      data_admissao: texto("data_admissao"),
      data_demissao: texto("data_demissao"),
      ativo,
    };
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false) },
    );
  }

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-eyebrow">Cadastro</p>
          <h1 className="text-2xl font-bold">Empregados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Colaboradores vinculados às movimentações de patrimônio.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportarCsv(
                "empregados",
                empregados.map((e) => ({
                  Nome: e.nome,
                  CPF: e.cpf,
                  Empresa: nomeEmpresa(e.empresa_id),
                  Cargo: e.cargo,
                  Matricula: e.matricula,
                  Admissao: formatarData(e.data_admissao),
                  Demissao: formatarData(e.data_demissao),
                  Situacao: e.ativo ? "Ativo" : "Inativo",
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={() => abrir(null)}>Novo empregado</Button>
        </div>
      </header>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Situação</TableHead>
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
            ) : empregados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum empregado cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              empregados.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell>{e.cpf}</TableCell>
                  <TableCell>{nomeEmpresa(e.empresa_id)}</TableCell>
                  <TableCell>{e.cargo ?? "—"}</TableCell>
                  <TableCell>{e.matricula ?? "—"}</TableCell>
                  <TableCell>{formatarData(e.data_admissao)}</TableCell>
                  <TableCell>
                    <Badge variant={e.ativo ? "secondary" : "outline"}>
                      {e.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button requiresWrite variant="ghost" size="sm" onClick={() => abrir(e)}>
                      Editar
                    </Button>
                    <Button requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir ${e.nome}?`)) excluir.mutate(e.id);
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
            <DialogTitle>{editando ? "Editar empregado" : "Novo empregado"}</DialogTitle>
            <DialogDescription>Dados do colaborador.</DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required defaultValue={editando?.nome ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" required defaultValue={editando?.cpf ?? ""} />
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
            <div className="space-y-1.5">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" name="cargo" defaultValue={editando?.cargo ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input id="matricula" name="matricula" defaultValue={editando?.matricula ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_admissao">Data de admissão</Label>
              <Input
                id="data_admissao"
                name="data_admissao"
                type="date"
                defaultValue={editando?.data_admissao ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_demissao">Data de demissão</Label>
              <Input
                id="data_demissao"
                name="data_demissao"
                type="date"
                defaultValue={editando?.data_demissao ?? ""}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="ativo">Empregado ativo</Label>
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
