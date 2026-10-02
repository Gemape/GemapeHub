import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CampoBusca, type OpcaoBusca } from "@/components/CampoBusca";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import {
  CAMPOS_FICHA,
  fichaVazia,
  removerFicha,
  salvarFicha,
  type ConteudoFicha,
} from "@/lib/fichas-epi";
import { combinaBusca } from "@/lib/parametros-base";
import { useFichasEpi } from "@/lib/use-fichas-epi";
import { nomeSubcategoria } from "@/lib/subcategoria-referencia";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

type EpiResumo = {
  id: string;
  codigo_sku: string;
  nome: string;
  categoria: string | null;
  subcategoria_id?: string | null;
  empresa_id: string | null;
};

export const Route = createFileRoute("/_authenticated/epi-ficha")({
  head: () => ({ meta: [{ title: "Cadastrar Ficha de EPI | Patrimônio GEMAPE" }] }),
  validateSearch: (search: Record<string, unknown>): { epi?: string } =>
    typeof search["epi"] === "string" && search["epi"] ? { epi: search["epi"] } : {},
  component: FichaEpiPagina,
});

function useEpis() {
  return useQuery({
    queryKey: ["epis", "resumo-fichas"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("epis").select("*").order("codigo_sku");
      if (error) throw error;
      return (data ?? []) as EpiResumo[];
    },
  });
}

function FichaEpiPagina() {
  const { epi: epiDaUrl } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { empresas, empresaId } = useEmpresa();
  const fichas = useFichasEpi();
  const parametros = useParametrosBase();
  const { data: todos = [], isLoading } = useEpis();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [epiSel, setEpiSel] = useState("");
  const [conteudo, setConteudo] = useState<ConteudoFicha>(fichaVazia);

  const epis = todos.filter((e) => empresaId === TODAS || e.empresa_id === empresaId);
  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
  const epiPorId = (id: string) => todos.find((e) => e.id === id);

  const linhas = fichas
    .map((f) => ({ ficha: f, epi: epiPorId(f.epiId) }))
    .filter(
      (l): l is { ficha: typeof l.ficha; epi: EpiResumo } =>
        !!l.epi && (empresaId === TODAS || l.epi.empresa_id === empresaId),
    )
    .filter((l) => combinaBusca(busca, l.epi.codigo_sku, l.epi.nome, l.ficha.setores))
    .sort((a, b) => a.epi.codigo_sku.localeCompare(b.epi.codigo_sku));

  // Na ficha nova, só aparecem os EPIs que ainda não têm ficha.
  // O EPI já escolhido (ex.: vindo do Cadastro de EPI) aparece mesmo fora do filtro de empresa.
  const opcoesEpi: OpcaoBusca[] = todos
    .filter((e) => e.id === epiSel || (epis.includes(e) && !fichas.some((f) => f.epiId === e.id)))
    .map((e) => ({
      valor: e.id,
      rotulo: `${e.codigo_sku} · ${e.nome}`,
      // Subcategoria pela referência gravada (nome atual de Gerais).
      detalhe: [nomeSubcategoria(parametros, "cat-epi", e), nomeEmpresa(e.empresa_id)]
        .filter(Boolean)
        .join(" · "),
    }));

  function abrir(epiId: string | null) {
    const ficha = epiId ? fichas.find((f) => f.epiId === epiId) : undefined;
    setEditandoId(ficha ? ficha.epiId : null);
    setEpiSel(epiId ?? "");
    setConteudo(ficha ? { ...ficha } : fichaVazia());
    setAberto(true);
  }

  // Vindo do Cadastro de EPI (coluna Ficha), abre a ficha daquele EPI.
  useEffect(() => {
    if (!epiDaUrl || isLoading) return;
    if (epiPorId(epiDaUrl)) abrir(epiDaUrl);
    else toast.error("EPI não encontrado para abrir a ficha.");
    void navigate({ search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epiDaUrl, isLoading]);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (executar(() => salvarFicha(epiSel, conteudo), "Ficha de EPI salva")) setAberto(false);
  }

  const epiAberto = epiPorId(epiSel);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Parâmetros · EPI</p>
        <h1 className="text-2xl font-bold">Cadastrar Ficha de EPI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Orientações de uso de cada EPI: setores, riscos, uso, verificação, higienização, descarte
          e responsabilidades do empregado (NR6).
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por código, descrição ou setor"
          className="max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Button requiresWrite className="ml-auto" onClick={() => abrir(null)}>
          Nova ficha
        </Button>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>EPI</TableHead>
              <TableHead>Setores aplicáveis</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Atualizada em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma ficha cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              linhas.map(({ ficha, epi }) => (
                <TableRow key={ficha.epiId}>
                  <TableCell className="font-mono text-xs">{epi.codigo_sku}</TableCell>
                  <TableCell className="font-medium">{epi.nome}</TableCell>
                  <TableCell className="max-w-xs truncate">{ficha.setores}</TableCell>
                  <TableCell>{nomeEmpresa(epi.empresa_id)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ficha.atualizadaEm
                      ? new Date(ficha.atualizadaEm).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => abrir(ficha.epiId)}>
                      Abrir
                    </Button>
                    <Button
                      requiresWrite
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir a ficha de ${epi.codigo_sku}?`))
                          executar(() => removerFicha(ficha.epiId), "Ficha excluída");
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editandoId && epiAberto ? `Ficha de ${epiAberto.codigo_sku}` : "Nova ficha de EPI"}
            </DialogTitle>
            <DialogDescription>Todos os campos são obrigatórios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="grid gap-4">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="ficha-epi">EPI</Label>
              {editandoId && epiAberto ? (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {epiAberto.codigo_sku} · {epiAberto.nome}
                </p>
              ) : (
                <CampoBusca
                  id="ficha-epi"
                  opcoes={opcoesEpi}
                  valor={epiSel}
                  onChange={setEpiSel}
                  placeholder="Buscar por palavra-chave ou código (ex.: EPI-0001)"
                  vazio="Nenhum EPI sem ficha encontrado."
                />
              )}
            </div>
            {CAMPOS_FICHA.map((campo) => (
              <div key={campo.chave} className="space-y-1.5">
                <Label htmlFor={`ficha-${campo.chave}`}>{campo.rotulo}</Label>
                <Textarea
                  id={`ficha-${campo.chave}`}
                  rows={campo.chave === "setores" ? 2 : 3}
                  aria-required
                  value={conteudo[campo.chave]}
                  onChange={(e) => setConteudo({ ...conteudo, [campo.chave]: e.target.value })}
                />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit">
                Salvar ficha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
