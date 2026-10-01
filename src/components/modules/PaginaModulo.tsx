import { DashboardModulo } from "@/components/modules/DashboardModulo";
import { CadastroProduto } from "@/components/modules/CadastroProduto";
import { MovimentacoesModulo } from "@/components/modules/MovimentacoesModulo";
import { UniformesComprasModulo } from "@/components/modules/UniformesComprasModulo";
import { UniformesRelatorioFuncionario } from "@/components/modules/UniformesRelatorioFuncionario";
import { UniformesRelatorioBaixa } from "@/components/modules/UniformesRelatorioBaixa";
import { UniformesTermoEntrega } from "@/components/modules/UniformesTermoEntrega";
import { UniformesTermoBaixa } from "@/components/modules/UniformesTermoBaixa";
import { EpiComprasModulo } from "@/components/modules/EpiComprasModulo";
import { EpiRelatorioFuncionario } from "@/components/modules/EpiRelatorioFuncionario";
import { EpiRelatorioBaixa } from "@/components/modules/EpiRelatorioBaixa";
import { EpiTermoEntrega } from "@/components/modules/EpiTermoEntrega";
import { EpiFichaEpiAvulsa } from "@/components/modules/EpiFichaEpiAvulsa";
import { FerramentasCaixasModulo } from "@/components/modules/FerramentasCaixasModulo";
import { FerramentasTermoResponsabilidade } from "@/components/modules/FerramentasTermoResponsabilidade";
import { FerramentasTermoEncerramento } from "@/components/modules/FerramentasTermoEncerramento";
import { FerramentasTermoVistoria } from "@/components/modules/FerramentasTermoVistoria";
import { OcorrenciasModulo } from "@/components/modules/OcorrenciasModulo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Modulo } from "@/lib/gemape";

export function PaginaModulo({
  modulo,
  titulo,
  descricao,
}: {
  modulo: Modulo;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden bg-transparent p-0 scrollbar-none">
          <div className="flex flex-nowrap gap-1">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Dashboard
            </TabsTrigger>

            {modulo === "epi" ? (
              <>
                <TabsTrigger
                  value="compras"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Compras
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Histórico do empregado
                </TabsTrigger>
                <TabsTrigger
                  value="cadastro"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Estoque
                </TabsTrigger>
                <TabsTrigger
                  value="baixas"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Baixar Definitivas
                </TabsTrigger>
                <TabsTrigger
                  value="termo-entrega"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Termo de Entrega
                </TabsTrigger>
                <TabsTrigger
                  value="ficha-avulsa"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Ficha de EPI Avulsa
                </TabsTrigger>
              </>
            ) : modulo === "ferramenta" ? (
              <>
                <TabsTrigger
                  value="caixas"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Número da caixa
                </TabsTrigger>
                <TabsTrigger
                  value="termo-responsabilidade"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Termo de responsabilidade individual
                </TabsTrigger>
                <TabsTrigger
                  value="termo-encerramento"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Termo de encerramento responsabilidade
                </TabsTrigger>
                <TabsTrigger
                  value="termo-vistoria"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Termo de vistoria periódica
                </TabsTrigger>
                {/* O cadastro de ferramentas fica só em Cadastros > Ferramentas (decisão 24). */}
                <TabsTrigger
                  value="movimentacoes"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Movimentações
                </TabsTrigger>
              </>
            ) : (
              <>
                {/* O cadastro de uniformes fica só em Cadastros > Uniformes (decisão 25). */}
                <TabsTrigger
                  value="movimentacoes"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  Movimentações
                </TabsTrigger>

                {modulo === "uniforme" && (
                  <>
                    <TabsTrigger
                      value="compras"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                    >
                      Compras
                    </TabsTrigger>
                    <TabsTrigger
                      value="historico"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                    >
                      Histórico Empregado
                    </TabsTrigger>
                    <TabsTrigger
                      value="baixas"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                    >
                      Baixas Definitivas
                    </TabsTrigger>
                    <TabsTrigger
                      value="termo-entrega"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                    >
                      Termo de Entrega
                    </TabsTrigger>
                    <TabsTrigger
                      value="termo-baixa"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                    >
                      Termo de Baixa
                    </TabsTrigger>
                  </>
                )}
              </>
            )}
            <TabsTrigger
              value="ocorrencias"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
            >
              Ocorrências
            </TabsTrigger>
          </div>
        </TabsList>
        <TabsContent value="dashboard" className="mt-5">
          <DashboardModulo modulo={modulo} />
        </TabsContent>
        <TabsContent value="cadastro" className="mt-5">
          {/* Aba Estoque do EPI: o cadastro da especificação rev1, o mesmo de Cadastros. */}
          {modulo === "epi" ? <CadastroProduto tabela="epis" /> : null}
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
