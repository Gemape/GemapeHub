import { descricaoVeiculo } from "@/lib/descricao-veiculo";
import type { Veiculo } from "@/lib/hooks-gemape";
import type { ParametrosBase } from "@/lib/parametros-base";
import { nomeSubcategoria } from "@/lib/subcategoria-referencia";

// Descrição do veículo na lista (decisão 49), sempre com a subcategoria atual de Gerais.
export const rotuloDoVeiculo = (parametros: ParametrosBase, v: Veiculo): string =>
  descricaoVeiculo({
    placa: v.placa,
    subcategoria: nomeSubcategoria(parametros, "cat-veiculos", v as never),
    marca: v.marca,
    modelo: v.modelo,
    ano: v.ano,
    cor: v.cor,
    combustivel: v.combustivel,
  });
