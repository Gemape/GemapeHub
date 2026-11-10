import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import {
  controleDaFerramenta,
  disponivelNaCaixa,
  linhaCsvCaixa,
  movimentacoesDaCaixa,
  ocorrenciasDaCaixa,
} from "@/lib/controle-caixa";
import {
  DialogBaixaCaixa,
  DialogFerramentasDaCaixa,
  DialogOcorrenciaCaixa,
  DialogTransferirCaixa,
  type CaixaNova,
  type LinhaCaixa,
} from "./CaixaGestaoDialogs";
import { naturezaMovimentacao } from "@/lib/historico-movimentacoes";
import { Download } from "lucide-react";
import { caixasHabilitadas, codigoCaixa, numerosDisponiveis } from "@/lib/caixas-habilitadas";
import { empresaPadraoParaEscolha } from "@/lib/empresas";
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
  useOcorrencias,
  type CaixaFerramenta,
  type Movimentacao,
} from "@/lib/hooks-gemape";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FerramentasCaixasModulo() {
  const { empresaId } = useEmpresa();
  const [buscaCaixa, setBuscaCaixa] = useState("");

  const { data: todasAsCaixas = [], isLoading } = useCaixasFerramentas(empresaId, buscaCaixa);
  // Só caixas habilitadas em Caixas de Ferramentas > Habilitar caixas.
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const caixas = caixasHabilitadas(todasAsCaixas, habilitadas);
  // Caixas habilitadas que ainda não têm cadastro: o botão Vincular ferramentas cria a caixa.
  // Os números são uma sequência só para as três empresas: o que já existe em qualquer empresa não fica livre.
  const { data: caixasDeTodas = [], isSuccess: todasCarregadas } = useCaixasFerramentas(TODAS, "");
  // Só calcula depois que a lista de todas as empresas chegou: com ela vazia, todo número pareceria livre e daria para criar uma caixa repetida.
  const semCadastro = (todasCarregadas ? numerosDisponiveis(habilitadas, caixasDeTodas) : []).filter((n) =>
    codigoCaixa(n).toLowerCase().includes(buscaCaixa.trim().toLowerCase()),
  );
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
      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input
            aria-label="Filtrar por número da caixa"
            placeholder="Filtrar por número da caixa..."
            value={buscaCaixa}
            onChange={(e) => setBuscaCaixa(e.target.value)}
          />
        </BarraDeFiltros>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : caixas.length === 0 && semCadastro.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma caixa encontrada com os filtros aplicados.
          </div>
        ) : (
          caixas.map((caixa) => (
            <CaixaItem
              key={caixa.id}
              caixa={caixa}
              destinos={caixas}
              novas={semCadastro}
              empresas={empresas}
              portador={portadorAtivo(portadores, caixa.id)?.empregado_nome}
              movimentacoes={movimentacoes}
              nomeEmpregado={nomeEmpregado}
            />
          ))
        )}
        {!isLoading &&
          semCadastro.map((numero) => (
            <CaixaSemCadastro key={numero} numero={numero} empresaId={empresaPadraoParaEscolha(empresas, empresaId)} />
          ))}
      </div>
    </div>
  );
}

function CaixaSemCadastro({ numero, empresaId }: { numero: number; empresaId: string }) {
  const [aberto, setAberto] = useState(false);
  const codigo = codigoCaixa(numero);
  const caixa: CaixaNova = {
    codigo,
    codigo_num: numero,
    empresa_id: empresaId || null,
    // A caixa só tem o número como identificação; o nome do banco repete o código.
    nome: codigo,
    descricao: null,
    localizacao: null,
    status: "Ativa",
  };
  return (
    <section className="panel space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-8 w-1 bg-muted-foreground/40 rounded-full" />
        <h3 className="text-lg font-black uppercase tracking-tight">{codigo}</h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">sem ferramentas vinculadas</span>
        <Button requiresWrite="operar" size="sm" disabled={!empresaId} onClick={() => setAberto(true)}>
          Vincular ferramentas
        </Button>
      </div>
      {aberto && <DialogFerramentasDaCaixa caixa={caixa} aberto aoFechar={() => setAberto(false)} itensAtuais={[]} comEmpregado={() => 0} />}
    </section>
  );
}

