// Painel mensal do Check list de veículos (decisão 80). Fase 1: fica só no navegador, em modo demonstração.
// A "previsão" é o check list esperado de um veículo num período (dia, semana, quinzena ou mês, conforme a
// periodicidade da associação, decisão 75). Cada previsão é gravada ao entrar em vigor e, depois que o
// prazo passa, nunca mais muda: o resultado dos meses anteriores é imutável, mesmo que a associação mude.
import { hojeBrasilia, periodoAtual, type ChecklistVeiculo, type Periodicidade } from "./checklist-veiculo.ts";
import { lerLista, type StorageLike } from "./registros-veiculo.ts";

const CHAVE = "gemape-demo-checklist-previsoes";
export const EVENTO_PREVISOES_CHECKLIST = "gemape-previsoes-checklist-veiculo";

export type Previsao = {
  id: string;
  veiculoId: string;
  veiculoRotulo: string;
  periodicidade: Periodicidade;
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD, o prazo
  responsavelNome: string;
  // Obrigatório entra nos percentuais; opcional (false) só aparece na lista (decisão 125). Sem o campo (previsões antigas), vale obrigatório.
  obrigatorio?: boolean;
};

// `desde`: dia (Brasília) em que a associação passou a valer; sem ele, vale hoje (não volta no tempo).
export type VeiculoPrevisto = Pick<Previsao, "veiculoId" | "veiculoRotulo" | "periodicidade" | "responsavelNome" | "obrigatorio"> & { desde?: string };

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);
const lerBruto = (storage: StorageLike | null, chave = CHAVE) => lerLista<Previsao>(chave, storage);

// `chave` e `evento` próprios permitem a outro módulo (Equipamentos) ter o seu painel, com a mesma lógica; sem eles valem os de Veículos.
export const lerPrevisoes = (storage: StorageLike | null = storagePadrao(), chave = CHAVE): Previsao[] => lerBruto(storage, chave).lista;

// ---------- Datas (aritmética em UTC: independe do fuso do navegador) ----------

const dia = (d: Date) => d.toISOString().slice(0, 10);
const partes = (data: string) => ({ a: Number(data.slice(0, 4)), m: Number(data.slice(5, 7)), d: Number(data.slice(8, 10)) });
const somarDias = (data: string, n: number) => {
  const { a, m, d } = partes(data);
  return dia(new Date(Date.UTC(a, m - 1, d + n)));
};
export const mesDe = (data: string) => data.slice(0, 7);
const ultimoDiaDoMes = (mes: string) => dia(new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)));

// Períodos cujo prazo (fim) cai no mês: assim cada período pertence a um único mês. Semana vai de segunda a domingo.
export function periodosDoMes(periodicidade: Periodicidade, mes: string): { inicio: string; fim: string }[] {
  const primeiro = `${mes}-01`;
  const ultimo = ultimoDiaDoMes(mes);
  const dias: string[] = [];
  for (let d = primeiro; d <= ultimo; d = somarDias(d, 1)) dias.push(d);
  if (periodicidade === "Diário") return dias.map((d) => ({ inicio: d, fim: d }));
  if (periodicidade === "Mensal") return [{ inicio: primeiro, fim: ultimo }];
  if (periodicidade === "Quinzenal") return [{ inicio: primeiro, fim: `${mes}-15` }, { inicio: `${mes}-16`, fim: ultimo }];
  return dias
    .filter((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 0)
    .map((fim) => ({ inicio: somarDias(fim, -6), fim }));
}

// Do mês de hoje para trás (mais recente primeiro), sem meses futuros.
export function mesesDisponiveis(hoje: string, quantidade = 12): string[] {
  const { a, m } = partes(hoje);
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return dia(d).slice(0, 7);
  });
}

// ---------- Gravação das previsões ----------

const idDa = (v: VeiculoPrevisto, p: { inicio: string; fim: string }) => `${v.veiculoId}|${v.periodicidade}|${p.inicio}|${p.fim}`;

