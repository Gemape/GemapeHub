import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRAZO_MAXIMO_DIAS, lerPrazos, prazoValido, salvarPrazos } from "@/lib/prazo-viagens";

export const Route = createFileRoute("/_authenticated/cadastros/viagens")({
  head: () => ({ meta: [{ title: "Parâmetros de Viagens | Patrimônio GEMAPE" }] }),
  component: PaginaParametrosViagens,
});

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));
const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

// Parâmetros > Viagens (decs 190 e 193): prazo, em dias após a data da despesa, para o lançamento contar como "no prazo",
// um para o técnico mecânico e outro para o PCM. O questionário de despesas continua em Parâmetros > Veículos.
function PaginaParametrosViagens() {
  const [salvo, setSalvo] = useState(lerPrazos);
  const [mecanico, setMecanico] = useState(String(salvo.mecanico));
  const [pcm, setPcm] = useState(String(salvo.pcm));
  const novo = { mecanico: numeroDe(mecanico), pcm: numeroDe(pcm) };
  const validoMecanico = prazoValido(novo.mecanico);
  const validoPcm = prazoValido(novo.pcm);
  const valido = validoMecanico && validoPcm;

  function salvar() {
    if (!valido) return;
    try {
      salvarPrazos(novo);
      setSalvo(novo);
      toast.success("Prazos salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os prazos.");
    }
  }

  const campo = (id: string, rotulo: string, valor: string, definir: (v: string) => void, ok: boolean, atual: number) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} name={id} type="number" inputMode="numeric" min={0} max={PRAZO_MAXIMO_DIAS} step={1} value={valor} aria-invalid={!ok} onChange={(e) => definir(e.target.value)} />
      <p className="text-xs text-muted-foreground">Hoje: {dias(atual)}.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Parâmetros</p>
        <h1 className="text-2xl font-bold">Viagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">Regras do módulo Viagens.</p>
      </header>
      <section className="panel max-w-md space-y-3 p-4" aria-labelledby="prazo-lancamento">
        <h2 id="prazo-lancamento" className="text-lg font-semibold">Prazo para lançar a despesa</h2>
        <p className="text-xs text-muted-foreground">Dias após a data da despesa. Com 0, só vale lançar no mesmo dia. Cada despesa usa o prazo de quem a lançou (o Administrativo segue o do PCM) no índice de lançamento no prazo do painel de Viagens.</p>
        {campo("prazo-mecanico", "Técnico mecânico (dias)", mecanico, setMecanico, validoMecanico, salvo.mecanico)}
        {campo("prazo-pcm", "PCM (dias)", pcm, setPcm, validoPcm, salvo.pcm)}
        {!valido && <p role="alert" className="text-sm text-destructive">Informe números inteiros de dias entre 0 e {PRAZO_MAXIMO_DIAS}.</p>}
        <Button requiresWrite disabled={!valido || (novo.mecanico === salvo.mecanico && novo.pcm === salvo.pcm)} onClick={salvar}>Salvar</Button>
      </section>
    </div>
  );
}
