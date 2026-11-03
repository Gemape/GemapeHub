import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FAIXAS_PADRAO, descricoesFaixas, lerFaixas, salvarFaixas, validarFaixas, type ConfigFaixas, type DominioFaixas, type Faixa } from "@/lib/faixas-desempenho";
import { PRAZO_MAXIMO_DIAS, lerPrazos, prazoValido, salvarPrazos } from "@/lib/prazo-viagens";

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));
const COR_PONTO: Record<Faixa, string> = { verde: "bg-green-600", amarelo: "bg-amber-500", vermelho: "bg-red-600" };

// Faixas de desempenho em Parâmetros > Veículos > Parâmetros Específicos (decisões 199 e 350): valem para os indicadores de veículos (Frota, Check list, Manutenção e Ocorrências). É uma cópia
// independente da de Parâmetros > Viagens > Parâmetros Específicos, que vale para os índices de Viagens. Só parametriza: os índices aparecem nos módulos.
export function IndicadoresViagens() {
  return (
    <section className="space-y-5" aria-labelledby="indicadores-viagens">
      <div className="max-w-3xl">
        <h2 id="indicadores-viagens" className="text-lg font-semibold">Indicadores</h2>
        <p className="text-sm text-muted-foreground">
          As faixas de desempenho daqui valem para os indicadores de veículos: Frota, Check list, Manutenção e Ocorrências. Os índices de Viagens têm as suas, em Parâmetros &gt; Viagens &gt; Parâmetros Específicos, e mudar uma não muda a outra.
        </p>
      </div>
      <FaixasDesempenho dominio="veiculos" />
    </section>
  );
}

// Os dois prazos de Viagens: nº de dias para lançar a despesa (técnico mecânico) e nº de dias para fechar o relatório de despesas (PCM), cada um com a caixa "aplicável".
export function PrazosIndicadores() {
  const [salvo, setSalvo] = useState(lerPrazos);
  const [mecanico, setMecanico] = useState(String(salvo.mecanico));
  const [pcm, setPcm] = useState(String(salvo.pcm));
  const [mecanicoAplica, setMecanicoAplica] = useState(salvo.mecanicoAplica);
  const [pcmAplica, setPcmAplica] = useState(salvo.pcmAplica);
  // Com a caixa desmarcada o campo fica travado e o que estiver digitado nele não impede salvar: vale o dias já salvo.
  const digitadoMecanico = numeroDe(mecanico);
  const digitadoPcm = numeroDe(pcm);
  const validoMecanico = !mecanicoAplica || prazoValido(digitadoMecanico);
  const validoPcm = !pcmAplica || prazoValido(digitadoPcm);
  const novo = {
    mecanico: prazoValido(digitadoMecanico) ? digitadoMecanico : salvo.mecanico,
    pcm: prazoValido(digitadoPcm) ? digitadoPcm : salvo.pcm,
    mecanicoAplica,
    pcmAplica,
  };
  const valido = validoMecanico && validoPcm;
  const igual = novo.mecanico === salvo.mecanico && novo.pcm === salvo.pcm && mecanicoAplica === salvo.mecanicoAplica && pcmAplica === salvo.pcmAplica;

  function salvar() {
    if (!valido) return;
    try {
      salvarPrazos(novo);
      setSalvo(novo);
      setMecanico(String(novo.mecanico));
      setPcm(String(novo.pcm));
      toast.success("Prazos salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os prazos.");
    }
  }

  const indicador = (
    id: string, titulo: string, ajuda: string, rotuloCaixa: string, aplica: boolean, definirAplica: (v: boolean) => void,
    valor: string, definir: (v: string) => void, ok: boolean, rotuloDias: string,
  ) => (
    <div className="space-y-2 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <p className="text-xs text-muted-foreground">{ajuda}</p>
      <label htmlFor={`${id}-aplica`} className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox id={`${id}-aplica`} checked={aplica} onCheckedChange={(v) => definirAplica(v === true)} />
        {rotuloCaixa}
      </label>
      <div className="space-y-1">
        <Label htmlFor={`prazo-${id}`}>{rotuloDias}</Label>
        <Input id={`prazo-${id}`} name={`prazo-${id}`} type="number" inputMode="numeric" min={0} max={PRAZO_MAXIMO_DIAS} step={1} value={valor} aria-invalid={!ok} disabled={!aplica} onChange={(e) => definir(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="panel max-w-3xl space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {indicador(
          "mecanico", "Nº de dias para lançar despesas",
          "Dias após a data da despesa. Com 0, só vale lançar no mesmo dia. Mede o índice de lançamento no prazo, das despesas lançadas pelo técnico mecânico.",
          "Aplicável ao técnico mecânico", mecanicoAplica, setMecanicoAplica, mecanico, setMecanico, validoMecanico, "Dias para lançar",
        )}
        {indicador(
          "pcm", "Nº de dias para fechar o relatório de despesas",
          "Dias após o lançamento da despesa. Mede o índice de fechamento do relatório no prazo, em Viagens: despesa sem relatório gerado e com o prazo vencido conta como fora do prazo.",
          "Aplicável ao PCM", pcmAplica, setPcmAplica, pcm, setPcm, validoPcm, "Dias após o lançamento",
        )}
      </div>
      {!valido && <p role="alert" className="text-sm text-destructive">Informe números inteiros de dias entre 0 e {PRAZO_MAXIMO_DIAS}.</p>}
      <Button requiresWrite disabled={!valido || igual} onClick={salvar}>Salvar prazos</Button>
    </div>
  );
}

