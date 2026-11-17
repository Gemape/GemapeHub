import { FlaskConical } from "lucide-react";

import { confirmarTexto } from "@/components/ConfirmarAcao";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { lerControle, pedirLimpar, pedirRestaurar } from "@/lib/dados-teste/aplicar";
import { VERSAO_DADOS_TESTE } from "@/lib/dados-teste/conjunto";

// Só no modo demonstração (quem monta este menu confere): Restaurar repõe os dados de teste originais e Limpar tira todos. O pedido fica anotado e o sistema
// é recarregado, porque o cliente de demonstração só lê os dados ao abrir.
export function MenuDadosDeTeste() {
  const controle = lerControle(localStorage);
  const limpo = controle?.estado === "limpo";

  async function restaurar() {
    if (!(await confirmarTexto("Restaurar os dados de teste? Os dados de teste voltam ao conjunto original, e o que você alterou neles se perde. O que você criou à mão fica.", { rotuloConfirmar: "Restaurar", destrutivo: true }))) return;
    pedirRestaurar(localStorage);
    location.reload();
  }
  async function limpar() {
    if (!(await confirmarTexto("Limpar os dados de teste? Eles saem do sistema e não voltam sozinhos até você restaurar. O que você criou à mão fica.", { rotuloConfirmar: "Limpar", destrutivo: true }))) return;
    pedirLimpar(localStorage);
    location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Dados de teste">
          <FlaskConical className="mr-1 size-4" aria-hidden="true" />Dados de teste
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {limpo ? "Dados de teste limpos" : `Dados de teste gravados no navegador · versão ${controle?.versao ?? VERSAO_DADOS_TESTE}`}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={restaurar}>Restaurar dados de teste</DropdownMenuItem>
        <DropdownMenuItem onSelect={limpar} disabled={limpo}>Limpar dados de teste</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
