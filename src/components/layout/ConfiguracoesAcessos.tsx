import { ArrowLeft, Bell, BellRing, Brush, DatabaseBackup, HardDrive, History, KeyRound, Lock, Palette, Plug, ScrollText, ShieldCheck, SlidersHorizontal, Settings, UserCog, Users, type LucideIcon } from "lucide-react";
import { useRef, useState, type ComponentType } from "react";

import { CicladorDeIcones } from "@/components/CicladorDeIcones";
import { Button } from "@/components/ui/button";
import { MenuAncora } from "@/components/MenuAncora";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Aparencia } from "@/components/configuracoes/Aparencia";
import { Auditoria } from "@/components/configuracoes/Auditoria";
import { MenuDeSecoes } from "@/components/configuracoes/Campos";
import { Backup } from "@/components/configuracoes/Backup";
import { Integracoes } from "@/components/configuracoes/Integracoes";
import { Notificacoes } from "@/components/configuracoes/Notificacoes";
import { Seguranca } from "@/components/configuracoes/Seguranca";
import { UsuariosPermissoes } from "@/components/configuracoes/UsuariosPermissoes";

// Ícone que alterna entre dois do mesmo assunto (um some, o outro aparece), como nos cartões da tela inicial; cada lugar começa num tempo diferente.
const alternado = (a: LucideIcon, b: LucideIcon, atrasoMs: number): ComponentType<{ className?: string }> =>
  function IconeAlternado({ className }) {
    return <span className={`icone-alternado ${className ?? ""}`}><CicladorDeIcones icones={[a, b]} atrasoMs={atrasoMs} /></span>;
  };

// Os submenus de Configurações, na ordem em que aparecem.
const SUBMENUS: { id: string; nome: string; Icone: ComponentType<{ className?: string }>; Tela: ComponentType }[] = [
  { id: "aparencia", nome: "Aparência e personalização", Icone: alternado(Palette, Brush, 0), Tela: Aparencia },
  { id: "usuarios", nome: "Usuários, perfis e permissões", Icone: alternado(Users, UserCog, 400), Tela: UsuariosPermissoes },
  { id: "seguranca", nome: "Segurança e sessão", Icone: alternado(ShieldCheck, Lock, 800), Tela: Seguranca },
  { id: "notificacoes", nome: "Notificações e comunicação", Icone: alternado(Bell, BellRing, 1200), Tela: Notificacoes },
  { id: "integracoes", nome: "Integrações e API", Icone: alternado(KeyRound, Plug, 1600), Tela: Integracoes },
  { id: "backup", nome: "Backup e manutenção", Icone: alternado(DatabaseBackup, HardDrive, 2000), Tela: Backup },
  { id: "auditoria", nome: "Logs de auditoria", Icone: alternado(ScrollText, History, 2400), Tela: Auditoria },
];
const IconeDoTitulo = alternado(Settings, SlidersHorizontal, 0);

// Só no modo demonstração (quem monta confere): central de configurações com um submenu para cada assunto. Tudo fica no armazenamento do navegador, nunca no
// Supabase. Aberta pelo card Configurações do início (só o Administrador), em tela inteira.
export function ConfiguracoesAcessos({ aberto, onAberto }: { aberto: boolean; onAberto: (aberto: boolean) => void }) {
  const [ativoId, setAtivoId] = useState(SUBMENUS[0]!.id);
  const conteudo = useRef<HTMLDivElement>(null);
  const ativo = SUBMENUS.find((m) => m.id === ativoId) ?? SUBMENUS[0]!;
  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent semBotaoFechar className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 data-[state=open]:zoom-in-100 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 sm:max-w-none sm:rounded-none">
        <DialogHeader className="flex-row items-center space-y-0 gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/[0.04] to-transparent px-4 py-3 text-left sm:gap-4 sm:px-8 sm:py-4">
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onAberto(false)} title="Voltar à tela inicial" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:size-12">
            <IconeDoTitulo className="size-6" />
          </button>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg sm:text-xl">Configurações</DialogTitle>
            <DialogDescription className="line-clamp-2">Aparência, acessos, segurança, notificações, integrações, backup e auditoria.</DialogDescription>
          </div>
          <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => onAberto(false)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Retornar à tela inicial</span>
            <span className="sm:hidden">Início</span>
          </Button>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <MenuDeSecoes vertical rotulo="Submenus de Configurações" itens={SUBMENUS} ativo={ativo.id} aoEscolher={(id) => setAtivoId(id)} />
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {/* key: ao trocar de submenu a tela entra de novo, deslizando e aparecendo */}
            <div key={ativo.id} className="mx-auto w-full max-w-5xl animate-in fade-in-0 slide-in-from-right-2 duration-200 motion-reduce:animate-none">
              <h2 className="mb-5 text-xl font-semibold tracking-tight sm:text-2xl">{ativo.nome}</h2>
              {/* Sumário fixo: as seções (blocos) da tela aberta, com rolagem suave até cada uma. */}
              <MenuAncora raiz={conteudo} chave={ativo.id} />
              <div ref={conteudo}><ativo.Tela /></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
