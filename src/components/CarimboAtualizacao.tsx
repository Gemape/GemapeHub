import { useIsFetching, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import { textoAtualizado } from "@/lib/carimbo-atualizacao";
import { cn } from "@/lib/utils";

// Leitura mais antiga entre os dados abertos na tela (consultas com alguém observando): é a idade real do saldo mostrado,
// mesmo quando o dado veio do cache. Usar a mais antiga evita que outra consulta recém-chegada faça o saldo parecer novo.
function leituraMaisAntiga(qc: QueryClient): number {
  const momentos = qc.getQueryCache().findAll({ type: "active" }).map((q) => q.state.dataUpdatedAt).filter((t) => t > 0);
  return momentos.length ? Math.min(...momentos) : Date.now();
}

// "Atualizado agora mesmo ↻": há quanto tempo os dados desta tela foram lidos do banco, e um botão para ler de novo.
export function CarimboAtualizacao({ className }: { className?: string }) {
  const qc = useQueryClient();
  const buscando = useIsFetching({ type: "active" }) > 0;
  const [em, setEm] = useState(() => leituraMaisAntiga(qc));
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    setEm(leituraMaisAntiga(qc));
    return qc.getQueryCache().subscribe((e) => { if (e.type === "updated") setEm(leituraMaisAntiga(qc)); });
  }, [qc]);
  // O texto envelhece sozinho ("há 2 min") sem precisar mexer na tela.
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <span aria-live="polite">{buscando ? "Atualizando…" : textoAtualizado(em, Math.max(agora, em))}</span>
      <button
        type="button" aria-label="Recarregar os dados desta tela" title="Recarregar"
        disabled={buscando}
        className="inline-flex size-6 max-sm:size-11 items-center justify-center rounded hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        onClick={() => void qc.refetchQueries({ type: "active" })}
      >
        <RotateCw className={cn("size-3.5", buscando && "motion-safe:animate-spin")} aria-hidden="true" />
      </button>
    </span>
  );
}
