import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccess } from "@/lib/access-context";
import { useEmpresa, type Empresa } from "@/lib/empresa-context";
import {
  CAMPOS_ENDERECO_EMPRESA,
  enderecoResumido,
  ordenarEmpresas,
  prepararEmpresa,
  STATUS_EMPRESA,
  statusDaEmpresa,
  type DadosEmpresa,
  type StatusEmpresa,
} from "@/lib/empresas";
import { useExcluir, useSalvar } from "@/lib/hooks-gemape";

// Endereço e status só existem no modo demonstração. No banco real essas colunas entram na
// Fase 2 (docs/pendencias-fase2.md); até lá não são exibidas nem enviadas.
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

export const Route = createFileRoute("/_authenticated/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Cadastro das empresas do grupo GEMAPE: razão social, CNPJ, endereço e status.",
      },
    ],
  }),
  component: PaginaEmpresas,
});

// Especificação: administrador (e, quando existir, RH) acessa; usuário simples não tem acesso.
// Excluir é só do administrador.
function PaginaEmpresas() {
  const { isAdmin } = useAccess();
  if (!isAdmin) {
    return (
      <div className="panel p-6 text-sm text-muted-foreground">
        Você não tem acesso ao cadastro de empresas.
      </div>
    );
  }
  return <CadastroEmpresas />;
}

function CadastroEmpresas() {
  const { empresas } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const salvar = useSalvar("empresas", ["empresas"]);
  const excluir = useExcluir("empresas", ["empresas"]);
  const lista = ordenarEmpresas(empresas);

  function abrir(empresa: Empresa | null) {
    setEditando(empresa);
    setAberto(true);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texto = (nome: string) => String(f.get(nome) ?? "");
    const bruto = {
      nome_fantasia: texto("nome_fantasia"),
      razao_social: texto("razao_social"),
      cnpj: texto("cnpj"),
      status: (MODO_DEMO ? texto("status") : "Ativa") as StatusEmpresa,
      ...Object.fromEntries(CAMPOS_ENDERECO_EMPRESA.map((c) => [c.nome, texto(c.nome)])),
    } as DadosEmpresa;
    let valores: DadosEmpresa;
    try {
      valores = prepararEmpresa(bruto, empresas, editando?.id);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Confira os dados da empresa.");
      return;
    }
    const enviados = MODO_DEMO
      ? valores
      : {
          nome_fantasia: valores.nome_fantasia,
          razao_social: valores.razao_social,
          cnpj: valores.cnpj,
        };
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores: enviados },
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
            Empresas do grupo com razão social, CNPJ, endereço e status.
          </p>
        </div>
        <Button requiresWrite onClick={() => abrir(null)}>
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
              <TableHead>Endereço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma empresa cadastrada.
                </TableCell>
              </TableRow>
            )}
            {lista.map((empresa) => {
              const status = statusDaEmpresa(empresa);
              return (
                <TableRow key={empresa.id} className={status === "Inativa" ? "opacity-70" : ""}>
                  <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                  <TableCell>{empresa.razao_social}</TableCell>
                  <TableCell className="whitespace-nowrap">{empresa.cnpj}</TableCell>
                  <TableCell className="max-w-72 text-sm">
                    {enderecoResumido(empresa) || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === "Ativa" ? "default" : "secondary"}>{status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button requiresWrite variant="ghost" size="sm" onClick={() => abrir(empresa)}>
                      Editar
                    </Button>
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir a empresa ${empresa.nome_fantasia}?`)) {
                          excluir.mutate(empresa.id);
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Dados cadastrais da empresa.</DialogDescription>
          </DialogHeader>
          <form
            key={editando?.id ?? "nova"}
            onSubmit={enviar}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="razao_social">Razão social</Label>
              <Input
                id="razao_social"
                name="razao_social"
                required
                defaultValue={editando?.razao_social ?? ""}
              />
            </div>
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
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="cnpj"
                inputMode="numeric"
                required
                placeholder="00.000.000/0000-00"
                defaultValue={editando?.cnpj ?? ""}
              />
            </div>
            {MODO_DEMO && (
              <>
                <h2 className="border-b pb-1 text-sm font-semibold sm:col-span-2">Endereço</h2>
                {CAMPOS_ENDERECO_EMPRESA.map((campo) => (
                  <div key={campo.nome} className="space-y-1.5">
                    <Label htmlFor={campo.nome}>{campo.rotulo}</Label>
                    <Input
                      id={campo.nome}
                      name={campo.nome}
                      defaultValue={editando?.[campo.nome] ?? ""}
                    />
                  </div>
                ))}
                <fieldset className="space-y-2 sm:col-span-2">
                  <legend className="text-sm font-medium">Status</legend>
                  <div className="flex gap-5">
                    {STATUS_EMPRESA.map((status) => (
                      <label key={status} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          defaultChecked={
                            (editando ? statusDaEmpresa(editando) : "Ativa") === status
                          }
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
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
