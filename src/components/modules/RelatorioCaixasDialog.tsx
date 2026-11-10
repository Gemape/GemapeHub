import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { naturezaMovimentacao } from "@/lib/historico-movimentacoes";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { controleDaFerramenta, disponivelNaCaixa, movimentacoesDaCaixa, ocorrenciasDaCaixa } from "@/lib/controle-caixa";
import { portadorAtivo } from "@/lib/portadores-caixa";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useCaixasFerramentas, useEmpregados, useEmpresas, useItens, useOcorrencias, useTodosCaixaItens } from "@/lib/hooks-gemape";
import { montarRelatorioCaixasHtml, SECOES_RELATORIO_CAIXAS, type CaixaParaRelatorio } from "@/lib/relatorio-caixas";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

const TODAS_AS_SECOES = SECOES_RELATORIO_CAIXAS.map((_, n) => n);

// Relatório de todas as caixas de ferramentas: a pessoa marca as seções e o relatório abre no visualizador, como os outros relatórios do sistema.
// Os dados são lidos só enquanto a janela está aberta.
export function RelatorioCaixasDialog({ aberto, aoMudar }: { aberto: boolean; aoMudar: (aberto: boolean) => void }) {
  const { empresaId } = useEmpresa();
  const [marcadas, setMarcadas] = useState<number[]>(TODAS_AS_SECOES);
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const caixasQuery = useCaixasFerramentas(empresaId, "");
  const itensQuery = useTodosCaixaItens();
  const ferramentasQuery = useItens("ferramenta", TODAS);
  const ocorrenciasQuery = useOcorrencias("", "ferramenta");
  const movimentosQuery = useQuery({
    queryKey: ["movimentacoes", "ferramenta", "caixas", empresaId],
    queryFn: () => lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaId === TODAS ? undefined : empresaId }),
  });
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(TODAS);
  const portadores = usePortadoresCaixa();
  const pronto = [caixasQuery, itensQuery, ferramentasQuery, ocorrenciasQuery, movimentosQuery].every((q) => q.isSuccess);

  function gerar() {
    const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";
    const nomeEmpresa = (id: string | null | undefined) => empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";
    const ferramentas = ferramentasQuery.data ?? [];
    const movimentos = movimentosQuery.data ?? [];
    const caixas: CaixaParaRelatorio[] = caixasHabilitadas(caixasQuery.data ?? [], habilitadas).map((caixa) => {
      const itens = (itensQuery.data ?? []).filter((i) => i.caixa_id === caixa.id);
      const ids = itens.map((i) => i.ferramenta_id);
      const historico = movimentacoesDaCaixa(movimentos, caixa.id, ids, caixa.codigo);
      const doItem = (id: string | null) => ferramentas.find((f) => f.id === id);
      const rotuloFerramenta = (id: string | null) => {
        const f = doItem(id);
        return f ? `${f.codigo_sku} ${f.nome}` : "—";
      };
      return {
        codigo: caixa.codigo,
        empresa: nomeEmpresa(caixa.empresa_id),
        portador: portadorAtivo(portadores, caixa.id)?.empregado_nome ?? "",
        ferramentas: itens.flatMap((i) => {
          const f = doItem(i.ferramenta_id);
          if (!f) return [];
          const c = controleDaFerramenta(historico, i.ferramenta_id);
          const baixado = c.baixado + c.baixadoDaCaixa;
          return [{
            codigo: f.codigo_sku, nome: f.nome, marcaModelo: [f.marca, f.modelo].filter(Boolean).join(" / ") || "—", empresa: nomeEmpresa(f.empresa_id),
            quantidade: i.quantidade, comEmpregado: c.comEmpregado, baixado, disponivel: disponivelNaCaixa(i.quantidade, c.comEmpregado, baixado), estado: f.status || "—",
          }];
        }),
        historico: historico.map((m) => ({
          data: formatarData(m.data_movimentacao), tipo: naturezaMovimentacao(m), ferramenta: rotuloFerramenta(m.item_id), quantidade: m.quantidade,
          empregado: nomeEmpregado(m.empregado_id), observacao: m.observacao ?? "",
        })),
        ocorrencias: ocorrenciasDaCaixa(ocorrenciasQuery.data ?? [], caixa.id, ids).map((o) => ({
          data: formatarData(o.data), hora: o.hora.slice(0, 5), ferramenta: rotuloFerramenta(o.item_id), empregado: nomeEmpregado(o.empregado_id),
          responsavel: o.responsavel_registro ?? "—", descricao: o.descricao_ocorrencia ?? "—",
        })),
      };
    });
    aoMudar(false);
    abrirDocumento({
      titulo: "Relatório de caixas de ferramentas",
      html: montarRelatorioCaixasHtml({ caixas, secoes: marcadas, empresa: empresaId === TODAS ? "Todas as empresas" : nomeEmpresa(empresaId) }),
      arquivo: nomeArquivoDocumento("Relatório de caixas de ferramentas"),
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Relatório das caixas de ferramentas</DialogTitle>
          <DialogDescription>Marque o que entra no relatório de todas as caixas. O resumo geral (caixas, ferramentas, com empregado, baixado, disponível e ocorrências) sai sempre.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas(TODAS_AS_SECOES)}>Marcar todos</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setMarcadas([])}>Desmarcar todos</Button>
          <span className="ml-auto text-xs text-muted-foreground">{marcadas.length} de {SECOES_RELATORIO_CAIXAS.length} seções</span>
        </div>
        <ul className="space-y-1.5" aria-label="Seções do relatório">
          {SECOES_RELATORIO_CAIXAS.map((titulo, n) => (
            <li key={titulo}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                <Checkbox checked={marcadas.includes(n)} onCheckedChange={(v) => setMarcadas((m) => (v === true ? [...m.filter((x) => x !== n), n].sort((a, b) => a - b) : m.filter((x) => x !== n)))} />
                {titulo}
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => aoMudar(false)}>Cancelar</Button>
          <Button type="button" disabled={!pronto} onClick={gerar}>{pronto ? "Gerar relatório" : "Carregando..."}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
