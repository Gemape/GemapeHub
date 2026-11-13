import { useState } from "react";

import { Input } from "@/components/ui/input";
import { hojeLocal } from "@/lib/empregados";
import { periodoDoAtalho } from "@/lib/periodo-atalho";

// Campo de atalho ao lado das datas do filtro: digite hoje, ontem, 7d ou mes e o período é preenchido na hora.
export function AtalhoPeriodo({ aoEscolher, desativado }: { aoEscolher: (inicio: string, fim: string) => void; desativado?: boolean }) {
  const [texto, setTexto] = useState("");
  const [recusado, setRecusado] = useState(false);
  function aplicar(valor: string, pelaTecla: boolean) {
    const p = periodoDoAtalho(valor, hojeLocal());
    if (p) { aoEscolher(p.inicio, p.fim); setTexto(""); setRecusado(false); }
    else setRecusado(pelaTecla && valor.trim() !== "");
  }
  return (
    <Input
      type="text" className="w-36" placeholder="hoje, ontem, 7d, mes" aria-label="Atalho de período: hoje, ontem, 7d ou mes" autoComplete="off"
      disabled={desativado} value={texto} aria-invalid={recusado || undefined} title={recusado ? "Use hoje, ontem, 7d (últimos 7 dias) ou mes" : undefined}
      // As palavras inteiras aplicam na hora; "7d" só no Enter ou ao sair do campo, para não pegar "1d" no meio de "10d".
      onChange={(e) => { setTexto(e.target.value); setRecusado(false); if (/^\D+$/.test(e.target.value.trim())) aplicar(e.target.value, false); }}
      onBlur={() => { if (texto.trim()) aplicar(texto, true); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicar(texto, true); } }}
    />
  );
}
