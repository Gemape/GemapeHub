import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { useAccess } from "@/lib/access-context";

// Estoque mínimo editado no próprio campo da tabela, com as setas do campo numérico (decisão 416). Grava ao sair do campo, ao teclar Enter ou 0,8 s depois da última mudança (setas);
// valor inválido volta ao que estava. Quem só consulta (sem permissão de escrita) vê o número.
export function MinimoEditavel({ valor, rotulo, onSalvar }: { valor: number; rotulo: string; onSalvar: (texto: string) => boolean }) {
  const { canWrite } = useAccess();
  const [rascunho, setRascunho] = useState(String(valor));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setRascunho(String(valor)), [valor]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!canWrite) return <>{valor}</>;

  function gravar(texto: string) {
    if (timer.current) clearTimeout(timer.current);
    if (texto.trim() === String(valor)) return;
    if (!onSalvar(texto)) setRascunho(String(valor));
  }
  return (
    <Input
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      aria-label={`Estoque mínimo de ${rotulo}`}
      className="h-8 w-20 text-left"
      value={rascunho}
      onChange={(e) => {
        setRascunho(e.target.value);
        if (timer.current) clearTimeout(timer.current);
        const texto = e.target.value;
        timer.current = setTimeout(() => gravar(texto), 800);
      }}
      onBlur={(e) => gravar(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") gravar(e.currentTarget.value); }}
    />
  );
}
