import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import {
  CATEGORIAS_BASE,
  DIGITOS_CODIGO,
  gerarCodigo,
  removerRegraCodigo,
  salvarRegraCodigo,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/codigo-produto")({
  head: () => ({ meta: [{ title: "Código do produto | Patrimônio GEMAPE" }] }),
  component: CodigoProduto,
});

const selectClasse = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
const exemplos = (regra: { sigla: string; inicial: string }) =>
  [0, 1, 2].map((i) => gerarCodigo(regra, i)).join(", ") + "…";

function CodigoProduto() {
  const dados = useParametrosBase();
  const [categoriaId, setCategoriaId] = useState("");
  const [sigla, setSigla] = useState("");
  const [inicial, setInicial] = useState("");
  const nomeCategoria = (id: string) => dados.categorias.find((c) => c.id === id)?.nome ?? "—";
  const previa =
    /^[A-Za-z0-9]{1,6}$/.test(sigla.trim()) && /^\d{1,4}$/.test(inicial) && Number(inicial) > 0
      ? exemplos({
          sigla: sigla.trim().toUpperCase(),
          inicial: inicial.padStart(DIGITOS_CODIGO, "0"),
        })
      : "";

  function escolher(id: string) {
    const regra = dados.regrasCodigo.find((r) => r.categoriaId === id);
    setCategoriaId(id);
    setSigla(regra?.sigla ?? "");
    setInicial(regra?.inicial ?? "");
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!categoriaId) return;
    if (executar(() => salvarRegraCodigo(categoriaId, sigla, inicial), "Regra salva."))
      escolher("");
  }

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Código do produto"
        descricao="Ensina o sistema a gerar o código interno da GEMAPE: para cada categoria, a sigla e a numeração inicial. A numeração tem 4 dígitos (EPI-0001, EPI-0002…)."
      />
      <form
        onSubmit={enviar}
        className="panel grid gap-4 p-4 sm:grid-cols-[1fr_8rem_10rem_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoria</Label>
          <select
            id="categoria"
            required
            className={selectClasse}
            value={categoriaId}
            onChange={(e) => escolher(e.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {dados.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sigla">Sigla</Label>
          <Input
            id="sigla"
            required
            maxLength={6}
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase())}
            placeholder="EPI"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inicial">Numeração inicial</Label>
          <Input
            id="inicial"
            required
            inputMode="numeric"
            maxLength={DIGITOS_CODIGO}
            value={inicial}
            onChange={(e) => setInicial(e.target.value.replace(/\D/g, ""))}
            placeholder="0001"
          />
        </div>
        <Button type="submit" disabled={!categoriaId}>
          Salvar
        </Button>
        <p className="text-sm text-muted-foreground sm:col-span-4">
          {previa ? (
            <>
              Códigos gerados:{" "}
              <span className="font-mono font-medium text-foreground">{previa}</span>
            </>
          ) : (
            "Informe a sigla e a numeração inicial para ver os códigos."
          )}
        </p>
      </form>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Numeração inicial</TableHead>
              <TableHead>Códigos gerados</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.categorias.map((c) => {
              const regra = dados.regrasCodigo.find((r) => r.categoriaId === c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{nomeCategoria(c.id)}</TableCell>
                  <TableCell>
                    {regra?.sigla ?? <span className="text-muted-foreground">Sem regra</span>}
                  </TableCell>
                  <TableCell>{regra?.inicial ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {regra ? exemplos(regra) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => escolher(c.id)}>
                      {regra ? "Editar" : "Definir"}
                    </Button>
                    {regra && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Regra de categoria-base não sai: a exclusão é recusada com o aviso
                          // de quais cadastros ficariam bloqueados, sem pedir confirmação.
                          if (
                            CATEGORIAS_BASE[c.id] ||
                            confirm(`Excluir a regra de código de ${c.nome}?`)
                          )
                            executar(() => removerRegraCodigo(c.id), "Regra excluída.");
                        }}
                      >
                        Excluir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
