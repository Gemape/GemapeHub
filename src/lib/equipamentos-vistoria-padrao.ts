import type { GrupoPadrao } from "./equipamentos-manutencao-padrao.ts";

// Ações de vistoria já disponíveis para cada tipo de equipamento (lista fornecida pela Gemape): um grupo por rotina, valendo só para o tipo.
// Entram no check list de vistoria pelo botão "Cadastrar padrão".
export const GRUPOS_PADRAO_VISTORIA: readonly GrupoPadrao[] = [
  {
    tipoId: "tipo-extintores", nome: "Extintores: vistoria visual (semanal ou mensal)", itens: [
      "Acessibilidade: verificar se o acesso ao extintor está desobstruído e se a sinalização de parede e de piso está visível",
      "Integridade física: checar se o lacre plástico está intacto e se a mangueira de descarga não tem rachaduras nem entupimento por ninhos de insetos",
      "Indicador de pressão: verificar se o ponteiro do manômetro está firme na faixa verde (pressurizado)",
    ],
  },
  {
    tipoId: "tipo-extintores", nome: "Extintores: vistoria complexa (semestral)", itens: [
      "Pesagem (carga por gravidade): nos extintores de CO2, pesar o cilindro em balança de precisão e checar se houve perda de carga superior a 10% (o CO2 não tem manômetro)",
    ],
  },
  {
    tipoId: "tipo-compressor-de-ar", nome: "Compressor de ar: vistoria visual e operacional (diária ou semanal)", itens: [
      "Purgador: abrir manualmente o dreno inferior do pulmão de ar para purgar a água condensada acumulada",
      "Nível de óleo: checar no visor de vidro do cárter se o óleo está entre as marcas de mínimo e máximo",
      "Vazamentos lineares: escutar a rede de ar em busca de ruídos de vazamento em conexões, engates rápidos e registros",
    ],
  },
  {
    tipoId: "tipo-compressor-de-ar", nome: "Compressor de ar: vistoria técnica complexa (mensal ou trimestral)", itens: [
      "Teste de resposta da válvula: puxar a argola da válvula de segurança com o compressor pressurizado, para atestar o livre movimento do pistão interno e o alívio imediato do ar",
      "Ciclagem e pressostato: cronometrar a subida da pressão de zero até o desligamento automático, para identificar desgaste interno dos pistões (perda de rendimento)",
    ],
  },
  {
    tipoId: "tipo-jato-alta-pressao", nome: "Jato de alta pressão: vistoria visual (diária ou pré-uso)", itens: [
      "Isolamento elétrico: inspecionar todo o cabo elétrico em busca de cortes, esmagamentos ou fios expostos",
      "Mangueira de alta pressão: avaliar se há bolhas na borracha, deformações ou malha de aço interna aparente por atrito com o piso",
    ],
  },
  {
    tipoId: "tipo-jato-alta-pressao", nome: "Jato de alta pressão: vistoria complexa (mensal)", itens: [
      "Filtro de entrada: desmontar e inspecionar o filtro de tela de água, para identificar entupimento por areia ou lodo que causa cavitação na bomba",
      "Gatilho e desarme: testar o Stop Total (se houver), garantindo que o motor desliga ao soltar o gatilho da lança",
    ],
  },
  {
    tipoId: "tipo-serra-de-corte", nome: "Serra de corte: vistoria visual e mecânica (diária ou pré-uso)", itens: [
      "Dispositivos de emergência: testar o botão boca de sapo (emergência) antes de iniciar os cortes, para garantir o bloqueio elétrico imediato",
      "Coifas de proteção: verificar se as proteções móveis ou fixas cobrem toda a área da lâmina que não está em contato com a peça",
      "Dentes da lâmina: inspecionar o disco ou a fita em busca de dentes quebrados ou trincas na base da lâmina",
    ],
  },
  {
    tipoId: "tipo-serra-de-corte", nome: "Serra de corte: vistoria complexa (mensal)", itens: [
      "Esquadro e alinhamento: medir se a morsa de fixação e o braço de descida mantêm a perpendicularidade exata (90º), para evitar torção e quebra violenta da lâmina em operação",
    ],
  },
  {
    tipoId: "tipo-maquina-de-solda", nome: "Máquina de solda: vistoria visual (diária ou pré-uso)", itens: [
      "Cabos e conectores: inspecionar os cabos de solda (obra e positivo); verificar se os engates rápidos estão firmes, sem folgas, e se o isolamento de borracha não derreteu perto dos terminais",
      "Garras e tochas: checar o estado do porta-eletrodo ou dos bocais e difusores da tocha MIG/TIG",
    ],
  },
  {
    tipoId: "tipo-maquina-de-solda", nome: "Máquina de solda: vistoria complexa (mensal)", itens: [
      "Ventilação forçada: ligar o equipamento e avaliar se o cooler interno gira na rotação correta e sem ruído de rolamento travado",
      "Fuga de corrente: com multímetro/voltímetro, atestar que não há tensão residual (fuga) na carcaça metálica externa da máquina",
    ],
  },
  {
    tipoId: "tipo-empilhadeiras", nome: "Empilhadeiras: vistoria visual e operacional (diária, início de turno)", itens: [
      "Fluidos e vazamentos: olhar embaixo da máquina em busca de poças de óleo hidráulico, óleo de motor ou fluido de transmissão",
      "Painel e segurança: ligar a chave e testar buzina, giroflex, faróis e o alarme sonoro de ré",
      "Freio de serviço e de estacionamento: testar a retenção da máquina em rampa e a resposta do pedal de freio",
    ],
  },
  {
    tipoId: "tipo-empilhadeiras", nome: "Empilhadeiras: vistoria técnica complexa (mensal)", itens: [
      "Desgaste de garfos e correntes: medir com cálibre a perda de espessura do calcanhar do garfo (limite de 10% de desgaste) e inspecionar os elos das correntes de elevação quanto a alongamento ou trincas",
      "Folga de direção: avaliar o jogo mecânico do volante e das mangas de eixo traseiras com as rodas suspensas",
    ],
  },
  {
    tipoId: "tipo-munck", nome: "Munck: vistoria visual e operacional (diária ou pré-uso)", itens: [
      "Patolas estabilizadoras: estender totalmente as patolas e verificar se os cilindros de apoio descem firmes e sem vazamento nos retentores dos pistões",
      "Mangueiras da lança: olhar as mangueiras articuladas ao longo dos braços telescópicos em busca de atrito, óleo suando ou deformações",
    ],
  },
  {
    tipoId: "tipo-munck", nome: "Munck: vistoria técnica complexa (mensal ou bimestral)", itens: [
      "Fim de curso e limitadores: testar o limitador de momento de carga (se equipado), forçando uma condição simulada para ver se o sistema bloqueia movimentos perigosos",
      "Folga dos mancais e pinos: movimentar a lança vazia e observar estalos mecânicos ou folgas excessivas nos pinos principais de articulação e na mesa de giro",
    ],
  },
  {
    tipoId: "tipo-ponte-rolante", nome: "Ponte rolante: vistoria operacional e visual (semanal)", itens: [
      "Fim de curso superior e inferior: elevar o moitão sem carga até o topo, em velocidade reduzida, para testar se o sensor interrompe a subida antes de o moitão bater no tambor",
      "Botoeira ou controle remoto: verificar se todas as setas de direção respondem e se o botão de emergência trava instantaneamente todos os movimentos da ponte",
    ],
  },
  {
    tipoId: "tipo-ponte-rolante", nome: "Ponte rolante: vistoria técnica complexa (mensal ou semestral)", itens: [
      "Fios partidos do cabo de aço: inspecionar o cabo por amostragem de trecho (6 a 30 vezes o diâmetro) contando fios rompidos; acima do limite da norma ISO 4309, interditar o equipamento",
      "Desgaste do freio de içamento: suspender uma carga padrão próxima ao limite nominal a cerca de 30 cm do chão, desligar o comando e observar se há escorregamento (descida lenta involuntária), sinal de desgaste das pastilhas do freio do motor",
    ],
  },
];
