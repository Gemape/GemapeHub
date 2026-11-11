// Registros do módulo Equipamentos (Inventário, Abastecimento, Manutenção, Ocorrências e Check lists), na mesma lógica dos de Veículos, mas por equipamento e com
// horímetro no lugar do km. Fase 1: ficam só no navegador, em modo demonstração; as tabelas no banco real são pendência da Fase 2.
import { horaBrasilia, hojeLocal } from "./empregados.ts";
import { MAX_FOTOS } from "./ocorrencias-veiculo.ts";
import { alterarLista, dinheiroPositivo, lerLista, validarData, validarHora, type StorageLike } from "./registros-veiculo.ts";

export const CHAVE_ABASTECIMENTOS_EQ = "gemape-demo-eq-abastecimentos";
export const CHAVE_MANUTENCOES_EQ = "gemape-demo-eq-manutencoes";
export const CHAVE_OCORRENCIAS_EQ = "gemape-demo-eq-ocorrencias";
export const EVENTO_REGISTROS_EQUIPAMENTO = "gemape-registros-equipamento";

export type AbastecimentoEquipamento = { id: string; equipamentoId: string; data: string; hora: string; horimetro: number; litros: number; valor: number; criadoEm: string };
export type TipoManutencaoEq = "Preventiva" | "Corretiva";
// Ordem de serviço: a manutenção tem ciclo de vida. Registro sem status (os de antes) conta como Concluída.
export type StatusOsEq = "Pendente" | "Em andamento" | "Concluída" | "Cancelada";
export const STATUS_OS_EQ: StatusOsEq[] = ["Pendente", "Em andamento", "Concluída", "Cancelada"];
export type AcaoRealizada = { acaoId: string; nome: string; subitens: string[] };
export type ManutencaoEquipamentoRegistro = {
  id: string; equipamentoId: string; tipo: TipoManutencaoEq; data: string; horimetro: number; acoes: AcaoRealizada[]; local: "empresa" | "terceiro"; localNome: string;
  custoPecas: number; custoMaoDeObra: number; observacao: string; criadoEm: string;
  // Horas em que o equipamento ficou parado por causa da manutenção (alimenta a disponibilidade); registros antigos não têm.
  horasParada?: number;
  // Ordem de serviço: situação, previsão de conclusão (AAAA-MM-DD), técnico responsável e quando foi encerrada (concluída ou cancelada).
  status?: StatusOsEq; dataPrevista?: string; responsavel?: string; encerradaEm?: string | null;
  // Data de abertura da ordem (`data` passa a ser a da conclusão quando ela termina; sem este campo, `data` é a abertura). Horímetro 0 em ordem aberta = ainda não medido.
  abertaEm?: string;
};
export const statusDaOsEq = (m: Pick<ManutencaoEquipamentoRegistro, "status">): StatusOsEq => m.status ?? "Concluída";
// Só a manutenção concluída conta no horímetro, nos custos, na disponibilidade e nos indicadores; pendente, em andamento e cancelada ficam só na lista de ordens.
export const manutencoesConcluidasEq = (lista: ManutencaoEquipamentoRegistro[]) => lista.filter((m) => statusDaOsEq(m) === "Concluída");
export type OcorrenciaEquipamento = {
  id: string; equipamentoId: string; tipoId: string; tipoNome: string; data: string; descricao: string; status: "Aberta" | "Resolvida"; solucao: string; resolvidaEm: string | null; criadoEm: string;
  // Fotos da ocorrência (data URLs já reduzidas na tela), como em Veículos; registros antigos não têm.
  fotos?: string[];
};

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `eq-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const lerAbastecimentosEq = (storage: StorageLike | null = storagePadrao()) => lerLista<AbastecimentoEquipamento>(CHAVE_ABASTECIMENTOS_EQ, storage).lista;
export const lerManutencoesEq = (storage: StorageLike | null = storagePadrao()) => lerLista<ManutencaoEquipamentoRegistro>(CHAVE_MANUTENCOES_EQ, storage).lista;
export const lerOcorrenciasEq = (storage: StorageLike | null = storagePadrao()) => lerLista<OcorrenciaEquipamento>(CHAVE_OCORRENCIAS_EQ, storage).lista;

// Gravam e avisam as telas pelo mesmo evento de Veículos (alterarLista); aqui o evento próprio também é disparado.
function gravar<T>(chave: string, storage: StorageLike | null, mudanca: (lista: T[]) => T[]) {
  alterarLista<T>(chave, storage, mudanca);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_REGISTROS_EQUIPAMENTO));
}

function horimetroValido(valor: string | number | undefined): number {
  // Vírgula é o decimal (o ponto vira milhar); sem vírgula, o ponto só é milhar quando agrupa de três em três ("1.480"); senão é decimal ("1480.5").
  const bruto = String(valor ?? "").trim();
  const texto = bruto.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(bruto) ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const n = Number(texto);
  if (texto === "" || !Number.isFinite(n) || n < 0 || n > 999_999 || Math.round(n * 10) !== n * 10) throw new Error("Informe o horímetro do equipamento (0 ou mais, até uma casa decimal).");
  return n;
}
function decimalPositivo(valor: string | number | undefined, mensagem: string): number {
  const n = typeof valor === "number" ? valor : Number(String(valor ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 9999) throw new Error(mensagem);
  return Math.round(n * 100) / 100;
}
const custoOpcional = (valor: string | number | undefined, nome: string): number => {
  if (valor === undefined || String(valor).trim() === "") return 0;
  const n = dinheiroPositivo(valor);
  if (n === null) throw new Error(`Informe ${nome} em reais (maior que zero) ou deixe em branco.`);
  return n;
};
function horasDeParada(valor: string | number | undefined): number {
  if (valor === undefined || String(valor).trim() === "") return 0;
  const n = Number(String(valor).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 9999 || Math.round(n * 10) !== n * 10) throw new Error("Informe as horas de parada (0 ou mais, até uma casa decimal) ou deixe em branco.");
  return n;
}
const momento = (r: { data: string; hora?: string }) => `${r.data}T${r.hora ?? "00:00"}`;

// O horímetro só cresce: não pode ser menor que o de um registro anterior do mesmo equipamento, nem maior que o de um posterior. A manutenção não tem hora:
// no mesmo dia dela a ordem não se sabe, então só vale a comparação com registros de outros dias (e, entre dois abastecimentos do mesmo dia, pela hora).
function conflitoDeHorimetro(equipamentoId: string, quando: { data: string; hora?: string }, horimetro: number, storage: StorageLike | null, ignorarId?: string): string | null {
  const pontos = [
    ...lerAbastecimentosEq(storage).filter((a) => a.equipamentoId === equipamentoId).map((a) => ({ dia: a.data, hora: a.hora as string | null, h: a.horimetro })),
    ...manutencoesConcluidasEq(lerManutencoesEq(storage)).filter((x) => x.equipamentoId === equipamentoId && x.id !== ignorarId).map((x) => ({ dia: x.data, hora: null as string | null, h: x.horimetro })),
  ];
  const comHora = (p: { hora: string | null }) => p.hora !== null && quando.hora !== undefined;
  const anterior = pontos.filter((p) => p.dia < quando.data || (p.dia === quando.data && comHora(p) && p.hora! < quando.hora!)).sort((a, b) => b.h - a.h)[0];
  if (anterior && anterior.h > horimetro) return `O horímetro não confere com os outros registros deste equipamento: há um de ${anterior.h.toLocaleString("pt-BR")} h antes deste.`;
  const posterior = pontos.filter((p) => p.dia > quando.data || (p.dia === quando.data && comHora(p) && p.hora! > quando.hora!)).sort((a, b) => a.h - b.h)[0];
  if (posterior && posterior.h < horimetro) return `O horímetro não confere com os outros registros deste equipamento: há um de ${posterior.h.toLocaleString("pt-BR")} h depois deste.`;
  return null;
}

export type EntradaAbastecimentoEq = { equipamentoId: string; data: string; hora: string; horimetro: string | number; litros: string | number; valor: string | number };
export function registrarAbastecimentoEq(entrada: EntradaAbastecimentoEq, storage = storagePadrao(), agora = new Date()): AbastecimentoEquipamento {
  if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
  const data = validarData(entrada.data, agora);
  const hora = validarHora(entrada.hora);
  if (data === hojeLocal(agora) && hora > horaBrasilia(agora)) throw new Error("A hora não pode ser futura.");
  const horimetro = horimetroValido(entrada.horimetro);
  const litros = decimalPositivo(entrada.litros, "Informe os litros (número maior que zero, ex.: 40,5).");
  const valor = dinheiroPositivo(entrada.valor);
  if (valor === null) throw new Error("Informe o valor em reais (maior que zero, ex.: 250,00).");
  const conflito = conflitoDeHorimetro(entrada.equipamentoId, { data, hora }, horimetro, storage);
  if (conflito) throw new Error(conflito);
  if (lerAbastecimentosEq(storage).some((a) => a.equipamentoId === entrada.equipamentoId && a.data === data && a.hora === hora)) throw new Error("Já existe um abastecimento deste equipamento nesta data e hora.");
  const registro: AbastecimentoEquipamento = { id: novoId(), equipamentoId: entrada.equipamentoId, data, hora, horimetro, litros, valor, criadoEm: agora.toISOString() };
  gravar<AbastecimentoEquipamento>(CHAVE_ABASTECIMENTOS_EQ, storage, (l) => [...l, registro]);
  return registro;
}
export const removerAbastecimentoEq = (id: string, storage = storagePadrao()) => gravar<AbastecimentoEquipamento>(CHAVE_ABASTECIMENTOS_EQ, storage, (l) => l.filter((a) => a.id !== id));

export type EntradaManutencaoEq = {
  equipamentoId: string; tipo: string; data: string; horimetro?: string | number; acoes: AcaoRealizada[]; local: string; localNome: string;
  custoPecas?: string | number; custoMaoDeObra?: string | number; observacao?: string; horasParada?: string | number;
  // Ordem de serviço; sem status a manutenção é registrada já concluída, como antes.
  status?: string; dataPrevista?: string; responsavel?: string; dataConclusao?: string;
};
// Concluir exige as ações, o horímetro e a conferência com os demais registros; abrir ou acompanhar a ordem só pede o técnico responsável (horímetro e ações vêm depois).
function montarManutencaoEq(entrada: EntradaManutencaoEq, storage: StorageLike | null, agora: Date, ignorarId?: string): Omit<ManutencaoEquipamentoRegistro, "id" | "criadoEm"> {
  if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
  if (entrada.tipo !== "Preventiva" && entrada.tipo !== "Corretiva") throw new Error("Escolha o tipo da manutenção: preventiva ou corretiva.");
  const status = (entrada.status || "Concluída") as StatusOsEq;
  if (!STATUS_OS_EQ.includes(status)) throw new Error("Escolha a situação da ordem de serviço.");
  const concluida = status === "Concluída";
  const abertura = validarData(entrada.data, agora);
  // Concluída: o registro vale pela data da conclusão (custo, parada e extrato caem nela); a abertura fica em `abertaEm`.
  const data = concluida ? validarData(entrada.dataConclusao || entrada.data, agora) : abertura;
  if (data < abertura) throw new Error("A data de conclusão não pode ser anterior à abertura.");
  const dataPrevista = (entrada.dataPrevista ?? "").trim();
  if (dataPrevista) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista) || Number.isNaN(Date.parse(dataPrevista))) throw new Error("Informe a previsão de conclusão com uma data válida.");
    if (dataPrevista < abertura) throw new Error("A previsão de conclusão não pode ser anterior à abertura.");
  }
  const responsavel = (entrada.responsavel ?? "").trim();
  if (!responsavel && (status === "Pendente" || status === "Em andamento")) throw new Error("Informe o técnico responsável pela ordem de serviço.");
  const semHorimetro = String(entrada.horimetro ?? "").trim() === "";
  const horimetro = concluida || !semHorimetro ? horimetroValido(entrada.horimetro) : 0;
  const acoes = entrada.acoes.filter((a) => a.acaoId);
  if (concluida && acoes.length === 0) throw new Error("Escolha ao menos uma ação de manutenção realizada.");
  if (entrada.local !== "empresa" && entrada.local !== "terceiro") throw new Error("Informe onde foi feita a manutenção: na empresa ou em terceiro.");
  const localNome = entrada.localNome.trim();
  if (entrada.local === "terceiro" && !localNome) throw new Error("Informe o nome do terceiro que fez a manutenção.");
  if (concluida) {
    const conflito = conflitoDeHorimetro(entrada.equipamentoId, { data }, horimetro, storage, ignorarId);
    if (conflito) throw new Error(conflito);
  }
  return {
    equipamentoId: entrada.equipamentoId, tipo: entrada.tipo, data, horimetro, acoes, local: entrada.local, localNome: entrada.local === "empresa" ? "Empresa" : localNome,
    custoPecas: custoOpcional(entrada.custoPecas, "o custo das peças"), custoMaoDeObra: custoOpcional(entrada.custoMaoDeObra, "o custo da mão de obra"),
    observacao: (entrada.observacao ?? "").trim(), horasParada: horasDeParada(entrada.horasParada),
    status, dataPrevista, responsavel, abertaEm: abertura, encerradaEm: concluida || status === "Cancelada" ? agora.toISOString() : null,
  };
}
export function registrarManutencaoEq(entrada: EntradaManutencaoEq, storage = storagePadrao(), agora = new Date()): ManutencaoEquipamentoRegistro {
  const registro: ManutencaoEquipamentoRegistro = { id: novoId(), ...montarManutencaoEq(entrada, storage, agora), criadoEm: agora.toISOString() };
  gravar<ManutencaoEquipamentoRegistro>(CHAVE_MANUTENCOES_EQ, storage, (l) => [...l, registro]);
  return registro;
}
// Atualiza a ordem (dados e situação). A situação só avança (Pendente, Em andamento, Concluída); cancelar vale até antes de concluir; concluída e cancelada não mudam mais.
const ETAPA_OS: Record<StatusOsEq, number> = { "Pendente": 0, "Em andamento": 1, "Concluída": 2, "Cancelada": 2 };
export function atualizarManutencaoEq(id: string, entrada: EntradaManutencaoEq, storage = storagePadrao(), agora = new Date()): ManutencaoEquipamentoRegistro {
  const atual = lerManutencoesEq(storage).find((m) => m.id === id);
  if (!atual) throw new Error("A ordem de serviço não existe mais.");
  const de = statusDaOsEq(atual);
  if (ETAPA_OS[de] === 2) throw new Error(`A ordem de serviço já está ${de.toLowerCase()} e não pode mais ser alterada.`);
  const dados = montarManutencaoEq(entrada, storage, agora, id);
  if (ETAPA_OS[dados.status!] < ETAPA_OS[de]) throw new Error("A situação da ordem de serviço não pode voltar para uma etapa anterior.");
  const novo: ManutencaoEquipamentoRegistro = { ...atual, ...dados };
  gravar<ManutencaoEquipamentoRegistro>(CHAVE_MANUTENCOES_EQ, storage, (l) => l.map((m) => (m.id === id ? novo : m)));
  return novo;
}
export const removerManutencaoEq = (id: string, storage = storagePadrao()) => gravar<ManutencaoEquipamentoRegistro>(CHAVE_MANUTENCOES_EQ, storage, (l) => l.filter((m) => m.id !== id));
export const custoDaManutencaoEq = (m: Pick<ManutencaoEquipamentoRegistro, "custoPecas" | "custoMaoDeObra">) => m.custoPecas + m.custoMaoDeObra;

// Fotos como as da ocorrência de veículo: até MAX_FOTOS por ocorrência, só imagens, já reduzidas na tela.
const LIMITE_FOTO = 600_000;
function validarFotosEq(fotos: string[]): string[] {
  if (fotos.length > MAX_FOTOS) throw new Error(`No máximo ${MAX_FOTOS} fotos por ocorrência.`);
  if (fotos.some((f) => typeof f !== "string" || !f.startsWith("data:image/") || f.length > LIMITE_FOTO)) throw new Error("Uma das fotos não é uma imagem válida ou ficou grande demais.");
  return fotos;
}
export type EntradaOcorrenciaEq = { equipamentoId: string; tipoId: string; tipoNome: string; data: string; descricao: string; fotos?: string[] };
export function registrarOcorrenciaEq(entrada: EntradaOcorrenciaEq, storage = storagePadrao(), agora = new Date()): OcorrenciaEquipamento {
  if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!entrada.tipoId || !entrada.tipoNome.trim()) throw new Error("Escolha o tipo da ocorrência.");
  const data = validarData(entrada.data, agora);
  const descricao = entrada.descricao.trim();
  if (descricao.length < 5) throw new Error("Descreva a ocorrência (ao menos 5 letras).");
  const registro: OcorrenciaEquipamento = { id: novoId(), equipamentoId: entrada.equipamentoId, tipoId: entrada.tipoId, tipoNome: entrada.tipoNome.trim(), data, descricao, status: "Aberta", solucao: "", resolvidaEm: null, fotos: validarFotosEq(entrada.fotos ?? []), criadoEm: agora.toISOString() };
  gravar<OcorrenciaEquipamento>(CHAVE_OCORRENCIAS_EQ, storage, (l) => [...l, registro]);
  return registro;
}
export function adicionarFotosOcorrenciaEq(id: string, fotos: string[], storage = storagePadrao()): void {
  gravar<OcorrenciaEquipamento>(CHAVE_OCORRENCIAS_EQ, storage, (l) => {
    const o = l.find((x) => x.id === id);
    if (!o) throw new Error("Ocorrência não encontrada.");
    const novas = validarFotosEq([...(o.fotos ?? []), ...fotos]);
    return l.map((x) => (x.id === id ? { ...x, fotos: novas } : x));
  });
}
export function removerFotoOcorrenciaEq(id: string, indice: number, storage = storagePadrao()): void {
  gravar<OcorrenciaEquipamento>(CHAVE_OCORRENCIAS_EQ, storage, (l) => {
    const o = l.find((x) => x.id === id);
    if (!o) throw new Error("Ocorrência não encontrada.");
    if (!Number.isInteger(indice) || indice < 0 || indice >= (o.fotos ?? []).length) throw new Error("Foto não encontrada.");
    return l.map((x) => (x.id === id ? { ...x, fotos: (x.fotos ?? []).filter((_, n) => n !== indice) } : x));
  });
}
export function resolverOcorrenciaEq(id: string, solucao: string, storage = storagePadrao(), agora = new Date()): void {
  const texto = solucao.trim();
  if (texto.length < 3) throw new Error("Informe como a ocorrência foi resolvida.");
  gravar<OcorrenciaEquipamento>(CHAVE_OCORRENCIAS_EQ, storage, (l) => l.map((o) => (o.id === id ? { ...o, status: "Resolvida" as const, solucao: texto, resolvidaEm: hojeLocal(agora) } : o)));
}
export const removerOcorrenciaEq = (id: string, storage = storagePadrao()) => gravar<OcorrenciaEquipamento>(CHAVE_OCORRENCIAS_EQ, storage, (l) => l.filter((o) => o.id !== id));

// Último horímetro conhecido do equipamento (abastecimentos e manutenções), para sugerir no formulário e mostrar no inventário.
export function ultimoHorimetro(equipamentoId: string, storage: StorageLike | null = storagePadrao()): number | null {
  const todos = [...lerAbastecimentosEq(storage).filter((a) => a.equipamentoId === equipamentoId).map((a) => a.horimetro), ...manutencoesConcluidasEq(lerManutencoesEq(storage)).filter((m) => m.equipamentoId === equipamentoId).map((m) => m.horimetro)];
  return todos.length ? Math.max(...todos) : null;
}
