import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

// Vai e volta do extrato do veículo (decisão 346): a rotina aberta pelo extrato (check list, tratativa) recebe o id do veículo em `voltar`. Quando a tela da rotina abre e depois fecha (ao finalizar,
// salvar, cancelar ou fechar), a pessoa volta ao extrato desse veículo na Frota. `aberta` diz se a rotina está com a tela aberta.
export function useVoltarAoExtrato(aberta: boolean, voltar: string | undefined) {
  const navegar = useNavigate();
  const destino = useRef<string | null>(null);
  const jaAbriu = useRef(false);
  if (voltar) destino.current = voltar;
  useEffect(() => {
    if (aberta) {
      jaAbriu.current = true;
      return;
    }
    if (!jaAbriu.current || !destino.current) return;
    const veiculo = destino.current;
    destino.current = null;
    jaAbriu.current = false;
    void navegar({ to: "/veiculos", search: { aba: "frota", extrato: veiculo } });
  }, [aberta, navegar]);
}
