import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { mensagemHumana } from "@/lib/erros-humanos";
import { registrarDevolucaoEpi, registrarEntregaEpi } from "@/lib/entrega-epi";
import { ehErroDeRede, lerFila, sincronizarFila, type ItemDaFila } from "@/lib/fila-offline";

const assinar = (aoMudar: () => void) => {
  window.addEventListener("online", aoMudar);
  window.addEventListener("offline", aoMudar);
  return () => { window.removeEventListener("online", aoMudar); window.removeEventListener("offline", aoMudar); };
};
export const useOnline = (): boolean => useSyncExternalStore(assinar, () => navigator.onLine, () => true);

type PayloadEntrega = { devolucao: boolean; entrada: Parameters<typeof registrarEntregaEpi>[1]; responsavel: string; administrador: boolean };

// O que cada tipo da fila faz ao reenviar. Um tipo desconhecido (de uma versão mais nova do sistema) falha e fica na fila.
async function enviar(item: ItemDaFila): Promise<void> {
  if (item.tipo === "entrega-epi") {
    const p = item.payload as PayloadEntrega;
    if (p.devolucao) await registrarDevolucaoEpi(supabase, { ...p.entrada, administrador: p.administrador, responsavel: p.responsavel });
    else await registrarEntregaEpi(supabase, { ...p.entrada, responsavel: p.responsavel });
    return;
  }
  throw new Error(`Tipo de registro guardado não reconhecido: ${item.tipo}`);
}

// Faixa fina no topo, só quando a rede cai (ou quando há registros guardados esperando); reenvia a fila sozinho quando a conexão volta.
export function RedeEFila() {
  const online = useOnline();
  const queryClient = useQueryClient();
  const { canOperate } = useAccess();
  const [pendentes, setPendentes] = useState(() => lerFila().length);
  const enviando = useRef(false);

  const sincronizar = useCallback(async () => {
    if (enviando.current || !navigator.onLine || lerFila().length === 0) return;
    enviando.current = true;
    try {
      const r = await sincronizarFila(enviar, ehErroDeRede);
      if (r.enviados > 0) {
        toast.success(`${r.enviados} registro(s) guardado(s) sem rede foram enviados`);
        queryClient.invalidateQueries();
      }
      if (r.falhas > 0) {
        for (const i of lerFila().filter((x) => x.tentativas > 0)) toast.error(`Não foi possível enviar: ${i.rotulo}`, { description: "Ele continua guardado. Confira o registro e tente de novo." });
      }
      setPendentes(r.restantes);
    } catch (erro) {
      toast.error("Falha ao enviar os registros guardados", { description: mensagemHumana(erro) });
    } finally {
      enviando.current = false;
    }
  }, [queryClient]);

  // Atualiza o contador quando outra aba mexe na fila e tenta enviar quando a rede volta (ou ao abrir, se já há fila).
  useEffect(() => {
    const atualizar = () => setPendentes(lerFila().length);
    window.addEventListener("storage", atualizar);
    return () => window.removeEventListener("storage", atualizar);
  }, []);
  useEffect(() => {
    if (online && canOperate) void sincronizar();
  }, [online, canOperate, sincronizar]);
  // Registro guardado nesta aba enquanto offline: o contador acompanha.
  // Também tenta reenviar de tempos em tempos: a rede pode estar "online" para o navegador mas ter falhado no meio de um envio.
  useEffect(() => {
    let batidas = 0;
    const t = window.setInterval(() => {
      setPendentes(lerFila().length);
      batidas++;
      if (batidas % 5 === 0 && navigator.onLine && canOperate) void sincronizar();
    }, 2000);
    return () => window.clearInterval(t);
  }, [canOperate, sincronizar]);

  if (online && pendentes === 0) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-200 px-3 py-1 text-center text-xs font-medium text-amber-950 print:hidden">
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      {online
        ? `Enviando ${pendentes} registro(s) guardado(s) sem rede…`
        : `Sem conexão — suas alterações serão salvas assim que a rede voltar${pendentes ? ` (${pendentes} guardado(s) neste aparelho)` : ""}`}
    </div>
  );
}
