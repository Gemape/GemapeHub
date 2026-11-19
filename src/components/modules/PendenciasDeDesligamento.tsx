import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  alertasAbertos, EVENTO_ALERTAS_DESLIGAMENTO, lerAlertasDeDesligamento, portadoresDesligados, resolverAlertaDeDesligamento,
} from "@/lib/desligamento-pendencias";
import { hojeLocal } from "@/lib/empregados";
import { formatarData } from "@/lib/gemape";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";

type Empregado = { id: string; nome: string; ativo: boolean; data_demissao: string | null };

// Cadastro de empregados > pendências do desligamento: o supervisor que precisa substituir o empregado desligado e as caixas cujo portador foi desligado (desvincular na hora).
export function PendenciasDeDesligamento({ empregados }: { empregados: readonly Empregado[] }) {
  // Lido depois de montar (o armazenamento é do navegador), para não divergir do HTML do servidor.
  const [alertas, setAlertas] = useState<ReturnType<typeof alertasAbertos>>([]);
  useEffect(() => {
    const atualizar = () => setAlertas(alertasAbertos(lerAlertasDeDesligamento()));
    atualizar();
    window.addEventListener(EVENTO_ALERTAS_DESLIGAMENTO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => { window.removeEventListener(EVENTO_ALERTAS_DESLIGAMENTO, atualizar); window.removeEventListener("storage", atualizar); };
  }, []);
  const portadores = portadoresDesligados(usePortadoresCaixa(), empregados, hojeLocal());
  if (alertas.length === 0 && portadores.length === 0) return null;

  return (
    <section aria-labelledby="pendencias-desligamento" className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h2 id="pendencias-desligamento" className="text-sm font-semibold text-destructive">Pendências de desligamento ({alertas.length + portadores.length})</h2>
      {portadores.length > 0 && (
        <ul className="space-y-2" aria-label="Caixas com portador desligado">
          {portadores.map((p) => (
            <li key={p.registroId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span><strong>{p.caixaCodigo}</strong>: o portador {p.empregadoNome} foi desligado{p.dataDemissao ? ` em ${formatarData(p.dataDemissao)}` : ""}. Desvincule a caixa agora e faça a vistoria de encerramento.</span>
              <Button asChild size="sm" variant="outline"><Link to="/ferramentas" search={{ aba: "vinculacao-portador" }}>Desvincular portador</Link></Button>
            </li>
          ))}
        </ul>
      )}
      {alertas.length > 0 && (
        <ul className="space-y-2" aria-label="Substituições pelo supervisor">
          {alertas.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {a.supervisorNome
                  ? <><strong>{a.supervisorNome}</strong>, substitua {a.empregadoNome} (desligado em {formatarData(a.dataDesligamento)}) nos locais onde ele era responsável por alguma tarefa.</>
                  : <>{a.empregadoNome} (desligado em {formatarData(a.dataDesligamento)}) não tinha supervisor cadastrado: defina quem o substitui nos locais onde era responsável por alguma tarefa.</>}
              </span>
              <Button requiresWrite="operar" size="sm" variant="outline" onClick={() => { resolverAlertaDeDesligamento(a.id, new Date().toISOString()); toast.success("Substituição marcada como feita."); }}>Marcar como substituído</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
