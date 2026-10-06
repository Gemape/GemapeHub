import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hojeLocal } from "@/lib/empregados";
import { historicoAbastecimentos, kmAtualDoVeiculo, mediaKmPorLitro, sugestoesPreventivas, type StatusSugestao } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { useMovimentacoes, useOcorrencias, type Veiculo } from "@/lib/hooks-gemape";
import { useAbastecimentos, useManutencoesVeiculo, useOcorrenciasVeiculo, usePlanosVeiculo } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { useEmpresa } from "@/lib/empresa-context";
import { MODO_DEMO } from "@/lib/modo-demo";

const ESTADO: Record<StatusSugestao, { rotulo: string; classe: string }> = {
  vencida: { rotulo: "🔴 Vencida", classe: "text-destructive font-medium" },
  atencao: { rotulo: "🟡 Atenção", classe: "text-amber-600 font-medium" },
  em_dia: { rotulo: "🟢 Em dia", classe: "text-emerald-600" },
  sem_registro: { rotulo: "⚪ Sem registro", classe: "text-muted-foreground" },
};

const numero = (n: number) => n.toLocaleString("pt-BR");

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

function Vazio({ colunas, texto }: { colunas: number; texto: string }) {
  return <TableRow><TableCell colSpan={colunas} className="py-4 text-center text-muted-foreground">{texto}</TableCell></TableRow>;
}

