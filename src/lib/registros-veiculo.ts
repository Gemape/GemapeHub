// Abastecimentos e manutenções por veículo (decisão 57). Fase 1: ficam só no navegador, em
// modo demonstração; as tabelas no banco real são pendência da Fase 2.
import { hojeLocal } from "./empregados.ts";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE_ABASTECIMENTOS = "gemape-demo-abastecimentos";
const CHAVE_MANUTENCOES = "gemape-demo-manutencoes-veiculo";
export const EVENTO_REGISTROS_VEICULO = "gemape-registros-veiculo";

// Hora e valor vieram depois (decisão 58): registros antigos podem não ter.
export type Abastecimento = {
  id: string;
  veiculoId: string;
  data: string;
  hora?: string;
  km: number;
  litros: number;
  valor?: number | null;
  criadoEm: string;
};
export type TipoManutencao = "Preventiva" | "Corretiva";
export type LocalManutencao = "empresa" | "terceiro";
// Ação (filho) do grupo, com o nome guardado para o registro não mudar se Parâmetros mudar.
export type ItemManutencao = { subitemId: string; nome: string; observacao: string };
// Uma manutenção pode abranger vários grupos de ações; cada grupo guarda o nome e as ações feitas.
export type GrupoManutencao = { acaoId: string; nome: string; itens: ItemManutencao[] };
// Campos de itens, local e custos vieram na decisão 61: registros antigos podem não ter.
export type ManutencaoVeiculo = {
  id: string;
  veiculoId: string;
  data: string;
  km: number;
  tipo: TipoManutencao;
  // Primeiro grupo e todas as ações (leitura de quem só conhece um grupo); a fonte é `grupos`.
  acaoId: string | null;
  descricao: string;
  itens?: ItemManutencao[];
  // Registros anteriores à decisão 79 não têm: valem acaoId e itens como um grupo só.
  grupos?: GrupoManutencao[];
  local?: LocalManutencao;
  localNome?: string;
  custoPecas?: number;
  custoMaoDeObra?: number;
  custoTotal?: number;
  criadoEm: string;
};

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);

// `integro` é false quando havia dados que não puderam ser lidos: nada é gravado por cima deles.
export function lerLista<T>(chave: string, storage: StorageLike | null): { lista: T[]; integro: boolean } {
  if (!storage) return { lista: [], integro: true };
  const bruto = storage.getItem(chave);
  if (bruto === null) return { lista: [], integro: true };
  try {
    const salvos = JSON.parse(bruto) as unknown;
    if (!Array.isArray(salvos)) return { lista: [], integro: false };
    return { lista: salvos.filter((i): i is T => !!i && typeof i === "object"), integro: true };
  } catch {
    return { lista: [], integro: false };
  }
}

export function alterarLista<T>(chave: string, storage: StorageLike | null, mudanca: (lista: T[]) => T[]) {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const { lista, integro } = lerLista<T>(chave, storage);
  if (!integro) throw new Error("Os registros salvos neste navegador não puderam ser lidos. Nada foi alterado, para não apagá-los.");
  storage.setItem(chave, JSON.stringify(mudanca(lista)));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_REGISTROS_VEICULO));
}

export const lerAbastecimentos = (storage: StorageLike | null = storagePadrao()): Abastecimento[] =>
  lerLista<Abastecimento>(CHAVE_ABASTECIMENTOS, storage).lista;
export const lerManutencoes = (storage: StorageLike | null = storagePadrao()): ManutencaoVeiculo[] =>
  lerLista<ManutencaoVeiculo>(CHAVE_MANUTENCOES, storage).lista;

// Número inteiro, com ponto só como separador de milhar ("50.000").
function inteiro(valor: string | number | undefined): number | null {
  if (typeof valor === "number") return Number.isInteger(valor) && valor >= 0 && valor <= 9_999_999 ? valor : null;
  const texto = String(valor ?? "").trim();
  if (!/^\d+$/.test(texto) && !/^\d{1,3}(\.\d{3})+$/.test(texto)) return null;
  const n = Number(texto.replace(/\./g, ""));
  return n <= 9_999_999 ? n : null;
}

