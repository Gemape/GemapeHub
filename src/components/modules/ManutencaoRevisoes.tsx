import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarraVidaUtil } from "@/components/BarraVidaUtil";
import type { StatusSugestao, Sugestao } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";
import { menorParte, parteRestante, parteRestanteEntreDatas } from "@/lib/vida-util";

export type RevisaoDoVeiculo = {
  veiculoId: string;
  veiculo: string;
  kmAtual: number;
  sugestao: Sugestao;
};

const COR: Record<StatusSugestao, { ponto: string; pilula: string }> = {
  vencida: {
    ponto: "bg-red-500",
    pilula:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  },
  atencao: {
    ponto: "bg-amber-400",
    pilula:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  em_dia: {
    ponto: "bg-emerald-500",
    pilula:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  sem_registro: {
    ponto: "bg-slate-400",
    pilula:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
};

const ROTULO: Record<StatusSugestao, string> = {
  vencida: "Vencida",
  atencao: "Vencimento próximo",
  em_dia: "Em dia",
  sem_registro: "Sem registro",
};

const medida = (n: number, un: string) => `${n.toLocaleString("pt-BR")} ${un}`;

// Lista das revisões do plano de cada veículo (decisão 319): serviço, periodicidade, última realizada, próxima revisão e situação (pílula colorida). A revisão vence pelo que vier primeiro, o km atual do veículo ou a data (por isso a situação diz o motivo
// e a próxima revisão mostra o km atual).
// Em Equipamentos, `unidade` é "h", `item` é "Equipamento", `medida` é "Horímetro" e `orientacao` aponta o cadastro do plano.
export function ManutencaoRevisoes({ revisoes, unidade = "km", item = "Veículo", medida: rotuloMedida = "Km", orientacao = "O plano de cada veículo fica em Parâmetros > Veículos." }: { revisoes: RevisaoDoVeiculo[]; unidade?: string; item?: string; medida?: string; orientacao?: string }) {
  const km = (n: number) => medida(n, unidade);
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[1200px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[19%]">{item}</TableHead>
            <TableHead className="w-[19%]">Serviço</TableHead>
            <TableHead className="w-[17%]">Periodicidade</TableHead>
            <TableHead className="w-[15%]">Última realizada</TableHead>
            <TableHead className="w-[15%]">Próxima revisão</TableHead>
            <TableHead className="w-[15%] text-center">Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revisoes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                Nenhuma revisão encontrada. {orientacao}
              </TableCell>
            </TableRow>
          )}
          {revisoes.map(({ veiculoId, veiculo, kmAtual, sugestao: s }) => {
            const cor = COR[s.status];
            return (
              <TableRow key={`${veiculoId}-${s.acaoId}`}>
                <TableCell className="font-medium">{veiculo}</TableCell>
                <TableCell>{s.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {km(s.intervaloKm)} ou {s.intervaloMeses}{" "}
                  {s.intervaloMeses === 1 ? "mês" : "meses"}
                </TableCell>
                <TableCell>
                  {s.ultima ? (
                    <>
                      {formatarData(s.ultima.data)}
                      <span className="block text-xs text-muted-foreground">{km(s.ultima.km)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {s.proximaData && s.proximoKm !== null ? (
                    <>
                      {formatarData(s.proximaData)}
                      {/* Quanto resta até a próxima revisão: vale o que acabar primeiro, a data ou o km. */}
                      <BarraVidaUtil parte={menorParte(parteRestanteEntreDatas(s.ultima?.data, s.proximaData), parteRestante(s.proximoKm, kmAtual, s.intervaloKm))} />
                      <span className="block text-xs text-muted-foreground">{km(s.proximoKm)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {rotuloMedida} atual: {km(kmAtual)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    title={s.motivo}
                    className={`mx-auto flex h-8 w-full max-w-[12rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold shadow-sm ${cor.pilula}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-black/30 ${cor.ponto}`}
                    />
                    {s.status === "vencida" || s.status === "atencao" ? s.motivo : ROTULO[s.status]}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
