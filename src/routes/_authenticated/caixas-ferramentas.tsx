import { createFileRoute } from "@tanstack/react-router";

import { CaixasFerramentasModulo } from "@/components/modules/CaixasFerramentasModulo";
import { FerramentasCaixasModulo } from "@/components/modules/FerramentasCaixasModulo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/caixas-ferramentas")({
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
  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">Caixas de Ferramentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo de cada caixa, responsável, localização e cadastro dos kits de ferramentas.
        </p>
      </header>
      <Tabs defaultValue="caixas">
        <TabsList className="flex w-full justify-start bg-transparent p-0">
          <div className="flex flex-nowrap gap-1">
            <TabsTrigger value="caixas" className={aba}>Caixas e itens</TabsTrigger>
            <TabsTrigger value="cadastro" className={aba}>Cadastro</TabsTrigger>
          </div>
        </TabsList>
        <TabsContent value="caixas" className="mt-5"><FerramentasCaixasModulo /></TabsContent>
        <TabsContent value="cadastro" className="mt-5"><CaixasFerramentasModulo /></TabsContent>
      </Tabs>
    </div>
  );
}
