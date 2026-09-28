import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { exportarCsv } from "@/lib/gemape";
import {
  useItens,
  useEmpresas,
  useCaixasFerramentas,
  useCaixaItens,
  type CaixaFerramenta,
} from "@/lib/hooks-gemape";
import { Button } from "@/components/ui/button";

type CaixaComResponsavel = CaixaFerramenta & { responsavel?: { nome: string } };

export function FerramentasCaixasModulo() {
  const { empresaId } = useEmpresa();
  const [buscaCaixa, setBuscaCaixa] = useState("");

  const { data: caixas = [], isLoading } = useCaixasFerramentas(empresaId, buscaCaixa);
  const { data: empresas = [] } = useEmpresas();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filtrar por nome ou código da caixa..."
          className="max-w-xs"
          value={buscaCaixa}
          onChange={(e) => setBuscaCaixa(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : caixas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma caixa encontrada com os filtros aplicados.
          </div>
        ) : (
          caixas.map((caixa) => <CaixaItem key={caixa.id} caixa={caixa} empresas={empresas} />)
        )}
      </div>
    </div>
  );
}

function CaixaItem({
  caixa,
  empresas,
}: {
  caixa: CaixaComResponsavel;
  empresas: { id: string; nome_fantasia: string }[];
}) {
  const { data: itens = [], isLoading } = useCaixaItens(caixa.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <h3 className="text-lg font-black uppercase tracking-tight">
          {caixa.codigo}: {caixa.nome}
        </h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {itens.length} {itens.length === 1 ? "item" : "itens"}
        </span>
        {caixa.responsavel?.nome && (
          <span className="text-xs font-medium text-muted-foreground ml-2">
            Resp: {caixa.responsavel.nome}
          </span>
        )}
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Marca/Modelo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando itens...
                </TableCell>
              </TableRow>
            ) : itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Caixa vazia.
                </TableCell>
              </TableRow>
            ) : (
              itens.map((ci) => (
                <TableRow key={ci.id}>
                  <TableCell className="font-mono font-bold">{ci.ferramenta?.codigo_sku}</TableCell>
                  <TableCell>{ci.ferramenta?.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ci.ferramenta?.marca} {ci.ferramenta?.modelo && `/ ${ci.ferramenta.modelo}`}
                  </TableCell>
                  <TableCell>
                    {empresas.find((e) => e.id === ci.ferramenta?.empresa_id)?.nome_fantasia || "—"}
                  </TableCell>
                  <TableCell>{ci.quantidade}</TableCell>
                  <TableCell>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ci.ferramenta?.status === "Ativo"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {ci.ferramenta?.status || "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
