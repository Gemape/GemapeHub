import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lerTodas } from "@/lib/ler-todas";
import { caixasHabilitadas } from "@/lib/caixas-habilitadas";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { formatarData } from "@/lib/gemape";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { useCaixasFerramentas, type Empregado } from "@/lib/hooks-gemape";
import { empregadoElegivelPortador, portadorAtivo, registrarPortador } from "@/lib/portadores-caixa";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { usePortadoresCaixa } from "@/lib/use-portadores-caixa";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function PortadoresCaixaModulo() {
  const { empresas, empresaId } = useEmpresa();
  const { data: todasCaixas = [] } = useCaixasFerramentas(TODAS);
  const habilitadas = useParametrosBase().caixasHabilitadas;
  const caixas = caixasHabilitadas(todasCaixas, habilitadas)
    .filter((caixa) => empresaId === TODAS || caixa.empresa_id === empresaId);
  const historico = usePortadoresCaixa();
  const { data: empregados = [] } = useQuery({
    queryKey: ["empregados-portadores"],
    queryFn: async () => {
      return lerTodas<Empregado>(() => supabase.from("empregados").select("*"), (q) => q.order("id"));
    },
  });
  const [caixaId, setCaixaId] = useState("");
  const [empregadoId, setEmpregadoId] = useState("");
  const [status, setStatus] = useState<"Ativa" | "Inativa">("Ativa");
  const [observacao, setObservacao] = useState("");
  const [buscaEmpregado, setBuscaEmpregado] = useState("");
  const [buscaHistorico, setBuscaHistorico] = useState("");
  const [pendente, setPendente] = useState(false);
  const salvando = useRef(false);

  const caixa = caixas.find((item) => item.id === caixaId);
  const atual = caixa ? portadorAtivo(historico, caixa.id) : null;
  const pessoasDaEmpresa = empregados.filter((pessoa) =>
    pessoa.empresa_id === caixa?.empresa_id && empregadoElegivelPortador(pessoa));
  const termos = normalizar(buscaEmpregado).split(/\s+/).filter(Boolean);
  const encontrados = pessoasDaEmpresa.filter((pessoa) => {
    const texto = normalizar(`${pessoa.nome} ${pessoa.matricula ?? ""}`);
    return termos.every((termo) => texto.includes(termo));
  });
  const historicoVisivel = historico.filter((registro) => {
    if (empresaId !== TODAS && registro.empresa_id !== empresaId) return false;
    const texto = normalizar(`${registro.caixa_codigo} ${registro.empregado_nome} ${registro.observacao}`);
    return normalizar(buscaHistorico).split(/\s+/).filter(Boolean).every((termo) => texto.includes(termo));
  }).slice().reverse();

  function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    setPendente(true);
    try {
      if (!caixa) throw new Error("Selecione uma caixa habilitada.");
      const empregado = status === "Ativa" ? empregados.find((pessoa) => pessoa.id === empregadoId) ?? null : null;
      registrarPortador({ caixa, empregado, habilitadas, status, observacao: capitalizarTexto(observacao) });
      setCaixaId("");
      setEmpregadoId("");
      setBuscaEmpregado("");
      setObservacao("");
      setStatus("Ativa");
      toast.success(status === "Ativa" ? "Portador registrado." : "Portador inativado.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o portador.");
    } finally {
      salvando.current = false;
      setPendente(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={salvar} className="panel space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Cadastrar portador</h2>
          <p className="text-sm text-muted-foreground">Uma troca encerra o portador anterior e mantém o histórico da caixa.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portador-caixa">Número da caixa habilitada</Label>
            <Select value={caixaId} onValueChange={(valor) => { setCaixaId(valor); setEmpregadoId(""); }}>
              <SelectTrigger id="portador-caixa"><SelectValue placeholder="Selecione a caixa" /></SelectTrigger>
              <SelectContent>
                {caixas.map((item) => <SelectItem key={item.id} value={item.id}>{item.codigo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portador-status">Status</Label>
            <Select value={status} onValueChange={(valor: "Ativa" | "Inativa") => setStatus(valor)}>
              <SelectTrigger id="portador-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativa">Ativa</SelectItem>
                <SelectItem value="Inativa">Inativa (encerrar portador atual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status === "Ativa" ? <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="busca-portador">Empregado portador — busca por palavra-chave</Label>
            <Input id="busca-portador" value={buscaEmpregado} onChange={(e) => { setBuscaEmpregado(e.target.value); setEmpregadoId(""); }} placeholder="Nome ou matrícula" disabled={!caixa} />
            <Select value={empregadoId} onValueChange={setEmpregadoId}>
              <SelectTrigger aria-label="Empregado portador"><SelectValue placeholder="Selecione o empregado" /></SelectTrigger>
              <SelectContent>
                {encontrados.map((pessoa) => <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div> : <div className="space-y-1.5 sm:col-span-2">
            <Label>Portador atual</Label>
            <Input readOnly value={atual?.empregado_nome ?? "Nenhum portador ativo"} />
          </div>}
          {atual && status === "Ativa" && <p className="text-sm text-muted-foreground sm:col-span-2">Portador atual: {atual.empregado_nome}. A troca o encerrará no histórico.</p>}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="portador-observacao">Observação</Label>
            <Textarea id="portador-observacao" capitalizar="texto" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <Button requiresWrite type="submit" disabled={pendente}>{status === "Ativa" ? "Salvar portador" : "Inativar portador"}</Button>
      </form>

      <section className="panel space-y-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-semibold">Histórico de portadores</h2><p className="text-sm text-muted-foreground">Todos os registros das caixas desta empresa, inclusive caixas não habilitadas atualmente.</p></div>
          <BarraDeFiltros>
            <Input className="max-w-xs" value={buscaHistorico} onChange={(e) => setBuscaHistorico(e.target.value)} placeholder="Buscar caixa ou empregado" />
          </BarraDeFiltros>
        </div>
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Caixa</TableHead><TableHead>Empresa</TableHead><TableHead>Empregado</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Status</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
          <TableBody>{historicoVisivel.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum portador registrado.</TableCell></TableRow> : historicoVisivel.map((registro) => <TableRow key={registro.id}>
            <TableCell className="font-mono">{registro.caixa_codigo}</TableCell>
            <TableCell>{empresas.find((empresa) => empresa.id === registro.empresa_id)?.nome_fantasia ?? registro.empresa_id}</TableCell>
            <TableCell>{registro.empregado_nome}</TableCell>
            <TableCell>{formatarData(registro.data_inicio)}</TableCell>
            <TableCell>{formatarData(registro.data_fim)}</TableCell>
            <TableCell>{registro.status}</TableCell>
            <TableCell>{registro.observacao || "—"}</TableCell>
          </TableRow>)}</TableBody>
        </Table></div>
      </section>
    </div>
  );
}
