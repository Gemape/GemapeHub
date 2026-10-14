import { useState } from "react";

import { QuestionarioDespesasConstrutor } from "@/components/parametros/QuestionarioDespesasConstrutor";
import { QuestionarioFormulario } from "@/components/parametros/QuestionarioFormulario";
import { useAccess } from "@/lib/access-context";

// Tela única do Questionário de Despesas (dec 173): abre no formulário; quem pode gravar tem ali o Editar questionário,
// que troca para a montagem na mesma tela, e o Abrir formulário volta para o preenchimento com o mesmo tipo de despesa.
export function QuestionarioDespesasTela() {
  const { canWrite } = useAccess();
  const [montando, setMontando] = useState(false);
  const [tipo, setTipo] = useState<string | undefined>(undefined);
  if (montando && canWrite) {
    return <QuestionarioDespesasConstrutor tipoInicial={tipo} onAbrirFormulario={(t) => { setTipo(t); setMontando(false); }} />;
  }
  return <QuestionarioFormulario tipoInicial={tipo} onEditar={(t) => { setTipo(t || undefined); setMontando(true); }} />;
}
