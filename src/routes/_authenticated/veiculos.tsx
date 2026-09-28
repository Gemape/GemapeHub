import { createFileRoute } from "@tanstack/react-router";
import { Car, Wrench, CircleSlash } from "lucide-react";
import { useState } from "react";

import { MovimentacoesModulo } from "@/components/modules/MovimentacoesModulo";
import { OcorrenciasModulo } from "@/components/modules/OcorrenciasModulo";
import { VeiculosCadastroModulo } from "@/components/modules/VeiculosCadastroModulo";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/lib/empresa-context";
import { useVeiculos } from "@/lib/hooks-gemape";

export const Route = createFileRoute("/_authenticated/veiculos")({
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
  const { empresaId } = useEmpresa();
  const { data: veiculos = [] } = useVeiculos(empresaId);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">Veículos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Frota do grupo com placa, RENAVAM, quilometragem, responsável e registro de ocorrências.
        </p>
      </header>

      <Tabs defaultValue="frota">
        <TabsList>
          <TabsTrigger value="frota">Frota</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações e manutenções</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
        </TabsList>

        <TabsContent value="frota" className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              titulo="Ativos"
              valor={veiculos.filter((v) => v.status === "Ativo").length}
              icone={Car}
            />
            <StatCard
              titulo="Em manutenção"
              valor={veiculos.filter((v) => v.status === "Em Manutenção").length}
              icone={Wrench}
            />
            <StatCard
              titulo="Inativos"
              valor={veiculos.filter((v) => v.status === "Inativo").length}
              icone={CircleSlash}
            />
          </div>

          <VeiculosCadastroModulo />
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-5">
          <MovimentacoesModulo modulo="veiculo" />
        </TabsContent>
        <TabsContent value="ocorrencias" className="mt-5">
          <OcorrenciasModulo modulo="veiculo" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
