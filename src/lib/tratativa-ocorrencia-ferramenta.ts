// Situação e tratativa das ocorrências de Ferramentas, como em Veículos e Equipamentos: Aberta (sem tratativa), Em tratativa (salvou) e Encerrada.
// A tabela `ocorrencias` do banco real não tem esses campos; na Fase 1 ficam só no navegador (modo demonstração), por id da ocorrência. Tabela no banco = pendência da Fase 2.
type StorageLike = Pick<Storage, "getItem" | "setItem">;
export const CHAVE_TRATATIVAS_FERRAMENTA = "gemape-demo-ferramentas-tratativas";
export const EVENTO_TRATATIVAS_FERRAMENTA = "gemape-tratativas-ferramenta";

export type SituacaoOcorrenciaFerramenta = "Aberta" | "Em tratativa" | "Encerrada";
export type TratativaFerramenta = { situacao: "Em tratativa" | "Encerrada"; responsavel: string; descricao: string; reposta: boolean; atualizadaEm: string; encerradaEm: string | null; /** Quando a tratativa começou; não muda ao regravar nem ao encerrar. Tratativas antigas não têm. */ iniciadaEm?: string };

const padrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);

export function lerTratativas(storage: StorageLike | null = padrao()): Record<string, TratativaFerramenta> {
  try {
    const bruto = storage?.getItem(CHAVE_TRATATIVAS_FERRAMENTA);
    const lido: unknown = bruto ? JSON.parse(bruto) : {};
    return lido && typeof lido === "object" && !Array.isArray(lido) ? (lido as Record<string, TratativaFerramenta>) : {};
  } catch { return {}; }
}

export const situacaoDaOcorrencia = (t: TratativaFerramenta | undefined): SituacaoOcorrenciaFerramenta => t?.situacao ?? "Aberta";

export type EntradaTratativa = { responsavel: string; descricao: string; reposta: boolean; encerrar: boolean };

/** Grava a tratativa: salvar mantém "Em tratativa"; encerrar fecha. Encerrada só muda se `admin`. Devolve o erro em texto ou null. */
export function salvarTratativa(ocorrenciaId: string, e: EntradaTratativa, agora: string, admin: boolean, storage: StorageLike | null = padrao()): string | null {
  if (!storage) return "Armazenamento indisponível.";
  const responsavel = e.responsavel.trim();
  const descricao = e.descricao.trim();
  if (!responsavel) return "Informe o responsável pela tratativa.";
  if (!descricao) return "Descreva a tratativa.";
  const todas = lerTratativas(storage);
  const atual = todas[ocorrenciaId];
  if (atual?.situacao === "Encerrada" && !admin) return "Tratativa encerrada: só o Administrador pode alterar.";
  // Administrador corrigindo uma tratativa já encerrada sem marcar encerrar: continua encerrada, com a data original.
  const continuaEncerrada = atual?.situacao === "Encerrada" && !e.encerrar;
  todas[ocorrenciaId] = continuaEncerrada
    ? { ...atual, responsavel, descricao, reposta: e.reposta, atualizadaEm: agora }
    : { situacao: e.encerrar ? "Encerrada" : "Em tratativa", responsavel, descricao, reposta: e.reposta, atualizadaEm: agora, encerradaEm: e.encerrar ? agora : null, iniciadaEm: atual?.iniciadaEm ?? atual?.atualizadaEm ?? agora };
  storage.setItem(CHAVE_TRATATIVAS_FERRAMENTA, JSON.stringify(todas));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_TRATATIVAS_FERRAMENTA));
  return null;
}
