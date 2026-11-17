// Mensagem de erro sob o campo; o id casa com o aria-describedby de useErrosCampos.
export function ErroCampo({ id, texto }: { id: string; texto?: string | null | undefined }) {
  return texto ? <p id={`${id}-erro`} role="alert" className="text-xs font-medium text-destructive">{texto}</p> : null;
}
