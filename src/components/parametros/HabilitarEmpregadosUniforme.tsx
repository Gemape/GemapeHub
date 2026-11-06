import { CaixaDuplaEmpregados } from "@/components/parametros/CaixaDuplaEmpregados";
import { lerEmpregadosDeUniforme, salvarEmpregadosDeUniforme } from "@/lib/empregados-uniforme";

// Parâmetros > Uniformes > Parâmetros Específicos: os empregados que fazem parte da entrega e do recebimento de uniformes, cada um com a sua área. É a mesma caixa dupla
// do EPI, com uma lista só dos Uniformes. Com a lista vazia, as rotinas de uniformes oferecem todos os empregados ativos. As áreas vêm do cartão "Áreas da oficina".
export function HabilitarEmpregadosUniforme({ areas }: { areas: readonly string[] }) {
  return (
    <CaixaDuplaEmpregados<string>
      idBase="uniforme"
      secao
      titulo="Empregados das rotinas de uniformes"
      descricao="Escolha, entre todos os empregados ativos, quem entrega e recebe uniformes: marque à esquerda e passe para a direita, com a área de cada um. Na Entrega Uniforme, no Termo de Entrega, na devolução e nas Ocorrências só aparecem os habilitados; com a lista vazia, todos os empregados ativos aparecem. O Termo de Baixa e os relatórios mostram todos. Nada vale até clicar em Salvar."
      tituloDireita="Habilitados para entrega e recebimento de uniformes"
      mensagemSalvo="Empregados das rotinas de uniformes salvos."
      areas={areas}
      carregar={lerEmpregadosDeUniforme}
      gravar={salvarEmpregadosDeUniforme}
    />
  );
}
