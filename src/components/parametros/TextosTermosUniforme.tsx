import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AJUDA_TERMO_UNIFORME, MARCAS_TERMO_UNIFORME, ROTULO_TERMO_UNIFORME, TERMOS_UNIFORME, TEXTO_TERMO_MAXIMO, TEXTOS_UNIFORME_PADRAO, lerTextosTermosUniforme, salvarTextosTermosUniforme,
  type TermoUniforme,
} from "@/lib/uniforme-termos-texto";
import { textoDoTermoValido } from "@/lib/termos-ferramentas-texto";

// Parâmetros > Uniformes > Parâmetros Específicos: os textos dos termos de responsabilidade (entrega e baixa), com as mesmas marcas dos termos de ferramentas.
export function TextosTermosUniforme() {
  const [salvos, setSalvos] = useState(lerTextosTermosUniforme);
  const [textos, setTextos] = useState(salvos);
  const valido = TERMOS_UNIFORME.every((t) => textoDoTermoValido(textos[t]));
  const igual = TERMOS_UNIFORME.every((t) => textos[t] === salvos[t]);
  const alterar = (termo: TermoUniforme, texto: string) => setTextos((atual) => ({ ...atual, [termo]: texto }));

  function salvar() {
    try {
      salvarTextosTermosUniforme(textos);
      setSalvos(textos);
      toast.success("Textos dos termos salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os textos.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-3" role="group" aria-labelledby="textos-termos-uniforme">
      <div>
        <h3 id="textos-termos-uniforme" className="text-sm font-semibold">Textos dos termos de responsabilidade</h3>
        <p className="text-xs text-muted-foreground">
          O texto que sai em cada termo de uniforme. Linha em branco separa os parágrafos. Marcas que viram os dados do termo:{" "}
          {MARCAS_TERMO_UNIFORME.map((m, i) => <span key={m}><code className="rounded bg-muted px-1 text-xs">{m}</code>{i < MARCAS_TERMO_UNIFORME.length - 1 ? ", " : ". "}</span>)}
          Use <code className="rounded bg-muted px-1 text-xs">**assim**</code> para negrito. Os próximos termos já saem com o texto novo; os já impressos não mudam.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {TERMOS_UNIFORME.map((termo) => {
          const invalido = !textoDoTermoValido(textos[termo]);
          return (
            <div key={termo} className="space-y-1.5 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`termo-uniforme-${termo}`} className="text-sm font-semibold">{ROTULO_TERMO_UNIFORME[termo]}</Label>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" disabled={textos[termo] === TEXTOS_UNIFORME_PADRAO[termo]} onClick={() => alterar(termo, TEXTOS_UNIFORME_PADRAO[termo])}>Restaurar texto padrão</Button>
              </div>
              <p className="text-xs text-muted-foreground">{AJUDA_TERMO_UNIFORME[termo]}</p>
              <Textarea id={`termo-uniforme-${termo}`} rows={9} maxLength={TEXTO_TERMO_MAXIMO} value={textos[termo]} aria-invalid={invalido} onChange={(e) => alterar(termo, e.target.value)} />
              {invalido && <p role="alert" className="text-xs text-destructive">Escreva o texto do termo, com no máximo uma marca {"{tabela}"}.</p>}
            </div>
          );
        })}
      </div>
      <Button requiresWrite disabled={!valido || igual} onClick={salvar}>Salvar textos</Button>
    </div>
  );
}
