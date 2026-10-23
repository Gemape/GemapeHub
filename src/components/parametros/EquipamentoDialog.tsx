import { useRef, useState } from "react";
import { ehExemplo } from "@/lib/dados-teste/exemplo-id";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresa } from "@/lib/empresa-context";
import { hojeLocal } from "@/lib/empregados";
import { empresaPadraoParaEscolha, empresasParaEscolha } from "@/lib/empresas";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
import { CATEGORIA_EQUIPAMENTOS, lerParametros } from "@/lib/parametros-base";
import { salvarEquipamento, type Equipamento } from "@/lib/equipamentos-demo";
import { STATUS_EQUIPAMENTO, TITULO_GRUPO_TECNICO, camposTecnicosDosGrupos, type CampoTecnico } from "@/lib/equipamentos";
import { lerParametrosEquipamento, type ParametrosEquipamento } from "@/lib/equipamentos-parametros";

// Cadastrar equipamento (Parâmetros > Equipamentos): dados gerais sempre visíveis e especificações técnicas que aparecem ou somem
// na hora, conforme o tipo escolhido (a subcategoria é o pai; o tipo, o filho, de Parâmetros Específicos). Campo de grupo que o tipo não
// libera some do formulário e não é guardado.
type Valores = {
  empresaId: string; patrimonio: string; nome: string; subcategoriaId: string; tipoId: string; marca: string; modelo: string; numeroSerie: string;
  dataAquisicao: string; valorCompra: string; status: string; setor: string; tecnico: Record<string, string>;
};

const valorEmTexto = (n: number) => String(n).replace(".", ",");
const tecnicoEmTexto = (t: Record<string, string>, campos: readonly string[]) =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, campos.includes(k) ? valorEmTexto(Number(v)) : v]));

function valoresIniciais(base: Equipamento | null, clonar: boolean, empresaPadrao: string, params: ParametrosEquipamento): Valores {
  if (!base) {
    return { empresaId: empresaPadrao, patrimonio: "", nome: "", subcategoriaId: "", tipoId: "", marca: "", modelo: "", numeroSerie: "", dataAquisicao: "", valorCompra: "", status: "Ativo", setor: "", tecnico: {} };
  }
  const tipoBase = params.tipos.find((t) => t.id === base.tipoId);
  const numericos = camposTecnicosDosGrupos(tipoBase?.grupos ?? []).filter((c) => c.tipo === "numero").map((c) => c.id);
  return {
    empresaId: base.empresaId,
    // Clonar copia os dados, mas o patrimônio é único e o número de série é de cada unidade: os dois voltam em branco.
    patrimonio: clonar ? "" : base.patrimonio,
    nome: base.nome, subcategoriaId: tipoBase?.subcategoriaId ?? "", tipoId: base.tipoId, marca: base.marca, modelo: base.modelo,
    numeroSerie: clonar ? "" : base.numeroSerie,
    dataAquisicao: base.dataAquisicao, valorCompra: valorEmTexto(base.valorCompra), status: base.status, setor: base.setor,
    tecnico: tecnicoEmTexto(base.tecnico, numericos),
  };
}

