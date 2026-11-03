import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { condicaoDoStatus, STATUS_CRITICIDADE, type ParametrosCompraEpi, type StatusCriticidade } from "@/lib/epi-parametros";

// Status de criticidade da Sugestão de Compras (decisão 354): a etiqueta tem um balão que explica o status ao passar o mouse (ou focar com o teclado) e a legenda fica sempre visível acima da tabela.
export const CLASSE_STATUS: Record<StatusCriticidade, string> = {
  ruptura: "bg-destructive text-destructive-foreground",
  comprar_ja: "bg-accent text-accent-foreground",
  planejar: "bg-warning text-warning-foreground",
  estavel: "bg-success text-success-foreground",
  excesso: "bg-info text-info-foreground",
};
const SEM_CONSUMO = "Sem consumo registrado: sem média de consumo não dá para calcular a cobertura nem o status (se o estoque estiver abaixo do mínimo, o status é Ruptura).";
// "Cálculo. Significado." numa frase só: o cálculo por cobertura vem sem ponto final, o do estoque mínimo vem com.
const descricaoDoStatus = (n: StatusCriticidade, parametros?: ParametrosCompraEpi) => {
  if (!parametros) return STATUS_CRITICIDADE[n].significado;
  const c = condicaoDoStatus(n, parametros);
  return `${c.calculo.replace(/\.$/, "")}. ${c.significado}`;
};
const NIVEIS = Object.keys(STATUS_CRITICIDADE) as StatusCriticidade[];

// A etiqueta do status com o balão. `status` nulo é o item sem consumo.
export function EtiquetaStatusCompra({ status, parametros }: { status: StatusCriticidade | null; parametros?: ParametrosCompraEpi }) {
  const info = status ? STATUS_CRITICIDADE[status] : null;
  const texto = status && info ? `${info.rotulo} (criticidade ${info.criticidade.toLowerCase()}): ${descricaoDoStatus(status, parametros)}` : SEM_CONSUMO;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label={texto} className={`cursor-help rounded px-2 py-0.5 text-xs font-medium ${status ? CLASSE_STATUS[status] : "text-muted-foreground underline decoration-dotted"}`}>
            {info?.rotulo ?? "Sem consumo"}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{texto}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LegendaStatusCompra({ parametros }: { parametros?: ParametrosCompraEpi }) {
  return (
    <section className="panel space-y-2 p-3" aria-label="Legenda dos status de criticidade">
      <h2 className="text-sm font-semibold">Legenda dos status</h2>
      <ul className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 xl:grid-cols-3">
        {NIVEIS.map((n) => (
          <li key={n} className="flex items-start gap-2">
            <span className={`mt-px shrink-0 rounded px-2 py-0.5 font-medium ${CLASSE_STATUS[n]}`}>{STATUS_CRITICIDADE[n].rotulo}</span>
            <span className="text-muted-foreground">
              <strong className="font-medium text-foreground">Criticidade {STATUS_CRITICIDADE[n].criticidade.toLowerCase()}.</strong>{" "}
              {descricaoDoStatus(n, parametros)}
            </span>
          </li>
        ))}
        {/* Com o estoque mínimo todo item tem status; "Sem consumo" só existe no método por tempo de cobertura. */}
        {parametros?.metodo !== "minimo" && (
          <li className="flex items-start gap-2">
            <span className="mt-px shrink-0 rounded px-2 py-0.5 font-medium text-muted-foreground underline decoration-dotted">Sem consumo</span>
            <span className="text-muted-foreground">{SEM_CONSUMO}</span>
          </li>
        )}
      </ul>
    </section>
  );
}
