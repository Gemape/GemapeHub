import type { LucideIcon } from "lucide-react";

import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import type { Faixa } from "@/lib/faixas-desempenho";

// O card de indicador de todo o sistema é o mesmo da Frota (decisão 324): título, valor, barra, detalhe e o ícone em círculo. Com `pct`, a barra e o texto seguem o percentual e,
// com `faixa`, a cor e a seta da faixa (verde, amarelo ou vermelho); sem eles, o card é neutro.
export function StatCard({
  titulo,
  valor,
  detalhe,
  icone,
  pct = null,
  faixa = null,
}: {
  titulo: string;
  valor: string | number;
  detalhe?: string;
  icone?: LucideIcon;
  pct?: number | null;
  faixa?: Faixa | null;
}) {
  return <Cartao titulo={titulo} valor={String(valor)} icone={icone} indicador={{ pct, faixa, detalhe: detalhe ?? "" }} />;
}
