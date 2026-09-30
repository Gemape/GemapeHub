import { useRef, useSyncExternalStore } from "react";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assinarDocumento, documentoAberto, fecharDocumento } from "@/lib/visualizador-documento";

// Exibe o termo dentro da tela, num quadro isolado: sem aba nova, nada a bloquear.
// O quadro não executa scripts; imprimir e baixar ficam nos botões abaixo.
export function VisualizadorDocumento() {
  const documento = useSyncExternalStore(assinarDocumento, documentoAberto, () => null);
  const quadro = useRef<HTMLIFrameElement>(null);

  // Os botões de impressão do próprio termo não funcionam no quadro: ficam ocultos na tela.
  function ocultarBotoesDoTermo() {
    const doc = quadro.current?.contentDocument;
    if (!doc?.head) return;
    const estilo = doc.createElement("style");
    estilo.textContent = ".no-print { display: none !important; }";
    doc.head.appendChild(estilo);
  }

  function imprimir() {
    quadro.current?.contentWindow?.print();
  }

  function baixar() {
    if (!documento) return;
    const url = URL.createObjectURL(
      new Blob([documento.html], { type: "text/html;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = documento.arquivo;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Dialog open={!!documento} onOpenChange={(aberto) => !aberto && fecharDocumento()}>
      <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{documento?.titulo}</DialogTitle>
          <DialogDescription>
            Confira o documento, imprima ou baixe o arquivo para guardar.
          </DialogDescription>
        </DialogHeader>
        {documento && (
          <iframe
            ref={quadro}
            title={documento.titulo}
            srcDoc={documento.html}
            sandbox="allow-same-origin allow-modals"
            onLoad={ocultarBotoesDoTermo}
            className="min-h-0 w-full flex-1 rounded-md border bg-white"
          />
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={fecharDocumento}>
            Fechar
          </Button>
          <Button variant="outline" onClick={baixar}>
            <Download className="mr-1 size-4" /> Baixar
          </Button>
          <Button onClick={imprimir}>
            <Printer className="mr-1 size-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
