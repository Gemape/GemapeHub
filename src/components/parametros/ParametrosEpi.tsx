import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  diasValidos,
  lerMotivosBaixaEpi,
  lerMotivosDevolucaoEpi,
  lerParametrosCompraEpi,
  MAX_DIAS,
  MAX_MOTIVOS,
  salvarMotivosBaixaEpi,
  salvarMotivosDevolucaoEpi,
  salvarParametrosCompraEpi,
  STATUS_CRITICIDADE,
  type MetodoReposicao,
  type StatusCriticidade,
} from "@/lib/epi-parametros";

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));

// Lista de motivos que a pessoa cadastra: acrescentar, tirar e salvar.
function CartaoDeMotivos({
  id,
  titulo,
  ajuda,
  inicial,
  salvar,
}: {
  id: string;
  titulo: string;
  ajuda: string;
  inicial: string[];
  salvar: (motivos: string[]) => string[];
}) {
  const [salvos, setSalvos] = useState(inicial);
  const [lista, setLista] = useState(inicial);
  const [novo, setNovo] = useState("");
  const igual = lista.length === salvos.length && lista.every((m, i) => m === salvos[i]);

  function acrescentar() {
    const texto = novo.trim().replace(/\s+/g, " ");
    if (!texto) return;
    if (lista.some((m) => m.toLocaleLowerCase("pt-BR") === texto.toLocaleLowerCase("pt-BR"))) {
      toast.error("Este motivo já está na lista.");
      return;
    }
    if (lista.length >= MAX_MOTIVOS) {
      toast.error(`No máximo ${MAX_MOTIVOS} motivos.`);
      return;
    }
    setLista([...lista, texto]);
    setNovo("");
  }
  function gravar() {
    try {
      const gravada = salvar(lista);
      setSalvos(gravada);
      setLista(gravada);
      toast.success(`${titulo} salvos.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    }
  }
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={titulo}>
        {lista.map((m) => (
          <li
            key={m}
            className="flex items-center gap-1 rounded-full border bg-muted/40 py-1 pl-3 pr-1 text-sm"
          >
            {m}
            <button
              type="button"
              aria-label={`Tirar ${m}`}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
              onClick={() => setLista(lista.filter((x) => x !== m))}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={`${id}-novo`}>Novo motivo</Label>
          <Input
            id={`${id}-novo`}
            value={novo}
            maxLength={60}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                acrescentar();
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={acrescentar} disabled={!novo.trim()}>
          Adicionar
        </Button>
      </div>
      <Button requiresWrite type="button" disabled={igual || lista.length === 0} onClick={gravar}>
        Salvar {titulo.toLocaleLowerCase("pt-BR")}
      </Button>
    </div>
  );
}

const CLASSE_STATUS: Record<StatusCriticidade, string> = {
  ruptura: "bg-destructive text-destructive-foreground",
  comprar_ja: "bg-accent text-accent-foreground",
  planejar: "bg-warning text-warning-foreground",
  estavel: "bg-success text-success-foreground",
  excesso: "bg-info text-info-foreground",
};

// Parâmetros Específicos do EPI (decisão 328): motivos de baixa definitiva, motivos de devolução ao estoque e os parâmetros da sugestão de compra.
export function ParametrosEpi() {
  const [salvo, setSalvo] = useState(lerParametrosCompraEpi);
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
      salvarParametrosCompraEpi(novo);
      setSalvo(novo);
      toast.success("Parâmetros da sugestão de compra salvos.");
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
      <Label htmlFor={`epi-${id}`}>{rotulo}</Label>
      <Input
        id={`epi-${id}`}
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

  return (
    <section className="space-y-3" aria-labelledby="parametros-epi">
      <div>
        <h2 id="parametros-epi" className="text-lg font-semibold">
          Parâmetros do EPI
        </h2>
        <p className="text-sm text-muted-foreground">
          Motivos de baixa definitiva e de devolução ao estoque, e como a sugestão de compra é
          calculada.
        </p>
      </div>
      <div className="panel max-w-4xl space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <CartaoDeMotivos
            id="motivos-baixa"
            titulo="Motivos de baixa definitiva"
            ajuda="Os motivos que a baixa definitiva do EPI aceita."
            inicial={lerMotivosBaixaEpi()}
            salvar={salvarMotivosBaixaEpi}
          />
          <CartaoDeMotivos
            id="motivos-devolucao"
            titulo="Motivos de devolução ao estoque"
            ajuda="Os motivos que a Devolução, na Entrada no Estoque, pede para cada EPI devolvido."
            inicial={lerMotivosDevolucaoEpi()}
            salvar={salvarMotivosDevolucaoEpi}
          />
        </div>

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
                    name="epi-metodo"
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

          <div className="space-y-1">
            <p className="text-sm font-medium">
              Tabela de criticidade (TC = tempo de cobertura, em dias)
            </p>
            <ul className="grid gap-1 text-xs sm:grid-cols-2">
              {(Object.keys(STATUS_CRITICIDADE) as StatusCriticidade[]).map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 font-medium ${CLASSE_STATUS[s]}`}>
                    {STATUS_CRITICIDADE[s].rotulo}
                  </span>
                  <span className="text-muted-foreground">{STATUS_CRITICIDADE[s].significado}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button requiresWrite disabled={!valido || igual} onClick={salvarCompra}>
            Salvar parâmetros da sugestão
          </Button>
        </div>
      </div>
    </section>
  );
}
