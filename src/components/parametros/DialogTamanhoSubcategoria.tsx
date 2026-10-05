import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccess } from "@/lib/access-context";
import { criarTamanhoParaSubcategoria } from "@/lib/tamanho-subcategoria";
import { executar } from "@/lib/use-parametros-base";

type Props = {
  aberto: boolean;
  onAbrirMudou: (aberto: boolean) => void;
  subcategoriaId: string;
  subcategoriaNome: string;
  onCriado: (tamanhoId: string) => void;
};

// Cadastro de tamanho sem sair do cadastro de EPI ou uniforme. O tamanho vai para Gerais, já fica
// associado à subcategoria escolhida e é selecionado no campo Tamanho. Deve ficar ao lado (nunca
// dentro) do diálogo do cadastro.
export function DialogTamanhoSubcategoria({ aberto, onAbrirMudou, subcategoriaId, subcategoriaNome, onCriado }: Props) {
  const { isAdmin } = useAccess();
  const [nome, setNome] = useState("");

  function incluir(e: React.FormEvent) {
    e.preventDefault();
    let criadoId = "";
    const ok = executar(() => { criadoId = criarTamanhoParaSubcategoria(nome, subcategoriaId).id; }, "Tamanho cadastrado e associado à subcategoria.");
    if (ok) {
      onCriado(criadoId);
      mudarAberto(false);
    }
  }

  // O texto digitado não sobra quando a janela fecha (Cancelar, Esc ou sucesso).
  function mudarAberto(novo: boolean) {
    if (!novo) setNome("");
    onAbrirMudou(novo);
  }

  return (
    <Dialog open={aberto} onOpenChange={mudarAberto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar tamanho</DialogTitle>
          <DialogDescription>
            O tamanho entra em Gerais e já fica associado a {subcategoriaNome || "esta subcategoria"}.
          </DialogDescription>
        </DialogHeader>
        {isAdmin ? (
          <form onSubmit={incluir} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tamanho-subcategoria">Novo tamanho ou numeração</Label>
              <Input id="tamanho-subcategoria" value={nome} maxLength={60} placeholder="Ex.: M, GG, 42" onChange={(e) => setNome(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => mudarAberto(false)}>Cancelar</Button>
              <Button requiresWrite type="submit" disabled={!nome.trim()}>Cadastrar</Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Só o Administrador cadastra tamanhos. Peça a ele para cadastrar.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
