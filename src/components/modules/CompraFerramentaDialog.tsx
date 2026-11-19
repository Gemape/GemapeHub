import { useEffect, useState } from "react";

import { sufixoTamanhoFerramenta } from "@/lib/tamanho-ferramenta";
import { EnderecoDaEntrada } from "@/components/EnderecoDaEntrada";
import { SeletorComBusca } from "@/components/SeletorComBusca";
import { EntradaUsadaFerramenta } from "@/components/modules/EntradaUsadaFerramenta";
import { ItensModulo } from "@/components/modules/ItensModulo";
import { SeletorFornecedorCompra } from "@/components/modules/SeletorFornecedorCompra";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { avisarEnderecamentoObrigatorio } from "@/lib/aviso-enderecamento";
import { escolherFornecedorDaCompra } from "@/lib/compras-fornecedor";
import { TODAS, useEmpresa } from "@/lib/empresa-context";
import { hojeLocal } from "@/lib/empregados";
import { empresasParaEscolha } from "@/lib/empresas";
import { listarFornecedores } from "@/lib/fornecedores-demo";
import { capitalizarTexto } from "@/lib/formatacao-cadastral";
import { formatarMoeda } from "@/lib/gemape";
import { useEmpresas, useItens, useRegistrarMovimentacoesLote } from "@/lib/hooks-gemape";
import { MODO_DEMO } from "@/lib/modo-demo";
import { useParametrosBase } from "@/lib/use-parametros-base";

