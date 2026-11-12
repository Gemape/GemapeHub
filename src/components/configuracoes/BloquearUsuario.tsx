import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { comBloqueio } from "@/lib/configuracoes-demo";
import { assinarPermissoes, fotografiaPermissoes, lerPermissoes, nomeDoPerfil, usuarioAtivo } from "@/lib/permissoes-demo";
import { useConfig } from "./useConfig";

// Botão que abre a lista de usuários: cada um tem um interruptor que bloqueia na hora e, ao desligar, libera de volta.
export function BloquearUsuario() {
  const [aberto, setAberto] = useState(false);
  const { config, mudar } = useConfig();
  useSyncExternalStore(assinarPermissoes, () => fotografiaPermissoes(localStorage), () => "");
  const estado = lerPermissoes(localStorage);
  const eu = usuarioAtivo(localStorage);
  const bloqueados = config.usuarios.inativos;

  function alternar(u: { id: string; nome: string }, bloquear: boolean) {
    mudar((c) => comBloqueio(c, eu.nome, u, bloquear));
    toast.success(bloquear ? `${u.nome} bloqueado(a) agora${config.seguranca.encerrarSessoesAoBloquear ? ", sessões encerradas" : ""}` : `${u.nome} liberado(a) de volta`);
  }

  return (
    <>
      <Button id="abrir-bloqueio" type="button" size="sm" className="h-8 px-3 text-xs" onClick={() => setAberto(true)}>Escolher usuário</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear usuário</DialogTitle>
            <DialogDescription>Ligue para bloquear na hora. Desligue para liberar de volta. Simulado: ninguém é desconectado de verdade neste teste.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y rounded-lg border">
            {estado.usuarios.map((u) => {
              const bloqueado = bloqueados.includes(u.id);
              const proprio = u.id === eu.id;
              return (
                <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.nome}{proprio && <span className="ml-1 text-xs font-normal text-muted-foreground">(você)</span>}</p>
                    <p className="text-xs text-muted-foreground">{nomeDoPerfil(estado, u.perfil)} · {bloqueado ? "Bloqueado" : "Com acesso"}</p>
                  </div>
                  <Switch aria-label={`Bloquear ${u.nome}`} checked={bloqueado} disabled={proprio} onCheckedChange={(v) => alternar(u, v)} />
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
