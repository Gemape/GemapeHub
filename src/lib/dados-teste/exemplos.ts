// Registro de exemplo para os formulários de cadastro novo abrirem "já preenchidos" no modo demonstração (2.8). É um quarto registro fictício: nunca é
// gravado sozinho, e código, placa, CPF, CNPJ e patrimônio saem diferentes dos que já existem, para o usuário poder salvar sem erro de duplicidade.
// Quem usa confere o modo demonstração (`import.meta.env.VITE_DEMO_MODE !== "false"`) no ponto de uso, para este arquivo sair do sistema de produção; só
// `ehExemplo` (em exemplo-id.ts, sem dados) é importado sem conferência.
import { gerarCnpj, gerarCpf } from "./documentos.ts";
import { ID_EXEMPLO } from "./exemplo-id.ts";
import { EQUIPAMENTOS } from "./conjunto.ts";
import { normalizarEquipamento } from "../equipamentos.ts";
import { lerParametrosEquipamento } from "../equipamentos-parametros.ts";
import { tamanhosAssociadosParaCadastro, unidadesAutorizadasDoProduto } from "../estoque-tamanho.ts";
import type { Estado } from "../questionario-despesas.ts";
import { ID_TIPO_DESPESA } from "../questionario-despesas.ts";
import { perguntasVisiveis, type Respostas } from "../questionario-respostas.ts";
import { estaAtivo, paraSelecao, type ParametrosBase } from "../parametros-base.ts";

// Os modelos de exemplo levam o prefixo ID_EXEMPLO no id: o formulário os trata como cadastro novo (não como "Clonar") e não apaga os campos únicos.
export { ehExemplo } from "./exemplo-id.ts";

const digitos = (t: unknown) => String(t ?? "").replace(/\D/g, "");

