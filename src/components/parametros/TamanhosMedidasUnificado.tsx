import { AssociarTamanhosPainel } from "@/components/parametros/AssociarTamanhosPainel";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { TamanhosMedidasPainel } from "@/components/parametros/TamanhosMedidasPainel";

export const CATEGORIA_DO_MENU = { epi: "cat-epi", uniformes: "cat-uniformes", ferramentas: "cat-ferramentas" } as const;
const TOPO = { epi: "Parâmetros · EPI", uniformes: "Parâmetros · Uniformes", ferramentas: "Parâmetros · Ferramentas" } as const;

// Tamanho e Medidas de Produto numa tela só (decisão 89): o cadastro dos tamanhos e medidas e, logo abaixo, a
// associação deles às subcategorias do menu. A lista de tamanhos é uma só no sistema, igual nos três menus; a
// categoria da associação vem do menu. Sem menu de origem (endereço antigo), a associação mostra o seletor de categoria.
export function TamanhosMedidasUnificado({ de }: { de?: keyof typeof CATEGORIA_DO_MENU | undefined }) {
  return (
    <div className="space-y-8">
      <Cabecalho
        titulo="Tamanho e Medidas de Produto"
        topo={de ? TOPO[de] : "Cadastros · Gerais"}
        descricao="Cadastre os tamanhos, numerações e unidades e, logo abaixo, associe-os às subcategorias do produto."
      />
      <TamanhosMedidasPainel aninhado />
      <AssociarTamanhosPainel aninhado {...(de ? { categoriaFixa: CATEGORIA_DO_MENU[de] } : {})} />
    </div>
  );
}
