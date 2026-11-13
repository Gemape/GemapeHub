// Entrada natural de datas nos filtros: "hoje", "ontem", "7d" (últimos 7 dias, hoje incluído), "mes" (mês atual) viram o período exato (AAAA-MM-DD).

export type Periodo = { inicio: string; fim: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const doDia = (s: string) => new Date(`${s}T12:00:00Z`);
const somar = (s: string, dias: number) => { const d = doDia(s); d.setUTCDate(d.getUTCDate() + dias); return iso(d); };

/** Período do atalho digitado, ou null se o texto não for um atalho. `hoje` vem em AAAA-MM-DD. */
export function periodoDoAtalho(texto: string, hoje: string): Periodo | null {
  const t = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  if (t === "hoje") return { inicio: hoje, fim: hoje };
  if (t === "ontem") { const o = somar(hoje, -1); return { inicio: o, fim: o }; }
  if (t === "mes") {
    const d = doDia(hoje);
    return { inicio: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12))), fim: iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12))) };
  }
  const n = /^(\d{1,3})d$/.exec(t);
  const dias = n ? Number(n[1]) : 0;
  return dias >= 1 && dias <= 365 ? { inicio: somar(hoje, -(dias - 1)), fim: hoje } : null;
}
