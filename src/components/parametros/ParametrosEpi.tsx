import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CLASSE_STATUS } from "@/components/modules/LegendaStatusCompra";
import { CartaoDeMotivos } from "@/components/parametros/CartaoDeMotivos";
import { HabilitarEmpregadosEpi } from "@/components/parametros/HabilitarEmpregadosEpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lerAreasEpi, MAX_AREAS_EPI, salvarAreasEpi } from "@/lib/empregados-epi";
import {
  condicaoDoStatus,
  diasValidos,
  lerMotivosBaixaEpi,
  lerMotivosDevolucaoEpi,
  lerParametrosCompraEpi,
  lerTextosDocumentosEpi,
  MARCADOR_EMPRESA,
  MAX_DIAS,
  MAX_TEXTO_DOCUMENTO,
  salvarMotivosBaixaEpi,
  salvarMotivosDevolucaoEpi,
  salvarParametrosCompraEpi,
  salvarTextosDocumentosEpi,
  STATUS_CRITICIDADE,
  TEXTOS_DOCUMENTOS_PADRAO,
  textoDoPontoDePedido,
  type MetodoReposicao,
  type StatusCriticidade,
  type TextosDocumentosEpi,
} from "@/lib/epi-parametros";

const numeroDe = (texto: string): number => (texto.trim() === "" ? Number.NaN : Number(texto));


// Parâmetros Específicos do EPI (decisão 328): motivos de baixa definitiva, motivos de devolução ao estoque e os parâmetros da sugestão de compra.
// Textos do Termo de Entrega de EPI e da Ficha de Controle de Entrega de EPI (decisão 356): digitados aqui, valem nos documentos que o sistema gera. `{empresa}` vira o nome da empresa.
const CAMPOS_TEXTO: { chave: keyof TextosDocumentosEpi; id: string; rotulo: string; ajuda: string }[] = [
  { chave: "termoDeclaracao", id: "termo-declaracao", rotulo: "Termo de entrega de EPI: declaração", ajuda: `Sai antes da lista de EPIs. Use ${MARCADOR_EMPRESA} onde o nome da empresa deve aparecer.` },
  { chave: "termoCiencia", id: "termo-ciencia", rotulo: "Termo de entrega de EPI: ciência", ajuda: "Sai depois da lista de EPIs, acima das assinaturas." },
  { chave: "fichaDeclaracao", id: "ficha-declaracao", rotulo: "Ficha de controle de entrega de EPI: declaração", ajuda: `Sai acima da tabela de entregas da ficha. ${MARCADOR_EMPRESA} também vale aqui.` },
];

function TextosDosDocumentos() {
  const [salvos, setSalvos] = useState(lerTextosDocumentosEpi);
  const [rascunho, setRascunho] = useState<TextosDocumentosEpi>(salvos);
  const vazio = CAMPOS_TEXTO.some((c) => !rascunho[c.chave].trim());
  const igual = CAMPOS_TEXTO.every((c) => rascunho[c.chave].trim() === salvos[c.chave]);
  const padrao = CAMPOS_TEXTO.every((c) => rascunho[c.chave].trim() === TEXTOS_DOCUMENTOS_PADRAO[c.chave]) && CAMPOS_TEXTO.every((c) => salvos[c.chave] === TEXTOS_DOCUMENTOS_PADRAO[c.chave]);
  function gravar(novos: TextosDocumentosEpi, mensagem: string) {
    try {
      const gravados = salvarTextosDocumentosEpi(novos);
      setSalvos(gravados);
      setRascunho(gravados);
      toast.success(mensagem);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os textos.");
    }
  }
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <h3 className="text-sm font-semibold">Textos dos documentos</h3>
        <p className="text-xs text-muted-foreground">O texto do termo de entrega de EPI e o da ficha de controle de entrega. Mudou o texto, é só editar aqui: os próximos documentos já saem com ele; os já impressos não mudam.</p>
      </div>
      {CAMPOS_TEXTO.map((c) => (
        <div key={c.chave} className="space-y-1">
          <Label htmlFor={`epi-texto-${c.id}`}>{c.rotulo}</Label>
          <Textarea id={`epi-texto-${c.id}`} rows={4} maxLength={MAX_TEXTO_DOCUMENTO} value={rascunho[c.chave]} onChange={(e) => setRascunho((r) => ({ ...r, [c.chave]: e.target.value }))} />
          <p className="text-xs text-muted-foreground">{c.ajuda}</p>
        </div>
      ))}
      {vazio && <p role="alert" className="text-sm text-destructive">Preencha os três textos.</p>}
      <div className="flex flex-wrap gap-2">
        <Button requiresWrite disabled={vazio || igual} onClick={() => gravar(rascunho, "Textos dos documentos salvos.")}>Salvar textos</Button>
        <Button requiresWrite variant="outline" disabled={padrao} onClick={() => gravar(TEXTOS_DOCUMENTOS_PADRAO, "Textos restaurados ao padrão.")}>Restaurar texto padrão</Button>
      </div>
    </div>
  );
}

