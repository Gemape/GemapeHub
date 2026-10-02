import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  TOTAL_CAIXAS,
  codigoCaixa,
  numeroDaCaixa,
  rotuloNumeroCaixa,
  validarHabilitacao,
} from "@/lib/caixas-habilitadas";
import { TODAS } from "@/lib/empresa-context";
import { useCaixasFerramentas } from "@/lib/hooks-gemape";
import { salvarCaixasHabilitadas } from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";
import { cn } from "@/lib/utils";

const NUMEROS = Array.from({ length: TOTAL_CAIXAS }, (_, i) => i + 1);

// Habilitar caixas (decisão 36): numeradas de 01 a 100, marque as habilitadas e salve tudo de uma vez.
export function CaixasHabilitadasPainel() {
  const dados = useParametrosBase();
  // Todas as empresas: a numeração é única para as três.
  const { data: cadastradas = [], isLoading, isError } = useCaixasFerramentas(TODAS);
  const [marcadas, setMarcadas] = useState<Set<number>>(() => new Set(dados.caixasHabilitadas));
  const salvando = useRef(false);

  useEffect(() => setMarcadas(new Set(dados.caixasHabilitadas)), [dados.caixasHabilitadas]);

  const emUso = new Map(
    cadastradas.flatMap((c) => {
      const numero = numeroDaCaixa(c);
      return numero === null ? [] : [[numero, c.nome] as const];
    }),
  );
  const salvas = new Set(dados.caixasHabilitadas);
  const alterado =
    marcadas.size !== salvas.size || [...marcadas].some((numero) => !salvas.has(numero));

  function alternar(numero: number) {
    // Caixa cadastrada não é desmarcada: o aviso aparece já no clique.
    const nome = emUso.get(numero);
    if (nome !== undefined && marcadas.has(numero)) {
      toast.error(
        validarHabilitacao(
          [...marcadas].filter((n) => n !== numero),
          cadastradas,
        ) ?? `A caixa ${codigoCaixa(numero)} está cadastrada.`,
      );
      return;
    }
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(numero)) nova.delete(numero);
      else nova.add(numero);
      return nova;
    });
  }

  function salvar() {
    if (salvando.current) return;
    salvando.current = true;
    try {
      const salvou = executar(
        () => salvarCaixasHabilitadas([...marcadas], isLoading || isError ? null : cadastradas),
        "Caixas habilitadas salvas.",
      );
      // Recusado: a tela volta a mostrar o que está salvo.
      if (!salvou) setMarcadas(new Set(dados.caixasHabilitadas));
    } finally {
      salvando.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Caixas numeradas de 01 a 100, com código de CX-0001 a CX-0100, numa numeração única para as
        três empresas. Só as caixas habilitadas podem ser cadastradas e escolhidas nos termos.
      </p>
      <div className="panel space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {marcadas.size} de {TOTAL_CAIXAS} habilitadas · {emUso.size} cadastradas
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setMarcadas(new Set(NUMEROS))}>
              Marcar todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarcadas(new Set(emUso.keys()))}
              title="Mantém só as caixas já cadastradas"
            >
              Desmarcar as livres
            </Button>
            <Button size="sm" onClick={salvar} disabled={!alterado || isLoading || isError}>
              Salvar habilitação
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {NUMEROS.map((numero) => {
            const marcada = marcadas.has(numero);
            const nome = emUso.get(numero);
            return (
              <button
                key={numero}
                type="button"
                role="checkbox"
                aria-checked={marcada}
                aria-label={`Caixa ${codigoCaixa(numero)}`}
                title={nome ? `${codigoCaixa(numero)}: ${nome}` : codigoCaixa(numero)}
                onClick={() => alternar(numero)}
                className={cn(
                  "relative rounded-md border py-2 text-center font-mono text-sm transition-colors",
                  marcada
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {rotuloNumeroCaixa(numero)}
                {nome && (
                  <span
                    className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-500"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
        {isError && (
          <p className="text-sm text-destructive">
            Não foi possível ler as caixas cadastradas. A habilitação não pode ser salva agora.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Marcadas: habilitadas. Ponto laranja: caixa já cadastrada, que não pode ser desabilitada
          sem antes ser excluída.
        </p>
      </div>
    </div>
  );
}