// Mantém as previsões em vigor: do dia em que a associação passou a valer (`desde`) até o fim do mês de hoje, mesmo
// que o módulo só seja aberto depois; o que passou antes de a associação existir não é cobrado. Previsão que ainda
// não venceu acompanha a associação (responsável, rótulo) e sai se não vale mais (associação trocada ou removida,
// veículo inativo); as de prazo vencido ficam como estão. Só grava quando algo muda.
export function sincronizarPrevisoes(
  entrada: { veiculos: VeiculoPrevisto[]; hoje: string },
  storage: StorageLike | null = storagePadrao(),
  opcoes: { chave?: string; evento?: string } = {},
): void {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const chave = opcoes.chave ?? CHAVE;
  const { lista, integro } = lerBruto(storage, chave);
  if (!integro) throw new Error("Os registros salvos neste navegador não puderam ser lidos. Nada foi alterado, para não apagá-los.");
  const { hoje } = entrada;
  const desejadas = new Map<string, Previsao>();
  for (const v of entrada.veiculos) {
    const desde = v.desde && v.desde < hoje ? v.desde : hoje;
    const meses: string[] = [];
    for (let m = mesDe(desde); m <= mesDe(hoje) && meses.length < 24; m = mesDe(somarDias(`${m}-28`, 4))) meses.push(m);
    const periodos = [...meses.flatMap((m) => periodosDoMes(v.periodicidade, m)), periodoAtual(v.periodicidade, hoje)];
    for (const p of periodos) {
      if (p.fim < desde) continue;
      const id = idDa(v, p);
      desejadas.set(id, { id, veiculoId: v.veiculoId, veiculoRotulo: v.veiculoRotulo, periodicidade: v.periodicidade, inicio: p.inicio, fim: p.fim, responsavelNome: v.responsavelNome, obrigatorio: v.obrigatorio ?? true });
    }
  }
  const existentes = new Set(lista.map((p) => p.id));
  // Prazo vencido não muda; o que ainda não venceu e não vale mais sai; o que vale é atualizado.
  const mantidas = lista
    .filter((p) => p.fim < hoje || desejadas.has(p.id))
    .map((p) => (p.fim >= hoje ? (desejadas.get(p.id) ?? p) : p));
  const novas = [...desejadas.values()].filter((p) => !existentes.has(p.id));
  const resultado = [...mantidas, ...novas];
  if (JSON.stringify(resultado) === JSON.stringify(lista)) return;
  storage.setItem(chave, JSON.stringify(resultado));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(opcoes.evento ?? EVENTO_PREVISOES_CHECKLIST));
}

// Lista de check lists por mês (a lista mostra um mês de cada vez, para não poluir a tela): vale o dia em que o check list foi concluído (como no painel); o que ainda está em
// andamento aparece sempre, em qualquer mês, para não ficar escondido. `mes` nulo mostra todos os meses.
export const noMesDaLista = (c: { status: string; data: string; concluidoEm?: string | null }, mes: string | null): boolean =>
  mes === null || c.status === "Em andamento" || mesDe(c.concluidoEm ? hojeBrasilia(new Date(c.concluidoEm)) : c.data) === mes;

// ---------- Painel ----------

export type SituacaoPrevisao = "realizado" | "nao_realizado" | "a_vencer" | "opcional";
export type LinhaPainel = Previsao & {
  situacao: SituacaoPrevisao;
  checklistId: string | null;
  checklistCodigo: string | null;
  concluidoEm: string | null;
};
export type ResumoPainel = {
  previstos: number; // só os obrigatórios (decisão 125)
  opcionais: number; // previsões de check list opcional, fora dos percentuais
  realizados: number;
  naoRealizados: number;
  aVencer: number;
  pctNoPrazo: number | null;
  pctNaoNoPrazo: number | null;
};

export type ChecklistDoPainel = Pick<ChecklistVeiculo, "id" | "codigo" | "veiculoId" | "periodicidade" | "status" | "data" | "concluidoEm" | "responsavelNome">;

const diaDaConclusao = (c: ChecklistDoPainel) => (c.concluidoEm ? hojeBrasilia(new Date(c.concluidoEm)) : c.data);