// `voltarParaSugestao`: aberto pelo link da Sugestão de Compras (decisão 355); o botão do alto e o salvar dos parâmetros da sugestão levam de volta a ela.
export function ParametrosEpi({ voltarParaSugestao = false }: { voltarParaSugestao?: boolean }) {
  const navegar = useNavigate();
  const voltar = () => void navegar({ to: "/epi", search: { aba: "sugestao-compras" } });
  const [areas, setAreas] = useState(lerAreasEpi);
  const [salvo, setSalvo] = useState(lerParametrosCompraEpi);
  const [metodo, setMetodo] = useState<MetodoReposicao>(salvo.metodo);
  const [cobertura, setCobertura] = useState(String(salvo.diasCobertura));
  const [reposicao, setReposicao] = useState(String(salvo.prazoReposicao));
  const [seguranca, setSeguranca] = useState(String(salvo.diasSeguranca));
  const [planejamento, setPlanejamento] = useState(String(salvo.diasPlanejamento));
  const [excesso, setExcesso] = useState(String(salvo.limiteExcesso));
  const novo = {
    metodo,
    diasCobertura: numeroDe(cobertura),
    prazoReposicao: numeroDe(reposicao),
    diasSeguranca: numeroDe(seguranca),
    diasPlanejamento: numeroDe(planejamento),
    limiteExcesso: numeroDe(excesso),
  };
  const valido =
    [novo.prazoReposicao, novo.diasSeguranca, novo.diasPlanejamento, novo.limiteExcesso].every(
      diasValidos,
    ) &&
    (metodo === "minimo" || (diasValidos(novo.diasCobertura) && novo.diasCobertura >= 1)) &&
    novo.diasPlanejamento >= novo.diasSeguranca;
  const igual =
    valido && (Object.keys(salvo) as (keyof typeof salvo)[]).every((k) => salvo[k] === novo[k]);

  function salvarCompra() {
    if (!valido) return;
    try {
      salvarParametrosCompraEpi(novo);
      setSalvo(novo);
      toast.success("Parâmetros da sugestão de compra salvos.");
      if (voltarParaSugestao) voltar();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível salvar os parâmetros.");
    }
  }
  const campo = (
    id: string,
    rotulo: string,
    valor: string,
    definir: (v: string) => void,
    ajuda: string,
    desligado = false,
  ) => (
    <div className="space-y-1">
      <Label htmlFor={`epi-${id}`}>{rotulo}</Label>
      <Input
        id={`epi-${id}`}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_DIAS}
        step={1}
        value={valor}
        disabled={desligado}
        aria-invalid={!desligado && !diasValidos(numeroDe(valor))}
        onChange={(e) => definir(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{ajuda}</p>
    </div>
  );

  // A tabela mostra a condição do status para o que está na tela (mesmo sem salvar); se os dias digitados não valem, vale o que está salvo.
  const emUso = valido ? novo : salvo;
  return (
    <section className="space-y-3" aria-labelledby="parametros-epi">
      {voltarParaSugestao && (
        <Button type="button" variant="outline" size="sm" onClick={voltar}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para Sugestão de Compras
        </Button>
      )}
      {/* O texto quebra na largura dos quadros logo abaixo (max-w-4xl). */}
      <div className="max-w-4xl">
        <h2 id="parametros-epi" className="text-lg font-semibold">
          Parâmetros do EPI
        </h2>
        <p className="text-sm text-muted-foreground">
          Motivos de baixa definitiva e de devolução ao estoque, áreas da oficina e empregados
          habilitados, como a sugestão de compra é calculada e os textos do termo de entrega e da ficha de controle de EPI.
        </p>
      </div>
      <div className="panel max-w-4xl space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <CartaoDeMotivos
            id="motivos-baixa"
            titulo="Motivos de baixa definitiva"
            ajuda="Os motivos que a baixa definitiva do EPI aceita."
            inicial={lerMotivosBaixaEpi()}
            salvar={salvarMotivosBaixaEpi}
          />
          <CartaoDeMotivos
            id="motivos-devolucao"
            titulo="Motivos de devolução ao estoque"
            ajuda="Os motivos que a Devolução, na Entrada no Estoque, pede para cada EPI devolvido."
            inicial={lerMotivosDevolucaoEpi()}
            salvar={salvarMotivosDevolucaoEpi}
          />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <CartaoDeMotivos
            id="areas-oficina"
            titulo="Áreas da oficina"
            ajuda="As áreas de atuação que aparecem ao lado do nome de cada empregado habilitado. Dá para acrescentar novas; uma área em uso por um habilitado só sai depois de mudar a área dele."
            inicial={areas}
            singular="área"
            feminino
            max={MAX_AREAS_EPI}
            salvos="Áreas da oficina salvas."
            salvar={(lista) => {
              const gravadas = salvarAreasEpi(lista);
              setAreas(gravadas);
              return gravadas;
            }}
          />
          <HabilitarEmpregadosEpi areas={areas} />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div>
            <h3 className="text-sm font-semibold">Sugestão de compra</h3>
            <p className="text-xs text-muted-foreground">
              Escolha se a sugestão trabalha com o estoque mínimo ou com o tempo de cobertura em
              dias, e o prazo de reposição do fornecedor.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Trabalhar com</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["cobertura", "Tempo de cobertura (dias)"],
                  ["minimo", "Estoque mínimo"],
                ] as const
              ).map(([v, r]) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="epi-metodo"
                    value={v}
                    checked={metodo === v}
                    onChange={() => setMetodo(v)}
                  />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campo(
              "cobertura",
              "Dias de cobertura desejados",
              cobertura,
              setCobertura,
              "Quantos dias de consumo o estoque deve cobrir.",
              metodo !== "cobertura",
            )}
            {campo(
              "reposicao",
              "Prazo de reposição do fornecedor (TR)",
              reposicao,
              setReposicao,
              "Dias que o fornecedor leva para entregar.",
            )}
            {campo(
              "seguranca",
              "Dias de segurança",
              seguranca,
              setSeguranca,
              "Comprar já vai de TR até TR + estes dias.",
            )}
            {campo(
              "planejamento",
              "Janela de planejamento",
              planejamento,
              setPlanejamento,
              "Planejar vai até TR + estes dias.",
            )}
            {campo(
              "excesso",
              "Limite de excesso",
              excesso,
              setExcesso,
              "Acima desta cobertura, o estoque é excesso.",
            )}
          </div>
          {!valido && (
            <p role="alert" className="text-sm text-destructive">
              Informe dias inteiros entre 0 e {MAX_DIAS}; a cobertura desejada precisa de 1 dia ou
              mais e a janela de planejamento não pode ser menor que a segurança.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Tabela de status de criticidade (TC = tempo de cobertura, em dias)</p>
            <p className="text-xs text-muted-foreground">{textoDoPontoDePedido(emUso)}</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs" aria-label="Condição lógica de cada status">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Criticidade</th>
                    <th className="px-2 py-1.5 font-medium">Condição lógica (gatilho)</th>
                    <th className="px-2 py-1.5 font-medium">Significado prático</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(STATUS_CRITICIDADE) as StatusCriticidade[]).map((st) => {
                    const c = condicaoDoStatus(st, emUso);
                    return (
                      <tr key={st} className="border-t align-top">
                        <td className="px-2 py-1.5">
                          <span className={`whitespace-nowrap rounded px-2 py-0.5 font-medium ${CLASSE_STATUS[st]}`}>{STATUS_CRITICIDADE[st].rotulo}</span>
                        </td>
                        <td className="px-2 py-1.5">{STATUS_CRITICIDADE[st].criticidade}</td>
                        <td className="px-2 py-1.5">
                          <code className="rounded bg-muted px-1.5 py-0.5">{c.formula}</code>
                          <span className="mt-0.5 block text-muted-foreground">{c.calculo}</span>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{c.significado}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Button requiresWrite disabled={!valido || igual} onClick={salvarCompra}>
            Salvar parâmetros da sugestão
          </Button>
        </div>

        <TextosDosDocumentos />
      </div>
    </section>
  );
}
