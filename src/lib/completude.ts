// Completude do cadastro: quantos dos campos importantes estão preenchidos e quais faltam (para a barra "Cadastro 85% completo — falta X").
export type CampoDeCompletude = { id: string; rotulo: string };

export function calcularCompletude(valores: Readonly<Record<string, string | null | undefined>>, campos: readonly CampoDeCompletude[]): { pct: number; faltam: CampoDeCompletude[] } {
  const faltam = campos.filter((c) => !String(valores[c.id] ?? "").trim());
  const pct = campos.length === 0 ? 100 : Math.round(((campos.length - faltam.length) / campos.length) * 100);
  return { pct, faltam };
}

export const CAMPOS_EMPREGADO: readonly CampoDeCompletude[] = [
  { id: "nome", rotulo: "o nome" }, { id: "cpf", rotulo: "o CPF" }, { id: "empresa_id", rotulo: "a empresa" },
  { id: "matricula", rotulo: "a matrícula" }, { id: "email", rotulo: "o e-mail" }, { id: "data_admissao", rotulo: "a data de admissão" },
];

export const CAMPOS_VEICULO: readonly CampoDeCompletude[] = [
  { id: "tipo", rotulo: "a subcategoria" }, { id: "placa", rotulo: "a placa" }, { id: "marca", rotulo: "a marca" }, { id: "modelo", rotulo: "o modelo" },
  { id: "ano", rotulo: "o ano" }, { id: "cor", rotulo: "a cor" }, { id: "combustivel", rotulo: "o combustível" }, { id: "empresa_id", rotulo: "a empresa" },
  { id: "renavam", rotulo: "o RENAVAM" }, { id: "quilometragem_atual", rotulo: "a quilometragem" },
];