// Litros com vírgula decimal ("40,5"), maiores que zero.
function decimalPositivo(valor: string | number | undefined): number | null {
  if (typeof valor === "number") return valor > 0 && valor <= 9999 ? valor : null;
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const n = Number(texto);
  return n > 0 && n <= 9999 ? n : null;
}

// Valor em reais, com vírgula decimal e ponto de milhar ("R$ 1.234,56"), maior que zero.
export function dinheiroPositivo(valor: string | number | undefined): number | null {
  if (typeof valor === "number") return valor > 0 && valor <= 999_999.99 ? Math.round(valor * 100) / 100 : null;
  const texto = String(valor ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  const normal = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const n = Number(normal);
  return n > 0 && n <= 999_999.99 ? n : null;
}

export function validarHora(hora: string | undefined): string {
  const h = String(hora ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) throw new Error("Informe a hora do abastecimento (HH:MM).");
  return h;
}

const chaveMomento = (r: { data: string; hora?: string }) => `${r.data}T${r.hora ?? "00:00"}`;

export function validarData(data: string | undefined, hoje: Date): string {
  const d = String(data ?? "").trim();
  const [a, m, dia] = d.split("-").map(Number);
  const real = new Date(a ?? 0, (m ?? 1) - 1, dia ?? 1);
  // Reconstrói a data para recusar dias que não existem (31/02).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || real.getFullYear() !== a || real.getMonth() !== (m ?? 1) - 1 || real.getDate() !== dia) {
    throw new Error("Informe a data.");
  }
  if (d > hojeLocal(hoje)) throw new Error("A data não pode ser futura.");
  return d;
}

const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

// O km cresce com a data e a hora, somando abastecimentos e manutenções do mesmo veículo.
// Manutenção não tem hora: ao comparar com ela vale só a data (no mesmo dia, qualquer km passa).
// Km igual ao anterior é aceito. Devolve o registro que impede, para a mensagem dizer qual é.
function conflitoDeKm(
  veiculoId: string,
  novo: { data: string; hora?: string },
  km: number,
  storage: StorageLike | null,
): { data: string; hora?: string; km: number } | null {
  const outros = [...lerAbastecimentos(storage), ...lerManutencoes(storage)].filter((r) => r.veiculoId === veiculoId);
  return (
    outros.find((r) => {
      const hora = (r as { hora?: string }).hora;
      const semHora = !novo.hora || !hora;
      const antes = semHora ? r.data < novo.data : chaveMomento({ data: r.data, hora }) < chaveMomento(novo);
      const depois = semHora ? r.data > novo.data : chaveMomento({ data: r.data, hora }) > chaveMomento(novo);
      return (antes && r.km > km) || (depois && r.km < km);
    }) ?? null
  );
}

function mensagemKm(c: { data: string; hora?: string; km: number }): string {
  const [ano, mes, dia] = c.data.split("-");
  return `O km não confere com os outros registros deste veículo: há um de ${c.km.toLocaleString("pt-BR")} km em ${dia}/${mes}/${ano}${c.hora ? ` às ${c.hora}` : ""}. O km não pode ser menor que o anterior.`;
}

export type EntradaAbastecimento = {
  veiculoId: string;
  data: string;
  hora: string;
  km: string | number;
  litros: string | number;
  valor: string | number;
};

