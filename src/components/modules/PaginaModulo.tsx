import { DashboardModulo } from "@/components/modules/DashboardModulo";
import { EstoqueModulo } from "@/components/modules/EstoqueModulo";
import { MovimentacoesModulo } from "@/components/modules/MovimentacoesModulo";
import { UniformesComprasModulo } from "@/components/modules/UniformesComprasModulo";
import { UniformesRelatorioFuncionario } from "@/components/modules/UniformesRelatorioFuncionario";
import { UniformesRelatorioBaixa } from "@/components/modules/UniformesRelatorioBaixa";
import { UniformesTermoEntrega } from "@/components/modules/UniformesTermoEntrega";
import { UniformesTermoBaixa } from "@/components/modules/UniformesTermoBaixa";
import { EpiComprasModulo } from "@/components/modules/EpiComprasModulo";
import { EpiRelatorioFuncionario } from "@/components/modules/EpiRelatorioFuncionario";
import { EpiRelatorioBaixa } from "@/components/modules/EpiRelatorioBaixa";
import { EpiEntrega, UniformesEntrega } from "@/components/modules/EpiEntrega";
import { EpiTermoEntrega } from "@/components/modules/EpiTermoEntrega";
import { EpiFichaEpiAvulsa } from "@/components/modules/EpiFichaEpiAvulsa";
import { FerramentasCaixasModulo } from "@/components/modules/FerramentasCaixasModulo";
import { FerramentasTermoResponsabilidade } from "@/components/modules/FerramentasTermoResponsabilidade";
import { FerramentasTermoEncerramento } from "@/components/modules/FerramentasTermoEncerramento";
import { FerramentasTermoVistoria } from "@/components/modules/FerramentasTermoVistoria";
import { OcorrenciasModulo } from "@/components/modules/OcorrenciasModulo";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { abaDoModulo } from "@/lib/menu-parametros";
import type { Modulo } from "@/lib/gemape";

export function PaginaModulo({
  modulo,
  titulo,
  descricao,
  aba,
}: {
  modulo: Extract<Modulo, 'epi' | 'uniforme' | 'ferramenta'>;
  titulo: string;
  descricao: string;
  aba?: string | undefined;
}) {
  const abaValida = abaDoModulo(modulo, aba);
  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </header>

      {/* As abas viraram submenus no menu lateral (decisão 43): a aba vem de ?aba=. */}
      <Tabs value={abaValida}>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardModulo modulo={modulo} />
        </TabsContent>
        <TabsContent value="estoque" className="mt-5">
          <EstoqueModulo modulo={modulo} />
        </TabsContent>
        <TabsContent value="ocorrencias" className="mt-5">
          <OcorrenciasModulo modulo={modulo} />
        </TabsContent>

        {modulo !== "epi" && (
          <TabsContent value="movimentacoes" className="mt-5">
            <MovimentacoesModulo modulo={modulo} />
          </TabsContent>
        )}

        {modulo === "uniforme" && (
          <>
            <TabsContent value="compras" className="mt-5">
              <UniformesComprasModulo />
            </TabsContent>
            <TabsContent value="historico" className="mt-5">
              <UniformesRelatorioFuncionario />
            </TabsContent>
            <TabsContent value="baixas" className="mt-5">
              <UniformesRelatorioBaixa />
            </TabsContent>
            <TabsContent value="entrega" className="mt-5">
              <UniformesEntrega />
            </TabsContent>
            <TabsContent value="termo-entrega" className="mt-5">
              <UniformesTermoEntrega />
            </TabsContent>
            <TabsContent value="termo-baixa" className="mt-5">
              <UniformesTermoBaixa />
            </TabsContent>
          </>
        )}

        {modulo === "epi" && (
          <>
            <TabsContent value="compras" className="mt-5">
              <EpiComprasModulo />
            </TabsContent>
            <TabsContent value="historico" className="mt-5">
              <EpiRelatorioFuncionario />
            </TabsContent>
            <TabsContent value="baixas" className="mt-5">
              <EpiRelatorioBaixa />
            </TabsContent>
            <TabsContent value="entrega" className="mt-5">
              <EpiEntrega />
            </TabsContent>
            <TabsContent value="termo-entrega" className="mt-5">
              <EpiTermoEntrega />
            </TabsContent>
            <TabsContent value="ficha-avulsa" className="mt-5">
              <EpiFichaEpiAvulsa />
            </TabsContent>
          </>
        )}

        {modulo === "ferramenta" && (
          <>
            <TabsContent value="caixas" className="mt-5">
              <FerramentasCaixasModulo />
            </TabsContent>
            <TabsContent value="termo-responsabilidade" className="mt-5">
              <FerramentasTermoResponsabilidade />
            </TabsContent>
            <TabsContent value="termo-encerramento" className="mt-5">
              <FerramentasTermoEncerramento />
            </TabsContent>
            <TabsContent value="termo-vistoria" className="mt-5">
              <FerramentasTermoVistoria />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