function Formulario({ editando, modelo, onFechar, onSalvo }: {
  editando: Equipamento | null;
  modelo: Equipamento | null;
  onFechar: () => void;
  onSalvo: (e: Equipamento) => void;
}) {
  const { empresas, empresaId } = useEmpresa();
  const base = editando ?? modelo;
  // Subcategorias e tipos de Parâmetros Específicos, lidos ao abrir a janela.
  const [params] = useState(lerParametrosEquipamento);
  const [v, setV] = useState<Valores>(() => valoresIniciais(base, !editando && !!modelo && !ehExemplo(modelo), empresaPadraoParaEscolha(empresas, empresaId), params));
  // Um segundo clique em Salvar enquanto a janela fecha gravaria o equipamento de novo.
  const trava = useRef(false);
  const mudar = (parte: Partial<Valores>) => setV((x) => ({ ...x, ...parte }));
  const mudarTecnico = (id: string, valor: string) => setV((x) => ({ ...x, tecnico: { ...x.tecnico, [id]: valor } }));

  const tipoAtual = params.tipos.find((t) => t.id === v.tipoId);
  const tiposDaSubcategoria = params.tipos.filter((t) => t.subcategoriaId === v.subcategoriaId);
  const grupos = tipoAtual?.grupos ?? [];
  const campos = camposTecnicosDosGrupos(grupos);
  const listaEmpresas = empresasParaEscolha(empresas, [v.empresaId]);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (trava.current) return;
    try {
      const { subcategoriaId: _pai, ...dados } = v;
      const salvo = salvarEquipamento({ ...dados, ...(editando ? { id: editando.id } : {}) });
      trava.current = true;
      onFechar();
      toast.success("Equipamento salvo");
      onSalvo(salvo);
      // Endereçamento obrigatório só avisa (não impede salvar), como nas outras categorias.
      void avisarEnderecamentoObrigatorio(lerParametros(), CATEGORIA_EQUIPAMENTOS, salvo.empresaId, salvo.patrimonio);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar o equipamento.");
    }
  }

  function campoTecnico(c: CampoTecnico) {
    const valor = v.tecnico[c.id] ?? "";
    const unidade = c.unidades ? (v.tecnico[`${c.id}Unidade`] ?? c.unidades[0]) : c.unidadeFixa;
    return (
      <div key={c.id} className="space-y-1.5">
        <Label htmlFor={c.id}>{c.rotulo}{c.obrigatorio && <span className="text-destructive"> *</span>}</Label>
        {c.tipo === "select" && (
          <Select value={valor} onValueChange={(x) => x && mudarTecnico(c.id, x)}>
            <SelectTrigger id={c.id}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{c.opcoes?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {c.tipo === "data" && <Input id={c.id} type="date" max={c.id === "ultimaRecarga" ? hojeLocal() : undefined} value={valor} onChange={(e) => mudarTecnico(c.id, e.target.value)} />}
        {c.tipo === "numero" && (
          <div className="flex items-center gap-2">
            <Input id={c.id} inputMode="decimal" placeholder="0" value={valor} onChange={(e) => mudarTecnico(c.id, e.target.value)} />
            {c.unidades ? (
              <Select value={unidade ?? ""} onValueChange={(x) => x && mudarTecnico(`${c.id}Unidade`, x)}>
                <SelectTrigger aria-label={`Unidade de ${c.rotulo.toLocaleLowerCase("pt-BR")}`} className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{c.unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <span className="w-24 text-sm text-muted-foreground">{unidade}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <p className="text-sm font-semibold sm:col-span-2">Dados gerais <span className="font-normal text-muted-foreground">(todos obrigatórios)</span></p>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="empresa">Empresa</Label>
        <Select value={v.empresaId} onValueChange={(x) => x && mudar({ empresaId: x })}>
          <SelectTrigger id="empresa"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
          <SelectContent>{listaEmpresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="patrimonio">Código de patrimônio (TAG ou placa)</Label><Input id="patrimonio" value={v.patrimonio} onChange={(e) => mudar({ patrimonio: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="nome">Nome / descrição do equipamento</Label><Input id="nome" capitalizar="texto" placeholder="Ex.: Empilhadeira Yale 2.5T" value={v.nome} onChange={(e) => mudar({ nome: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="subcategoria">Subcategoria</Label>
        <Select value={v.subcategoriaId} onValueChange={(x) => x && x !== v.subcategoriaId && mudar({ subcategoriaId: x, tipoId: "" })}>
          <SelectTrigger id="subcategoria"><SelectValue placeholder="Selecione a subcategoria" /></SelectTrigger>
          <SelectContent>{params.subcategorias.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tipo">Tipo</Label>
        <Select value={v.tipoId} onValueChange={(x) => x && mudar({ tipoId: x })} disabled={!v.subcategoriaId}>
          <SelectTrigger id="tipo"><SelectValue placeholder={v.subcategoriaId ? "Selecione o tipo" : "Escolha antes a subcategoria"} /></SelectTrigger>
          <SelectContent>{tiposDaSubcategoria.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="marca">Marca / fabricante</Label><Input id="marca" capitalizar="texto" value={v.marca} onChange={(e) => mudar({ marca: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="modelo">Modelo</Label><Input id="modelo" capitalizar="texto" value={v.modelo} onChange={(e) => mudar({ modelo: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="numeroSerie">Número de série</Label><Input id="numeroSerie" value={v.numeroSerie} onChange={(e) => mudar({ numeroSerie: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="dataAquisicao">Data de aquisição</Label><Input id="dataAquisicao" type="date" max={hojeLocal()} value={v.dataAquisicao} onChange={(e) => mudar({ dataAquisicao: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="valorCompra">Valor de compra (R$)</Label><Input id="valorCompra" inputMode="decimal" placeholder="0,00" value={v.valorCompra} onChange={(e) => mudar({ valorCompra: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label htmlFor="status">Status atual</Label>
        <Select value={v.status} onValueChange={(x) => x && mudar({ status: x })}>
          <SelectTrigger id="status"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
          <SelectContent>{STATUS_EQUIPAMENTO.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="setor">Setor / localização</Label><Input id="setor" capitalizar="texto" placeholder="Ex.: Lavador, Serralheria, Estoque" value={v.setor} onChange={(e) => mudar({ setor: e.target.value })} /></div>

      <p className="pt-2 text-sm font-semibold sm:col-span-2">Especificações técnicas</p>
      {!v.tipoId && <p className="text-sm text-muted-foreground sm:col-span-2">Escolha a subcategoria e o tipo para ver as especificações técnicas dele.</p>}
      {v.tipoId && grupos.length === 0 && <p className="text-sm text-muted-foreground sm:col-span-2">Este tipo não tem especificações técnicas.</p>}
      {grupos.map((g) => (
        <fieldset key={g} className="space-y-3 rounded-lg border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-medium">{TITULO_GRUPO_TECNICO[g]}</legend>
          <div className="grid gap-3 sm:grid-cols-2">{campos.filter((c) => c.grupo === g).map(campoTecnico)}</div>
        </fieldset>
      ))}

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
        <Button requiresWrite type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
}

export function EquipamentoDialog({ aberto, onAberto, editando, modelo, onSalvo }: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  editando: Equipamento | null;
  modelo: Equipamento | null;
  onSalvo: (e: Equipamento) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar equipamento" : modelo && !ehExemplo(modelo) ? "Clonar equipamento" : "Cadastrar equipamento"}</DialogTitle>
          <DialogDescription>Escolha a subcategoria e o tipo para aparecerem só as especificações técnicas dele.</DialogDescription>
        </DialogHeader>
        <Formulario key={editando?.id ?? (modelo ? `clone-${modelo.id}` : "novo")} editando={editando} modelo={modelo} onFechar={() => onAberto(false)} onSalvo={onSalvo} />
      </DialogContent>
    </Dialog>
  );
}
