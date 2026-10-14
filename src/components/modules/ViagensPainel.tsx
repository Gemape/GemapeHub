import { BedDouble, Ellipsis, Fuel, Receipt, SquareParking, TrafficCone, UtensilsCrossed, Wrench, Boxes, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { QuestionarioFormulario } from "@/components/parametros/QuestionarioFormulario";
import { lerEstado, tiposDeDespesa } from "@/lib/questionario-despesas";

// Ícone sugestivo de cada tipo de despesa; tipo novo (cadastrado depois) usa o recibo.
const ICONE_TIPO: Record<string, LucideIcon> = {
  "Alimentação": UtensilsCrossed,
  "Hospedagem": BedDouble,
  "Abastecimento": Fuel,
  "Pedágio": TrafficCone,
  "Estacionamento": SquareParking,
  "Manutenção do veículo de trabalho": Wrench,
  "Compra de peças para cliente": Boxes,
  "Outro": Ellipsis,
};

// Painel do módulo Viagens (decisão 176): botões dos questionários de despesas; o clique abre o formulário daquele tipo.
export function ViagensPainel() {
  const [estado] = useState(lerEstado);
  const tipos = tiposDeDespesa(estado);
  const [tipo, setTipo] = useState<string | null>(null);

  if (tipo !== null) {
    return <QuestionarioFormulario key={tipo} tipoInicial={tipo} onVoltar={{ rotulo: "Voltar ao painel", aoClicar: () => setTipo(null) }} />;
  }

  return (
    <section className="space-y-3" aria-labelledby="viagens-questionarios">
      <h2 id="viagens-questionarios" className="text-lg font-semibold">Questionários de despesas</h2>
      <p className="text-sm text-muted-foreground">Escolha o tipo da despesa a lançar. O formulário termina sempre com o envio dos comprovantes.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tipos.map((t) => {
          const Icone = ICONE_TIPO[t] ?? Receipt;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className="panel flex min-h-28 flex-col items-center justify-center gap-2 p-3 text-center text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Icone className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="break-words">{t}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
