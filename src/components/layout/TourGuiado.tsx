import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDonoDosAtalhos } from "@/components/inicio/atalhosPessoais";
import { jaViuTour, marcarTourVisto, passosVisiveis, TOURS, type PassoTour } from "@/lib/tour";

const seletor = (alvo: string) => `[data-tour="${alvo}"]`;

// Tour de primeiro acesso: na primeira vez que o usuário abre um módulo (e a tela tem os botões do tour), destaca 3 ou 4 pontos
// com balões numerados. "Pular tutorial" (ou Esc) encerra e não mostra de novo para este usuário neste módulo.
export function TourGuiado({ modulo, aba }: { modulo: string; aba: string | undefined }) {
  const dono = useDonoDosAtalhos();
  const [passos, setPassos] = useState<PassoTour[]>([]);
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState<DOMRect | null>(null);
  const botao = useRef<HTMLButtonElement>(null);

  // Procura os alvos depois que a tela desenhou (as abas carregam o conteúdo na hora); só começa se ainda não foi visto.
  useEffect(() => {
    setPassos([]);
    setIndice(0);
    const dados = TOURS[modulo];
    if (!dados || !dono || jaViuTour(typeof localStorage === "undefined" ? null : localStorage, dono, modulo)) return;
    const t = window.setTimeout(() => setPassos(passosVisiveis(dados, (a) => !!document.querySelector(seletor(a)))), 700);
    return () => window.clearTimeout(t);
  }, [modulo, aba, dono]);

  const passo = passos[indice];
  const encerrar = useCallback(() => {
    marcarTourVisto(typeof localStorage === "undefined" ? null : localStorage, dono, modulo);
    setPassos([]);
  }, [dono, modulo]);

  const medir = useCallback(() => {
    const el = passo ? document.querySelector(seletor(passo.alvo)) : null;
    setCaixa(el ? el.getBoundingClientRect() : null);
  }, [passo]);

  // Rola até o alvo uma vez por passo; as remedições (rolagem, redimensionar) só reposicionam, sem rolar de novo.
  useLayoutEffect(() => {
    if (passo) document.querySelector(seletor(passo.alvo))?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [passo]);

  useLayoutEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => { window.removeEventListener("resize", medir); window.removeEventListener("scroll", medir, true); };
  }, [medir]);

  useEffect(() => {
    if (!passo) return;
    botao.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") encerrar(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [passo, encerrar]);

  if (!passo || !caixa) return null;
  const ultimo = indice === passos.length - 1;
  const abaixo = caixa.bottom + 190 < window.innerHeight;
  const esquerda = Math.max(12, Math.min(caixa.left, window.innerWidth - 332));
  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      {/* Bloqueia cliques no fundo e escurece tudo, menos o alvo (a sombra enorme do próprio destaque). */}
      <div className="absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute rounded-md ring-2 ring-primary" style={{ top: caixa.top - 4, left: caixa.left - 4, width: caixa.width + 8, height: caixa.height + 8, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.5)" }} />
      <div role="dialog" aria-label={`Tutorial, passo ${indice + 1} de ${passos.length}`} className="absolute w-80 max-w-[calc(100vw-1.5rem)] space-y-2 rounded-lg border bg-background p-4 text-sm shadow-xl" style={{ left: esquerda, top: abaixo ? caixa.bottom + 12 : Math.max(12, caixa.top - 12 - 170) }}>
        <p className="font-semibold">{passo.titulo}</p>
        <p className="text-muted-foreground">{passo.texto}</p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" onClick={encerrar} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">Pular tutorial</button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{indice + 1} de {passos.length}</span>
            <Button ref={botao} type="button" size="sm" onClick={() => (ultimo ? encerrar() : setIndice(indice + 1))}>{ultimo ? "Concluir" : "Próximo"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