type Rascunho = { limiteVerde: string; limiteAmarelo: string } & Pick<ConfigFaixas, "verde" | "amarelo" | "vermelho">;
const rascunhoDe = (c: ConfigFaixas): Rascunho => ({ ...c, limiteVerde: String(c.limiteVerde), limiteAmarelo: String(c.limiteAmarelo) });
const configDe = (r: Rascunho): ConfigFaixas => ({ ...r, limiteVerde: numeroDe(r.limiteVerde), limiteAmarelo: numeroDe(r.limiteAmarelo) });

// As faixas de desempenho (verde, amarelo e vermelho) de um domínio: Viagens (Parâmetros > Viagens > Parâmetros Específicos) ou Veículos (Parâmetros > Veículos > Parâmetros Específicos). São duas
// configurações independentes (decisão 350).
export function FaixasDesempenho({ dominio }: { dominio: DominioFaixas }) {
  const [salva, setSalva] = useState(() => lerFaixas(undefined, dominio));
  const [rascunho, setRascunho] = useState(() => rascunhoDe(salva));
  const config = configDe(rascunho);
  const erro = validarFaixas(config);
  const igual = JSON.stringify(config) === JSON.stringify(salva);
  const faixas = erro ? descricoesFaixas(salva) : descricoesFaixas(config);
  const textos = (faixa: Faixa, campo: "classificacao" | "significado", valor: string) => setRascunho((r) => ({ ...r, [faixa]: { ...r[faixa], [campo]: valor } }));

  function gravar(nova: ConfigFaixas, mensagem: string) {
    try {
      salvarFaixas(nova, undefined, dominio);
      setSalva(nova);
      setRascunho(rascunhoDe(nova));
      toast.success(mensagem);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar as faixas.");
    }
  }

  return (
    <div className="panel max-w-3xl space-y-3 p-4">
      <div>
        <h3 className="text-sm font-semibold">Faixas de desempenho</h3>
        <p className="text-xs text-muted-foreground">{dominio === "viagens" ? "Valem para o índice de conformidade de lançamento, o de lançamento no prazo e o de fechamento do relatório no prazo, de Viagens. Há uma cópia em Parâmetros > Veículos > Parâmetros Específicos, para os indicadores de veículos, e mudar uma não muda a outra." : "Valem para os indicadores de veículos: Frota, Check list, Manutenção e Ocorrências. Começam como cópia das de Viagens, mas são independentes: mudar uma não muda a outra."} O amarelo vai do seu limite até logo abaixo do limite do verde; abaixo do limite do amarelo é vermelho.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="limite-verde">Verde a partir de (%)</Label>
          <Input id="limite-verde" type="number" inputMode="numeric" min={1} max={100} step={1} value={rascunho.limiteVerde} onChange={(e) => setRascunho((r) => ({ ...r, limiteVerde: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="limite-amarelo">Amarelo a partir de (%)</Label>
          <Input id="limite-amarelo" type="number" inputMode="numeric" min={1} max={100} step={1} value={rascunho.limiteAmarelo} onChange={(e) => setRascunho((r) => ({ ...r, limiteAmarelo: e.target.value }))} />
        </div>
      </div>
      <ul className="space-y-3">
        {faixas.map((f) => (
          <li key={f.faixa} className="space-y-1.5 rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${COR_PONTO[f.faixa]}`} aria-hidden="true" />
              {f.cor}, {f.intervalo}
            </p>
            <Label htmlFor={`classificacao-${f.faixa}`} className="text-xs">Classificação</Label>
            <Input id={`classificacao-${f.faixa}`} maxLength={60} value={rascunho[f.faixa].classificacao} onChange={(e) => textos(f.faixa, "classificacao", e.target.value)} />
            <Label htmlFor={`significado-${f.faixa}`} className="text-xs">Significado prático para a gestão</Label>
            <Textarea id={`significado-${f.faixa}`} rows={2} maxLength={300} value={rascunho[f.faixa].significado} onChange={(e) => textos(f.faixa, "significado", e.target.value)} />
          </li>
        ))}
      </ul>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <Button requiresWrite disabled={!!erro || igual} onClick={() => gravar(config, "Faixas salvas.")}>Salvar faixas</Button>
        <Button requiresWrite variant="outline" disabled={JSON.stringify(salva) === JSON.stringify(FAIXAS_PADRAO) && igual} onClick={() => gravar(FAIXAS_PADRAO, "Faixas restauradas ao padrão.")}>Restaurar padrão</Button>
      </div>
    </div>
  );
}
