import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmpresa, type Empresa } from "@/lib/empresa-context";
import { useExcluir, useSalvar } from "@/lib/hooks-gemape";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro das unidades do grupo GEMAPE com nome fantasia, razão social e CNPJ para filtrar todos os módulos.",
      },
      { property: "og:title", content: "Empresas | Patrimônio GEMAPE" },
      { property: "og:description", content: "Unidades do grupo GEMAPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaEmpresas,
});

function PaginaEmpresas() {
  const { empresas } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const salvar = useSalvar("empresas", ["empresas"]);
  const excluir = useExcluir("empresas", ["empresas"]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const valores = {
      nome_fantasia: String(f.get("nome_fantasia") ?? "").trim(),
      razao_social: String(f.get("razao_social") ?? "").trim(),
      cnpj: String(f.get("cnpj") ?? "").trim(),
    };
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      { onSuccess: () => setAberto(false) },
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-eyebrow">Cadastro</p>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unidades do grupo usadas para filtrar todos os módulos.
          </p>
        </div>
        <Button requiresWrite
          onClick={() => {
            setEditando(null);
            setAberto(true);
          }}
        >
          Nova empresa
        </Button>
      </header>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome fantasia</TableHead>
              <TableHead>Razão social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => (
              <TableRow key={empresa.id}>
                <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                <TableCell>{empresa.razao_social}</TableCell>
                <TableCell>{empresa.cnpj}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button requiresWrite
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditando(empresa);
                      setAberto(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button requiresWrite
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Excluir ${empresa.nome_fantasia}?`)) excluir.mutate(empresa.id);
                    }}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Dados cadastrais da unidade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome_fantasia">Nome fantasia</Label>
              <Input
                id="nome_fantasia"
                name="nome_fantasia"
                required
                defaultValue={editando?.nome_fantasia ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="razao_social">Razão social</Label>
              <Input
                id="razao_social"
                name="razao_social"
                required
                defaultValue={editando?.razao_social ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" required defaultValue={editando?.cnpj ?? ""} />
            </div>
            <DialogFooter>
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
