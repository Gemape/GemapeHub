import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import { AREAS_VIAGEM, type AreaViagem } from "@/lib/questionario-despesas";

const normalizar = (t: string) => t.trim().toLocaleLowerCase("pt-BR");

// Caixa dupla de empregados (decisões 299 e 308), usada em Parâmetros > Viagens e em Parâmetros > Veículos > Parâmetros Específicos. À esquerda, todos os empregados
// ativos (quem já foi incluído continua nela, marcado como habilitado); a inclusão vai da esquerda para a direita; à direita, os escolhidos, cada um com a sua área (Oficina, PCM ou Administrativo). Mover entre as caixas só vale ao Salvar.
// Quem guarda a lista é quem usa o componente (`carregar` e `gravar`): as duas telas têm listas independentes.
export type PropsCaixaDupla<A extends string = AreaViagem> = {
  idBase: string;
  titulo: string;
  descricao: string;
  tituloDireita: string;
  mensagemSalvo: string;
  // Dentro de uma página que já tem cabeçalho (Parâmetros Específicos de Veículos): só o título da seção, sem o texto pequeno do card.
  secao?: boolean;
  // Numa janela que já tem título e texto: sem cabeçalho próprio.
  semCabecalho?: boolean;
  // Quem hospeda a caixa (a janela do questionário) é avisado de que há alteração ainda não salva, para pedir confirmação antes de fechar.
  aoMudarAlterado?: (alterado: boolean) => void;
  // Áreas oferecidas ao lado de cada nome; sem esta propriedade valem as de Viagens e Veículos. A primeira é a que o empregado recebe ao ser habilitado.
  areas?: readonly A[];
  carregar: () => HabilitadoDe<A>[];
  gravar: (lista: HabilitadoDe<A>[]) => void;
};
type HabilitadoDe<A extends string> = { empregadoId: string | null; nome: string; area: A };

