// Base de conhecimento do GEMAPE Hub: tudo o que a Consulta rápida sabe dizer sobre o funcionamento do sistema.
// Para ensinar algo novo ou corrigir uma resposta, edite só este arquivo: cada verbete tem as palavras que o puxam (`chaves`), o texto e o link da tela.
// Palavras-chave: sem acento e em minúsculas; basta o início da palavra digitada ("entreg" acha "entrega", "entregar"). Frases de mais de uma palavra valem mais.
// Mantenha as respostas curtas e iguais ao que a tela faz; se a tela mudar, mude o verbete (um teste confere que os links apontam para telas que existem).
import type { LinkConsulta } from "./consulta-rapida.ts";

export type Verbete = { id: string; titulo: string; chaves: readonly string[]; resposta: string; links: readonly LinkConsulta[] };

export const CONHECIMENTO: readonly Verbete[] = [
  {
    id: "visao-geral", titulo: "O que é o GEMAPE Hub",
    chaves: ["o que e o sistema", "para que serve", "como funciona o sistema", "gemape hub", "modulos", "o que o sistema faz", "ajuda"],
    resposta: "O GEMAPE Hub controla o dia a dia de almoxarifado e frota: EPIs, uniformes, ferramentas, veículos, viagens e equipamentos, com os cadastros de empresas, empregados, fornecedores e clientes. Cada módulo tem uma rotina (estoque, entrega, termos, ocorrências) e seus parâmetros em Cadastros. A tela Início mostra os módulos em cartões e, no alto, o quadro “O que precisa da sua atenção hoje”.",
    links: [{ rotulo: "Início", url: "/inicio" }],
  },
  {
    id: "atencao-hoje", titulo: "Quadro “O que precisa da sua atenção hoje”",
    chaves: ["atencao hoje", "quadro de atencao", "alertas", "alerta", "pendencias", "o que precisa", "avisos"],
    resposta: "O quadro do Início junta as pendências por prioridade. Alta: EPIs vencidos com empregados, devoluções atrasadas de empregado desligado e equipamentos com manutenção atrasada ou ocorrência aberta. Média: EPI, uniforme e ferramenta no estoque mínimo ou abaixo, despesas de viagem sem relatório no prazo e empregados ativos sem nenhum EPI entregue. Cada cartão traz o botão que leva direto à tela para resolver. Cartão em zero significa que não há pendência.",
    links: [{ rotulo: "Início", url: "/inicio" }],
  },
  {
    id: "epi-entrega", titulo: "Entrega de EPI",
    chaves: ["entregar epi", "entrega de epi", "entrega epi", "dar epi", "fornecer epi", "epi para empregado", "como entregar"],
    resposta: "Em EPIs > Entrega EPI você escolhe a empresa e o empregado, seleciona os EPIs e quantidades e confirma: o sistema baixa do estoque e registra a saída para o empregado, que passa a constar em posse dele. O Termo de Entrega (aba própria) gera o documento para assinatura.",
    links: [{ rotulo: "Entrega EPI", url: "/epi", search: { aba: "entrega" } }, { rotulo: "Termo de Entrega", url: "/epi", search: { aba: "termo-entrega" } }],
  },
  {
    id: "epi-estoque", titulo: "Estoque e entrada de EPI",
    chaves: ["estoque de epi", "estoque epi", "entrada epi", "entrada no estoque", "nota fiscal", "xml", "compra de epi", "dar entrada", "abastecer estoque"],
    resposta: "A aba Estoque mostra o saldo de cada EPI (por tamanho, quando houver) e avisa o que está no mínimo. Para repor, use Entrada no Estoque: informe a nota fiscal ou importe o XML; o sistema reconhece o produto pelo Código de Fábrica cadastrado em Cadastros > Gerais (código do fornecedor e, no EPI, o CA da nota). Depois da entrada, o endereçamento diz onde guardar.",
    links: [{ rotulo: "Estoque de EPIs", url: "/epi", search: { aba: "estoque" } }, { rotulo: "Entrada no Estoque", url: "/epi", search: { aba: "compras" } }],
  },
  {
    id: "epi-cadastro", titulo: "Cadastrar EPI e ficha de EPI",
    chaves: ["cadastrar epi", "cadastro de epi", "ficha de epi", "ficha epi", "novo epi", "ordem de servico epi", "nr6", "nr 6"],
    resposta: "Cadastrar EPI: o código sai sozinho (ex.: EPI-0001), você escolhe a subcategoria, descreve o item, informa o estoque mínimo e a empresa. A Ficha de EPI guarda setores, finalidade e riscos, instruções de uso, verificação de eficácia, higienização, descarte e responsabilidades do empregado (NR-6). Há também o cadastro de Ordem de Serviço do EPI.",
    links: [{ rotulo: "Cadastrar EPI", url: "/epi-cadastrar" }, { rotulo: "Cadastrar Ficha de EPI", url: "/epi-ficha" }],
  },
  {
    id: "uniformes", titulo: "Uniformes",
    chaves: ["uniforme", "uniformes", "camiseta", "termo de baixa", "entrega de uniforme", "cadastrar uniforme"],
    resposta: "Uniformes funciona como EPIs, sem CA: Estoque, Entrada no Estoque, Entrega Uniforme, Termo de Entrega, Termo de Baixa e Ocorrências. O cadastro (código UNI-0001, subcategoria, descrição, estoque mínimo, preço de custo, marca, modelo e empresa) fica em Cadastros > Uniformes.",
    links: [{ rotulo: "Uniformes", url: "/uniformes" }, { rotulo: "Cadastrar Uniforme", url: "/uniformes-cadastrar" }],
  },
  {
    id: "ferramentas-entrega", titulo: "Entregar e devolver ferramenta",
    chaves: ["entregar ferramenta", "entrega de ferramenta", "devolver ferramenta", "devolucao de ferramenta", "termo de responsabilidade", "termo de encerramento", "ferramenta com empregado"],
    resposta: "Em Ferramentas > Entrega de ferramentas a saída vai para o empregado, com o Termo de Responsabilidade individual. Quando ele devolve (inclusive depois de desligado), o Termo de Encerramento registra a devolução e a unidade volta ao estoque uma única vez. Para saber quem está com uma ferramenta, pergunte aqui: “Quem está com a furadeira 04?”.",
    links: [{ rotulo: "Movimentações", url: "/ferramentas", search: { aba: "movimentacoes" } }, { rotulo: "Termo de encerramento", url: "/ferramentas", search: { aba: "termo-encerramento" } }],
  },
  {
    id: "ferramentas-caixas", titulo: "Caixas e portadores de ferramentas",
    chaves: ["caixa", "caixas", "portador", "portadores", "numero da caixa", "ferramentas por caixa", "habilitar caixa"],
    resposta: "As caixas de ferramentas são numeradas de 01 a 100; o Administrador marca quais ficam habilitadas (Cadastrar Caixa). Cada caixa tem um portador (empregado), com status ativa ou inativa e histórico. A aba Visualizar caixa mostra o conteúdo e Ferramentas por caixas lista o que há em cada uma.",
    links: [{ rotulo: "Visualizar caixa", url: "/ferramentas", search: { aba: "caixas" } }, { rotulo: "Ferramentas por caixas", url: "/ferramentas", search: { aba: "ferramentas-por-caixa" } }],
  },
  {
    id: "ferramentas-cadastro", titulo: "Cadastrar ferramenta",
    chaves: ["cadastrar ferramenta", "nova ferramenta", "cadastro de ferramenta", "modelo de ferramenta", "numero de serie", "patrimonio"],
    resposta: "Em Cadastros > Ferramentas informe categoria e grupo (vêm de Cadastros > Gerais), descrição, estoque mínimo, modelo, número de série (obrigatório), patrimônio e data de aquisição (opcionais), preço de custo e empresa. O código (FER-0001…) é gerado sozinho ao salvar e não é editável.",
    links: [{ rotulo: "Cadastrar Ferramenta", url: "/cadastros/ferramentas" }],
  },
  {
    id: "ferramentas-vistoria", titulo: "Vistoria periódica de ferramentas",
    chaves: ["vistoria de ferramenta", "vistoria periodica", "termo de vistoria", "vistoria"],
    resposta: "O Termo de vistoria periódica registra a conferência das ferramentas que estão com os empregados, para confirmar que continuam em bom estado e em posse de quem assinou.",
    links: [{ rotulo: "Termo de vistoria periódica", url: "/ferramentas", search: { aba: "termo-vistoria" } }],
  },
  {
    id: "relatorios-estoque", titulo: "Relatórios de EPI, uniforme e ferramenta",
    chaves: ["relatorio", "relatorios", "sugestao de compras", "historico do empregado", "baixas definitivas", "inventario", "contagem fisica", "monte sua consulta", "consulta personalizada"],
    resposta: "Cada módulo de estoque tem Relatórios: Sugestão de Compras (o que repor pelo mínimo), Histórico do empregado (tudo o que recebeu e devolveu), Baixas definitivas, Inventário (contagem física) e Monte sua consulta (você escolhe colunas e filtros). Ferramentas ainda tem Ferramentas por caixas.",
    links: [{ rotulo: "Relatórios de EPIs", url: "/epi", search: { aba: "sugestao-compras" } }, { rotulo: "Central de relatórios", url: "/relatorios" }],
  },
  {
    id: "estoque-minimo", titulo: "Estoque mínimo",
    chaves: ["estoque minimo", "minimo", "abaixo do minimo", "repor estoque", "reposicao"],
    resposta: "Cada item tem um estoque mínimo cadastrado. Quando o saldo fica igual ou abaixo dele, o item aparece no quadro de atenção do Início (EPI, uniforme e ferramenta têm cartões separados) e na Sugestão de Compras. Item sem mínimo cadastrado não gera alerta.",
    links: [{ rotulo: "Sugestão de Compras", url: "/epi", search: { aba: "sugestao-compras" } }],
  },
  {
    id: "veiculos", titulo: "Veículos",
    chaves: ["veiculo", "veiculos", "frota", "abastecimento de veiculo", "placa", "checklist de veiculo", "carro"],
    resposta: "Veículos tem Frota, Abastecimento, Manutenção, Ocorrências e Check list. O cadastro (código VEI-0001, placa, marca, modelo, ano, cor, combustível, empresa, RENAVAM, quilometragem, situação e responsável) fica em Cadastros > Veículos, junto com os parâmetros de manutenção, tipos de ocorrência e check list.",
    links: [{ rotulo: "Frota", url: "/veiculos", search: { aba: "frota" } }, { rotulo: "Cadastro de Veículos", url: "/cadastros/veiculos" }],
  },
  {
    id: "equipamentos", titulo: "Equipamentos",
    chaves: ["equipamento", "equipamentos", "empilhadeira", "compressor", "manutencao de equipamento", "ordem de servico", "ocorrencia de equipamento", "inventario de equipamentos"],
    resposta: "Equipamentos tem Inventário, Indicadores, Abastecimento, Manutenção, Ocorrências, Check list de Manutenção e Check list de vistoria. Ordem de serviço pendente ou em andamento com a data prevista vencida, e ocorrência ainda não encerrada, entram no quadro de atenção do Início.",
    links: [{ rotulo: "Inventário dos Equipamentos", url: "/equipamentos", search: { aba: "inventario" } }, { rotulo: "Manutenção", url: "/equipamentos", search: { aba: "manutencao" } }],
  },
  {
    id: "viagens", titulo: "Viagens e despesas",
    chaves: ["viagem", "viagens", "despesa", "despesas", "relatorio de despesas", "tecnico", "prestacao de contas", "questionario de despesas"],
    resposta: "Viagens tem Painel e Relatório. O técnico lança as despesas pelo questionário (configurado em Cadastros > Viagens) e depois elas entram num relatório de despesas. Despesa lançada há mais dias que o prazo e ainda fora de qualquer relatório aparece no quadro de atenção do Início, uma linha por técnico.",
    links: [{ rotulo: "Painel de Viagens", url: "/viagens", search: { aba: "painel" } }, { rotulo: "Relatório de despesas", url: "/viagens", search: { aba: "relatorio" } }],
  },
  {
    id: "ocorrencias", titulo: "Ocorrências",
    chaves: ["ocorrencia", "ocorrencias", "registrar ocorrencia", "incidente", "dano", "perda"],
    resposta: "Cada módulo tem a aba Ocorrências (EPI, uniforme, ferramenta, veículo e equipamento) para registrar perda, dano ou problema com um item, ligado ao empregado e ao item. No módulo de veículos e de equipamentos os tipos de ocorrência são cadastrados em Cadastros. Ocorrência de equipamento aberta vira alerta no Início.",
    links: [{ rotulo: "Ocorrências", url: "/ocorrencias" }],
  },
  {
    id: "empregados", titulo: "Empregados",
    chaves: ["empregado", "empregados", "funcionario", "demissao", "demitir", "desligar", "desligado", "matricula", "admissao", "cadastrar empregado"],
    resposta: "Em Empregados você cadastra nome, CPF, matrícula, empresa, e-mail, data de admissão e de demissão. Não há campo de cargo nem botão “ativo”: lançar a data de demissão inativa a pessoa sozinha e a leva para o bloco de desligados. O que ela ainda tiver em posse vira alerta de devolução atrasada. Só o Administrador exclui cadastros.",
    links: [{ rotulo: "Empregados", url: "/empregados" }],
  },
  {
    id: "empresas", titulo: "Empresas",
    chaves: ["empresa", "empresas", "cnpj", "razao social", "trocar de empresa", "filtro de empresa"],
    resposta: "Empresas guarda nome fantasia, razão social, CNPJ, endereço e status (ativa ou inativa). O seletor de empresa no cabeçalho filtra estoques, listas e esta consulta pela empresa escolhida (ou todas).",
    links: [{ rotulo: "Empresas", url: "/empresas" }],
  },
  {
    id: "fornecedores-clientes", titulo: "Fornecedores e clientes",
    chaves: ["fornecedor", "fornecedores", "cliente", "clientes", "cadastrar fornecedor"],
    resposta: "Fornecedores têm numeração automática, categorias (uma ou mais), razão social, nome fantasia, CNPJ, endereço, inscrição estadual, telefone, contato e observações; o cadastro é do Administrador. Os clientes têm o próprio cadastro no mesmo grupo.",
    links: [{ rotulo: "Fornecedores", url: "/cadastros/fornecedores" }, { rotulo: "Clientes", url: "/cadastros/clientes" }],
  },
  {
    id: "cadastros-gerais", titulo: "Cadastros > Gerais",
    chaves: ["gerais", "categoria", "categorias", "subcategoria", "subcategorias", "codigo do produto", "codigo de fabrica", "enderecamento", "tamanho", "tamanhos", "unidade de medida", "marca", "parametros"],
    resposta: "Gerais (só Administrador) alimenta todos os módulos, que nunca criam listas próprias: Categorias e Subcategorias de produto, Código do Produto (sigla e numeração de 4 dígitos, ex.: EPI-0001), Código de Fábrica (liga o código do fornecedor ao produto da GEMAPE, para importar o XML da nota), Endereçamento (rua, estante e prateleira onde o item é guardado) e Tamanho e Medidas (tamanhos, unidades e quais valem para cada categoria).",
    links: [{ rotulo: "Código do Produto", url: "/cadastros/gerais/codigo-produto" }, { rotulo: "Código de Fábrica", url: "/cadastros/gerais/codigo-fabrica" }, { rotulo: "Endereçamento", url: "/cadastros/gerais/enderecamento" }],
  },
  {
    id: "permissoes", titulo: "Perfis e permissões",
    chaves: ["permissao", "permissoes", "perfil", "perfis", "administrador", "usuario", "usuarios", "acesso", "nao consigo ver", "nao aparece", "rh"],
    resposta: "Há três perfis: Administrador (tudo, inclusive Cadastros > Gerais, fornecedores, caixas e Configurações), RH (empregados e empresas) e usuário simples (as rotinas dos módulos). Cartões e atalhos de telas que o seu perfil não pode abrir não aparecem. Se algo sumiu, peça ao Administrador para conferir suas permissões.",
    links: [{ rotulo: "Usuários e permissões", url: "/usuarios" }],
  },
  {
    id: "configuracoes", titulo: "Configurações",
    chaves: ["configuracao", "configuracoes", "aparencia", "tema", "seguranca", "notificacao", "notificacoes", "backup", "auditoria", "integracao", "integracoes", "api"],
    resposta: "Configurações abre em tela cheia, só para o Administrador, a partir do cartão do Início. Tem sete submenus: Aparência, Usuários e permissões, Segurança e sessão, Notificações, Integrações e API, Backup e manutenção e Logs de auditoria. Use “Retornar à tela inicial” para sair.",
    links: [{ rotulo: "Início", url: "/inicio" }],
  },
  {
    id: "dashboard", titulo: "Dashboard",
    chaves: ["dashboard", "painel", "indicadores", "graficos", "valor em estoque", "resumo"],
    resposta: "O Dashboard consolida por empresa os indicadores do estoque (como o valor em estoque, a partir do preço de custo cadastrado) e os alertas. Cada módulo também tem o próprio Dashboard ou Indicadores na primeira aba.",
    links: [{ rotulo: "Dashboard", url: "/dashboard" }],
  },
  {
    id: "modo-demonstracao", titulo: "Modo demonstração",
    chaves: ["demonstracao", "demo", "dados de teste", "dados ficticios", "dados de exemplo", "supabase", "onde ficam os dados", "salva onde"],
    resposta: "Sem o banco configurado, o sistema abre em modo demonstração: os dados são fictícios e ficam salvos só no navegador deste computador, então limpar os dados do navegador apaga tudo. Nada é gravado no banco real.",
    links: [],
  },
  {
    id: "navegacao", titulo: "Navegação, voltar e busca",
    chaves: ["voltar", "onde eu estava", "historico de navegacao", "ultimos registros", "relogio", "anterior e proximo", "proximo registro", "buscar empregado", "busca da tela inicial", "atalho", "atalhos", "sumario", "secoes"],
    resposta: "O botão “Voltar para …” no alto das telas internas leva à tela de onde você veio, na mesma aba e na mesma posição da rolagem. O relógio do cabeçalho lista os últimos 10 registros abertos (ficha de empregado, de EPI, veículo) para voltar a um deles em um clique. Na busca do Início, digite um nome, código ou “CA 12345” para ver os botões diretos (ver ficha, entregar EPI, devolver, ver saldo, dar entrada). Nas ocorrências, as setas Anterior e Próximo percorrem a lista filtrada. Em Configurações, as abas do topo deslizam até cada seção.",
    links: [{ rotulo: "Início", url: "/inicio" }],
  },
  {
    id: "consulta-rapida", titulo: "Consulta rápida",
    chaves: ["consulta rapida", "o que voce sabe", "o que posso perguntar", "exemplos de pergunta", "como perguntar"],
    resposta: "Eu respondo duas coisas sobre os seus dados: quem está com uma ferramenta (“Quem está com a furadeira 04?”) e o que vence (“Quais EPIs vencem essa semana?”, “uniformes que vencem em 15 dias”). E explico como o sistema funciona: pergunte, por exemplo, “como entregar EPI”, “o que é estoque mínimo” ou “como cadastrar ferramenta”.",
    links: [],
  },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const ARTIGOS = new Set(["a", "o", "as", "os", "um", "uma", "da", "do", "das", "dos", "de", "na", "no", "nas", "nos", "e", "em", "para", "pra", "que", "se", "eu", "faco", "fazer", "como", "qual", "quais"]);
const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);
const raiz = (p: string) => (p.length > 4 ? p.replace(/(?:s|es|ar|er|ir|ando|endo|indo|cao|coes)$/, "") : p);

