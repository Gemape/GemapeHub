import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auditoriaEmCsv, baixarArquivo } from "@/lib/configuracoes-demo";
import { useConfig } from "./useConfig";

const dataCurta = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Histórico das ações críticas: quem mudou permissões, excluiu registros ou alterou configurações. As ações feitas nas telas de Configurações entram aqui sozinhas.
export function Auditoria() {
  const { config } = useConfig();
  const [busca, setBusca] = useState("");
  const [quem, setQuem] = useState("todos");
  const pessoas = useMemo(() => [...new Set(config.auditoria.map((r) => r.quem))], [config.auditoria]);
  const linhas = useMemo(() => {
    const termo = semAcento(busca.trim());
    return config.auditoria.filter((r) => (quem === "todos" || r.quem === quem) && (!termo || semAcento(`${r.acao} ${r.detalhe} ${r.quem}`).includes(termo)));
  }, [config.auditoria, busca, quem]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input aria-label="Buscar na auditoria" placeholder="Buscar por ação, detalhe ou pessoa" value={busca} onChange={(e) => setBusca(e.target.value)} className="sm:flex-1" />
        <Select value={quem} onValueChange={setQuem}>
          <SelectTrigger aria-label="Filtrar por pessoa" className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todas as pessoas</SelectItem>{pessoas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => { baixarArquivo(`gemape-auditoria-${new Date().toISOString().slice(0, 10)}.csv`, auditoriaEmCsv(linhas), "text/csv"); toast.success("Auditoria baixada (CSV)"); }}>Exportar CSV</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/60 text-left"><th className="px-3 py-2 font-semibold">Quando</th><th className="px-3 py-2 font-semibold">Quem</th><th className="px-3 py-2 font-semibold">Ação</th><th className="px-3 py-2 font-semibold">Detalhe</th></tr></thead>
          <tbody>
            {linhas.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="whitespace-nowrap px-3 py-2 text-xs">{dataCurta(r.quando)}</td>
                <td className="px-3 py-2">{r.quem}</td>
                <td className="px-3 py-2">{r.acao}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.detalhe}</td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{linhas.length} de {config.auditoria.length} registros (guarda os 300 mais recentes).</p>
    </div>
  );
}
