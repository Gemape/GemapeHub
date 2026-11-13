import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

// Visualizador embutido: foto com zoom (botões, Ctrl + rolagem) ou PDF no quadro do navegador, sem baixar nada para a pasta Downloads.
// `fonte` é um endereço (data:, blob: ou do site). Diálogo irmão dos outros, nunca dentro de um deles.
export function VisorArquivo({ fonte, titulo, tipo, onFechar }: { fonte: string | null; titulo: string; tipo: "imagem" | "pdf"; onFechar: () => void }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => setZoom(1), [fonte]);
  // Ctrl + rolagem muda o zoom da foto, não o da página: o React registra o wheel como passivo (não deixa cancelar), então o ouvinte é nativo.
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!area) return;
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + (e.deltaY < 0 ? 0.25 : -0.25)) * 100) / 100)));
    };
    area.addEventListener("wheel", roda, { passive: false });
    return () => area.removeEventListener("wheel", roda);
  }, [area]);
  const mudar = (delta: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));
  return (
    <Dialog open={fonte !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="flex h-[90vh] flex-col gap-3 p-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className="sr-only">Visualização do arquivo dentro do sistema</DialogDescription>
        </DialogHeader>
        {fonte && tipo === "imagem" && (
          <>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" aria-label="Diminuir" disabled={zoom <= ZOOM_MIN} onClick={() => mudar(-0.25)}><Minus className="size-4" /></Button>
              <span className="w-12 text-center text-sm tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
              <Button type="button" size="sm" variant="outline" aria-label="Ampliar" disabled={zoom >= ZOOM_MAX} onClick={() => mudar(0.25)}><Plus className="size-4" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setZoom(1)}><RotateCcw className="mr-1 size-4" />Tamanho original</Button>
            </div>
            <div ref={setArea} className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/40">
              <img src={fonte} alt={titulo} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className="mx-auto block h-auto" draggable={false} />
            </div>
          </>
        )}
        {fonte && tipo === "pdf" && <iframe title={titulo} src={fonte} className="min-h-0 w-full flex-1 rounded-md border bg-white" />}
      </DialogContent>
    </Dialog>
  );
}
