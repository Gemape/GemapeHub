// Empregados habilitados para entregar e receber uniformes, escolhidos numa caixa dupla em Parâmetros > Uniformes > Parâmetros Específicos, cada um com a sua área.
// Mesma regra do EPI (empregados-epi.ts), com listas só dos Uniformes: habilitar alguém lá não habilita aqui. Lista vazia = as rotinas oferecem todos os empregados ativos.
import { criarListaDeHabilitados, MAX_AREAS, type Habilitado } from "./empregados-habilitados.ts";

export type HabilitadoUniforme = Habilitado;

// As mesmas áreas da oficina do EPI como ponto de partida; a lista dos Uniformes é própria e pode ganhar áreas à parte.
export const AREAS_UNIFORME_PADRAO: readonly string[] = [
  "Mecânico/montador",
  "Ajudante/lavador",
  "Pintor",
  "Serralheiro/soldador",
  "Auxiliar de serviços gerais",
];
export const MAX_AREAS_UNIFORME = MAX_AREAS;

const lista = criarListaDeHabilitados({ chaveAreas: "gemape-demo-uniforme-areas", chaveEmpregados: "gemape-demo-uniforme-empregados", areasPadrao: AREAS_UNIFORME_PADRAO });

export const lerAreasUniforme = lista.lerAreas;
export const salvarAreasUniforme = lista.salvarAreas;
export const lerEmpregadosDeUniforme = lista.lerEmpregados;
export const salvarEmpregadosDeUniforme = lista.salvarEmpregados;
export const soEmpregadosDeUniforme = lista.soHabilitados;
