import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mensagemHumana } from "./erros-humanos.ts";
import { avisarComDesfazer } from "./toast-desfazer.ts";

import { supabase } from "@/integrations/supabase/client";
import { TOTAL_CAIXAS } from "@/lib/caixas-habilitadas";
import { TODAS } from "@/lib/empresa-context";
import type { Modulo } from "@/lib/gemape";
import { empregadoAtivo, hojeLocal } from "@/lib/empregados";
import { lerTodas } from "@/lib/ler-todas";

// Remove operadores da gramática PostgREST, preservando texto Unicode.
export const buscaSegura = (value: string) => value.replace(/[,%*()."\\]/g, " ").trim().slice(0, 120);

export interface Item {
  id: string;
  empresa_id: string | null;
  nome: string;
  codigo_sku: string;
  categoria: string;
  categoria_ferramenta?: string | null;
  grupo_ferramenta?: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  ca: string | null;
  tamanho: string | null;
  cor: string | null;
  unidade_medida: string | null;
  estoque_minimo: number;
  estoque_atual: number;
  // Só no modo demonstração (decisão 327): quantas unidades do estoque são usadas, vindas de devolução.
  estoque_usado?: number;
  fornecedor: string | null;
  data_validade: string | null;
  data_aquisicao?: string | null;
  patrimonio?: string | null;
  preco_unitario?: number | null;
  nota_fiscal?: string | null;
  ca_validade?: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Campo legado para compatibilidade temporária se necessário
  caixa?: string | null;
  // Só no modo demonstração (decisões 22 e 23); as colunas reais entram na Fase 2.
  subcategoria_id?: string | null;
  unidade_id?: string | null;
  saldos_tamanho?: Record<string, number> | null;
  minimos_tamanho?: Record<string, number> | null;
  tamanhos_selecionados?: string[] | null;
}

export interface Empregado {
  id: string;
  empresa_id: string | null;
  nome: string;
  cpf: string;
  cargo: string | null;
  matricula: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  ativo: boolean;
}

export interface Veiculo {
  id: string;
  empresa_id: string | null;
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  cor: string | null;
  tipo: string | null;
  quilometragem_atual: number;
  combustivel: string | null;
  chassi: string | null;
  renavam: string | null;
  status: string;
  observacoes: string | null;
  empregado_responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Movimentacao {
  id: string;
  item_id: string | null;
  veiculo_id: string | null;
  empresa_id: string | null;
  empregado_id: string | null;
  modulo: string;
  tipo_movimentacao: string;
  motivo_baixa: string | null;
  preco_unitario_registrado?: number | null;
  origem_local?: string | null;
  destino_local?: string | null;
  responsavel_id?: string | null;
  quantidade: number;
  onus_baixa: string | null;
  tipo_vistoria: string | null;
  sinalizar_ocorrencia: boolean;
  tipo_ocorrencia: string | null;
  conducao_ocorrencia: string | null;
  // status_ocorrencia removida — coluna excluída na migration 20260911104000
  data_movimentacao: string;
  observacao: string | null;
  created_at: string;
  // Tamanho de EPI ou uniforme (decisão 23), só no modo demonstração.
  tamanho_id?: string | null;
  // Caixa da ferramenta em entregas, vistorias e devoluções (decisão 103), só no modo demonstração.
  caixa_id?: string | null;
}

export interface Ocorrencia {
  id: string;
  data: string;
  hora: string;
  responsavel_registro: string;
  descricao_ocorrencia: string;
  tipo_ocorrencia: string;
  empregado_id: string | null;
  item_id: string | null;
  veiculo_id: string | null;
  created_at: string;
  // Caixa da ferramenta, quando a ocorrência é registrada pela tela Número da caixa (decisão 104), só no modo demonstração.
  caixa_id?: string | null;
}

export interface CompraUniforme {
  id: string;
  empresa_id: string | null;
  item_id: string | null;
  fornecedor: string;
  nota_fiscal: string | null;
  data_compra: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number | null;
  observacao: string | null;
  created_at: string;
  tamanho_id?: string | null;
}

export interface CompraEpi {
  id: string;
  empresa_id: string | null;
  item_id: string | null;
  fornecedor: string;
  nota_fiscal: string | null;
  data_compra: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number | null;
  observacao: string | null;
  created_at: string;
  tamanho_id?: string | null;
}

export interface CaixaFerramenta {
  id: string;
  empresa_id: string | null;
  codigo: string;
  codigo_num: number | null;
  nome: string;
  descricao: string | null;
  responsavel_id: string | null;
  localizacao: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CaixaFerramentaItem {
  id: string;
  caixa_id: string;
  ferramenta_id: string;
  quantidade: number;
  observacao: string | null;
  created_at: string;
  // Join fields
  ferramenta?: Item;
}

const opcoesBase = { staleTime: 60_000 };

export { useEmpresasQuery as useEmpresas } from "@/lib/empresa-context";

function getTabelaModulo(modulo: Modulo): "epis" | "uniformes" | "ferramentas" {
  if (modulo === "epi") return "epis";
  if (modulo === "uniforme") return "uniformes";
  return "ferramentas";
}

export function useItens(modulo: Modulo, empresaId: string, busca = "", ativo = true) {
  const tabela = getTabelaModulo(modulo);
  return useQuery({
    ...opcoesBase,
    queryKey: [tabela, empresaId, busca],
    enabled: ativo,
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from(tabela).select("*");
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        if (busca.trim()) q = q.or(`nome.ilike.%${buscaSegura(busca)}%,codigo_sku.ilike.%${buscaSegura(busca)}%`);
        return q;
      };
      return lerTodas<Item>(montar, (q) => q.order("nome").order("id"));
    },
  });
}

export function useProximoCodigo(modulo: Modulo) {
  // As the user requested "CX-0001" for toolboxes, but for normal items
  // it doesn't specify a format in Passo 3, we'll keep it simple or just return null
  // for manual entry if the user didn't request auto-code for normal items.
  // Actually, Passo 3 lists 'codigo_sku' as TEXT NOT NULL UNIQUE.
  return useQuery({
    ...opcoesBase,
    queryKey: ["proximo-codigo", modulo],
    queryFn: async () => {
      return 0; // Not strictly used for now as per Passo 3
    },
    enabled: false,
  });
}

export function useEmpregados(empresaId: string, apenasAtivos = false) {
  return useQuery({
    ...opcoesBase,
    queryKey: ["empregados", empresaId, apenasAtivos],
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from("empregados").select("*");
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        if (apenasAtivos) q = q.eq("ativo", true);
        return q;
      };
      const lista = await lerTodas<Empregado>(montar, (q) => q.order("nome").order("id"));
      // Com demissão vencida o empregado também conta como inativo, mesmo em registros antigos.
      return apenasAtivos ? lista.filter((e) => empregadoAtivo(e)) : lista;
    },
  });
}

