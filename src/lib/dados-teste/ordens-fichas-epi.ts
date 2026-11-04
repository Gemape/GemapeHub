// Dados de teste de Parâmetros > EPI: 5 ordens de serviço (uma por função da oficina) e 5 fichas de EPI (uma por modelo do catálogo de teste), para a pessoa ver as telas
// Cadastrar Ordem de Serviço e Cadastrar Ficha de EPI com conteúdo. Gravados só no navegador, no modo demonstração; os ids levam o prefixo "teste-" para o Limpar tirá-los.
import { EPIS, PREFIXO } from "./conjunto.ts";

type Armazenamento = Pick<Storage, "getItem" | "setItem">;
type Linha = Record<string, unknown>;

export const CHAVE_ORDENS = "gemape-demo-ordens-servico-epi";
export const CHAVE_FICHAS = "gemape-demo-fichas-epi";

const lista = (...itens: string[]) => itens.map((i) => `● ${i}`).join("\n");

// As cinco funções da oficina (as mesmas áreas de Parâmetros Específicos). A primeira é o modelo enviado pelo responsável.
export const ORDENS_DE_TESTE = [
  {
    funcao: "Mecânico / montador",
    setor: "Oficina mecânica",
    objetivo: "Orientar o colaborador sobre os riscos inerentes à sua função, as medidas preventivas a serem adotadas e o uso correto dos Equipamentos de Proteção Individual (EPIs), visando a prevenção de acidentes e doenças ocupacionais.",
    atividades: "Realizar manutenção preventiva e corretiva em motores a gasolina e diesel, sistemas mecânicos, elétricos e hidráulicos de veículos e equipamentos. Desmontar, montar, ajustar e testar componentes. Utilizar ferramentas manuais e elétricas, equipamentos de diagnóstico e de elevação. Manusear óleos, graxas, combustíveis e outros produtos químicos.",
    riscos: lista(
      "Físicos: ruído excessivo, calor, vibração, umidade.",
      "Químicos: inalação de vapores de combustíveis, solventes, óleos, graxas; contato dérmico com óleos, graxas, combustíveis, desengraxantes.",
      "Acidentes: queda de objetos, queda do mesmo nível, esmagamento, prensamento, cortes, projeção de partículas, queimaduras, choque elétrico, incêndio/explosão.",
      "Ergonômicos: posturas inadequadas, levantamento e transporte manual de peso, movimentos repetitivos.",
    ),
    epis: lista(
      "Proteção auditiva: protetor auricular (plug ou concha), conforme avaliação de ruído.",
      "Proteção ocular/facial: óculos de segurança (com proteção lateral), protetor facial (para esmerilhamento, respingos).",
      "Proteção das mãos: luvas de proteção mecânica (para manuseio geral), luvas nitrílicas (para manuseio de óleos, graxas, combustíveis).",
      "Proteção do tronco: uniforme de trabalho.",
      "Proteção dos membros inferiores: botina de segurança com biqueira de aço e solado antiderrapante.",
      "Proteção respiratória: respirador semifacial com filtro para vapores orgânicos (para combustíveis, solventes, thinner), conforme FISPQ e avaliação.",
    ),
    condutasProibidas: lista(
      "Operar máquinas ou equipamentos sem treinamento e autorização.",
      "Remover ou desativar dispositivos de segurança de máquinas.",
      "Fumar ou usar fontes de ignição em áreas proibidas.",
      "Manusear produtos químicos sem os EPIs adequados.",
      "Realizar reparos em instalações elétricas sem qualificação e autorização.",
      "Permanecer sob cargas suspensas.",
      "Correr ou brincar na área de trabalho.",
      "Não comunicar acidentes, incidentes ou condições inseguras.",
    ),
    procedimentos: lista(
      "Realizar inspeção pré-uso de ferramentas e equipamentos.",
      "Utilizar os EPIs corretamente e mantê-los em bom estado de conservação.",
      "Manter a área de trabalho limpa e organizada.",
      "Desligar e travar equipamentos antes de qualquer intervenção (LOTO, se aplicável).",
      "Consultar a FISPQ dos produtos químicos antes do uso.",
      "Reportar imediatamente qualquer condição insegura, falha de equipamento ou acidente/incidente.",
      "Manter higiene pessoal rigorosa após contato com produtos químicos.",
    ),
    treinamentos: lista(
      "Treinamento de integração de segurança.",
      "Treinamento para uso e conservação de EPIs.",
      "Treinamento para manuseio seguro de produtos químicos (NR-26).",
      "Treinamento para operação segura de máquinas e equipamentos (NR-12).",
      "Treinamento para trabalho em altura (NR-35), se aplicável.",
    ),
  },
  {
    funcao: "Ajudante / lavador",
    setor: "Lavagem e pátio",
    objetivo: "Orientar o colaborador sobre os riscos da lavagem de veículos e equipamentos e da organização do pátio, as medidas preventivas e o uso correto dos EPIs.",
    atividades: "Lavar e higienizar veículos e equipamentos com lavadora de alta pressão, produtos desengraxantes e detergentes. Auxiliar os mecânicos na troca de peças, no transporte de materiais e na organização do pátio e das bancadas. Manobrar carrinhos e paletes, e descartar resíduos nos locais indicados.",
    riscos: lista(
      "Físicos: ruído da lavadora, umidade constante, frio e calor.",
      "Químicos: contato dérmico e respiratório com desengraxantes, detergentes e ácidos de limpeza.",
      "Acidentes: escorregões e quedas em piso molhado, jato de alta pressão, choque elétrico, cortes e esmagamento de mãos.",
      "Ergonômicos: levantamento de peso, posturas inadequadas e trabalho em pé por longos períodos.",
    ),
    epis: lista(
      "Proteção das mãos: luvas nitrílicas ou de PVC, de cano longo, para produtos químicos.",
      "Proteção dos pés: bota de borracha impermeável com solado antiderrapante.",
      "Proteção ocular/facial: óculos de segurança e protetor facial para o jato de alta pressão.",
      "Proteção auditiva: protetor auricular, conforme avaliação de ruído.",
      "Proteção do tronco: avental impermeável e uniforme de trabalho.",
    ),
    condutasProibidas: lista(
      "Apontar o jato de alta pressão para pessoas ou para instalações elétricas.",
      "Misturar produtos de limpeza sem orientação.",
      "Lavar equipamentos ligados ou com partes energizadas.",
      "Usar chinelo, sandália ou calçado aberto.",
      "Deixar mangueiras e fios atravessados no piso.",
    ),
    procedimentos: lista(
      "Conferir mangueiras, conexões e fios antes de ligar a lavadora.",
      "Sinalizar o piso molhado e mantê-lo drenado.",
      "Ler o rótulo e a FISPQ do produto antes de diluir.",
      "Guardar os produtos em recipientes identificados e fechados.",
      "Lavar as mãos e trocar a roupa molhada ao fim do turno.",
    ),
    treinamentos: lista(
      "Treinamento de integração de segurança.",
      "Treinamento para uso e conservação de EPIs.",
      "Treinamento para manuseio seguro de produtos químicos (NR-26).",
      "Orientação sobre a operação segura da lavadora de alta pressão.",
    ),
  },
  {
    funcao: "Pintor",
    setor: "Oficina de pintura",
    objetivo: "Orientar o colaborador sobre os riscos da preparação e da pintura de veículos e equipamentos, as medidas preventivas e o uso correto dos EPIs, em especial os respiratórios.",
    atividades: "Preparar superfícies (lixamento, massa e fundo), mascarar peças e aplicar tinta, verniz e primer com pistola na cabine de pintura. Misturar e dosar tintas e solventes, secar em estufa e polir. Limpar pistolas e equipamentos ao fim do uso.",
    riscos: lista(
      "Químicos: inalação de vapores e névoas de tintas, solventes e isocianatos; contato dérmico com tintas e thinner.",
      "Físicos: ruído do compressor e das lixadeiras, calor da estufa.",
      "Acidentes: incêndio e explosão por vapores inflamáveis, projeção de partículas, queimaduras e choque elétrico.",
      "Ergonômicos: posturas inadequadas e movimentos repetitivos na pintura e no polimento.",
    ),
    epis: lista(
      "Proteção respiratória: respirador semifacial com filtro combinado para vapores orgânicos e partículas.",
      "Proteção das mãos: luvas nitrílicas resistentes a solventes.",
      "Proteção ocular: óculos de ampla visão ou protetor facial.",
      "Proteção do corpo: macacão de proteção descartável, com capuz.",
      "Proteção auditiva: protetor auricular, nas lixadeiras e no compressor.",
      "Proteção dos pés: botina de segurança antiestática.",
    ),
    condutasProibidas: lista(
      "Pintar sem o respirador e sem o macacão de proteção.",
      "Fumar ou usar chama, faísca ou celular na área de pintura.",
      "Usar solvente para limpar a pele.",
      "Manter a cabine com o sistema de exaustão desligado.",
      "Armazenar tintas e solventes fora do armário ventilado e identificado.",
    ),
    procedimentos: lista(
      "Verificar o funcionamento da exaustão antes de cada pintura.",
      "Conferir a validade e a vedação do filtro do respirador e trocá-lo conforme a orientação.",
      "Consultar a FISPQ de tintas, solventes e catalisadores antes do uso.",
      "Manter na bancada apenas a quantidade de produto necessária ao serviço.",
      "Descartar panos, filtros e embalagens contaminadas em recipiente próprio.",
    ),
    treinamentos: lista(
      "Treinamento de integração de segurança.",
      "Treinamento para uso e conservação de EPIs, com teste de vedação do respirador.",
      "Treinamento para manuseio seguro de produtos químicos (NR-26).",
      "Programa de Proteção Respiratória.",
      "Treinamento de combate a princípio de incêndio.",
    ),
  },
  {
    funcao: "Serralheiro / soldador",
    setor: "Serralheria e solda",
    objetivo: "Orientar o colaborador sobre os riscos do corte, da solda e da conformação de metais, as medidas preventivas e o uso correto dos EPIs.",
    atividades: "Cortar, dobrar, furar e esmerilhar chapas, tubos e perfis metálicos. Soldar peças e estruturas pelos processos eletrodo revestido, MIG/MAG e oxicorte. Montar e reparar estruturas, grades e suportes, e conferir medidas e acabamento.",
    riscos: lista(
      "Físicos: radiações não ionizantes da solda, calor, ruído de esmerilhadeiras e de martelamento.",
      "Químicos: fumos metálicos e gases da solda; poeira de esmerilhamento.",
      "Acidentes: queimaduras, projeção de fagulhas e partículas, choque elétrico, incêndio e explosão de gases, cortes e esmagamento.",
      "Ergonômicos: posturas forçadas e levantamento de peças pesadas.",
    ),
    epis: lista(
      "Proteção ocular/facial: máscara de solda com escurecimento adequado e óculos de segurança por baixo.",
      "Proteção das mãos: luvas de raspa de couro de cano longo.",
      "Proteção do corpo: avental, mangotes e perneiras de raspa, ou jaleco de solda.",
      "Proteção respiratória: respirador com filtro para fumos metálicos.",
      "Proteção auditiva: protetor auricular.",
      "Proteção dos pés: botina de segurança com biqueira de aço e perneira.",
    ),
    condutasProibidas: lista(
      "Soldar ou cortar perto de materiais inflamáveis, sem isolar e sem extintor.",
      "Olhar o arco de solda sem a máscara.",
      "Usar o equipamento de solda com cabos desencapados ou conexões soltas.",
      "Usar esmerilhadeira sem o disco de proteção.",
      "Soldar tanques ou recipientes que continham combustível, sem liberação.",
    ),
    procedimentos: lista(
      "Inspecionar cabos, tochas, mangueiras, cilindros e válvulas antes do uso.",
      "Emitir e seguir a permissão de trabalho a quente, quando aplicável.",
      "Manter extintor à mão e a área ao redor livre de materiais combustíveis.",
      "Fixar e proteger os cilindros de gás, em pé e longe de fontes de calor.",
      "Aguardar o resfriamento e conferir o local antes de encerrar o serviço.",
    ),
    treinamentos: lista(
      "Treinamento de integração de segurança.",
      "Treinamento para uso e conservação de EPIs.",
      "Treinamento de trabalho a quente (NR-34, no que couber).",
      "Treinamento para operação segura de máquinas e equipamentos (NR-12).",
      "Treinamento de combate a princípio de incêndio.",
    ),
  },
  {
    funcao: "Auxiliar de serviços gerais",
    setor: "Serviços gerais",
    objetivo: "Orientar o colaborador sobre os riscos da limpeza, da conservação e do apoio às áreas da empresa, as medidas preventivas e o uso correto dos EPIs.",
    atividades: "Executar a limpeza e a conservação de oficina, pátio, escritórios, banheiros e áreas comuns. Recolher e separar os resíduos, repor materiais de limpeza, transportar pequenas cargas e apoiar as demais áreas em serviços simples.",
    riscos: lista(
      "Químicos: contato com saneantes, desinfetantes e produtos de limpeza; inalação de vapores.",
      "Biológicos: contato com resíduos e instalações sanitárias.",
      "Acidentes: escorregões, tropeços e quedas, perfurocortantes no lixo, choque elétrico em equipamentos de limpeza.",
      "Ergonômicos: levantamento e transporte de peso, posturas inadequadas e movimentos repetitivos.",
    ),
    epis: lista(
      "Proteção das mãos: luvas de borracha nitrílica de cano longo.",
      "Proteção dos pés: botina ou calçado fechado antiderrapante.",
      "Proteção ocular: óculos de segurança, na diluição e na limpeza com respingos.",
      "Proteção respiratória: máscara descartável, em ambientes com poeira ou vapores.",
      "Proteção do tronco: uniforme de trabalho.",
    ),
    condutasProibidas: lista(
      "Misturar produtos de limpeza, em especial os com cloro.",
      "Reaproveitar embalagens de alimentos para guardar produtos químicos.",
      "Recolher cacos, agulhas ou perfurocortantes com as mãos sem proteção.",
      "Deixar o piso molhado sem sinalização.",
      "Usar escadas e banquetas improvisadas.",
    ),
    procedimentos: lista(
      "Ler o rótulo do produto e diluir só como indicado.",
      "Sinalizar o piso molhado e as áreas em limpeza.",
      "Separar os resíduos e descartá-los nos locais identificados.",
      "Guardar os produtos de limpeza identificados e fechados, em local ventilado.",
      "Lavar as mãos após o uso das luvas e ao fim de cada tarefa.",
    ),
    treinamentos: lista(
      "Treinamento de integração de segurança.",
      "Treinamento para uso e conservação de EPIs.",
      "Orientação sobre produtos de limpeza e FISPQ (NR-26).",
      "Orientação de ergonomia no levantamento e no transporte de peso.",
    ),
  },
] as const;

