// Id dos registros de exemplo dos formulários (2.8). Arquivo à parte, sem dados, porque as telas o importam sempre; os dados ficam em exemplos.ts,
// só alcançado a partir de código protegido pelo modo demonstração.
export const ID_EXEMPLO = "exemplo-";
export const ehExemplo = (registro: { id?: string } | null | undefined): boolean => String(registro?.id ?? "").startsWith(ID_EXEMPLO);
