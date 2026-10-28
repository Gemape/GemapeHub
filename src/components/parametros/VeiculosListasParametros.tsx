import { Table } from "@/components/ui/table";
import { Fragment, useRef, useState } from "react";
import { useAccess } from "@/lib/access-context";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { CadastrarPadraoSelecionado } from "@/components/parametros/CadastrarPadraoSelecionado";
import { AlertaPainelManutencao } from "@/components/parametros/AlertaPainelManutencao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adicionarAcaoManutencaoVeiculo,
  adicionarGrupoChecklistVeiculo,
  itensCriadosAcoesManutencao,
  restaurarAcoesManutencaoEscolhidas,
  excluirItensCriadosAcoesManutencao,
  restaurarPadroesChecklistVeiculos,
  situacaoPadraoAcoesComFilhos,
  situacaoPadraoChecklistVeiculos,
  type SituacaoPadraoChecklist,
  type StorageLike,
  editarGrupoChecklistVeiculo,
  removerGrupoChecklistVeiculo,
  subcategoriasDa,
  TODOS_OS_TIPOS,
  adicionarTipoOcorrenciaVeiculo,
  cadastrarTiposOcorrenciaPadrao,
  pendentesTiposOcorrenciaPadrao,
  editarAcaoManutencaoVeiculo,
  editarTipoOcorrenciaVeiculo,
  removerAcaoManutencaoVeiculo,
  removerTipoOcorrenciaVeiculo,
} from "@/lib/parametros-base";
import { EditorItensChecklist } from "@/components/parametros/EditorItensChecklist";
import { CHECKLIST_VEICULOS_PADRAO } from "@/lib/checklist-veiculos-padrao";
import { separarPorTipoVeiculo } from "@/lib/checklist-por-tipo";
import { filtrarPaisEFilhos } from "@/lib/busca-acoes-manutencao";
import { executar, useParametrosBase, validarAntes } from "@/lib/use-parametros-base";

// `extra` é a descrição (tipos de ocorrência) ou os subitens, um por linha (ações de manutenção).
type Linha = { id: string; nome: string; extra?: string; tipos?: string[] };
type CampoExtra = "descricao" | "subitens" | "itens" | null;

