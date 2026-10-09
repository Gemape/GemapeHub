import { Fragment, useRef, useState } from "react";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { toast } from "sonner";

import { AcoesLinha } from "@/components/parametros/AcoesLinha";
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
  cadastrarPadraoChecklistVeiculos,
  restaurarPadroesAcoesManutencaoVeiculo,
  restaurarPadroesChecklistVeiculos,
  situacaoPadraoAcoesManutencaoVeiculo,
  situacaoPadraoChecklistVeiculos,
  type SituacaoPadraoChecklist,
  editarGrupoChecklistVeiculo,
  removerGrupoChecklistVeiculo,
  subcategoriasDa,
  TODOS_OS_TIPOS,
  adicionarTipoOcorrenciaVeiculo,
  cadastrarPadraoVeiculos,
  editarAcaoManutencaoVeiculo,
  editarTipoOcorrenciaVeiculo,
  removerAcaoManutencaoVeiculo,
  removerTipoOcorrenciaVeiculo,
} from "@/lib/parametros-base";
import { separarPorTipoVeiculo } from "@/lib/checklist-por-tipo";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// `extra` é a descrição (tipos de ocorrência) ou os subitens, um por linha (ações de manutenção).
type Linha = { id: string; nome: string; extra?: string; tipos?: string[] };
type CampoExtra = "descricao" | "subitens" | "itens" | null;

// Tela de lista de Parâmetros > Veículos (decisão 46): ações de manutenção (pai e subitens) e tipos de
// ocorrência (nome e descrição). Clonar, Editar e Excluir seguem a decisão 45.
function ListaVeiculos({
  titulo,
  subtitulo,
  singular,
  linhas,
  campoExtra,
  onSalvar,
  onExcluir,
  onPadrao,
  opcoesTipos,
  acaoExtra,
  secao = false,
  secoes,
}: {
  titulo: string;
  subtitulo: string;
  singular: string;
  linhas: Linha[];
  campoExtra: CampoExtra;
  onSalvar: (id: string | null, nome: string, descricao: string, tipos: string[]) => boolean;
  onExcluir: (linha: Linha) => void;
  onPadrao: () => void;
  // Check list (decisão 63): tipos de veículo (subcategorias de Veículos) a que o grupo se aplica.
  opcoesTipos?: { id: string; nome: string }[];
  // Botão a mais ao lado de "Cadastrar" (Restaurar padrão inicial do check list, decisão 110).
  acaoExtra?: React.ReactNode;
  // Dentro de uma página com mais de uma lista (decisão 112): sem o caminho no alto e com título de seção.
  secao?: boolean;
  // Linhas separadas em seções, com uma faixa de título por seção (decisão 113: Itens check list por tipo de veículo).
  secoes?: { chave: string; titulo: string; linhas: Linha[] }[];
}) {
  const [aberto, setAberto] = useState(false);
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
          {!secao && <p className="text-eyebrow">Parâmetros &gt; Veículos</p>}
          {secao ? <h2 className="text-xl font-bold">{titulo}</h2> : <h1 className="text-2xl font-bold">{titulo}</h1>}
          <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex gap-2">
          <Button requiresWrite variant="outline" onClick={onPadrao}>
            Cadastrar padrão
          </Button>
          {acaoExtra}
          <Button requiresWrite onClick={() => abrir(null, false)}>
            Cadastrar {singular}
          </Button>
        </div>
      </header>

      <section className="panel overflow-x-auto p-0">
        <table className="w-full text-sm">
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
                  Nada cadastrado ainda. Use “Cadastrar padrão” ou “Cadastrar {singular}”.
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
        </table>
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
            {campoExtra && (
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
    </div>
  );
}

function mensagemPadraoToast(r: { acoes: number; tipos: number }): void {
  const total = r.acoes + r.tipos;
  toast.success(total === 0 ? "Os itens padrão já estão cadastrados." : `${total} itens padrão cadastrados.`);
}

export function AcoesManutencaoVeiculoLista({ secao = false }: { secao?: boolean } = {}) {
  const { acoesManutencaoVeiculo } = useParametrosBase();
  const subitensDe = (texto: string) => texto.split("\n");
  return (
    <ListaVeiculos
      titulo="Ações de manutenção"
      subtitulo="Cada ação é um grupo (pai) com seus subitens (filhos). Ao registrar uma manutenção, escolhe-se o pai e marcam-se os filhos."
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
      acaoExtra={<RestaurarPadraoAcoes />}
      onPadrao={() => executar(() => mensagemPadraoToast(cadastrarPadraoVeiculos()))}
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
      onPadrao={() => executar(() => mensagemPadraoToast(cadastrarPadraoVeiculos()))}
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
function RestaurarPadraoInicial({
  singular,
  plural,
  situacoes,
  restaurar,
  perdas,
  feminino = false,
}: {
  singular: string;
  plural: string;
  situacoes: () => { nome: string; itens: readonly string[]; situacao: SituacaoPadraoChecklist }[];
  restaurar: (nomes: string[]) => { restaurados: number; criados: number; semTipo?: number };
  perdas?: string;
  feminino?: boolean;
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
        `Padrão inicial: ${partes.join(" e ")}.` + ((r.semTipo ?? 0) > 0 ? ` ${r.semTipo} sem o tipo de veículo em Gerais: o tipo foi mantido como estava, escolha em Editar.` : ""),
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
        Restaurar padrão inicial
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Restaurar padrão inicial</DialogTitle>
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

function RestaurarPadraoAcoes() {
  return (
    <RestaurarPadraoInicial
      singular="ação"
      feminino
      plural="ações"
      perdas="(nome e subitens) "
      situacoes={situacaoPadraoAcoesManutencaoVeiculo}
      restaurar={restaurarPadroesAcoesManutencaoVeiculo}
    />
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
      opcoesTipos={tiposDeVeiculo}
      onSalvar={(id, nome, extra, tipos) =>
        executar(
          () => (id ? editarGrupoChecklistVeiculo(id, nome, itensDe(extra), tipos) : adicionarGrupoChecklistVeiculo(nome, itensDe(extra), tipos)),
          "Grupo do check list salvo.",
        )
      }
      onExcluir={(l) => executar(() => removerGrupoChecklistVeiculo(l.id), "Grupo do check list excluído.")}
      acaoExtra={<RestaurarPadraoChecklist />}
      onPadrao={() =>
        executar(() => {
          const r = cadastrarPadraoChecklistVeiculos();
          toast.success(
            r.grupos === 0 && r.ligados === 0 && r.semTipo === 0
              ? "Os itens padrão já estão cadastrados."
              : `${r.grupos > 0 ? `${r.grupos} grupos e ${r.itens} itens padrão cadastrados.` : "Nenhum grupo novo."}${r.ligados ? ` ${r.ligados} grupos existentes foram ligados ao tipo de veículo.` : ""}${r.substituidos ? ` ${r.substituidos} grupos do padrão antigo foram substituídos.` : ""}${r.semTipo ? ` ${r.semTipo} grupos ficaram sem tipo de veículo: escolha o tipo em Editar.` : ""}`,
          );
        })
      }
    />
  );
}
