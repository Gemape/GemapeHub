import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CartaoDeMotivos } from "@/components/parametros/CartaoDeMotivos";
import { SupervisoresOcorrencias } from "@/components/parametros/SupervisoresOcorrencias";
import { lerMotivosBaixaFerramenta, salvarMotivosBaixaFerramenta } from "@/lib/ferramentas-motivos-baixa";
import {
  AJUDA_TERMO, MARCAS_DO_TEXTO, ROTULO_TERMO, TERMOS_FERRAMENTA, TEXTO_TERMO_MAXIMO, TEXTOS_PADRAO, lerTextosTermos, salvarTextosTermos, textoDoTermoValido,
  type TermoFerramenta,
} from "@/lib/termos-ferramentas-texto";
import {
  PERIODICIDADES_VISTORIA, PRAZO_VISTORIA_MAXIMO_DIAS, lerParametrosVistoria, periodicidadeValida, prazoVistoriaValido, salvarParametrosVistoria,
  type PeriodicidadeVistoria,
} from "@/lib/vistoria-ferramentas-parametros";

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));

// Parâmetros > Ferramentas > Parâmetros Específicos: os textos dos termos, a periodicidade e o prazo da vistoria e os supervisores das ocorrências.
export function ParametrosFerramentas() {
  return (
    <div className="space-y-5">
      <TextosDosTermos />
      <section className="space-y-3" aria-labelledby="motivos-baixa-ferramentas">
        <div className="max-w-3xl">
          <h2 id="motivos-baixa-ferramentas" className="text-lg font-semibold">Motivos de baixa</h2>
          <p className="text-sm text-muted-foreground">Os motivos que a baixa e a reposição de ferramentas aceitam.</p>
        </div>
        <div className="panel max-w-3xl p-4">
          <CartaoDeMotivos id="motivos-baixa-ferramenta" titulo="Motivos de baixa das ferramentas" ajuda="Dá para acrescentar e tirar motivos. A baixa pede um deles; o que já foi registrado não muda." inicial={lerMotivosBaixaFerramenta()} salvar={salvarMotivosBaixaFerramenta} />
        </div>
      </section>
      {/* Vistoria e supervisores lado a lado, com a mesma altura; em tela estreita ficam um sobre o outro. */}
      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <ParametrosDaVistoria />
        <SupervisoresOcorrencias ambito="ferramentas" />
      </div>
    </div>
  );
}

function TextosDosTermos() {
  const [salvos, setSalvos] = useState(lerTextosTermos);
  const [textos, setTextos] = useState(salvos);
  const valido = TERMOS_FERRAMENTA.every((t) => textoDoTermoValido(textos[t]));
  const igual = TERMOS_FERRAMENTA.every((t) => textos[t] === salvos[t]);

  function salvar() {
    try {
      salvarTextosTermos(textos);
      setSalvos(textos);
      toast.success("Textos dos termos salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os textos.");
    }
  }

  const alterar = (termo: TermoFerramenta, texto: string) => setTextos((atual) => ({ ...atual, [termo]: texto }));

  return (
    <section className="space-y-3" aria-labelledby="textos-termos-ferramentas">
      <div className="max-w-3xl">
        <h2 id="textos-termos-ferramentas" className="text-lg font-semibold">Textos dos termos</h2>
        <p className="text-sm text-muted-foreground">
          O texto que sai em cada termo de ferramentas. Linha em branco separa os parágrafos. Marcas que viram os dados do termo:{" "}
          {MARCAS_DO_TEXTO.map((m, i) => <span key={m}><code className="rounded bg-muted px-1 text-xs">{m}</code>{i < MARCAS_DO_TEXTO.length - 1 ? ", " : ". "}</span>)}
          {"{tabela}"} diz onde entra a lista de ferramentas; sem ela, a lista vem depois do texto. Use <code className="rounded bg-muted px-1 text-xs">**assim**</code> para negrito.
        </p>
      </div>
      <div className="panel space-y-4 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
        {TERMOS_FERRAMENTA.map((termo) => {
          const invalido = !textoDoTermoValido(textos[termo]);
          return (
            <div key={termo} className="space-y-1.5 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`termo-${termo}`} className="text-sm font-semibold">{ROTULO_TERMO[termo]}</Label>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" disabled={textos[termo] === TEXTOS_PADRAO[termo]} onClick={() => alterar(termo, TEXTOS_PADRAO[termo])}>Restaurar texto padrão</Button>
              </div>
              <p className="text-xs text-muted-foreground">{AJUDA_TERMO[termo]}</p>
              <Textarea id={`termo-${termo}`} rows={14} maxLength={TEXTO_TERMO_MAXIMO} value={textos[termo]} aria-invalid={invalido} onChange={(e) => alterar(termo, e.target.value)} />
              {invalido && <p role="alert" className="text-xs text-destructive">Escreva o texto do termo, com no máximo uma marca {"{tabela}"}.</p>}
            </div>
          );
        })}
        </div>
        <Button requiresWrite disabled={!valido || igual} onClick={salvar}>Salvar textos</Button>
      </div>
    </section>
  );
}

