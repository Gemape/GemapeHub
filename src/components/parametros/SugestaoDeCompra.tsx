import { useState } from "react";
import { toast } from "sonner";

import { CLASSE_STATUS } from "@/components/modules/LegendaStatusCompra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  condicaoDoStatus,
  diasValidos,
  lerParametrosCompraEpi,
  MAX_DIAS,
  salvarParametrosCompraEpi,
  STATUS_CRITICIDADE,
  textoDoPontoDePedido,
  type MetodoReposicao,
  type ModuloDeCompra,
  type StatusCriticidade,
} from "@/lib/epi-parametros";

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));

// Parâmetros da sugestão de compra (decisões 328 e 418): estoque mínimo ou tempo de cobertura, prazo de reposição do fornecedor e a tabela de criticidade. O EPI e os uniformes usam a mesma
// tela, cada um com os seus valores guardados. `onSalvou`: o que fazer depois de salvar (voltar à Sugestão de Compras, quando a tela foi aberta por ela).
export function SugestaoDeCompra({ modulo, onSalvou }: { modulo: ModuloDeCompra; onSalvou?: (() => void) | undefined }) {
  const [salvo, setSalvo] = useState(() => lerParametrosCompraEpi(undefined, modulo));
  const [metodo, setMetodo] = useState<MetodoReposicao>(salvo.metodo);
  const [cobertura, setCobertura] = useState(String(salvo.diasCobertura));
  const [reposicao, setReposicao] = useState(String(salvo.prazoReposicao));
  const [seguranca, setSeguranca] = useState(String(salvo.diasSeguranca));
  const [planejamento, setPlanejamento] = useState(String(salvo.diasPlanejamento));
  const [excesso, setExcesso] = useState(String(salvo.limiteExcesso));
  const novo = {
    metodo,
    diasCobertura: numeroDe(cobertura),
    prazoReposicao: numeroDe(reposicao),
    diasSeguranca: numeroDe(seguranca),
    diasPlanejamento: numeroDe(planejamento),
    limiteExcesso: numeroDe(excesso),
  };
  const valido =
    [novo.prazoReposicao, novo.diasSeguranca, novo.diasPlanejamento, novo.limiteExcesso].every(
      diasValidos,
    ) &&
    (metodo === "minimo" || (diasValidos(novo.diasCobertura) && novo.diasCobertura >= 1)) &&
    novo.diasPlanejamento >= novo.diasSeguranca;
  const igual =
    valido && (Object.keys(salvo) as (keyof typeof salvo)[]).every((k) => salvo[k] === novo[k]);

  function salvarCompra() {
    if (!valido) return;
    try {
      salvarParametrosCompraEpi(novo, undefined, modulo);
      setSalvo(novo);
      toast.success("Parâmetros da sugestão de compra salvos.");
      onSalvou?.();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os parâmetros.");
    }
  }
  const campo = (
    id: string,
    rotulo: string,
    valor: string,
    definir: (v: string) => void,
    ajuda: string,
    desligado = false,
  ) => (
    <div className="space-y-1">
      <Label htmlFor={`${modulo}-sugestao-${id}`}>{rotulo}</Label>
      <Input
        id={`${modulo}-sugestao-${id}`}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_DIAS}
        step={1}
        value={valor}
        disabled={desligado}
        aria-invalid={!desligado && !diasValidos(numeroDe(valor))}
        onChange={(e) => definir(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{ajuda}</p>
    </div>
  );

  // A tabela mostra a condição do status para o que está na tela (mesmo sem salvar); se os dias digitados não valem, vale o que está salvo.
  const emUso = valido ? novo : salvo;
  return (
        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <h3 className="text-sm font-semibold">Sugestão de compra</h3>
            <p className="text-xs text-muted-foreground">
              Escolha se a sugestão trabalha com o estoque mínimo ou com o tempo de cobertura em
              dias, e o prazo de reposição do fornecedor.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Trabalhar com</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["cobertura", "Tempo de cobertura (dias)"],
                  ["minimo", "Estoque mínimo"],
                ] as const
              ).map(([v, r]) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`${modulo}-metodo`}
                    value={v}
                    checked={metodo === v}
                    onChange={() => setMetodo(v)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campo(
              "cobertura",
              "Dias de cobertura desejados",
              cobertura,
              setCobertura,
              "Quantos dias de consumo o estoque deve cobrir.",
              metodo !== "cobertura",
            )}
            {campo(
              "reposicao",
              "Prazo de reposição do fornecedor (TR)",
              reposicao,
              setReposicao,
              "Dias que o fornecedor leva para entregar.",
            )}
            {campo(
              "seguranca",
              "Dias de segurança",
              seguranca,
              setSeguranca,
              "Comprar já vai de TR até TR + estes dias.",
            )}
            {campo(
              "planejamento",
              "Janela de planejamento",
              planejamento,
              setPlanejamento,
              "Planejar vai até TR + estes dias.",
            )}
            {campo(
              "excesso",
              "Limite de excesso",
              excesso,
              setExcesso,
              "Acima desta cobertura, o estoque é excesso.",
            )}
          </div>
          {!valido && (
            <p role="alert" className="text-sm text-destructive">
              Informe dias inteiros entre 0 e {MAX_DIAS}; a cobertura desejada precisa de 1 dia ou
              mais e a janela de planejamento não pode ser menor que a segurança.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Tabela de status de criticidade (TC = tempo de cobertura, em dias)</p>
            <p className="text-xs text-muted-foreground">{textoDoPontoDePedido(emUso)}</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs" aria-label="Condição lógica de cada status">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Criticidade</th>
                    <th className="px-2 py-1.5 font-medium">Condição lógica (gatilho)</th>
                    <th className="px-2 py-1.5 font-medium">Significado prático</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(STATUS_CRITICIDADE) as StatusCriticidade[]).map((st) => {
                    const c = condicaoDoStatus(st, emUso);
                    return (
                      <tr key={st} className="border-t align-top">
                        <td className="px-2 py-1.5">
                          <span className={`whitespace-nowrap rounded px-2 py-0.5 font-medium ${CLASSE_STATUS[st]}`}>{STATUS_CRITICIDADE[st].rotulo}</span>
                        </td>
                        <td className="px-2 py-1.5">{STATUS_CRITICIDADE[st].criticidade}</td>
                        <td className="px-2 py-1.5">
                          <code className="rounded bg-muted px-1.5 py-0.5">{c.formula}</code>
                          <span className="mt-0.5 block text-muted-foreground">{c.calculo}</span>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{c.significado}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Button requiresWrite disabled={!valido || igual} onClick={salvarCompra}>
            Salvar parâmetros da sugestão
          </Button>
        </div>
  );
}
