import { useEffect, useState } from "react";

import { EVENTO_ASSOCIACOES_CHECKLIST, lerAssociacoes, type AssociacaoChecklist } from "./checklist-associacao-veiculo";
import { lerChecklists, type ChecklistVeiculo } from "./checklist-veiculo";
import { lerOcorrenciasVeiculo, type OcorrenciaVeiculo } from "./ocorrencias-veiculo";
import { EVENTO_PLANOS, lerPlanos, type PlanoManutencao } from "./plano-manutencao";
import {
  EVENTO_REGISTROS_VEICULO, lerAbastecimentos, lerManutencoes,
  type Abastecimento, type ManutencaoVeiculo,
} from "./registros-veiculo";

// Lê do navegador (modo demonstração) e atualiza quando outra tela grava.
function useLeitura<T>(ler: () => T, eventos: string[]): T {
  const [valor, setValor] = useState<T>(() => ler());
  useEffect(() => {
    const atualizar = () => setValor(ler());
    atualizar();
    for (const e of [...eventos, "storage"]) window.addEventListener(e, atualizar);
    return () => {
      for (const e of [...eventos, "storage"]) window.removeEventListener(e, atualizar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return valor;
}

export const useAbastecimentos = (): Abastecimento[] =>
  useLeitura(() => lerAbastecimentos(), [EVENTO_REGISTROS_VEICULO]);
export const useManutencoesVeiculo = (): ManutencaoVeiculo[] =>
  useLeitura(() => lerManutencoes(), [EVENTO_REGISTROS_VEICULO]);
export const usePlanosVeiculo = (): PlanoManutencao[] => useLeitura(() => lerPlanos(), [EVENTO_PLANOS]);

export const useOcorrenciasVeiculo = (): OcorrenciaVeiculo[] =>
  useLeitura(() => lerOcorrenciasVeiculo(), [EVENTO_REGISTROS_VEICULO]);

export const useChecklistsVeiculo = (): ChecklistVeiculo[] =>
  useLeitura(() => lerChecklists(), [EVENTO_REGISTROS_VEICULO]);

export const useAssociacoesChecklist = (): AssociacaoChecklist[] =>
  useLeitura(() => lerAssociacoes(), [EVENTO_ASSOCIACOES_CHECKLIST]);
