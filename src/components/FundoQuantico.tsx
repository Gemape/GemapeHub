import { useEffect, useRef, useState } from "react";

// Efeito de fundo da página pública (vitrine): um núcleo de energia azul, com anéis inclinados que giram, uma nuvem de partículas em órbita (em perspectiva, acompanhando o
// ponteiro) e fitas de luz que ondulam. Só desenha luz sobre o azul da página, sem texto nem moldura. Para quando a aba fica oculta e fica parado (um quadro) para quem reduz movimento.
const PARTICULAS = 320;
type Particula = { a: number; r: number; y: number; v: number; t: number };

// Sobre fundo claro (tela inicial do sistema) a luz soma (`lighter`) não aparece: ali o desenho usa as mesmas formas em azul mais fundo, por cima do fundo.
function tinta(claro: boolean, r: number, g: number, b: number, a: number) {
  return claro ? `rgba(${Math.round(r * 0.3)},${Math.round(g * 0.45)},${Math.round(b * 0.9)},${a * 0.85})` : `rgba(${r},${g},${b},${a})`;
}

function desenhar(ctx: CanvasRenderingContext2D, w: number, h: number, tempo: number, particulas: Particula[], ponteiro: { x: number; y: number }, claro: boolean) {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = claro ? "source-over" : "lighter";
  // Fitas de luz: ondas largas que se cruzam atrás do núcleo.
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const y = h * (0.45 + 0.1 * (k - 1)) + Math.sin(x * 0.004 + tempo * (0.5 + k * 0.17) + k * 2) * h * 0.12 + Math.sin(x * 0.011 - tempo * 0.4) * h * 0.025;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = tinta(claro, 110 + k * 30, 170 + k * 20, 255, 0.2 - k * 0.04);
    ctx.lineWidth = 12 - k * 3;
    ctx.shadowColor = tinta(claro, 130, 185, 255, 0.9);
    ctx.shadowBlur = 10;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  const cx = w / 2 + ponteiro.x * w * 0.03;
  const cy = h * 0.42 + ponteiro.y * h * 0.03;
  const escala = Math.min(w, h) * 0.36;
  const giro = tempo * 0.3 + ponteiro.x * 0.8;
  const inclina = 0.35 + ponteiro.y * 0.5;

  // Brilho do núcleo, que pulsa devagar.
  const pulso = 1 + Math.sin(tempo * 1.6) * 0.08;
  const brilho = ctx.createRadialGradient(cx, cy, 0, cx, cy, escala * 1.1 * pulso);
  brilho.addColorStop(0, tinta(claro, 220, 238, 255, claro ? 0.5 : 0.8));
  brilho.addColorStop(0.2, tinta(claro, 120, 180, 255, claro ? 0.25 : 0.4));
  brilho.addColorStop(1, tinta(claro, 40, 90, 255, 0));
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, w, h);

  // Anéis: círculos inclinados, projetados em elipses que giram.
  for (let r = 0; r < 3; r++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(giro * (r % 2 ? -0.6 : 0.8) + r * 1.05);
    ctx.scale(1, 0.28 + 0.2 * Math.abs(Math.sin(inclina + r * 0.9 + tempo * 0.25)));
    ctx.beginPath();
    ctx.arc(0, 0, escala * (0.55 + r * 0.25), 0, Math.PI * 2);
    ctx.strokeStyle = tinta(claro, 150 + r * 30, 200 + r * 15, 255, 0.7 - r * 0.15);
    ctx.lineWidth = 2.2 - r * 0.4;
    ctx.shadowColor = tinta(claro, 120, 180, 255, 1);
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // Partículas em órbita (perspectiva simples: o fundo da nuvem é menor e mais fraco).
  const cosI = Math.cos(inclina);
  const sinI = Math.sin(inclina);
  for (const p of particulas) {
    const ang = p.a + giro * p.v;
    const x3 = Math.cos(ang) * p.r;
    const z3 = Math.sin(ang) * p.r;
    const y3 = p.y * p.r;
    const yi = y3 * cosI - z3 * sinI;
    const zi = y3 * sinI + z3 * cosI;
    const f = 1 / (1 - zi * 0.45);
    const px = cx + x3 * escala * 1.9 * f;
    const py = cy + yi * escala * 1.9 * f;
    const brilhoP = (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(tempo * 2 + p.t))) * Math.min(1, f * 0.9);
    ctx.fillStyle = tinta(claro, 190, 225, 255, brilhoP);
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.5, 1.6 * f), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

export function FundoQuantico({ claro = false }: { claro?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // "Reduzir movimento" é acompanhado ao vivo: ligar ou desligar no sistema para ou retoma a animação sem recarregar a página.
  const [parado, setParado] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => setParado(m.matches);
    ler();
    m.addEventListener("change", ler);
    return () => m.removeEventListener("change", ler);
  }, []);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const particulas: Particula[] = Array.from({ length: window.innerWidth < 640 ? PARTICULAS / 2 : PARTICULAS }, () => ({ a: Math.random() * Math.PI * 2, r: 0.35 + Math.random() * 0.75, y: (Math.random() - 0.5) * 0.9, v: 0.4 + Math.random() * 1.1, t: Math.random() * 6.28 }));
    const ponteiro = { x: 0, y: 0 };
    let w = 0;
    let h = 0;
    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth; h = el.clientHeight;
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    const redim = new ResizeObserver(() => { medir(); if (parado) desenhar(ctx, w, h, 2, particulas, ponteiro, claro); });
    redim.observe(el);
    if (parado) { desenhar(ctx, w, h, 2, particulas, ponteiro, claro); return () => redim.disconnect(); }

    const mover = (e: PointerEvent) => { ponteiro.x = (e.clientX / window.innerWidth - 0.5) * 2; ponteiro.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("pointermove", mover);
    let id = 0;
    const inicio = performance.now();
    // 30 quadros por segundo bastam para o movimento lento e custam metade (o vidro por cima precisa refazer o desfoque a cada quadro).
    let ultimo = 0;
    const passo = (agora: number) => {
      if (!document.hidden && agora - ultimo >= 33) { ultimo = agora; desenhar(ctx, w, h, (agora - inicio) / 1000, particulas, ponteiro, claro); }
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => { cancelAnimationFrame(id); window.removeEventListener("pointermove", mover); redim.disconnect(); };
  }, [parado, claro]);

  // Fixo na janela: o núcleo fica no lugar enquanto a página rola, atrás do vidro dos cartões.
  // Na tela clara o fundo fica atrás de todo o conteúdo (camada negativa), sem depender de cada elemento da tela ter `relative z-10`.
  return <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none fixed inset-0 size-full ${claro ? "-z-10" : "z-0"}`} />;
}
