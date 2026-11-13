import { Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { BATIMENTO_MS, frasePresenca, presentes, registrarSinal, type Presenca } from "@/lib/presenca-registro";
import { usuarioAtivo } from "@/lib/permissoes-demo";

const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

/**
 * Aviso de edição simultânea: se outra pessoa (ou outra aba deste navegador) está com o mesmo registro aberto,
 * mostra uma faixa pequena. `chave` identifica o registro (ex.: "veiculo:<id>"); sem chave, nada acontece.
 * Mesmo navegador: BroadcastChannel (com o nome do usuário). Entre aparelhos (produção): presença em tempo real do Supabase,
 * que não cria tabela nem grava dado e NÃO leva nome (o canal não é privado; endurecer exige política de Realtime no Supabase, que depende de ordem do responsável).
 */
export function AvisoEdicaoSimultanea({ chave }: { chave: string | null }) {
  const { perfil } = useAccessNome();
  const meuId = useMemo(() => Math.random().toString(36).slice(2), []);
  const [nomes, setNomes] = useState<string[]>([]);

  useEffect(() => {
    if (!chave) return;
    const mapa: Presenca = new Map();
    const atualizar = () => setNomes(presentes(mapa, Date.now()));
    const nome = perfil;
    let canalLocal: BroadcastChannel | null = null;
    let canalNuvem: ReturnType<typeof supabase.channel> | null = null;
    let lerNuvem: (() => void) | null = null;

    if (typeof BroadcastChannel !== "undefined") {
      canalLocal = new BroadcastChannel(`gemape-presenca:${chave}`);
      const anunciar = () => canalLocal?.postMessage({ id: meuId, nome });
      canalLocal.onmessage = (e: MessageEvent<{ id?: string; nome?: string; responder?: boolean }>) => {
        if (!e.data?.id) return;
        registrarSinal(mapa, e.data.id, e.data.nome ?? "", meuId, Date.now());
        if (e.data.responder) anunciar(); // quem acabou de abrir pede que os outros se anunciem
        atualizar();
      };
      canalLocal.postMessage({ id: meuId, nome, responder: true });
    }
    if (!MODO_DEMO && typeof supabase.channel === "function") {
      canalNuvem = supabase.channel(`presenca:${chave}`, { config: { presence: { key: meuId } } });
      lerNuvem = () => {
        const estado = canalNuvem?.presenceState() as Record<string, { nome?: string }[]> | undefined;
        // Quem não está mais no estado saiu; quem está tem o carimbo renovado (o evento "sync" só vem quando alguém entra ou sai).
        for (const id of [...mapa.keys()]) if (!(id in (estado ?? {}))) mapa.delete(id);
        // Na nuvem não circula nome de ninguém: o canal é aberto a quem conhece o código do registro, então o aviso é genérico.
        for (const id of Object.keys(estado ?? {})) registrarSinal(mapa, id, "", meuId, Date.now());
        atualizar();
      };
      canalNuvem
        .on("presence", { event: "sync" }, () => lerNuvem?.())
        .subscribe((status) => { if (status === "SUBSCRIBED") void canalNuvem?.track({ em: Date.now() }); });
    }

    const batimento = window.setInterval(() => {
      canalLocal?.postMessage({ id: meuId, nome });
      if (lerNuvem) lerNuvem();
      else atualizar();
    }, BATIMENTO_MS);
    return () => {
      window.clearInterval(batimento);
      canalLocal?.close();
      if (canalNuvem) void supabase.removeChannel(canalNuvem);
    };
  }, [chave, meuId, perfil]);

  const frase = frasePresenca(nomes);
  if (!frase) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-950">
      <Users className="size-3.5 shrink-0" aria-hidden="true" />{frase}
    </p>
  );
}

// Nome mostrado ao outro usuário: o da conta (produção) ou o usuário de teste (demonstração).
function useAccessNome(): { perfil: string } {
  const { perfil } = useAccess() as { perfil?: { nome?: string | null } | null };
  const demo = MODO_DEMO && typeof localStorage !== "undefined" ? usuarioAtivo(localStorage).nome : "";
  return { perfil: (MODO_DEMO ? demo : perfil?.nome) || "Outro usuário" };
}
