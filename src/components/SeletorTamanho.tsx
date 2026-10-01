import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  controlaTamanho,
  opcoesTamanhoEntrada,
  opcoesTamanhoSaida,
  type ModuloTamanho,
  type ProdutoTamanho,
} from "@/lib/estoque-tamanho";
import type { ParametrosBase } from "@/lib/parametros-base";

// O tamanho por referência só existe no modo demonstração; no banco real a coluna entra na
// Fase 2 (docs/pendencias-fase2.md). Fora do demo, o estoque continua único.
export const TAMANHO_DISPONIVEL = import.meta.env["VITE_DEMO_MODE"] !== "false";

/** O produto pede tamanho nesta tela? */
export const pedeTamanho = (
  parametros: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho | undefined,
) => TAMANHO_DISPONIVEL && !!produto && controlaTamanho(parametros, modulo, produto);

/**
 * Lista suspensa do tamanho de uma linha (decisão 23). Entrada mostra os tamanhos autorizados
 * e ativos da subcategoria do produto; saída mostra os que têm saldo, com o saldo de cada um.
 * Produto sem tamanho não mostra a lista.
 */
export function SeletorTamanho({
  parametros,
  modulo,
  produto,
  uso,
  valor,
  onChange,
  id,
}: {
  parametros: ParametrosBase;
  modulo: ModuloTamanho;
  produto: ProdutoTamanho | undefined;
  uso: "entrada" | "saida";
  valor: string;
  onChange: (valor: string) => void;
  id?: string;
}) {
  if (!produto || !pedeTamanho(parametros, modulo, produto)) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const opcoes =
    uso === "entrada"
      ? opcoesTamanhoEntrada(parametros, modulo, produto)
      : opcoesTamanhoSaida(parametros, modulo, produto).map((o) => ({
          valor: o.valor,
          rotulo: `${o.rotulo} (saldo ${o.saldo})`,
        }));
  return (
    <Select value={opcoes.some((o) => o.valor === valor) ? valor : ""} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label="Tamanho">
        <SelectValue placeholder={opcoes.length ? "Tamanho" : "Sem saldo"} />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
