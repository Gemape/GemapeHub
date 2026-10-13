// Contas do extrato do veículo (decisão 57): média km/L, km atual e sugestões de manutenção
// preventiva a partir do plano do veículo. Só cálculo; a tela e o armazenamento ficam fora.
import type { PlanoManutencao } from "./plano-manutencao.ts";

export type StatusSugestao = "vencida" | "atencao" | "em_dia" | "sem_registro";

// Distância entre o primeiro e o último abastecimento dividida pelos litros dos seguintes
// (o primeiro só marca onde a conta começa). Sem dois abastecimentos, não há média.
export function mediaKmPorLitro(abastecimentos: { km: number; litros: number }[]): number | null {
  if (abastecimentos.length < 2) return null;
  const ordenados = [...abastecimentos].sort((a, b) => a.km - b.km);
  const distancia = ordenados.at(-1)!.km - ordenados[0]!.km;
  const litros = ordenados.slice(1).reduce((soma, a) => soma + a.litros, 0);
  return distancia > 0 && litros > 0 ? distancia / litros : null;
}

export const kmAtualDoVeiculo = (kmCadastro: number, abastecimentos: { km: number }[], manutencoes: { km: number }[]): number =>
  Math.max(kmCadastro || 0, ...abastecimentos.map((a) => a.km), ...manutencoes.map((m) => m.km));

// Soma meses a AAAA-MM-DD; se o dia não existe no mês de chegada, usa o último dia dele.
export function somarMeses(data: string, meses: number): string {
  const [ano, mes, dia] = data.split("-").map(Number) as [number, number, number];
  const total = ano * 12 + (mes - 1) + meses;
  const anoNovo = Math.floor(total / 12);
  const mesNovo = (total % 12) + 1;
  const ultimo = new Date(anoNovo, mesNovo, 0).getDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${anoNovo}-${p(mesNovo)}-${p(Math.min(dia, ultimo))}`;
}

const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00`) - Date.parse(`${de}T12:00:00`)) / 86_400_000);

export type Sugestao = {
  acaoId: string;
  nome: string;
  intervaloKm: number;
  intervaloMeses: number;
  ultima: { data: string; km: number } | null;
  proximoKm: number | null;
  proximaData: string | null;
  status: StatusSugestao;
  motivo: string;
};

const ORDEM: Record<StatusSugestao, number> = { vencida: 0, atencao: 1, sem_registro: 2, em_dia: 3 };

// Regra do "o que vier primeiro": vence quando o km atual chega ao alvo OU a data chega ao
// alvo. Atenção: faltam 10% ou menos do intervalo de km, ou 30 dias ou menos.
export function sugestoesPreventivas(entrada: {
  plano: PlanoManutencao | null;
  acoes: { id: string; nome: string }[];
  manutencoes: { acaoId: string | null; grupos?: { acaoId: string }[] | undefined; data: string; km: number; tipo: string }[];
  kmAtual: number;
  hoje: string;
}): Sugestao[] {
  const { plano, acoes, manutencoes, kmAtual, hoje } = entrada;
  if (!plano) return [];
  const lista = plano.itens.flatMap((item): Sugestao[] => {
    const acao = acoes.find((a) => a.id === item.acaoId);
    if (!acao) return [];
    const feitas = manutencoes
      .filter((m) => m.tipo === "Preventiva" && (m.grupos ? m.grupos.some((g) => g.acaoId === item.acaoId) : m.acaoId === item.acaoId))
      .sort((a, b) => (a.data === b.data ? b.km - a.km : b.data.localeCompare(a.data)));
    const ultima = feitas[0] ? { data: feitas[0].data, km: feitas[0].km } : null;
    const base = { acaoId: item.acaoId, nome: acao.nome, intervaloKm: item.km, intervaloMeses: item.meses };
    if (!ultima) {
      return [{ ...base, ultima, proximoKm: null, proximaData: null, status: "sem_registro", motivo: "Nenhuma realização registrada" }];
    }
    const proximoKm = ultima.km + item.km;
    const proximaData = somarMeses(ultima.data, item.meses);
    const faltamKm = proximoKm - kmAtual;
    const faltamDias = diasEntre(hoje, proximaData);
    let status: StatusSugestao = "em_dia";
    let motivo = "Em dia";
    if (faltamKm <= 0 || faltamDias <= 0) {
      status = "vencida";
      motivo = faltamKm <= 0 && faltamDias <= 0 ? "Vencida por km e por tempo" : faltamKm <= 0 ? "Vencida por km" : "Vencida por tempo";
    } else if (faltamKm <= item.km * 0.1 || faltamDias <= 30) {
      status = "atencao";
      motivo = faltamKm <= item.km * 0.1 ? "Km próximo" : "Prazo próximo";
    }
    return [{ ...base, ultima, proximoKm, proximaData, status, motivo }];
  });
  return lista.sort((a, b) => ORDEM[a.status] - ORDEM[b.status] || a.nome.localeCompare(b.nome, "pt-BR"));
}

