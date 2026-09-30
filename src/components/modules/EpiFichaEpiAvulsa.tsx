import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { useEmpresas, useItens, useEmpregados, useMovimentacoes } from "@/lib/hooks-gemape";

export function EpiFichaEpiAvulsa() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");

  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("epi", TODAS);
  const { data: movimentacoes = [] } = useMovimentacoes("epi", TODAS, 1000);

  const historico = movimentacoes.filter((m) => m.empregado_id === empregadoId);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);

  function gerarFicha() {
    if (!empregado || !empresa) {
      alert("Selecione um empregado.");
      return;
    }

    const linhasHtml = historico
      .map((h, index) => {
        const itemInfo = itens.find((i) => i.id === h.item_id);
        return `
        <tr>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${formatarData(h.data_movimentacao)}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${h.quantidade}</td>
          <td style="border: 1px solid #000; padding: 5px;">${itemInfo?.nome || "—"}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${itemInfo?.ca || "—"}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: center;">${h.tipo_movimentacao === "Saida" ? "ENTREGA" : "DEVOLUÇÃO"}</td>
          <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
        </tr>
      `;
      })
      .join("");

    // Add empty rows to fill the page
    const emptyRows = Array.from({ length: Math.max(0, 15 - historico.length) })
      .map(
        () => `
      <tr>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
        <td style="border: 1px solid #000; padding: 5px; height: 30px;"></td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Ficha de EPI - ${empregado.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.2; padding: 20px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .header-table td { border: 1px solid #000; padding: 10px; }
            .title { text-align: center; font-weight: bold; font-size: 14pt; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { border: 1px solid #000; padding: 5px; }
            .main-table { width: 100%; border-collapse: collapse; }
            .main-table th { border: 1px solid #000; padding: 5px; background-color: #eee; }
            .main-table td { border: 1px solid #000; padding: 5px; }
            .footer { margin-top: 20px; font-size: 8pt; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 20%; text-align: center;"><strong>LOGO</strong></td>
              <td class="title">FICHA DE CONTROLE DE ENTREGA DE EPI</td>
              <td style="width: 20%; text-align: center;">Rev. 00</td>
            </tr>
          </table>

          <table class="info-table">
            <tr>
              <td colspan="2"><strong>Empresa:</strong> ${empresa.razao_social}</td>
              <td><strong>CNPJ:</strong> ${empresa.cnpj}</td>
            </tr>
            <tr>
              <td style="width: 60%;"><strong>Nome do Funcionário:</strong> ${empregado.nome}</td>
              <td><strong>CPF:</strong> ${empregado.cpf}</td>
              <td><strong>Matrícula:</strong> ${empregado.matricula || "—"}</td>
            </tr>
            <tr>
              <td><strong>Admissão:</strong> ${empregado.data_admissao ? formatarData(empregado.data_admissao) : "—"}</td>
              <td colspan="2"><strong>Setor:</strong> Operacional</td>
            </tr>
          </table>

          <p style="font-size: 8pt; text-align: justify; margin-bottom: 15px;">
            Declaro que recebi da empresa os Equipamentos de Proteção Individual (EPI) adequados ao risco de minha atividade, em perfeitas condições de uso, e que fui treinado quanto ao seu uso correto. Comprometo-me a utilizá-los apenas para a finalidade a que se destinam e a devolvê-los quando solicitado ou no desligamento da empresa.
          </p>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 12%;">Data</th>
                <th style="width: 8%;">Qtd</th>
                <th>Descrição do EPI</th>
                <th style="width: 10%;">CA</th>
                <th style="width: 15%;">Tipo</th>
                <th style="width: 25%;">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
              ${emptyRows}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Norma Regulamentadora 06 (NR-06):</strong> Cabe ao empregado utilizar o EPI apenas para a finalidade a que se destina, responsabilizar-se pela guarda e conservação, e comunicar ao empregador qualquer alteração que o torne impróprio para uso.</p>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Imprimir Ficha</button>
          </div>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Gerar Ficha de EPI (Avulsa/Empregado)</h3>
          <p className="text-sm text-muted-foreground">
            Selecione o funcionário para gerar a ficha de controle de EPI completa com o histórico
            de movimentações.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Empregado</Label>
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empregado" />
              </SelectTrigger>
              <SelectContent>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={gerarFicha} disabled={!empregadoId} className="w-full sm:w-auto">
            Gerar Ficha para Impressão
          </Button>
        </div>
      </div>
    </div>
  );
}
