import { marcarDestaque, useDestaque } from "@/lib/destaque-linha";
import { confirmarExclusao } from "@/components/ConfirmarAcao";
import { BarraCompletude } from "@/components/BarraCompletude";
import { CAMPOS_EMPREGADO } from "@/lib/completude";
import { AvisoSemelhantes } from "@/components/AvisoSemelhantes";
import { useAvisoNaoSalvo } from "@/lib/use-aviso-nao-salvo";
import { NomeComResumo } from "@/components/GavetaResumo";
import { GavetaEmpregado } from "@/components/modules/GavetasDeResumo";
import { avisarOutrasAbas } from "@/lib/sincronia-abas";
import { AvisoEdicaoSimultanea } from "@/components/AvisoEdicaoSimultanea";
import { validarCpfCampo, validarMatriculaCampo } from "@/lib/validacao-campos";
import { BlocoEsqueleto } from "@/components/Esqueletos";
import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SemResultadoBusca } from "@/components/SemResultadoBusca";
import { sugerirNome } from "@/lib/busca-tolerante";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import type { ReactNode } from "react";
import { useAbrirDireto } from "@/lib/use-abrir-direto";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import { exportarCsv, formatarData } from "@/lib/gemape";
import { camposDeBusca } from "@/lib/busca-cadastro";
import { empregadoAtivo, mascararCpf, prepararEmpregado, separarEmpregados } from "@/lib/empregados";
import { combinaBusca } from "@/lib/parametros-base";
import { RelatorioCadastro } from "@/components/RelatorioCadastro";
import type { CampoRelatorio } from "@/lib/relatorio-cadastro";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { DemitirEmpregadoDialog } from "./DemitirEmpregadoDialog";
import { PendenciasDeDesligamento } from "./PendenciasDeDesligamento";
import { abrirAlertaDeDesligamento, erroDoSupervisor, retirarAlertaDeDesligamento } from "@/lib/desligamento-pendencias";
import { hojeLocal } from "@/lib/empregados";
import { avisarComDesfazer } from "@/lib/toast-desfazer";
import { comDesligamento, lerConfig, salvarConfig } from "@/lib/configuracoes-demo";
import { usuarioAtivo } from "@/lib/permissoes-demo";
import { useEmpregados, useExcluir, useSalvar, type Empregado } from "@/lib/hooks-gemape";
import { lerTodas } from "@/lib/ler-todas";
import { ImportarEmpregados } from "@/components/modules/ImportarEmpregados";
import { ehExemplo } from "@/lib/dados-teste/exemplo-id";
import { exemploEmpregado } from "@/lib/dados-teste/exemplos";

// O e-mail ainda não existe na tabela real de empregados: nesta fase só é gravado no
// modo demonstração. A coluna entra na Fase 2.
const MODO_DEMO = import.meta.env["VITE_DEMO_MODE"] !== "false";

// O e-mail e o supervisor também só existem em modo demonstração por enquanto (colunas na Fase 2).
type EmpregadoCadastro = Empregado & { email?: string | null; supervisor_id?: string | null };