// Texto da ficha de cada modelo do catálogo de teste, na ordem de EPIS: Botina, Luva, Capacete, Óculos e Protetor auricular.
const FICHAS: readonly Record<string, string>[] = [
  {
    setores: "Oficina mecânica, serralheria, lavagem e pátio, serviços gerais",
    finalidade: "Protege os pés contra impacto e queda de objetos, perfuração por pregos e cavacos, escorregões e contato com óleos e graxas.",
    instrucoes: "Calçar com a meia adequada, com a língua esticada, os cadarços apertados e o solado limpo; usar sempre fechada, do início ao fim da jornada.",
    verificacao: "Antes do uso, conferir a biqueira, o solado, as costuras e os cadarços; não usar com biqueira amassada, solado liso ou furo.",
    higienizacao: "Limpar com pano úmido e sabão neutro, secar à sombra e guardar em local arejado; remover óleo e graxa no mesmo dia.",
    descarte: "Trocar ao desgastar o solado ou a biqueira, ou após impacto forte, entregando a velha na troca e descartando como resíduo comum.",
    responsabilidades: "O empregado deve usar, guardar e conservar o EPI, comunicar o desgaste ou o defeito e devolvê-lo ao desligar-se, conforme a NR-6.",
  },
  {
    setores: "Oficina mecânica, lavagem e pátio, serviços gerais, pintura",
    finalidade: "Protege as mãos contra o contato com óleos, graxas, combustíveis, solventes e outros produtos químicos.",
    instrucoes: "Vestir com as mãos limpas e secas, sem anéis ou pulseiras; cobrir o punho da roupa e não reaproveitar luva rasgada.",
    verificacao: "Antes do uso, encher de ar ou esticar para procurar furos, rasgos e ressecamento; trocar ao menor dano.",
    higienizacao: "Lavar com água e sabão neutro após o uso, secar por fora e por dentro e guardar longe do sol e de produtos químicos.",
    descarte: "Trocar ao perfurar, ressecar ou perder o antiderrapante; descartar como resíduo contaminado quando estiver suja de químicos.",
    responsabilidades: "O empregado deve usar, guardar e conservar o EPI, comunicar o desgaste ou o defeito e devolvê-lo ao desligar-se, conforme a NR-6.",
  },
  {
    setores: "Oficina mecânica, serralheria e solda, pátio, obras e serviços externos",
    finalidade: "Protege a cabeça contra impacto de objetos, choque elétrico de baixa tensão e batidas em estruturas.",
    instrucoes: "Ajustar a carneira e a jugular ao tamanho da cabeça, usar sempre com a aba para a frente e nunca com o boné por baixo.",
    verificacao: "Antes do uso, procurar trincas, deformações e o desgaste da carneira; conferir a data de validade do casco.",
    higienizacao: "Lavar o casco com água e sabão neutro, sem solventes, e secar à sombra; trocar a carneira suja.",
    descarte: "Substituir após impacto forte, mesmo sem dano visível, ou ao vencer a validade, e inutilizar o casco antes de descartar.",
    responsabilidades: "O empregado deve usar, guardar e conservar o EPI, comunicar o desgaste ou o defeito e devolvê-lo ao desligar-se, conforme a NR-6.",
  },
  {
    setores: "Oficina mecânica, pintura, serralheria e solda, lavagem e pátio",
    finalidade: "Protege os olhos contra a projeção de partículas, respingos de óleo, produtos químicos e poeira.",
    instrucoes: "Ajustar firme e confortável ao rosto, sem folga lateral, e usar durante todo o serviço com risco, sobre o óculos de grau, se houver.",
    verificacao: "Antes do uso, procurar riscos, trincas e embaçamento permanente nas lentes e conferir o ajuste das hastes.",
    higienizacao: "Limpar a lente com água e sabão neutro e pano macio, sem papel áspero, e guardar em estojo, com a lente para cima.",
    descarte: "Trocar quando riscado, trincado ou sem o antiembaçante; descartar como resíduo comum.",
    responsabilidades: "O empregado deve usar, guardar e conservar o EPI, comunicar o desgaste ou o defeito e devolvê-lo ao desligar-se, conforme a NR-6.",
  },
  {
    setores: "Oficina mecânica, serralheria e solda, pintura, áreas com ruído acima de 85 dB(A)",
    finalidade: "Reduz a exposição ao ruído e previne a perda auditiva ocupacional.",
    instrucoes: "Posicionar as conchas sobre as orelhas, sem cabelos ou óculos de haste grossa no vedante, e ajustar a haste na cabeça.",
    verificacao: "Antes do uso, conferir as almofadas, a haste e as articulações; não usar com o vedante ressecado ou rachado.",
    higienizacao: "Limpar as almofadas com pano úmido e sabão neutro, secar e guardar longe de calor e de óleo.",
    descarte: "Trocar as almofadas ao ressecar e o conjunto ao quebrar a haste ou perder a vedação.",
    responsabilidades: "O empregado deve usar, guardar e conservar o EPI, comunicar o desgaste ou o defeito e devolvê-lo ao desligar-se, conforme a NR-6.",
  },
];