// Extrato do veículo (decisão 57): abastecimentos e média km/L, ocorrências, manutenções
// realizadas (preventivas e corretivas) e as preventivas sugeridas pelo plano, com as vencidas
// sinalizadas. Só leitura.
export function ExtratoVeiculo({ veiculo, onFechar }: { veiculo: Veiculo | null; onFechar: () => void }) {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const { data: movimentacoes = [] } = useMovimentacoes("veiculo", empresaId);
  const { data: ocorrencias = [] } = useOcorrencias("", "veiculo");
  const ocorrenciasNovas = useOcorrenciasVeiculo();

  if (!veiculo) return <Dialog open={false} onOpenChange={onFechar}><DialogContent aria-describedby={undefined} /></Dialog>;

  const dele = <T extends { veiculoId: string }>(l: T[]) => l.filter((x) => x.veiculoId === veiculo.id);
  const abast = historicoAbastecimentos(dele(abastecimentos));
  const manut = dele(manutencoes);
  const media = mediaKmPorLitro(abast);
  const kmAtual = kmAtualDoVeiculo(veiculo.quilometragem_atual, abast, manut);
  const hoje = hojeLocal();
  const sugestoes = sugestoesPreventivas({
    plano: planos.find((p) => p.veiculoId === veiculo.id) ?? null,
    acoes: parametros.acoesManutencaoVeiculo,
    manutencoes: manut,
    kmAtual,
    hoje,
  });
  const vencidas = sugestoes.filter((s) => s.status === "vencida").length;

  // Manutenções do extrato: as registradas na tela Manutenção e as marcadas em Movimentações.
  const nomeAcao = (id: string | null) => parametros.acoesManutencaoVeiculo.find((a) => a.id === id)?.nome;
  const linhasManutencao = [
    ...manut.map((m) => ({
      chave: m.id, data: m.data, km: m.km as number | null, tipo: m.tipo as string,
      servico: m.acaoId ? (nomeAcao(m.acaoId) ?? "Ação removida de Parâmetros") : m.descricao,
    })),
    ...movimentacoes
      .filter((m) => m.veiculo_id === veiculo.id && (m as { acao_manutencao?: string }).acao_manutencao)
      .map((m) => {
        const x = m as { acao_manutencao?: string; subitens_manutencao?: string[] };
        const subs = x.subitens_manutencao?.length ? `: ${x.subitens_manutencao.join(", ")}` : "";
        return { chave: m.id, data: m.data_movimentacao.slice(0, 10), km: null, tipo: "Movimentação", servico: `${x.acao_manutencao}${subs}` };
      }),
  ].sort((a, b) => b.data.localeCompare(a.data));
  // Em demonstração valem as ocorrências da tela nova (decisão 60); fora dela, as da tabela antiga.
  const ocorrenciasDoVeiculo = (MODO_DEMO
    ? ocorrenciasNovas.filter((o) => o.veiculoId === veiculo.id).map((o) => ({
        chave: o.id, data: o.ocorridoEm.slice(0, 10), descricao: `${o.codigo} · ${o.tipoNome}: ${o.descricao}`, situacao: o.status,
      }))
    : ocorrencias.filter((o) => o.veiculo_id === veiculo.id).map((o) => ({
        chave: o.id, data: o.data, descricao: o.descricao_ocorrencia, situacao: o.responsavel_registro,
      }))
  ).sort((a, b) => b.data.localeCompare(a.data));

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Extrato do veículo</DialogTitle>
          <DialogDescription>{rotuloDoVeiculo(parametros, veiculo)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Km atual</p><p className="text-lg font-semibold">{numero(kmAtual)}</p></div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Média de consumo</p>
            <p className="text-lg font-semibold">{media === null ? "—" : `${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L`}</p>
            {media === null && <p className="text-xs text-muted-foreground">Precisa de dois abastecimentos.</p>}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Preventivas vencidas</p>
            <p className={`text-lg font-semibold ${vencidas > 0 ? "text-destructive" : ""}`}>{vencidas}</p>
          </div>
        </div>

        <Secao titulo="Manutenções preventivas sugeridas">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead><TableHead>Periodicidade</TableHead><TableHead>Última vez</TableHead><TableHead>Próxima revisão</TableHead><TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sugestoes.length === 0 && <Vazio colunas={5} texto="Este veículo não tem plano de manutenções (Parâmetros > Veículos > Plano de manutenções)." />}
                {sugestoes.map((s) => (
                  <TableRow key={s.acaoId}>
                    <TableCell>{s.nome}</TableCell>
                    <TableCell>{numero(s.intervaloKm)} km ou {s.intervaloMeses} meses</TableCell>
                    <TableCell>{s.ultima ? `${numero(s.ultima.km)} km (${formatarData(s.ultima.data)})` : "—"}</TableCell>
                    <TableCell>{s.proximoKm !== null && s.proximaData ? `${numero(s.proximoKm)} km ou ${formatarData(s.proximaData)}` : "—"}</TableCell>
                    <TableCell className={ESTADO[s.status].classe}>{ESTADO[s.status].rotulo}{s.status !== "em_dia" && s.status !== "sem_registro" ? ` · ${s.motivo}` : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Secao>

        <Secao titulo="Manutenções realizadas">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Serviço</TableHead><TableHead className="text-right">Km</TableHead></TableRow></TableHeader>
              <TableBody>
                {linhasManutencao.length === 0 && <Vazio colunas={4} texto="Nenhuma manutenção registrada." />}
                {linhasManutencao.map((m) => (
                  <TableRow key={m.chave}>
                    <TableCell>{formatarData(m.data)}</TableCell>
                    <TableCell><Badge variant={m.tipo === "Preventiva" ? "secondary" : "outline"}>{m.tipo}</Badge></TableCell>
                    <TableCell>{m.servico}</TableCell>
                    <TableCell className="text-right">{m.km === null ? "—" : numero(m.km)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Secao>

        <Secao titulo="Histórico de abastecimentos">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Data e hora</TableHead><TableHead className="text-right">Km</TableHead><TableHead className="text-right">Km rodados</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Km/L</TableHead></TableRow></TableHeader>
              <TableBody>
                {abast.length === 0 && <Vazio colunas={6} texto="Nenhum abastecimento registrado." />}
                {abast.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{formatarData(a.data)}{a.hora ? ` ${a.hora}` : ""}</TableCell>
                    <TableCell className="text-right">{numero(a.km)}</TableCell>
                    <TableCell className="text-right">{a.kmRodados === null ? "—" : numero(a.kmRodados)}</TableCell>
                    <TableCell className="text-right">{a.litros.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{a.valor ? a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>
                    <TableCell className="text-right">{a.kmPorLitro === null ? "—" : a.kmPorLitro.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Secao>

        <Secao titulo="Ocorrências">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>{MODO_DEMO ? "Status" : "Responsável"}</TableHead></TableRow></TableHeader>
              <TableBody>
                {ocorrenciasDoVeiculo.length === 0 && <Vazio colunas={3} texto="Nenhuma ocorrência registrada." />}
                {ocorrenciasDoVeiculo.map((o) => (
                  <TableRow key={o.chave}>
                    <TableCell>{formatarData(o.data)}</TableCell>
                    <TableCell>{o.descricao}</TableCell>
                    <TableCell>{o.situacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Secao>
      </DialogContent>
    </Dialog>
  );
}
