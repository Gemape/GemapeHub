import { useRef, useState } from "react";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { EnderecamentoEquipamentos } from "@/components/parametros/EnderecamentoEquipamentos";
import { IndicadoresEquipamentoParametros } from "@/components/parametros/IndicadoresEquipamentoParametros";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRUPOS_TECNICOS, TITULO_GRUPO_TECNICO, type GrupoTecnico } from "@/lib/equipamentos";
import { listarEquipamentos } from "@/lib/equipamentos-demo";
import {
  lerParametrosEquipamento, removerSubcategoria, removerTipo, salvarSubcategoria, salvarTipo,
  type SubcategoriaEquipamento, type TipoEquipamento,
} from "@/lib/equipamentos-parametros";

// Parâmetros > Equipamentos > Parâmetros Específicos: cadastro em pai e filho. O pai é a subcategoria (norma regulamentadora) e o filho é
// o tipo de equipamento, que sempre fica debaixo de uma subcategoria. Só modo demonstração (navegador).
type DialogoSub = { editando: SubcategoriaEquipamento | null };
type DialogoTipo = { editando: TipoEquipamento | null; subcategoriaId: string };

function FormularioSubcategoria({ editando, onFechar, onSalvo }: { editando: SubcategoriaEquipamento | null; onFechar: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState(editando?.nome ?? "");
  // Um segundo clique em Salvar enquanto a janela fecha gravaria de novo.
  const trava = useRef(false);
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (trava.current) return;
    try {
      salvarSubcategoria({ ...(editando ? { id: editando.id } : {}), nome });
      trava.current = true;
      onFechar();
      toast.success("Subcategoria salva");
      onSalvo();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar a subcategoria.");
    }
  }
  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome-subcategoria">Nome da subcategoria</Label>
        <Input id="nome-subcategoria" capitalizar="texto" placeholder="Ex.: Movimentação e elevação de carga (NR-11)" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button requiresWrite type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
}

