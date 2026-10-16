import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  controlaTamanho,
  opcoesTamanhoDevolucao,
  opcoesTamanhoEntrada,
  opcoesTamanhoSaida,
  type ModuloTamanho,
  type ProdutoTamanho,
} from "@/lib/estoque-tamanho";
import { MODO_DEMO } from "@/lib/modo-demo";
import type { ParametrosBase } from "@/lib/parametros-base";

// O tamanho por referência só existe no modo demonstração; no banco real a coluna entra na
// Fase 2 (docs/pendencias-fase2.md). Fora do demo, o estoque continua único.
export const TAMANHO_DISPONIVEL = MODO_DEMO;

/** O produto pede tamanho nesta tela? */
export const pedeTamanho = (
  parametros: ParametrosBase,
  modulo: ModuloTamanho,
  produto: ProdutoTamanho | undefined,
  aceitarTodos = false,
) =>
  TAMANHO_DISPONIVEL &&
  !!produto &&
  (controlaTamanho(parametros, modulo, produto) ||
    (aceitarTodos && opcoesTamanhoEntrada(parametros, modulo, produto, true).length > 0));

/**
 * Lista suspensa do tamanho de uma linha (decisão 23). Entrada mostra os tamanhos autorizados
 * e ativos da subcategoria do produto; saída mostra os que têm saldo, com o saldo de cada um;
 * devolução mostra os tamanhos em que o item pode ter saído, inclusive "Sem tamanho".
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
  aceitarTodos = false,
}: {
  parametros: ParametrosBase;
  modulo: ModuloTamanho;
  produto: ProdutoTamanho | undefined;
  uso: "entrada" | "saida" | "devolucao";
  valor: string;
  onChange: (valor: string) => void;
  id?: string;
  /** Entrada: produto sem tamanho autorizado oferece todos os tamanhos ativos de Gerais. */
  aceitarTodos?: boolean;
}) {
  if (!produto || !pedeTamanho(parametros, modulo, produto, uso === "entrada" && aceitarTodos)) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const opcoes =
    uso === "entrada"
      ? opcoesTamanhoEntrada(parametros, modulo, produto, aceitarTodos)
      : uso === "devolucao"
        ? opcoesTamanhoDevolucao(parametros, modulo, produto)
        : opcoesTamanhoSaida(parametros, modulo, produto).map((o) => ({
            valor: o.valor,
            rotulo: `${o.rotulo} (saldo ${o.saldo})`,
          }));
  return (
    <Select value={opcoes.some((o) => o.valor === valor) ? valor : ""} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label="Tamanho">
        <SelectValue
          placeholder={
            opcoes.length ? "Tamanho" : uso === "saida" ? "Sem saldo" : "Nenhum tamanho autorizado"
          }
        />
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
