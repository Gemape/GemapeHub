import { createLucideIcon } from "lucide-react";

// Ícones próprios (a biblioteca não tem estes), no mesmo traço dos demais: 24x24, contorno de 2.

// Pedágio: cancela (poste e braço com listras inclinadas).
export const Cancela = createLucideIcon("Cancela", [
  ["rect", { x: "2.5", y: "7", width: "5", height: "14", rx: "1", key: "poste" }],
  ["rect", { x: "7.5", y: "10", width: "14", height: "5", rx: "1", key: "braco" }],
  ["path", { d: "M12 15l1.5-5M16 15l1.5-5M20 15l1.5-5", key: "listras" }],
]);

// Compra de peças: parafuso (cabeça e haste pontuda) ao lado de uma porca sextavada.
export const ParafusoEPorca = createLucideIcon("ParafusoEPorca", [
  ["rect", { x: "2", y: "3", width: "9", height: "3", rx: "1", key: "cabeca" }],
  ["path", { d: "M4 6v12l2.5 3L9 18V6", key: "haste" }],
  ["path", { d: "M4 11l5-1.5M4 15l5-1.5", key: "rosca" }],
  ["path", { d: "M17.5 8l4.3 2.5v5L17.5 18l-4.3-2.5v-5z", key: "porca" }],
  ["circle", { cx: "17.5", cy: "13", r: "1.5", key: "furo" }],
]);