function FormularioTipo({ editando, subcategoriaInicial, subcategorias, onFechar, onSalvo }: {
  editando: TipoEquipamento | null;
  subcategoriaInicial: string;
  subcategorias: SubcategoriaEquipamento[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(editando?.nome ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState(editando?.subcategoriaId ?? subcategoriaInicial);
  // Campos técnicos que aparecem no cadastro dos equipamentos deste tipo.
  const [grupos, setGrupos] = useState<GrupoTecnico[]>(editando?.grupos ?? []);
  const alternarGrupo = (g: GrupoTecnico, marcar: boolean) => setGrupos((atuais) => (marcar ? [...atuais.filter((x) => x !== g), g] : atuais.filter((x) => x !== g)));
  const trava = useRef(false);
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (trava.current) return;
    try {
      salvarTipo({ ...(editando ? { id: editando.id } : {}), subcategoriaId, nome, grupos });
      trava.current = true;
      onFechar();
      toast.success("Tipo salvo");
      onSalvo();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o tipo.");
    }
  }
  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="subcategoria-do-tipo">Subcategoria (pai)</Label>
        <Select value={subcategoriaId} onValueChange={(v) => v && setSubcategoriaId(v)}>
          <SelectTrigger id="subcategoria-do-tipo"><SelectValue placeholder="Selecione a subcategoria" /></SelectTrigger>
          <SelectContent>{subcategorias.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nome-tipo">Nome do tipo</Label>
        <Input id="nome-tipo" capitalizar="texto" placeholder="Ex.: Empilhadeiras" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <fieldset className="space-y-2 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Especificações técnicas deste tipo</legend>
        <p className="text-xs text-muted-foreground">Marque os grupos de campos técnicos que aparecem no cadastro dos equipamentos deste tipo.</p>
        {GRUPOS_TECNICOS.map((g) => (
          <label key={g} className="flex items-center gap-2 text-sm">
            <Checkbox checked={grupos.includes(g)} onCheckedChange={(v) => alternarGrupo(g, v === true)} aria-label={TITULO_GRUPO_TECNICO[g]} />
            {TITULO_GRUPO_TECNICO[g]}
          </label>
        ))}
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button requiresWrite type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
}

export function EquipamentosEspecificos() {
  const [params, setParams] = useState(lerParametrosEquipamento);
  const [dialogoSub, setDialogoSub] = useState<DialogoSub | null>(null);
  const [dialogoTipo, setDialogoTipo] = useState<DialogoTipo | null>(null);
  const recarregar = () => setParams(lerParametrosEquipamento());

  function excluir(texto: string, acao: () => void, aviso: string) {
    if (!confirm(texto)) return;
    try {
      acao();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.");
      return;
    }
    recarregar();
    toast.success(aviso);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <EyebrowDoCard fallback="Parâmetros" />
          <h1 className="text-2xl font-bold">Parâmetros Específicos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastro em pai e filho: a subcategoria é o pai e o tipo de equipamento é o filho, sempre debaixo de uma subcategoria.</p>
        </div>
        <Button requiresWrite onClick={() => setDialogoSub({ editando: null })}>Cadastrar subcategoria</Button>
      </header>

      <EnderecamentoEquipamentos />

      {params.subcategorias.length === 0 && <p className="panel p-4 text-sm text-muted-foreground">Nenhuma subcategoria cadastrada.</p>}
      {params.subcategorias.map((sub) => {
        const tipos = params.tipos.filter((t) => t.subcategoriaId === sub.id);
        return (
          <section key={sub.id} className="panel overflow-hidden p-0" aria-label={sub.nome}>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/10 px-4 py-3">
              <div>
                <h2 className="font-semibold">{sub.nome}</h2>
                <p className="text-xs text-muted-foreground">Subcategoria · {tipos.length} {tipos.length === 1 ? "tipo" : "tipos"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button requiresWrite variant="outline" size="sm" onClick={() => setDialogoTipo({ editando: null, subcategoriaId: sub.id })}>Cadastrar tipo</Button>
                <AcoesLinha
                  rotulo={sub.nome}
                  onEditar={() => setDialogoSub({ editando: sub })}
                  onExcluir={() => excluir(`Excluir a subcategoria ${sub.nome}?`, () => removerSubcategoria(sub.id), "Subcategoria excluída")}
                />
              </div>
            </div>
            <ul className="divide-y">
              {tipos.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">Nenhum tipo nesta subcategoria.</li>}
              {tipos.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 pl-8">
                  <span className="text-sm">
                    {t.nome}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t.grupos.length === 0 ? "sem campos técnicos" : `campos técnicos: ${t.grupos.map((g) => TITULO_GRUPO_TECNICO[g]).join(" e ")}`}
                    </span>
                  </span>
                  <AcoesLinha
                    rotulo={t.nome}
                    onEditar={() => setDialogoTipo({ editando: t, subcategoriaId: t.subcategoriaId })}
                    onExcluir={() => excluir(`Excluir o tipo ${t.nome}?`, () => removerTipo(t.id, undefined, (id) => listarEquipamentos().filter((e) => e.tipoId === id).length), "Tipo excluído")}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <IndicadoresEquipamentoParametros />

      <Dialog open={dialogoSub !== null} onOpenChange={(a) => !a && setDialogoSub(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogoSub?.editando ? "Editar subcategoria" : "Cadastrar subcategoria"}</DialogTitle>
            <DialogDescription>A subcategoria é o pai: os tipos de equipamento ficam debaixo dela.</DialogDescription>
          </DialogHeader>
          {dialogoSub && <FormularioSubcategoria key={dialogoSub.editando?.id ?? "nova"} editando={dialogoSub.editando} onFechar={() => setDialogoSub(null)} onSalvo={recarregar} />}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogoTipo !== null} onOpenChange={(a) => !a && setDialogoTipo(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogoTipo?.editando ? "Editar tipo" : "Cadastrar tipo"}</DialogTitle>
            <DialogDescription>O tipo é o filho: escolha a subcategoria a que ele pertence.</DialogDescription>
          </DialogHeader>
          {dialogoTipo && (
            <FormularioTipo
              key={dialogoTipo.editando?.id ?? `novo-${dialogoTipo.subcategoriaId}`}
              editando={dialogoTipo.editando}
              subcategoriaInicial={dialogoTipo.subcategoriaId}
              subcategorias={params.subcategorias}
              onFechar={() => setDialogoTipo(null)}
              onSalvo={recarregar}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
