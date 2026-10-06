import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { comprimirImagem } from "@/lib/imagem";
import { MAX_FOTOS } from "@/lib/ocorrencias-veiculo";

// Botão "Anexar fotos": cada foto é comprimida (lado maior até 1024 px, JPEG) antes de ser guardada,
// para não ocupar muito espaço (decisão 60). Devolve os data URLs prontos.
export function BotaoAnexarFotos({
  quantidadeAtual,
  onFotos,
  desabilitado = false,
}: {
  quantidadeAtual: number;
  onFotos: (fotos: string[]) => void;
  desabilitado?: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const restante = MAX_FOTOS - quantidadeAtual;

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (arquivos.length === 0) return;
    if (arquivos.length > restante) {
      toast.error(`Cabem mais ${restante} foto(s) (máximo ${MAX_FOTOS} por ocorrência).`);
      return;
    }
    setProcessando(true);
    try {
      onFotos(await Promise.all(arquivos.map(comprimirImagem)));
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível processar as fotos.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => void escolher(e)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={desabilitado || processando || restante <= 0}
        onClick={() => entrada.current?.click()}
      >
        {processando ? "Reduzindo as fotos..." : "Anexar fotos"}
      </Button>
      <span className="text-xs text-muted-foreground">{quantidadeAtual}/{MAX_FOTOS} fotos, reduzidas ao anexar</span>
    </>
  );
}

export function GaleriaFotos({
  fotos,
  onAmpliar,
  onRemover,
}: {
  fotos: string[];
  onAmpliar: (indice: number) => void;
  onRemover?: ((indice: number) => void) | undefined;
}) {
  if (fotos.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {fotos.map((foto, i) => (
        <li key={i} className="relative">
          <button type="button" aria-label={`Ampliar foto ${i + 1}`} onClick={() => onAmpliar(i)}>
            <img src={foto} alt={`Foto ${i + 1} da ocorrência`} className="size-20 rounded-md border object-cover" />
          </button>
          {onRemover && (
            <button
              type="button"
              aria-label={`Remover foto ${i + 1}`}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
              onClick={() => onRemover(i)}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// Diálogo irmão dos outros (nunca dentro de um deles): mostra uma foto ampliada.
export function VisorFoto({ foto, titulo, onFechar }: { foto: string | null; titulo: string; onFechar: () => void }) {
  return (
    <Dialog open={foto !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className="sr-only">Foto da ocorrência ampliada</DialogDescription>
        </DialogHeader>
        {foto && <img src={foto} alt={titulo} className="max-h-[70vh] w-full rounded-md object-contain" />}
      </DialogContent>
    </Dialog>
  );
}
