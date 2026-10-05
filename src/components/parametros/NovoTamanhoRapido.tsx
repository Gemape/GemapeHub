import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adicionarOpcao } from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// Cadastro rápido de tamanho (o mesmo de Gerais > Tamanho e Medidas), para usar sem sair da tela.
export function NovoTamanhoRapido() {
  const { tamanhos } = useParametrosBase();
  const [nome, setNome] = useState("");

  function incluir(e: React.FormEvent) {
    e.preventDefault();
    if (executar(() => adicionarOpcao("tamanhos", nome), "Tamanho cadastrado.")) setNome("");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={incluir} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="novo-tamanho-rapido">Novo tamanho ou numeração</Label>
          <Input
            id="novo-tamanho-rapido"
            value={nome}
            maxLength={60}
            placeholder="Ex.: M, GG, 42"
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <Button requiresWrite type="submit" disabled={!nome.trim()}>
          Incluir
        </Button>
      </form>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Já cadastrados ({tamanhos.length})</p>
        <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
          {tamanhos.map((t) => (
            <Badge key={t.id} variant="secondary">
              {t.nome}
            </Badge>
          ))}
          {tamanhos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum.</span>}
        </div>
      </div>
    </div>
  );
}
