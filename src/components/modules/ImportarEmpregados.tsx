import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { prepararEmpregado } from "@/lib/empregados";
import { lerTodas } from "@/lib/ler-todas";
import { corrigirCpf, corrigirData, lerCsv, linhaEmBranco, sugerirMapeamento, valoresDaLinha, type CampoDestino, type Mapeamento } from "@/lib/planilha-importacao";
import { lerXlsx } from "@/lib/xlsx-leve";

const CAMPOS: readonly CampoDestino[] = [
  { id: "nome", rotulo: "Nome", sinonimos: ["nome completo", "empregado", "colaborador", "funcionario"], obrigatorio: true },
  { id: "cpf", rotulo: "CPF", sinonimos: ["cpf do empregado", "documento"], obrigatorio: true },
  { id: "matricula", rotulo: "Matrícula", sinonimos: ["matricula", "registro", "livro pagina"] },
  { id: "data_admissao", rotulo: "Admissão", sinonimos: ["data de admissao", "data admissao", "admitido em"] },
  { id: "data_demissao", rotulo: "Demissão", sinonimos: ["data de demissao", "data demissao", "desligamento"] },
];
const NAO_IMPORTAR = "-1";
// Como no cadastro: o e-mail só existe no modo demonstração.
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

type Celulas = { nome: string; cpf: string; matricula: string; data_admissao: string; data_demissao: string };
type Linha = { numero: number; valores: Record<string, string>; erro: string | null; pronto: Record<string, unknown> | null };

