import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DadosSecao = { nome?: string; titulo: string; subtitulo: string };

// Seção (título e subtítulo opcionais; sem título ela fica oculta) e, ao criar um questionário novo, o nome dele (dec 179).
export function SecaoDialog({
  aberto, titulo, comNome, inicial, onSalvar, onFechar,
}: {
  aberto: boolean;
  titulo: string;
  comNome: boolean;
  inicial: DadosSecao;
  onSalvar: (d: DadosSecao) => void;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<DadosSecao>(inicial);
  useEffect(() => { if (aberto) setDados(inicial); }, [aberto, inicial]);
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) onFechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Cada seção vira uma página no preenchimento. Sem título, a seção fica oculta, mas a página continua separada.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); onSalvar(dados); }}
        >
          {comNome && (
            <div className="space-y-1">
              <Label htmlFor="secao-nome">Nome do questionário *</Label>
              <Input id="secao-nome" name="nome-questionario" capitalizar="texto" value={dados.nome ?? ""} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="secao-titulo">Título da seção</Label>
            <Input id="secao-titulo" name="titulo-secao" capitalizar="texto" value={dados.titulo} onChange={(e) => setDados({ ...dados, titulo: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="secao-subtitulo">Subtítulo (opcional)</Label>
            <Input id="secao-subtitulo" name="subtitulo-secao" capitalizar="texto" value={dados.subtitulo} onChange={(e) => setDados({ ...dados, subtitulo: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
