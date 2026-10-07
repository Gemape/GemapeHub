import { useEffect } from "react";

import { AssociarTamanhosPainel } from "@/components/parametros/AssociarTamanhosPainel";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import { TamanhosMedidasPainel } from "@/components/parametros/TamanhosMedidasPainel";

export const CATEGORIA_DO_MENU = { epi: "cat-epi", uniformes: "cat-uniformes", ferramentas: "cat-ferramentas" } as const;
const TOPO = { epi: "Parâmetros · EPI", uniformes: "Parâmetros · Uniformes", ferramentas: "Parâmetros · Ferramentas" } as const;

// Tamanho e Medidas de Produto numa tela só (decisão 89): o cadastro dos tamanhos e medidas e, logo abaixo, a
// associação deles às subcategorias do menu. A lista de tamanhos é uma só no sistema, igual nos três menus; a
// categoria da associação vem do menu. Sem menu de origem (endereço antigo), a associação mostra o seletor de categoria.
// `emJanela`: dentro da janela do Novo EPI/Uniforme o título é de seção, porque a janela já tem o seu.
// `irParaAssociar`: o endereço antigo ?aba=associar rola até a associação.
export function TamanhosMedidasUnificado({ de, emJanela = false, irParaAssociar = false }: { de?: keyof typeof CATEGORIA_DO_MENU | undefined; emJanela?: boolean; irParaAssociar?: boolean }) {
  useEffect(() => {
    if (!irParaAssociar) return;
    // Espera a lista de cima terminar de aparecer, para a rolagem parar no lugar certo.
    const espera = setTimeout(() => document.getElementById("associar-ao-produto")?.scrollIntoView(), 300);
    return () => clearTimeout(espera);
  }, [irParaAssociar]);
  return (
    <div className="space-y-8">
      {!emJanela && (
        <Cabecalho
          titulo="Tamanho e Medidas de Produto"
          topo={de ? TOPO[de] : "Cadastros · Gerais"}
          descricao="Cadastre os tamanhos, numerações e unidades e, logo abaixo, associe-os às subcategorias do produto."
        />
      )}
      <TamanhosMedidasPainel aninhado />
      {/* key: trocar de menu (?de=) começa a associação limpa, sem a subcategoria do menu anterior. */}
      <div id="associar-ao-produto">
        <AssociarTamanhosPainel key={de ?? "todas"} aninhado {...(de ? { categoriaFixa: CATEGORIA_DO_MENU[de] } : {})} />
      </div>
    </div>
  );
}
