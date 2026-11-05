import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { exportarCsv } from "@/lib/gemape";
import { CAMPOS_OS, dataDaOrdem, MAX_LINHA_OS, MAX_TEXTO_OS, ordemVazia, removerOrdem, salvarOrdem, type ConteudoOs, type OrdemServicoEpi } from "@/lib/ordens-servico-epi";
import { combinaBusca } from "@/lib/parametros-base";
import { useOrdensServicoEpi } from "@/lib/use-ordens-servico-epi";
import { executar } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/epi-ordem-servico")({
  // `voltar` (decisão 388): aberta pelo link da tela EPI > Ordem de Serviço, mostra o botão de volta, já abre o cadastro com a função do empregado (`funcao`) e, depois de salvar, volta
  // à tela com o empregado de antes (`empresa` e `empregado`) e a ordem recém-cadastrada.
  validateSearch: (search: Record<string, unknown>): { voltar?: "ordem-servico"; nova?: "sim"; empresa?: string; empregado?: string; funcao?: string } => ({
    ...(search["voltar"] === "ordem-servico" ? { voltar: "ordem-servico" as const } : {}),
    ...(search["nova"] === "sim" ? { nova: "sim" as const } : {}),
    ...(typeof search["empresa"] === "string" && search["empresa"] ? { empresa: search["empresa"] } : {}),
    ...(typeof search["empregado"] === "string" && search["empregado"] ? { empregado: search["empregado"] } : {}),
    ...(typeof search["funcao"] === "string" && search["funcao"] ? { funcao: search["funcao"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Cadastrar Ordem de Serviço | Patrimônio GEMAPE" }] }),
  component: OrdemServicoEpiPagina,
});

const textoDe = (o: OrdemServicoEpi) => CAMPOS_OS.map((c) => o[c.chave]).join(" ");

// Parâmetros > EPI > Cadastrar Ordem de Serviço: por função e setor, os riscos, os EPIs, as condutas proibidas e os treinamentos. Mesmo desenho do Cadastrar Ficha de EPI.
function OrdemServicoEpiPagina() {
  const { voltar, nova, empresa, empregado, funcao } = Route.useSearch();
  const navegar = useNavigate();
  const volta = (ordemId?: string) =>
    void navegar({ to: "/epi", search: { aba: "ordem-servico", ...(empresa ? { empresa } : {}), ...(empregado ? { empregado } : {}), ...(ordemId ? { ordem: ordemId } : {}) } });
  const ordens = useOrdensServicoEpi();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState<ConteudoOs>(ordemVazia);

  const linhas = ordens
    .filter((o) => combinaBusca(busca, textoDe(o)))
    .sort((a, b) => a.funcao.localeCompare(b.funcao, "pt-BR") || a.setor.localeCompare(b.setor, "pt-BR"));

  // Vindo do link da Ordem de Serviço do empregado, o cadastro já abre, com a função dele (uma vez só).
  useEffect(() => {
    if (nova === "sim") {
      setEditandoId(null);
      setConteudo({ ...ordemVazia(), ...(funcao ? { funcao } : {}) });
      setAberto(true);
      // Tira o "nova" do endereço: recarregar a página não abre a janela de novo.
      void navegar({ to: "/epi-ordem-servico", search: { voltar: "ordem-servico", ...(empresa ? { empresa } : {}), ...(empregado ? { empregado } : {}), ...(funcao ? { funcao } : {}) }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrir(ordem?: OrdemServicoEpi) {
    setEditandoId(ordem?.id ?? null);
    setConteudo(ordem ? { ...ordem } : ordemVazia());
    setAberto(true);
  }

  // Clonar: copia o texto para uma ordem NOVA; função e setor ficam em branco, porque a dupla não pode repetir.
  function clonar(ordem: OrdemServicoEpi) {
    const copia = { ...ordemVazia() };
    for (const campo of CAMPOS_OS) copia[campo.chave] = ordem[campo.chave];
    copia.funcao = "";
    copia.setor = "";
    setEditandoId(null);
    setConteudo(copia);
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    let salva: OrdemServicoEpi | undefined;
    const salvou = executar(() => { salva = salvarOrdem(conteudo, editandoId ? { id: editandoId } : {}); }, "Ordem de serviço salva");
    if (!salvou) return;
    setAberto(false);
    if (voltar === "ordem-servico") volta(salva?.id);
  }

  return (
    <div className="space-y-5">
      {voltar === "ordem-servico" && (
        <Button type="button" variant="outline" size="sm" onClick={() => volta()}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para Ordem de Serviço
        </Button>
      )}
      <header>
        <EyebrowDoCard fallback="Parâmetros" />
        <h1 className="text-2xl font-bold">Cadastrar Ordem de Serviço</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Por função e setor: objetivo, atividades, riscos ocupacionais, EPIs, condutas proibidas, procedimentos de segurança críticos e treinamentos e autorizações.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            aria-label="Buscar ordem de serviço"
            placeholder="Buscar por função, setor ou palavra-chave"
            className="max-w-xs"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </BarraDeFiltros>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={linhas.length === 0}
            onClick={() =>
              exportarCsv(
                "ordens-de-servico-epi",
                linhas.map((o) => ({
                  ...Object.fromEntries(CAMPOS_OS.map((c) => [c.rotulo, o[c.chave]])),
                  "Atualizada em": o.atualizadaEm ? dataDaOrdem(o.atualizadaEm) : "",
                })),
              )
            }
          >
            Exportar CSV
          </Button>
          <Button requiresWrite onClick={() => abrir()}>
            Nova ordem de serviço
          </Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Função</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Atualizada em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {ordens.length === 0 ? "Nenhuma ordem de serviço cadastrada." : "Nenhuma ordem de serviço encontrada para a busca."}
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.funcao}</TableCell>
                  <TableCell>{o.setor}</TableCell>
                  <TableCell className="max-w-md truncate" title={o.objetivo}>{o.objetivo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{dataDaOrdem(o.atualizadaEm)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <AcoesLinha
                      rotulo={`ordem de serviço de ${o.funcao}`}
                      onClonar={() => clonar(o)}
                      onEditar={() => abrir(o)}
                      editarLivre
                      onExcluir={() => {
                        if (confirm(`Excluir a ordem de serviço de ${o.funcao} (${o.setor})?`)) executar(() => removerOrdem(o.id), "Ordem de serviço excluída");
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar ordem de serviço" : "Nova ordem de serviço"}</DialogTitle>
            <DialogDescription>Todos os campos são obrigatórios. Nas listas, escreva um item por linha (por exemplo, começando com ●).</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {CAMPOS_OS.filter((c) => c.tipo === "linha").map((campo) => (
                <div key={campo.chave} className="space-y-1.5">
                  <Label htmlFor={`os-${campo.chave}`}>{campo.rotulo}</Label>
                  <Input
                    id={`os-${campo.chave}`}
                    aria-required
                    maxLength={MAX_LINHA_OS}
                    value={conteudo[campo.chave]}
                    onChange={(e) => setConteudo({ ...conteudo, [campo.chave]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {CAMPOS_OS.filter((c) => c.tipo !== "linha").map((campo) => (
              <div key={campo.chave} className="space-y-1.5">
                <Label htmlFor={`os-${campo.chave}`}>{campo.rotulo}</Label>
                <Textarea
                  id={`os-${campo.chave}`}
                  aria-required
                  rows={campo.tipo === "lista" ? 5 : 3}
                  maxLength={MAX_TEXTO_OS}
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
                Salvar ordem de serviço
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