type Momento = { data: string; hora?: string };
const momento = (r: Momento) => `${r.data}T${r.hora ?? "00:00"}`;

// Abastecimento mais recente do veículo (por data e hora): é o km que a tela já traz.
export function ultimoAbastecimentoDoVeiculo<T extends Momento & { veiculoId: string }>(lista: T[], veiculoId: string): T | null {
  const dele = lista.filter((a) => a.veiculoId === veiculoId).sort((a, b) => momento(b).localeCompare(momento(a)));
  return dele[0] ?? null;
}

export type LinhaAbastecimento<T> = T & {
  kmRodados: number | null;
  kmPorLitro: number | null;
  precoLitro: number | null;
};

// Histórico de um veículo, do mais recente ao mais antigo. Km rodados e km/L são do trecho desde o
// abastecimento anterior (o primeiro não tem trecho); R$/L precisa do valor, que registros
// antigos podem não ter.
export function historicoAbastecimentos<T extends Momento & { km: number; litros: number; valor?: number | null }>(
  lista: T[],
): LinhaAbastecimento<T>[] {
  const crescente = [...lista].sort((a, b) => momento(a).localeCompare(momento(b)) || a.km - b.km);
  const linhas = crescente.map((a, i): LinhaAbastecimento<T> => {
    const anterior = crescente[i - 1];
    const kmRodados = anterior ? a.km - anterior.km : null;
    return {
      ...a,
      kmRodados,
      kmPorLitro: kmRodados !== null && kmRodados > 0 && a.litros > 0 ? kmRodados / a.litros : null,
      precoLitro: a.valor && a.litros > 0 ? a.valor / a.litros : null,
    };
  });
  return linhas.reverse();
}

export type PontoDeAtencao = { chave: string; data: string; km: number; grupo: string; item: string; observacao: string };

// Itens que uma manutenção deixou de fazer, com a observação do porquê (decisão 161). Somem da lista quando uma
// manutenção posterior faz o item; `nomeGrupo` busca o nome atual em Parâmetros e, sem ele, vale o guardado.
export function pontosDeAtencao(
  manutencoes: {
    id: string;
    data: string;
    km: number;
    grupos?: { acaoId: string; nome: string; itens: { subitemId: string }[]; naoRealizados?: { subitemId: string; nome: string; observacao: string }[] }[];
  }[],
  nomeGrupo: (acaoId: string) => string | undefined,
): PontoDeAtencao[] {
  const feitoDepois = (m: { id: string; data: string }, acaoId: string, subitemId: string) =>
    manutencoes.some((o) => o.id !== m.id && o.data > m.data && (o.grupos ?? []).some((g) => g.acaoId === acaoId && g.itens.some((i) => i.subitemId === subitemId)));
  return manutencoes
    .flatMap((m) =>
      (m.grupos ?? []).flatMap((g) =>
        (g.naoRealizados ?? [])
          .filter((n) => !feitoDepois(m, g.acaoId, n.subitemId))
          .map((n) => ({ chave: `${m.id}:${g.acaoId}:${n.subitemId}`, data: m.data, km: m.km, grupo: nomeGrupo(g.acaoId) ?? (g.nome || "Grupo removido de Parâmetros"), item: n.nome, observacao: n.observacao })),
      ),
    )
    .sort((a, b) => b.data.localeCompare(a.data));
}
