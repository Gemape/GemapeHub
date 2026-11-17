import { useState } from "react";
import { confirmarTexto } from "@/components/ConfirmarAcao";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CONFIG_KPIS_PADRAO, lerConfigKpis, PERIODICIDADES_VISTORIA, salvarConfigKpis, validarConfigKpis, type ConfigKpisEquipamento, type MetaPct, type PeriodicidadeVistoria,
} from "@/lib/kpis-equipamento-config";

// Tudo em texto enquanto se digita; vira número só para validar e salvar.
type Rascunho = {
  periodoPadraoDias: string; jornadaHoras: string; custoFatorAmarelo: string; recargaExtintorMeses: string; inspecaoVasoMeses: string;
  disponibilidade: { verde: string; amarelo: string }; preventiva: { verde: string; amarelo: string }; aderencia: { verde: string; amarelo: string }; conformidade: { verde: string; amarelo: string };
  prazoVistoriaDias: Record<PeriodicidadeVistoria, string>;
  exigirSemOcorrenciaAberta: boolean; prontoOcorrenciaAberta: boolean; prontoVistoriaNok: boolean;
};
const txt = (n: number) => String(n).replace(".", ",");
const num = (t: string) => (t.trim() === "" ? Number.NaN : Number(t.replace(",", ".")));
const metaTxt = (m: MetaPct) => ({ verde: txt(m.verde), amarelo: txt(m.amarelo) });
const metaNum = (m: { verde: string; amarelo: string }): MetaPct => ({ verde: num(m.verde), amarelo: num(m.amarelo) });
const rascunhoDe = (c: ConfigKpisEquipamento): Rascunho => ({
  periodoPadraoDias: String(c.periodoPadraoDias), jornadaHoras: txt(c.jornadaHoras), custoFatorAmarelo: txt(c.custoFatorAmarelo), recargaExtintorMeses: txt(c.recargaExtintorMeses), inspecaoVasoMeses: txt(c.inspecaoVasoMeses),
  disponibilidade: metaTxt(c.disponibilidade), preventiva: metaTxt(c.preventiva), aderencia: metaTxt(c.aderencia), conformidade: metaTxt(c.conformidade),
  prazoVistoriaDias: Object.fromEntries(PERIODICIDADES_VISTORIA.map((p) => [p, txt(c.prazoVistoriaDias[p])])) as Record<PeriodicidadeVistoria, string>,
  exigirSemOcorrenciaAberta: c.exigirSemOcorrenciaAberta, prontoOcorrenciaAberta: c.prontoOcorrenciaAberta, prontoVistoriaNok: c.prontoVistoriaNok,
});
const configDe = (r: Rascunho): ConfigKpisEquipamento => ({
  periodoPadraoDias: num(r.periodoPadraoDias), jornadaHoras: num(r.jornadaHoras), custoFatorAmarelo: num(r.custoFatorAmarelo), recargaExtintorMeses: num(r.recargaExtintorMeses), inspecaoVasoMeses: num(r.inspecaoVasoMeses),
  disponibilidade: metaNum(r.disponibilidade), preventiva: metaNum(r.preventiva), aderencia: metaNum(r.aderencia), conformidade: metaNum(r.conformidade),
  prazoVistoriaDias: Object.fromEntries(PERIODICIDADES_VISTORIA.map((p) => [p, num(r.prazoVistoriaDias[p])])) as Record<PeriodicidadeVistoria, number>,
  exigirSemOcorrenciaAberta: r.exigirSemOcorrenciaAberta, prontoOcorrenciaAberta: r.prontoOcorrenciaAberta, prontoVistoriaNok: r.prontoVistoriaNok,
});

