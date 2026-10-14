import { Link } from "@tanstack/react-router";
import { useId, useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/lib/access-context";
import { listarClientes } from "@/lib/clientes-demo";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import { reduzirImagem, type ImagemReduzida } from "@/lib/imagem-economica";
import { filtrarMunicipios, municipiosDaUf } from "@/lib/municipios";
import {
  ID_TIPO_DESPESA, MAX_ARQUIVOS, dadosIlegiveis, habilitadosAtivos, lerEstado, siglaDaUf, tiposDeDespesa, type Habilitado, type Pergunta,
} from "@/lib/questionario-despesas";
import { aplicarFormato, perguntasVisiveis, validarRespostas, type Resposta, type Respostas } from "@/lib/questionario-respostas";
import {
  listarRespostas, registrarResposta, removerResposta, resumoDaResposta, tipoEscolhido, type RespostaRegistrada,
} from "@/lib/respostas-despesas";

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const cartao = "rounded-xl bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:bg-card/80 sm:p-5";
const vazia = (r: Resposta | undefined) => r === undefined || (Array.isArray(r) ? r.length === 0 : r.trim() === "");

// Formulário do Questionário de Despesas, no estilo Google Forms (dec 169): cartão central, perguntas em cartões, obrigatórias
// com asterisco, Enviar com confirmação e lista de respostas para conferência. Respostas só no navegador (modo demonstração).
export function QuestionarioFormulario({ tipoInicial }: { tipoInicial?: string | undefined }) {
  const { isAdmin } = useAccess();
  const [estado] = useState(lerEstado);
  const tipos = tiposDeDespesa(estado);
  const [respostas, setRespostas] = useState<Respostas>(() => (tipoInicial && tipos.includes(tipoInicial) ? { [ID_TIPO_DESPESA]: [tipoInicial] } : {}));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [imagens, setImagens] = useState<Record<string, ImagemReduzida[]>>({});
  const [enviada, setEnviada] = useState<RespostaRegistrada | null>(null);
  const [registradas, setRegistradas] = useState<RespostaRegistrada[]>(listarRespostas);
  const [verLista, setVerLista] = useState(false);
  // Muda ao limpar: remonta os campos (inclusive o de arquivo, que o navegador guarda por conta própria).
  const [chave, setChave] = useState(0);
  const ilegivel = useMemo(() => dadosIlegiveis(), []);
  const tipoDesconhecido = !!tipoInicial && !tipos.includes(tipoInicial);
  const enviando = useRef(false);
  const { data: empregados = [], isSuccess: empregadosLidos } = useEmpregados(TODAS);
  const idsAtivos = useMemo(() => new Set(empregados.filter((e) => empregadoAtivo(e)).map((e) => e.id)), [empregados]);

  const tipo = tipoEscolhido(respostas);
  const visiveis = useMemo(() => {
    if (tipo && tipos.includes(tipo)) return perguntasVisiveis(estado, tipo, respostas);
    const inicial = estado.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
    return inicial ? [inicial] : [];
  }, [estado, tipo, tipos, respostas]);
  // Erro de pergunta que saiu da tela (troca de tipo, condição) não fica pendurado.
  const errosVisiveis = Object.fromEntries(Object.entries(erros).filter(([id]) => visiveis.some((p) => p.id === id)));
  const obrigatorias = visiveis.filter((p) => p.obrigatoria);
  const respondidas = obrigatorias.filter((p) => !vazia(respostas[p.id])).length;
  const progresso = obrigatorias.length ? Math.round((respondidas / obrigatorias.length) * 100) : 0;
  const habilitadosVisiveis = (p: Pergunta): Habilitado[] => (p.habilitados ? (empregadosLidos ? habilitadosAtivos(p.habilitados, idsAtivos) : p.habilitados) : []);

  const mudar = (id: string, valor: Resposta) => {
    setRespostas((r) => {
      const novo = { ...r, [id]: valor };
      // Quem depende desta resposta (município x UF) recomeça vazio.
      for (const p of estado.perguntas) if (p.dependeDe === id) delete novo[p.id];
      return novo;
    });
    setErros((x) => { const { [id]: _tira, ...resto } = x; return resto; });
  };

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando.current || ilegivel) return;
    const achados = validarRespostas(visiveis, respostas);
    setErros(achados);
    const primeiro = visiveis.find((p) => achados[p.id]);
    if (primeiro) {
      document.getElementById(`pergunta-${primeiro.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    enviando.current = true;
    try {
      setEnviada(registrarResposta(estado, respostas));
      setRegistradas(listarRespostas());
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar a resposta.");
    } finally {
      enviando.current = false;
    }
  }

  function preencherDeNovo() {
    setRespostas({});
    setErros({});
    setImagens({});
    setEnviada(null);
    setChave((c) => c + 1);
  }

  function excluir(r: RespostaRegistrada) {
    if (!confirm(`Excluir a resposta de ${r.tipo} (${r.data.split("-").reverse().join("/")} ${r.hora})?`)) return;
    try { removerResposta(r.id); setRegistradas(listarRespostas()); } catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir."); }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-3 sm:p-4">
      <div className={`${cartao} border-t-8 border-t-primary`}>
        <h1 className="text-2xl font-semibold">Questionário de despesas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o tipo de despesa e responda as perguntas. Campos com <span className="text-destructive">*</span> são obrigatórios.</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link to="/cadastros/veiculos-questionario-despesas" className="text-primary underline">Voltar ao cadastro de perguntas</Link>
          <button type="button" className="text-primary underline" onClick={() => setVerLista((v) => !v)}>
            {verLista ? "Ocultar respostas registradas" : `Respostas registradas (${registradas.length})`}
          </button>
        </div>
      </div>

      {ilegivel && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          As perguntas salvas neste navegador estão ilegíveis; o formulário mostra o padrão e o envio fica bloqueado para não gravar por cima.
        </p>
      )}
      {tipoDesconhecido && <p role="alert" className="text-sm text-destructive">O tipo de despesa “{tipoInicial}” não existe mais no cadastro; escolha um na primeira pergunta.</p>}
      {!tipo && !tipoDesconhecido && <p className="text-sm text-muted-foreground">Escolha o tipo de despesa para ver as demais perguntas.</p>}

      {verLista && <ListaRespostas lista={registradas} podeExcluir={isAdmin} onExcluir={excluir} />}

      {enviada ? (
        <div className={`${cartao} space-y-3`} role="status">
          <h2 className="text-xl font-semibold">Resposta registrada</h2>
          <p className="text-sm text-muted-foreground">{resumoDaResposta(enviada)}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={preencherDeNovo}>Preencher novamente</Button>
            <Button variant="outline" onClick={() => setVerLista(true)}>Ver respostas registradas</Button>
          </div>
        </div>
      ) : (
        <form key={chave} onSubmit={enviar} noValidate className="space-y-4">
          {obrigatorias.length > 0 && (
            <div className="space-y-1">
              <div role="progressbar" aria-label="Progresso do preenchimento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso} className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progresso}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{respondidas} de {obrigatorias.length} perguntas obrigatórias respondidas</p>
            </div>
          )}
          {visiveis.map((p) => (
            <div key={p.id} id={`pergunta-${p.id}`} className={`${cartao} space-y-2 ${errosVisiveis[p.id] ? "border border-destructive" : ""}`}>
              <p className="text-sm font-medium">{p.titulo}{p.obrigatoria && <span className="text-destructive"> *</span>}</p>
              <Campo
                pergunta={p} respostas={respostas} imagens={imagens[p.id] ?? []} habilitados={habilitadosVisiveis(p)}
                onMudar={(v) => mudar(p.id, v)}
                onImagens={(lista) => setImagens((x) => ({ ...x, [p.id]: lista }))}
              />
              {errosVisiveis[p.id] && <p role="alert" className="text-sm text-destructive">{errosVisiveis[p.id]}</p>}
            </div>
          ))}
          {Object.keys(errosVisiveis).length > 0 && <p role="alert" className="text-sm text-destructive">Corrija as perguntas marcadas antes de enviar.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!tipo || ilegivel}>Enviar</Button>
            <Button type="button" variant="ghost" onClick={preencherDeNovo}>Limpar formulário</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function ListaRespostas({ lista, podeExcluir, onExcluir }: { lista: RespostaRegistrada[]; podeExcluir: boolean; onExcluir: (r: RespostaRegistrada) => void }) {
  if (lista.length === 0) return <p className={`${cartao} text-sm text-muted-foreground`}>Nenhuma resposta registrada ainda.</p>;
  return (
    <ul className="space-y-2">
      {lista.map((r) => (
        <li key={r.id} className={cartao}>
          <details>
            <summary className="cursor-pointer break-words text-sm font-medium">{resumoDaResposta(r)}</summary>
            <dl className="mt-2 space-y-1 text-sm">
              {r.itens.map((i) => (
                <div key={i.perguntaId}><dt className="text-xs text-muted-foreground">{i.titulo}</dt><dd className="break-words">{i.resposta}</dd></div>
              ))}
            </dl>
            {podeExcluir && <Button variant="ghost" size="sm" className="mt-2 text-destructive" onClick={() => onExcluir(r)}>Excluir</Button>}
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
  const escolha = useRef(0);

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
  // upload
  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/*"
        multiple
        aria-label={p.titulo}
        onChange={async (e) => {
          const campo = e.currentTarget;
          const escolhidos = Array.from(campo.files ?? []);
          const minha = ++escolha.current;
          if (escolhidos.length > MAX_ARQUIVOS) {
            // Escolha demais: nada fica valendo e o campo é esvaziado para a tela não mentir.
            campo.value = "";
            onImagens([]);
            onMudar([]);
            setErroImagem(`No máximo ${MAX_ARQUIVOS} imagens.`);
            return;
          }
          try {
            const reduzidas = await Promise.all(escolhidos.map(reduzirImagem));
            if (minha !== escolha.current) return; // uma escolha mais nova já chegou
            setErroImagem("");
            onImagens(reduzidas);
            onMudar(reduzidas.map((r) => r.nome));
          } catch (erro) {
            if (minha !== escolha.current) return;
            campo.value = "";
            onImagens([]);
            onMudar([]);
            setErroImagem(erro instanceof Error ? erro.message : "Não foi possível ler a imagem.");
          }
        }}
      />
      {erroImagem && <p role="alert" className="text-sm text-destructive">{erroImagem}</p>}
      <ul className="text-xs text-muted-foreground">
        {imagens.map((i, n) => <li key={`${n}-${i.nome}`} className="break-words">{i.nome}: {kb(i.bytesAntes)} para {kb(i.bytesDepois)}</li>)}
      </ul>
      <p className="text-xs text-muted-foreground">Até {MAX_ARQUIVOS} imagens{p.obrigatoria ? ", ao menos 1 obrigatória" : ""}; reduzidas no navegador antes do envio.</p>
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
  const [busca, setBusca] = useState("");
  useEffect(() => {
    let vivo = true;
    if (p.fonte !== "municipios") return;
    setBusca("");
    if (!sigla) { setMunicipios([]); return; }
    void municipiosDaUf(sigla).then((m) => { if (vivo) setMunicipios(m); }).catch(() => { if (vivo) setMunicipios([]); });
    return () => { vivo = false; };
  }, [p.fonte, sigla]);

  // Clientes cadastrados em outra aba (link abaixo) aparecem ao voltar para o formulário, sem recarregar.
  const [, setAtualizacao] = useState(0);
  useEffect(() => {
    if (p.fonte !== "clientes") return;
    const atualizar = () => setAtualizacao((n) => n + 1);
    window.addEventListener("focus", atualizar);
    window.addEventListener("storage", atualizar);
    return () => { window.removeEventListener("focus", atualizar); window.removeEventListener("storage", atualizar); };
  }, [p.fonte]);

  const opcoes = p.fonte === "clientes" ? listarClientes().map((c) => `${c.codigo} - ${c.nome}`) : p.fonte === "municipios" ? filtrarMunicipios(municipios, busca) : p.opcoes;
  const mostradas = opcoes.slice(0, 200);
  const semUf = p.fonte === "municipios" && !sigla;
  return (
    <div className="space-y-1">
      {p.fonte === "municipios" && (
        <Input name={`busca-${p.id}`} aria-label="Buscar município" placeholder="Buscar município" value={busca} disabled={semUf} onChange={(e) => setBusca(e.target.value)} />
      )}
      <Select value={atual} onValueChange={onMudar} disabled={semUf}>
        <SelectTrigger aria-label={p.titulo}><SelectValue placeholder={semUf ? "Escolha antes a Unidade da Federação" : "Selecione"} /></SelectTrigger>
        <SelectContent>{mostradas.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
      {opcoes.length > mostradas.length && <p className="text-xs text-muted-foreground">Mostrando {mostradas.length} de {opcoes.length}; refine a busca.</p>}
      {p.fonte === "clientes" && (
        <p className="text-xs text-muted-foreground">
          {opcoes.length === 0 ? "Nenhum cliente cadastrado em Parâmetros > Clientes. " : "Cliente não está na lista? "}
          <Link to="/cadastros/clientes" target="_blank" rel="noopener" className="font-medium text-primary underline">Cadastrar cliente</Link> (abre em outra aba; a lista atualiza ao voltar).
        </p>
      )}
    </div>
  );
}
