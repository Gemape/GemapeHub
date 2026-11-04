import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { lerEmpregadosDeEpi, soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { useEmpregados, useEmpresas } from "@/lib/hooks-gemape";
import { montarOrdemServicoHtml, ordensDaFuncao } from "@/lib/ordem-servico-empregado-html";
import { useOrdensServicoEpi } from "@/lib/use-ordens-servico-epi";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// EPIs > Ordem de Serviço (decisão 387): a ordem sai por empregado, com os dados cadastrados em Parâmetros > EPI > Cadastrar Ordem de Serviço. A ordem sugerida é a da função do empregado
// (a área em que está habilitado em Parâmetros > EPI); quando não há ordem para ela, ou se quiser outra, a pessoa escolhe na lista.
export function EpiOrdemServico() {
  const { empresaId } = useEmpresa();
  const [empresaSel, setEmpresaSel] = useState(empresaId !== TODAS ? empresaId : "");
  const [empregadoId, setEmpregadoId] = useState("");
  const [ordemEscolhida, setOrdemEscolhida] = useState("");
  const ordens = useOrdensServicoEpi();
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);
  const area = useMemo(() => lerEmpregadosDeEpi().find((h) => h.empregadoId === empregadoId)?.area ?? "", [empregadoId]);
  const daFuncao = ordensDaFuncao(ordens, area);
  const ordem = ordens.find((o) => o.id === ordemEscolhida) ?? daFuncao[0];

  function gerar() {
    if (!empregado || !empresa || !ordem) return;
    abrirDocumento({
      titulo: "Ordem de Serviço",
      html: montarOrdemServicoHtml({ ordem, empresa, empregado }),
      arquivo: nomeArquivoDocumento("Ordem de Servico", empregado.nome, ordem.funcao),
    });
  }

  return (
    <div className="space-y-6">
      <div className="panel mx-auto max-w-2xl space-y-6 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Gerar Ordem de Serviço do empregado</h3>
          <p className="text-sm text-muted-foreground">
            Escolha o empregado: a ordem é a da função dele, cadastrada em{" "}
            <Link to="/epi-ordem-servico" className="font-medium text-primary underline underline-offset-2">Parâmetros &gt; EPI &gt; Cadastrar Ordem de Serviço</Link>.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="os-empresa">Empresa</Label>
            <Select value={empresaSel} onValueChange={(v) => { if (!v) return; setEmpresaSel(v); setEmpregadoId(""); setOrdemEscolhida(""); }}>
              <SelectTrigger id="os-empresa"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>{empresasParaEscolha(empresas).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-empregado">Empregado</Label>
            <Select value={empregadoId} onValueChange={(v) => { setEmpregadoId(v); setOrdemEscolhida(""); }}>
              <SelectTrigger id="os-empregado"><SelectValue placeholder="Selecione o empregado" /></SelectTrigger>
              <SelectContent>{soEmpregadosDeEpi(empregados).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {empregado && (
            <div className="space-y-1.5">
              <Label htmlFor="os-ordem">Ordem de serviço</Label>
              <Select value={ordem?.id ?? ""} onValueChange={setOrdemEscolhida} disabled={ordens.length === 0}>
                <SelectTrigger id="os-ordem"><SelectValue placeholder={ordens.length === 0 ? "Nenhuma ordem cadastrada" : "Escolha a ordem"} /></SelectTrigger>
                <SelectContent>{ordens.map((o) => <SelectItem key={o.id} value={o.id}>{o.funcao} · {o.setor}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ordens.length === 0
                  ? "Cadastre a ordem de serviço em Parâmetros > EPI antes de gerar."
                  : daFuncao.length > 0
                    ? `Sugerida pela função do empregado${area ? ` (${area})` : ""}.`
                    : `${area ? `Não há ordem cadastrada para a função ${area}.` : "O empregado não está habilitado em nenhuma função em Parâmetros > EPI."} Escolha uma das ordens da lista.`}
              </p>
            </div>
          )}
        </div>
        <div className="flex pt-2">
          <Button onClick={gerar} disabled={!empregado || !ordem}>Gerar Ordem de Serviço</Button>
        </div>
      </div>
    </div>
  );
}