export function useVeiculos(empresaId: string) {
  return useQuery({
    ...opcoesBase,
    queryKey: ["veiculos", empresaId],
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from("veiculos").select("*");
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        return q;
      };
      return lerTodas<Veiculo>(montar, (q) => q.order("placa").order("id"));
    },
  });
}

/** Sem limite, lê o histórico inteiro (decisão: nada de corte em 50 ou 1000 linhas). */
export function useMovimentacoes(modulo: Modulo, empresaId: string, limite?: number) {
  return useQuery({
    ...opcoesBase,
    queryKey: ["movimentacoes", modulo, empresaId, limite],
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from("movimentacoes").select("*").eq("modulo", modulo);
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        return q;
      };
      const ordenar = (q: ReturnType<typeof montar>) =>
        q.order("data_movimentacao", { ascending: false }).order("created_at", { ascending: false }).order("id");
      if (limite !== undefined) {
        const { data, error } = await ordenar(montar()).limit(limite);
        if (error) throw error;
        return (data ?? []) as Movimentacao[];
      }
      return lerTodas<Movimentacao>(montar, ordenar);
    },
  });
}

export function useOcorrencias(busca = "", modulo?: Modulo) {
  return useQuery({
    ...opcoesBase,
    queryKey: ["ocorrencias", modulo, busca],
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from("ocorrencias").select("*");
        if (modulo) {
          const tipo = { epi: "EPI", uniforme: "Uniforme", ferramenta: "Ferramenta", veiculo: "Veículo" }[modulo];
          q = q.eq("tipo_ocorrencia", tipo);
        }
        if (busca.trim()) {
          // A busca por nome do empregado exigiria um join; por ora procura na descrição e no responsável.
          q = q.or(`descricao_ocorrencia.ilike.%${buscaSegura(busca)}%,responsavel_registro.ilike.%${buscaSegura(busca)}%`);
        }
        return q;
      };
      return lerTodas<Ocorrencia>(montar, (q) => q.order("data", { ascending: false }).order("hora", { ascending: false }).order("id"));
    },
  });
}

