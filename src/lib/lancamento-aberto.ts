// Retomada de trabalho: o lançamento que ficou pela metade (check list em andamento) volta a aparecer, com o dia e a hora em que foi começado.
// Só texto: o lançamento em si já fica guardado pelo módulo.

const fuso = "America/Sao_Paulo";
const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: fuso });

/** "hoje às 11:20", "ontem às 16:05" ou "de 12/11 às 09:40" (hora de Brasília). Sem data válida, devolve "". */
export function quandoComecou(criadoEm: string | null | undefined, agora: Date = new Date()): string {
  const d = new Date(criadoEm ?? "");
  if (Number.isNaN(d.getTime())) return "";
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
  const ontem = new Date(agora.getTime() - 24 * 3600 * 1000);
  if (dia(d) === dia(agora)) return `de hoje às ${hora}`;
  if (dia(d) === dia(ontem)) return `de ontem às ${hora}`;
  return `de ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: fuso })} às ${hora}`;
}

/** O mais recente dos lançamentos em andamento (ou nada). */
export function maisRecenteEmAndamento<T extends { status: string; criadoEm: string }>(lista: readonly T[]): T | null {
  return lista.filter((c) => c.status === "Em andamento").sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0] ?? null;
}
