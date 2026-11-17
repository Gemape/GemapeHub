import { ArrowLeft, ClipboardList } from "lucide-react";
import { confirmarExclusao } from "@/components/ConfirmarAcao";
import { exemploViagem } from "@/lib/dados-teste/exemplos";
import { useId, useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CampoBusca } from "@/components/CampoBusca";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { formatarData } from "@/lib/gemape";
import { useAbastecimentos, useManutencoesVeiculo } from "@/lib/use-registros-veiculo";
import { resumoManutencao, type Abastecimento, type ManutencaoVeiculo } from "@/lib/registros-veiculo";
import { useParametrosBase } from "@/lib/use-parametros-base";
import { EscolherManutencaoDialog } from "@/components/modules/EscolherManutencaoDialog";
import { NovaManutencaoDialog } from "@/components/modules/NovaManutencaoDialog";
import { EscolherAbastecimentoDialog } from "@/components/modules/EscolherAbastecimentoDialog";
import { NovoAbastecimentoDialog } from "@/components/modules/NovoAbastecimentoDialog";
import { ClienteDialog } from "@/components/parametros/ClienteDialog";
import { listarClientes, proximoCodigoCliente } from "@/lib/clientes-demo";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import { juntarImagens, mensagemDeLimite, reduzirImagem, type ImagemReduzida } from "@/lib/imagem-economica";
import { municipiosDaUf } from "@/lib/municipios";
import {
  ID_CARTOES, ID_DATA_DESPESA, ID_DETALHAMENTO, ID_JUSTIFICATIVA, ID_TIPO_DESPESA, ID_VALOR_DESPESA, TIPO_ABASTECIMENTO, TIPO_MANUTENCAO, MAX_ARQUIVOS, dadosIlegiveis, habilitadosAtivos, habilitadosDaPergunta, lerEstado, questionarioDoTipo, siglaDaUf, tiposDeDespesa, type Habilitado, type Pergunta,
  tituloDoQuestionario,
} from "@/lib/questionario-despesas";
import { questionarioPublicado } from "@/lib/questionario-destinos";
import { paginasDoPreenchimento } from "@/lib/questionario-secoes";
import { SEM_CLIENTE_VINCULADO } from "@/lib/viagens";
import { aplicarFormato, chaveAbastecimento, chaveJustificativaPedida, chaveManutencao, chaveOutro, marcouOutro, perguntasVisiveis, podarOcultas, trazerAbastecimento, trazerManutencao, validarRespostas, type Resposta, type Respostas } from "@/lib/questionario-respostas";
import {
  atualizarResposta, despesaEmRelatorio, listarRespostas, registrarResposta, removerResposta, respostasParaEdicao, resumoDaResposta, tipoEscolhido, type RespostaRegistrada,
} from "@/lib/respostas-despesas";

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const cartao = "rounded-xl bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:bg-card/80 sm:p-5";
const vazia = (r: Resposta | undefined) => r === undefined || (Array.isArray(r) ? r.length === 0 : r.trim() === "");

