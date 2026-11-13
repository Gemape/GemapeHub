import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { TODAS } from "@/lib/empresa-context";
import { useEmpregados, useItens } from "@/lib/hooks-gemape";
import { estadoEstoqueModulo } from "@/lib/estoque-tamanho";
import { cadastrosParecidos } from "@/lib/semelhantes";
import { useParametrosBase } from "@/lib/use-parametros-base";

type Alvo = "epi" | "uniforme" | "ferramenta" | "empregado";

// Aviso discreto abaixo do campo de nome: "Itens parecidos já cadastrados: Luva de Vaqueta Mista (Saldo: 24 un)".
// Lê o campo pelo id (o formulário segue como está, sem estado novo) e nunca bloqueia: é só informação para evitar cadastro repetido.
export function AvisoSemelhantes({ campoId, alvo, ignorarId, ativo = true }: { campoId: string; alvo: Alvo; ignorarId?: string | null; ativo?: boolean }) {
  const [texto, setTexto] = useState("");
  const parametros = useParametrosBase();
  const ehEmpregado = alvo === "empregado";
  // Só lê o cadastro depois que o operador digitou o bastante para haver o que comparar: abrir o formulário não custa uma consulta a mais.
  const digitou = ativo && texto.trim().length >= 4;
  const { data: itens = [] } = useItens(ehEmpregado ? "epi" : alvo, TODAS, "", digitou && !ehEmpregado);
  const { data: empregados = [] } = useEmpregados(TODAS, false, digitou && ehEmpregado);

  // Acompanha o que se digita (e o valor inicial, ao editar ou clonar).
  useEffect(() => {
    if (!ativo) return;
    const campo = document.getElementById(campoId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!campo) return;
    setTexto(campo.value);
    const ler = () => setTexto(campo.value);
    // input = digitando; change e blur = valor ajustado pelo sistema (capitalização ao sair do campo) ou colado.
    for (const evento of ["input", "change", "blur"]) campo.addEventListener(evento, ler);
    return () => { for (const evento of ["input", "change", "blur"]) campo.removeEventListener(evento, ler); };
  }, [campoId, ativo]);

  const parecidos = useMemo(() => {
    if (ehEmpregado) return cadastrosParecidos(texto, empregados, { ignorarId, minimo: 0.75, exata: true }).map((p) => ({ id: p.item.id, rotulo: p.item.nome }));
    return cadastrosParecidos(texto, itens, { ignorarId }).map((p) => {
      const saldo = estadoEstoqueModulo(parametros, alvo, p.item).saldo;
      const unidade = (p.item as { unidade_medida?: string | null }).unidade_medida;
      return { id: p.item.id, rotulo: `${p.item.nome} (Saldo: ${saldo} ${unidade || "un"})` };
    });
  }, [texto, itens, empregados, ehEmpregado, ignorarId, parametros, alvo]);

  if (!ativo || parecidos.length === 0) return null;
  return (
    <p role="status" className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{ehEmpregado ? "Empregados parecidos já cadastrados" : "Itens parecidos já cadastrados"}: {parecidos.map((p) => p.rotulo).join("; ")}. Se é outro, pode continuar.</span>
    </p>
  );
}
