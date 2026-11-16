// "Monte sua consulta": o gestor marca os campos que quer cruzar (ex.: Cargo + Item + Custo total) e o período, e vê o resultado
// agrupado na hora. A consulta salva fica no perfil de quem a montou (neste navegador).

export type Dimensao = "empresa" | "empregado" | "cargo" | "item" | "tipo" | "mes";
export type Medida = "quantidade" | "custo" | "registros";

export const DIMENSOES: readonly { id: Dimensao; rotulo: string }[] = [
  { id: "empresa", rotulo: "Empresa" },
  { id: "empregado", rotulo: "Empregado" },
  { id: "cargo", rotulo: "Cargo (setor)" },
  { id: "item", rotulo: "Item" },
  { id: "tipo", rotulo: "Tipo de movimento" },
  { id: "mes", rotulo: "Mês" },
];
export const MEDIDAS: readonly { id: Medida; rotulo: string }[] = [
  { id: "quantidade", rotulo: "Quantidade" },
  { id: "custo", rotulo: "Custo total" },
  { id: "registros", rotulo: "Nº de movimentações" },
];

export type MovDaConsulta = {
  data_movimentacao: string; tipo_movimentacao: string; motivo_baixa?: string | null; quantidade: number;
  empresa_id: string | null; empregado_id: string | null; item_id: string | null; preco_unitario_registrado?: number | null;
};
export type Nomes = { empresa: (id: string | null) => string; empregado: (id: string | null) => string; cargo: (id: string | null) => string; item: (id: string | null) => string };
// Que movimentos entram na soma: sem isso, entrada, entrega e devolução se somariam como se fossem a mesma coisa.
export type FiltroMovimento = "entrega" | "entrada" | "devolucao" | "baixa" | "todos";
export const FILTROS_MOVIMENTO: readonly { id: FiltroMovimento; rotulo: string }[] = [
  { id: "entrega", rotulo: "Entregas (consumo)" },
  { id: "entrada", rotulo: "Entradas no estoque" },
  { id: "devolucao", rotulo: "Devoluções" },
  { id: "baixa", rotulo: "Baixas definitivas" },
  { id: "todos", rotulo: "Todos os movimentos" },
];
const ehBaixa = (m: MovDaConsulta) => !!m.motivo_baixa && m.tipo_movimentacao === "Saida";
function entraNoFiltro(m: MovDaConsulta, f: FiltroMovimento): boolean {
  if (f === "todos") return true;
  if (f === "baixa") return ehBaixa(m);
  if (f === "entrega") return m.tipo_movimentacao === "Saida" && !ehBaixa(m);
  return m.tipo_movimentacao === (f === "entrada" ? "Entrada" : "Devolucao");
}
export type Consulta = { dimensoes: Dimensao[]; medidas: Medida[]; inicio: string; fim: string; movimentos?: FiltroMovimento };
export type LinhaConsulta = { chaves: string[]; valores: number[] };

const ROTULO_TIPO: Record<string, string> = { Entrada: "Entrada", Saida: "Entrega", Devolucao: "Devolução", Vistoria: "Vistoria", Transferencia: "Transferência" };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function valorDaDimensao(d: Dimensao, m: MovDaConsulta, n: Nomes): string {
  switch (d) {
    case "empresa": return n.empresa(m.empresa_id);
    case "empregado": return m.empregado_id ? n.empregado(m.empregado_id) : "Sem empregado";
    case "cargo": return m.empregado_id ? n.cargo(m.empregado_id) || "Sem cargo" : "Sem empregado";
    case "item": return n.item(m.item_id);
    case "tipo": return m.motivo_baixa && m.tipo_movimentacao === "Saida" ? `Baixa (${m.motivo_baixa})` : (ROTULO_TIPO[m.tipo_movimentacao] ?? m.tipo_movimentacao);
    case "mes": { const [a, mm] = m.data_movimentacao.slice(0, 7).split("-"); return `${a}-${mm} (${MESES[Number(mm) - 1] ?? "?"}/${a})`; }
  }
}

/** Agrupa pelas dimensões marcadas e soma as medidas; sem dimensão, uma linha só com o total. Maior primeira medida no alto. */
export function montarConsulta(movs: readonly MovDaConsulta[], nomes: Nomes, c: Consulta): LinhaConsulta[] {
  const grupos = new Map<string, LinhaConsulta>();
  for (const m of movs) {
    const dia = m.data_movimentacao.slice(0, 10);
    if ((c.inicio && dia < c.inicio) || (c.fim && dia > c.fim)) continue;
    if (!entraNoFiltro(m, c.movimentos ?? "entrega")) continue;
    const chaves = c.dimensoes.map((d) => valorDaDimensao(d, m, nomes));
    const k = JSON.stringify(chaves);
    const g = grupos.get(k) ?? { chaves, valores: c.medidas.map(() => 0) };
    c.medidas.forEach((me, i) => {
      const q = Number(m.quantidade) || 0;
      g.valores[i]! += me === "quantidade" ? q : me === "custo" ? q * (Number(m.preco_unitario_registrado) || 0) : 1;
    });
    grupos.set(k, g);
  }
  return [...grupos.values()].sort((a, b) => (b.valores[0] ?? 0) - (a.valores[0] ?? 0) || a.chaves.join().localeCompare(b.chaves.join(), "pt-BR"));
}

// ---- consultas salvas no perfil ----
export type ConsultaSalva = Consulta & { id: string; nome: string; modulo: string };
type Armazem = Pick<Storage, "getItem" | "setItem">;
const chave = (dono: string) => `gemape-consultas:${dono}`;
const padrao = (): Armazem | null => { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } };

export function lerConsultas(dono: string, armazem: Armazem | null = padrao()): ConsultaSalva[] {
  try {
    const v = JSON.parse(armazem?.getItem(chave(dono)) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as ConsultaSalva[]).filter((c) => c && typeof c.nome === "string" && Array.isArray(c.dimensoes) && Array.isArray(c.medidas)) : [];
  } catch {
    return [];
  }
}

/** Salva (ou substitui, pelo mesmo nome no mesmo módulo) e devolve a lista nova. */
export function salvarConsulta(dono: string, c: Omit<ConsultaSalva, "id">, armazem: Armazem | null = padrao()): ConsultaSalva[] {
  const nome = c.nome.trim();
  if (!nome) throw new Error("Dê um nome à consulta.");
  if (c.medidas.length === 0) throw new Error("Marque pelo menos um valor para somar.");
  const antes = lerConsultas(dono, armazem);
  const igual = antes.find((x) => x.modulo === c.modulo && x.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"));
  const nova: ConsultaSalva = { ...c, nome, id: igual?.id ?? `c-${Date.now().toString(36)}` };
  const lista = igual ? antes.map((x) => (x.id === igual.id ? nova : x)) : [...antes, nova];
  try { armazem?.setItem(chave(dono), JSON.stringify(lista)); } catch { throw new Error("Não foi possível salvar neste navegador."); }
  return lista;
}

export function removerConsulta(dono: string, id: string, armazem: Armazem | null = padrao()): ConsultaSalva[] {
  const lista = lerConsultas(dono, armazem).filter((x) => x.id !== id);
  try { armazem?.setItem(chave(dono), JSON.stringify(lista)); } catch { /* fica como estava */ }
  return lista;
}
