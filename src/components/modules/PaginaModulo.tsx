import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { DashboardModulo } from "@/components/modules/DashboardModulo";
import { EstoqueEpiModulo } from "@/components/modules/EstoqueEpiModulo";
import { EstoqueModulo } from "@/components/modules/EstoqueModulo";
import { MovimentacoesModulo } from "@/components/modules/MovimentacoesModulo";
import { UniformesComprasModulo } from "@/components/modules/UniformesComprasModulo";
import { UniformesRelatorioFuncionario } from "@/components/modules/UniformesRelatorioFuncionario";
import { UniformesRelatorioBaixa } from "@/components/modules/UniformesRelatorioBaixa";
import { UniformesTermoEntrega } from "@/components/modules/UniformesTermoEntrega";
import { UniformesTermoBaixa } from "@/components/modules/UniformesTermoBaixa";
import { EpiComprasModulo } from "@/components/modules/EpiComprasModulo";
import { SugestaoComprasEpi } from "@/components/modules/SugestaoComprasEpi";
import { EpiRelatorioFuncionario } from "@/components/modules/EpiRelatorioFuncionario";
import { EpiRelatorioBaixa } from "@/components/modules/EpiRelatorioBaixa";
import { EpiEntrega, UniformesEntrega } from "@/components/modules/EpiEntrega";
import { EpiTermoEntrega } from "@/components/modules/EpiTermoEntrega";
import { EpiOrdemServico } from "@/components/modules/EpiOrdemServico";
import { EpiFichaEpiAvulsa } from "@/components/modules/EpiFichaEpiAvulsa";
import { FerramentasPorCaixas } from "@/components/modules/FerramentasPorCaixas";
import { FerramentasSugestaoCompras } from "@/components/modules/FerramentasSugestaoCompras";
import { FerramentasCaixasModulo } from "@/components/modules/FerramentasCaixasModulo";
import { FerramentasTermoResponsabilidade } from "@/components/modules/FerramentasTermoResponsabilidade";
import { FerramentasTermoEncerramento } from "@/components/modules/FerramentasTermoEncerramento";
import { FerramentasTermoVistoria } from "@/components/modules/FerramentasTermoVistoria";
import { OcorrenciasModulo } from "@/components/modules/OcorrenciasModulo";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { abaDoModulo, descricaoDaAba, tituloDaAba } from "@/lib/menu-parametros";
import type { Modulo } from "@/lib/gemape";

export function PaginaModulo({
  modulo,
  descricao,
  aba,
}: {
  modulo: Extract<Modulo, 'epi' | 'uniforme' | 'ferramenta'>;
  descricao: string;
  aba?: string | undefined;
}) {
  const abaValida = abaDoModulo(modulo, aba);
  return (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Módulo" />
        <h1 className="text-2xl font-bold">{tituloDaAba(modulo, aba)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descricaoDaAba(modulo, aba, descricao)}</p>
      </header>

      {/* As abas viraram submenus no menu lateral (decisão 43): a aba vem de ?aba=. */}
      <Tabs value={abaValida}>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardModulo modulo={modulo} />
        </TabsContent>
        <TabsContent value="estoque" className="mt-5">
          {/* No EPI e nos Uniformes o Estoque é só consulta (decisões 329 e 374): novos e usados, com os filtros e a compra de origem. */}
          {modulo === "epi" || modulo === "uniforme" ? <EstoqueEpiModulo modulo={modulo} /> : <EstoqueModulo modulo={modulo} />}
        </TabsContent>
        <TabsContent value="ocorrencias" className="mt-5">
          <OcorrenciasModulo modulo={modulo} />
        </TabsContent>

        {modulo === "ferramenta" && (
          <>
            <TabsContent value="entrada-estoque" className="mt-5">
              <MovimentacoesModulo modulo={modulo} foco="entrada" />
            </TabsContent>
            <TabsContent value="entrega" className="mt-5">
              <MovimentacoesModulo modulo={modulo} foco="entrega" />
            </TabsContent>
          </>
        )}

        {modulo === "uniforme" && (
          <>
            <TabsContent value="compras" className="mt-5">
              <UniformesComprasModulo />
            </TabsContent>
            <TabsContent value="sugestao-compras" className="mt-5">
              <SugestaoComprasEpi modulo="uniforme" />
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
            <TabsContent value="sugestao-compras" className="mt-5">
              <SugestaoComprasEpi />
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
            <TabsContent value="ordem-servico" className="mt-5">
              <EpiOrdemServico />
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
            <TabsContent value="sugestao-compras" className="mt-5">
              <FerramentasSugestaoCompras />
            </TabsContent>
            <TabsContent value="historico" className="mt-5">
              <UniformesRelatorioFuncionario modulo="ferramenta" />
            </TabsContent>
            <TabsContent value="baixas" className="mt-5">
              <UniformesRelatorioBaixa modulo="ferramenta" />
            </TabsContent>
            <TabsContent value="ferramentas-por-caixa" className="mt-5">
              <FerramentasPorCaixas />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
