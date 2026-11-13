import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { avisarOutrasAbas, ouvirOutrasAbas } from "@/lib/sincronia-abas";

// Mantém as abas abertas em dia: toda gravação concluída (movimentação, cadastro, baixa) avisa as outras abas, que recarregam os dados que mostram.
export function SincroniaAbas() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const parar = ouvirOutrasAbas(() => {
      void queryClient.invalidateQueries();
      toast.info("Dados atualizados: houve uma alteração em outra aba.", { id: "sincronia-abas", duration: 2500 });
    });
    // Toda mutação do react-query que termina bem avisa as outras abas; gravações fora do react-query chamam avisarOutrasAbas() à mão.
    const sair = queryClient.getMutationCache().subscribe((evento) => {
      if (evento.type === "updated" && evento.action.type === "success") avisarOutrasAbas();
    });
    return () => { parar(); sair(); };
  }, [queryClient]);
  return null;
}
