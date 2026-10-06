import { Car, CircleSlash, Wrench } from "lucide-react";
import { useState } from "react";

import { ExtratoVeiculo } from "@/components/modules/ExtratoVeiculo";
import { rotuloDoVeiculo } from "@/components/modules/rotulo-veiculo";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hojeLocal } from "@/lib/empregados";
import { useEmpresa } from "@/lib/empresa-context";
import { kmAtualDoVeiculo, sugestoesPreventivas } from "@/lib/extrato-veiculo";
import { useVeiculos } from "@/lib/hooks-gemape";
import { combinaBusca } from "@/lib/parametros-base";
import { normalizarPlaca } from "@/lib/veiculos";
import { useAbastecimentos, useManutencoesVeiculo, usePlanosVeiculo } from "@/lib/use-registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";

const STATUS: Record<string, string> = { Ativo: "Ativo", Manutencao: "Em manutenção", Inativo: "Inativo" };

// Módulos > Veículos > Frota (decisão 57): página inicial com a lista de veículos da empresa.
// Clicar num veículo abre o extrato. O cadastro continua em Parâmetros > Veículos.
export function FrotaModulo() {
  const { empresaId } = useEmpresa();
  const parametros = useParametrosBase();
  const { data: veiculos = [], isLoading } = useVeiculos(empresaId);
  const abastecimentos = useAbastecimentos();
  const manutencoes = useManutencoesVeiculo();
  const planos = usePlanosVeiculo();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const hoje = hojeLocal();

  const lista = veiculos.filter((v) =>
    combinaBusca(busca.replace(/-/g, ""), rotuloDoVeiculo(parametros, v), normalizarPlaca(v.placa ?? ""), v.marca, v.modelo),
  );
  const vencidasDo = (id: string) => {
    const abast = abastecimentos.filter((a) => a.veiculoId === id);
    const manut = manutencoes.filter((m) => m.veiculoId === id);
    const v = veiculos.find((x) => x.id === id);
    return sugestoesPreventivas({
      plano: planos.find((p) => p.veiculoId === id) ?? null,
      acoes: parametros.acoesManutencaoVeiculo,
      manutencoes: manut,
      kmAtual: kmAtualDoVeiculo(v?.quilometragem_atual ?? 0, abast, manut),
      hoje,
    }).filter((s) => s.status === "vencida").length;
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Ativos" valor={veiculos.filter((v) => v.status === "Ativo").length} icone={Car} />
        <StatCard titulo="Em manutenção" valor={veiculos.filter((v) => v.status === "Manutencao").length} icone={Wrench} />
        <StatCard titulo="Inativos" valor={veiculos.filter((v) => v.status === "Inativo").length} icone={CircleSlash} />
      </div>
      <Input
        aria-label="Buscar veículo por placa, marca ou modelo"
        placeholder="Buscar por placa, marca ou modelo"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-md"
      />
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veículo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Km atual</TableHead>
              <TableHead>Preventivas</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && lista.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum veículo encontrado.</TableCell></TableRow>
            )}
            {lista.map((v) => {
              const vencidas = vencidasDo(v.id);
              const km = kmAtualDoVeiculo(
                v.quilometragem_atual,
                abastecimentos.filter((a) => a.veiculoId === v.id),
                manutencoes.filter((m) => m.veiculoId === v.id),
              );
              return (
                <TableRow key={v.id} className="cursor-pointer" onClick={() => setAberto(v.id)}>
                  <TableCell className="font-medium">{rotuloDoVeiculo(parametros, v)}</TableCell>
                  <TableCell><Badge variant="outline">{STATUS[v.status] ?? v.status}</Badge></TableCell>
                  <TableCell className="text-right">{km.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className={vencidas > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                    {vencidas > 0 ? `🔴 ${vencidas} vencida(s)` : "Sem vencidas"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAberto(v.id); }}>Ver extrato</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ExtratoVeiculo veiculo={veiculos.find((v) => v.id === aberto) ?? null} onFechar={() => setAberto(null)} />
    </div>
  );
}