function CaixaItem({
  caixa,
  destinos,
  novas,
  empresas,
  portador,
  movimentacoes,
  nomeEmpregado,
}: {
  caixa: CaixaFerramenta;
  destinos: CaixaFerramenta[];
  novas: number[];
  empresas: { id: string; nome_fantasia: string }[];
  portador: string | undefined;
  movimentacoes: Movimentacao[];
  nomeEmpregado: (id: string | null) => string;
}) {
  const { data: itens = [], isLoading } = useCaixaItens(caixa.id);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [ocorrenciasAberto, setOcorrenciasAberto] = useState(false);
  const [dialogo, setDialogo] = useState<"ferramentas" | "baixa" | "transferencia" | "ocorrencia" | null>(null);
  const { data: todasOcorrencias = [] } = useOcorrencias("", "ferramenta");
  const ferramentas = itens.flatMap((ci) => (ci.ferramenta ? [ci.ferramenta] : []));
  // O histórico também mostra ferramentas que já saíram da caixa (transferidas ou retiradas).
  const { data: cadastroFerramentas = [] } = useItens("ferramenta", TODAS);
  const historico = movimentacoesDaCaixa(movimentacoes, caixa.id, ferramentas.map((f) => f.id), caixa.codigo);
  const ocorrencias = ocorrenciasDaCaixa(todasOcorrencias, caixa.id, ferramentas.map((f) => f.id));
  const linhas: LinhaCaixa[] = itens.flatMap((ci) => {
    if (!ci.ferramenta) return [];
    const c = controleDaFerramenta(historico, ci.ferramenta_id);
    return [{ ferramenta: ci.ferramenta, quantidade: ci.quantidade, comEmpregado: c.comEmpregado, disponivel: disponivelNaCaixa(ci.quantidade, c.comEmpregado, c.baixado + c.baixadoDaCaixa) }];
  });
  const comEmpregadoDe = (id: string) => controleDaFerramenta(historico, id).comEmpregado;

  return (
    <section className="panel space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-1 bg-primary rounded-full" />
          <h3 className="text-lg font-black uppercase tracking-tight">{caixa.codigo}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
          {portador && <span className="text-xs font-medium text-muted-foreground ml-2">Portador: {portador}</span>}
        </div>
        {/* Ações e relatórios ao lado do portador, duas colunas no celular e três a partir de sm; os relatórios abrem em janela. */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <Button requiresWrite="operar" size="sm" className="h-auto min-h-8 min-w-0 px-2 py-1 leading-tight sm:min-h-7" disabled={isLoading} onClick={() => setDialogo("ferramentas")}>
            Vincular ferramentas
          </Button>
          <Button requiresWrite="operar" variant="outline" size="sm" className="h-auto min-h-8 min-w-0 px-2 py-1 leading-tight sm:min-h-7" disabled={linhas.length === 0} onClick={() => setDialogo("baixa")}>
            Dar baixa
          </Button>
          <Button requiresWrite="operar" variant="outline" size="sm" className="h-auto min-h-8 min-w-0 px-2 py-1 leading-tight sm:min-h-7" disabled={linhas.length === 0 || destinos.filter((d) => d.id !== caixa.id).length + novas.length === 0} onClick={() => setDialogo("transferencia")}>
            Transferir
          </Button>
          <Button requiresWrite="operar" variant="outline" size="sm" className="h-auto min-h-8 min-w-0 px-2 py-1 leading-tight sm:min-h-7" disabled={linhas.length === 0} onClick={() => setDialogo("ocorrencia")}>
            Registrar ocorrência
          </Button>
          <Button variant="outline" size="sm" className="h-auto min-h-8 min-w-0 px-2 py-1 leading-tight sm:min-h-7" onClick={() => setHistoricoAberto(true)}>
            Histórico de movimentações ({historico.length})
          </Button>
          <Button variant="outline" size="sm" className="h-auto min-h-8 min-w-0 px-2 py-1 leading-tight sm:min-h-7" onClick={() => setOcorrenciasAberto(true)}>
            Ocorrências da caixa ({ocorrencias.length})
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Qtd na caixa</TableHead>
              <TableHead>Com empregado</TableHead>
              <TableHead>Baixado</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Carregando itens...
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Caixa vazia.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((ci) => {
                const controle = controleDaFerramenta(historico, ci.ferramenta_id);
                const comEmpregado = controle.comEmpregado;
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
                  <TableCell>{controle.baixado + controle.baixadoDaCaixa}</TableCell>
                  <TableCell className="font-semibold">{disponivelNaCaixa(ci.quantidade, comEmpregado, controle.baixado + controle.baixadoDaCaixa)}</TableCell>
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

      <JanelaRelatorio
        aberto={historicoAberto}
        aoMudar={setHistoricoAberto}
        titulo={`Histórico de movimentações da caixa ${caixa.codigo}`}
        descricao="Entregas, devoluções, baixas e transferências das ferramentas desta caixa."
        acao={
          historico.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportarCsv(
                  `historico-${caixa.codigo}`,
                  historico.map((m) => linhaCsvCaixa(m, { caixa: caixa.codigo, ferramentas: cadastroFerramentas, nomeEmpregado })),
                )
              }
            >
              <Download className="mr-1 size-4" />
              Exportar
            </Button>
          )
        }
      >
        {historicoAberto && (
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
                  const ferramenta = cadastroFerramentas.find((f) => f.id === m.item_id);
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
        )}
      </JanelaRelatorio>

      <JanelaRelatorio
        aberto={ocorrenciasAberto}
        aoMudar={setOcorrenciasAberto}
        titulo={`Ocorrências da caixa ${caixa.codigo}`}
        descricao="Ocorrências registradas para as ferramentas desta caixa."
      >
        {ocorrenciasAberto && (
<Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Ferramenta</TableHead>
                <TableHead>Empregado</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ocorrencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma ocorrência desta caixa.
                  </TableCell>
                </TableRow>
              ) : (
                ocorrencias.map((o) => {
                  const ferramenta = cadastroFerramentas.find((f) => f.id === o.item_id);
                  return (
                    <TableRow key={o.id}>
                      <TableCell>{formatarData(o.data)}</TableCell>
                      <TableCell>{o.hora.slice(0, 5)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{ferramenta?.codigo_sku}</span> {ferramenta?.nome}
                      </TableCell>
                      <TableCell>{nomeEmpregado(o.empregado_id)}</TableCell>
                      <TableCell>{o.responsavel_registro}</TableCell>
                      <TableCell className="max-w-xs">{o.descricao_ocorrencia}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </JanelaRelatorio>

      {dialogo === "ferramentas" && (
        <DialogFerramentasDaCaixa caixa={caixa} aberto aoFechar={() => setDialogo(null)} itensAtuais={itens} comEmpregado={comEmpregadoDe} />
      )}
      {dialogo === "baixa" && <DialogBaixaCaixa caixa={caixa} aberto aoFechar={() => setDialogo(null)} linhas={linhas} historico={historico} />}
      {dialogo === "transferencia" && (
        <DialogTransferirCaixa caixa={caixa} aberto aoFechar={() => setDialogo(null)} linhas={linhas} destinos={destinos} novas={novas} />
      )}
      {dialogo === "ocorrencia" && <DialogOcorrenciaCaixa caixa={caixa} aberto aoFechar={() => setDialogo(null)} linhas={linhas} />}
    </section>
  );
}

// Janela dos relatórios da caixa (histórico e ocorrências): título, descrição, ação opcional e a tabela.
function JanelaRelatorio({
  aberto,
  aoMudar,
  titulo,
  descricao,
  acao,
  children,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        {acao && <div className="flex justify-end">{acao}</div>}
        <div className="overflow-x-auto rounded-md border">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
