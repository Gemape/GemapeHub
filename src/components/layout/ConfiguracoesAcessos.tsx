import { Bell, DatabaseBackup, KeyRound, Palette, ScrollText, ShieldCheck, Users } from "lucide-react";
import { useState, type ComponentType } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Aparencia } from "@/components/configuracoes/Aparencia";
import { Auditoria } from "@/components/configuracoes/Auditoria";
import { MenuDeSecoes } from "@/components/configuracoes/Campos";
import { Backup } from "@/components/configuracoes/Backup";
import { Integracoes } from "@/components/configuracoes/Integracoes";
import { Notificacoes } from "@/components/configuracoes/Notificacoes";
import { Seguranca } from "@/components/configuracoes/Seguranca";
import { UsuariosPermissoes } from "@/components/configuracoes/UsuariosPermissoes";

// Os submenus de Configurações, na ordem em que aparecem.
const SUBMENUS: { id: string; nome: string; Icone: ComponentType<{ className?: string }>; Tela: ComponentType }[] = [
  { id: "aparencia", nome: "Aparência e personalização", Icone: Palette, Tela: Aparencia },
  { id: "usuarios", nome: "Usuários, perfis e permissões", Icone: Users, Tela: UsuariosPermissoes },
  { id: "seguranca", nome: "Segurança e sessão", Icone: ShieldCheck, Tela: Seguranca },
  { id: "notificacoes", nome: "Notificações e comunicação", Icone: Bell, Tela: Notificacoes },
  { id: "integracoes", nome: "Integrações e API", Icone: KeyRound, Tela: Integracoes },
  { id: "backup", nome: "Backup e manutenção", Icone: DatabaseBackup, Tela: Backup },
  { id: "auditoria", nome: "Logs de auditoria", Icone: ScrollText, Tela: Auditoria },
];

// Só no modo demonstração (quem monta confere): central de configurações com um submenu para cada assunto. Tudo fica no armazenamento do navegador, nunca no
// Supabase. Aberta pelo card Configurações do início (só o Administrador).
export function ConfiguracoesAcessos({ aberto, onAberto }: { aberto: boolean; onAberto: (aberto: boolean) => void }) {
  const [ativoId, setAtivoId] = useState(SUBMENUS[0]!.id);
  const ativo = SUBMENUS.find((m) => m.id === ativoId) ?? SUBMENUS[0]!;
  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Aparência, acessos, segurança, notificações, integrações, backup e auditoria.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <MenuDeSecoes vertical rotulo="Submenus de Configurações" itens={SUBMENUS} ativo={ativo.id} aoEscolher={(id) => setAtivoId(id)} />
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-5">
            {/* key: ao trocar de submenu a tela entra de novo, deslizando e aparecendo */}
            <div key={ativo.id} className="animate-in fade-in-0 slide-in-from-right-2 duration-200 motion-reduce:animate-none">
              <h2 className="mb-4 text-lg font-semibold">{ativo.nome}</h2>
              <ativo.Tela />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
