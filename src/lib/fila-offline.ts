// Fila de sincronização: o que o operador registrou sem internet fica guardado neste navegador e é enviado quando a rede volta.
// Só dados e armazenamento (localStorage): a tela decide o que enfileirar e o sincronizador reenvia. Sem armazenamento, nada se perde porque nada é enfileirado (o aviso diz isso).

export type ItemDaFila = { id: string; tipo: string; rotulo: string; payload: unknown; criadoEm: string; tentativas: number };

const CHAVE = "gemape-fila-offline";
export const MAX_NA_FILA = 200;

function ler(): ItemDaFila[] {
  try {
    const bruto: unknown = JSON.parse(globalThis.localStorage?.getItem(CHAVE) ?? "[]");
    return Array.isArray(bruto) ? bruto.filter((i): i is ItemDaFila => !!i && typeof i === "object" && typeof (i as ItemDaFila).id === "string" && typeof (i as ItemDaFila).tipo === "string") : [];
  } catch {
    return [];
  }
}

function guardar(fila: readonly ItemDaFila[]): boolean {
  try {
    globalThis.localStorage?.setItem(CHAVE, JSON.stringify(fila));
    return true;
  } catch {
    return false;
  }
}

export const lerFila = (): ItemDaFila[] => ler();

/** Põe na fila. Devolve false se não deu para guardar (armazenamento cheio/bloqueado ou fila no limite): a tela deve avisar que NÃO foi salvo. */
export function enfileirar(tipo: string, rotulo: string, payload: unknown, agora = new Date()): boolean {
  const fila = ler();
  if (fila.length >= MAX_NA_FILA) return false;
  const id = `${agora.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  return guardar([...fila, { id, tipo, rotulo, payload, criadoEm: agora.toISOString(), tentativas: 0 }]);
}

export function removerDaFila(id: string): void {
  guardar(ler().filter((i) => i.id !== id));
}

function marcarTentativa(id: string): void {
  guardar(ler().map((i) => (i.id === id ? { ...i, tentativas: i.tentativas + 1 } : i)));
}

export type ResultadoSincronia = { enviados: number; falhas: number; restantes: number };

/**
 * Reenvia a fila na ordem em que foi criada. Para no primeiro erro de REDE (a conexão caiu de novo) e mantém o resto;
 * erro de outra natureza (ex.: regra do negócio) conta como falha do item e segue para o próximo, que fica na fila com a tentativa marcada.
 */
export async function sincronizarFila(
  enviar: (item: ItemDaFila) => Promise<void>,
  ehErroDeRede: (erro: unknown) => boolean,
  // Só entram os itens que passam aqui (ex.: os do usuário atual); os demais ficam intocados na fila.
  daVez: (item: ItemDaFila) => boolean = () => true,
): Promise<ResultadoSincronia> {
  let enviados = 0;
  let falhas = 0;
  for (const item of ler().filter(daVez)) {
    try {
      await enviar(item);
      removerDaFila(item.id);
      enviados++;
    } catch (erro) {
      marcarTentativa(item.id);
      if (ehErroDeRede(erro)) break;
      falhas++;
    }
  }
  return { enviados, falhas, restantes: ler().length };
}

// Só "a requisição nem chegou" conta como queda de rede. Tempo esgotado fica de fora: a gravação pode ter acontecido no servidor,
// e reenviar depois duplicaria a entrega. Aceita também o erro em forma de objeto ({ message }), como o Supabase devolve.
export const ehErroDeRede = (erro: unknown): boolean => {
  const texto = erro instanceof Error ? erro.message : typeof erro === "string" ? erro : String((erro as { message?: unknown } | null)?.message ?? "");
  return /failed to fetch|networkerror|network request failed|load failed/i.test(texto);
};