export function CaixaDuplaEmpregados<A extends string = AreaViagem>({ idBase, titulo, descricao, tituloDireita, mensagemSalvo, secao = false, semCabecalho = false, aoMudarAlterado, areas = AREAS_VIAGEM as unknown as readonly A[], carregar, gravar }: PropsCaixaDupla<A>) {
  const { canWrite } = useAccess();
  const { data: empregados = [], isLoading } = useEmpregados(TODAS);
  const ativos = useMemo(() => empregados.filter((e) => empregadoAtivo(e)), [empregados]);
  const [salvos, setSalvos] = useState<HabilitadoDe<A>[]>(carregar);
  const [habilitados, setHabilitados] = useState<HabilitadoDe<A>[]>(salvos);
  const [buscaEsq, setBuscaEsq] = useState("");
  const [buscaDir, setBuscaDir] = useState("");
  const [marcadosEsq, setMarcadosEsq] = useState<string[]>([]);
  const [marcadosDir, setMarcadosDir] = useState<string[]>([]);

  const chaveDe = (h: HabilitadoDe<A>) => h.empregadoId ?? `nome:${normalizar(h.nome)}`;
  const jaHabilitado = new Set(habilitados.flatMap((h) => [h.empregadoId, normalizar(h.nome)]));
  const idsAtivos = new Set(ativos.map((e) => e.id));
  const incluido = (e: { id: string; nome: string }) => jaHabilitado.has(e.id) || jaHabilitado.has(normalizar(e.nome));
  // A esquerda lista todos os empregados ativos; quem já foi incluído continua nela, sem poder ser marcado de novo.
  const aEsquerda = ativos
    .filter((e) => normalizar(e.nome).includes(normalizar(buscaEsq)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const aIncluir = aEsquerda.filter((e) => !incluido(e));
  const aDireita = habilitados
    .filter((h) => normalizar(h.nome).includes(normalizar(buscaDir)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  // Tirar e recolocar o mesmo empregado muda a ordem da lista sem mudar nada: a comparação ignora a ordem.
  const assinatura = (l: HabilitadoDe<A>[]) => JSON.stringify(l.map((h) => [chaveDe(h), h.area]).sort());
  const alterado = assinatura(habilitados) !== assinatura(salvos);
  useEffect(() => { aoMudarAlterado?.(alterado); }, [alterado, aoMudarAlterado]);

  const alternar = (lista: string[], chave: string) => (lista.includes(chave) ? lista.filter((c) => c !== chave) : [...lista, chave]);
  const habilitar = (ids: string[]) => {
    const novos = ativos.filter((e) => ids.includes(e.id)).map((e): HabilitadoDe<A> => ({ empregadoId: e.id, nome: e.nome, area: areas[0] as A }));
    if (novos.length === 0) return;
    setHabilitados((atual) => [...atual, ...novos]);
    setMarcadosEsq((m) => m.filter((id) => !ids.includes(id)));
  };
  const desabilitar = (chaves: string[]) => {
    setHabilitados((atual) => atual.filter((h) => !chaves.includes(chaveDe(h))));
    setMarcadosDir((m) => m.filter((c) => !chaves.includes(c)));
  };
  const mudarArea = (chave: string, area: A) => setHabilitados((atual) => atual.map((h) => (chaveDe(h) === chave ? { ...h, area } : h)));

  function salvar() {
    try {
      gravar(habilitados);
      setSalvos(habilitados);
      toast.success(mensagemSalvo);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar.");
    }
  }
  function descartar() {
    setHabilitados(salvos);
    setMarcadosEsq([]);
    setMarcadosDir([]);
  }

  return (
    <div className={secao ? "max-w-5xl space-y-4" : "mx-auto max-w-5xl space-y-4 p-4"}>
      {semCabecalho ? null : secao ? (
        <header>
          <h2 id={`${idBase}-titulo`} className="text-lg font-semibold">{titulo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </header>
      ) : (
        <header>
          <EyebrowDoCard fallback="Parâmetros" />
          <h1 className="text-xl font-semibold">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </header>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
        <section className="panel flex min-h-80 min-w-0 flex-col gap-2 p-3" aria-labelledby={`${idBase}-todos`}>
          <h3 id={`${idBase}-todos`} className="text-sm font-semibold">Todos os empregados <span className="font-normal text-muted-foreground">({aEsquerda.length})</span></h3>
          <Input aria-label="Buscar entre todos os empregados" placeholder="Buscar pelo nome" value={buscaEsq} onChange={(e) => setBuscaEsq(e.target.value)} />
          <ul className="max-h-96 flex-1 space-y-0.5 overflow-y-auto rounded-md border p-1" aria-label="Todos os empregados ativos">
            {isLoading && <li className="p-2 text-sm text-muted-foreground">Carregando...</li>}
            {!isLoading && aEsquerda.length === 0 && <li className="p-2 text-sm text-muted-foreground">{buscaEsq.trim() ? "Nenhum empregado encontrado." : "Nenhum empregado ativo."}</li>}
            {aEsquerda.map((e) => {
              const ja = incluido(e);
              return (
                <li key={e.id} onDoubleClick={() => canWrite && !ja && habilitar([e.id])}>
                  <label className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${ja ? "text-muted-foreground" : "cursor-pointer hover:bg-muted/60"}`}>
                    <Checkbox checked={ja || marcadosEsq.includes(e.id)} disabled={!canWrite || ja} onCheckedChange={() => setMarcadosEsq((m) => alternar(m, e.id))} />
                    <span className="min-w-0 flex-1 truncate">{e.nome}</span>
                    {ja && <span className="text-xs">já habilitado</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-row items-center justify-center gap-2 md:flex-col" role="group" aria-label="Mover empregados entre as caixas">
          <Button type="button" variant="outline" size="icon" aria-label="Habilitar os empregados marcados" title="Habilitar os marcados" disabled={!canWrite || marcadosEsq.length === 0} onClick={() => habilitar(marcadosEsq)}><ChevronRight className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Habilitar todos os empregados da lista" title="Habilitar todos os que aparecem na lista" disabled={!canWrite || aIncluir.length === 0} onClick={() => habilitar(aIncluir.map((e) => e.id))}><ChevronsRight className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Tirar os habilitados marcados" title="Tirar os marcados" disabled={!canWrite || marcadosDir.length === 0} onClick={() => desabilitar(marcadosDir)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Tirar todos os habilitados da lista" title="Tirar todos os que aparecem na lista" disabled={!canWrite || aDireita.length === 0} onClick={() => desabilitar(aDireita.map(chaveDe))}><ChevronsLeft className="h-4 w-4" /></Button>
        </div>

        <section className="panel flex min-h-80 min-w-0 flex-col gap-2 p-3" aria-labelledby={`${idBase}-escolhidos`}>
          <h3 id={`${idBase}-escolhidos`} className="text-sm font-semibold">{tituloDireita} <span className="font-normal text-muted-foreground">({habilitados.length})</span></h3>
          <Input aria-label="Buscar entre os habilitados" placeholder="Buscar pelo nome" value={buscaDir} onChange={(e) => setBuscaDir(e.target.value)} />
          <ul className="max-h-96 flex-1 space-y-0.5 overflow-y-auto rounded-md border p-1" aria-label="Empregados habilitados">
            {aDireita.length === 0 && <li className="p-2 text-sm text-muted-foreground">{buscaDir.trim() ? "Nenhum habilitado encontrado." : "Nenhum empregado habilitado ainda."}</li>}
            {aDireita.map((h) => {
              const chave = chaveDe(h);
              const inativo = h.empregadoId !== null && !idsAtivos.has(h.empregadoId);
              return (
                <li key={chave} onDoubleClick={() => canWrite && desabilitar([chave])} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/60">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={marcadosDir.includes(chave)} disabled={!canWrite} onCheckedChange={() => setMarcadosDir((m) => alternar(m, chave))} />
                    <span className="min-w-0 flex-1 truncate">{h.nome}{inativo && <span className="ml-1 text-xs text-muted-foreground">(inativo: não aparece no formulário)</span>}</span>
                  </label>
                  <Select value={h.area} disabled={!canWrite} onValueChange={(v) => { if (v) mudarArea(chave, v as A); }}>
                    <SelectTrigger aria-label={`Área de ${h.nome}`} className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>{(areas.includes(h.area) ? areas : [...areas, h.area]).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {canWrite && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <p className="mr-auto text-sm text-muted-foreground" role="status">{alterado ? "Há alterações que ainda não foram salvas." : "Tudo salvo."}</p>
          {alterado && <Button type="button" variant="ghost" onClick={descartar}>Descartar alterações</Button>}
          <Button type="button" disabled={!alterado} onClick={salvar}>Salvar</Button>
        </div>
      )}
    </div>
  );
}
