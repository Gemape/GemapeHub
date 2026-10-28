import { CaixaDuplaEmpregados } from "@/components/parametros/CaixaDuplaEmpregados";
import { ID_HABILITADOS, lerEstado, salvarPergunta, type Habilitado } from "@/lib/questionario-despesas";

// Parâmetros > Viagens > Parâmetros Específicos (decisão 299): os empregados habilitados a lançar despesas no questionário de despesas. A lista é a mesma da pergunta
// "Quem está lançando" (pergunta 04): quem fica inativo no cadastro sai do questionário sozinho.
const carregar = (): Habilitado[] => lerEstado().perguntas.find((p) => p.id === ID_HABILITADOS)?.habilitados ?? [];
function gravar(habilitados: Habilitado[]): void {
  const estado = lerEstado();
  const q04 = estado.perguntas.find((p) => p.id === ID_HABILITADOS);
  if (!q04) throw new Error("A pergunta de quem está lançando não foi encontrada no questionário.");
  salvarPergunta(estado, { ...q04, habilitados });
}

export function HabilitarEmpregadosViagens() {
  return (
    <CaixaDuplaEmpregados
      idBase="viagens"
      titulo="Parâmetros Específicos"
      descricao="Escolha, entre todos os empregados ativos, quem fica habilitado a lançar despesas no questionário de despesas. Marque à esquerda e passe para a direita; a área de cada habilitado define o que ele vê no formulário. Nada vale até clicar em Salvar."
      tituloDireita="Habilitados para o questionário de despesas"
      mensagemSalvo="Empregados habilitados salvos."
      carregar={carregar}
      gravar={gravar}
    />
  );
}
