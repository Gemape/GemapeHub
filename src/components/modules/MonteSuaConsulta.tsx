import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AtalhoPeriodo } from "@/components/AtalhoPeriodo";
import { useDonoDosAtalhos } from "@/components/inicio/atalhosPessoais";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DIMENSOES, FILTROS_MOVIMENTO, lerConsultas, MEDIDAS, montarConsulta, removerConsulta, salvarConsulta,
  type ConsultaSalva, type Dimensao, type FiltroMovimento, type Medida, type Nomes,
} from "@/lib/consulta-personalizada";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv, type Modulo } from "@/lib/gemape";
import { useEmpregados, useItens, useMovimentacoes } from "@/lib/hooks-gemape";

const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Relatório sob demanda: marque os campos a cruzar e o que somar, veja o resultado na hora e salve como relatório seu.
export function MonteSuaConsulta({ modulo }: { modulo: Extract<Modulo, "epi" | "uniforme" | "ferramenta"> }) {
  const dono = useDonoDosAtalhos();
  const { empresaId, empresas } = useEmpresa();
  const { data: movs = [], isLoading } = useMovimentacoes(modulo, empresaId);
  const { data: itens = [] } = useItens(modulo, TODAS);
  const { data: empregados = [] } = useEmpregados(TODAS);
  const [dimensoes, setDimensoes] = useState<Dimensao[]>(["item"]);
  const [medidas, setMedidas] = useState<Medida[]>(["quantidade", "custo"]);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [movimentos, setMovimentos] = useState<FiltroMovimento>("entrega");
  const [nome, setNome] = useState("");
  const [salvas, setSalvas] = useState<ConsultaSalva[]>([]);
  // Lê depois de montar: o HTML do servidor não tem o armazenamento do navegador.
  useEffect(() => { setSalvas(lerConsultas(dono)); }, [dono]);
  const doModulo = salvas.filter((s) => s.modulo === modulo);

  const nomes: Nomes = useMemo(() => {
    const emp = new Map(empresas.map((e) => [e.id, e.nome_fantasia]));
    const pes = new Map(empregados.map((e) => [e.id, e]));
    const it = new Map(itens.map((i) => [i.id, i.nome]));
    return {
      empresa: (id) => (id && emp.get(id)) || "Sem empresa",
      empregado: (id) => (id && pes.get(id)?.nome) || "Empregado removido",
      cargo: (id) => (id && pes.get(id)?.cargo) || "",
      item: (id) => (id && it.get(id)) || "Item removido",
    };
  }, [empresas, empregados, itens]);
  const linhas = useMemo(() => montarConsulta(movs, nomes, { dimensoes, medidas, inicio, fim, movimentos }), [movs, nomes, dimensoes, medidas, inicio, fim, movimentos]);
  const rotuloD = (d: Dimensao) => DIMENSOES.find((x) => x.id === d)!.rotulo;
  const rotuloM = (m: Medida) => MEDIDAS.find((x) => x.id === m)!.rotulo;
  const formatar = (m: Medida, v: number) => (m === "custo" ? reais(v) : v.toLocaleString("pt-BR"));
  // Mantém a ordem da lista (a do resultado), qualquer que seja a ordem dos cliques.
  const alternar = <T extends string>(lista: readonly { id: T }[], atual: T[], id: T, ligar: boolean) =>
    lista.map((x) => x.id).filter((x) => (x === id ? ligar : atual.includes(x)));

  function salvar() {
    try {
      setSalvas(salvarConsulta(dono, { nome, modulo, dimensoes, medidas, inicio, fim, movimentos }));
      toast.success(`Consulta "${nome.trim()}" salva no seu perfil.`);
      setNome("");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    }
  }
  function abrir(c: ConsultaSalva) {
    setDimensoes(c.dimensoes); setMedidas(c.medidas); setInicio(c.inicio); setFim(c.fim); setMovimentos(c.movimentos ?? "entrega"); setNome(c.nome);
  }

  return (
    <div className="space-y-5">
      {doModulo.length > 0 && (
        <section aria-label="Minhas consultas" className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Minhas consultas:</span>
          {doModulo.map((c) => (
            <span key={c.id} className="inline-flex items-center rounded-full border bg-muted/40 text-sm">
              <button type="button" className="rounded-l-full px-3 py-1 hover:bg-muted" onClick={() => abrir(c)}>{c.nome}</button>
              <button type="button" aria-label={`Apagar a consulta ${c.nome}`} className="rounded-r-full px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => setSalvas(removerConsulta(dono, c.id))}>
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">Cruzar por</legend>
          {DIMENSOES.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={dimensoes.includes(d.id)} onCheckedChange={(v) => setDimensoes(alternar(DIMENSOES, dimensoes, d.id, v === true))} />{d.rotulo}
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">Somar</legend>
          {MEDIDAS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={medidas.includes(m.id)} onCheckedChange={(v) => setMedidas(alternar(MEDIDAS, medidas, m.id, v === true))} />{m.rotulo}
            </label>
          ))}
          <div className="space-y-1 pt-1">
            <Label htmlFor="cons-movimentos">Movimentos</Label>
            <Select value={movimentos} onValueChange={(v) => setMovimentos(v as FiltroMovimento)}>
              <SelectTrigger id="cons-movimentos"><SelectValue /></SelectTrigger>
              <SelectContent>{FILTROS_MOVIMENTO.map((f) => <SelectItem key={f.id} value={f.id}>{f.rotulo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {medidas.includes("custo") && <p className="text-xs text-muted-foreground">Custo = quantidade × preço registrado no movimento.</p>}
        </fieldset>
        <fieldset className="space-y-2 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">Período</legend>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label htmlFor="cons-inicio">De</Label><Input id="cons-inicio" type="date" className="w-40" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="cons-fim">Até</Label><Input id="cons-fim" type="date" className="w-40" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} /></div>
            <AtalhoPeriodo aoEscolher={(i, f) => { setInicio(i); setFim(f); }} />
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="cons-nome">Nome para salvar</Label>
          <Input id="cons-nome" className="w-64" placeholder="Ex.: Custo por cargo no mês" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <Button type="button" onClick={salvar} disabled={!nome.trim() || medidas.length === 0}>Salvar no meu perfil</Button>
        <Button type="button" variant="outline" className="ml-auto" disabled={linhas.length === 0 || medidas.length === 0} onClick={() =>
          exportarCsv(`consulta-${modulo}`, linhas.map((l) => Object.fromEntries([...dimensoes.map((d, i) => [rotuloD(d), l.chaves[i]]), ...medidas.map((m, i) => [rotuloM(m), l.valores[i]])])))}>
          Exportar CSV
        </Button>
      </div>

      {medidas.length === 0 ? (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Marque pelo menos um valor em "Somar" para ver o resultado.</p>
      ) : (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {dimensoes.map((d) => <TableHead key={d}>{rotuloD(d)}</TableHead>)}
                {medidas.map((m) => <TableHead key={m} className="text-right">{rotuloM(m)}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={dimensoes.length + medidas.length} className="py-6 text-center text-muted-foreground">Carregando…</TableCell></TableRow>
              ) : linhas.length === 0 ? (
                <TableRow><TableCell colSpan={dimensoes.length + medidas.length} className="py-6 text-center text-muted-foreground">Nenhuma movimentação no período.</TableCell></TableRow>
              ) : linhas.map((l) => (
                <TableRow key={l.chaves.join("|") || "total"}>
                  {l.chaves.map((c, i) => <TableCell key={i}>{c}</TableCell>)}
                  {l.valores.map((v, i) => <TableCell key={i} className="text-right tabular-nums">{formatar(medidas[i]!, v)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
