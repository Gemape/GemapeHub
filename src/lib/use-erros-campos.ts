import { useState } from "react";

type Validador = (valor: string) => string | null;

// Erro por campo, conferido ao sair do campo e limpo ao digitar. Uso:
//   const { erros, campo } = useErrosCampos();
//   <Input name="cnpj" {...campo("cnpj", validarCnpjCampo)} />  +  <ErroCampo id="cnpj" texto={erros.cnpj} />
export function useErrosCampos() {
  const [erros, setErros] = useState<Record<string, string | null>>({});
  const definir = (nome: string, msg: string | null) => setErros((e) => (e[nome] === msg ? e : { ...e, [nome]: msg }));
  const campo = (nome: string, validar: Validador) => ({
    "aria-invalid": erros[nome] ? (true as const) : undefined,
    "aria-describedby": erros[nome] ? `${nome}-erro` : undefined,
    onBlur: (ev: React.FocusEvent<HTMLInputElement>) => definir(nome, validar(ev.target.value)),
    // Captura: roda antes do onInput que aplica a máscara, sem tomar o lugar dele.
    onInputCapture: () => definir(nome, null),
  });
  return { erros, erro: (nome: string) => erros[nome] ?? null, campo };
}
