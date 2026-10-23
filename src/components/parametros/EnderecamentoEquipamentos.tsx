import { CATEGORIA_EQUIPAMENTOS, enderecamentoDaCategoria, salvarEnderecamentoCategoria } from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// Endereçamento de estoque dos equipamentos, igual ao de Veículos (Gerais > Categorias): não usa, opcional ou obrigatório. Obrigatório avisa quando o
// equipamento está sem endereço, sem impedir o salvamento; os campos são Rua, Número e Apartamento, preenchidos em Endereçamento.
export function EnderecamentoEquipamentos() {
  const dados = useParametrosBase();
  return (
    <section className="panel max-w-3xl space-y-3 p-5" aria-labelledby="enderecamento-equipamentos">
      <h2 id="enderecamento-equipamentos" className="text-lg font-semibold">Equipamentos</h2>
      <label htmlFor="enderecamento-categoria" className="block text-sm font-medium">Endereçamento de estoque</label>
      <select
        id="enderecamento-categoria"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={enderecamentoDaCategoria(dados, CATEGORIA_EQUIPAMENTOS)}
        onChange={(e) => executar(() => salvarEnderecamentoCategoria(CATEGORIA_EQUIPAMENTOS, e.target.value as "nao_usa" | "opcional" | "obrigatorio"), "Parâmetro de endereçamento salvo.")}
      >
        <option value="nao_usa">Não usa</option>
        <option value="opcional">Opcional</option>
        <option value="obrigatorio">Obrigatório</option>
      </select>
      <p className="text-sm text-muted-foreground">Obrigatório avisa quando o equipamento está sem endereço, sem impedir o salvamento. Os campos são Rua, Número e Apartamento.</p>
    </section>
  );
}
