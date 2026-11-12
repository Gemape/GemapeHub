import { useEffect, useRef, useState } from "react";

// Efeito de letras "decodificando": cada letra aparece como um símbolo que embaralha até virar a letra certa, da esquerda para a direita (o efeito do título do site Edolus).
// Roda ao carregar e de novo quando o ponteiro passa por cima. O texto de verdade fica na página (invisível, para leitores de tela e para reservar o espaço); a camada
// animada fica por cima e é escondida dos leitores. Para quem reduz movimento, o texto aparece pronto.
const SIMBOLOS = "_{}<>[]*^/\\+=-#!?01";

const reduzMovimento = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TextoDecodificado({ texto, destaque, className = "", duracao = 1800 }: { texto: string; destaque?: string; className?: string; duracao?: number }) {
  const [rodada, setRodada] = useState(0);
  const [prontos, setProntos] = useState(0);
  // Os símbolos de cada quadro são sorteados no passo da animação (não no desenho): no primeiro desenho (servidor e hidratação) todos são "_".
  const [simbolos, setSimbolos] = useState<string[]>(() => texto.split("").map(() => "_"));
  const rodando = useRef(false);

  useEffect(() => {
    if (reduzMovimento()) { setProntos(texto.length); return; }
    rodando.current = true;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      // Começa devagar e acelera, para o início parecer ruído e o fim, uma revelação.
      setProntos(Math.floor(t * t * texto.length));
      setSimbolos(texto.split("").map(() => SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)]!));
      if (t < 1) quadro = requestAnimationFrame(passo); else { setProntos(texto.length); rodando.current = false; }
    };
    quadro = requestAnimationFrame(passo);
    return () => { cancelAnimationFrame(quadro); rodando.current = false; };
  }, [texto, duracao, rodada]);

  const inicioDoDestaque = destaque ? texto.lastIndexOf(destaque) : -1;
  const letras = texto.split("").map((c, i) => {
    const pronto = c === " " || i < prontos;
    return <span key={i} className={pronto ? "" : "text-white/60"}>{pronto ? c : simbolos[i]}</span>;
  });
  // O degradê é um só, na palavra inteira (as letras ainda não reveladas mantêm a cor própria por cima).
  const camada = inicioDoDestaque < 0 ? letras : [
    ...letras.slice(0, inicioDoDestaque),
    <span key="destaque" className="bg-gradient-to-r from-white via-[oklch(0.85_0.1_240)] to-white bg-clip-text text-transparent">{letras.slice(inicioDoDestaque)}</span>,
  ];

  return (
    <h1 className={`relative ${className}`} onMouseEnter={() => { if (!rodando.current && !reduzMovimento()) setRodada((r) => r + 1); }}>
      <span className="opacity-0">{texto}</span>
      <span aria-hidden="true" className="absolute inset-0">{camada}</span>
    </h1>
  );
}
