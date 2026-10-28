import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAccess } from "@/lib/access-context";
import { lerPermissoes } from "@/lib/permissoes-demo";
import { lerSupervisoresSalvos, salvarSupervisores, supervisoresEfetivos } from "@/lib/supervisores-ocorrencias";

// Cartão de Parâmetros > Veículos > Parâmetros Específicos (decisão 309): quais usuários do sistema são supervisores e validam a renovação do prazo da tratativa das
// ocorrências. Sem escolha salva, valem os administradores.
export function SupervisoresOcorrencias() {
  const { canWrite } = useAccess();
  const usuarios = lerPermissoes(localStorage).usuarios;
  const [salvos, setSalvos] = useState(() => supervisoresEfetivos(usuarios).map((u) => u.id));
  const [marcados, setMarcados] = useState(salvos);
  const igual = JSON.stringify([...marcados].sort()) === JSON.stringify([...salvos].sort());
  const alternar = (id: string, marcar: boolean) => setMarcados((m) => (marcar ? [...m, id] : m.filter((x) => x !== id)));

  function salvar() {
    try {
      salvarSupervisores(marcados);
      setSalvos(marcados);
      toast.success("Supervisores das ocorrências salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os supervisores.");
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="supervisores-ocorrencias">
      <div>
        <h2 id="supervisores-ocorrencias" className="text-lg font-semibold">Supervisores das ocorrências</h2>
        <p className="text-sm text-muted-foreground">
          Usuários que validam a renovação do prazo da tratativa. Quem já é supervisor renova sem senha; os outros escolhem um supervisor e digitam a senha de login dele.
          {lerSupervisoresSalvos() === null ? " Enquanto nada for salvo, valem os usuários do perfil Administrador." : ""}
        </p>
      </div>
      <div className="panel max-w-3xl space-y-3 p-4">
        <ul className="grid gap-1 sm:grid-cols-2">
          {usuarios.map((u) => (
            <li key={u.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                <Checkbox checked={marcados.includes(u.id)} disabled={!canWrite} onCheckedChange={(v) => alternar(u.id, v === true)} />
                <span className="min-w-0 flex-1 truncate">{u.nome}</span>
              </label>
            </li>
          ))}
        </ul>
        <Button requiresWrite disabled={igual} onClick={salvar}>Salvar supervisores</Button>
      </div>
    </section>
  );
}
