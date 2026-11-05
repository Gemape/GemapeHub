// Empregados habilitados para entregar e receber EPI, escolhidos numa caixa dupla em Parâmetros > EPI > Parâmetros Específicos, cada um com a sua área na oficina.
// A lista é só de EPI (as de Veículos, Viagens e Uniformes são outras). Lista vazia = sem restrição: as rotinas oferecem todos os empregados ativos.
// As áreas da oficina também são cadastradas ali e podem ganhar novas opções. A regra é a de empregados-habilitados.ts, com as chaves do EPI.
import { criarListaDeHabilitados, MAX_AREAS, type Habilitado } from "./empregados-habilitados.ts";

export type HabilitadoEpi = Habilitado;

export const AREAS_EPI_PADRAO: readonly string[] = [
  "Mecânico/montador",
  "Ajudante/lavador",
  "Pintor",
  "Serralheiro/soldador",
  "Auxiliar de serviços gerais",
];
export const MAX_AREAS_EPI = MAX_AREAS;

const lista = criarListaDeHabilitados({ chaveAreas: "gemape-demo-epi-areas", chaveEmpregados: "gemape-demo-epi-empregados", areasPadrao: AREAS_EPI_PADRAO });

export const lerAreasEpi = lista.lerAreas;
export const salvarAreasEpi = lista.salvarAreas;
export const lerEmpregadosDeEpi = lista.lerEmpregados;
export const salvarEmpregadosDeEpi = lista.salvarEmpregados;
export const soEmpregadosDeEpi = lista.soHabilitados;
export const listaDeEpiDesatualizada = lista.listaDesatualizada;
