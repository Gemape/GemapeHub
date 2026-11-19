import { codigoCaixa, numeroDaCaixa } from "./caixas-habilitadas.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
export const EVENTO_PORTADORES = "gemape-portadores-caixa";
const CHAVE = "gemape-demo-portadores-caixa";

export type PortadorCaixa = {
  id: string;
  caixa_id: string;
  caixa_codigo: string;
  empresa_id: string;
  empregado_id: string;
  empregado_nome: string;
  status: "Ativa" | "Inativa";
  observacao: string;
  data_inicio: string;
  data_fim: string | null;
};

type Caixa = {
  id: string;
  codigo?: string | null;
  codigo_num?: number | null;
  empresa_id: string | null;
  status: string;
};

type Empregado = {
  id: string;
  nome: string;
  empresa_id: string | null;
  ativo: boolean;
  data_demissao: string | null;
};

/** Exige vínculo ativo e confere a demissão pela data civil de Brasília. */
export function empregadoElegivelPortador(empregado: Pick<Empregado, "ativo" | "data_demissao">, hoje = dataBrasilia()): boolean {
  return empregado.ativo && (!empregado.data_demissao || empregado.data_demissao > hoje);
}

type Entrada = {
  caixa: Caixa;
  empregado: Empregado | null;
  habilitadas: number[];
  status: "Ativa" | "Inativa";
  observacao: string;
  agora?: Date;
  /** Data do início (vínculo) ou do fim (inativação); sem ela vale hoje. Retroativa só com autorização, que fica na observação. */
  data?: string;
  autorizadoPor?: string;
};

/** Data civil em Brasília, inclusive quando o servidor ou navegador usa UTC. */
export function dataBrasilia(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(agora);
  const campo = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

export function lerPortadores(storage: StorageLike = localStorage): PortadorCaixa[] {
  const salvo = storage.getItem(CHAVE);
  if (!salvo) return [];
  let registros: unknown;
  try { registros = JSON.parse(salvo); } catch { throw new Error("Histórico de portadores inválido; nada foi alterado."); }
  if (!Array.isArray(registros) || !registros.every((item) =>
    item && typeof item === "object" && typeof item.id === "string" &&
    typeof item.caixa_id === "string" && typeof item.empregado_id === "string")) {
    throw new Error("Histórico de portadores inválido; nada foi alterado.");
  }
  return registros as PortadorCaixa[];
}

export function portadorAtivo(registros: PortadorCaixa[], caixaId: string): PortadorCaixa | null {
  const ativos = registros.filter((registro) => registro.caixa_id === caixaId && registro.status === "Ativa");
  if (ativos.length > 1) throw new Error("A caixa tem mais de um portador ativo no histórico.");
  return ativos[0] ?? null;
}

/** Código da caixa seguido do portador ativo ("CX-0001 — Ana"), para as listas de escolha da caixa; sem portador (ou com histórico inválido), só o código. */
export function rotuloDaCaixaComPortador(registros: PortadorCaixa[], caixa: { id: string; codigo: string }): string {
  try {
    const portador = portadorAtivo(registros, caixa.id);
    return portador ? `${caixa.codigo} — ${portador.empregado_nome}` : caixa.codigo;
  } catch {
    return caixa.codigo;
  }
}

/** Usa o último vínculo iniciado até a data; trocas no mesmo dia usam o vínculo mais recente. */
export function portadorNaData(registros: PortadorCaixa[], caixaId: string, data: string): PortadorCaixa | null {
  return registros.filter((registro) =>
    registro.caixa_id === caixaId && registro.data_inicio <= data &&
    (!registro.data_fim || registro.data_fim >= data)).at(-1) ?? null;
}

export function validarAlteracaoCaixaComPortador(
  caixa: Caixa,
  registros: PortadorCaixa[],
  proxima: { empresa_id: string | null; status: string } | null,
): string | null {
  if (!portadorAtivo(registros, caixa.id)) return null;
  if (!proxima) return "Inative o portador antes de excluir a caixa.";
  if (proxima.empresa_id !== caixa.empresa_id) return "Inative o portador antes de mudar a empresa da caixa.";
  return null;
}

/** Valida todas as condições, altera o histórico em memória e persiste uma única vez. */
export function registrarPortador(entrada: Entrada, storage: StorageLike = localStorage): PortadorCaixa[] {
  const { caixa, empregado, habilitadas, status } = entrada;
  const numero = numeroDaCaixa(caixa);
  if (numero === null || !habilitadas.includes(numero)) {
    throw new Error("Selecione uma caixa habilitada em Cadastros > Gerais.");
  }
  if (!caixa.empresa_id) throw new Error("A caixa precisa ter uma empresa.");
  if (status !== "Ativa" && status !== "Inativa") throw new Error("Status do portador inválido. Escolha Ativa ou Inativa.");
  const historico = lerPortadores(storage);
  const anterior = portadorAtivo(historico, caixa.id);
  const hoje = dataBrasilia(entrada.agora);
  const dia = entrada.data || hoje;
  if (dia > hoje) throw new Error("A data não pode ser futura.");
  const ultimoFim = historico.filter((r) => r.caixa_id === caixa.id && r.data_fim).map((r) => r.data_fim as string).sort().at(-1);
  if (status === "Ativa" && ultimoFim && dia < ultimoFim) throw new Error(`A caixa teve outro portador até ${ultimoFim.split("-").reverse().join("/")}; a data não pode ser anterior.`);
  if (anterior && dia < anterior.data_inicio) throw new Error("A data não pode ser anterior ao início do portador atual.");
  const autorizacao = entrada.autorizadoPor ? ` Retroativo autorizado por ${entrada.autorizadoPor}.` : "";
  if (status === "Ativa") {
    if (!empregado) throw new Error("Selecione o empregado portador.");
    if (empregado.empresa_id !== caixa.empresa_id) throw new Error("O empregado deve pertencer à empresa da caixa.");
    if (!empregadoElegivelPortador(empregado, hoje)) {
      throw new Error("Empregado demitido ou inativo não pode ser novo portador.");
    }
    if (anterior?.empregado_id === empregado.id) throw new Error("O empregado já é o portador ativo desta caixa.");
  } else {
    if (!anterior) throw new Error("A caixa não tem portador ativo para inativar.");
    if (empregado && anterior.empregado_id !== empregado.id) throw new Error("Selecione o portador ativo da caixa.");
  }

  const proximos = historico.map((registro) => registro.id === anterior?.id
    ? { ...registro, status: "Inativa" as const, data_fim: dia,
        observacao: (status === "Inativa" && entrada.observacao.trim() ? entrada.observacao.trim() : registro.observacao) + (status === "Inativa" ? autorizacao : "") }
    : registro);
  if (status === "Ativa" && empregado) proximos.push({
    id: crypto.randomUUID(), caixa_id: caixa.id, caixa_codigo: caixa.codigo ?? codigoCaixa(numero),
    empresa_id: caixa.empresa_id, empregado_id: empregado.id, empregado_nome: empregado.nome,
    status: "Ativa", observacao: entrada.observacao.trim() + autorizacao,
    data_inicio: dia, data_fim: null,
  });
  storage.setItem(CHAVE, JSON.stringify(proximos));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PORTADORES));
  return proximos;
}
