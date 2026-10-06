import { useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adicionarAcaoManutencaoVeiculo,
  adicionarGrupoChecklistVeiculo,
  cadastrarPadraoChecklistVeiculos,
  editarGrupoChecklistVeiculo,
  removerGrupoChecklistVeiculo,
  adicionarTipoOcorrenciaVeiculo,
  cadastrarPadraoVeiculos,
  editarAcaoManutencaoVeiculo,
  editarTipoOcorrenciaVeiculo,
  removerAcaoManutencaoVeiculo,
  removerTipoOcorrenciaVeiculo,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

// `extra` é a descrição (tipos de ocorrência) ou os subitens, um por linha (ações de manutenção).
type Linha = { id: string; nome: string; extra?: string };
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
}: {
  titulo: string;
  subtitulo: string;
  singular: string;
  linhas: Linha[];
  campoExtra: CampoExtra;
  onSalvar: (id: string | null, nome: string, descricao: string) => boolean;
  onExcluir: (linha: Linha) => void;
  onPadrao: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [modelo, setModelo] = useState<Linha | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const salvando = useRef(false);
  const [travado, setTravado] = useState(false);

  function abrir(linha: Linha | null, clonar: boolean) {
    setEditando(clonar ? null : linha);
    setModelo(clonar ? linha : null);
    // Clonar: o nome é único e fica em branco; a descrição vem copiada.
    setNome(clonar ? "" : (linha?.nome ?? ""));
    setDescricao(linha?.extra ?? "");
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    setTravado(true);
    // Só solta a trava depois de o diálogo fechar ou de o erro aparecer, para o segundo clique não repetir.
    const ok = onSalvar(editando?.id ?? null, nome, descricao);
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
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={campoExtra ? 3 : 2} className="px-3 py-4 text-muted-foreground">
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
              <Input id="veiculo-lista-nome" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
            </div>
            {campoExtra && (
              <div className="space-y-1">
                <Label htmlFor="veiculo-lista-descricao">
                  {campoExtra === "subitens" ? "Subitens (um por linha)" : campoExtra === "itens" ? "Itens do check list (um por linha)" : "Descrição"}
                </Label>
                <Textarea
                  id="veiculo-lista-descricao"
                  rows={campoExtra === "descricao" ? 4 : 8}
                  maxLength={campoExtra === "descricao" ? 500 : 5000}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
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
  const { itensChecklistVeiculo } = useParametrosBase();
  const itensDe = (texto: string) => texto.split("\n");
  return (
    <ListaVeiculos
      titulo="Itens check list"
      subtitulo="Cada grupo é um tipo de veículo e uma seção (ex.: Carros de passeio · Exterior), com os itens a conferir. Os tipos SUVs, vans, pesados e ônibus somam aos grupos do tipo-base."
      singular="grupo do check list"
      linhas={itensChecklistVeiculo.map((g) => ({ id: g.id, nome: g.nome, extra: g.itens.map((i) => i.nome).join("\n") }))}
      campoExtra="itens"
      onSalvar={(id, nome, extra) =>
        executar(
          () => (id ? editarGrupoChecklistVeiculo(id, nome, itensDe(extra)) : adicionarGrupoChecklistVeiculo(nome, itensDe(extra))),
          "Grupo do check list salvo.",
        )
      }
      onExcluir={(l) => executar(() => removerGrupoChecklistVeiculo(l.id), "Grupo do check list excluído.")}
      onPadrao={() =>
        executar(() => {
          const r = cadastrarPadraoChecklistVeiculos();
          toast.success(r.grupos === 0 ? "Os itens padrão já estão cadastrados." : `${r.grupos} grupos e ${r.itens} itens padrão cadastrados.`);
        })
      }
    />
  );
}
