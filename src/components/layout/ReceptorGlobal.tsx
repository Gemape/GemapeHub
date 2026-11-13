import { FileUp } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { VisorArquivo } from "@/components/VisorArquivo";
import { assinarReceptores, destinoDoSolto, ehPdf, ultimoRotulo } from "@/lib/arquivos-soltos";

const temArquivo = (e: DragEvent): boolean => Array.from(e.dataTransfer?.types ?? []).includes("Files");

// Arrastar e soltar em qualquer parte da tela. Mostra uma faixa "Solte aqui" enquanto o arquivo está sobre a janela; ao soltar, entrega à tela que sabe
// receber (fotos, nota fiscal) ou, para imagem e PDF avulsos, abre o visualizador. Sem isto, soltar um PDF fora de um campo faria o navegador sair do sistema.
export function ReceptorGlobal() {
  const rotulo = useSyncExternalStore(assinarReceptores, ultimoRotulo, () => null);
  const [arrastando, setArrastando] = useState(false);
  const [visor, setVisor] = useState<{ url: string; nome: string; pdf: boolean } | null>(null);
  const contador = useRef(0); // dragenter/dragleave disparam nos filhos: só zera quando saiu de tudo
  const urlAtual = useRef<string | null>(null);

  useEffect(() => {
    const entrou = (e: DragEvent) => { if (temArquivo(e)) { contador.current += 1; setArrastando(true); } };
    const saiu = (e: DragEvent) => { if (temArquivo(e)) { contador.current = Math.max(0, contador.current - 1); if (contador.current === 0) setArrastando(false); } };
    const sobre = (e: DragEvent) => { if (temArquivo(e)) e.preventDefault(); };
    const soltou = (e: DragEvent) => {
      if (!temArquivo(e)) return;
      e.preventDefault();
      contador.current = 0;
      setArrastando(false);
      const arquivos = Array.from(e.dataTransfer?.files ?? []);
      const destino = destinoDoSolto(arquivos);
      if (destino.tipo === "receptor") destino.receptor.receber(arquivos);
      else if (destino.tipo === "visualizar") {
        if (urlAtual.current) URL.revokeObjectURL(urlAtual.current);
        urlAtual.current = URL.createObjectURL(destino.arquivo);
        setVisor({ url: urlAtual.current, nome: destino.arquivo.name, pdf: ehPdf(destino.arquivo) });
      } else toast.error(destino.motivo);
    };
    window.addEventListener("dragenter", entrou);
    window.addEventListener("dragleave", saiu);
    window.addEventListener("dragover", sobre);
    window.addEventListener("drop", soltou);
    return () => {
      window.removeEventListener("dragenter", entrou);
      window.removeEventListener("dragleave", saiu);
      window.removeEventListener("dragover", sobre);
      window.removeEventListener("drop", soltou);
      if (urlAtual.current) URL.revokeObjectURL(urlAtual.current);
    };
  }, []);

  return (
    <>
      {arrastando && (
        <div role="status" className="pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-primary/15 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-primary bg-background/95 px-6 py-4 text-sm font-medium shadow-xl">
            <FileUp className="size-6 text-primary" aria-hidden="true" />
            {rotulo ? `Solte aqui para ${rotulo}` : "Solte aqui para visualizar o arquivo"}
          </div>
        </div>
      )}
      <VisorArquivo fonte={visor?.url ?? null} titulo={visor?.nome ?? ""} tipo={visor?.pdf ? "pdf" : "imagem"} onFechar={() => setVisor(null)} />
    </>
  );
}
