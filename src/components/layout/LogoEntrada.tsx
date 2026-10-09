import logoMarca from "@/assets/logo-gemape-40-anos.png";

/** Logo GEMAPE 40 anos da tela de entrada (decisão 143): mesma animação e mesmo layout do menu lateral. */
export function LogoEntrada() {
  return (
    <div className="w-full max-w-[17rem] text-center leading-tight">
      <div
        className="logo-marca"
        role="img"
        aria-label="GEMAPE, 40 anos, máquinas e peças"
        style={{ maskImage: `url(${logoMarca})`, WebkitMaskImage: `url(${logoMarca})` }}
      />
      <div className="marca-linha mt-3" aria-hidden="true" />
      <p className="marca-subtitulo mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
        Gestão de Patrimônio
      </p>
    </div>
  );
}