// Formulário do Questionário de Despesas, no estilo Google Forms (dec 169): cartão central, perguntas em cartões, obrigatórias
// com asterisco, Enviar com confirmação e lista de respostas para conferência. Respostas só no navegador (modo demonstração).
export function QuestionarioFormulario({ tipoInicial, semPerguntaTipo, onVoltar }: { tipoInicial?: string | undefined; semPerguntaTipo?: boolean | undefined; onVoltar?: { rotulo: string; aoClicar: () => void } | undefined }) {
  const { isAdmin, canWrite } = useAccess();
  const [estado] = useState(lerEstado);
  const tipos = tiposDeDespesa(estado);
  // Demonstração (2.8): a resposta nova abre já preenchida (menos a foto do comprovante); só é gravada se a pessoa enviar.
  const respostasIniciais = (): Respostas => {
    if (!tipoInicial || !tipos.includes(tipoInicial)) return {};
    return import.meta.env.VITE_DEMO_MODE !== "false" ? exemploViagem(estado, tipoInicial, listarClientes()) : { [ID_TIPO_DESPESA]: [tipoInicial] };
  };
  const [respostas, setRespostas] = useState<Respostas>(respostasIniciais);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [imagens, setImagens] = useState<Record<string, ImagemReduzida[]>>({});
  const [enviada, setEnviada] = useState<RespostaRegistrada | null>(null);
  const [registradas, setRegistradas] = useState<RespostaRegistrada[]>(listarRespostas);
  const [verLista, setVerLista] = useState(false);
  // Despesa registrada que está sendo editada neste formulário (dec 211); null no lançamento novo.
  const [editando, setEditando] = useState<RespostaRegistrada | null>(null);
  const [atualizada, setAtualizada] = useState(false);
  // Muda ao limpar: remonta os campos (inclusive o de arquivo, que o navegador guarda por conta própria).
  const [chave, setChave] = useState(0);
  const ilegivel = useMemo(() => dadosIlegiveis(), []);
  const tipoDesconhecido = !!tipoInicial && !tipos.includes(tipoInicial);
  const enviando = useRef(false);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);

  const tipo = tipoEscolhido(respostas);
  // Ramificação apontando para pergunta que saiu do questionário: não publica até corrigir (dec 178).
  const acaoRequerida = !!tipo && tipos.includes(tipo) && !questionarioPublicado(estado, tipo);
  const visiveis = useMemo(() => {
    if (tipo && tipos.includes(tipo)) return perguntasVisiveis(estado, tipo, respostas);
    const inicial = estado.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
    return inicial ? [inicial] : [];
  }, [estado, tipo, tipos, respostas]);
  // Pergunta que ficou oculta por uma condição ou ramificação perde a resposta digitada (decisão 313); sem nada a podar, o estado não muda e não há novo ciclo.
  useEffect(() => {
    if (!tipo || !tipos.includes(tipo)) return;
    setRespostas((r) => podarOcultas(estado, tipo, r));
    // As imagens anexadas numa pergunta de upload escondida saem junto com a resposta (senão voltam à tela sem resposta ou seguem no envio).
    const ids = new Set(visiveis.map((p) => p.id));
    setImagens((x) => (Object.keys(x).every((id) => ids.has(id)) ? x : Object.fromEntries(Object.entries(x).filter(([id]) => ids.has(id)))));
  }, [estado, tipo, tipos, respostas, visiveis]);
  // Erro de pergunta que saiu da tela (troca de tipo, condição) não fica pendurado.
  const errosVisiveis = Object.fromEntries(Object.entries(erros).filter(([id]) => visiveis.some((p) => p.id === id)));
  // Aberto por um card de Viagens (dec 183): o tipo já vem do card, então a pergunta de tipos de despesa não aparece (a resposta segue valendo).
  const ocultaTipo = !!semPerguntaTipo && !tipoDesconhecido && tipos.includes(tipo);
  const escondida = (p: Pergunta) => ocultaTipo && p.id === ID_TIPO_DESPESA;
  const obrigatorias = visiveis.filter((p) => p.obrigatoria && !escondida(p));
  const respondidas = obrigatorias.filter((p) => !vazia(respostas[p.id])).length;
  const progresso = obrigatorias.length ? Math.round((respondidas / obrigatorias.length) * 100) : 0;
  const habilitadosVisiveis = (p: Pergunta): Habilitado[] => {
    const lista = habilitadosDaPergunta(estado, p);
    return lista ? (empregadosLidos ? habilitadosAtivos(lista, idsAtivos) : lista) : [];
  };

  // Seções (dec 179): cada uma é uma página; sem seções o formulário é uma página só.
  const paginas = useMemo(() => (tipo && tipos.includes(tipo) ? paginasDoPreenchimento(estado, tipo, visiveis.filter((p) => !(ocultaTipo && p.id === ID_TIPO_DESPESA))) : [{ secao: null, perguntas: visiveis }]), [estado, tipo, tipos, visiveis, ocultaTipo]);
  const [paginaPedida, setPaginaPedida] = useState(0);
  // Trocar o tipo de despesa recomeça da primeira página.
  useEffect(() => { setPaginaPedida(0); }, [tipo]);
  const pagina = Math.min(paginaPedida, Math.max(paginas.length - 1, 0));
  const paginaAtual = paginas[pagina];
  const ultimaPagina = pagina >= paginas.length - 1;
  const perguntasDaPagina = (paginas.length > 1 && paginaAtual ? paginaAtual.perguntas : visiveis).filter((p) => !escondida(p));

  // A pergunta que depende da anterior (Município x UF) fica no mesmo cartão dela.
  const grupos = perguntasDaPagina.reduce<Pergunta[][]>((lista, p) => {
    const ultimo = lista[lista.length - 1];
    if (p.dependeDe && ultimo?.[ultimo.length - 1]?.id === p.dependeDe) ultimo.push(p);
    else lista.push([p]);
    return lista;
  }, []);

  // Dec 223: no card Abastecimento, escolher o cartão de crédito abre o Novo abastecimento de Veículos; só a data e o valor voltam para o card.
  const [abastecimentoAberto, setAbastecimentoAberto] = useState(false);
  const [escolhaAberta, setEscolhaAberta] = useState(false);
  const abastecimentos = useAbastecimentos();
  const ligadoId = typeof respostas[chaveAbastecimento] === "string" ? (respostas[chaveAbastecimento] as string) : "";
  const ligado = ligadoId ? abastecimentos.find((a) => a.id === ligadoId) ?? null : null;
  const trazerDoAbastecimento = (registro: Abastecimento) => {
    setRespostas((r) => trazerAbastecimento(r, registro));
    setErros((x) => { const { [ID_DATA_DESPESA]: _d, [ID_VALOR_DESPESA]: _v, ...resto } = x; return resto; });
    toast.info("Data, valor e litros trazidos do abastecimento. Termine a despesa.");
  };
  // Dec 226: o mesmo no card Manutenção do veículo de trabalho, com a Nova manutenção; voltam data, detalhamento (serviços) e custo total.
  const [manutencaoAberta, setManutencaoAberta] = useState(false);
  const [escolhaManutencaoAberta, setEscolhaManutencaoAberta] = useState(false);
  const manutencoes = useManutencoesVeiculo();
  const parametrosBase = useParametrosBase();
  const manutencaoLigadaId = typeof respostas[chaveManutencao] === "string" ? (respostas[chaveManutencao] as string) : "";
  const manutencaoLigada = manutencaoLigadaId ? manutencoes.find((m) => m.id === manutencaoLigadaId) ?? null : null;
  const servicoDaManutencao = (m: ManutencaoVeiculo) => resumoManutencao(m, (id) => parametrosBase.acoesManutencaoVeiculo.find((a) => a.id === id)?.nome);
  const trazerDaManutencao = (registro: ManutencaoVeiculo, servico: string) => {
    setRespostas((r) => trazerManutencao(r, registro, servico === "—" ? "" : servico));
    setErros((x) => { const { [ID_DATA_DESPESA]: _d, [ID_VALOR_DESPESA]: _v, [ID_DETALHAMENTO]: _t, ...resto } = x; return resto; });
    toast.info("Data, detalhamento e custo total trazidos da manutenção. Termine a despesa.");
  };
  const mudar = (id: string, valor: Resposta) => {
    if (tipo === TIPO_ABASTECIMENTO && id === ID_CARTOES && !vazia(valor) && !respostas[chaveAbastecimento]) setAbastecimentoAberto(true);
    if (tipo === TIPO_MANUTENCAO && id === ID_CARTOES && !vazia(valor) && !respostas[chaveManutencao]) setManutencaoAberta(true);
    setRespostas((r) => {
      const novo = { ...r, [id]: valor };
      // Descrição do "Outro" some quando a opção é desmarcada.
      const alvo = estado.perguntas.find((p) => p.id === id);
      if (alvo && !marcouOutro(alvo, novo)) delete novo[chaveOutro(id)];
      // Quem depende desta resposta (município x UF) recomeça vazio.
      for (const p of estado.perguntas) if (p.dependeDe === id) delete novo[p.id];
      return novo;
    });
    setErros((x) => { const { [id]: _tira, ...resto } = x; return resto; });
  };

  // Dec 221: sem o documento anexado, o campo de justificativa abre e permite encerrar com ela.
  function abrirJustificativa(achados: Record<string, string>, lista: Pergunta[]) {
    const faltaDocumento = lista.some((p) => p.tipo === "upload" && achados[p.id]);
    if (!faltaDocumento || !questionarioDoTipo(estado, tipo).includes(ID_JUSTIFICATIVA) || respostas[chaveJustificativaPedida] === "1") return;
    setRespostas((r) => ({ ...r, [chaveJustificativaPedida]: "1" }));
    toast.info("Anexe o documento ou justifique a ausência dele para encerrar.");
  }

  function irParaPagina(i: number) {
    setPaginaPedida(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function avancar() {
    const achados = validarRespostas(perguntasDaPagina, respostas);
    abrirJustificativa(achados, perguntasDaPagina);
    // Justificativa aberta numa página adiante (seções): a falta do documento não trava a página do documento; o erro dela vem no envio.
    if (visiveis.some((p) => p.id === ID_JUSTIFICATIVA)) for (const p of perguntasDaPagina) if (p.tipo === "upload") delete achados[p.id];
    setErros((x) => ({ ...x, ...achados }));
    if (Object.keys(achados).length > 0) {
      const primeiro = perguntasDaPagina.find((p) => achados[p.id]);
      if (primeiro) document.getElementById(`pergunta-${primeiro.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    irParaPagina(pagina + 1);
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando.current || ilegivel || acaoRequerida) return;
    if (!ultimaPagina) { avancar(); return; }
    const achados = validarRespostas(visiveis, respostas);
    abrirJustificativa(achados, visiveis);
    setErros(achados);
    const primeiro = visiveis.find((p) => achados[p.id]);
    if (primeiro) {
      const paginaDoErro = paginas.findIndex((pg) => pg.perguntas.some((p) => p.id === primeiro.id));
      if (paginaDoErro >= 0 && paginaDoErro !== pagina) { irParaPagina(paginaDoErro); return; }
      document.getElementById(`pergunta-${primeiro.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    enviando.current = true;
    try {
      const fotos = Object.fromEntries(Object.entries(imagens).map(([id, l]) => [id, l.map((i) => ({ nome: i.nome, dataUrl: i.dataUrl }))]));
      setEnviada(editando ? atualizarResposta(estado, editando.id, respostas, localStorage, fotos) : registrarResposta(estado, respostas, localStorage, new Date(), fotos));
      setAtualizada(editando !== null);
      setEditando(null);
      setRegistradas(listarRespostas());
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar a resposta.");
    } finally {
      enviando.current = false;
    }
  }

  function preencherDeNovo() {
    setEditando(null);
    setRespostas(respostasIniciais());
    setErros({});
    setImagens({});
    setEnviada(null);
    setPaginaPedida(0);
    setChave((c) => c + 1);
  }

  // Editar: volta à tela das perguntas com a despesa preenchida (dec 211). Despesa já num relatório não se edita.
  function editar(r: RespostaRegistrada) {
    if (despesaEmRelatorio(r.id)) { toast.error("Esta despesa já está num relatório de viagens (Finalizada) e não pode ser editada."); return; }
    setRespostas(respostasParaEdicao(estado, r));
    setImagens(Object.fromEntries(r.itens.filter((i) => i.imagens?.length).map((i) => [i.perguntaId, (i.imagens ?? []).map((f) => {
      const bytes = Math.round((f.dataUrl.length * 3) / 4);
      return { nome: f.nome, bytesAntes: bytes, bytesDepois: bytes, dataUrl: f.dataUrl };
    })])));
    setErros({});
    setEnviada(null);
    setVerLista(false);
    setPaginaPedida(0);
    setChave((c) => c + 1);
    setEditando(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(r: RespostaRegistrada) {
    if (!(await confirmarExclusao(`a resposta de ${r.tipo} (${r.data.split("-").reverse().join("/")} ${r.hora})`))) return;
    try { removerResposta(r.id); setRegistradas(listarRespostas()); } catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir."); }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-3 sm:p-4">
      <div className={`${cartao} border-t-8 border-t-primary`}>
        <h1 className="text-2xl font-semibold">{tituloDoQuestionario(tipo)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ocultaTipo ? "Responda as perguntas." : "Escolha o tipo de despesa e responda as perguntas."} Campos com <span className="text-destructive">*</span> são obrigatórios.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onVoltar && <Button type="button" variant="outline" size="sm" onClick={onVoltar.aoClicar}><ArrowLeft className="mr-1 h-4 w-4" />{onVoltar.rotulo}</Button>}
          <Button type="button" variant="secondary" size="sm" aria-expanded={verLista} onClick={() => setVerLista((v) => !v)}>
            <ClipboardList className="mr-1 h-4 w-4" />{verLista ? "Ocultar respostas registradas" : `Respostas registradas (${registradas.length})`}
          </Button>
        </div>
      </div>

      {ilegivel && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          As perguntas salvas neste navegador estão ilegíveis; o formulário mostra o padrão e o envio fica bloqueado para não gravar por cima.
        </p>
      )}
      {tipoDesconhecido && <p role="alert" className="text-sm text-destructive">O tipo de despesa “{tipoInicial}” não existe mais no cadastro; escolha um na primeira pergunta.</p>}
      {!tipo && !tipoDesconhecido && <p className="text-sm text-muted-foreground">Escolha o tipo de despesa para ver as demais perguntas.</p>}

      {verLista && <ListaRespostas lista={registradas} podeExcluir={isAdmin} podeEditar={canWrite} onExcluir={excluir} onEditar={editar} />}

      {enviada ? (
        <div className={`${cartao} space-y-3`} role="status">
          <h2 className="text-xl font-semibold">{atualizada ? "Resposta atualizada" : "Resposta registrada"}</h2>
          <p className="text-sm text-muted-foreground">{resumoDaResposta(enviada)}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => (onVoltar ? onVoltar.aoClicar() : preencherDeNovo())}>Novo</Button>
            <Button variant="outline" onClick={() => setVerLista(true)}>Ver respostas registradas</Button>
          </div>
        </div>
      ) : (
        <form key={chave} onSubmit={enviar} noValidate className="space-y-4">
          {editando && (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-primary p-3 text-sm">
              <span className="mr-auto break-words">Editando a despesa: {resumoDaResposta(editando)}</span>
              <Button type="button" variant="outline" size="sm" onClick={preencherDeNovo}>Cancelar edição</Button>
            </div>
          )}
          {acaoRequerida && (
            <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
              Ação requerida: este questionário tem ramificação que aponta para uma pergunta removida e não está publicado. Corrija em Parâmetros, Veículos, Questionário de Despesas.
            </p>
          )}
          {obrigatorias.length > 0 && (
            <div className="space-y-1">
              <div role="progressbar" aria-label="Progresso do preenchimento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso} className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progresso}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{respondidas} de {obrigatorias.length} perguntas obrigatórias respondidas</p>
            </div>
          )}
          {paginas.length > 1 && (
            <p className="text-xs text-muted-foreground">Página {pagina + 1} de {paginas.length}</p>
          )}
          {paginas.length > 1 && paginaAtual?.secao && (paginaAtual.secao.titulo || paginaAtual.secao.subtitulo) && (
            <div className={`${cartao} border-l-8 border-l-primary`}>
              {paginaAtual.secao.titulo && <h2 className="text-lg font-semibold">{paginaAtual.secao.titulo}</h2>}
              {paginaAtual.secao.subtitulo && <p className="text-sm text-muted-foreground">{paginaAtual.secao.subtitulo}</p>}
            </div>
          )}
          {grupos.map((grupo) => (
            <div key={grupo[0]?.id} className={`${cartao} space-y-4 ${grupo.some((p) => errosVisiveis[p.id]) ? "border border-destructive" : ""}`}>
              {grupo.map((p) => (
                <div key={p.id} id={`pergunta-${p.id}`} className="space-y-2">
                  <p className="text-sm font-medium">{p.titulo}{p.obrigatoria && <span className="text-destructive"> *</span>}</p>
                  <Campo
                    pergunta={p} respostas={respostas} imagens={imagens[p.id] ?? []} habilitados={habilitadosVisiveis(p)}
                    onMudar={(v) => mudar(p.id, v)}
                    onImagens={(lista) => setImagens((x) => ({ ...x, [p.id]: lista }))}
                  />
                  {marcouOutro(p, respostas) && (
                    <Input
                      name={`outro-${p.id}`}
                      capitalizar="texto"
                      aria-label={`Descreva o outro (${p.titulo})`}
                      placeholder="Descreva o outro"
                      value={typeof respostas[chaveOutro(p.id)] === "string" ? (respostas[chaveOutro(p.id)] as string) : ""}
                      onChange={(e) => { const v = e.target.value; setRespostas((r) => ({ ...r, [chaveOutro(p.id)]: v })); setErros((x) => { const { [p.id]: _t, ...resto } = x; return resto; }); }}
                    />
                  )}
                  {tipo === TIPO_ABASTECIMENTO && p.id === ID_CARTOES && (
                    <div className="space-y-2">
                      {ligadoId && (
                        <p className="rounded-md border bg-muted/40 p-2 text-xs">
                          {ligado
                            ? <>Ligado ao abastecimento de Veículos: {formatarData(ligado.data)}{ligado.hora ? ` às ${ligado.hora}` : ""} · {ligado.km.toLocaleString("pt-BR")} km · {ligado.litros.toLocaleString("pt-BR")} L · {ligado.valor ? ligado.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "sem valor"}. Data, valor e litros vêm dele ao enviar.</>
                            : "O abastecimento ligado foi excluído de Veículos; escolha outro ou registre um novo."}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setAbastecimentoAberto(true)}>Registrar no Novo abastecimento</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEscolhaAberta(true)}>Escolher abastecimento já registrado</Button>
                      </div>
                    </div>
                  )}
                  {tipo === TIPO_MANUTENCAO && p.id === ID_CARTOES && (
                    <div className="space-y-2">
                      {manutencaoLigadaId && (
                        <p className="rounded-md border bg-muted/40 p-2 text-xs">
                          {manutencaoLigada
                            ? <>Ligado à manutenção de Veículos: {formatarData(manutencaoLigada.data)} · {manutencaoLigada.tipo} · {manutencaoLigada.custoTotal === undefined ? "sem custo" : manutencaoLigada.custoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {servicoDaManutencao(manutencaoLigada)}. Data e custo total vêm dela ao enviar.</>
                            : "A manutenção ligada foi excluída de Veículos; escolha outra ou registre uma nova."}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setManutencaoAberta(true)}>Registrar na Nova manutenção</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEscolhaManutencaoAberta(true)}>Escolher manutenção já registrada</Button>
                      </div>
                    </div>
                  )}
                  {errosVisiveis[p.id] && <p role="alert" className="text-sm text-destructive">{errosVisiveis[p.id]}</p>}
                </div>
              ))}
            </div>
          ))}
          {Object.keys(errosVisiveis).length > 0 && <p role="alert" className="text-sm text-destructive">Corrija as perguntas marcadas antes de enviar.</p>}
          <div className="flex flex-wrap gap-2">
            {pagina > 0 && <Button type="button" variant="outline" onClick={() => irParaPagina(pagina - 1)}>Voltar</Button>}
            {!ultimaPagina && <Button type="button" onClick={avancar} disabled={!tipo || ilegivel || acaoRequerida}>Próxima</Button>}
            {ultimaPagina && <Button type="submit" disabled={!tipo || ilegivel || acaoRequerida}>{editando ? "Salvar alterações" : "Enviar"}</Button>}
            <Button type="button" variant="ghost" onClick={preencherDeNovo}>Limpar formulário</Button>
          </div>
        </form>
      )}

      {/* As janelas de Veículos só existem nos cards que as usam. */}
      {tipo === TIPO_ABASTECIMENTO && (
        <>
          <NovoAbastecimentoDialog
            aberto={abastecimentoAberto}
            aoMudar={setAbastecimentoAberto}
            aoSalvar={trazerDoAbastecimento}
          />
          <EscolherAbastecimentoDialog aberto={escolhaAberta} aoMudar={setEscolhaAberta} aoEscolher={trazerDoAbastecimento} />
        </>
      )}
      {tipo === TIPO_MANUTENCAO && (
        <>
          <NovaManutencaoDialog aberto={manutencaoAberta} aoMudar={setManutencaoAberta} tipoFixo="Corretiva" aoSalvar={(registro) => trazerDaManutencao(registro, servicoDaManutencao(registro))} />
          <EscolherManutencaoDialog aberto={escolhaManutencaoAberta} aoMudar={setEscolhaManutencaoAberta} aoEscolher={trazerDaManutencao} />
        </>
      )}
    </div>
  );
}

function ListaRespostas({ lista, podeExcluir, podeEditar, onExcluir, onEditar }: {
  lista: RespostaRegistrada[]; podeExcluir: boolean; podeEditar: boolean; onExcluir: (r: RespostaRegistrada) => void; onEditar: (r: RespostaRegistrada) => void;
}) {
  if (lista.length === 0) return <p className={`${cartao} text-sm text-muted-foreground`}>Nenhuma resposta registrada ainda.</p>;
  return (
    <ul className="space-y-2">
      {lista.map((r) => (
        <li key={r.id} className={cartao}>
          <details>
            <summary className="cursor-pointer break-words text-sm font-medium">{resumoDaResposta(r)}</summary>
            <dl className="mt-2 space-y-1 text-sm">
              {r.itens.map((i) => (
                <div key={i.perguntaId}><dt className="text-xs text-muted-foreground">{i.titulo}</dt><dd className="break-words">{i.resposta}</dd>
                  {i.imagens && i.imagens.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {i.imagens.filter((f) => f.dataUrl.startsWith("data:image/")).map((f, n) => (
                        <img key={`${n}-${f.nome}`} src={f.dataUrl} alt={f.nome} title={f.nome} className="max-h-64 max-w-full rounded-md border object-contain" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </dl>
            <div className="mt-2 flex flex-wrap gap-1">
              {podeEditar && <Button variant="ghost" size="sm" onClick={() => onEditar(r)}>Editar</Button>}
              {podeExcluir && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onExcluir(r)}>Excluir</Button>}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function Campo({
  pergunta: p, respostas, imagens, habilitados, onMudar, onImagens,
}: {
  pergunta: Pergunta;
  respostas: Respostas;
  imagens: ImagemReduzida[];
  habilitados: Habilitado[];
  onMudar: (v: Resposta) => void;
  onImagens: (l: ImagemReduzida[]) => void;
}) {
  const resposta = respostas[p.id];
  const texto = typeof resposta === "string" ? resposta : "";
  const lista = Array.isArray(resposta) ? resposta : [];
  const [erroImagem, setErroImagem] = useState("");
  const [lendo, setLendo] = useState(false);
  // Foto tirada pela câmera, ainda em prévia: só entra na fila se o usuário confirmar.
  const [pendente, setPendente] = useState<File | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState("");
  useEffect(() => {
    if (!pendente) { setPrevia(""); return; }
    const url = URL.createObjectURL(pendente);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [pendente]);

  // Único caminho das imagens (escolhidas ou tiradas na hora): mesmo limite, mesma redução no navegador.
  async function adicionarImagens(escolhidos: File[]): Promise<boolean> {
    const limite = mensagemDeLimite(imagens.length, escolhidos.length, MAX_ARQUIVOS);
    if (limite) { setErroImagem(limite); return false; }
    setLendo(true);
    try {
      const reduzidas = await Promise.all(escolhidos.map(reduzirImagem));
      const { lista, erro } = juntarImagens(imagens, reduzidas, MAX_ARQUIVOS);
      setErroImagem(erro);
      if (erro) return false;
      onImagens(lista);
      onMudar(lista.map((r) => r.nome));
      return true;
    } catch (erro) {
      setErroImagem(erro instanceof Error ? erro.message : "Não foi possível ler a imagem.");
      return false;
    } finally {
      setLendo(false);
    }
  }
  const abrirCamera = () => camera.current?.click();

  if (p.habilitados) {
    return (
      <div className="space-y-1">
        {habilitados.map((h) => {
          const rotulo = `${h.nome} (${h.area})`;
          return <Marca key={`${h.empregadoId ?? "sem"}-${h.nome}`} rotulo={rotulo} marcado={lista.includes(rotulo)} onMudar={(v) => onMudar(alternar(lista, rotulo, v, p.multiplas))} />;
        })}
      </div>
    );
  }
  if (p.tipo === "multipla") {
    return (
      <div className="space-y-1">
        {p.opcoes.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" name={`r-${p.id}`} checked={texto === o} onChange={() => onMudar(o)} />{o}</label>
        ))}
      </div>
    );
  }
  if (p.tipo === "caixas") {
    return (
      <div className="space-y-1">
        {p.opcoes.map((o) => <Marca key={o} rotulo={o} marcado={lista.includes(o)} onMudar={(v) => onMudar(alternar(lista, o, v, p.multiplas))} />)}
        <p className="text-xs text-muted-foreground">{p.multiplas ? "Pode marcar mais de uma" : "Marque apenas uma"}</p>
      </div>
    );
  }
  if (p.tipo === "lista") return <ListaSuspensa pergunta={p} respostas={respostas} onMudar={onMudar} />;
  if (p.tipo === "curta") {
    return (
      <Input
        name={`curta-${p.id}`}
        {...(p.formato === "livre" ? { capitalizar: "texto" as const } : {})}
        aria-label={p.titulo}
        inputMode={p.formato === "livre" ? "text" : "decimal"}
        placeholder={{ livre: "", moeda: "R$ 0,00", inteiro: "0", decimal2: "0,00" }[p.formato]}
        value={texto}
        onChange={(e) => onMudar(aplicarFormato(e.target.value, p.formato))}
      />
    );
  }
  if (p.tipo === "data") return <Input type="date" aria-label={p.titulo} value={texto} onChange={(e) => onMudar(e.target.value)} />;
  if (p.tipo === "hora") return <Input type="time" aria-label={p.titulo} value={texto} onChange={(e) => onMudar(e.target.value)} />;
  if (p.tipo === "paragrafo") return <Textarea capitalizar="texto" aria-label={p.titulo} value={texto} onChange={(e) => onMudar(e.target.value)} rows={4} />;
  // upload: cada escolha soma às imagens já anexadas (até MAX_ARQUIVOS), todas reduzidas no navegador; cada uma pode ser removida.
  const cheio = imagens.length >= MAX_ARQUIVOS;
  const aplicar = (lista: ImagemReduzida[]) => { onImagens(lista); onMudar(lista.map((r) => r.nome)); };
  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/*"
        multiple
        disabled={cheio || lendo}
        aria-label={p.titulo}
        onChange={(e) => {
          const campo = e.currentTarget;
          const escolhidos = Array.from(campo.files ?? []);
          campo.value = ""; // o mesmo arquivo pode ser escolhido de novo depois de removido
          if (escolhidos.length) void adicionarImagens(escolhidos);
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const tirada = e.currentTarget.files?.[0] ?? null;
          e.currentTarget.value = "";
          if (!tirada) return;
          // No iOS toda captura se chama image.jpg; o nome único evita imagens iguais na lista.
          const foto = new File([tirada], `foto-${Date.now()}.${tirada.type.split("/")[1] || "jpg"}`, { type: tirada.type });
          setErroImagem("");
          setPendente(foto);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={cheio || lendo} onClick={abrirCamera}>
        Tirar foto
      </Button>
      {pendente && (
        <div className="space-y-2 rounded-md border p-2">
          <img src={previa} alt="Prévia da foto tirada" className="max-h-64 rounded-md object-contain" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={lendo} onClick={async () => { if (await adicionarImagens([pendente])) setPendente(null); }}>
              Usar foto
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={lendo} onClick={() => { setPendente(null); abrirCamera(); }}>
              Descartar e tirar outra
            </Button>
          </div>
        </div>
      )}
      {erroImagem && <p role="alert" className="text-sm text-destructive">{erroImagem}</p>}
      <ul className="flex flex-wrap gap-3">
        {imagens.map((i, n) => (
          <li key={`${n}-${i.nome}`} className="relative w-24">
            <img src={i.dataUrl} alt={i.nome} title={`${i.nome}: ${kb(i.bytesAntes)} para ${kb(i.bytesDepois)}`} className="size-24 rounded-md border object-cover" />
            <button
              type="button"
              aria-label={`Remover ${i.nome}`}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
              onClick={() => { setErroImagem(""); aplicar(imagens.filter((_, k) => k !== n)); }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{imagens.length} de {MAX_ARQUIVOS} imagens{p.obrigatoria ? ", ao menos 1 obrigatória" : ""}; todas são reduzidas no navegador antes do envio.</p>
    </div>
  );
}

function alternar(lista: string[], valor: string, marcar: boolean, varias: boolean): string[] {
  if (!marcar) return lista.filter((x) => x !== valor);
  return varias ? [...lista, valor] : [valor];
}

function Marca({ rotulo, marcado, onMudar }: { rotulo: string; marcado: boolean; onMudar: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={marcado} onCheckedChange={(v) => onMudar(v === true)} />
      <Label htmlFor={id} className="text-sm font-normal">{rotulo}</Label>
    </div>
  );
}

// Lista suspensa: opções próprias, clientes de Parâmetros > Clientes, ou municípios da UF respondida antes (com busca).
function ListaSuspensa({ pergunta: p, respostas, onMudar }: { pergunta: Pergunta; respostas: Respostas; onMudar: (v: Resposta) => void }) {
  const atual = typeof respostas[p.id] === "string" ? (respostas[p.id] as string) : "";
  const ufResposta = p.dependeDe ? respostas[p.dependeDe] : undefined;
  const sigla = typeof ufResposta === "string" ? siglaDaUf(ufResposta) : "";
  const [municipios, setMunicipios] = useState<string[]>([]);
  useEffect(() => {
    let vivo = true;
    if (p.fonte !== "municipios") return;
    if (!sigla) { setMunicipios([]); return; }
    void municipiosDaUf(sigla).then((m) => { if (vivo) setMunicipios(m); }).catch(() => { if (vivo) setMunicipios([]); });
    return () => { vivo = false; };
  }, [p.fonte, sigla]);

  // Cadastro de cliente em janela, sem sair do formulário; o cliente novo já fica escolhido ao salvar.
  const [, setAtualizacao] = useState(0);
  const [novoCliente, setNovoCliente] = useState(false);
  const [codigoNovo, setCodigoNovo] = useState("");

  const opcoes = p.fonte === "clientes" ? [SEM_CLIENTE_VINCULADO, ...listarClientes().map((c) => `${c.codigo} - ${c.nome}`)] : p.fonte === "municipios" ? municipios : p.opcoes;
  // O valor escolhido sempre aparece, mesmo além das 200 primeiras opções (cliente recém-cadastrado, por exemplo).
  const mostradas = opcoes.slice(0, 200);
  if (atual && opcoes.includes(atual) && !mostradas.includes(atual)) mostradas.push(atual);
  const { canWrite } = useAccess();
  const semUf = p.fonte === "municipios" && !sigla;
  return (
    <div className="space-y-1">
      {/* Município: uma só lista suspensa; ao digitar, ela busca entre os municípios da UF escolhida. */}
      {p.fonte === "municipios" ? (
        semUf ? (
          <Input aria-label={p.titulo} placeholder="Escolha antes a Unidade da Federação" disabled />
        ) : (
          <CampoBusca
            id={`municipio-${p.id}`}
            rotulo={p.titulo}
            placeholder="Digite para buscar o município"
            opcoes={municipios.map((m) => ({ valor: m, rotulo: m }))}
            valor={atual}
            listaNoFluxo
            onChange={(v) => onMudar(v)}
          />
        )
      ) : (
        <>
          {/* O Select zera o valor sozinho quando a lista muda (cliente recém-cadastrado); vazio nunca é uma escolha do usuário. */}
          <Select value={atual} onValueChange={(v) => { if (v) onMudar(v); }}>
            <SelectTrigger aria-label={p.titulo}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{mostradas.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          {opcoes.length > mostradas.length && <p className="text-xs text-muted-foreground">Mostrando {mostradas.length} de {opcoes.length}; refine a busca.</p>}
        </>
      )}
      {p.fonte === "clientes" && (
        <>
          <p className="text-xs text-muted-foreground">
            {opcoes.length <= 1 ? "Nenhum cliente cadastrado em Parâmetros > Clientes. " : canWrite ? "Cliente não está na lista? " : ""}
            {canWrite && <button type="button" className="font-medium text-primary underline" onClick={() => { setCodigoNovo(proximoCodigoCliente()); setNovoCliente(true); }}>Cadastrar cliente</button>}
          </p>
          <ClienteDialog
            aberto={novoCliente} onAberto={setNovoCliente} editando={null} modelo={null} codigoPrevisto={codigoNovo}
            onSalvo={(c) => { setAtualizacao((n) => n + 1); onMudar(`${c.codigo} - ${c.nome}`); }}
          />
        </>
      )}
    </div>
  );
}
