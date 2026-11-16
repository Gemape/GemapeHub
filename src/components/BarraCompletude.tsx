import { useEffect, useRef, useState } from "react";

import { calcularCompletude, type CampoDeCompletude } from "@/lib/completude";

// Barra no topo do formulário: "Cadastro 85% completo — falta o RENAVAM". Clicar no que falta leva o cursor ao campo. Lê o formulário em que está (os campos são não controlados).
export function BarraCompletude({ campos, nome = "Cadastro" }: { campos: readonly CampoDeCompletude[]; nome?: string }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [resultado, setResultado] = useState(() => calcularCompletude({}, campos));
  useEffect(() => {
    const form = raiz.current?.closest("form");
    if (!form) return;
    const ler = () => {
      const dados = new FormData(form);
      const valores = Object.fromEntries(campos.map((c) => [c.id, String(dados.get(c.id) ?? "")]));
      setResultado(calcularCompletude(valores, campos));
    };
    ler();
    // Os valores iniciais chegam um instante depois de abrir (campos de seleção); lê de novo.
    const t = window.setTimeout(ler, 150);
    form.addEventListener("input", ler);
    form.addEventListener("change", ler);
    return () => { window.clearTimeout(t); form.removeEventListener("input", ler); form.removeEventListener("change", ler); };
  }, [campos]);
  const { pct, faltam } = resultado;
  const ir = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  };
  return (
    <div ref={raiz} className="space-y-1.5 rounded-md border bg-muted/40 px-3 py-2 sm:col-span-2">
      <p className="text-xs">
        <strong>{nome} {pct}% completo</strong>
        {faltam.length > 0 && <> — falta{faltam.length > 1 ? "m" : ""}:{" "}
          {faltam.map((c, i) => (
            <span key={c.id}>{i > 0 && ", "}<button type="button" onClick={() => ir(c.id)} className="font-medium text-primary underline underline-offset-2">{c.rotulo}</button></span>
          ))}
        </>}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${nome} ${pct}% completo`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
