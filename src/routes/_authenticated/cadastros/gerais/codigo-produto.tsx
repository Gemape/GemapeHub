import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AcoesLinha } from "@/components/parametros/AcoesLinha";
import { Cabecalho } from "@/components/parametros/Cabecalho";
import {
  CATEGORIAS_BASE,
  DIGITOS_CODIGO,
  adicionarCodigoComCategoria,
  adicionarRegraCodigo,
  gerarCodigo,
  regrasDaCategoria,
  removerRegraCodigo,
  salvarRegraCodigo,
  type RegraCodigo,
} from "@/lib/parametros-base";
import { executar, useParametrosBase } from "@/lib/use-parametros-base";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/codigo-produto")({
  head: () => ({ meta: [{ title: "Código do produto | Patrimônio GEMAPE" }] }),
  component: CodigoProduto,
});

const selectClasse = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";
const exemplos = (regra: { sigla: string; inicial: string }) =>
  [0, 1, 2].map((i) => gerarCodigo(regra, i)).join(", ") + "…";

// Formulário aberto: novo código numa categoria, ou edição de uma regra (pela sigla atual).
// `nome` preenchido (mesmo vazio) é o Novo código com a categoria digitada; nulo é o Editar, que usa a categoria da linha.
type Aberto = { categoriaId: string; nome: string | null; sigla: string; inicial: string; editando: string | null };