export function registrarAbastecimento(entrada: EntradaAbastecimento, storage = storagePadrao(), agora = new Date()): Abastecimento {
  if (!entrada.veiculoId) throw new Error("Selecione o veículo.");
  const data = validarData(entrada.data, agora);
  const hora = validarHora(entrada.hora);
  const p2 = (n: number) => String(n).padStart(2, "0");
  if (data === hojeLocal(agora) && hora > `${p2(agora.getHours())}:${p2(agora.getMinutes())}`) {
    throw new Error("A hora não pode ser futura.");
  }
  const km = inteiro(entrada.km);
  if (km === null) throw new Error("Informe o km do veículo (número inteiro, 0 ou mais).");
  const litros = decimalPositivo(entrada.litros);
  if (litros === null) throw new Error("Informe os litros (número maior que zero, ex.: 40,5).");
  const valor = dinheiroPositivo(entrada.valor);
  if (valor === null) throw new Error("Informe o valor em reais (maior que zero, ex.: 250,00).");
  const conflito = conflitoDeKm(entrada.veiculoId, { data, hora }, km, storage);
  if (conflito) throw new Error(mensagemKm(conflito));
  // Mesmo veículo, data e hora: é o mesmo abastecimento enviado duas vezes.
  if (lerAbastecimentos(storage).some((a) => a.veiculoId === entrada.veiculoId && a.data === data && a.hora === hora)) {
    throw new Error("Já existe um abastecimento deste veículo nesta data e hora.");
  }
  const registro: Abastecimento = { id: novoId(), veiculoId: entrada.veiculoId, data, hora, km, litros, valor, criadoEm: agora.toISOString() };
  alterarLista<Abastecimento>(CHAVE_ABASTECIMENTOS, storage, (lista) => [...lista, registro]);
  return registro;
}

export const removerAbastecimento = (id: string, storage = storagePadrao()): void =>
  alterarLista<Abastecimento>(CHAVE_ABASTECIMENTOS, storage, (lista) => lista.filter((a) => a.id !== id));

export type EntradaManutencao = {
  veiculoId: string;
  data: string;
  km: string | number;
  tipo: string;
  acaoId?: string | null;
  itens?: { subitemId: string; observacao?: string | undefined }[];
  // Vários grupos numa manutenção; sem `grupos`, acaoId e itens valem como um grupo só.
  grupos?: { acaoId: string; itens?: { subitemId: string; observacao?: string | undefined }[] }[];
  local?: string;
  localNome?: string;
  custoPecas?: string | number;
  custoMaoDeObra?: string | number;
  descricao?: string;
};

// Custo em reais, com vírgula decimal; 0 é aceito (manutenção só de mão de obra, ou só de peças).
export function custoNaoNegativo(valor: string | number | undefined): number | null {
  if (valor === undefined || String(valor).trim() === "") return null;
  if (typeof valor === "number") return valor >= 0 && valor <= 999_999.99 ? Math.round(valor * 100) / 100 : null;
  const texto = String(valor).replace(/R\$/gi, "").replace(/\s/g, "");
  const normal = texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto;
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  const n = Number(normal);
  return n <= 999_999.99 ? n : null;
}

