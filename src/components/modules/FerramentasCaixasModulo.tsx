import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { controleDaFerramenta, disponivelNaCaixa, linhaCsvCaixa, movimentacoesDaCaixa } from "@/lib/controle-caixa";
import { naturezaMovimentacao } from "@/lib/historico-movimentacoes";
import { ChevronDown, Download } from "lucide-react";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { portadorAtivo } from "@/lib/portadores-caixa";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, formatarData } from "@/lib/gemape";
import {
  useItens,
  useEmpresas,
  useEmpregados,
  useCaixasFerramentas,
  useCaixaItens,
  type CaixaFerramenta,
  type Movimentacao,
} from "@/lib/hooks-gemape";
import { Button } from "@/components/ui/button";

export function FerramentasCaixasModulo() {
  const { empresaId } = useEmpresa();
  const [buscaCaixa, setBuscaCaixa] = useState("");

  const { data: todasAsCaixas = [], isLoading } = useCaixasFerramentas(empresaId, buscaCaixa);
  // Só caixas habilitadas em Caixas de Ferramentas > Habilitar caixas.
  const caixas = caixasHabilitadas(todasAsCaixas, useParametrosBase().caixasHabilitadas);
  const portadores = usePortadoresCaixa();
  const { data: empresas = [] } = useEmpresas();
  // Histórico inteiro das ferramentas da empresa, lido uma vez e repartido entre as caixas.
  const { data: movimentacoes = [] } = useQuery({
    queryKey: ["movimentacoes", "ferramenta", "caixas", empresaId],
    queryFn: () =>
      lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaId === TODAS ? undefined : empresaId }),
  });
  // O histórico mostra também quem já foi demitido.
  const { data: empregados = [] } = useEmpregados(TODAS);
  const nomeEmpregado = (id: string | null) => empregados.find((e) => e.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filtrar por nome ou código da caixa..."
          className="max-w-xs"
          value={buscaCaixa}
          onChange={(e) => setBuscaCaixa(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : caixas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma caixa encontrada com os filtros aplicados.
          </div>
        ) : (
          caixas.map((caixa) => (
            <CaixaItem
              key={caixa.id}
              caixa={caixa}
              empresas={empresas}
              portador={portadorAtivo(portadores, caixa.id)?.empregado_nome}
              movimentacoes={movimentacoes}
              nomeEmpregado={nomeEmpregado}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CaixaItem({
  caixa,
  empresas,
  portador,
  movimentacoes,
  nomeEmpregado,
}: {
  caixa: CaixaFerramenta;
  empresas: { id: string; nome_fantasia: string }[];
  portador: string | undefined;
  movimentacoes: Movimentacao[];
  nomeEmpregado: (id: string | null) => string;
}) {
  const { data: itens = [], isLoading } = useCaixaItens(caixa.id);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const ferramentas = itens.flatMap((ci) => (ci.ferramenta ? [ci.ferramenta] : []));
  const historico = movimentacoesDaCaixa(movimentacoes, ferramentas.map((f) => f.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <h3 className="text-lg font-black uppercase tracking-tight">
          {caixa.codigo}: {caixa.nome}
        </h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {itens.length} {itens.length === 1 ? "item" : "itens"}
        </span>
        {portador && (
          <span className="text-xs font-medium text-muted-foreground ml-2">
            Portador: {portador}
          </span>
        )}
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Qtd na caixa</TableHead>
              <TableHead>Com empregado</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Carregando itens...
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Caixa vazia.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((ci) => {
                const comEmpregado = controleDaFerramenta(movimentacoes, ci.ferramenta_id).comEmpregado;
                return (
                <TableRow key={ci.id}>
                  <TableCell className="font-mono font-bold">{ci.ferramenta?.codigo_sku}</TableCell>
                  <TableCell>{ci.ferramenta?.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ci.ferramenta?.marca} {ci.ferramenta?.modelo && `/ ${ci.ferramenta.modelo}`}
                  </TableCell>
                  <TableCell>
                    {empresas.find((e) => e.id === ci.ferramenta?.empresa_id)?.nome_fantasia || "—"}
                  </TableCell>
                  <TableCell>{ci.quantidade}</TableCell>
                  <TableCell>{comEmpregado}</TableCell>
                  <TableCell className="font-semibold">{disponivelNaCaixa(ci.quantidade, comEmpregado)}</TableCell>
                  <TableCell>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ci.ferramenta?.status === "Ativo"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {ci.ferramenta?.status || "—"}
                    </span>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={historicoAberto}
          onClick={() => setHistoricoAberto(!historicoAberto)}
        >
          <ChevronDown className={`mr-1 size-4 transition-transform ${historicoAberto ? "" : "-rotate-90"}`} />
          Histórico de movimentações ({historico.length})
        </Button>
        {historicoAberto && historico.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarCsv(
                `historico-${caixa.codigo}`,
                historico.map((m) => linhaCsvCaixa(m, { caixa: caixa.codigo, ferramentas, nomeEmpregado })),
              )
            }
          >
            <Download className="mr-1 size-4" />
            Exportar
          </Button>
        )}
      </div>

      {historicoAberto && (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ferramenta</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Empregado</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma movimentação das ferramentas desta caixa.
                  </TableCell>
                </TableRow>
              ) : (
                historico.map((m) => {
                  const ferramenta = ferramentas.find((f) => f.id === m.item_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                      <TableCell>{naturezaMovimentacao(m)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{ferramenta?.codigo_sku}</span> {ferramenta?.nome}
                      </TableCell>
                      <TableCell>{m.quantidade}</TableCell>
                      <TableCell>{nomeEmpregado(m.empregado_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{m.observacao || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