export function EmpregadosCadastroModulo({ direto = false, aoConcluir }: { direto?: boolean; aoConcluir?: () => void } = {}) {
  const { empresas, empresaId } = useEmpresa();
  const [aberto, setAberto] = useState(false);
  const [resumo, setResumo] = useState<EmpregadoCadastro | null>(null);
  const aviso = useAvisoNaoSalvo(aberto);
  const [editando, setEditando] = useState<EmpregadoCadastro | null>(null);
  // Clonar: dados do empregado de origem num cadastro NOVO (todos os campos copiados, decisão 138).
  const [modelo, setModelo] = useState<EmpregadoCadastro | null>(null);
  const base = editando ?? modelo;
  const [empresaSel, setEmpresaSel] = useState("");
  const [supervisorSel, setSupervisorSel] = useState("");
  const [aba, setAba] = useState<"ativos" | "inativos">("ativos");
  const salvando = useRef(false);
  const [demitindo, setDemitindo] = useState<EmpregadoCadastro | null>(null);
  useAbrirDireto(direto, empresas.length > 0, aberto, abrirNovo, aoConcluir);
  const { data: lista = [], isLoading } = useEmpregados(empresaId);
  const empregados = lista as EmpregadoCadastro[];
  // Busca por palavra-chave em todos os campos (decisão 312), nos dois blocos: ativos e demitidos / inativos.
  const [busca, setBusca] = useState("");
  const empresaDe = (id: string | null) => empresas.find((x) => x.id === id)?.nome_fantasia ?? "";
  const encontrados = empregados.filter((e) =>
    combinaBusca(busca, ...camposDeBusca(e, [empresaDe(e.empresa_id), formatarData(e.data_admissao), formatarData(e.data_demissao), empregadoAtivo(e) ? "Ativo" : "Inativo Demitido", mascararCpf(e.cpf)])),
  );
  const { ativos, inativos } = separarEmpregados(encontrados);
  // Quem pode ser supervisor: empregados ativos (de toda a lista, não só os da busca), menos o próprio.
  const supervisoresPossiveis = separarEmpregados(empregados).ativos;
  const nomeSupervisor = (e: EmpregadoCadastro) => empregados.find((x) => x.id === e.supervisor_id)?.nome ?? "";
  const empresaPadrao = empresaPadraoParaEscolha(empresas, empresaId);
  // Empregado antigo sem empresa: a empresa precisa ser escolhida, não é preenchida sozinha.
  const empresaForm = empresaSel || (base ? "" : empresaPadrao);
  const salvar = useSalvar("empregados", ["empregados", "empregados-total"]);
  const [importando, setImportando] = useState(false);
  const excluir = useExcluir("empregados", ["empregados", "empregados-total"]);
  const queryClient = useQueryClient();

  function abrir(empregado: EmpregadoCadastro | null, clonar = false) {
    salvando.current = false;
    setEditando(clonar ? null : empregado);
    setModelo(clonar ? empregado : null);
    setEmpresaSel(empregado?.empresa_id ?? "");
    // Supervisor que já foi desligado não fica escolhido: o campo volta vazio para o cadastro indicar outro.
    setSupervisorSel(separarEmpregados(empregados).ativos.some((x) => x.id === empregado?.supervisor_id) ? (empregado?.supervisor_id ?? "") : "");
    setErroCpf(null);
    setErroMatricula(null);
    listaParaConferir.current = null;
    setAberto(true);
  }

  // Demonstração (2.8): o cadastro novo abre já preenchido com um empregado fictício; CPF e matrícula saem diferentes dos de todas as empresas.
  async function abrirNovo(nome?: string) {
    if (import.meta.env.VITE_DEMO_MODE !== "false") {
      let todos: { cpf?: string | null; matricula?: string | null }[] = empregados;
      try { todos = await lerTodas(() => supabase.from("empregados").select("id,cpf,matricula"), (q) => q.order("id")); } catch { /* fica com a lista da tela */ }
      const exemplo = exemploEmpregado(todos, empresaPadrao) as EmpregadoCadastro;
      return abrir(nome ? { ...exemplo, nome } : exemplo, true);
    }
    abrir(nome ? ({ nome } as EmpregadoCadastro) : null, !!nome);
  }

  // Busca sem resultado nos ativos: sugere o nome parecido e oferece cadastrar com o texto digitado.
  const semResultado = () => (
    <SemResultadoBusca
      termo={busca}
      sugestao={sugerirNome(busca, empregados.map((e) => e.nome))}
      aoSugerir={setBusca}
      rotuloCadastro={`Cadastrar “${busca.trim()}”`}
      aoCadastrar={() => void abrirNovo(capitalizarTexto(busca))}
    />
  );
  const { novoNome } = useSearch({ strict: false }) as { novoNome?: string };
  const abriuPorLink = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (novoNome && !abriuPorLink.current && empresas.length > 0) { abriuPorLink.current = true; void abrirNovo(capitalizarTexto(novoNome)); void navigate({ to: "/empregados", search: {}, replace: true }); }
  }, [novoNome, empresas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [erroCpf, setErroCpf] = useState<string | null>(null);
  const [erroMatricula, setErroMatricula] = useState<string | null>(null);
  // Valida ao sair do campo contra todos os empregados (de todas as empresas); se a lista não carregar, o Salvar confere de novo.
  const listaParaConferir = useRef<Promise<{ id: string; cpf: string | null; matricula: string | null }[]> | null>(null);
  function conferirAoSair(campo: HTMLInputElement, validar: typeof validarCpfCampo, definir: (m: string | null) => void) {
    const valor = campo.value;
    if (!valor.trim()) { definir(null); return; }
    // A lista é lida uma vez por abertura do formulário; resposta que chega depois de o valor mudar é descartada.
    listaParaConferir.current ??= lerTodas<{ id: string; cpf: string | null; matricula: string | null }>(() => supabase.from("empregados").select("id,cpf,matricula"), (q) => q.order("id"));
    listaParaConferir.current.then(
      (todos) => { if (campo.value === valor) definir(validar(valor, todos, editando ?? undefined)); },
      () => { listaParaConferir.current = null; definir(null); },
    );
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? "");
    let valores: Record<string, unknown>;
    try {
      // Confere CPF e matrícula contra todos os empregados, de todas as empresas.
      let todos: { id: string; cpf: string | null; matricula: string | null }[];
      try {
        todos = await lerTodas(() => supabase.from("empregados").select("id,cpf,matricula"), (q) => q.order("id"));
      } catch {
        throw new Error("Não foi possível conferir CPF e matrícula. Tente de novo.");
      }
      valores = prepararEmpregado(
        {
          nome: texto("nome"),
          cpf: texto("cpf"),
          matricula: texto("matricula"),
          empresa_id: empresaForm,
          email: MODO_DEMO ? texto("email") : "",
          data_admissao: texto("data_admissao"),
          data_demissao: texto("data_demissao"),
        },
        todos ?? [],
        editando ?? undefined,
      );
      // Supervisor obrigatório (só em modo demonstração por enquanto; quem já está desligado não precisa de supervisor).
      if (MODO_DEMO && valores["ativo"] !== false) {
        const erroSupervisor = erroDoSupervisor(supervisorSel, editando?.id, empregados, hojeLocal());
        if (erroSupervisor) throw new Error(erroSupervisor);
      }
      if (MODO_DEMO && supervisorSel) valores["supervisor_id"] = supervisorSel;
    } catch (erro) {
      salvando.current = false;
      toast.error(erro instanceof Error ? erro.message : "Dados inválidos.");
      return;
    }
    if (!MODO_DEMO) delete valores["email"];
    salvar.mutate(
      { ...(editando ? { id: editando.id } : {}), valores },
      {
        onSuccess: () => { setAberto(false); marcarDestaque(String(valores["cpf"] ?? "").replace(/\D/g, "")); },
        onError: () => {
          salvando.current = false;
        },
      },
    );
  }

  const nomeEmpresa = (id: string | null) =>
    empresas.find((e) => e.id === id)?.nome_fantasia ?? "—";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
        <div className="min-w-0 flex-1 basis-[28rem]">
          <p className="text-eyebrow">Cadastros</p>
          <h1 className="text-2xl font-bold">Empregados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastra os empregados do grupo, com empresa e situação. Eles recebem as entregas e os termos e são escolhidos nas rotinas de cada módulo.
          </p>
        </div>
      </header>

      <PendenciasDeDesligamento empregados={empregados} />

      {/* Ativos e inativos, acima da busca e do botão Novo empregado (botões de alternância, não abas: decisão 43). */}
      <div role="group" aria-label="Situação dos empregados" className="inline-flex gap-1 rounded-lg bg-muted/70 p-1">
        {(["ativos", "inativos"] as const).map((v) => (
          <Button key={v} type="button" size="sm" variant={aba === v ? "default" : "ghost"} aria-pressed={aba === v} onClick={() => setAba(v)}>
            {v === "ativos" ? `Ativos (${ativos.length})` : `Inativos (${inativos.length})`}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <BarraDeFiltros>
          <Input aria-label="Buscar empregado por palavra-chave" placeholder="Buscar por palavra-chave" className="max-w-md" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {busca.trim() && <p className="text-sm text-muted-foreground">{encontrados.length} de {empregados.length} empregado(s).</p>}
        </BarraDeFiltros>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                exportarCsv(
                  "empregados",
                  empregados.map((e) => ({
                    Nome: e.nome,
                    CPF: e.cpf,
                    Empresa: nomeEmpresa(e.empresa_id),
                    Matricula: e.matricula,
                    "E-mail": e.email ?? "",
                    Supervisor: nomeSupervisor(e),
                    Admissao: formatarData(e.data_admissao),
                    Demissao: formatarData(e.data_demissao),
                    Situacao: empregadoAtivo(e) ? "Ativo" : "Inativo",
                  })),
                )
              }
            >
              Exportar CSV
            </Button>
            <RelatorioCadastro
              nome="empregados"
              filtro={busca.trim()}
              linhas={[...ativos, ...inativos]}
              campos={[
                { id: "nome", rotulo: "Nome completo", valor: (e) => e.nome },
                { id: "cpf", rotulo: "CPF", valor: (e) => (e.cpf.replace(/\D/g, "").length > 11 ? e.cpf : mascararCpf(e.cpf)) },
                { id: "matricula", rotulo: "Matrícula", valor: (e) => e.matricula },
                { id: "empresa", rotulo: "Empresa", valor: (e) => nomeEmpresa(e.empresa_id) },
                { id: "email", rotulo: "E-mail", valor: (e) => e.email ?? "" },
                { id: "supervisor", rotulo: "Supervisor", valor: (e) => nomeSupervisor(e) },
                { id: "admissao", rotulo: "Admissão", valor: (e) => formatarData(e.data_admissao) },
                { id: "demissao", rotulo: "Demissão", valor: (e) => formatarData(e.data_demissao) },
                { id: "situacao", rotulo: "Situação", valor: (e) => (empregadoAtivo(e) ? "Ativo" : "Inativo") },
              ] satisfies CampoRelatorio<EmpregadoCadastro>[]}
            />
            <Button requiresWrite variant="outline" onClick={() => setImportando(true)}>
              Importar planilha
            </Button>
            <Button requiresWrite onClick={() => void abrirNovo()}>
              Novo empregado
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <BlocoEsqueleto cartoes={0} linhas={6} rotulo="Carregando empregados" />
      ) : (
        <>
          {aba === "ativos" && <BlocoEmpregados
            titulo={`Ativos (${ativos.length})`}
            lista={ativos}
            vazio={busca.trim() ? semResultado : "Nenhum empregado ativo."}
            nomeEmpresa={nomeEmpresa}
            onClonar={(e) => abrir(e, true)}
            onEditar={(e) => abrir(e)}
            onResumo={setResumo}
            onExcluir={async (e) => {
              if (await confirmarExclusao(e.nome)) excluir.mutate(e.id);
            }}
            onDemitir={setDemitindo}
            nomeSupervisor={nomeSupervisor}
          />}
          {aba === "inativos" && <BlocoEmpregados
            titulo={`Demitidos / inativos (${inativos.length})`}
            lista={inativos}
            vazio={busca.trim() ? "Nenhum empregado inativo encontrado para a busca." : "Nenhum empregado inativo."}
            nomeEmpresa={nomeEmpresa}
            onClonar={(e) => abrir(e, true)}
            onEditar={(e) => abrir(e)}
            onResumo={setResumo}
            onExcluir={async (e) => {
              if (await confirmarExclusao(e.nome)) excluir.mutate(e.id);
            }}
            nomeSupervisor={nomeSupervisor}
          />}
        </>
      )}

      <DemitirEmpregadoDialog
        alvo={demitindo}
        salvando={salvar.isPending}
        demo={MODO_DEMO}
        aoFechar={() => setDemitindo(null)}
        aoConfirmar={({ data, motivo, pendentes }) => {
          const alvo = demitindo;
          if (!alvo) return;
          salvar.mutate(
            { id: alvo.id, valores: { data_demissao: data, ativo: false } },
            {
              onSuccess: () => {
                setDemitindo(null);
                let efeitos: string[] = [];
                const configAntes = MODO_DEMO ? lerConfig(localStorage) : null;
                if (MODO_DEMO && configAntes) {
                  const r = comDesligamento(configAntes, usuarioAtivo(localStorage).nome, { nome: alvo.nome, motivo, data, pendentes });
                  efeitos = r.efeitos;
                  salvarConfig(localStorage, r.config);
                  // O supervisor recebe o alerta para substituir o empregado onde ele era responsável por alguma tarefa.
                  // Só vale supervisor ainda ativo; sem ele o alerta pede que alguém defina quem substitui.
                  const supervisor = separarEmpregados(empregados).ativos.find((x) => x.id === alvo.supervisor_id && x.id !== alvo.id);
                  try {
                    abrirAlertaDeDesligamento({ empregadoId: alvo.id, empregadoNome: alvo.nome, supervisorId: supervisor?.id ?? null, supervisorNome: supervisor?.nome ?? null, dataDesligamento: data }, new Date().toISOString());
                    efeitos.push(supervisor ? `alerta a ${supervisor.nome} para substituí-lo(a)` : "sem supervisor ativo para substituí-lo(a)");
                  } catch {
                    toast.warning("O desligamento foi registrado, mas o alerta ao supervisor não pôde ser guardado neste navegador.");
                  }
                }
                // Desfazer: volta a data de demissão e a situação de antes (e, na demonstração, os efeitos simulados do desligamento).
                avisarComDesfazer(`${alvo.nome} desligado(a)${efeitos.length ? ` (simulado: ${efeitos.join(", ")})` : ""}`, async () => {
                  const { error } = await supabase.from("empregados").update({ data_demissao: alvo.data_demissao ?? null, ativo: alvo.ativo } as never).eq("id", alvo.id);
                  if (error) throw error;
                  if (configAntes) salvarConfig(localStorage, configAntes);
                  retirarAlertaDeDesligamento(alvo.id);
                  queryClient.invalidateQueries();
                  avisarOutrasAbas();
                });
              },
            },
          );
        }}
      />

      <GavetaEmpregado empregado={resumo} aoFechar={() => setResumo(null)} aoAbrirFicha={() => { if (resumo) abrir(resumo); }} />
      <Dialog open={aberto} onOpenChange={aviso.aoMudarAberto(setAberto)}>
        <DialogContent telaCheia className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empregado" : modelo && !ehExemplo(modelo) ? "Clonar empregado" : "Novo empregado"}</DialogTitle>
            <DialogDescription>Dados do empregado.</DialogDescription>
          </DialogHeader>
          <AvisoEdicaoSimultanea chave={editando ? `empregado:${editando.id}` : null} />
          <form onSubmit={(e) => void enviar(e)} onInput={aviso.aoAlterar} onChange={aviso.aoAlterar} className="grid gap-4 sm:grid-cols-2">
            <BarraCompletude campos={CAMPOS_EMPREGADO} nome="Cadastro" />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" capitalizar="nome" aria-required defaultValue={base?.nome ?? ""} />
              <AvisoSemelhantes campoId="nome" alvo="empregado" ignorarId={editando?.id ?? null} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                aria-required
                inputMode="numeric"
                placeholder="xxx.xxx.xxx-xx"
                aria-invalid={erroCpf ? true : undefined}
                aria-describedby={erroCpf ? "cpf-erro" : undefined}
                onChange={(ev) => {
                  ev.target.value = mascararCpf(ev.target.value);
                  setErroCpf(null);
                }}
                // Confere ao sair do campo (dígitos e CPF já cadastrado), sem esperar o Salvar.
                onBlur={(ev) => conferirAoSair(ev.target, validarCpfCampo, setErroCpf)}
                defaultValue={base?.cpf ? (base.cpf.replace(/\D/g, "").length > 11 ? base.cpf : mascararCpf(base.cpf)) : ""}
              />
              {erroCpf && <p id="cpf-erro" role="alert" className="text-xs font-medium text-destructive">{erroCpf}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa_id">Empresa</Label>
              <Select value={empresaForm} onValueChange={setEmpresaSel}>
                <SelectTrigger id="empresa_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {empresasParaEscolha(empresas, [base?.empresa_id]).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matricula">Matrícula interna (LxPx)</Label>
              <Input
                id="matricula"
                name="matricula"
                placeholder="Livro e página, ex.: L3P25"
                defaultValue={base?.matricula ?? ""}
                aria-invalid={erroMatricula ? true : undefined}
                aria-describedby={erroMatricula ? "matricula-erro" : undefined}
                onChange={() => setErroMatricula(null)}
                onBlur={(ev) => conferirAoSair(ev.target, validarMatriculaCampo, setErroMatricula)}
              />
              {erroMatricula && <p id="matricula-erro" role="alert" className="text-xs font-medium text-destructive">{erroMatricula}</p>}
            </div>
            {MODO_DEMO && (
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={base?.email ?? ""} />
              </div>
            )}
            {MODO_DEMO && (
              <div className="space-y-1.5">
                <Label htmlFor="supervisor_id">Supervisor</Label>
                <Select value={supervisorSel} onValueChange={setSupervisorSel}>
                  <SelectTrigger id="supervisor_id" aria-required>
                    <SelectValue placeholder="Selecione o supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisoresPossiveis.filter((s) => s.id !== editando?.id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Obrigatório. Ao desligar o empregado, o supervisor recebe o alerta para substituí-lo onde ele era responsável.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="data_admissao">Data de admissão</Label>
              <Input
                id="data_admissao"
                name="data_admissao"
                type="date"
                defaultValue={base?.data_admissao ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_demissao">Data de demissão</Label>
              <Input
                id="data_demissao"
                name="data_demissao"
                type="date"
                defaultValue={editando?.data_demissao ?? ""}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              O empregado continua ativo até a data de demissão. A partir dela, fica inativo, passa
              para o bloco de demitidos e não recebe mais entregas, devoluções ou baixas. Só o
              Termo de Encerramento de ferramentas (devolução na saída) continua liberado.
            </p>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => aviso.aoMudarAberto(setAberto)(false)}>
                Cancelar
              </Button>
              <Button requiresWrite type="submit" disabled={salvar.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImportarEmpregados aberto={importando} aoMudar={setImportando} />
    </div>
  );
}

function BlocoEmpregados({
  titulo,
  lista,
  vazio,
  nomeEmpresa,
  onClonar,
  onEditar,
  onResumo,
  onExcluir,
  onDemitir,
  nomeSupervisor,
}: {
  titulo: string;
  lista: EmpregadoCadastro[];
  vazio: string | (() => ReactNode);
  nomeEmpresa: (id: string | null) => string;
  onClonar: (e: EmpregadoCadastro) => void;
  onEditar: (e: EmpregadoCadastro) => void;
  onResumo: (e: EmpregadoCadastro) => void;
  onExcluir: (e: EmpregadoCadastro) => void;
  onDemitir?: (e: EmpregadoCadastro) => void;
  nomeSupervisor: (e: EmpregadoCadastro) => string;
}) {
  const destaque = useDestaque();
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome completo</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>E-mail</TableHead>
              {MODO_DEMO && <TableHead>Supervisor</TableHead>}
              <TableHead>Admissão</TableHead>
              <TableHead>Demissão</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={MODO_DEMO ? 10 : 9} className="text-center text-muted-foreground">
                  {typeof vazio === "function" ? vazio() : vazio}
                </TableCell>
              </TableRow>
            ) : (
              lista.map((e) => (
                <TableRow key={e.id} data-destaque={e.cpf.replace(/\D/g, "")} className={destaque === e.cpf.replace(/\D/g, "") ? "linha-destacada" : undefined}>
                  <TableCell>
                    <NomeComResumo rotulo={e.nome} aoAbrir={() => onResumo(e)} cartao={<>
                      <p className="font-semibold">{e.nome}</p>
                      <p className="text-muted-foreground">{e.cargo || "Cargo não informado"}</p>
                      <p className="text-xs text-muted-foreground">Matrícula {e.matricula ?? "—"} · {nomeEmpresa(e.empresa_id)}</p>
                      <p className="text-xs">{e.data_demissao ? `Desligado em ${formatarData(e.data_demissao)}` : "Ativo"}</p>
                    </>}>{e.nome}</NomeComResumo>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{e.cpf}</TableCell>
                  <TableCell>{e.matricula ?? "—"}</TableCell>
                  <TableCell>{nomeEmpresa(e.empresa_id)}</TableCell>
                  <TableCell>{e.email || "—"}</TableCell>
                  {MODO_DEMO && <TableCell>{nomeSupervisor(e) || <span className="text-xs text-destructive">Sem supervisor</span>}</TableCell>}
                  <TableCell>{formatarData(e.data_admissao)}</TableCell>
                  <TableCell>{formatarData(e.data_demissao)}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${empregadoAtivo(e) ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"}`}>
                      {empregadoAtivo(e) ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                    {onDemitir && (
                      <Button requiresWrite type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={() => onDemitir(e)}>
                        Demitir
                      </Button>
                    )}
                    <AcoesLinha rotulo={e.nome} onClonar={() => onClonar(e)} onEditar={() => onEditar(e)} onExcluir={() => onExcluir(e)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
