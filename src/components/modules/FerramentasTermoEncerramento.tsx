import { useRef, useState, useEffect } from "react";
import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { escaparHtml } from "@/lib/gemape";
import { BOTAO_IMPRIMIR, CSS_TERMO, cabecalhoRelatorio, paginaRelatorio } from "@/lib/relatorio-padrao";
import { capitalizarTexto, formatarCnpj } from "@/lib/formatacao-cadastral";
import {
  useEmpresas,
  useItens,
  useEmpregados,
  useRegistrarMovimentacoesLote,
} from "@/lib/hooks-gemape";
import { bloqueioPorDemissao, hojeLocal } from "@/lib/empregados";
import { lerSaldosSobResponsabilidade, validarEncerramento } from "@/lib/encerramento-ferramentas";
import { caixaDaUltimaEntrega } from "@/lib/controle-caixa";
import { lerMovimentacoesRelatorio } from "@/lib/relatorios-historico";
import { MODO_DEMO } from "@/lib/modo-demo";

interface ItemEncerramento {
  id: string;
  item_id: string;
  quantidade: number;
  estado: string;
  observacao: string;
}

export function FerramentasTermoEncerramento() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState(hojeLocal());
  const [itensEncerramento, setItensEncerramento] = useState<ItemEncerramento[]>([]);

  const { data: empresas = [] } = useEmpresas();
  // Empresa inativa não é escolhida: se o cabeçalho está nela, a escolha começa vazia.
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  const { data: itens = [] } = useItens("ferramenta", TODAS);

  const registrarDevolucoes = useRegistrarMovimentacoesLote([
    "movimentacoes",
    "ferramentas",
    "saidas-por-item",
  ]);
  const salvando = useRef(false);

  // Saldo ainda sob responsabilidade do empregado, por ferramenta, nesta empresa.
  const [saldos, setSaldos] = useState<Map<string, number>>(new Map());
  const itensComSaldo = itens.filter((i) => saldos.has(i.id));

  function trocarEmpresa(valor: string) {
    setEmpresaSel(valor);
    setEmpregadoId("");
    setSaldos(new Map());
    setItensEncerramento([]);
  }

  function trocarEmpregado(valor: string) {
    setEmpregadoId(valor);
    setSaldos(new Map());
    setItensEncerramento([]);
  }

  async function carregarHistoricoEmpregado() {
    if (!empresaSel || !empregadoId) {
      alert("Selecione a empresa e o empregado.");
      return;
    }
    let saldos: Map<string, number>;
    try {
      saldos = await lerSaldosSobResponsabilidade(supabase, { empregadoId, empresaId: empresaSel });
    } catch (erro) {
      alert(`Não foi possível carregar o histórico: ${(erro as Error).message}`);
      return;
    }
    setSaldos(saldos);
    if (saldos.size === 0) {
      alert("Nenhuma ferramenta está sob responsabilidade deste empregado nesta empresa.");
      setItensEncerramento([]);
      return;
    }

    // Carrega cada ferramenta com o saldo que o empregado ainda deve devolver.
    setItensEncerramento(
      Array.from(saldos, ([itemId, saldo]) => ({
        id: crypto.randomUUID(),
        item_id: itemId,
        quantidade: saldo,
        estado: "Usado",
        observacao: "",
      })),
    );
  }

  function adicionarItem() {
    setItensEncerramento([
      ...itensEncerramento,
      {
        id: crypto.randomUUID(),
        item_id: "",
        quantidade: 1,
        estado: "Usado",
        observacao: "",
      },
    ]);
  }

  function removerItem(id: string) {
    setItensEncerramento(itensEncerramento.filter((i) => i.id !== id));
  }

  function atualizarItem(id: string, campo: keyof ItemEncerramento, valor: string | number) {
    setItensEncerramento(
      itensEncerramento.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)),
    );
  }

  async function gerarTermo() {
    if (salvando.current) return;
    if (!empresaSel || !empregadoId) {
      alert("Selecione a empresa e o empregado.");
      return;
    }

    const empregado = empregados.find((e) => e.id === empregadoId);
    const empresa = empresas.find((e) => e.id === empresaSel);
    const bloqueio = bloqueioPorDemissao(empregado, "encerramento", dataEncerramento);
    if (bloqueio) {
      alert(bloqueio);
      return;
    }

    if (!empregado || !empresa) return;

    // Registra todas as devoluções de uma vez: ou entram todas, ou nenhuma.
    salvando.current = true;
    try {
      // Só devolve o saldo ainda sob responsabilidade dele, e uma única vez. O saldo é relido
      // na hora de gravar, para não aceitar de novo um termo que acabou de ser registrado.
      let saldosAtuais: Map<string, number>;
      try {
        saldosAtuais = await lerSaldosSobResponsabilidade(supabase, {
          empregadoId,
          empresaId: empresaSel,
        });
      } catch (erroLeitura) {
        alert(`Não foi possível conferir o saldo: ${(erroLeitura as Error).message}`);
        return;
      }
      setSaldos(saldosAtuais);
      const erro = validarEncerramento(itensEncerramento, saldosAtuais, dataEncerramento);
      if (erro) {
        alert(erro);
        return;
      }
      // A devolução volta para a caixa da última entrega da ferramenta a este empregado (decisão 103).
      let entregas: Awaited<ReturnType<typeof lerMovimentacoesRelatorio>> = [];
      if (MODO_DEMO) {
        try {
          entregas = await lerMovimentacoesRelatorio(supabase, { modulo: "ferramenta", empresaId: empresaSel, empregadoId });
        } catch (erroLeitura) {
          alert(`Não foi possível conferir as entregas: ${(erroLeitura as Error).message}`);
          return;
        }
      }
      await registrarDevolucoes.mutateAsync(
        itensEncerramento.map((item) => ({
          modulo: "ferramenta",
          tipo_movimentacao: "Devolucao",
          quantidade: item.quantidade,
          data_movimentacao: dataEncerramento,
          item_id: item.item_id,
          empresa_id: empresaSel,
          empregado_id: empregadoId,
          tipo_vistoria: "Final (Desligamento)",
          ...(MODO_DEMO ? { caixa_id: caixaDaUltimaEntrega(entregas, empregadoId, item.item_id) } : {}),
          observacao: `Devolução de ferramenta - Termo de Encerramento de Responsabilidade. Obs: ${capitalizarTexto(item.observacao)}`,
        })),
      );
    } catch {
      // A falha já aparece no aviso da gravação.
      return;
    } finally {
      salvando.current = false;
    }
    const itensDoTermo = itensEncerramento;
    setItensEncerramento([]);
    setSaldos(new Map());

    const itensHtml = itensDoTermo
      .map((it, index) => {
        const itemInfo = itens.find((i) => i.id === it.item_id);
        return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${escaparHtml(itemInfo?.codigo_sku || "—")}</td>
          <td>${escaparHtml(itemInfo?.nome || "—")}</td>
          <td style="text-align: center;">${it.quantidade}</td>
          <td>${escaparHtml(it.estado)}</td>
          <td>${escaparHtml(it.observacao || "OK")}</td>
        </tr>
      `;
      })
      .join("");

    // Meio-dia local evita que a data em UTC caia no dia anterior.
    const dataObj = new Date(`${dataEncerramento}T12:00:00`);
    const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = paginaRelatorio({
      titulo: `Termo de Encerramento de Responsabilidade - ${empregado.nome}`,
      cabecalho: cabecalhoRelatorio({ titulo: "Termo de Encerramento de Responsabilidade", subtitulos: [`CNPJ: ${formatarCnpj(empresa.cnpj)}`], empresa: empresa.razao_social }),
      css: CSS_TERMO,
      corpo: `<div class="termo">
          <div class="content">
            <p>Pelo presente instrumento, a empresa <strong>${escaparHtml(empresa.razao_social)}</strong> declara que o(a) empregado(a) <strong>${escaparHtml(empregado.nome)}</strong>, CPF <strong>${escaparHtml(empregado.cpf)}</strong>, efetuou nesta data a devolução das ferramentas e equipamentos abaixo relacionados, que estavam sob sua responsabilidade conforme termo assinado anteriormente.</p>
            
            <p>Após conferência, atesta-se que os itens foram devolvidos conforme o estado de conservação indicado na tabela abaixo, dando-se por encerrada a responsabilidade individual do referido empregado sobre os mesmos.</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Qtd</th>
                <th>Estado</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
          
          <div class="content">
            <p>Este termo refere-se apenas aos itens listados, não eximindo o empregado de responsabilidades sobre outros ativos que possam estar em seu poder e que não constem desta relação.</p>
          </div>
          
          <p style="text-align: right; margin-top: 30px;">Local e data: ____________________, ${dataFormatada}</p>
          
          <div class="signatures">
            <div class="sig-box">
              Assinatura do Empregado
            </div>
            <div class="sig-box">
              Assinatura do Responsável
            </div>
          </div>
        </div>`,
      botao: BOTAO_IMPRIMIR("Imprimir Termo"),
    });

    abrirDocumento({
      titulo: "Termo de Encerramento",
      html,
      arquivo: nomeArquivoDocumento("Termo de Encerramento", empregado?.nome, dataEncerramento),
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Empresa</Label>
            <Select value={empresaSel} onValueChange={trocarEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresasParaEscolha(empresas).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome_fantasia}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-4">
            <Label>Empregado</Label>
            <Select value={empregadoId} onValueChange={trocarEmpregado}>
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
          <div className="lg:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={carregarHistoricoEmpregado}
              className="w-full"
            >
              Carregar Histórico
            </Button>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <Label>Data de Encerramento</Label>
            <Input
              type="date"
              value={dataEncerramento}
              onChange={(e) => setDataEncerramento(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-bold">Ferramentas Devolvidas</Label>
            <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
              + Adicionar Ferramenta
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead className="w-24">Qtd</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead>Observação/Avaria</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensEncerramento.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum item carregado.
                    </TableCell>
                  </TableRow>
                ) : (
                  itensEncerramento.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Select
                          value={it.item_id}
                          onValueChange={(v) => atualizarItem(it.id, "item_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {itensComSaldo.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.nome}{sufixoTamanhoFerramenta(i)} ({i.codigo_sku}) · saldo {saldos.get(i.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max={saldos.get(it.item_id) ?? undefined}
                          value={it.quantidade}
                          onChange={(e) =>
                            atualizarItem(it.id, "quantidade", Number(e.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={it.estado}
                          onValueChange={(v) => atualizarItem(it.id, "estado", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Novo">Novo</SelectItem>
                            <SelectItem value="Usado">Usado</SelectItem>
                            <SelectItem value="Danificado">Danificado</SelectItem>
                            <SelectItem value="Extraviado">Extraviado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          capitalizar="texto"
                          value={it.observacao}
                          onChange={(e) => atualizarItem(it.id, "observacao", e.target.value)}
                          placeholder="Ex: Riscos leves"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerItem(it.id)}
                          className="text-red-500"
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button requiresWrite="operar" onClick={gerarTermo} disabled={registrarDevolucoes.isPending}>
            Gerar Termo de Encerramento
          </Button>
        </div>
      </div>
    </div>
  );
}