// Compra de ferramenta na Entrada no estoque, na mesma lógica da compra de EPI e de uniforme: a empresa do estoque que será alimentado, a ferramenta dela,
// o fornecedor, a nota fiscal, a data, a quantidade e o valor unitário (o total é calculado). Grava uma entrada que soma no estoque da empresa.
export function CompraFerramentaDialog({ aberto, onAbrirMudou }: { aberto: boolean; onAbrirMudou: (aberto: boolean) => void }) {
  const { empresaId } = useEmpresa();
  const { data: empresas = [] } = useEmpresas();
  const { data: itens = [] } = useItens("ferramenta", TODAS);
  const parametros = useParametrosBase();
  const registrar = useRegistrarMovimentacoesLote(["estoque-modulo"]);
  // Registrar entrada: a ferramenta é nova (compra) ou usada (volta de um empregado).
  const [tipoEntrada, setTipoEntrada] = useState<"nova" | "usada">("nova");
  const [empresaCompra, setEmpresaCompra] = useState("");
  // Começa na empresa escolhida no topo, assim que a lista de empresas chega (e só se ainda não houver escolha).
  useEffect(() => {
    if (!empresaCompra && empresasParaEscolha(empresas).some((e) => e.id === empresaId)) setEmpresaCompra(empresaId);
  }, [empresas, empresaId, empresaCompra]);
  const [itemId, setItemId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [valorUnitario, setValorUnitario] = useState(0);
  const item = itens.find((i) => i.id === itemId);
  // Vai e volta: o cadastro abre por cima da compra; a ferramenta salva (achada pelo código) fica escolhida, com a empresa dela, sem perder o que foi preenchido.
  const [cadastrando, setCadastrando] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState("");
  useEffect(() => {
    const nova = novoCodigo ? itens.find((i) => i.codigo_sku === novoCodigo) : undefined;
    if (!nova) return;
    setEmpresaCompra(nova.empresa_id ?? "");
    setItemId(nova.id);
    setNovoCodigo("");
  }, [novoCodigo, itens]);
  function fechar(a: boolean) {
    if (!a) {
      setTipoEntrada("nova");
      setItemId("");
      setFornecedorId("");
      setQuantidade(0);
      setValorUnitario(0);
    }
    onAbrirMudou(a);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (registrar.isPending) return;
    const f = new FormData(e.currentTarget);
    if (!empresaCompra) return void alert("Selecione o estoque a alimentar (empresa).");
    if (!item) return void alert("Selecione a ferramenta.");
    // No demonstrativo o fornecedor vem do cadastro e é conferido de novo na hora de gravar.
    let fornecedor = capitalizarTexto(String(f.get("fornecedor") ?? ""));
    let fornecedorGravado: string | null = null;
    if (MODO_DEMO) {
      const escolha = escolherFornecedorDaCompra(listarFornecedores(), "cat-ferramentas", fornecedorId);
      if ("erro" in escolha) return void alert(escolha.erro);
      fornecedor = escolha.nome;
      fornecedorGravado = escolha.id;
    }
    const qtde = Number(f.get("quantidade"));
    if (!Number.isInteger(qtde) || qtde < 1) return void alert("Informe uma quantidade inteira maior que zero.");
    const unitario = Number(f.get("valor_unitario"));
    if (!unitario || unitario <= 0) return void alert("Informe o valor unitário.");
    const nota = String(f.get("nota_fiscal") || "").trim();
    const obs = capitalizarTexto(String(f.get("observacao") || "").trim());
    const observacao = [`Compra: ${fornecedor}${nota ? ` · NF ${nota}` : ""}`, obs].filter(Boolean).join(" · ").slice(0, 500);
    registrar.mutate(
      [{
        modulo: "ferramenta", item_id: item.id, veiculo_id: null, empresa_id: empresaCompra, empregado_id: null, tipo_movimentacao: "Entrada",
        motivo_baixa: null, quantidade: qtde, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, tipo_ocorrencia: null, conducao_ocorrencia: null,
        data_movimentacao: String(f.get("data_compra")), origem_local: null, destino_local: null, observacao,
        // Colunas só do modo demonstração: o banco real ainda não as tem (Fase 2).
        ...(MODO_DEMO ? {
          condicao: "novo", fornecedor, fornecedor_id: fornecedorGravado, nota_fiscal: nota || null,
          valor_unitario: unitario, valor_total: Math.round(qtde * unitario * 100) / 100,
        } : {}),
      }],
      { onSuccess: () => { fechar(false); void avisarEnderecamentoObrigatorio(parametros, "cat-ferramentas", empresaCompra, item.codigo_sku ?? ""); } },
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar entrada de ferramenta</DialogTitle>
          <DialogDescription>
            Escolha se a ferramenta é nova (compra) ou usada (volta de um empregado). Os dados atualizam o estoque e geram a movimentação de entrada.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2" role="group" aria-label="Tipo da entrada">
          {([["nova", "Nova"], ["usada", "Usada"]] as const).map(([id, rotulo]) => (
            <Button key={id} type="button" variant={tipoEntrada === id ? "default" : "outline"} aria-pressed={tipoEntrada === id} onClick={() => setTipoEntrada(id)}>{rotulo}</Button>
          ))}
        </div>
        {tipoEntrada === "usada" && <EntradaUsadaFerramenta aoConcluir={() => fechar(false)} aoCancelar={() => fechar(false)} />}
        {/* Escondido, não desmontado: ao voltar de Usada para Nova, o que foi preenchido continua lá. */}
        <form onSubmit={enviar} className={`grid gap-4 sm:grid-cols-2${tipoEntrada === "nova" ? "" : " hidden"}`}>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="compra-fer-empresa">Estoque a alimentar (empresa)</Label>
            <Select value={empresaCompra} onValueChange={(v) => { if (!v) return; setEmpresaCompra(v); setItemId(""); }}>
              <SelectTrigger id="compra-fer-empresa"><SelectValue placeholder="Selecione o estoque" /></SelectTrigger>
              <SelectContent>{empresasParaEscolha(empresas).map((e) => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="compra-fer-item">Ferramenta</Label>
            <SeletorComBusca id="compra-fer-item" nome="item_id" valor={itemId} opcoes={itens.filter((i) => i.empresa_id === empresaCompra && i.status === "Ativo").map((i) => ({ id: i.id, rotulo: `${i.codigo_sku} — ${i.nome}${sufixoTamanhoFerramenta(i)}` }))} onChange={(v) => { setItemId(v); setNovoCodigo(""); }} />
            {!empresaCompra && <p className="text-xs text-muted-foreground">Escolha a empresa para ver as ferramentas dela.</p>}
            <p className="text-xs text-muted-foreground">
              Ferramenta não está na lista?{" "}
              <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => setCadastrando(true)}>Cadastrar ferramenta</button>
            </p>
          </div>
          {item && (
            <>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Esta compra alimenta o estoque {empresas.find((e) => e.id === empresaCompra)?.nome_fantasia}, onde a ferramenta existe uma vez só: compras de qualquer fornecedor somam no mesmo saldo.
              </p>
              <div className="sm:col-span-2"><EnderecoDaEntrada categoriaId="cat-ferramentas" empresaId={empresaCompra} codigo={item.codigo_sku ?? ""} /></div>
            </>
          )}
          <SeletorFornecedorCompra categoriaId="cat-ferramentas" valor={fornecedorId} onChange={setFornecedorId} />
          <div className="space-y-1.5">
            <Label htmlFor="compra-fer-nf">Nota Fiscal</Label>
            <Input id="compra-fer-nf" name="nota_fiscal" placeholder="Número da NF" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compra-fer-data">Data da Compra</Label>
            <Input id="compra-fer-data" name="data_compra" type="date" required defaultValue={hojeLocal()} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compra-fer-qtde">Quantidade</Label>
            <Input id="compra-fer-qtde" name="quantidade" type="number" required min="1" step="1" onChange={(e) => setQuantidade(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compra-fer-valor">Valor Unitário (R$)</Label>
            <Input id="compra-fer-valor" name="valor_unitario" type="number" step="0.01" required min="0.01" onChange={(e) => setValorUnitario(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor Total</Label>
            <Input value={formatarMoeda((quantidade || 0) * (valorUnitario || 0))} readOnly className="bg-muted font-bold" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="compra-fer-obs">Observação</Label>
            <Textarea id="compra-fer-obs" name="observacao" capitalizar="texto" rows={3} maxLength={300} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
            <Button requiresWrite="operar" type="submit" disabled={registrar.isPending}>Registrar entrada</Button>
          </DialogFooter>
        </form>
        {/* Fora do <form>: o submit do cadastro não pode subir para o da compra. */}
        {aberto && <ItensModulo modulo="ferramenta" janela={{ empresaId: empresaCompra, aberto: cadastrando, onAberto: setCadastrando, onSalvo: setNovoCodigo }} />}
      </DialogContent>
    </Dialog>
  );
}
