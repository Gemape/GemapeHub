import { useNavigate } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assinarPermissoes, definirUsuarioAtivo, fotografiaPermissoes, lerPermissoes, usuarioAtivo } from "@/lib/permissoes-demo";

// Só no modo demonstração (quem monta confere): "Entrar como" troca o usuário de teste. A matriz de acessos fica no card Configurações da tela inicial
// (ConfiguracoesAcessos). As permissões ficam no armazenamento do navegador, nunca no Supabase.
export function ConfiguracoesDemo() {
  useSyncExternalStore(assinarPermissoes, () => fotografiaPermissoes(localStorage), () => "");
  const navigate = useNavigate();
  const estado = lerPermissoes(localStorage);
  const ativo = usuarioAtivo(localStorage);

  function entrarComo(id: string) {
    definirUsuarioAtivo(localStorage, id);
    void navigate({ to: "/inicio" });
    toast.success(`Entrou como ${estado.usuarios.find((u) => u.id === id)?.nome ?? "usuário"}`);
  }

  return (
    <Select value={ativo.id} onValueChange={entrarComo}>
      <SelectTrigger aria-label="Entrar como" className="h-8 w-full min-w-0 text-xs sm:w-56">
        <UserRound className="mr-1 size-4 shrink-0" aria-hidden="true" /><SelectValue />
      </SelectTrigger>
      <SelectContent>
        {estado.usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
