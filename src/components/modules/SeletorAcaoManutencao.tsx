import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AcaoManutencaoVeiculo } from "@/lib/parametros-base";

export const SEM_ACAO = "nenhuma";

// Ação de manutenção do veículo (decisão 46): escolhe-se o pai e abrem as caixas dos filhos.
export function SeletorAcaoManutencao({
  acoes,
  acaoId,
  marcados,
  onAcao,
  onMarcados,
}: {
  acoes: AcaoManutencaoVeiculo[];
  acaoId: string;
  marcados: string[];
  onAcao: (id: string) => void;
  onMarcados: (ids: string[]) => void;
}) {
  const acao = acoes.find((a) => a.id === acaoId);
  const alternar = (id: string, ligado: boolean) =>
    onMarcados(ligado ? [...marcados, id] : marcados.filter((m) => m !== id));
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="space-y-1.5">
        <Label htmlFor="acao_manutencao">Ação de manutenção</Label>
        <Select
          value={acaoId || SEM_ACAO}
          onValueChange={(v) => {
            onAcao(v === SEM_ACAO ? "" : v);
            onMarcados([]);
          }}
        >
          <SelectTrigger id="acao_manutencao">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_ACAO}>Não se aplica</SelectItem>
            {acoes.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {acoes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma ação cadastrada. Cadastre em Parâmetros &gt; Veículos &gt; Ações de manutenção.
          </p>
        )}
      </div>
      {acao && (
        <fieldset className="rounded-md border p-3">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Marque o que foi feito</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {acao.subitens.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Checkbox
                  id={`sub-${s.id}`}
                  checked={marcados.includes(s.id)}
                  onCheckedChange={(v) => alternar(s.id, v === true)}
                />
                <Label htmlFor={`sub-${s.id}`} className="font-normal">
                  {s.nome}
                </Label>
              </div>
            ))}
            {acao.subitens.length === 0 && (
              <p className="text-xs text-muted-foreground">Esta ação não tem subitens cadastrados.</p>
            )}
          </div>
        </fieldset>
      )}
    </div>
  );
}
