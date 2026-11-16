import { useEffect, useRef, useState, type RefObject } from "react";

type Ancora = { id: string; rotulo: string };

const reduzMovimento = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const paiComRolagem = (el: HTMLElement | null): HTMLElement | null => {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
  return null;
};

// Sumário fixo de telas longas: lê as seções marcadas com `data-ancora="Título"` dentro de `raiz`, mostra abas que acompanham a rolagem,
// desliza até a seção ao clicar (sem recarregar) e destaca a seção que está na tela. Com menos de 2 seções não aparece.
// `chave` muda quando o conteúdo troca (outra aba da tela), para o sumário ser lido de novo.
export function MenuAncora({ raiz, chave }: { raiz: RefObject<HTMLElement | null>; chave: string }) {
  const [ancoras, setAncoras] = useState<Ancora[]>([]);
  const [ativa, setAtiva] = useState("");
  // Depois de um clique, a rolagem suave passa por outras seções: a escolhida fica marcada até o movimento acabar (seções perto do fim da tela nunca chegam ao topo).
  const travadaAte = useRef(0);

  useEffect(() => {
    const ler = () => {
      const secoes = [...(raiz.current?.querySelectorAll<HTMLElement>("[data-ancora]") ?? [])];
      secoes.forEach((s, i) => { if (!s.id) s.id = `ancora-${chave}-${i}`; });
      const novas = secoes.map((s) => ({ id: s.id, rotulo: s.dataset["ancora"] ?? "" }));
      setAncoras((antes) => (JSON.stringify(antes) === JSON.stringify(novas) ? antes : novas));
      setAtiva((a) => (secoes.some((s) => s.id === a) ? a : (secoes[0]?.id ?? "")));
    };
    ler();
    // seções que chegam depois (dados lidos de forma assíncrona) ou que aparecem e somem com a escolha da pessoa: relê quando o conteúdo muda
    let espera = 0;
    const olho = new MutationObserver(() => { window.clearTimeout(espera); espera = window.setTimeout(ler, 80); });
    if (raiz.current) olho.observe(raiz.current, { childList: true, subtree: true });
    return () => { window.clearTimeout(espera); olho.disconnect(); };
  }, [raiz, chave]);

  useEffect(() => {
    const rolagem = paiComRolagem(raiz.current);
    if (!rolagem || ancoras.length < 2) return;
    const aoRolar = () => {
      if (Date.now() < travadaAte.current) return;
      const topo = rolagem.getBoundingClientRect().top + 72;
      let atual = ancoras[0]?.id ?? "";
      for (const a of ancoras) {
        const el = document.getElementById(a.id);
        if (el && el.getBoundingClientRect().top <= topo) atual = a.id;
      }
      setAtiva(atual);
    };
    rolagem.addEventListener("scroll", aoRolar, { passive: true });
    return () => rolagem.removeEventListener("scroll", aoRolar);
  }, [raiz, ancoras]);

  if (ancoras.length < 2) return null;
  return (
    <nav aria-label="Seções desta tela" className="sticky top-0 z-10 -mx-1 mb-4 flex gap-1 overflow-x-auto bg-background/85 px-1 py-2 backdrop-blur">
      {ancoras.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-current={a.id === ativa ? "true" : undefined}
          onClick={() => {
            travadaAte.current = Date.now() + 900;
            setAtiva(a.id);
            document.getElementById(a.id)?.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth", block: "start" });
          }}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${a.id === ativa ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-primary/10"}`}
        >
          {a.rotulo}
        </button>
      ))}
    </nav>
  );
}
