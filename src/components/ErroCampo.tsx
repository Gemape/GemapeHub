// Mensagem de erro sob o campo; `id` vem de idErro() do useErrosCampos e casa com o aria-describedby do campo.
export function ErroCampo({ id, texto }: { id: string; texto?: string | null | undefined }) {
  return texto ? <p id={id} role="alert" className="text-xs font-medium text-destructive">{texto}</p> : null;
}