function Numero({ id, rotulo, valor, aoMudar, min, max, passo = 1, ajuda }: { id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; min: number; max: number; passo?: number; ajuda?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={passo} value={valor} onChange={(e) => aoMudar(e.target.value)} />
      {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    </div>
  );
}

// Parâmetros > Equipamentos > Parâmetros Específicos > Indicadores (como Indicadores de Viagens em Veículos): só parametriza; o módulo Equipamentos lê estes
// valores no painel de Indicadores. Metas de cada KPI, jornada, prazos legais, validade da vistoria e o que tira o equipamento de "pronto agora".
export function IndicadoresEquipamentoParametros() {
  const [salva, setSalva] = useState(lerConfigKpis);
  const [r, setR] = useState(() => rascunhoDe(salva));
  const config = configDe(r);
  const erro = validarConfigKpis(config);
  const igual = JSON.stringify(config) === JSON.stringify(salva);
  const meta = (campo: "disponibilidade" | "preventiva" | "aderencia" | "conformidade", parcial: Partial<{ verde: string; amarelo: string }>) => setR((x) => ({ ...x, [campo]: { ...x[campo], ...parcial } }));

  function gravar(nova: ConfigKpisEquipamento, mensagem: string) {
    try {
      salvarConfigKpis(nova);
      setSalva(nova);
      setR(rascunhoDe(nova));
      toast.success(mensagem);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar os indicadores.");
    }
  }

  const bloco = (id: string, titulo: string, ajuda: string, filhos: React.ReactNode) => (
    <div className="space-y-2 rounded-lg border p-3" aria-labelledby={`kpi-${id}`}>
      <h3 id={`kpi-${id}`} className="text-sm font-semibold">{titulo}</h3>
      <p className="text-xs text-muted-foreground">{ajuda}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filhos}</div>
    </div>
  );
  const metas = (campo: "disponibilidade" | "preventiva" | "aderencia" | "conformidade", id: string) => (
    <>
      <Numero id={`${id}-verde`} rotulo="Verde a partir de (%)" valor={r[campo].verde} aoMudar={(v) => meta(campo, { verde: v })} min={1} max={100} />
      <Numero id={`${id}-amarelo`} rotulo="Amarelo a partir de (%)" valor={r[campo].amarelo} aoMudar={(v) => meta(campo, { amarelo: v })} min={1} max={100} ajuda="Abaixo disso, vermelho." />
    </>
  );

  return (
    <section className="space-y-4" aria-labelledby="indicadores-equipamentos">
      <div>
        <h2 id="indicadores-equipamentos" className="text-lg font-semibold">Indicadores</h2>
        <p className="text-sm text-muted-foreground">Metas, jornada e prazos dos cinco indicadores do módulo Equipamentos (disponibilidade, custo de manutenção por hora, razão preventiva/corretiva, aderência ao plano e conformidade legal). Aqui só se configura; os índices aparecem em Módulos &gt; Equipamentos &gt; Indicadores.</p>
      </div>
      <div className="panel max-w-5xl space-y-3 p-4">
        {bloco("geral", "Período", "Período mostrado quando se abre o painel de Indicadores (a pessoa ainda pode trocar).", (
          <div className="space-y-1">
            <Label htmlFor="kpi-periodo">Período padrão</Label>
            <Select value={r.periodoPadraoDias} onValueChange={(v) => setR((x) => ({ ...x, periodoPadraoDias: v }))}>
              <SelectTrigger id="kpi-periodo"><SelectValue /></SelectTrigger>
              <SelectContent>{[["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["180", "Últimos 180 dias"], ["365", "Últimos 12 meses"]].map(([v, t]) => <SelectItem key={v} value={v!}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
        {bloco("disponibilidade", "Disponibilidade", "Horas programadas = dias úteis do período × jornada, menos as horas de parada informadas nas manutenções.", (
          <>
            <Numero id="kpi-jornada" rotulo="Jornada (horas por dia útil)" valor={r.jornadaHoras} aoMudar={(v) => setR((x) => ({ ...x, jornadaHoras: v }))} min={1} max={24} />
            {metas("disponibilidade", "kpi-disp")}
          </>
        ))}
        {bloco("custo", "Custo de manutenção por hora", "Sem meta fixa: cada equipamento é comparado à média da frota.", (
          <Numero id="kpi-custo-fator" rotulo="Amarelo até (vezes a média da frota)" valor={r.custoFatorAmarelo} aoMudar={(v) => setR((x) => ({ ...x, custoFatorAmarelo: v }))} min={1} max={10} passo={0.1} ajuda="Até a média, verde; acima deste fator, vermelho." />
        ))}
        {bloco("preventiva", "Razão preventiva/corretiva", "Percentual de manutenções preventivas no período.", metas("preventiva", "kpi-prev"))}
        {bloco("aderencia", "Aderência ao plano de manutenção", "Percentual de itens do plano de manutenção em dia (limites de horas e de meses de Parâmetros > Equipamentos > Manutenção).", metas("aderencia", "kpi-ader"))}
        {bloco("conformidade", "Conformidade legal", "Requisitos atendidos entre os de todos os equipamentos.", (
          <>
            {metas("conformidade", "kpi-conf")}
            <Numero id="kpi-recarga" rotulo="Validade da recarga do extintor (meses)" valor={r.recargaExtintorMeses} aoMudar={(v) => setR((x) => ({ ...x, recargaExtintorMeses: v }))} min={1} max={60} />
            <Numero id="kpi-vaso" rotulo="Validade da inspeção do vaso de pressão (meses)" valor={r.inspecaoVasoMeses} aoMudar={(v) => setR((x) => ({ ...x, inspecaoVasoMeses: v }))} min={1} max={60} ajuda="Conta a manutenção preventiva mais recente." />
            {PERIODICIDADES_VISTORIA.map((p) => (
              <Numero key={p} id={`kpi-vistoria-${p}`} rotulo={`Vistoria ${p.toLowerCase()} vale (dias)`} valor={r.prazoVistoriaDias[p]} aoMudar={(v) => setR((x) => ({ ...x, prazoVistoriaDias: { ...x.prazoVistoriaDias, [p]: v } }))} min={1} max={366} />
            ))}
            <label htmlFor="kpi-sem-ocorrencia" className="flex cursor-pointer items-start gap-2 text-sm sm:col-span-2">
              <Checkbox id="kpi-sem-ocorrencia" className="mt-0.5" checked={r.exigirSemOcorrenciaAberta} onCheckedChange={(v) => setR((x) => ({ ...x, exigirSemOcorrenciaAberta: v === true }))} />
              <span>Empilhadeiras e máquinas (NR-11 e NR-12): exigir que não haja ocorrência de segurança aberta</span>
            </label>
          </>
        ))}
        {bloco("pronto", "Pronto para trabalhar agora", "O equipamento só está pronto se o status for Ativo ou Reserva e nenhuma destas condições valer.", (
          <>
            <label htmlFor="kpi-pronto-ocorrencia" className="flex cursor-pointer items-start gap-2 text-sm sm:col-span-2">
              <Checkbox id="kpi-pronto-ocorrencia" className="mt-0.5" checked={r.prontoOcorrenciaAberta} onCheckedChange={(v) => setR((x) => ({ ...x, prontoOcorrenciaAberta: v === true }))} />
              <span>Ocorrência aberta tira o equipamento de pronto</span>
            </label>
            <label htmlFor="kpi-pronto-vistoria" className="flex cursor-pointer items-start gap-2 text-sm sm:col-span-2">
              <Checkbox id="kpi-pronto-vistoria" className="mt-0.5" checked={r.prontoVistoriaNok} onCheckedChange={(v) => setR((x) => ({ ...x, prontoVistoriaNok: v === true }))} />
              <span>Última vistoria com item não conforme pendente tira o equipamento de pronto</span>
            </label>
          </>
        ))}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <div className="flex flex-wrap gap-2">
          <Button requiresWrite disabled={!!erro || igual} onClick={() => gravar(config, "Indicadores salvos.")}>Salvar indicadores</Button>
          <Button requiresWrite variant="outline" disabled={JSON.stringify(salva) === JSON.stringify(CONFIG_KPIS_PADRAO) && igual} onClick={async () => { if (await confirmarTexto("Voltar todos os indicadores aos valores padrão?", { rotuloConfirmar: "Restaurar" })) gravar(CONFIG_KPIS_PADRAO, "Indicadores restaurados ao padrão."); }}>Restaurar padrão</Button>
        </div>
      </div>
    </section>
  );
}
