import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresasParaEscolha } from "@/lib/empresas";
import { lerAreasEpi, lerEmpregadosDeEpi, listaDeEpiDesatualizada, soEmpregadosDeEpi } from "@/lib/empregados-epi";
import { AvisoHabilitados } from "@/components/AvisoHabilitados";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados, useEmpresas } from "@/lib/hooks-gemape";
import { funcaoDaOrdem, funcaoDeHabilitado, montarOrdemServicoHtml, ordensDaFuncao } from "@/lib/ordem-servico-empregado-html";
import { useOrdensServicoEpi } from "@/lib/use-ordens-servico-epi";
import { abrirDocumento, nomeArquivoDocumento } from "@/lib/visualizador-documento";

// EPIs > Ordem de Serviço (decisão 387): a ordem sai por empregado, com os dados cadastrados em Parâmetros > EPI > Cadastrar Ordem de Serviço. A ordem sugerida é a da função do empregado
// (a área em que está habilitado em Parâmetros > EPI); quando não há ordem para ela, ou se quiser outra, a pessoa escolhe na lista.
export function EpiOrdemServico() {
  const { empresaId } = useEmpresa();
  // Vindo da volta do cadastro da ordem (vai e volta, decisão 388), a escolha de antes e a ordem recém-cadastrada já vêm marcadas.
  const volta = useSearch({ strict: false }) as { empresa?: string; empregado?: string; ordem?: string; funcao?: string };
  const [empresaSel, setEmpresaSel] = useState(volta.empresa ?? (empresaId !== TODAS ? empresaId : ""));
  const [empregadoId, setEmpregadoId] = useState(volta.empregado ?? "");
  const [ordemEscolhida, setOrdemEscolhida] = useState(volta.ordem ?? "");
  // Empregado fora da lista de habilitados não tem função cadastrada: a função é informada na hora.
  const [funcaoInformada, setFuncaoInformada] = useState(volta.funcao ?? "");
  const ordens = useOrdensServicoEpi();
  const { data: empresas = [] } = useEmpresas();
  const { data: empregados = [] } = useEmpregados(empresaSel || TODAS);
  useEffect(() => {
    if (empresas.length > 0 && empresaSel && !empresasParaEscolha(empresas).some((e) => e.id === empresaSel)) setEmpresaSel("");
  }, [empresas, empresaSel]);
  // O endereço acompanha a escolha (sem criar histórico), para recarregar a página ou ir ao cadastro e voltar não perder o que está marcado.
  const navegar = useNavigate();
  useEffect(() => {
    void navegar({ to: "/epi", search: { aba: "ordem-servico", ...(empresaSel ? { empresa: empresaSel } : {}), ...(empregadoId ? { empregado: empregadoId } : {}), ...(funcaoInformada ? { funcao: funcaoInformada } : {}), ...(ordemEscolhida ? { ordem: ordemEscolhida } : {}) }, replace: true });
  }, [empresaSel, empregadoId, funcaoInformada, ordemEscolhida, navegar]);
  // Só os ativos são oferecidos (como nas demais telas): o aviso e a caixa de empregados usam a mesma lista.
  const ativos = empregados.filter((e) => empregadoAtivo(e));
  const empregado = empregados.find((e) => e.id === empregadoId);
  const empresa = empresas.find((e) => e.id === empresaSel);
  // A função é a área em que ele está habilitado, achada pelo id e, para quem entrou na lista sem vínculo, pelo nome.
  const area = useMemo(() => funcaoDeHabilitado(lerEmpregadosDeEpi(), empregado), [empregado]);
  const funcao = funcaoDaOrdem(area, funcaoInformada);
  const daFuncao = ordensDaFuncao(ordens, funcao);
  const habilitadosDesatualizados = !!empresaSel && listaDeEpiDesatualizada(ativos);
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
            <Link
              to="/epi-ordem-servico"
              search={{ voltar: "ordem-servico", nova: "sim", ...(empresaSel ? { empresa: empresaSel } : {}), ...(empregadoId ? { empregado: empregadoId } : {}), ...(funcao ? { funcao } : {}) }}
              className="font-medium text-primary underline underline-offset-2"
            >Parâmetros &gt; EPI &gt; Cadastrar Ordem de Serviço</Link>.
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
            <Select value={empregadoId} onValueChange={(v) => { setEmpregadoId(v); setOrdemEscolhida(""); setFuncaoInformada(""); }}>
              <SelectTrigger id="os-empregado"><SelectValue placeholder="Selecione o empregado" /></SelectTrigger>
              <SelectContent>{soEmpregadosDeEpi(ativos).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <AvisoHabilitados desatualizada={habilitadosDesatualizados} onde="Parâmetros &gt; EPI &gt; Parâmetros Específicos" />
          {empregado && !area && (
            <div className="space-y-1.5">
              <Label htmlFor="os-funcao">Função do empregado</Label>
              <Select value={funcaoInformada} onValueChange={(v) => { setFuncaoInformada(v); setOrdemEscolhida(""); }}>
                <SelectTrigger id="os-funcao"><SelectValue placeholder="Informe a função dele" /></SelectTrigger>
                <SelectContent>{lerAreasEpi().map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Ele não está habilitado em nenhuma função em Parâmetros &gt; EPI: informe a função para a ordem sugerida.</p>
            </div>
          )}
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
                    ? `Sugerida pela função do empregado${funcao ? ` (${funcao})` : ""}.`
                    : funcao
                      ? `Não há ordem cadastrada para a função ${funcao}. Escolha uma das ordens da lista.`
                      : "Informe a função do empregado acima ou escolha uma das ordens da lista."}
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
