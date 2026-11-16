import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

// Ciclador de ícones: os ícones do assunto se alternam no mesmo lugar (um some, o outro aparece, só por opacidade).
// Pausa com a aba escondida; com "reduzir movimento", fica só o primeiro. Quem usa dá o espaço (ver `medalhao-cartao` e `icone-alternado` em styles.css).
const INTERVALO_CICLO_MS = 2600;
export function CicladorDeIcones({ icones, atrasoMs }: { icones: readonly LucideIcon[]; atrasoMs: number }) {
  const [atual, setAtual] = useState(0);
  useEffect(() => {
    if (icones.length < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let intervalo: number | undefined;
    // Cada lugar começa num tempo diferente: os ícones não trocam todos juntos.
    const inicio = window.setTimeout(() => {
      intervalo = window.setInterval(() => { if (!document.hidden) setAtual((i) => (i + 1) % icones.length); }, INTERVALO_CICLO_MS);
    }, atrasoMs);
    return () => { window.clearTimeout(inicio); window.clearInterval(intervalo); };
  }, [icones.length, atrasoMs]);
  return (
    <>
      {icones.map((I, i) => (
        <I key={i} aria-hidden="true" strokeWidth={1.6} data-ciclo={i === atual ? "ativo" : "espera"} />
      ))}
    </>
  );
}
