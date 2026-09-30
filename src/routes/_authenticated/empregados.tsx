import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { empregadoAtivo, prepararEmpregado, separarEmpregados } from "@/lib/empregados";
import { useEmpregados, useExcluir, useSalvar, type Empregado } from "@/lib/hooks-gemape";

// O e-mail ainda não existe na tabela real de empregados: nesta fase só é gravado no
// modo demonstração. A coluna entra na Fase 2.
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

type EmpregadoCadastro = Empregado & { email?: string | null };

export const Route = createFileRoute("/_authenticated/empregados")({
  head: () => ({
    meta: [
      { title: "Empregados | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de empregados do grupo GEMAPE com CPF, matrícula, e-mail e datas de admissão e demissão.",
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
  const [editando, setEditando] = useState<EmpregadoCadastro | null>(null);
  const [empresaSel, setEmpresaSel] = useState("");
  const salvando = useRef(false);
  const { data: lista = [], isLoading } = useEmpregados(empresaId);
  const empregados = lista as EmpregadoCadastro[];
  const { ativos, inativos } = separarEmpregados(empregados);
  const empresaPadrao = empresaId !== TODAS ? empresaId : (empresas[0]?.id ?? "");
  // Empregado antigo sem empresa: a empresa precisa ser escolhida, não é preenchida sozinha.
  const empresaForm = empresaSel || (editando ? "" : empresaPadrao);
  const salvar = useSalvar("empregados", ["empregados", "empregados-total"]);
  const excluir = useExcluir("empregados", ["empregados", "empregados-total"]);

  function abrir(empregado: EmpregadoCadastro | null) {
    salvando.current = false;
    setEditando(empregado);
    setEmpresaSel(empregado?.empresa_id ?? "");
    setAberto(true);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "");
    let valores: Record<string, unknown>;
    try {
      // Confere CPF e matrícula contra todos os empregados, de todas as empresas.
      const { data: todos, error } = await supabase.from("empregados").select("id,cpf,matricula");
      if (error) throw new Error("Não foi possível conferir CPF e matrícula. Tente de novo.");
      valores = prepararEmpregado(
        {
          nome: texto("nome"),
          cpf: texto("cpf"),
          matricula: texto("matricula"),
          empresa_id: empresaForm,
          email: MODO_DEMO ? texto("email") : "",
          data_admissao: texto("data_admissao"),
          data_demissao: texto("data_demissao"),
        },
        todos ?? [],
        editando ?? undefined,
      );
    } catch (erro) {
      salvando.current = false;
      toast.error(erro instanceof Error ? erro.message : "Dados inválidos.");
      return;
    }
    if (!MODO_DEMO) delete valores["email"];
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      {
        onSuccess: () => setAberto(false),
        onError: () => {
          salvando.current = false;
        },
      },
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
                  Matricula: e.matricula,
                  "E-mail": e.email ?? "",
                  Admissao: formatarData(e.data_admissao),
                  Demissao: formatarData(e.data_demissao),
                  Situacao: empregadoAtivo(e) ? "Ativo" : "Inativo",
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={() => abrir(null)}>
            Novo empregado
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <BlocoEmpregados
            titulo={`Ativos (${ativos.length})`}
            lista={ativos}
            vazio="Nenhum empregado ativo."
            nomeEmpresa={nomeEmpresa}
            onEditar={abrir}
            onExcluir={(e) => {
              if (confirm(`Excluir ${e.nome}?`)) excluir.mutate(e.id);
            }}
          />
          <BlocoEmpregados
            titulo={`Demitidos / inativos (${inativos.length})`}
            lista={inativos}
            vazio="Nenhum empregado inativo."
            nomeEmpresa={nomeEmpresa}
            onEditar={abrir}
            onExcluir={(e) => {
              if (confirm(`Excluir ${e.nome}?`)) excluir.mutate(e.id);
            }}
          />
        </>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empregado" : "Novo empregado"}</DialogTitle>
            <DialogDescription>Dados do empregado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void enviar(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" aria-required defaultValue={editando?.nome ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                aria-required
                inputMode="numeric"
                placeholder="000.000.000-00"
                defaultValue={editando?.cpf ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select value={empresaForm} onValueChange={setEmpresaSel}>
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
              <Label htmlFor="matricula">Matrícula interna (LxPx)</Label>
              <Input
                id="matricula"
                name="matricula"
                placeholder="Livro e página, ex.: L3P25"
                defaultValue={editando?.matricula ?? ""}
              />
            </div>
            {MODO_DEMO && (
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={editando?.email ?? ""} />
              </div>
            )}
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
            <p className="text-xs text-muted-foreground sm:col-span-2">
              O empregado continua ativo até a data de demissão. A partir dela, fica inativo, passa
              para o bloco de demitidos e não recebe mais entregas, devoluções ou baixas. Só o
              Termo de Encerramento de ferramentas (devolução na saída) continua liberado.
            </p>
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

function BlocoEmpregados({
  titulo,
  lista,
  vazio,
  nomeEmpresa,
  onEditar,
  onExcluir,
}: {
  titulo: string;
  lista: EmpregadoCadastro[];
  vazio: string;
  nomeEmpresa: (id: string | null) => string;
  onEditar: (e: EmpregadoCadastro) => void;
  onExcluir: (e: EmpregadoCadastro) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome completo</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Demissão</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {vazio}
                </TableCell>
              </TableRow>
            ) : (
              lista.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="whitespace-nowrap">{e.cpf}</TableCell>
                  <TableCell>{e.matricula ?? "—"}</TableCell>
                  <TableCell>{nomeEmpresa(e.empresa_id)}</TableCell>
                  <TableCell>{e.email || "—"}</TableCell>
                  <TableCell>{formatarData(e.data_admissao)}</TableCell>
                  <TableCell>{formatarData(e.data_demissao)}</TableCell>
                  <TableCell>
                    <Badge variant={empregadoAtivo(e) ? "secondary" : "outline"}>
                      {empregadoAtivo(e) ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button requiresWrite variant="ghost" size="sm" onClick={() => onEditar(e)}>
                      Editar
                    </Button>
                    <Button requiresWrite variant="ghost" size="sm" onClick={() => onExcluir(e)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
