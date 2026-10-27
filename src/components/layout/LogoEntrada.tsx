import logoMarca from "@/assets/logo-gemape-40-anos.png";

/** Logo GEMAPE 40 anos da tela de entrada (decisão 143): mesma animação e mesmo layout do menu lateral. */
export function LogoEntrada({ grande = false }: { grande?: boolean }) {
  return (
    <div className={`w-full text-center leading-tight ${grande ? "max-w-[34rem]" : "max-w-[17rem]"}`}>
      <div
        className="logo-marca"
        role="img"
        aria-label="GEMAPE, 40 anos, máquinas e peças"
        style={{ maskImage: `url(${logoMarca})`, WebkitMaskImage: `url(${logoMarca})` }}
      />
      <div className="marca-linha mt-3" aria-hidden="true" />
      <p className={`marca-subtitulo mt-2 font-semibold uppercase text-white/80 ${grande ? "text-xs tracking-[0.3em] sm:text-sm" : "text-[11px] tracking-[0.14em]"}`}>
        Gestão de Patrimônio
      </p>
    </div>
  );
}
