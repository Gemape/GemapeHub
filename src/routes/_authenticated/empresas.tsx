import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  CAMPOS_ENDERECO_EMPRESA,
  STATUS_EMPRESA,
  enderecoResumido,
  statusDaEmpresa,
  valoresDaEmpresa,
} from "@/lib/empresas";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { useExcluir, useSalvar } from "@/lib/hooks-gemape";
import { formatarCnpj, formatarCep } from "@/lib/formatacao-cadastral";
import { aoDigitarMascarado } from "@/lib/mascaras";
// Endereço e status ainda não existem no banco real (Fase 2): só aparecem na demonstração.
import { MODO_DEMO } from "@/lib/modo-demo";


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
  // Clonar: dados da empresa de origem num cadastro NOVO (CNPJ sempre em branco).
  const [modelo, setModelo] = useState<Empresa | null>(null);
  const base = editando ?? modelo;
  const salvar = useSalvar("empresas", ["empresas"]);
  const excluir = useExcluir("empresas", ["empresas"]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let valores: Record<string, string>;
    try { valores = valoresDaEmpresa(f, MODO_DEMO, editando ?? undefined); }
    catch (erro) { toast.error(erro instanceof Error ? erro.message : "Dados inválidos."); return; }
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
            setModelo(null);
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
              {MODO_DEMO && <TableHead>Endereço</TableHead>}
              {MODO_DEMO && <TableHead>Status</TableHead>}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => (
              <TableRow key={empresa.id}>
                <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                <TableCell>{empresa.razao_social}</TableCell>
                <TableCell>{formatarCnpj(empresa.cnpj)}</TableCell>
                {MODO_DEMO && <TableCell>{enderecoResumido(empresa) || "—"}</TableCell>}
                {MODO_DEMO && <TableCell>{statusDaEmpresa(empresa)}</TableCell>}
                <TableCell className="text-right whitespace-nowrap">
                  <AcoesLinha
                    rotulo={empresa.nome_fantasia}
                    onClonar={() => {
                      setEditando(null);
                      setModelo(empresa);
                      setAberto(true);
                    }}
                    onEditar={() => {
                      setModelo(null);
                      setEditando(empresa);
                      setAberto(true);
                    }}
                    onExcluir={() => {
                      if (confirm(`Excluir ${empresa.nome_fantasia}?`)) excluir.mutate(empresa.id);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empresa" : modelo ? "Clonar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Dados cadastrais da unidade.</DialogDescription>
          </DialogHeader>
          <form key={editando?.id ?? (modelo ? `clone-${modelo.id}` : "nova")} onSubmit={enviar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome_fantasia">Nome fantasia</Label>
              <Input
                id="nome_fantasia"
                name="nome_fantasia"
                required
                defaultValue={base?.nome_fantasia ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="razao_social">Razão social</Label>
              <Input
                id="razao_social"
                name="razao_social"
                required
                defaultValue={base?.razao_social ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" inputMode="numeric" onInput={aoDigitarMascarado("cnpj")} required defaultValue={editando?.cnpj ? formatarCnpj(editando.cnpj) : ""} />
            </div>
            {MODO_DEMO && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CAMPOS_ENDERECO_EMPRESA.map((campo) => (
                    <div key={campo.nome} className="space-y-1.5">
                      <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
                      <Input
                        id={campo.nome}
                        name={campo.nome}
                        inputMode={campo.nome === "cep" ? "numeric" : undefined}
                        onInput={aoDigitarMascarado(campo.nome)}
                        defaultValue={campo.nome === "cep" ? formatarCep(base?.cep ?? "") : base?.[campo.nome] ?? ""}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={base ? statusDaEmpresa(base) : "Ativa"}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {STATUS_EMPRESA.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
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
