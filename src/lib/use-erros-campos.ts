import { useId, useState } from "react";

type Validador = (valor: string) => string | null;

// Erro por campo, conferido ao sair do campo e limpo ao digitar. `chave` muda quando o formulário passa a ser outro
// (abriu de novo, outro cadastro, clone): os erros do anterior somem. Uso:
//   const { erro, campo, idErro } = useErrosCampos(chave);
//   <Input name="cnpj" {...campo("cnpj", validarCnpjCampo)} />  +  <ErroCampo id={idErro("cnpj")} texto={erro("cnpj")} />
export function useErrosCampos(chave = "") {
  const prefixo = useId();
  const [estado, setEstado] = useState<{ chave: string; erros: Record<string, string | null> }>({ chave, erros: {} });
  // Chave nova: descarta o que sobrou do formulário anterior já neste render (padrão de reinício por props).
  const erros = estado.chave === chave ? estado.erros : {};
  const idErro = (nome: string) => `${prefixo}-${nome}-erro`;
  const definir = (nome: string, msg: string | null) =>
    setEstado((e) => {
      const atuais = e.chave === chave ? e.erros : {};
      return atuais[nome] === msg ? e : { chave, erros: { ...atuais, [nome]: msg } };
    });
  const campo = (nome: string, validar: Validador) => ({
    "aria-invalid": erros[nome] ? (true as const) : undefined,
    "aria-describedby": erros[nome] ? idErro(nome) : undefined,
    onBlur: (ev: React.FocusEvent<HTMLInputElement>) => definir(nome, validar(ev.target.value)),
    // Captura: roda antes do onInput que aplica a máscara, sem tomar o lugar dele.
    onInputCapture: () => definir(nome, null),
  });
  return { erro: (nome: string) => erros[nome] ?? null, campo, idErro };
}
