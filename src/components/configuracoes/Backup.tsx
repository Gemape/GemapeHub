import { toast } from "sonner";

import { confirmarTexto } from "@/components/ConfirmarAcao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { auditoriaEmCsv, baixarArquivo, copiaDosDadosDeTeste, type Frequencia } from "@/lib/configuracoes-demo";
import { Bloco, Linha } from "./Campos";
import { useConfig } from "./useConfig";

const dataCurta = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const carimbo = () => new Date().toISOString().slice(0, 10);

export function Backup() {
  const { config, mudar } = useConfig();
  const i = config.integracoes;
  const trocar = (parte: Partial<typeof i>, acao: string, detalhe: string) => mudar((c) => ({ ...c, integracoes: { ...c.integracoes, ...parte } }), acao, detalhe);

  function exportarJson() {
    const dados = { geradoEm: new Date().toISOString(), observacao: "Cópia dos dados de teste deste navegador", dados: copiaDosDadosDeTeste(localStorage) };
    baixarArquivo(`gemape-backup-${carimbo()}.json`, JSON.stringify(dados, null, 2), "application/json");
    trocar({ ultimoBackup: new Date().toISOString() }, "Backup", "Exportação completa em JSON");
    toast.success("Backup baixado (JSON)");
  }
  function exportarCsv() {
    baixarArquivo(`gemape-auditoria-${carimbo()}.csv`, auditoriaEmCsv(config.auditoria), "text/csv");
    mudar((c) => c, "Exportação", "Logs de auditoria em CSV", false);
    toast.success("Auditoria baixada (CSV)");
  }

  return (
    <div className="space-y-4">
      <Bloco titulo="Backup automático" descricao="Simulado: neste teste o agendamento só fica guardado. A exportação manual abaixo funciona de verdade.">
        <Linha rotulo="Backup automático" htmlFor="backup-ativo">
          <Switch id="backup-ativo" checked={i.backupAtivo} onCheckedChange={(v) => trocar({ backupAtivo: v }, "Backup", `Backup automático ${v ? "ativado" : "desativado"}`)} />
        </Linha>
        <Linha rotulo="Frequência" htmlFor="backup-freq">
          <Select value={i.backupFrequencia} disabled={!i.backupAtivo} onValueChange={(v) => trocar({ backupFrequencia: v as Frequencia }, "Backup", `Frequência: ${v}`)}>
            <SelectTrigger id="backup-freq" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="diario">Diário</SelectItem><SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem></SelectContent>
          </Select>
        </Linha>
        <Linha rotulo="Horário (Brasília)" htmlFor="backup-hora">
          <Input id="backup-hora" type="time" value={i.backupHora} disabled={!i.backupAtivo} onChange={(e) => e.target.value && trocar({ backupHora: e.target.value }, "Backup", `Horário: ${e.target.value}`)} className="h-9 w-32" />
        </Linha>
        <p className="text-xs text-muted-foreground">Último backup: {i.ultimoBackup ? dataCurta(i.ultimoBackup) : "nunca"}</p>
      </Bloco>

      <Bloco titulo="Exportação completa" descricao="Baixa os dados de teste deste navegador em JSON, ou os logs de auditoria em CSV.">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={exportarJson}>Baixar backup (JSON)</Button>
          <Button type="button" variant="outline" onClick={exportarCsv}>Exportar auditoria (CSV)</Button>
        </div>
      </Bloco>

      <Bloco titulo="Modo manutenção" descricao="Bloqueia temporariamente o acesso dos usuários comuns durante atualizações. O Administrador continua entrando.">
        <Linha rotulo="Manutenção ativa" ajuda={i.manutencao ? "Usuários comuns veriam o aviso de manutenção" : "Todos acessam normalmente"} htmlFor="manutencao">
          <Switch id="manutencao" checked={i.manutencao} onCheckedChange={async (v) => { if (!v || await confirmarTexto("Ativar o modo manutenção? Usuários comuns seriam bloqueados (simulado).", { rotuloConfirmar: "Ativar" })) trocar({ manutencao: v }, "Modo manutenção", v ? "Ativado" : "Desativado"); }} />
        </Linha>
        {i.manutencao && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">Modo manutenção ligado (simulado): neste teste ninguém é bloqueado de verdade.</p>}
      </Bloco>
    </div>
  );
}
