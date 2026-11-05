import { AlertTriangle } from "lucide-react";

// Aviso da lista de habilitados desatualizada (decisão 413): há habilitados cadastrados, mas nenhum deles é empregado ativo da empresa escolhida (foram desligados ou são de outra
// empresa). Por isso a tela oferece todos os empregados ativos; o aviso diz como acertar a lista.
export function AvisoHabilitados({ desatualizada, onde }: { desatualizada: boolean; onde: string }) {
  if (!desatualizada) return null;
  return (
    <p role="status" className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 sm:col-span-2 lg:col-span-4">
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Nenhum empregado habilitado desta empresa está ativo, então aparecem todos os ativos. Atualize a lista em {onde}.
      </span>
    </p>
  );
}
