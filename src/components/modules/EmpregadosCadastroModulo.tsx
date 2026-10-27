import { useEffect, useRef, useState } from "react";
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
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { empregadoAtivo, mascararCpf, prepararEmpregado, separarEmpregados } from "@/lib/empregados";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { useEmpregados, useExcluir, useSalvar, type Empregado } from "@/lib/hooks-gemape";
import { lerTodas } from "@/lib/ler-todas";
import { ehExemplo } from "@/lib/dados-teste/exemplo-id";
import { exemploEmpregado } from "@/lib/dados-teste/exemplos";

// O e-mail ainda não existe na tabela real de empregados: nesta fase só é gravado no
// modo demonstração. A coluna entra na Fase 2.
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

type EmpregadoCadastro = Empregado & { email?: string | null };


export function EmpregadosCadastroModulo({ direto = false, aoConcluir }: { direto?: boolean; aoConcluir?: () => void } = {}) {
  const { empresas, empresaId } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<EmpregadoCadastro | null>(null);
  // Clonar: dados do empregado de origem num cadastro NOVO (todos os campos copiados, decisão 138).
  const [modelo, setModelo] = useState<EmpregadoCadastro | null>(null);
  const base = editando ?? modelo;
  const [empresaSel, setEmpresaSel] = useState("");
  const salvando = useRef(false);
  // Aberto de dentro de uma associação de check list: já abre o formulário de novo cadastro e avisa quando ele fecha (salvou ou cancelou), para voltar à associação.
  const abriuDireto = useRef(false);
  useEffect(() => {
    if (direto && !abriuDireto.current) { abriuDireto.current = true; void abrirNovo(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const formularioVisto = useRef(false);
  useEffect(() => {
    if (!direto) return;
    if (aberto) formularioVisto.current = true;
    else if (formularioVisto.current) { formularioVisto.current = false; aoConcluir?.(); }
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: lista = [], isLoading } = useEmpregados(empresaId);
  const empregados = lista as EmpregadoCadastro[];
  const { ativos, inativos } = separarEmpregados(empregados);
  const empresaPadrao = empresaPadraoParaEscolha(empresas, empresaId);
  // Empregado antigo sem empresa: a empresa precisa ser escolhida, não é preenchida sozinha.
  const empresaForm = empresaSel || (base ? "" : empresaPadrao);
  const salvar = useSalvar("empregados", ["empregados", "empregados-total"]);
  const excluir = useExcluir("empregados", ["empregados", "empregados-total"]);

  function abrir(empregado: EmpregadoCadastro | null, clonar = false) {
    salvando.current = false;
    setEditando(clonar ? null : empregado);
    setModelo(clonar ? empregado : null);
    setEmpresaSel(empregado?.empresa_id ?? "");
    setAberto(true);
  }

  // Demonstração (2.8): o cadastro novo abre já preenchido com um empregado fictício; CPF e matrícula saem diferentes dos de todas as empresas.
  async function abrirNovo() {
    if (import.meta.env.VITE_DEMO_MODE !== "false") {
      let todos: { cpf?: string | null; matricula?: string | null }[] = empregados;
      try { todos = await lerTodas(() => supabase.from("empregados").select("id,cpf,matricula"), (q) => q.order("id")); } catch { /* fica com a lista da tela */ }
      return abrir(exemploEmpregado(todos, empresaPadrao) as EmpregadoCadastro, true);
    }
    abrir(null);
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
      let todos: { id: string; cpf: string | null; matricula: string | null }[];
      try {
        todos = await lerTodas(() => supabase.from("empregados").select("id,cpf,matricula"), (q) => q.order("id"));
      } catch {
        throw new Error("Não foi possível conferir CPF e matrícula. Tente de novo.");
      }
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
          <Button requiresWrite onClick={() => void abrirNovo()}>
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
            onClonar={(e) => abrir(e, true)}
            onEditar={(e) => abrir(e)}
            onExcluir={(e) => {
              if (confirm(`Excluir ${e.nome}?`)) excluir.mutate(e.id);
            }}
          />
          <BlocoEmpregados
            titulo={`Demitidos / inativos (${inativos.length})`}
            lista={inativos}
            vazio="Nenhum empregado inativo."
            nomeEmpresa={nomeEmpresa}
            onClonar={(e) => abrir(e, true)}
            onEditar={(e) => abrir(e)}
            onExcluir={(e) => {
              if (confirm(`Excluir ${e.nome}?`)) excluir.mutate(e.id);
            }}
          />
        </>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empregado" : modelo && !ehExemplo(modelo) ? "Clonar empregado" : "Novo empregado"}</DialogTitle>
            <DialogDescription>Dados do empregado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void enviar(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" capitalizar="nome" aria-required defaultValue={base?.nome ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                aria-required
                inputMode="numeric"
                placeholder="xxx.xxx.xxx-xx"
                onChange={(ev) => {
                  ev.target.value = mascararCpf(ev.target.value);
                }}
                defaultValue={base?.cpf ? (base.cpf.replace(/\D/g, "").length > 11 ? base.cpf : mascararCpf(base.cpf)) : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select value={empresaForm} onValueChange={setEmpresaSel}>
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParaEscolha(empresas, [base?.empresa_id]).map((e) => (
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
                defaultValue={base?.matricula ?? ""}
              />
            </div>
            {MODO_DEMO && (
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={base?.email ?? ""} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="data_admissao">Data de admissão</Label>
              <Input
                id="data_admissao"
                name="data_admissao"
                type="date"
                defaultValue={base?.data_admissao ?? ""}
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
  onClonar,
  onEditar,
  onExcluir,
}: {
  titulo: string;
  lista: EmpregadoCadastro[];
  vazio: string;
  nomeEmpresa: (id: string | null) => string;
  onClonar: (e: EmpregadoCadastro) => void;
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
                    <AcoesLinha rotulo={e.nome} onClonar={() => onClonar(e)} onEditar={() => onEditar(e)} onExcluir={() => onExcluir(e)} />
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
