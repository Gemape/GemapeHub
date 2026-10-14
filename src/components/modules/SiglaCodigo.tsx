import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RegraCodigo } from "@/lib/parametros-base";

// Escolha da sigla do código quando a categoria tem mais de uma (Cadastros > Gerais > Código do produto).
// Com uma só, não aparece: o código sai pela única regra. A primeira da lista é a padrão.
export function SiglaCodigo({ regras, valor, onMudar, className }: {
  regras: RegraCodigo[];
  valor: string;
  onMudar: (sigla: string) => void;
  className?: string;
}) {
  if (regras.length < 2) return null;
  const atual = regras.some((r) => r.sigla === valor) ? valor : (regras[0]?.sigla ?? "");
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor="sigla-codigo">Sigla do código</Label>
      <Select value={atual} onValueChange={(v) => { if (v) onMudar(v); }}>
        <SelectTrigger id="sigla-codigo"><SelectValue /></SelectTrigger>
        <SelectContent>
          {regras.map((r) => <SelectItem key={r.sigla} value={r.sigla}>{r.sigla}{r === regras[0] ? " (padrão)" : ""}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
