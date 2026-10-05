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
  adicionarTipoOcorrenciaVeiculo,
  cadastrarPadraoVeiculos,
  editarTipoOcorrenciaVeiculo,
  removerAcaoManutencaoVeiculo,
  removerTipoOcorrenciaVeiculo,
  renomearAcaoManutencaoVeiculo,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

type Linha = { id: string; nome: string; descricao?: string };

// Tela de lista de Parâmetros > Veículos (decisão 46): ações de manutenção (só o nome) e tipos de
// ocorrência (nome e descrição). Clonar, Editar e Excluir seguem a decisão 45.
function ListaVeiculos({
  titulo,
  subtitulo,
  singular,
  linhas,
  comDescricao,
  onSalvar,
  onExcluir,
  onPadrao,
}: {
  titulo: string;
  subtitulo: string;
  singular: string;
  linhas: Linha[];
  comDescricao: boolean;
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

  function abrir(linha: Linha | null, clonar: boolean) {
    setEditando(clonar ? null : linha);
    setModelo(clonar ? linha : null);
    // Clonar: o nome é único e fica em branco; a descrição vem copiada.
    setNome(clonar ? "" : (linha?.nome ?? ""));
    setDescricao(linha?.descricao ?? "");
    setAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando.current) return;
    salvando.current = true;
    try {
      if (onSalvar(editando?.id ?? null, nome, descricao)) setAberto(false);
    } finally {
      salvando.current = false;
    }
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
              {comDescricao && <th className="px-3 py-2">Descrição</th>}
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={comDescricao ? 3 : 2} className="px-3 py-4 text-muted-foreground">
                  Nada cadastrado ainda. Use “Cadastrar padrão” ou “Cadastrar {singular}”.
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2 font-medium">{l.nome}</td>
                {comDescricao && <td className="px-3 py-2 text-muted-foreground">{l.descricao}</td>}
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
            {comDescricao && (
              <div className="space-y-1">
                <Label htmlFor="veiculo-lista-descricao">Descrição</Label>
                <Textarea
                  id="veiculo-lista-descricao"
                  rows={4}
                  maxLength={500}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!nome.trim()}>
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
  return (
    <ListaVeiculos
      titulo="Ações de manutenção"
      subtitulo="O que pode ser feito na manutenção de um veículo (troca de óleo, pneu, filtros...)."
      singular="ação de manutenção"
      linhas={acoesManutencaoVeiculo}
      comDescricao={false}
      onSalvar={(id, nome) =>
        executar(
          () => (id ? renomearAcaoManutencaoVeiculo(id, nome) : adicionarAcaoManutencaoVeiculo(nome)),
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
      linhas={tiposOcorrenciaVeiculo}
      comDescricao
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