function CodigoProduto() {
  const dados = useParametrosBase();
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const nomeCategoria = (id: string) => dados.categorias.find((c) => c.id === id)?.nome ?? "—";
  const previa =
    aberto && /^[A-Za-z0-9]{1,6}$/.test(aberto.sigla.trim()) && /^\d{1,4}$/.test(aberto.inicial) && Number(aberto.inicial) > 0
      ? exemplos({
          sigla: aberto.sigla.trim().toUpperCase(),
          inicial: aberto.inicial.padStart(DIGITOS_CODIGO, "0"),
        })
      : "";

  // Novo código: categoria digitada (existente ganha mais uma sigla; nome novo cria a categoria).
  function novo() {
    setAberto({ categoriaId: "", nome: "", sigla: "", inicial: "", editando: null });
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!aberto || (aberto.nome === null && !aberto.categoriaId)) return;
    const { categoriaId, nome, sigla, inicial, editando } = aberto;
    const salvou = executar(
      () =>
        nome !== null
          ? adicionarCodigoComCategoria(nome, sigla, inicial)
          : editando === null
            ? adicionarRegraCodigo(categoriaId, sigla, inicial)
            : salvarRegraCodigo(categoriaId, sigla, inicial, undefined, editando),
      editando === null ? "Código criado." : "Código salvo.",
    );
    if (salvou) setAberto(null);
  }

  const linhas = dados.categorias.flatMap((c): { c: (typeof dados.categorias)[number]; regra: RegraCodigo | null; padrao: boolean }[] => {
    const regras = regrasDaCategoria(dados.regrasCodigo, c.id);
    return regras.length ? regras.map((regra, i) => ({ c, regra, padrao: i === 0 && regras.length > 1 })) : [{ c, regra: null, padrao: false }];
  });

  return (
    <div className="space-y-5">
      <Cabecalho
        titulo="Código do produto"
        descricao="Ensina o sistema a gerar o código interno da GEMAPE: para cada categoria, uma ou mais siglas e a numeração inicial de cada uma. A numeração tem 4 dígitos (EPI-0001, EPI-0002…). No cadastro do produto, quando a categoria tem mais de uma sigla, escolhe-se qual usar; sem escolha vale a primeira."
      >
        <Button type="button" onClick={() => novo()}>
          Novo código
        </Button>
      </Cabecalho>
      {aberto && (
        <form
          onSubmit={enviar}
          className="panel grid gap-4 p-4 sm:grid-cols-[1fr_8rem_10rem_auto_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoria</Label>
            {aberto.nome !== null ? (
              <>
                <Input
                  id="categoria"
                  required
                  list="categorias-existentes"
                  autoComplete="off"
                  value={aberto.nome}
                  onChange={(e) => setAberto({ ...aberto, nome: e.target.value })}
                  placeholder="Escolha ou digite uma nova"
                />
                <datalist id="categorias-existentes">
                  {dados.categorias.map((c) => (
                    <option key={c.id} value={c.nome} />
                  ))}
                </datalist>
              </>
            ) : (
              <select
                id="categoria"
                required
                disabled={aberto.editando !== null}
                className={selectClasse}
                value={aberto.categoriaId}
                onChange={(e) => setAberto({ ...aberto, categoriaId: e.target.value })}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {dados.categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sigla">Sigla</Label>
            <Input
              id="sigla"
              required
              maxLength={6}
              value={aberto.sigla}
              onChange={(e) => setAberto({ ...aberto, sigla: e.target.value.toUpperCase() })}
              placeholder="EPI"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inicial">Numeração inicial</Label>
            <Input
              id="inicial"
              required
              inputMode="numeric"
              maxLength={DIGITOS_CODIGO}
              value={aberto.inicial}
              onChange={(e) => setAberto({ ...aberto, inicial: e.target.value.replace(/\D/g, "") })}
              placeholder="0001"
            />
          </div>
          <Button type="submit" disabled={aberto.nome === null ? !aberto.categoriaId : !aberto.nome.trim()}>
            Salvar
          </Button>
          <Button type="button" variant="outline" onClick={() => setAberto(null)}>
            Cancelar
          </Button>
          <p className="text-sm text-muted-foreground sm:col-span-5">
            {previa ? (
              <>
                Códigos gerados:{" "}
                <span className="font-mono font-medium text-foreground">{previa}</span>
              </>
            ) : (
              "Informe a sigla e a numeração inicial para ver os códigos."
            )}
          </p>
        </form>
      )}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>Numeração inicial</TableHead>
              <TableHead>Códigos gerados</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ c, regra, padrao }) => (
              <TableRow key={regra ? `${c.id}-${regra.sigla}` : c.id}>
                <TableCell className="font-medium">{nomeCategoria(c.id)}</TableCell>
                <TableCell>
                  {regra ? (
                    <>
                      {regra.sigla}
                      {padrao && <span className="ml-2 text-xs text-muted-foreground">padrão</span>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sem regra</span>
                  )}
                </TableCell>
                <TableCell>{regra?.inicial ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {regra ? exemplos(regra) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <AcoesLinha
                    rotulo={regra ? `código ${regra.sigla} de ${c.nome}` : `regra de código de ${c.nome}`}
                    onEditar={() =>
                      setAberto({ categoriaId: c.id, nome: null, sigla: regra?.sigla ?? "", inicial: regra?.inicial ?? "", editando: regra ? regra.sigla : null })
                    }
                    editarLivre
                    {...(regra
                      ? {
                          onExcluir: () => {
                            // A última regra de categoria-base não sai: a exclusão é recusada com o aviso
                            // de quais cadastros ficariam bloqueados, sem pedir confirmação.
                            const doGrupo = regrasDaCategoria(dados.regrasCodigo, c.id);
                            const ultima = doGrupo.length <= 1;
                            // Excluir a padrão passa a padrão a seguinte: o aviso diz qual.
                            const proxima = doGrupo[0] === regra ? doGrupo[1] : undefined;
                            if (
                              (CATEGORIAS_BASE[c.id] && ultima) ||
                              confirm(`Excluir o código ${regra.sigla} de ${c.nome}?${proxima ? ` A sigla ${proxima.sigla} passa a ser a padrão.` : ""}`)
                            )
                              executar(() => removerRegraCodigo(c.id, undefined, regra.sigla), "Código excluído.");
                          },
                        }
                      : {})}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
