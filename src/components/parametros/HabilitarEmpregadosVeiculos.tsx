import { CaixaDuplaEmpregados } from "@/components/parametros/CaixaDuplaEmpregados";
import { lerEmpregadosDeVeiculos, salvarEmpregadosDeVeiculos } from "@/lib/empregados-veiculos";

// Parâmetros > Veículos > Parâmetros Específicos (decisão 308): os empregados envolvidos nas rotinas de veículos em geral, com a área de cada um. É a mesma caixa dupla
// de Parâmetros > Viagens, com uma lista só de Veículos. Com a lista vazia, as rotinas oferecem todos os empregados ativos.
export function HabilitarEmpregadosVeiculos() {
  return (
    <CaixaDuplaEmpregados
      idBase="veiculos"
      secao
      titulo="Empregados das rotinas de veículos"
      descricao="Escolha, entre todos os empregados ativos, quem fica envolvido nas rotinas de veículos (check list, ocorrências e as demais): marque à esquerda e passe para a direita, com a área de cada um. Com a lista vazia, todos os empregados ativos aparecem. Nada vale até clicar em Salvar."
      tituloDireita="Envolvidos nas rotinas de veículos"
      mensagemSalvo="Empregados das rotinas de veículos salvos."
      carregar={lerEmpregadosDeVeiculos}
      gravar={salvarEmpregadosDeVeiculos}
    />
  );
}
