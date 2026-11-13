import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { VisorArquivo } from "@/components/VisorArquivo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ehImagem, registrarReceptor } from "@/lib/arquivos-soltos";
import { comprimirImagem } from "@/lib/imagem";
import { MAX_FOTOS } from "@/lib/ocorrencias-veiculo";

// Botão "Anexar fotos": cada foto é comprimida (lado maior até 1024 px, JPEG) antes de ser guardada,
// para não ocupar muito espaço (decisão 60). Devolve os data URLs prontos.
export function BotaoAnexarFotos({
  quantidadeAtual,
  onFotos,
  desabilitado = false,
  maximo = MAX_FOTOS,
  oQue = "ocorrência",
}: {
  quantidadeAtual: number;
  onFotos: (fotos: string[]) => void;
  desabilitado?: boolean;
  maximo?: number;
  oQue?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const restante = maximo - quantidadeAtual;

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    await processar(arquivos);
  }

  async function processar(arquivos: File[]) {
    if (arquivos.length === 0) return;
    if (arquivos.length > restante) {
      toast.error(`Cabem mais ${restante} foto(s) (máximo ${maximo} por ${oQue}).`);
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

  // Arrastar e soltar: enquanto este botão está na tela e pode receber fotos, soltar imagens em qualquer parte da tela as anexa.
  const processarRef = useRef(processar);
  processarRef.current = processar;
  useEffect(() => {
    if (desabilitado || restante <= 0) return;
    return registrarReceptor({ rotulo: `anexar as fotos da ${oQue}`, aceita: ehImagem, receber: (arquivos) => void processarRef.current(arquivos) });
  }, [desabilitado, restante, oQue]);

  return (
    <>
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => void escolher(e)} />
      {/* No celular, capture abre direto a câmera de trás; no computador vira a escolha de um arquivo, como a galeria. */}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void escolher(e)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={desabilitado || processando || restante <= 0}
        onClick={() => entrada.current?.click()}
      >
        {processando ? "Reduzindo as fotos..." : "Anexar fotos"}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={desabilitado || processando || restante <= 0} onClick={() => camera.current?.click()}>
        Tirar foto
      </Button>
      <span className="text-xs text-muted-foreground">{quantidadeAtual}/{maximo} fotos, reduzidas ao anexar</span>
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

// Diálogo irmão dos outros (nunca dentro de um deles): mostra uma foto ampliada, com zoom.
export function VisorFoto({ foto, titulo, onFechar }: { foto: string | null; titulo: string; onFechar: () => void }) {
  return <VisorArquivo fonte={foto} titulo={titulo} tipo="imagem" onFechar={onFechar} />;
}
