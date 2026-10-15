import { QuestionarioDespesasConstrutor } from "@/components/parametros/QuestionarioDespesasConstrutor";

// Tela única do Questionário de Despesas em Parâmetros: abre direto na configuração das perguntas por card de Viagens (dec 201).
// O formulário de preenchimento fica no módulo Viagens; quem só lê vê a montagem sem os botões de alteração.
export function QuestionarioDespesasTela() {
  return <QuestionarioDespesasConstrutor />;
}
