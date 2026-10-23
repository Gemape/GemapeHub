import { useNavigate } from "@tanstack/react-router";
import { Settings, UserRound } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ACOES, PADRAO_DO_PERFIL, PERFIS, TELAS, alternarAcao, assinarPermissoes, definirUsuarioAtivo, efetivas, fotografiaPermissoes, lerPermissoes, mudarPerfil,
  restaurarPermissoes, salvarPermissoes, usuarioAtivo, voltarAoPerfil, type Acao, type PerfilId, type TelaId,
} from "@/lib/permissoes-demo";

const ROTULO_ACAO: Record<Acao, string> = { ver: "Ver", criar: "Criar", editar: "Editar", excluir: "Excluir" };

// Só no modo demonstração (quem monta confere): "Entrar como" troca o usuário de teste e, para o Administrador, Configurações abre a matriz de acessos
// com caixas de marcar por tela e ação. As permissões ficam no armazenamento do navegador, nunca no Supabase.
export function ConfiguracoesDemo() {
  useSyncExternalStore(assinarPermissoes, () => fotografiaPermissoes(localStorage), () => "");
  const navigate = useNavigate();
  const estado = lerPermissoes(localStorage);
  const ativo = usuarioAtivo(localStorage);
  const [aberto, setAberto] = useState(false);
  const [editadoId, setEditadoId] = useState(ativo.id);
  const editado = estado.usuarios.find((u) => u.id === editadoId) ?? ativo;
  const matriz = efetivas(editado);
  const travado = editado.perfil === "admin";

  function entrarComo(id: string) {
    definirUsuarioAtivo(localStorage, id);
    void navigate({ to: "/inicio" });
    toast.success(`Entrou como ${estado.usuarios.find((u) => u.id === id)?.nome ?? "usuário"}`);
  }
  const marcar = (tela: TelaId, acao: Acao, valor: boolean) => salvarPermissoes(localStorage, alternarAcao(estado, editado.id, tela, acao, valor));
  const diferente = (tela: TelaId, acao: Acao) => !!matriz[tela]?.[acao] !== !!PADRAO_DO_PERFIL[editado.perfil][tela]?.[acao];

  return (
    <>
      <Select value={ativo.id} onValueChange={entrarComo}>
        <SelectTrigger aria-label="Entrar como" className="h-8 w-56 text-xs">
          <UserRound className="mr-1 size-4 shrink-0" aria-hidden="true" /><SelectValue />
        </SelectTrigger>
        <SelectContent>
          {estado.usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
        </SelectContent>
      </Select>
      {ativo.perfil === "admin" && (
        <Dialog open={aberto} onOpenChange={(v) => { setAberto(v); if (v) setEditadoId(ativo.id); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Configurações"><Settings className="mr-1 size-4" aria-hidden="true" />Configurações</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configurações · acessos por usuário</DialogTitle>
              <DialogDescription>
                Só teste, gravado neste navegador. O perfil dá o ponto de partida; marque ou desmarque para dar exceções a um usuário (marcadas com *). Gerais e Configurações
                são sempre só do Administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
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
            {travado && <p className="text-xs text-muted-foreground">O Administrador sempre tem todos os acessos; para testar restrições, escolha outro usuário.</p>}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2 font-medium">Tela</th>
                    {ACOES.map((a) => <th key={a} className="p-2 text-center font-medium">{ROTULO_ACAO[a]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TELAS.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="p-2"><span className="text-xs text-muted-foreground">{t.grupo} · </span>{t.nome}</td>
                      {ACOES.map((a) => (
                        <td key={a} className="p-2 text-center">
                          <span className="relative inline-flex">
                            <Checkbox
                              aria-label={`${ROTULO_ACAO[a]} ${t.nome}`}
                              checked={!!matriz[t.id]?.[a]}
                              disabled={travado}
                              onCheckedChange={(v) => marcar(t.id, a, v === true)}
                            />
                            {diferente(t.id, a) && <span className="absolute -right-2.5 -top-1 text-xs leading-none text-primary" title="Exceção ao padrão do perfil">*</span>}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
      )}
    </>
  );
}
