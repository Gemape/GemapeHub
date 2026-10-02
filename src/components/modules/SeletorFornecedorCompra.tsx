import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fornecedoresDaCategoria, rotuloDoFornecedor } from "@/lib/compras-fornecedor";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import { MODO_DEMO } from "@/lib/modo-demo";

// Fornecedor da compra: no demonstrativo vem de Cadastros > Fornecedores, da categoria do módulo.
// No banco real o cadastro de fornecedores ainda não existe (Fase 2): lá continua o campo de texto.
export function SeletorFornecedorCompra({
  categoriaId,
  nomeCategoria,
  valor,
  onChange,
}: {
  categoriaId: string;
  nomeCategoria: string;
  valor: string;
  onChange: (id: string) => void;
}) {
  // Lê de novo a cada vez que o formulário monta, para pegar o que acabou de ser cadastrado.
  const fornecedores = useMemo(
    () => (MODO_DEMO ? fornecedoresDaCategoria(listarFornecedores(), categoriaId) : []),
    [categoriaId],
  );

  if (!MODO_DEMO) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="fornecedor">Fornecedor</Label>
        <Input id="fornecedor" name="fornecedor" required placeholder="Nome do fornecedor" />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="fornecedor">Fornecedor</Label>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger id="fornecedor">
          <SelectValue placeholder="Selecione o fornecedor" />
        </SelectTrigger>
        <SelectContent>
          {fornecedores.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {rotuloDoFornecedor(f)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {fornecedores.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum fornecedor de {nomeCategoria} cadastrado. Cadastre em Cadastros &gt; Fornecedores, marcando a categoria {nomeCategoria}.
        </p>
      )}
    </div>
  );
}