export function useComprasUniformes(empresaId: string, busca = "", ativo = true) {
  return useQuery({
    ...opcoesBase,
    enabled: ativo,
    queryKey: ["compras_uniformes", empresaId, busca],
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from("compras_uniformes").select("*");
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        if (busca.trim()) {
          q = q.or(`fornecedor.ilike.%${buscaSegura(busca)}%,nota_fiscal.ilike.%${buscaSegura(busca)}%`);
        }
        return q;
      };
      return lerTodas<CompraUniforme>(montar, (q) => q.order("data_compra", { ascending: false }).order("id"));
    },
  });
}

// `ativo` falso: a consulta não roda (quem usa a tela só precisa das compras em parte dos casos, como a Entrega, que serve ao EPI e aos uniformes).
export function useComprasEpis(empresaId: string, busca = "", ativo = true) {
  return useQuery({
    ...opcoesBase,
    enabled: ativo,
    queryKey: ["compras_epis", empresaId, busca],
    queryFn: async () => {
      const montar = () => {
        let q = supabase.from("compras_epis").select("*");
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        if (busca.trim()) {
          q = q.or(`fornecedor.ilike.%${buscaSegura(busca)}%,nota_fiscal.ilike.%${buscaSegura(busca)}%`);
        }
        return q;
      };
      return lerTodas<CompraEpi>(montar, (q) => q.order("data_compra", { ascending: false }).order("id"));
    },
  });
}

export function useCaixasFerramentas(empresaId: string, busca = "") {
  return useQuery({
    ...opcoesBase,
    queryKey: ["caixas_ferramentas", empresaId, busca],
    queryFn: async () => {
      let q = supabase.from("caixas_ferramentas").select("*");
      if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
      if (busca.trim()) {
        q = q.ilike("codigo", `%${buscaSegura(busca)}%`);
      }
      // No máximo 100 caixas (CX-0001 a CX-0100): a lista vem inteira, sem cortar em PAGINA.
      const { data, error } = await q.order("codigo", { ascending: false }).limit(TOTAL_CAIXAS);
      if (error) throw error;
      return (data ?? []) as CaixaFerramenta[];
    },
  });
}

export function useCaixaItens(caixaId: string | null) {
  return useQuery({
    ...opcoesBase,
    queryKey: ["caixa_ferramenta_itens", caixaId],
    enabled: !!caixaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_ferramenta_itens")
        .select("*, ferramenta:ferramentas(*)")
        .eq("caixa_id", caixaId!);
      if (error) throw error;
      return (data ?? []) as CaixaFerramentaItem[];
    },
  });
}

/** Itens de todas as caixas: uma ferramenta só pode estar em uma delas. */
export function useTodosCaixaItens() {
  return useQuery({
    ...opcoesBase,
    queryKey: ["caixa_ferramenta_itens", "todos"],
    queryFn: async () => {
      return lerTodas<CaixaFerramentaItem>(() => supabase.from("caixa_ferramenta_itens").select("*"), (q) => q.order("id"));
    },
  });
}

export function useSalvarCaixa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      valores,
      itens,
    }: {
      id?: string;
      valores: Record<string, unknown>;
      itens: { ferramenta_id: string; quantidade: number; observacao: string }[];
    }) => {
      const { data, error } = await supabase.rpc("salvar_caixa" as never, {
        p_id: id ?? null, p_valores: valores, p_itens: itens,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      queryClient.invalidateQueries({ queryKey: ["caixas_ferramentas"] });
      queryClient.invalidateQueries({ queryKey: ["caixa_ferramenta_itens"] });
      toast.success("Caixa de ferramentas salva");
    },
    onError: (erro: Error) => toast.error("Erro ao salvar caixa", { description: mensagemHumana(erro) }),
  });
}

