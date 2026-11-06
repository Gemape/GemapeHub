import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { CartaoDeMotivos } from "@/components/parametros/CartaoDeMotivos";
import { HabilitarEmpregadosEpi } from "@/components/parametros/HabilitarEmpregadosEpi";
import { SugestaoDeCompra } from "@/components/parametros/SugestaoDeCompra";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lerAreasEpi, MAX_AREAS_EPI, salvarAreasEpi } from "@/lib/empregados-epi";
import {
  lerMotivosBaixaEpi,
  lerMotivosDevolucaoEpi,
  lerTextosDocumentosEpi,
  MARCADOR_EMPRESA,
  MAX_TEXTO_DOCUMENTO,
  salvarMotivosBaixaEpi,
  salvarMotivosDevolucaoEpi,
  salvarTextosDocumentosEpi,
  TEXTOS_DOCUMENTOS_PADRAO,
  type TextosDocumentosEpi,
} from "@/lib/epi-parametros";

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

// `voltarParaSugestao`: aberto pelo link da Sugestão de Compras (decisão 355); o botão do alto (na tela Parâmetros Específicos) e o salvar dos parâmetros da sugestão levam de volta a ela.
export function ParametrosEpi({ voltarParaSugestao = false }: { voltarParaSugestao?: boolean }) {
  const navegar = useNavigate();
  const voltar = () => void navegar({ to: "/epi", search: { aba: "sugestao-compras" } });
  const [areas, setAreas] = useState(lerAreasEpi);
  return (
    <section className="space-y-3" aria-labelledby="parametros-epi">
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

        <SugestaoDeCompra modulo="epi" onSalvou={voltarParaSugestao ? voltar : undefined} />

        <TextosDosDocumentos />
      </div>
    </section>
  );
}
