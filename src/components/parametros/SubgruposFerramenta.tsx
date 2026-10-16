import { Table } from "@/components/ui/table";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { RestaurarPadraoInicial } from "@/components/parametros/VeiculosListasParametros";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cadastrarTamanhosPadraoFerramentas, definirSubgruposGrupoFerramenta, restaurarPadroesFerramentas, situacoesPadraoFerramentas,
  type ParametrosBase,
} from "@/lib/parametros-base";
import { grupoTemTamanhos } from "@/lib/tamanhos-ferramentas-padrao";
import { executar } from "@/lib/use-parametros-base";

type Modo = "cadastrar" | "editar";

const linhasDe = (texto: string) => texto.split("\n");

// Parâmetros > Ferramentas > Parâmetros Específicos (decisão 159): cada grupo de ferramenta (pai) com os seus subgrupos
// (filhos: numerações e especificações), na forma das Ações de manutenção. Os grupos continuam sendo criados na lista
// Grupos de ferramentas, na mesma página. Os subgrupos são os mesmos tamanhos do campo Tamanho do Cadastrar ferramenta.
// Só modo demonstração; nada no Supabase.
export function SubgruposFerramenta({ dados }: { dados: ParametrosBase }) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>("cadastrar");
  const [origem, setOrigem] = useState<{ id: string; nome: string } | null>(null);
  const [grupoId, setGrupoId] = useState("");
  const [texto, setTexto] = useState("");
  const [travado, setTravado] = useState(false);
  const salvando = useRef(false);

  const grupos = dados.gruposFerramenta.filter((g) => grupoTemTamanhos(g.nome));
  const subgruposDe = (id: string) => dados.tamanhosGrupoFerramenta[id] ?? [];

  function abrir(m: Modo, grupo: { id: string; nome: string } | null) {
    setModo(m);
    setOrigem(grupo);
    setGrupoId(m === "editar" && grupo ? grupo.id : "");
    setTexto(m === "editar" && grupo ? subgruposDe(grupo.id).join("\n") : "");
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    if (!grupoId) {
      toast.error("Escolha o grupo de ferramenta.");
      return;
    }
    salvando.current = true;
    setTravado(true);
    const ok = executar(
      () => definirSubgruposGrupoFerramenta(grupoId, linhasDe(texto), modo === "editar" ? "substituir" : "somar"),
      modo === "editar" ? "Subgrupos salvos." : "Subgrupos cadastrados.",
    );
    if (ok) setAberto(false);
    // Só solta a trava depois de o diálogo fechar ou de o erro aparecer, para o segundo clique não repetir.
    setTimeout(() => {
      salvando.current = false;
      setTravado(false);
    }, 400);
  }

  function excluir(grupo: { id: string; nome: string }) {
    const total = subgruposDe(grupo.id).length;
    if (total === 0) {
      toast.info(`${grupo.nome} não tem subgrupos.`);
      return;
    }
    if (!confirm(`Excluir os ${total} subgrupos de ${grupo.nome}? O grupo continua na lista Grupos de ferramentas.`)) return;
    executar(() => definirSubgruposGrupoFerramenta(grupo.id, [], "substituir"), "Subgrupos excluídos.");
  }

  const titulo = modo === "editar" ? `Editar subgrupos de ${origem?.nome ?? ""}` : "Cadastrar subgrupos";

  return (
    <section className="space-y-5" data-testid="subgrupos-ferramenta">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Subgrupos por grupo de ferramenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada grupo (pai) tem os seus subgrupos (filhos): numerações e especificações. Ao cadastrar uma ferramenta, escolhe-se o grupo e o subgrupo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            requiresWrite
            onClick={() =>
              executar(() => {
                const { grupos: novos, tamanhos } = cadastrarTamanhosPadraoFerramentas();
                toast.success(
                  novos + tamanhos === 0
                    ? "Os subgrupos padrão já estão cadastrados."
                    : `${tamanhos} ${tamanhos === 1 ? "subgrupo incluído" : "subgrupos incluídos"} e ${novos} ${novos === 1 ? "grupo novo" : "grupos novos"}.`,
                );
              })
            }
          >
            Cadastrar padrão
          </Button>
          <RestaurarPadraoInicial
            singular="grupo"
            plural="grupos"
            perdas="(os subgrupos) "
            situacoes={situacoesPadraoFerramentas}
            restaurar={restaurarPadroesFerramentas}
          />
          <Button requiresWrite onClick={() => abrir("cadastrar", null)}>
            Cadastrar subgrupos
          </Button>
        </div>
      </header>

      <div className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Subgrupos</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grupos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                  Nenhum grupo de ferramenta cadastrado. Cadastre na lista Grupos de ferramentas, acima.
                </td>
              </tr>
            )}
            {grupos.map((g) => (
              <tr key={g.id}>
                <td className="px-3 py-2 font-medium">{g.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">{subgruposDe(g.id).join(" · ") || "Nenhum subgrupo cadastrado."}</td>
                <td className="px-3 py-2">
                  <AcoesLinha rotulo={g.nome} onEditar={() => abrir("editar", g)} onExcluir={() => excluir(g)} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>
              {modo === "editar"
                ? "Troque a lista de subgrupos do grupo. O nome do grupo é mudado na lista Grupos de ferramentas."
                : "Escolha o grupo e informe os subgrupos novos, um por linha. Eles são somados aos que o grupo já tem."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="subgrupo-grupo">Grupo de ferramenta</Label>
              {modo === "editar" ? (
                <p id="subgrupo-grupo" className="rounded-md border bg-muted px-3 py-2 text-sm">{origem?.nome}</p>
              ) : (
                <Select value={grupoId} onValueChange={setGrupoId}>
                  <SelectTrigger id="subgrupo-grupo"><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="subgrupo-lista">Subgrupos (um por linha)</Label>
              <Textarea id="subgrupo-lista" rows={8} maxLength={5000} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={travado}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
