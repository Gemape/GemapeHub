import { useRef, useState } from "react";
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
  ehGrupoChecklistPadrao,
  restaurarGrupoChecklistVeiculo,
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
  onRestaurar,
  restauravel,
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
  // Restaurar padrão por linha (decisão 108): só nas linhas que têm configuração inicial.
  onRestaurar?: (linha: Linha) => void;
  restauravel?: (linha: Linha) => boolean;
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
    // Clonar: o nome é único e fica em branco; a descrição vem copiada.
    setNome(clonar ? "" : (linha?.nome ?? ""));
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
          <p className="text-eyebrow">Parâmetros &gt; Veículos</p>
          <h1 className="text-2xl font-bold">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex gap-2">
          <Button requiresWrite variant="outline" onClick={onPadrao}>
            Cadastrar padrão
          </Button>
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
            {linhas.map((l) => (
              <tr key={l.id}>
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
                    {...(onRestaurar && restauravel?.(l)
                      ? {
                          onRestaurar: () => {
                            if (confirm(`Restaurar ${l.nome} ao padrão? Os itens e os tipos de veículo voltam à configuração inicial e as alterações feitas nesta linha se perdem.`)) onRestaurar(l);
                          },
                        }
                      : {})}
                    onExcluir={() => {
                      if (confirm(`Excluir ${l.nome}?`)) onExcluir(l);
                    }}
                  />
                </td>
              </tr>
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

export function AcoesManutencaoVeiculoLista() {
  const { acoesManutencaoVeiculo } = useParametrosBase();
  const subitensDe = (texto: string) => texto.split("\n");
  return (
    <ListaVeiculos
      titulo="Ações de manutenção"
      subtitulo="Cada ação é um grupo (pai) com seus subitens (filhos). Ao registrar uma manutenção, escolhe-se o pai e marcam-se os filhos."
      singular="ação de manutenção"
      linhas={acoesManutencaoVeiculo.map((a) => ({ id: a.id, nome: a.nome, extra: a.subitens.map((i) => i.nome).join("\n") }))}
      campoExtra="subitens"
      onSalvar={(id, nome, extra) =>
        executar(
          () => (id ? editarAcaoManutencaoVeiculo(id, nome, subitensDe(extra)) : adicionarAcaoManutencaoVeiculo(nome, subitensDe(extra))),
          "Ação de manutenção salva.",
        )
      }
      onExcluir={(l) => executar(() => removerAcaoManutencaoVeiculo(l.id), "Ação de manutenção excluída.")}
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

export function ChecklistVeiculoLista() {
  const parametros = useParametrosBase();
  const { itensChecklistVeiculo } = parametros;
  const itensDe = (texto: string) => texto.split("\n");
  const tiposDeVeiculo = subcategoriasDa(parametros, "cat-veiculos").map((s) => ({ id: s.id, nome: s.nome }));
  return (
    <ListaVeiculos
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
      restauravel={(l) => ehGrupoChecklistPadrao(l.nome)}
      onRestaurar={(l) =>
        executar(() => {
          const r = restaurarGrupoChecklistVeiculo(l.id);
          toast.success(
            r.tiposRestaurados
              ? `${l.nome} voltou à configuração inicial.`
              : `${l.nome} voltou à configuração inicial; o tipo de veículo não existe em Gerais e foi mantido como estava.`,
          );
        })
      }
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
