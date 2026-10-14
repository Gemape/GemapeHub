import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRAZO_MAXIMO_DIAS, lerPrazoDias, prazoValido, salvarPrazoDias } from "@/lib/prazo-viagens";

export const Route = createFileRoute("/_authenticated/cadastros/viagens")({
  head: () => ({ meta: [{ title: "Parâmetros de Viagens | Patrimônio GEMAPE" }] }),
  component: PaginaParametrosViagens,
});

// Parâmetros > Viagens (dec 190): prazo, em dias após a data da despesa, para o lançamento contar como "no prazo".
function PaginaParametrosViagens() {
  const [salvo, setSalvo] = useState(lerPrazoDias);
  const [texto, setTexto] = useState(String(salvo));
  const numero = texto.trim() === "" ? Number.NaN : Number(texto);
  const valido = prazoValido(numero);

  function salvar() {
    if (!valido) return;
    try {
      salvarPrazoDias(numero);
      setSalvo(numero);
      toast.success("Prazo salvo.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o prazo.");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Parâmetros</p>
        <h1 className="text-2xl font-bold">Viagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">Regras do módulo Viagens.</p>
      </header>
      <section className="panel max-w-md space-y-3 p-4" aria-labelledby="prazo-lancamento">
        <h2 id="prazo-lancamento" className="text-lg font-semibold">Prazo para lançar a despesa</h2>
        <div className="space-y-1">
          <Label htmlFor="prazo-dias">Dias após a data da despesa</Label>
          <Input id="prazo-dias" name="prazo-dias" type="number" inputMode="numeric" min={0} max={PRAZO_MAXIMO_DIAS} step={1} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <p className="text-xs text-muted-foreground">Hoje: {salvo} {salvo === 1 ? "dia" : "dias"}. Com 0, só vale lançar no mesmo dia. Usado no índice de lançamento no prazo do painel de Viagens.</p>
        </div>
        {!valido && <p role="alert" className="text-sm text-destructive">Informe um número inteiro de dias entre 0 e {PRAZO_MAXIMO_DIAS}.</p>}
        <Button requiresWrite disabled={!valido || numero === salvo} onClick={salvar}>Salvar</Button>
      </section>
    </div>
  );
}
