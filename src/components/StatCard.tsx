import type { LucideIcon } from "lucide-react";

import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import type { Faixa } from "@/lib/faixas-desempenho";

// O card de indicador de todo o sistema é o mesmo da Frota (decisão 324): título, valor, barra, detalhe e o ícone em círculo. Com `pct`, a barra e o texto seguem o percentual e,
// com `faixa`, a cor e a seta da faixa (verde, amarelo ou vermelho); sem eles, o card é neutro.
export function StatCard({
  titulo,
  subtitulo,
  valor,
  detalhe,
  icone,
  pct = null,
  faixa = null,
  compacto = false,
}: {
  titulo: string;
  // Uma linha que explica o número, como nos cartões da Frota.
  subtitulo?: string;
  valor: string | number;
  detalhe?: string;
  icone?: LucideIcon;
  pct?: number | null;
  faixa?: Faixa | null;
  compacto?: boolean;
}) {
  return <Cartao titulo={titulo} {...(subtitulo ? { subtitulo } : {})} valor={String(valor)} icone={icone} compacto={compacto} indicador={{ pct, faixa, detalhe: detalhe ?? "" }} />;
}
