// Área do responsável de um check list (decisão 310): Oficina (técnicos), PCM ou Administrativo, a mesma informação das caixas duplas de Parâmetros Específicos.
// Vale primeiro a lista de empregados das rotinas de veículos; para quem não está nela, a lista de habilitados de Viagens; sem nenhuma, "Sem área".
import { lerEmpregadosDeVeiculos } from "./empregados-veiculos.ts";
import { ID_HABILITADOS, lerEstado, type AreaViagem, type Habilitado } from "./questionario-despesas.ts";

export type GrupoDeArea = "Técnicos" | "PCM" | "Administrativo" | "Sem área";
export const GRUPOS_DE_AREA: readonly GrupoDeArea[] = ["Técnicos", "PCM", "Administrativo", "Sem área"];
const GRUPO_DA_AREA: Record<AreaViagem, GrupoDeArea> = { Oficina: "Técnicos", PCM: "PCM", Administrativo: "Administrativo" };

const normalizar = (nome: string) => nome.trim().toLocaleLowerCase("pt-BR");

// Devolve a função que diz a que grupo pertence um responsável pelo nome (o check list guarda o nome).
export function grupoDeAreaPorNome(listas?: Habilitado[][]): (nome: string) => GrupoDeArea {
  let fontes = listas;
  if (!fontes) {
    let viagens: Habilitado[] = [];
    try { viagens = lerEstado().perguntas.find((p) => p.id === ID_HABILITADOS)?.habilitados ?? []; } catch { viagens = []; }
    fontes = [lerEmpregadosDeVeiculos(), viagens];
  }
  const mapa = new Map<string, GrupoDeArea>();
  for (const lista of fontes) for (const h of lista) if (!mapa.has(normalizar(h.nome))) mapa.set(normalizar(h.nome), GRUPO_DA_AREA[h.area]);
  return (nome) => mapa.get(normalizar(nome)) ?? "Sem área";
}
