// Datas padrão dos formulários no fuso local (Brasília), nunca em UTC:
// depois das 21h, toISOString() já cai no dia seguinte (pendência 4).
import { hojeLocal } from "./empregados.ts";

/** Primeiro dia do mês corrente, no fuso local (AAAA-MM-DD). */
export const primeiroDiaDoMesLocal = (agora = new Date()) =>
  hojeLocal(new Date(agora.getFullYear(), agora.getMonth(), 1));

/** Data de `dias` dias atrás, no fuso local (AAAA-MM-DD). */
export const diasAtrasLocal = (dias: number, agora = new Date()) =>
  hojeLocal(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - dias));
