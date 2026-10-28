import { createFileRoute } from "@tanstack/react-router";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { CaixasHabilitadasPainel } from "@/components/parametros/CaixasHabilitadasPainel";
import { useAccess } from "@/lib/access-context";

const ABAS = ["caixas", "cadastro", "portadores", "habilitar"] as const;
type Aba = (typeof ABAS)[number];

export const Route = createFileRoute("/_authenticated/caixas-ferramentas")({
  // Endereços antigos com ?aba= continuam valendo, mas a tela agora é só Habilitar caixas (decisão 54).
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } =>
    ABAS.includes(search["aba"] as Aba) ? { aba: search["aba"] as Aba } : {},
  head: () => ({
    meta: [
      { title: "Cadastrar Caixa | Patrimônio GEMAPE" },
      { name: "description", content: "Habilitação das caixas de ferramentas numeradas." },
    ],
  }),
  component: PaginaCaixas,
});

// Cadastrar Caixa: cai direto na habilitação das caixas numeradas (01 a 100), só do Administrador.
function PaginaCaixas() {
  const { isAdmin } = useAccess();
  return (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Parâmetros" />
        <h1 className="text-2xl font-bold">Cadastrar Caixa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Habilitação das caixas numeradas de ferramentas.</p>
      </header>
      {isAdmin ? (
        <CaixasHabilitadasPainel />
      ) : (
        <p className="text-sm text-muted-foreground">Só o Administrador habilita caixas.</p>
      )}
    </div>
  );
}