// Nota do verbete para a pergunta: cada chave soma o número das suas palavras (frase vale mais) quando todas aparecem, e uma frase
// inteira presente na pergunta vale ainda mais. Palavras comuns ("como", "de", "para") não contam.
function nota(v: Verbete, pergunta: string, ws: string[]): number {
  let total = 0;
  for (const chave of v.chaves) {
    const partes = palavras(chave).filter((p) => !ARTIGOS.has(p));
    if (!partes.length) continue;
    if (partes.length > 1 && semAcento(pergunta).includes(semAcento(chave))) { total += partes.length * 3; continue; }
    if (partes.every((p) => ws.some((w) => w === p || raiz(w) === raiz(p)))) total += partes.length * 2;
  }
  return total;
}

// Melhor verbete para a pergunta, ou null quando nada combina o suficiente (então a Consulta rápida cai nas telas parecidas).
export function responderSobreSistema(pergunta: string): { texto: string; links: LinkConsulta[] } | null {
  const ws = palavras(pergunta).filter((p) => !ARTIGOS.has(p));
  if (!ws.length) return null;
  let melhor: { v: Verbete; n: number } | null = null;
  for (const v of CONHECIMENTO) {
    const n = nota(v, pergunta, ws);
    if (n > (melhor?.n ?? 0)) melhor = { v, n };
  }
  if (!melhor || melhor.n < 2) return null;
  return { texto: melhor.v.resposta, links: [...melhor.v.links] };
}