const lerLista = (storage: Armazenamento, chave: string): Linha[] => {
  try {
    const lido: unknown = JSON.parse(storage.getItem(chave) ?? "[]");
    return Array.isArray(lido) ? (lido as Linha[]) : [];
  } catch {
    return [];
  }
};

// Grava as cinco ordens e as cinco fichas, trocando só as de teste (o que o usuário cadastrou fica). As fichas vão para o primeiro EPI de cada modelo do catálogo de teste.
export function semearOrdensEFichasEpi(storage: Armazenamento, epis: readonly Linha[], agora: Date): void {
  const atualizadaEm = agora.toISOString();
  const ordens = lerLista(storage, CHAVE_ORDENS).filter((o) => !String(o["id"] ?? "").startsWith(PREFIXO));
  ORDENS_DE_TESTE.forEach((o, n) => ordens.push({ ...o, id: `${PREFIXO}ordem-servico-${n + 1}`, atualizadaEm }));
  storage.setItem(CHAVE_ORDENS, JSON.stringify(ordens));

  const fichas = lerLista(storage, CHAVE_FICHAS).filter((f) => !String(f["epiId"] ?? "").startsWith(PREFIXO));
  EPIS.forEach((modelo, n) => {
    const epi = epis.find((e) => e["nome"] === modelo.nome && String(e["id"] ?? "").startsWith(PREFIXO));
    const texto = FICHAS[n];
    if (epi && texto) fichas.push({ ...texto, epiId: String(epi["id"]), atualizadaEm });
  });
  storage.setItem(CHAVE_FICHAS, JSON.stringify(fichas));
}

// O Limpar tira as ordens de teste (pelo prefixo do id) e as fichas dos EPIs de teste; o que a pessoa cadastrou fica.
export function removerOrdensEFichasDeTeste(storage: Armazenamento): void {
  const ordens = lerLista(storage, CHAVE_ORDENS);
  if (storage.getItem(CHAVE_ORDENS) !== null) storage.setItem(CHAVE_ORDENS, JSON.stringify(ordens.filter((o) => !String(o["id"] ?? "").startsWith(PREFIXO))));
  const fichas = lerLista(storage, CHAVE_FICHAS);
  if (storage.getItem(CHAVE_FICHAS) !== null) storage.setItem(CHAVE_FICHAS, JSON.stringify(fichas.filter((f) => !String(f["epiId"] ?? "").startsWith(PREFIXO))));
}
