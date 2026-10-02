import { createFileRoute } from "@tanstack/react-router";

import { CaixasFerramentasModulo } from "@/components/modules/CaixasFerramentasModulo";
import { FerramentasCaixasModulo } from "@/components/modules/FerramentasCaixasModulo";
import { CaixasHabilitadasPainel } from "@/components/parametros/CaixasHabilitadasPainel";
import { useAccess } from "@/lib/access-context";
import { PortadoresCaixaModulo } from "@/components/modules/PortadoresCaixaModulo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ABAS = ["caixas", "cadastro", "portadores", "habilitar"] as const;
type Aba = (typeof ABAS)[number];

export const Route = createFileRoute("/_authenticated/caixas-ferramentas")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } =>
    ABAS.includes(search["aba"] as Aba) ? { aba: search["aba"] as Aba } : {},
  head: () => ({
    meta: [
      { title: "Caixas de Ferramentas | Patrimônio GEMAPE" },
      { name: "description", content: "Caixas de ferramentas, seus itens e responsáveis." },
    ],
  }),
  component: PaginaCaixas,
});

const aba = "data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap";

function PaginaCaixas() {
  const { isAdmin } = useAccess();
  const { aba: pedida } = Route.useSearch();
  // Habilitar caixas é só do Administrador; para os outros a tela abre na primeira aba.
  const inicial: Aba = pedida && (pedida !== "habilitar" || isAdmin) ? pedida : "caixas";
  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">Caixas de Ferramentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo de cada caixa, responsável, localização, cadastro dos kits de ferramentas e, para o Administrador, a habilitação das caixas numeradas.
        </p>
      </header>
      <Tabs defaultValue={inicial} key={inicial}>
        <TabsList className="flex w-full justify-start bg-transparent p-0">
          <div className="flex flex-nowrap gap-1">
            <TabsTrigger value="caixas" className={aba}>Caixas e itens</TabsTrigger>
            <TabsTrigger value="cadastro" className={aba}>Cadastro</TabsTrigger>
            <TabsTrigger value="portadores" className={aba}>Portadores</TabsTrigger>
            {isAdmin && <TabsTrigger value="habilitar" className={aba}>Habilitar caixas</TabsTrigger>}
          </div>
        </TabsList>
        <TabsContent value="caixas" className="mt-5"><FerramentasCaixasModulo /></TabsContent>
        <TabsContent value="cadastro" className="mt-5"><CaixasFerramentasModulo /></TabsContent>
        <TabsContent value="portadores" className="mt-5"><PortadoresCaixaModulo /></TabsContent>
        {isAdmin && <TabsContent value="habilitar" className="mt-5"><CaixasHabilitadasPainel /></TabsContent>}
      </Tabs>
    </div>
  );
}
