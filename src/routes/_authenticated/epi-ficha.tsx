import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CampoBusca, type OpcaoBusca } from "@/components/CampoBusca";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { NovoTamanhoRapido } from "@/components/parametros/NovoTamanhoRapido";
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
import { useAccess } from "@/lib/access-context";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import {
  CAMPOS_FICHA,
  fichaVazia,
  removerFicha,
  moverFicha,
  salvarFicha,
  type ConteudoFicha,
} from "@/lib/fichas-epi";
import { rotuloEpiFicha, tamanhoDoEpi } from "@/lib/ficha-epi-rotulo";
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
  tamanhos_selecionados?: string[] | null;
  tamanho?: string | null;
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
  const { isAdmin } = useAccess();
  const { data: todos = [], isLoading } = useEpis();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [tamanhoAberto, setTamanhoAberto] = useState(false);
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

  // Só aparecem os EPIs que ainda não têm ficha, mais o da ficha que está sendo editada.
  // O EPI já escolhido (ex.: vindo do Cadastro de EPI) aparece mesmo fora do filtro de empresa.
  const opcoesEpi: OpcaoBusca[] = todos
    .filter((e) => e.id === epiSel || e.id === editandoId || (epis.includes(e) && !fichas.some((f) => f.epiId === e.id)))
    .map((e) => ({
      valor: e.id,
      rotulo: rotuloEpiFicha(e, parametros),
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

  // Clonar: copia só o texto da ficha para uma ficha NOVA; o EPI fica em branco e precisa ser
  // escolhido entre os que ainda não têm ficha (a ficha é identificada pelo EPI).
  function clonar(epiId: string) {
    const ficha = fichas.find((f) => f.epiId === epiId);
    if (!ficha) return;
    const conteudoCopiado = fichaVazia();
    for (const campo of CAMPOS_FICHA) conteudoCopiado[campo.chave] = ficha[campo.chave];
    setEditandoId(null);
    setEpiSel("");
    setConteudo(conteudoCopiado);
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
    const salvou = executar(
      () => (editandoId ? moverFicha(editandoId, epiSel, conteudo) : salvarFicha(epiSel, conteudo)),
      "Ficha de EPI salva",
    );
    if (salvou) setAberto(false);
  }

  const epiAberto = epiPorId(epiSel);
  // Sem tamanho no EPI escolhido, ou nenhum tamanho em Gerais: oferece cadastrar sem sair da tela.
  const faltaTamanho =
    (parametros.tamanhos.length === 0 || (!!epiAberto && !tamanhoDoEpi(epiAberto, parametros)));

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
                    <AcoesLinha
                      rotulo={`ficha de ${epi.codigo_sku}`}
                      onClonar={() => clonar(ficha.epiId)}
                      onEditar={() => abrir(ficha.epiId)}
                      editarLivre
                      onExcluir={() => {
                        if (confirm(`Excluir a ficha de ${epi.codigo_sku}?`))
                          executar(() => removerFicha(ficha.epiId), "Ficha excluída");
                      }}
                    />
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
              <CampoBusca
                id="ficha-epi"
                opcoes={opcoesEpi}
                valor={epiSel}
                onChange={setEpiSel}
                placeholder="Buscar por palavra-chave ou código (ex.: EPI-0001)"
                vazio="Nenhum EPI sem ficha encontrado."
              />
              {faltaTamanho && (
                <p className="text-xs text-muted-foreground">
                  {parametros.tamanhos.length === 0
                    ? "Nenhum tamanho cadastrado."
                    : "Este EPI não tem tamanho cadastrado."}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline underline-offset-2"
                    onClick={() => setTamanhoAberto(true)}
                  >
                    Cadastrar tamanho
                  </button>
                </p>
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

      <Dialog open={tamanhoAberto} onOpenChange={setTamanhoAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar tamanho</DialogTitle>
            <DialogDescription>
              Os tamanhos ficam em Parâmetros &gt; Gerais. Para um EPI em um tamanho novo, use Clonar em
              Cadastrar EPI.
            </DialogDescription>
          </DialogHeader>
          {isAdmin ? (
            <NovoTamanhoRapido />
          ) : (
            <p className="text-sm text-muted-foreground">
              Só o Administrador cadastra tamanhos. Peça a ele para cadastrar.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTamanhoAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
