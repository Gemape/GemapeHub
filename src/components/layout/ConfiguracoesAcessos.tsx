import { toast } from "sonner";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ACOES, PADRAO_DO_PERFIL, PERFIS, SUBTELAS, TELAS, alternarAcao, assinarPermissoes, efetivas, fotografiaPermissoes, lerPermissoes, mudarPerfil,
  restaurarPermissoes, salvarPermissoes, usuarioAtivo, voltarAoPerfil, type Acao, type PerfilId,
} from "@/lib/permissoes-demo";

const ROTULO_ACAO: Record<Acao, string> = { ver: "Ver", criar: "Criar", editar: "Editar", excluir: "Excluir" };

// Só no modo demonstração (quem monta confere): matriz de acessos por usuário, uma linha para cada módulo e para cada menu do sistema (abas e itens de
// Parâmetros), com caixas de marcar por ação. As permissões ficam no armazenamento do navegador, nunca no Supabase. Aberta pelo card Configurações do início.
export function ConfiguracoesAcessos({ aberto, onAberto }: { aberto: boolean; onAberto: (aberto: boolean) => void }) {
  useSyncExternalStore(assinarPermissoes, () => fotografiaPermissoes(localStorage), () => "");
  const estado = lerPermissoes(localStorage);
  const ativo = usuarioAtivo(localStorage);
  const [editadoId, setEditadoId] = useState(ativo.id);
  const editado = estado.usuarios.find((u) => u.id === editadoId) ?? ativo;
  const matriz = efetivas(editado);
  const travado = editado.perfil === "admin";

  const marcar = (tela: string, acao: Acao, valor: boolean) => salvarPermissoes(localStorage, alternarAcao(estado, editado.id, tela, acao, valor));
  const excecao = (tela: string, acao: Acao) => {
    if (SUBTELAS.some((s) => s.id === tela)) return editado.excecoes[tela]?.[acao] !== undefined;
    return !!matriz[tela]?.[acao] !== !!PADRAO_DO_PERFIL[editado.perfil][tela]?.[acao];
  };

  const linha = (id: string, nome: string, grupo: string | null, menuDe: string | null) => (
    <tr key={id} className="border-b last:border-0 hover:bg-muted/40">
      <td className={`px-3 py-2 ${menuDe ? "pl-8" : "border-l-4 border-l-primary/60 bg-primary/5 font-semibold"}`}>
        {grupo && menuDe === null && <span className="text-xs text-muted-foreground">{grupo} · </span>}
        {nome}
        {menuDe && <span className="ml-1 text-xs text-muted-foreground">({grupo})</span>}
      </td>
      {ACOES.map((a) => (
        <td key={a} className={`px-3 py-2 text-center ${menuDe ? "" : "bg-primary/5"}`}>
          <span className="relative inline-flex">
            <Checkbox
              aria-label={`${ROTULO_ACAO[a]} ${nome}${menuDe ? ` (${grupo})` : ""}`}
              checked={!!matriz[id]?.[a]}
              disabled={travado || (menuDe !== null && !matriz[menuDe]?.ver)}
              onCheckedChange={(v) => marcar(id, a, v === true)}
            />
            {excecao(id, a) && <span className="absolute -right-2.5 -top-1 text-xs leading-none text-primary" title="Exceção ao padrão">*</span>}
          </span>
        </td>
      ))}
    </tr>
  );

  return (
    <Dialog open={aberto} onOpenChange={(v) => { onAberto(v); if (v) setEditadoId(ativo.id); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configurações · acessos por usuário</DialogTitle>
          <DialogDescription>
            Só teste, gravado neste navegador. Cada módulo e cada menu do sistema (abas e itens de Parâmetros) tem as suas caixas. O perfil dá o ponto de partida; o menu
            herda o do módulo, e marcar ou desmarcar dá exceções a um usuário (marcadas com *). Gerais e Configurações são sempre só do Administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="usuario-config">Usuário</label>
            <Select value={editado.id} onValueChange={setEditadoId}>
              <SelectTrigger id="usuario-config"><SelectValue /></SelectTrigger>
              <SelectContent>{estado.usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="perfil-config">Perfil</label>
            <Select value={editado.perfil} onValueChange={(v) => salvarPermissoes(localStorage, mudarPerfil(estado, editado.id, v as PerfilId))} disabled={editado.id === ativo.id && travado}>
              <SelectTrigger id="perfil-config"><SelectValue /></SelectTrigger>
              <SelectContent>{PERFIS.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {travado && <p className="rounded-lg border bg-primary/5 px-3 py-2 text-xs text-muted-foreground">O Administrador sempre tem todos os acessos; para testar restrições, escolha outro usuário.</p>}
        <div className="overflow-x-auto rounded-xl border bg-muted/30 p-2">
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-left">
                <th className="px-3 py-2.5 font-semibold">Tela / menu</th>
                {ACOES.map((a) => <th key={a} className="px-3 py-2.5 text-center font-semibold">{ROTULO_ACAO[a]}</th>)}
              </tr>
            </thead>
            <tbody>
              {TELAS.flatMap((t) => [
                linha(t.id, t.nome, t.grupo, null),
                ...SUBTELAS.filter((s) => s.pai === t.id).map((s) => linha(s.id, s.nome, s.grupo, t.id)),
              ])}
            </tbody>
          </table>
        </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => { salvarPermissoes(localStorage, voltarAoPerfil(estado, editado.id)); toast.success("Voltou ao padrão do perfil"); }} disabled={travado}>
            Voltar ao padrão do perfil
          </Button>
          <Button type="button" variant="outline" onClick={() => { if (confirm("Restaurar as permissões originais de todos os usuários de teste? O usuário volta a ser o Administrador.")) { restaurarPermissoes(localStorage); setEditadoId(usuarioAtivo(localStorage).id); toast.success("Permissões originais restauradas"); } }}>
            Restaurar permissões originais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