// Realizado no prazo: há check list concluído do veículo, da mesma periodicidade (decisão 124), dentro do período. Não realizado no prazo: o prazo passou
// sem isso. A vencer: o prazo ainda não passou. Os percentuais só contam o que já tem desfecho (realizado ou vencido),
// por isso os dois somam 100%; sem nenhum desfecho ainda, ficam nulos.
// `mes` nulo é o painel de todos os períodos: conta todas as previsões, de todos os meses, e não só as do mês escolhido.
export function painelDoMes(
  mes: string | null,
  previsoes: Previsao[],
  checklists: ChecklistDoPainel[],
  hoje: string,
): { linhas: LinhaPainel[]; resumo: ResumoPainel } {
  const linhas = previsoes
    .filter((p) => mes === null || mesDe(p.fim) === mes)
    .sort((a, b) => a.fim.localeCompare(b.fim) || a.veiculoRotulo.localeCompare(b.veiculoRotulo))
    .map((p) => {
      const feito = checklists
        .filter((c) => c.veiculoId === p.veiculoId && c.periodicidade === p.periodicidade && c.status === "Concluído" && diaDaConclusao(c) >= p.inicio && diaDaConclusao(c) <= p.fim)
        .sort((a, b) => (a.concluidoEm ?? "").localeCompare(b.concluidoEm ?? ""))[0];
      const situacao: SituacaoPrevisao = feito ? "realizado" : p.obrigatorio === false ? "opcional" : p.fim < hoje ? "nao_realizado" : "a_vencer";
      return {
        ...p,
        responsavelNome: feito?.responsavelNome ?? p.responsavelNome,
        situacao,
        checklistId: feito?.id ?? null,
        checklistCodigo: feito?.codigo ?? null,
        concluidoEm: feito?.concluidoEm ?? null,
      };
    });
  return { linhas, resumo: resumoDeLinhas(linhas) };
}

// Os números do painel para qualquer conjunto de linhas (todas, ou só as de um grupo de responsáveis, como técnicos e PCM; decisão 310).
// Só os obrigatórios entram na contagem e nos percentuais; o opcional aparece na lista (decisão 125).
export function resumoDeLinhas(linhas: LinhaPainel[]): ResumoPainel {
  const obrigatorias = linhas.filter((l) => l.obrigatorio !== false);
  const conta = (s: SituacaoPrevisao) => obrigatorias.filter((l) => l.situacao === s).length;
  const realizados = conta("realizado");
  const naoRealizados = conta("nao_realizado");
  const base = realizados + naoRealizados;
  // Em décimos de ponto; o não realizado é o que falta para 100%, assim os dois somam sempre 100%.
  const decimosNoPrazo = base === 0 ? null : Math.round((realizados / base) * 1000);
  return {
    previstos: obrigatorias.length, opcionais: linhas.length - obrigatorias.length, realizados, naoRealizados, aVencer: conta("a_vencer"),
    pctNoPrazo: decimosNoPrazo === null ? null : decimosNoPrazo / 10,
    pctNaoNoPrazo: decimosNoPrazo === null ? null : (1000 - decimosNoPrazo) / 10,
  };
}

// ---------- Resultados por responsável (decisão 298) ----------

export type ResultadoResponsavel = { nome: string; previstos: number; realizados: number; naoRealizados: number; aVencer: number; pctNoPrazo: number | null };

// Os mesmos números do painel, agrupados por responsável (quem fez o check list, ou o responsável da associação quando ainda não foi feito). Só os
// obrigatórios contam, como no resumo; o percentual é só do que já tem desfecho (realizado ou vencido), e fica nulo sem nenhum. Ordem alfabética.
export function resultadosPorResponsavel(linhas: LinhaPainel[]): ResultadoResponsavel[] {
  const porNome = new Map<string, LinhaPainel[]>();
  for (const l of linhas.filter((x) => x.obrigatorio !== false)) {
    const nome = l.responsavelNome.trim() || "Não definido";
    porNome.set(nome, [...(porNome.get(nome) ?? []), l]);
  }
  return [...porNome.entries()]
    .map(([nome, dele]) => {
      const conta = (s: SituacaoPrevisao) => dele.filter((l) => l.situacao === s).length;
      const realizados = conta("realizado");
      const naoRealizados = conta("nao_realizado");
      const base = realizados + naoRealizados;
      return { nome, previstos: dele.length, realizados, naoRealizados, aVencer: conta("a_vencer"), pctNoPrazo: base === 0 ? null : Math.round((realizados / base) * 1000) / 10 };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