// Importação assistida de empregados: sobe o .xlsx ou .csv, confere o de-para (sugerido sozinho), vê as 5 primeiras linhas já
// corrigidas (CPF com pontos e zeros da frente, datas no padrão) e importa só as linhas válidas. As que têm erro ficam de fora, com o motivo.
export function ImportarEmpregados({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { empresaId, empresas } = useEmpresa();
  const escolhiveis = empresasParaEscolha(empresas);
  const [planilha, setPlanilha] = useState<string[][] | null>(null);
  const [mapa, setMapa] = useState<Mapeamento>({});
  const [empresa, setEmpresa] = useState(() => escolhiveis.find((e) => e.id === empresaId)?.id ?? "");
  const [existentes, setExistentes] = useState<{ id: string; cpf: string | null; matricula: string | null }[]>([]);
  const [importando, setImportando] = useState(false);
  const cabecalho = planilha?.[0] ?? [];

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setPlanilha(null);
    try {
      const linhas = /\.xlsx$/i.test(arquivo.name) ? await lerXlsx(await arquivo.arrayBuffer()) : lerCsv(await arquivo.text());
      if (linhas.length < 2 || linhas.slice(1).every(linhaEmBranco)) throw new Error("A planilha precisa do cabeçalho e de pelo menos uma linha de dados.");
      // A prévia só aparece com a lista de CPFs e matrículas já cadastrados na mão: antes disso, um repetido passaria como "Pronta".
      const cadastrados = await lerTodas<{ id: string; cpf: string | null; matricula: string | null }>(() => supabase.from("empregados").select("id,cpf,matricula"), (q) => q.order("id"));
      setExistentes(cadastrados);
      setMapa(sugerirMapeamento(linhas[0]!, CAMPOS));
      setPlanilha(linhas);
    } catch (erro) {
      setPlanilha(null);
      toast.error(erro instanceof Error ? erro.message : "Não foi possível ler a planilha.");
    }
  }

  // Cada linha passa pela mesma regra do cadastro (prepararEmpregado); CPF e matrícula repetidos dentro da própria planilha também são recusados.
  const linhas: Linha[] = useMemo(() => {
    if (!planilha) return [];
    const aceitas: { id: string; cpf: string; matricula: string | null }[] = [];
    // Número da linha = o da planilha (cabeçalho é a 1); linhas em branco não entram, mas contam na numeração.
    return planilha.slice(1).flatMap((l, n) => (linhaEmBranco(l) ? [] : [{ l, n }])).map(({ l, n }) => {
      const v: Celulas = { nome: "", cpf: "", matricula: "", data_admissao: "", data_demissao: "", ...valoresDaLinha(l, mapa) };
      const admissao = corrigirData(v.data_admissao);
      const demissao = corrigirData(v.data_demissao);
      const valores: Celulas = { ...v, cpf: corrigirCpf(v.cpf), data_admissao: admissao ?? v.data_admissao, data_demissao: demissao ?? v.data_demissao };
      try {
        if (admissao === null) throw new Error("Data de admissão inválida.");
        if (demissao === null) throw new Error("Data de demissão inválida.");
        const pronto = prepararEmpregado(
          { nome: valores.nome, cpf: valores.cpf, matricula: valores.matricula, empresa_id: empresa, email: "", data_admissao: admissao, data_demissao: demissao },
          [...existentes, ...aceitas],
        );
        if (!MODO_DEMO) delete pronto["email"];
        aceitas.push({ id: `linha-${n}`, cpf: String(pronto["cpf"]), matricula: (pronto["matricula"] as string | null) ?? null });
        return { numero: n + 2, valores, erro: null, pronto };
      } catch (erro) {
        return { numero: n + 2, valores, erro: erro instanceof Error ? erro.message : "Linha inválida.", pronto: null };
      }
    });
  }, [planilha, mapa, empresa, existentes]);
  const validas = linhas.filter((l) => l.pronto);
  const faltaCampo = CAMPOS.filter((c) => c.obrigatorio && (mapa[c.id] ?? -1) < 0);

  function fechar(v: boolean) {
    aoMudar(v);
    if (!v) { setPlanilha(null); setMapa({}); }
  }

  async function importar() {
    if (importando || validas.length === 0) return;
    setImportando(true);
    try {
      const { error } = await supabase.from("empregados").insert(validas.map((l) => l.pronto) as never);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["empregados"] });
      await qc.invalidateQueries({ queryKey: ["empregados-total"] });
      toast.success(`${validas.length} empregado(s) importado(s).${linhas.length > validas.length ? ` ${linhas.length - validas.length} linha(s) com erro ficaram de fora.` : ""}`);
      fechar(false);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível importar.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar empregados de planilha</DialogTitle>
          <DialogDescription>Planilha .xlsx ou .csv com cabeçalho na primeira linha. Nada é gravado antes de você conferir a prévia.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="imp-arquivo">Planilha</Label>
            <Input id="imp-arquivo" type="file" accept=".xlsx,.csv,text/csv" onChange={(e) => void escolher(e.target.files?.[0])} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imp-empresa">Empresa dos empregados</Label>
            <Select value={empresa} onValueChange={setEmpresa}>
              <SelectTrigger id="imp-empresa"><SelectValue placeholder="Escolha a empresa" /></SelectTrigger>
              <SelectContent>{escolhiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {planilha && (
          <>
            <section aria-label="De-para das colunas" className="space-y-2">
              <h3 className="text-sm font-semibold">Coluna da planilha → campo do sistema</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <Select value={String(mapa[c.id] ?? -1)} onValueChange={(v) => setMapa((m) => ({ ...m, [c.id]: Number(v) }))}>
                      <SelectTrigger aria-label={`Coluna da planilha para ${c.rotulo}`} className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NAO_IMPORTAR}>Não importar</SelectItem>
                        {cabecalho.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Coluna ${i + 1}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className={c.obrigatorio && (mapa[c.id] ?? -1) < 0 ? "font-medium text-destructive" : ""}>{c.rotulo}{c.obrigatorio ? " *" : ""}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Prévia" className="space-y-2">
              <h3 className="text-sm font-semibold">Prévia das 5 primeiras linhas (já corrigidas)</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead><tr className="border-b bg-muted/50">{["Linha", ...CAMPOS.map((c) => c.rotulo), "Situação"].map((t) => <th key={t} className="px-2 py-1.5 text-left font-medium">{t}</th>)}</tr></thead>
                  <tbody>
                    {linhas.slice(0, 5).map((l) => (
                      <tr key={l.numero} className="border-b last:border-0">
                        <td className="px-2 py-1.5 tabular-nums">{l.numero}</td>
                        {CAMPOS.map((c) => <td key={c.id} className="px-2 py-1.5">{l.valores[c.id]}</td>)}
                        <td className={`px-2 py-1.5 ${l.erro ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{l.erro ?? "Pronta"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm">{validas.length} de {linhas.length} linha(s) prontas para importar{linhas.length > validas.length ? `; ${linhas.length - validas.length} com erro ficam de fora` : ""}.</p>
              {linhas.some((l) => l.erro) && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Ver linhas com erro</summary>
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">{linhas.filter((l) => l.erro).map((l) => <li key={l.numero}>Linha {l.numero}: {l.erro}</li>)}</ul>
                </details>
              )}
            </section>
          </>
        )}

        <DialogFooter>
          {planilha && faltaCampo.length > 0 && <p role="status" className="mr-auto self-center text-sm text-amber-700 dark:text-amber-300">Escolha a coluna de: {faltaCampo.map((c) => c.rotulo).join(", ")}.</p>}
          <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
          <Button requiresWrite type="button" disabled={!planilha || !empresa || faltaCampo.length > 0 || validas.length === 0 || importando} onClick={() => void importar()}>
            {importando ? "Importando…" : `Importar ${validas.length} empregado(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
