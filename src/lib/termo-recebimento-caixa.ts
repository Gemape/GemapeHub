import { toast } from "sonner";
import { lerTextosTermos } from "./termos-ferramentas-texto.ts";
import { montarTermoResponsabilidadeHtml } from "./termo-responsabilidade-html.ts";
import { abrirDocumento, nomeArquivoDocumento } from "./visualizador-documento.ts";

type Empresa = { razao_social: string; cnpj: string };
type Portador = { nome: string; cpf?: string | null | undefined };
export type FerramentaRecebida = { codigo_sku?: string | null | undefined; nome?: string | null | undefined; marca?: string | null | undefined; quantidade: number };

/**
 * Abre o termo de responsabilidade pelo recebimento das ferramentas que entraram na caixa (início da posse do portador).
 * Sem portador ou sem empresa o termo não sai, e o aviso diz por quê; a movimentação já foi gravada.
 */
export function abrirTermoDeRecebimento(d: { empresa: Empresa | undefined; portador: Portador | null | undefined; caixaCodigo: string; data: string; ferramentas: FerramentaRecebida[] }): boolean {
  if (!d.portador) { toast.warning(`A caixa ${d.caixaCodigo} não tem portador vinculado; o termo de recebimento não foi gerado. Vincule o portador e emita o termo depois.`); return false; }
  if (!d.empresa) { toast.warning("A caixa não tem empresa cadastrada; o termo de recebimento não foi gerado."); return false; }
  abrirDocumento({
    titulo: "Termo de Responsabilidade",
    html: montarTermoResponsabilidadeHtml({
      empresa: d.empresa, empregado: { nome: d.portador.nome, cpf: d.portador.cpf ?? "" }, caixaCodigo: d.caixaCodigo, data: d.data, texto: lerTextosTermos().entrega,
      linhas: d.ferramentas.map((f) => ({ codigo: f.codigo_sku, nome: f.nome, marca: f.marca, quantidade: f.quantidade, estado: "—" })),
    }),
    arquivo: nomeArquivoDocumento("Termo de Recebimento", d.portador.nome, d.data),
  });
  return true;
}
