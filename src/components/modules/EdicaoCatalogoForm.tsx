import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MODO_DEMO } from "@/lib/modo-demo";
import type { EpiCatalogo } from "@/lib/epi-catalogo";
import { tamanhosAssociadosParaCadastro, unidadesAutorizadasDoProduto } from "@/lib/estoque-tamanho";
import { estaAtivo, paraSelecao } from "@/lib/parametros-base";
import { subcategoriasParaSelecao } from "@/lib/subcategoria-referencia";
import { useParametrosBase } from "@/lib/use-parametros-base";

const SEM_UNIDADE = "sem-unidade";
type Travas = { grupo: string; item: string };

type Props = {
  item: EpiCatalogo;
  modulo: "epi" | "uniforme";
  categoriaId: string;
  nomeProduto: string;
  salvando: boolean;
  onSalvar: (valores: Record<string, unknown>) => void;
  onCancelar: () => void;
};

// Editar do catálogo de EPI e de uniforme (decisão 51): abre todos os campos do cadastro, menos o
// código. Subcategoria e unidade (da descrição inteira) e o tamanho só mudam em item sem saldo e
// sem histórico; senão ficam travados com o motivo. A regra de verdade está em editarEpiCatalogo.
export function EdicaoCatalogoForm({ item, modulo, categoriaId, nomeProduto, salvando, onSalvar, onCancelar }: Props) {
  const parametros = useParametrosBase();
  const [sub, setSub] = useState(item.subcategoria_id ?? "");
  const [uni, setUni] = useState(item.unidade_id ?? SEM_UNIDADE);
  const [tam, setTam] = useState(item.tamanho_id ?? "");

  // Sem a função de conferência (banco real), nada fica travado na tela; quem recusa é a gravação.
  const { data: travas, isLoading: conferindo } = useQuery({
    queryKey: ["travas-catalogo", modulo, item.id],
    enabled: MODO_DEMO,
    queryFn: async (): Promise<Travas> => {
      const r = await (supabase as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: Travas | null; error: Error | null }> })
        .rpc("travas_catalogo", { p_tabela: modulo, p_id: item.id });
      return r.error || !r.data ? { grupo: "", item: "" } : r.data;
    },
  });

  const subcategorias = subcategoriasParaSelecao(parametros, categoriaId, item.subcategoria_id ? ({ id: item.subcategoria_id } as never) : null);
  // Unidades e tamanhos que a subcategoria autoriza em Gerais.
  const listasDe = (subId: string) => {
    const escolhida = subcategorias.find((s) => s.id === subId);
    const form = { categoria: escolhida?.nome ?? "", subcategoria_id: escolhida?.id ?? null };
    return {
      escolhida,
      unidades: escolhida ? paraSelecao(parametros, unidadesAutorizadasDoProduto(parametros, modulo, form)) : [],
      associados: escolhida ? tamanhosAssociadosParaCadastro(parametros, modulo, form) : [],
    };
  };
  const { escolhida: subEscolhida, unidades: unidadesGerais, associados } = listasDe(sub);
  // A unidade atual do item continua escolhível mesmo se saiu da lista (legada ou desativada).
  const unidades = item.unidade_id && !unidadesGerais.some((u) => u.id === item.unidade_id) && sub === (item.subcategoria_id ?? "")
    ? [...unidadesGerais, { id: item.unidade_id, nome: item.unidade_medida ?? "Unidade atual" }]
    : unidadesGerais;
  const opcoesTamanho = tam && !associados.some((t) => t.id === tam)
    ? [...associados, { id: tam, rotulo: "Tamanho atual (fora da subcategoria)" }]
    : associados;
  const travaGrupo = travas?.grupo ?? "";
  const travaTamanho = travas?.item ?? "";
  const bloqueado = MODO_DEMO && conferindo; // enquanto confere, nada de estrutura é editável
  const uniInicial = item.unidade_id ?? SEM_UNIDADE;
  const tamInicial = item.tamanho_id ?? "";

  // Ao trocar a subcategoria, o tamanho e a unidade ficam só se a nova subcategoria também os autoriza.
  function trocarSub(novaId: string) {
    const novas = listasDe(novaId);
    setSub(novaId);
    if (!novas.associados.some((t) => t.id === tam)) setTam("");
    if (!novas.unidades.some((u) => u.id === uni)) setUni(SEM_UNIDADE);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const trocouSub = sub !== (item.subcategoria_id ?? "");
    const trocouUni = uni !== uniInicial;
    const trocouTam = tam !== tamInicial;
    if ((trocouSub || tamInicial) && associados.length > 0 && !tam) {
      toast.error("Selecione o tamanho.");
      return;
    }
    const unidade = unidades.find((u) => u.id === uni);
    // Só manda o que a pessoa mudou, para uma edição simples não esbarrar nas travas.
    onSalvar({
      nome: String(f.get("nome") ?? ""),
      estoque_minimo: String(f.get("minimo") ?? ""),
      ...(trocouSub && subEscolhida ? { subcategoria: { id: subEscolhida.id, nome: subEscolhida.nome } } : {}),
      ...(trocouUni ? { unidade: unidade && uni !== SEM_UNIDADE ? { id: unidade.id, nome: unidade.nome } : null } : {}),
      ...(trocouTam || trocouSub ? { tamanho_id: tam || null, tamanhosPermitidos: associados.map((t) => t.id) } : {}),
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="edit-sub">Subcategoria</Label>
        <Select value={sub} onValueChange={trocarSub} disabled={!!travaGrupo || bloqueado}>
          <SelectTrigger id="edit-sub"><SelectValue placeholder="Selecione a subcategoria" /></SelectTrigger>
          <SelectContent>
            {subcategorias.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nome}{s.desativada ? " (desativada)" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-nome">Descrição do item</Label>
        <Input id="edit-nome" name="nome" defaultValue={item.nome} required />
      </div>
      {unidades.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="edit-unidade">Unidade</Label>
          <Select value={uni} onValueChange={setUni} disabled={!!travaGrupo || bloqueado}>
            <SelectTrigger id="edit-unidade"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_UNIDADE}>Sem unidade</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {(opcoesTamanho.length > 0 || item.tamanho_id) && (
        <div className="space-y-1.5">
          <Label htmlFor="edit-tamanho">Tamanho</Label>
          <Select value={tam} onValueChange={setTam} disabled={!!travaTamanho || bloqueado}>
            <SelectTrigger id="edit-tamanho"><SelectValue placeholder="Selecione o tamanho" /></SelectTrigger>
            <SelectContent>
              {opcoesTamanho.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="edit-minimo">Estoque mínimo</Label>
        <Input id="edit-minimo" name="minimo" inputMode="numeric" pattern="\d+" defaultValue={String(item.estoque_minimo)} required />
      </div>
      {(travaGrupo || travaTamanho) && (
        <p className="text-xs text-muted-foreground sm:col-span-2" data-testid="aviso-trava">
          {travaGrupo
            ? `Subcategoria, unidade e tamanho estão travados: este ${nomeProduto} ${travaGrupo}.`
            : `O tamanho está travado: este ${nomeProduto} ${travaTamanho}.`}
        </p>
      )}
      <p className="text-xs text-muted-foreground sm:col-span-2">
        A descrição, a subcategoria e a unidade valem para todos os tamanhos deste {nomeProduto}. O tamanho e o estoque mínimo são só deste registro. O código não muda.
      </p>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button requiresWrite type="submit" disabled={salvando}>Salvar</Button>
      </DialogFooter>
    </form>
  );
}
