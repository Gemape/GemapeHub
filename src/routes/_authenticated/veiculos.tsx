import { createFileRoute } from "@tanstack/react-router";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { OcorrenciasModulo } from "@/components/modules/OcorrenciasModulo";
import { AbastecimentoVeiculoModulo } from "@/components/modules/AbastecimentoVeiculoModulo";
import { ChecklistVeiculoModulo } from "@/components/modules/ChecklistVeiculoModulo";
import { FrotaModulo } from "@/components/modules/FrotaModulo";
import { ManutencaoVeiculoModulo } from "@/components/modules/ManutencaoVeiculoModulo";
import { OcorrenciasVeiculoModulo } from "@/components/modules/OcorrenciasVeiculoModulo";
import { MODO_DEMO } from "@/lib/modo-demo";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { abaDoModulo, tituloDaAba } from "@/lib/menu-parametros";
import { useTituloDaPagina } from "@/lib/titulo-pagina";

export const Route = createFileRoute("/_authenticated/veiculos")({
  validateSearch: (search: Record<string, unknown>): { aba?: string } =>
    typeof search["aba"] === "string" ? { aba: search["aba"] } : {},
  head: () => ({
    meta: [
      { title: "Veículos | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de veículos do grupo GEMAPE com placa, RENAVAM, quilometragem, situação e empregado responsável.",
      },
      { property: "og:title", content: "Veículos | Patrimônio GEMAPE" },
      { property: "og:description", content: "Frota do grupo GEMAPE e seus responsáveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaVeiculos,
});

function PaginaVeiculos() {
  const { aba } = Route.useSearch();
  const abaValida = abaDoModulo("veiculo", aba);
  // Uma tela interna pode trocar o título (Check list periódico e avulso).
  const tituloTrocado = useTituloDaPagina();

  return (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Módulo" />
        <h1 className="text-2xl font-bold">{tituloTrocado ?? tituloDaAba("veiculo", aba)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Frota da empresa com extrato por veículo, abastecimentos, manutenções e ocorrências. O cadastro fica em Parâmetros &gt; Veículos.
        </p>
      </header>

      {/* As abas viraram submenus no menu lateral (decisão 43). */}
      <Tabs value={abaValida}>

        <TabsContent value="frota" className="mt-5">
          <FrotaModulo />
        </TabsContent>
        <TabsContent value="abastecimento" className="mt-5">
          <AbastecimentoVeiculoModulo />
        </TabsContent>
        <TabsContent value="manutencao" className="mt-5">
          <ManutencaoVeiculoModulo />
        </TabsContent>

        <TabsContent value="ocorrencias" className="mt-5">
          {MODO_DEMO ? <OcorrenciasVeiculoModulo /> : <OcorrenciasModulo modulo="veiculo" />}
        </TabsContent>
        <TabsContent value="checklist" className="mt-5">
          {MODO_DEMO ? <ChecklistVeiculoModulo /> : <p className="text-sm text-muted-foreground">O check list de veículos estará disponível após a Fase 2 (banco real).</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