// Primeiro valor de `gerar(1)`, `gerar(2)`... que ainda não está entre os usados (comparando letras/números, sem pontuação).
function unico(usados: readonly unknown[], gerar: (n: number) => string): string {
  const ocupados = new Set(usados.map((u) => String(u ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase()));
  for (let n = 1; n < 10_000; n++) {
    const v = gerar(n);
    if (!ocupados.has(v.replace(/[^0-9A-Za-z]/g, "").toUpperCase())) return v;
  }
  return gerar(10_000);
}
const cnpjNovo = (usados: readonly unknown[]) => unico(usados.map(digitos), (n) => gerarCnpj(`9${String(n).padStart(7, "0")}0001`));
const cpfNovo = (usados: readonly unknown[]) => unico(usados.map(digitos), (n) => gerarCpf(`9${String(n).padStart(8, "0")}`));

export function exemploEmpresa(usados: { cnpj?: string | null }[]) {
  return {
    id: `${ID_EXEMPLO}empresa`, nome_fantasia: "Exemplo Máquinas", razao_social: "Exemplo Máquinas e Serviços Ltda", cnpj: cnpjNovo(usados.map((e) => e.cnpj)),
    rua: "Rua das Palmeiras", numero: "88", bairro: "Centro", cep: "38400-200", cidade: "Uberlândia", estado: "MG", status: "Ativa",
  };
}

export function exemploEmpregado(usados: { cpf?: string | null; matricula?: string | null }[], empresaId: string, agora = new Date()) {
  return {
    id: `${ID_EXEMPLO}empregado`, empresa_id: empresaId, nome: "Rafael Augusto Teixeira", cpf: cpfNovo(usados.map((e) => e.cpf)),
    matricula: unico(usados.map((e) => e.matricula), (n) => `L9P${n}`), email: "rafael.teixeira@exemplo.com.br",
    data_admissao: new Date(agora.getTime() - 400 * 86_400_000).toISOString().slice(0, 10), data_demissao: null,
  };
}

export function exemploFornecedor(usados: { cnpj?: string }[]) {
  return {
    id: `${ID_EXEMPLO}fornecedor`, codigo: "", razao_social: "Exemplo Suprimentos Industriais Ltda", nome_fantasia: "Exemplo Suprimentos", cnpj: cnpjNovo(usados.map((f) => f.cnpj)),
    rua: "Rua Quinze de Novembro", numero: "230", bairro: "Centro", cep: "13010-100", cidade: "Campinas", estado: "SP", pais: "Brasil",
    inscricao_estadual: "244.113.870.118", telefone: "(19) 3234-5678", contato: "Luciana Prado Ferreira", observacoes: "Fornecedor de exemplo; entrega em até 7 dias úteis.",
    categorias: ["cat-epi", "cat-ferramentas"],
  };
}

export function exemploCliente(usados: { cpf?: string; cnpj?: string }[]) {
  return {
    id: `${ID_EXEMPLO}cliente`, codigo: "", nome: "Fazenda Exemplo Agroindustrial Ltda", cpf: cpfNovo(usados.map((c) => c.cpf)), cnpj: cnpjNovo(usados.map((c) => c.cnpj)),
    endereco: "Rodovia BR-050, km 20, Zona Rural, Uberaba/MG", contato: "Paulo Henrique Rocha", telefone: "(34) 3312-4455", telefone2: "(34) 99811-2233",
    email: "contato@fazendaexemplo.exemplo.com.br", observacao: "Cliente de exemplo, atendido pela equipe de campo.",
  };
}

export function exemploEquipamento(usados: { patrimonio: string; numeroSerie: string }[], empresaId: string, agora = new Date()) {
  const base = EQUIPAMENTOS[1]!;
  const tipo = lerParametrosEquipamento().tipos.find((t) => t.id === base.tipoId);
  const dados = normalizarEquipamento({ ...base, empresaId, tecnico: { ...base.tecnico } }, { hoje: agora, tipo });
  return {
    ...dados, id: `${ID_EXEMPLO}equipamento`, criadoEm: agora.toISOString(), nome: "Compressor de Ar de Exemplo",
    patrimonio: unico(usados.map((e) => e.patrimonio), (n) => `PAT-9${String(n).padStart(3, "0")}`),
    numeroSerie: unico(usados.map((e) => e.numeroSerie), (n) => `EX-2024-${String(n).padStart(4, "0")}`),
  };
}

// EPI e uniforme: descrição nova (a do catálogo não se repete), primeira subcategoria que não exige tamanho (ou o primeiro tamanho autorizado dela) e a
// primeira unidade ativa. Sai no formato do catálogo, para o formulário abrir como "Clonar" sem apagar nada.
export function exemploCatalogo(
  modulo: "epi" | "uniforme", parametros: ParametrosBase, subcategorias: { id: string; nome: string }[], catalogo: { nome: string }[],
) {
  const doProduto = (s: { id: string; nome: string }) => ({ categoria: s.nome, subcategoria_id: s.id });
  const sub = subcategorias.find((s) => tamanhosAssociadosParaCadastro(parametros, modulo, doProduto(s)).length === 0) ?? subcategorias[0];
  if (!sub) return null;
  const tamanho = tamanhosAssociadosParaCadastro(parametros, modulo, doProduto(sub))[0] ?? null;
  const unidades = paraSelecao(parametros, unidadesAutorizadasDoProduto(parametros, modulo, doProduto(sub)));
  const unidade = unidades.find((u) => estaAtivo(parametros, u.id)) ?? unidades[0] ?? null;
  const usados = new Set(catalogo.map((c) => c.nome.toLocaleLowerCase("pt-BR")));
  const base = modulo === "epi" ? "Protetor Auricular Tipo Concha" : "Boné Operacional com Aba Curva";
  const nome = unico([...usados], (n) => (n === 1 ? base : `${base} ${n}`));
  return {
    id: `${ID_EXEMPLO}${modulo}`, codigo_sku: "", nome, categoria: sub.nome, subcategoria_id: sub.id, unidade_id: unidade?.id ?? null, unidade_medida: unidade?.nome ?? null,
    tamanho_id: tamanho?.id ?? null, estoque_minimo: 6, status: "Ativo",
  };
}

// Ferramenta: o código sai da geração normal ao salvar (nunca repete); grupo e tamanho são os da planilha de controle de ferramentas.
export function exemploFerramenta(categoria: string, marca: string) {
  return {
    id: `${ID_EXEMPLO}ferramenta`, codigo_sku: "", categoria_ferramenta: categoria, grupo_ferramenta: "Chave L", marca, modelo: "Cromada Reforçada", tamanho: "13",
    estoque_minimo: 3, unidade_medida: "Unidade", status: "Ativo", observacoes: "Ferramenta de exemplo para teste do cadastro.",
  };
}

// Veículo: placa (formato Mercosul) e RENAVAM que ainda não existem; o código sai da geração normal ao salvar.
export function exemploVeiculo(usados: { placa: string; renavam?: string | null }[], empresaId: string, marca: string, agora = new Date()) {
  return {
    id: `${ID_EXEMPLO}veiculo`, codigo_sku: "", tipo: "Utilitário", subcategoria_id: "sub-veiculos-utilitario", empresa_id: empresaId, marca, modelo: "Saveiro Robust", ano: 2024, cor: "Cinza",
    combustivel: "Flex", status: "Ativo", empregado_responsavel_id: null, quilometragem_atual: 8200, observacoes: "Veículo de exemplo para teste do cadastro.",
    placa: unico(usados.map((v) => v.placa), (n) => `EXA${n % 10}${"ABCDEFGHIJ"[Math.floor(n / 10) % 10]}${String(Math.floor(n / 100) % 100).padStart(2, "0")}`),
    renavam: unico(usados.map((v) => v.renavam), (n) => String(90_000_000_000 + n)),
    data_aquisicao: new Date(agora.getTime() - 200 * 86_400_000).toISOString().slice(0, 10), custo: 112000, numero_nota_fiscal: "NF-009001",
  };
}

// Caixa de ferramentas: o número (único) é o primeiro livre entre os habilitados, escolhido por quem usa.
export function exemploCaixa(empresaId: string) {
  return {
    id: `${ID_EXEMPLO}caixa`, empresa_id: empresaId, descricao: "Caixa de ferramentas de exemplo para a equipe de campo", localizacao: "Oficina — bancada 2", status: "Ativa",
  };
}

// Viagem (resposta do questionário de despesas): preenche, passada a passada, toda pergunta visível do tipo escolhido, menos o comprovante (foto) e a
// justificativa da ausência dele. Moeda "Dinheiro", para não pedir cartão nem vínculo com abastecimento; técnico da Oficina; data de hoje.
export function exemploViagem(estado: Estado, tipo: string, clientes: { codigo: string; nome: string }[], agora = new Date()): Respostas {
  const respostas: Respostas = { [ID_TIPO_DESPESA]: [tipo] };
  for (let passada = 0; passada < 6; passada++) {
    for (const p of perguntasVisiveis(estado, tipo, respostas)) {
      if (p.id in respostas || p.id === ID_TIPO_DESPESA || p.tipo === "upload" || p.titulo.startsWith("Justifique")) continue;
      const primeira = p.opcoes[0];
      if (p.habilitados) {
        const h = p.habilitados.find((x) => x.area === "Oficina") ?? p.habilitados[0];
        if (h) respostas[p.id] = [`${h.nome} (${h.area})`];
      } else if (p.tipo === "caixas") { if (primeira) respostas[p.id] = [primeira]; }
      else if (p.fonte === "municipios") respostas[p.id] = "Uberlândia";
      else if (p.id === "q-05") respostas[p.id] = "Minas Gerais - MG";
      else if (p.fonte === "clientes") { if (clientes[0]) respostas[p.id] = `${clientes[0].codigo} - ${clientes[0].nome}`; }
      else if (p.tipo === "lista") { if (primeira) respostas[p.id] = primeira; }
      else if (p.tipo === "data") respostas[p.id] = agora.toISOString().slice(0, 10);
      else if (p.tipo === "paragrafo") respostas[p.id] = "Despesa de exemplo para teste do formulário.";
      else if (p.tipo === "curta") respostas[p.id] = p.formato === "decimal2" ? "150,00" : "Exemplo";
    }
  }
  return respostas;
}
