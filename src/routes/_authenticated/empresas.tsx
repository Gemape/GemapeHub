import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
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
import { exportarCsv } from "@/lib/gemape";
import { combinaBusca } from "@/lib/parametros-base";
import type { CampoRelatorio } from "@/lib/relatorio-cadastro";
import {
  CAMPOS_ENDERECO_EMPRESA,
  STATUS_EMPRESA,
  enderecoResumido,
  statusDaEmpresa,
  valoresDaEmpresa,
} from "@/lib/empresas";
import { RelatorioCadastro } from "@/components/RelatorioCadastro";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { useExcluir, useSalvar } from "@/lib/hooks-gemape";
import { formatarCnpj, formatarCep } from "@/lib/formatacao-cadastral";
import { aoDigitarMascarado } from "@/lib/mascaras";
import { ehExemplo } from "@/lib/dados-teste/exemplo-id";
import { exemploEmpresa } from "@/lib/dados-teste/exemplos";
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
  // Busca por palavra-chave (decisão 341): nome fantasia, razão social, CNPJ, endereço e status.
  const [busca, setBusca] = useState("");
  const lista = empresas.filter((e) => combinaBusca(busca, e.nome_fantasia, e.razao_social, formatarCnpj(e.cnpj), e.cnpj, MODO_DEMO ? enderecoResumido(e) : "", MODO_DEMO ? statusDaEmpresa(e) : ""));
  const camposRelatorio: CampoRelatorio<Empresa>[] = [
    { id: "nome_fantasia", rotulo: "Nome fantasia", valor: (e) => e.nome_fantasia },
    { id: "razao_social", rotulo: "Razão social", valor: (e) => e.razao_social },
    { id: "cnpj", rotulo: "CNPJ", valor: (e) => formatarCnpj(e.cnpj) },
    ...(MODO_DEMO ? [
      { id: "endereco", rotulo: "Endereço", valor: (e: Empresa) => enderecoResumido(e) },
      { id: "status", rotulo: "Status", valor: (e: Empresa) => statusDaEmpresa(e) },
    ] : []),
  ];
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  // Clonar: dados da empresa de origem num cadastro NOVO (todos os campos copiados, decisão 138).
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
      <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <p className="text-eyebrow">Cadastros</p>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unidades do grupo usadas para filtrar todos os módulos.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportarCsv(
                  "empresas",
                  lista.map((e) => ({
                    "Nome fantasia": e.nome_fantasia,
                    "Razão social": e.razao_social,
                    CNPJ: formatarCnpj(e.cnpj),
                    ...(MODO_DEMO ? { Endereço: enderecoResumido(e), Status: statusDaEmpresa(e) } : {}),
                  })),
                )
              }
              disabled={lista.length === 0}
            >
              Exportar CSV
            </Button>
            <RelatorioCadastro nome="empresas" campos={camposRelatorio} linhas={lista} filtro={busca.trim()} />
            <Button requiresWrite
              onClick={() => {
                setEditando(null);
                // Demonstração (2.8): o cadastro novo abre já preenchido com uma empresa fictícia, que só é gravada se a pessoa salvar.
                setModelo(import.meta.env.VITE_DEMO_MODE !== "false" ? exemploEmpresa(empresas) : null);
                setAberto(true);
              }}
            >
              Nova empresa
            </Button>
          </div>
        </div>
        <BarraDeFiltros>
          <Input
            aria-label="Buscar empresa por palavra-chave"
            placeholder="Buscar por palavra-chave"
            className="max-w-md"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca.trim() && <p className="text-sm text-muted-foreground">{lista.length} de {empresas.length} empresa(s).</p>}
        </BarraDeFiltros>
      </div>

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
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={MODO_DEMO ? 6 : 4} className="py-6 text-center text-muted-foreground">{busca.trim() ? "Nenhuma empresa para a busca." : "Nenhuma empresa cadastrada."}</TableCell></TableRow>
            )}
            {lista.map((empresa) => (
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
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empresa" : modelo && !ehExemplo(modelo) ? "Clonar empresa" : "Nova empresa"}</DialogTitle>
            <DialogDescription>Dados cadastrais da unidade.</DialogDescription>
          </DialogHeader>
          <form key={editando?.id ?? (modelo ? `clone-${modelo.id}` : "nova")} onSubmit={enviar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome_fantasia">Nome fantasia</Label>
              <Input
                id="nome_fantasia"
                name="nome_fantasia"
                capitalizar="texto"
                required
                defaultValue={base?.nome_fantasia ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="razao_social">Razão social</Label>
              <Input
                id="razao_social"
                name="razao_social"
                capitalizar="texto"
                required
                defaultValue={base?.razao_social ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" inputMode="numeric" onInput={aoDigitarMascarado("cnpj")} required defaultValue={base?.cnpj ? formatarCnpj(base.cnpj) : ""} />
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
                        {...(["rua", "bairro", "cidade"].includes(campo.nome) ? { capitalizar: "texto" as const } : {})}
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
