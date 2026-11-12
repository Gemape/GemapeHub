import { FundoQuantico } from "@/components/FundoQuantico";

// O fundo das telas de entrada (página pública e login): manchas de luz que derivam, o núcleo de energia animado e, por cima, um vidro fosco que preenche a janela inteira.
// Tudo fica fixo e atrás do conteúdo (que precisa de `relative z-10`); quem reduz movimento recebe tudo parado.
export function FundoVidroQuantico({ claro = false }: { claro?: boolean }) {
  return (
    <>
      {!claro && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="mancha-luz mancha-a -left-24 top-10 size-[28rem] bg-[oklch(0.62_0.22_262/0.55)]" />
          <div className="mancha-luz mancha-b -right-20 top-1/3 size-[32rem] bg-[oklch(0.7_0.16_235/0.4)]" />
          <div className="mancha-luz mancha-a bottom-0 left-1/3 size-[26rem] bg-[oklch(0.5_0.25_285/0.45)]" />
        </div>
      )}
      {/* Na tela clara o vidro fica atrás da animação e é leve: o desfoque refeito a cada quadro, na janela inteira, pesaria nos computadores mais simples. */}
      <div aria-hidden="true" className={claro ? "vidro-reflexo pointer-events-none fixed inset-0 -z-10 border-0 bg-white/10 backdrop-blur-md" : "vidro-claro vidro-reflexo pointer-events-none fixed inset-0 z-[1] rounded-none border-0"} />
      <FundoQuantico claro={claro} />
    </>
  );
}