// `acoes` são os grupos de Parâmetros > Veículos > Ações de manutenção, cada um com suas ações.
export function registrarManutencao(
  entrada: EntradaManutencao,
  storage = storagePadrao(),
  agora = new Date(),
  acoes: { id: string; nome?: string; subitens: { id: string; nome: string }[] }[] = [],
): ManutencaoVeiculo {
  if (!entrada.veiculoId) throw new Error("Selecione o veículo.");
  if (entrada.tipo !== "Preventiva" && entrada.tipo !== "Corretiva") throw new Error("Escolha o tipo: preventiva ou corretiva.");
  const data = validarData(entrada.data, agora);
  const km = inteiro(entrada.km);
  if (km === null) throw new Error("Informe o km do veículo (número inteiro, 0 ou mais).");
  // Só a corretiva descreve o que está acontecendo com o veículo.
  const descricao = entrada.tipo === "Corretiva" ? String(entrada.descricao ?? "").trim().replace(/\s+/g, " ").slice(0, 300) : "";
  if (entrada.tipo === "Corretiva" && !descricao) throw new Error("Informe a descrição do que está acontecendo com o veículo.");
  const pedidos = entrada.grupos ?? [{ acaoId: entrada.acaoId ?? "", itens: entrada.itens ?? [] }];
  if (pedidos.length === 0) throw new Error("Selecione ao menos um grupo de ações da manutenção.");
  const grupos: GrupoManutencao[] = [];
  for (const pedido of pedidos) {
    const grupo = acoes.find((a) => a.id === pedido.acaoId);
    if (!pedido.acaoId || !grupo) throw new Error("Selecione o grupo de ações da manutenção.");
    if (grupos.some((g) => g.acaoId === grupo.id)) throw new Error(`Grupo repetido: ${grupo.nome ?? "grupo"}.`);
    const itens: ItemManutencao[] = [];
    for (const i of pedido.itens ?? []) {
      const filho = grupo.subitens.find((x) => x.id === i.subitemId);
      if (!filho) throw new Error("Há uma ação que não pertence ao grupo escolhido.");
      if (itens.some((x) => x.subitemId === filho.id)) throw new Error(`Ação repetida: ${filho.nome}.`);
      itens.push({ subitemId: filho.id, nome: filho.nome, observacao: String(i.observacao ?? "").trim().replace(/\s+/g, " ").slice(0, 300) });
    }
    if (grupo.subitens.length > 0 && itens.length === 0) {
      throw new Error(grupo.nome ? `Marque ao menos uma ação do grupo ${grupo.nome}.` : "Marque ao menos uma ação do grupo.");
    }
    grupos.push({ acaoId: grupo.id, nome: grupo.nome ?? "", itens });
  }
  if (entrada.local !== "empresa" && entrada.local !== "terceiro") throw new Error("Informe o local da manutenção: na empresa ou em terceiro.");
  const localNome = entrada.local === "terceiro" ? String(entrada.localNome ?? "").trim().replace(/\s+/g, " ").slice(0, 120) : "";
  if (entrada.local === "terceiro" && !localNome) throw new Error("Informe o local de terceiro onde foi feita a manutenção.");
  const custoPecas = custoNaoNegativo(entrada.custoPecas);
  if (custoPecas === null) throw new Error("Informe o custo das peças em reais (0 se não houve).");
  const custoMaoDeObra = custoNaoNegativo(entrada.custoMaoDeObra);
  if (custoMaoDeObra === null) throw new Error("Informe o custo da mão de obra em reais (0 se não houve).");
  const conflito = conflitoDeKm(entrada.veiculoId, { data }, km, storage);
  if (conflito) throw new Error(mensagemKm(conflito));
  const registro: ManutencaoVeiculo = {
    id: novoId(), veiculoId: entrada.veiculoId, data, km, tipo: entrada.tipo, acaoId: grupos[0]!.acaoId, descricao,
    itens: grupos.flatMap((g) => g.itens), grupos, local: entrada.local, localNome, custoPecas, custoMaoDeObra,
    custoTotal: Math.round((custoPecas + custoMaoDeObra) * 100) / 100, criadoEm: agora.toISOString(),
  };
  alterarLista<ManutencaoVeiculo>(CHAVE_MANUTENCOES, storage, (lista) => [...lista, registro]);
  return registro;
}

export const removerManutencao = (id: string, storage = storagePadrao()): void =>
  alterarLista<ManutencaoVeiculo>(CHAVE_MANUTENCOES, storage, (lista) => lista.filter((m) => m.id !== id));

// Grupos da manutenção; o registro antigo (um grupo só, ou só a descrição) vira uma lista de zero ou um.
export function gruposDaManutencao(m: Pick<ManutencaoVeiculo, "acaoId" | "itens" | "grupos">): GrupoManutencao[] {
  if (m.grupos) return m.grupos;
  return m.acaoId ? [{ acaoId: m.acaoId, nome: "", itens: m.itens ?? [] }] : [];
}

// Texto da manutenção para listas: cada grupo com as suas ações (e a descrição, na corretiva). Registros
// antigos só têm a ação ou só a descrição. `nomeGrupo` busca o nome atual em Parâmetros; se o grupo
// foi apagado, vale o nome guardado no registro.
export function resumoManutencao(
  m: ManutencaoVeiculo,
  nomeGrupo: string | undefined | ((acaoId: string) => string | undefined),
): string {
  const acoes = gruposDaManutencao(m)
    .map((g) => {
      const atual = typeof nomeGrupo === "function" ? nomeGrupo(g.acaoId) : nomeGrupo;
      const nome = atual ?? (g.nome || "Ação removida de Parâmetros");
      const filhos = g.itens.map((i) => i.nome).join(", ");
      return filhos ? `${nome}: ${filhos}` : nome;
    })
    .join("; ");
  return [acoes, m.tipo === "Corretiva" ? m.descricao : ""].filter(Boolean).join(" · ") || "—";
}
