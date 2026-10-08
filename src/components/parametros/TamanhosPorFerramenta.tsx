import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adicionarTamanhoGrupoFerramenta, cadastrarTamanhosPadraoFerramentas, removerTamanhoGrupoFerramenta, type ParametrosBase,
} from "@/lib/parametros-base";
import { executar } from "@/lib/use-parametros-base";

function CartaoGrupo({ grupo, tamanhos }: { grupo: { id: string; nome: string }; tamanhos: string[] }) {
  const [novo, setNovo] = useState("");
  function incluir(e: React.FormEvent) {
    e.preventDefault();
    if (executar(() => adicionarTamanhoGrupoFerramenta(grupo.id, novo), "Tamanho incluído.")) setNovo("");
  }
  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{grupo.nome}</h3>
        <Badge variant="secondary">{tamanhos.length}</Badge>
      </div>
      {tamanhos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum tamanho cadastrado.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {tamanhos.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
              {t}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Excluir o tamanho ${t} de ${grupo.nome}`}
                onClick={() => {
                  if (confirm(`Excluir o tamanho ${t} de ${grupo.nome}?`)) executar(() => removerTamanhoGrupoFerramenta(grupo.id, t), "Tamanho excluído.");
                }}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={incluir} className="flex gap-2">
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo tamanho" aria-label={`Novo tamanho de ${grupo.nome}`} maxLength={40} />
        <Button type="submit" size="sm" variant="outline" requiresWrite>Adicionar</Button>
      </form>
    </li>
  );
}

// Parâmetros > Ferramentas > Parâmetros Específicos (decisão 117): os tamanhos de cada grupo de ferramenta, com
// campo para incluir mais. Só modo demonstração; nada no Supabase.
export function TamanhosPorFerramenta({ dados }: { dados: ParametrosBase }) {
  return (
    <section className="panel space-y-3 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tamanhos por ferramenta</h2>
          <p className="text-sm text-muted-foreground">Cada grupo de ferramenta tem a sua lista de tamanhos. Inclua mais tamanhos no campo de cada grupo.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          requiresWrite
          onClick={() =>
            executar(() => {
              const { grupos, tamanhos } = cadastrarTamanhosPadraoFerramentas();
              toast.success(
                grupos + tamanhos === 0
                  ? "Os tamanhos padrão já estão cadastrados."
                  : `${tamanhos} ${tamanhos === 1 ? "tamanho incluído" : "tamanhos incluídos"} e ${grupos} ${grupos === 1 ? "grupo novo" : "grupos novos"}.`,
              );
            })
          }
        >
          Cadastrar tamanhos padrão
        </Button>
      </header>
      {dados.gruposFerramenta.length === 0 && <p className="text-sm text-muted-foreground">Nenhum grupo de ferramenta cadastrado.</p>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dados.gruposFerramenta.map((g) => (
          <CartaoGrupo key={g.id} grupo={g} tamanhos={dados.tamanhosGrupoFerramenta[g.id] ?? []} />
        ))}
      </ul>
    </section>
  );
}
