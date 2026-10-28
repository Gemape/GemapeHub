import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccess } from "@/lib/access-context";
import { TODAS } from "@/lib/empresa-context";
import { empregadoAtivo } from "@/lib/empregados";
import { useEmpregados } from "@/lib/hooks-gemape";
import { AREAS_VIAGEM, ID_HABILITADOS, lerEstado, salvarPergunta, type AreaViagem, type Habilitado } from "@/lib/questionario-despesas";

const AREA_PADRAO: AreaViagem = "Oficina";
const normalizar = (t: string) => t.trim().toLocaleLowerCase("pt-BR");

// Parâmetros > Viagens > Parâmetros Específicos (decisão 299): caixa dupla. À esquerda, todos os empregados ativos que ainda não foram habilitados; à direita, os
// habilitados a lançar despesas no questionário de despesas, cada um com a sua área (Oficina, PCM ou Administrativo). Mover entre as caixas só vale ao Salvar.
// A lista salva é a mesma da pergunta "Quem está lançando" do questionário (pergunta 04): quem fica inativo no cadastro sai do questionário sozinho.
export function HabilitarEmpregadosViagens() {
  const { canWrite } = useAccess();
  const { data: empregados = [], isLoading } = useEmpregados(TODAS);
  const ativos = useMemo(() => empregados.filter((e) => empregadoAtivo(e)), [empregados]);
  const [salvos, setSalvos] = useState<Habilitado[]>(() => lerEstado().perguntas.find((p) => p.id === ID_HABILITADOS)?.habilitados ?? []);
  const [habilitados, setHabilitados] = useState<Habilitado[]>(salvos);
  const [buscaEsq, setBuscaEsq] = useState("");
  const [buscaDir, setBuscaDir] = useState("");
  const [marcadosEsq, setMarcadosEsq] = useState<string[]>([]);
  const [marcadosDir, setMarcadosDir] = useState<string[]>([]);

  const chaveDe = (h: Habilitado) => h.empregadoId ?? `nome:${normalizar(h.nome)}`;
  const jaHabilitado = new Set(habilitados.flatMap((h) => [h.empregadoId, normalizar(h.nome)]));
  const idsAtivos = new Set(ativos.map((e) => e.id));
  const aEsquerda = ativos
    .filter((e) => !jaHabilitado.has(e.id) && !jaHabilitado.has(normalizar(e.nome)))
    .filter((e) => normalizar(e.nome).includes(normalizar(buscaEsq)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const aDireita = habilitados
    .filter((h) => normalizar(h.nome).includes(normalizar(buscaDir)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const alterado = JSON.stringify(habilitados) !== JSON.stringify(salvos);

  const alternar = (lista: string[], chave: string) => (lista.includes(chave) ? lista.filter((c) => c !== chave) : [...lista, chave]);
  const habilitar = (ids: string[]) => {
    const novos = ativos.filter((e) => ids.includes(e.id)).map((e): Habilitado => ({ empregadoId: e.id, nome: e.nome, area: AREA_PADRAO }));
    if (novos.length === 0) return;
    setHabilitados((atual) => [...atual, ...novos]);
    setMarcadosEsq((m) => m.filter((id) => !ids.includes(id)));
  };
  const desabilitar = (chaves: string[]) => {
    setHabilitados((atual) => atual.filter((h) => !chaves.includes(chaveDe(h))));
    setMarcadosDir((m) => m.filter((c) => !chaves.includes(c)));
  };
  const mudarArea = (chave: string, area: AreaViagem) => setHabilitados((atual) => atual.map((h) => (chaveDe(h) === chave ? { ...h, area } : h)));

  function salvar() {
    try {
      const estado = lerEstado();
      const q04 = estado.perguntas.find((p) => p.id === ID_HABILITADOS);
      if (!q04) throw new Error("A pergunta de quem está lançando não foi encontrada no questionário.");
      salvarPergunta(estado, { ...q04, habilitados });
      setSalvos(habilitados);
      toast.success("Empregados habilitados salvos.");
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
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header>
        <p className="text-eyebrow">Parâmetros &gt; Viagens</p>
        <h1 className="text-xl font-semibold">Parâmetros Específicos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha, entre todos os empregados ativos, quem fica habilitado a lançar despesas no questionário de despesas. Marque à esquerda e passe para a direita; a área de cada
          habilitado define o que ele vê no formulário. Nada vale até clicar em Salvar.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <section className="panel flex min-h-80 flex-col gap-2 p-3" aria-labelledby="caixa-todos">
          <h2 id="caixa-todos" className="text-sm font-semibold">Todos os empregados <span className="font-normal text-muted-foreground">({aEsquerda.length})</span></h2>
          <Input aria-label="Buscar entre todos os empregados" placeholder="Buscar pelo nome" value={buscaEsq} onChange={(e) => setBuscaEsq(e.target.value)} />
          <ul className="max-h-96 flex-1 space-y-0.5 overflow-y-auto rounded-md border p-1" aria-label="Empregados que ainda não estão habilitados">
            {isLoading && <li className="p-2 text-sm text-muted-foreground">Carregando...</li>}
            {!isLoading && aEsquerda.length === 0 && <li className="p-2 text-sm text-muted-foreground">{buscaEsq.trim() ? "Nenhum empregado encontrado." : "Todos os empregados ativos já estão habilitados."}</li>}
            {aEsquerda.map((e) => (
              <li key={e.id} onDoubleClick={() => canWrite && habilitar([e.id])}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60">
                  <Checkbox checked={marcadosEsq.includes(e.id)} disabled={!canWrite} onCheckedChange={() => setMarcadosEsq((m) => alternar(m, e.id))} />
                  <span className="min-w-0 flex-1 truncate">{e.nome}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-row items-center justify-center gap-2 md:flex-col" role="group" aria-label="Mover empregados entre as caixas">
          <Button type="button" variant="outline" size="icon" aria-label="Habilitar os empregados marcados" title="Habilitar os marcados" disabled={!canWrite || marcadosEsq.length === 0} onClick={() => habilitar(marcadosEsq)}><ChevronRight className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Habilitar todos os empregados da lista" title="Habilitar todos os que aparecem na lista" disabled={!canWrite || aEsquerda.length === 0} onClick={() => habilitar(aEsquerda.map((e) => e.id))}><ChevronsRight className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Tirar os habilitados marcados" title="Tirar os marcados" disabled={!canWrite || marcadosDir.length === 0} onClick={() => desabilitar(marcadosDir)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" size="icon" aria-label="Tirar todos os habilitados da lista" title="Tirar todos os que aparecem na lista" disabled={!canWrite || aDireita.length === 0} onClick={() => desabilitar(aDireita.map(chaveDe))}><ChevronsLeft className="h-4 w-4" /></Button>
        </div>

        <section className="panel flex min-h-80 flex-col gap-2 p-3" aria-labelledby="caixa-habilitados">
          <h2 id="caixa-habilitados" className="text-sm font-semibold">Habilitados para o questionário de despesas <span className="font-normal text-muted-foreground">({habilitados.length})</span></h2>
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
                  <Select value={h.area} disabled={!canWrite} onValueChange={(v) => { if (v) mudarArea(chave, v as AreaViagem); }}>
                    <SelectTrigger aria-label={`Área de ${h.nome}`} className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{AREAS_VIAGEM.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
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