// Tela de lista de Parâmetros > Veículos (decisão 46): ações de manutenção (pai e subitens) e tipos de
// ocorrência (nome e descrição). Clonar, Editar e Excluir seguem a decisão 45.
// Também serve às listas de Parâmetros > Equipamentos (`eyebrow` troca o caminho no alto).
export function ListaVeiculos({
  eyebrow = "Parâmetros",
  catalogoItens,
  titulo,
  subtitulo,
  singular,
  linhas,
  campoExtra,
  onSalvar,
  onExcluir,
  padrao,
  opcoesTipos,
  acaoExtra,
  secao = false,
  secoes,
  alertaPainel = false,
  onValidar,
  textoAlerta,
}: {
  eyebrow?: string;
  // Itens do padrão, para marcar e personalizar ao cadastrar o grupo (campoExtra "itens"); sem ele, vale o campo de texto.
  catalogoItens?: { titulo: string; itens: readonly string[] }[];
  titulo: string;
  subtitulo: string;
  singular: string;
  linhas: Linha[];
  campoExtra: CampoExtra;
  onSalvar: (id: string | null, nome: string, descricao: string, tipos: string[]) => boolean;
  onExcluir: (linha: Linha) => void;
  // Sem padrao, a lista não tem o botão Cadastrar padrão (Ações de manutenção, decisão 140). Vem pronto (CadastrarPadraoSelecionado): escolhe item a item e confirma.
  padrao?: React.ReactNode;
  // Check list (decisão 63): tipos de veículo (subcategorias de Veículos) a que o grupo se aplica.
  opcoesTipos?: { id: string; nome: string }[];
  // Botão a mais ao lado de "Cadastrar" (Restaurar padrão inicial do check list, decisão 110).
  // Pode ser função: recebe `cadastrar`, que abre o cadastro por cima, com o nome já preenchido (decisão 197).
  acaoExtra?: React.ReactNode | ((cadastrar: (nomeInicial?: string) => void) => React.ReactNode);
  // Dentro de uma página com mais de uma lista (decisão 112): sem o caminho no alto e com título de seção.
  secao?: boolean;
  // Linhas separadas em seções, com uma faixa de título por seção (decisão 113: Itens check list por tipo de veículo).
  secoes?: { chave: string; titulo: string; linhas: Linha[] }[];
  // Pergunta Sim ou Não antes de gravar (Ações de manutenção, decisão 145): a alteração muda o painel de manutenção.
  alertaPainel?: boolean;
  onValidar?: (id: string | null, nome: string, extra: string, storage: StorageLike) => unknown;
  // Texto do alerta Sim/Não (alertaPainel); sem ele vale o de Veículos.
  textoAlerta?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [modelo, setModelo] = useState<Linha | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipos, setTipos] = useState<string[]>([]);
  const salvando = useRef(false);
  const [travado, setTravado] = useState(false);

  function abrir(linha: Linha | null, clonar: boolean) {
    setEditando(clonar ? null : linha);
    setModelo(clonar ? linha : null);
    // Clonar copia nome e descrição, que podem ser editados (decisão 138).
    setNome(linha?.nome ?? "");
    setDescricao(linha?.extra ?? "");
    setTipos((linha?.tipos ?? []).filter((t) => t === TODOS_OS_TIPOS || (opcoesTipos ?? []).some((o) => o.id === t)));
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    if (alertaPainel) {
      // Valida antes de perguntar: formulário inválido mostra o erro, não o alerta (decisão 149).
      if (onValidar && !validarAntes((storage) => onValidar(editando?.id ?? null, capitalizarTexto(nome), descricao, storage))) return;
      setConfirmando(true);
    } else gravar();
  }

  function gravar() {
    if (salvando.current) return;
    salvando.current = true;
    setTravado(true);
    // Só solta a trava depois de o diálogo fechar ou de o erro aparecer, para o segundo clique não repetir.
    const ok = onSalvar(editando?.id ?? null, capitalizarTexto(nome), campoExtra === "descricao" ? capitalizarTexto(descricao) : descricao, tipos);
    if (ok) setAberto(false);
    setTimeout(() => {
      salvando.current = false;
      setTravado(false);
    }, 400);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!secao && <p className="text-eyebrow">{eyebrow}</p>}
          {secao ? <h2 className="text-xl font-bold">{titulo}</h2> : <h1 className="text-2xl font-bold">{titulo}</h1>}
          <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {padrao}
          {typeof acaoExtra === "function" ? acaoExtra((nomeInicial) => { abrir(null, false); setNome(capitalizarTexto(nomeInicial ?? "")); }) : acaoExtra}
          <Button requiresWrite onClick={() => abrir(null, false)}>
            Cadastrar {singular}
          </Button>
        </div>
      </header>

      <section className="panel overflow-x-auto p-0">
        <Table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Nome</th>
              {campoExtra && <th className="px-3 py-2">{campoExtra === "subitens" ? "Subitens" : campoExtra === "itens" ? "Itens" : "Descrição"}</th>}
              {opcoesTipos && <th className="px-3 py-2">Tipo de veículo</th>}
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={(campoExtra ? 3 : 2) + (opcoesTipos ? 1 : 0)} className="px-3 py-4 text-muted-foreground">
                  Nada cadastrado ainda. {padrao ? "Use “Cadastrar padrão” ou " : "Use "}“Cadastrar {singular}”.
                </td>
              </tr>
            )}
            {(secoes ?? [{ chave: "todas", titulo: "", linhas }]).map((grupo) => (
              <Fragment key={grupo.chave}>
                {secoes && (
                  <tr className="bg-muted/50">
                    <th colSpan={(campoExtra ? 3 : 2) + (opcoesTipos ? 1 : 0)} className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide">
                      {grupo.titulo} <span className="font-normal text-muted-foreground">({grupo.linhas.length})</span>
                    </th>
                  </tr>
                )}
                {grupo.linhas.map((l) => {
                  const chave = grupo.chave;
                  return (
                    <tr key={`${chave}-${l.id}`}>
                      <td className="px-3 py-2 font-medium">{l.nome}</td>
                      {campoExtra && (
                        <td className="px-3 py-2 text-muted-foreground">
                          {campoExtra === "subitens" || campoExtra === "itens" ? (l.extra ?? "").split("\n").filter(Boolean).join(" · ") : l.extra}
                        </td>
                      )}
                      {opcoesTipos && (
                        <td className="px-3 py-2 text-muted-foreground">
                          {l.tipos?.includes(TODOS_OS_TIPOS)
                            ? "Todos os tipos"
                            : (l.tipos ?? []).map((t) => opcoesTipos.find((o) => o.id === t)?.nome).filter(Boolean).join(", ") || "Nenhum (não aparece em check list)"}
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <AcoesLinha
                          rotulo={l.nome}
                          onClonar={() => abrir(l, true)}
                          onEditar={() => abrir(l, false)}
                          onExcluir={() => {
                            if (confirm(`Excluir ${l.nome}?`)) onExcluir(l);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </Table>
      </section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando ? `Editar ${singular}` : modelo ? `Clonar ${singular}` : `Cadastrar ${singular}`}
            </DialogTitle>
            <DialogDescription>
              {modelo ? `Cópia de ${modelo.nome}: informe um nome novo.` : "O nome não pode repetir."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="veiculo-lista-nome">Nome</Label>
              <Input id="veiculo-lista-nome" capitalizar="texto" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
            </div>
            {campoExtra === "itens" && catalogoItens && (
              <EditorItensChecklist id="veiculo-lista-descricao" value={descricao} onChange={setDescricao} catalogo={catalogoItens} />
            )}
            {campoExtra && !(campoExtra === "itens" && catalogoItens) && (
              <div className="space-y-1">
                <Label htmlFor="veiculo-lista-descricao">
                  {campoExtra === "subitens" ? "Subitens (um por linha)" : campoExtra === "itens" ? "Itens do check list (um por linha)" : "Descrição"}
                </Label>
                <Textarea
                  id="veiculo-lista-descricao"
                  {...(campoExtra === "descricao" ? { capitalizar: "texto" as const } : {})}
                  rows={campoExtra === "descricao" ? 4 : 8}
                  maxLength={campoExtra === "descricao" ? 500 : 5000}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            )}
            {opcoesTipos && (
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Tipo de veículo</legend>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={tipos.includes(TODOS_OS_TIPOS)}
                    onCheckedChange={(v) => setTipos(v === true ? [TODOS_OS_TIPOS] : [])}
                  />
                  Todos os tipos de veículo
                </label>
                {!tipos.includes(TODOS_OS_TIPOS) && (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {opcoesTipos.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={tipos.includes(o.id)}
                          onCheckedChange={(v) => setTipos((t) => (v === true ? [...t, o.id] : t.filter((x) => x !== o.id)))}
                        />
                        {o.nome}
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">O check list do veículo traz os grupos do tipo dele (subcategoria de Veículos) e os de todos os tipos.</p>
              </fieldset>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!nome.trim() || travado}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertaPainelManutencao
        aberto={confirmando}
        {...(textoAlerta ? { texto: textoAlerta } : {})}
        onSim={() => {
          setConfirmando(false);
          gravar();
        }}
        onNao={() => setConfirmando(false)}
      />
    </div>
  );
}

export function AcoesManutencaoVeiculoLista({ secao = false }: { secao?: boolean } = {}) {
  const { acoesManutencaoVeiculo } = useParametrosBase();
  const subitensDe = (texto: string) => texto.split("\n");
  return (
    <ListaVeiculos
      titulo="Ações de manutenção"
      subtitulo="Cada ação é um grupo (pai) com seus subitens (filhos). Ao registrar uma manutenção, escolhe-se o pai e marcam-se os filhos. Todo grupo tem também o item Outros, de descrição aberta."
      singular="ação de manutenção"
      secao={secao}
      linhas={acoesManutencaoVeiculo.map((a) => ({ id: a.id, nome: a.nome, extra: a.subitens.map((i) => i.nome).join("\n") }))}
      campoExtra="subitens"
      onSalvar={(id, nome, extra) =>
        executar(
          () => (id ? editarAcaoManutencaoVeiculo(id, nome, subitensDe(extra)) : adicionarAcaoManutencaoVeiculo(nome, subitensDe(extra))),
          "Ação de manutenção salva.",
        )
      }
      onExcluir={(l) => executar(() => removerAcaoManutencaoVeiculo(l.id), "Ação de manutenção excluída.")}
      acaoExtra={(cadastrar) => <RestaurarPadraoAcoes aoCadastrar={cadastrar} />}
      alertaPainel
      onValidar={(id, nome, extra, storage) =>
        id ? editarAcaoManutencaoVeiculo(id, nome, subitensDe(extra), storage) : adicionarAcaoManutencaoVeiculo(nome, subitensDe(extra), storage)
      }
    />
  );
}

export function TiposOcorrenciaVeiculoLista() {
  const { tiposOcorrenciaVeiculo } = useParametrosBase();
  return (
    <ListaVeiculos
      titulo="Tipos de ocorrência"
      subtitulo="As possibilidades de ocorrência com veículos, cada uma com a sua descrição."
      singular="tipo de ocorrência"
      linhas={tiposOcorrenciaVeiculo.map((t) => ({ id: t.id, nome: t.nome, extra: t.descricao }))}
      campoExtra="descricao"
      onSalvar={(id, nome, descricao) =>
        executar(
          () => (id ? editarTipoOcorrenciaVeiculo(id, nome, descricao) : adicionarTipoOcorrenciaVeiculo(nome, descricao)),
          "Tipo de ocorrência salvo.",
        )
      }
      onExcluir={(l) => executar(() => removerTipoOcorrenciaVeiculo(l.id), "Tipo de ocorrência excluído.")}
      padrao={<CadastrarPadraoSelecionado singular="tipo de ocorrência" plural="tipos de ocorrência" pendentes={pendentesTiposOcorrenciaPadrao} cadastrar={(nomes) => cadastrarTiposOcorrenciaPadrao(nomes)} />}
    />
  );
}

const ROTULO_SITUACAO: Record<SituacaoPadraoChecklist, string> = {
  igual: "Igual ao padrão",
  alterado: "Alterado",
  ausente: "Não cadastrado",
};

// Restaurar padrão inicial (decisões 110 e 111): mostra todos os itens do padrão inicial da lista, o
// responsável marca os que quer restaurar e, depois de confirmar, tudo é gravado de uma vez.
export function RestaurarPadraoInicial({
  singular,
  plural,
  situacoes,
  restaurar,
  perdas,
  feminino = false,
  rotulo = "Restaurar configurações iniciais",
  semTipoTexto = "sem o tipo de veículo em Gerais: o tipo foi mantido como estava, escolha em Editar.",
}: {
  singular: string;
  plural: string;
  situacoes: () => { nome: string; itens: readonly string[]; situacao: SituacaoPadraoChecklist }[];
  restaurar: (nomes: string[]) => { restaurados: number; criados: number; semTipo?: number };
  perdas?: string;
  feminino?: boolean;
  // Nome do botão e da janela (Ações de manutenção usa "Restaurar configurações iniciais", decisão 141).
  rotulo?: string;
  // Texto do aviso de grupo restaurado sem o tipo (cada módulo diz onde o tipo é cadastrado).
  semTipoTexto?: string;
}) {
  useParametrosBase(); // atualiza a lista quando o cadastro muda
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const salvando = useRef(false);
  const [travado, setTravado] = useState(false);
  const padroes = aberto ? situacoes() : [];

  function abrir() {
    setMarcados([]);
    setAberto(true);
  }

  const alternar = (nome: string, marcar: boolean) => setMarcados((atual) => (marcar ? [...atual, nome] : atual.filter((n) => n !== nome)));

  function salvar() {
    if (salvando.current || marcados.length === 0) return;
    const alterados = padroes.filter((p) => marcados.includes(p.nome) && p.situacao === "alterado").length;
    const novos = padroes.filter((p) => marcados.includes(p.nome) && p.situacao === "ausente").length;
    const aviso =
      `Restaurar ${marcados.length} ${marcados.length === 1 ? singular : plural} ao padrão inicial?` +
      (alterados > 0 ? ` As alterações feitas em ${alterados} ${alterados === 1 ? singular : plural} ${perdas ?? ""}se perdem.` : "") +
      (novos > 0 ? ` ${novos} ${novos === 1 ? singular : plural} ${feminino ? (novos === 1 ? "excluída será cadastrada" : "excluídas serão cadastradas") : novos === 1 ? "excluído será cadastrado" : "excluídos serão cadastrados"} de novo.` : "");
    if (!confirm(aviso)) return;
    salvando.current = true;
    setTravado(true);
    const ok = executar(() => {
      const r = restaurar(marcados);
      const partes = [r.restaurados > 0 ? `${r.restaurados} ${r.restaurados === 1 ? "restaurado" : "restaurados"}` : "", r.criados > 0 ? `${r.criados} ${r.criados === 1 ? "cadastrado" : "cadastrados"} de novo` : ""].filter(Boolean);
      toast.success(
        `Padrão inicial: ${partes.join(" e ")}.` + ((r.semTipo ?? 0) > 0 ? ` ${r.semTipo} ${semTipoTexto}` : ""),
      );
    });
    if (ok) setAberto(false);
    setTimeout(() => {
      salvando.current = false;
      setTravado(false);
    }, 400);
  }

  return (
    <>
      <Button requiresWrite variant="outline" onClick={abrir}>
        {rotulo}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{rotulo}</DialogTitle>
            <DialogDescription>
              Estes são todos os itens do padrão inicial desta lista. Marque os que quer restaurar: voltam ao padrão, e o que foi excluído é cadastrado de novo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{marcados.length} de {padroes.length} marcados</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMarcados(padroes.map((p) => p.nome))}>
                Marcar todos
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMarcados([])}>
                Desmarcar todos
              </Button>
            </div>
          </div>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-2">
            {padroes.map((p, n) => (
              <label key={p.nome} htmlFor={`restaurar-padrao-${n}`} className="flex cursor-pointer items-start gap-3 rounded px-2 py-1.5 hover:bg-muted/60">
                <Checkbox id={`restaurar-padrao-${n}`} className="mt-0.5" checked={marcados.includes(p.nome)} onCheckedChange={(v) => alternar(p.nome, v === true)} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{p.nome}</span>
                    <span className={p.situacao === "igual" ? "text-xs text-muted-foreground" : "text-xs font-semibold"}>{ROTULO_SITUACAO[p.situacao]}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{p.itens.join(" · ")}</span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} disabled={marcados.length === 0 || travado}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RestaurarPadraoChecklist() {
  return (
    <RestaurarPadraoInicial
      singular="grupo"
      plural="grupos"
      perdas="(nome, itens e tipos de veículo) "
      situacoes={situacaoPadraoChecklistVeiculos}
      restaurar={restaurarPadroesChecklistVeiculos}
    />
  );
}

// Restaurar configurações iniciais das Ações de manutenção (decisão 142): lista os pais e os filhos do padrão inicial,
// cada um com o seu checkbox, e restaura só o que foi marcado, tudo de uma vez.
function RestaurarPadraoAcoes({ aoCadastrar }: { aoCadastrar: (nomeInicial?: string) => void }) {
  useParametrosBase(); // atualiza a lista quando o cadastro muda
  const [aberto, setAberto] = useState(false);
  // Pai marcado = chave presente; o valor são os filhos marcados dele.
  const [marcados, setMarcados] = useState<Record<string, string[]>>({});
  const salvando = useRef(false);
  const [travado, setTravado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null); // texto do que será feito, enquanto o alerta Sim/Não está aberto
  const padroes = aberto ? situacaoPadraoAcoesComFilhos() : [];
  const itensCriados = aberto ? itensCriadosAcoesManutencao() : [];
  // Busca da ação ou do subitem (decisão 197); o que está marcado não se perde ao buscar.
  const [busca, setBusca] = useState("");
  const visiveis = filtrarPaisEFilhos(padroes, busca);
  const criadosVisiveis = filtrarPaisEFilhos(itensCriados, busca);
  // Itens criados por você marcados para exclusão (decisão 151); só o Administrador exclui. Editar continua na lista.
  const { isAdmin } = useAccess();
  const [conferidos, setConferidos] = useState<string[]>([]);
  const alternarConferido = (chave: string, marcar: boolean) => setConferidos((a) => (marcar ? [...a.filter((c) => c !== chave), chave] : a.filter((c) => c !== chave)));
  const totalFilhos = Object.values(marcados).reduce((n, f) => n + f.length, 0);
  const totalPais = Object.keys(marcados).length;
  const totalCriados = conferidos.length;

  function abrir() {
    setMarcados({});
    setConferidos([]);
    setBusca("");
    setAberto(true);
  }
  // Marcar o pai marca os filhos que estão na tela (todos, quando não há busca).
  const marcarPai = (nome: string, marcar: boolean, filhosNaTela: string[]) =>
    setMarcados((atual) => {
      const { [nome]: _tirado, ...resto } = atual;
      return marcar ? { ...resto, [nome]: [...new Set([...(atual[nome] ?? []), ...filhosNaTela])] } : resto;
    });
  // Marcar um filho marca também o pai dele; desmarcar o último filho mantém o pai marcado.
  const marcarFilho = (pai: string, filho: string, marcar: boolean) =>
    setMarcados((atual) => {
      const filhos = atual[pai] ?? [];
      return { ...atual, [pai]: marcar ? [...filhos.filter((f) => f !== filho), filho] : filhos.filter((f) => f !== filho) };
    });

  function salvar() {
    if (salvando.current || (totalPais === 0 && totalCriados === 0)) return;
    const alterados = padroes.filter((p) => p.nome in marcados && p.situacao === "alterado").length;
    const novos = padroes.filter((p) => p.nome in marcados && p.situacao === "ausente").length;
    const exclusao = totalCriados > 0 ? `Excluir ${totalCriados} ${totalCriados === 1 ? "item criado por você" : "itens criados por você"}? Não dá para desfazer.` : "";
    const texto = totalPais === 0 ? exclusao : (exclusao ? `${exclusao} ` : "") +
      `Restaurar ${totalPais} ${totalPais === 1 ? "ação" : "ações"} e ${totalFilhos} ${totalFilhos === 1 ? "subitem" : "subitens"} ao padrão inicial?` +
      (alterados > 0 ? ` O nome de ${alterados} ${alterados === 1 ? "ação volta" : "ações voltam"} ao inicial e os subitens marcados são restaurados; os não marcados ficam como estão.` : "") +
      (novos > 0 ? ` ${novos} ${novos === 1 ? "excluída será cadastrada" : "excluídas serão cadastradas"} de novo.` : "");
    setAviso(texto);
  }

  function gravar() {
    if (salvando.current) return;
    setAviso(null);
    // Excluir e restaurar valem juntos: ensaia os dois numa cópia, para um erro na restauração não deixar só a exclusão gravada.
    const escolhas = Object.entries(marcados).map(([nome, filhos]) => ({ nome, filhos }));
    if (totalCriados > 0 && totalPais > 0 && !validarAntes((storage) => {
      excluirItensCriadosAcoesManutencao(conferidos, storage);
      restaurarAcoesManutencaoEscolhidas(escolhas, storage);
    })) return;
    salvando.current = true;
    setTravado(true);
    const ok = executar(() => {
      if (totalCriados > 0) {
        const e = excluirItensCriadosAcoesManutencao(conferidos);
        toast.success(`Excluídos: ${e.acoes} ${e.acoes === 1 ? "ação" : "ações"} e ${e.subitens} ${e.subitens === 1 ? "subitem" : "subitens"} criados por você.`);
        if (totalPais === 0) return;
      }
      const r = restaurarAcoesManutencaoEscolhidas(Object.entries(marcados).map(([nome, filhos]) => ({ nome, filhos })));
      const partes = [r.restaurados > 0 ? `${r.restaurados} ${r.restaurados === 1 ? "ação restaurada" : "ações restauradas"}` : "", r.criados > 0 ? `${r.criados} ${r.criados === 1 ? "cadastrada" : "cadastradas"} de novo` : ""].filter(Boolean);
      toast.success(`Configurações iniciais: ${partes.join(" e ")}, com ${r.filhos} ${r.filhos === 1 ? "subitem" : "subitens"}.`);
    });
    if (ok) setAberto(false);
    setTimeout(() => {
      salvando.current = false;
      setTravado(false);
    }, 400);
  }

  return (
    <>
      <Button requiresWrite variant="outline" onClick={abrir}>
        Restaurar configurações iniciais
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Restaurar configurações iniciais</DialogTitle>
            <DialogDescription>
              Marque as ações (pais) e os subitens (filhos) do padrão inicial que quer restaurar. Não é preciso restaurar todos os filhos: os não marcados ficam como estão, e o que foi excluído é cadastrado de novo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground" data-testid="restaurar-contagem">
              {totalPais} de {padroes.length} ações e {totalFilhos} subitens marcados
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMarcados((atual) => ({ ...atual, ...Object.fromEntries(visiveis.map(({ pai, filhos }) => [pai.nome, [...new Set([...(atual[pai.nome] ?? []), ...filhos.map((f) => f.nome)])]])) }))}
              >
                Marcar todos
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMarcados((atual) => (busca.trim() ? Object.fromEntries(Object.entries(atual).filter(([nome]) => !visiveis.some((v) => v.pai.nome === nome))) : {}))}>
                Desmarcar todos
              </Button>
            </div>
          </div>
          <Input
            type="search"
            aria-label="Buscar ação ou subitem"
            placeholder="Buscar ação ou subitem (ex.: pastilha, suspensao, óleo)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca.trim() && visiveis.length === 0 && criadosVisiveis.length === 0 && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground" role="status">
              Nenhuma ação ou subitem encontrado para “{busca.trim()}”.
              {" "}Não achou a ação de manutenção?{" "}
              <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => aoCadastrar(busca.trim())}>
                Cadastrar a ação
              </button>
              . Ao salvar, você volta para esta busca.
            </p>
          )}
          <ul className="grid max-h-[55vh] gap-3 overflow-y-auto md:grid-cols-2">
            {visiveis.map(({ pai: p, filhos }) => { const n = padroes.indexOf(p); return (
              <li key={p.nome} className="space-y-2 rounded-md border p-3">
                <label htmlFor={`restaurar-pai-${n}`} className="flex cursor-pointer items-start gap-2">
                  <Checkbox id={`restaurar-pai-${n}`} className="mt-0.5" checked={p.nome in marcados} onCheckedChange={(v) => marcarPai(p.nome, v === true, filhos.map((f) => f.nome))} />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{p.nome}</span>
                    <span className={p.situacao === "igual" ? "text-xs text-muted-foreground" : "text-xs font-semibold"}>{ROTULO_SITUACAO[p.situacao]}</span>
                  </span>
                </label>
                <ul className="space-y-1 pl-6">
                  {filhos.map((f) => { const m = p.filhos.indexOf(f); return (
                    <li key={f.nome}>
                      <label htmlFor={`restaurar-filho-${n}-${m}`} className="flex cursor-pointer items-start gap-2 text-xs">
                        <Checkbox id={`restaurar-filho-${n}-${m}`} className="mt-0.5 size-3.5" checked={marcados[p.nome]?.includes(f.nome) ?? false} onCheckedChange={(v) => marcarFilho(p.nome, f.nome, v === true)} />
                        <span>
                          {f.nome}
                          {!f.existe && <span className="ml-1 font-semibold">(não cadastrado)</span>}
                        </span>
                      </label>
                    </li>
                  ); })}
                </ul>
              </li>
            ); })}
          </ul>
          {criadosVisiveis.length > 0 && (
            <section className="space-y-2" data-testid="restaurar-criados">
              <h3 className="text-sm font-semibold">Criados por você</h3>
              <p className="text-xs text-muted-foreground">{isAdmin ? "Ações e subitens que não vieram do padrão inicial. Marque os que quer excluir e clique em Salvar. Para editar, use Editar na lista de ações." : "Ações e subitens que não vieram do padrão inicial. Só o Administrador pode excluir; para editar, use Editar na lista de ações."}</p>
              <ul className="grid gap-3 md:grid-cols-2">
                {criadosVisiveis.map(({ pai: item, filhos }) => (
                  <li key={item.id} className="space-y-2 rounded-md border border-dashed p-3">
                    <label htmlFor={`criado-pai-${item.id}`} className="flex cursor-pointer items-start gap-2">
                      {isAdmin && <Checkbox id={`criado-pai-${item.id}`} className="mt-0.5" checked={conferidos.includes(item.id)} onCheckedChange={(v) => alternarConferido(item.id, v === true)} />}
                      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{item.nome}</span>
                        <span className="text-xs text-muted-foreground">{item.doPadrao ? "Subitens criados em ação do padrão" : "Ação criada por você"}</span>
                      </span>
                    </label>
                    <ul className="space-y-1 pl-6">
                      {filhos.map((f) => (
                        <li key={f.id}>
                          <label htmlFor={`criado-filho-${f.id}`} className="flex cursor-pointer items-start gap-2 text-xs">
                            {isAdmin && <Checkbox id={`criado-filho-${f.id}`} className="mt-0.5 size-3.5" checked={conferidos.includes(f.id)} onCheckedChange={(v) => alternarConferido(f.id, v === true)} />}
                            <span>{f.nome}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvar} disabled={(totalPais === 0 && totalCriados === 0) || travado}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertaPainelManutencao aberto={aviso !== null} detalhe={aviso ?? undefined} onSim={gravar} onNao={() => setAviso(null)} />
    </>
  );
}

export function ChecklistVeiculoLista({ secao = false }: { secao?: boolean } = {}) {
  const parametros = useParametrosBase();
  const { itensChecklistVeiculo } = parametros;
  const itensDe = (texto: string) => texto.split("\n");
  const tiposDeVeiculo = subcategoriasDa(parametros, "cat-veiculos").map((s) => ({ id: s.id, nome: s.nome }));
  const linhaDe = (g: (typeof itensChecklistVeiculo)[number]) => ({ id: g.id, nome: g.nome, extra: g.itens.map((i) => i.nome).join("\n"), tipos: g.tiposVeiculo });
  return (
    <ListaVeiculos
      secao={secao}
      secoes={separarPorTipoVeiculo(itensChecklistVeiculo, tiposDeVeiculo).map((x) => ({ chave: x.chave, titulo: x.titulo, linhas: x.itens.map(linhaDe) }))}
      titulo="Itens check list"
      subtitulo="Cada grupo é um tipo de veículo e uma seção (ex.: Veículos leves · Mecânica), com os itens a conferir. O check list do veículo traz os grupos ligados ao tipo dele (subcategoria de Veículos) e os de todos os tipos."
      singular="grupo do check list"
      linhas={itensChecklistVeiculo.map((g) => ({ id: g.id, nome: g.nome, extra: g.itens.map((i) => i.nome).join("\n"), tipos: g.tiposVeiculo }))}
      campoExtra="itens"
      catalogoItens={CHECKLIST_VEICULOS_PADRAO.map((g) => ({ titulo: g.nome, itens: g.itens }))}
      opcoesTipos={tiposDeVeiculo}
      onSalvar={(id, nome, extra, tipos) =>
        executar(
          () => (id ? editarGrupoChecklistVeiculo(id, nome, itensDe(extra), tipos) : adicionarGrupoChecklistVeiculo(nome, itensDe(extra), tipos)),
          "Grupo do check list salvo.",
        )
      }
      onExcluir={(l) => executar(() => removerGrupoChecklistVeiculo(l.id), "Grupo do check list excluído.")}
      acaoExtra={<RestaurarPadraoChecklist />}
    />
  );
}
