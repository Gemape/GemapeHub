import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StatusSugestao, Sugestao } from "@/lib/extrato-veiculo";
import { formatarData } from "@/lib/gemape";

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

const km = (n: number) => `${n.toLocaleString("pt-BR")} km`;

// Lista das revisões do plano de cada veículo (decisão 319): serviço, periodicidade, última realizada, próxima revisão e situação (pílula colorida). A revisão vence pelo que vier primeiro, o km atual do veículo ou a data (por isso a situação diz o motivo
// e a próxima revisão mostra o km atual).
export function ManutencaoRevisoes({ revisoes }: { revisoes: RevisaoDoVeiculo[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[1200px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[19%]">Veículo</TableHead>
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
                Nenhuma revisão encontrada. O plano de cada veículo fica em Parâmetros &gt;
                Veículos.
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
                      <span className="block text-xs text-muted-foreground">{km(s.proximoKm)}</span>
                      <span className="block text-xs text-muted-foreground">
                        Km atual: {km(kmAtual)}
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