function ParametrosDaVistoria() {
  const [salvo, setSalvo] = useState(lerParametrosVistoria);
  const [periodicidade, setPeriodicidade] = useState<string>(salvo.periodicidade);
  const [prazo, setPrazo] = useState(String(salvo.prazoDias));
  const prazoNumero = numeroDe(prazo);
  const valido = periodicidadeValida(periodicidade) && prazoVistoriaValido(prazoNumero);
  const igual = valido && periodicidade === salvo.periodicidade && prazoNumero === salvo.prazoDias;

  function salvar() {
    if (!periodicidadeValida(periodicidade) || !prazoVistoriaValido(prazoNumero)) return;
    try {
      const novo = { periodicidade: periodicidade as PeriodicidadeVistoria, prazoDias: prazoNumero };
      salvarParametrosVistoria(novo);
      setSalvo(novo);
      toast.success("Parâmetros da vistoria salvos.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os parâmetros da vistoria.");
    }
  }

  return (
    <section className="flex flex-col space-y-3" aria-labelledby="vistoria-ferramentas">
      <div className="max-w-3xl">
        <h2 id="vistoria-ferramentas" className="text-lg font-semibold">Vistoria periódica das caixas</h2>
        <p className="text-sm text-muted-foreground">De quanto em quanto tempo cada caixa é vistoriada e em quantos dias, depois da data prevista, a vistoria ainda pode ser feita sem ficar vencida.</p>
      </div>
      <div className="panel flex-1 space-y-3 p-4">
        <div className="grid gap-3">
          <div className="space-y-2 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Periodicidade</h3>
            <p className="text-xs text-muted-foreground">Intervalo entre uma vistoria e a data prevista da seguinte.</p>
            <Select value={periodicidade} onValueChange={setPeriodicidade}>
              <SelectTrigger aria-label="Periodicidade da vistoria"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODICIDADES_VISTORIA.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Prazo para realizar a vistoria</h3>
            <p className="text-xs text-muted-foreground">Dias depois da data prevista. Com 0, a vistoria tem de ser feita no dia previsto.</p>
            <div className="space-y-1">
              <Label htmlFor="vistoria-prazo">Dias</Label>
              <Input id="vistoria-prazo" type="number" inputMode="numeric" min={0} max={PRAZO_VISTORIA_MAXIMO_DIAS} step={1} value={prazo} aria-invalid={!prazoVistoriaValido(prazoNumero)} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
        </div>
        {!valido && <p role="alert" className="text-sm text-destructive">Informe um número inteiro de dias entre 0 e {PRAZO_VISTORIA_MAXIMO_DIAS}.</p>}
        <Button requiresWrite disabled={!valido || igual} onClick={salvar}>Salvar vistoria</Button>
      </div>
    </section>
  );
}
