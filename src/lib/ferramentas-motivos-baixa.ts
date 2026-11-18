// Motivos de baixa das ferramentas, cadastrados em Parâmetros > Ferramentas > Parâmetros Específicos. Valem na baixa da caixa e na reposição.
// Sem lista guardada (ou com armazenamento bloqueado) valem os motivos de sempre. Fase 1: só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa.
import { MOTIVOS_BAIXA_CAIXA } from "./controle-caixa.ts";
import { lerLista, salvarLista } from "./epi-parametros.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-ferramentas-motivos-baixa";

export const lerMotivosBaixaFerramenta = (storage?: StorageLike): string[] => lerLista(CHAVE, MOTIVOS_BAIXA_CAIXA, storage);
export const salvarMotivosBaixaFerramenta = (motivos: string[], storage?: StorageLike): string[] => salvarLista(CHAVE, motivos, storage);