/** Saídas dos últimos 180 dias agrupadas por item, para calcular cobertura de estoque. */
export function useSaidasPorItem(modulo: Modulo, empresaId: string) {
  return useQuery({
    ...opcoesBase,
    queryKey: ["saidas-por-item", modulo, empresaId],
    queryFn: async () => {
      // Corte de 180 dias pela data de Brasília (a UTC adianta o dia à noite).
      const desde = hojeLocal(new Date(Date.now() - 180 * 86_400_000));
      const montar = () => {
        let q = supabase
          .from("movimentacoes")
          .select("item_id, quantidade")
          .eq("modulo", modulo)
          .eq("tipo_movimentacao", "Saida")
          .gte("data_movimentacao", desde);
        if (empresaId !== TODAS) q = q.eq("empresa_id", empresaId);
        return q;
      };
      const data = await lerTodas<{ item_id: string | null; quantidade: number | null }>(montar, (q) => q.order("id"));
      const mapa = new Map<string, number>();
      for (const linha of data) {
        if (!linha.item_id) continue;
        mapa.set(linha.item_id, (mapa.get(linha.item_id) ?? 0) + (linha.quantidade ?? 0));
      }
      return mapa;
    },
  });
}

type Tabela =
  | "epis"
  | "uniformes"
  | "ferramentas"
  | "empregados"
  | "veiculos"
  | "movimentacoes"
  | "empresas"
  | "ocorrencias"
  | "compras_uniformes"
  | "compras_epis"
  | "caixas_ferramentas"
  | "enderecamentos";

export function useSalvar(tabela: Tabela, chaves: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, valores }: { id?: string; valores: Record<string, unknown> }) => {
      if (id) {
        const { error } = await supabase
          .from(tabela)
          .update(valores as never)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tabela).insert(valores as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      for (const chave of chaves) queryClient.invalidateQueries({ queryKey: [chave] });
      toast.success("Registro salvo");
    },
    onError: (erro: Error) => toast.error("Não foi possível salvar", { description: mensagemHumana(erro) }),
  });
}

// `avisar: false` quando a tela mostra o próprio aviso (por exemplo, com o botão Desfazer).
export function useRegistrarMovimentacoesLote(chaves: string[], avisar = true) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (movimentacoes: Record<string, unknown>[]) => {
      const { error } = await supabase.from("movimentacoes").insert(movimentacoes as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      for (const chave of chaves) queryClient.invalidateQueries({ queryKey: [chave] });
      if (avisar) toast.success("Movimentação registrada com sucesso");
    },
    onError: (erro: Error) => toast.error("Falha ao registrar movimentação", { description: mensagemHumana(erro) }),
  });
}

export function useExcluir(tabela: Tabela, chaves: string[]) {
  const queryClient = useQueryClient();
  const atualizar = () => {
    queryClient.invalidateQueries();
    for (const chave of chaves) queryClient.invalidateQueries({ queryKey: [chave] });
  };
  return useMutation({
    // Guarda a linha inteira antes de apagar: é o que o botão Desfazer devolve (com o mesmo id).
    mutationFn: async (id: string) => {
      const { data: antes } = await supabase.from(tabela).select("*").eq("id", id).maybeSingle();
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;
      return antes as Record<string, unknown> | null;
    },
    onSuccess: (antes) => {
      atualizar();
      if (!antes) {
        toast.success("Registro excluído");
        return;
      }
      avisarComDesfazer("Registro excluído", { descricao: "Se havia registros ligados a ele, o Desfazer não os traz de volta." }, async () => {
        const { error } = await supabase.from(tabela).insert(antes as never);
        if (error) throw error;
        atualizar();
      });
    },
    onError: (erro: Error) =>
      toast.error("Não foi possível excluir", { description: mensagemHumana(erro) }),
  });
}
