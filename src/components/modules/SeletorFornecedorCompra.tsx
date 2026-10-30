import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fornecedoresDaCategoria, rotuloDoFornecedor } from "@/lib/compras-fornecedor";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import { MODO_DEMO } from "@/lib/modo-demo";

// Fornecedor da compra: no demonstrativo vem de Cadastros > Fornecedores (todos, sem categoria).
// No banco real o cadastro de fornecedores ainda não existe (Fase 2): lá continua o campo de texto.
export function SeletorFornecedorCompra({
  categoriaId,
  valor,
  onChange,
}: {
  categoriaId: string;
  valor: string;
  onChange: (id: string) => void;
}) {
  // Lê de novo a cada vez que o formulário monta e quando a pessoa volta da aba onde cadastrou o fornecedor (decisão 327).
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const aoVoltar = () => setVersao((v) => v + 1);
    window.addEventListener("focus", aoVoltar);
    return () => window.removeEventListener("focus", aoVoltar);
  }, []);
  const fornecedores = useMemo(
    () => (MODO_DEMO ? fornecedoresDaCategoria(listarFornecedores(), categoriaId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoriaId, versao],
  );

  if (!MODO_DEMO) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="fornecedor">Fornecedor</Label>
        <Input id="fornecedor" name="fornecedor" capitalizar="texto" required placeholder="Nome do fornecedor" />
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
      {fornecedores.length === 0 && <p className="text-xs text-muted-foreground">Nenhum fornecedor cadastrado.</p>}
      <p className="text-xs text-muted-foreground">
        Fornecedor não está na lista?{" "}
        <a href="/cadastros/fornecedores" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">Cadastrar fornecedor</a>
      </p>
    </div>
  );
}
