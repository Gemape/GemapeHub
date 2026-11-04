import { CaixaDuplaEmpregados } from "@/components/parametros/CaixaDuplaEmpregados";
import { lerEmpregadosDeEpi, salvarEmpregadosDeEpi } from "@/lib/empregados-epi";

// Parâmetros > EPI > Parâmetros Específicos: os empregados que fazem parte da entrega e do recebimento de EPI, cada um com a sua área na oficina. É a mesma caixa dupla
// de Veículos e de Viagens, com uma lista só de EPI. Com a lista vazia, as rotinas de EPI oferecem todos os empregados ativos. As áreas vêm do cartão "Áreas da oficina".
export function HabilitarEmpregadosEpi({ areas }: { areas: readonly string[] }) {
  return (
    <CaixaDuplaEmpregados<string>
      idBase="epi"
      secao
      titulo="Empregados das rotinas de EPI"
      descricao="Escolha, entre todos os empregados ativos, quem entrega e recebe EPI: marque à esquerda e passe para a direita, com a área de cada um na oficina. Na Entrega EPI, no Termo de Entrega, na Ficha avulsa, na devolução e nas Ocorrências só aparecem os habilitados; com a lista vazia, todos os empregados ativos aparecem. Os relatórios e a baixa definitiva mostram todos. Nada vale até clicar em Salvar."
      tituloDireita="Habilitados para entrega e recebimento de EPI"
      mensagemSalvo="Empregados das rotinas de EPI salvos."
      areas={areas}
      carregar={lerEmpregadosDeEpi}
      gravar={salvarEmpregadosDeEpi}
    />
  );
}
