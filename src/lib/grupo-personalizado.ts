// Grupo de itens "personalizado" de um veículo ou equipamento (Associar itens de check list): "Personalizado · PLACA", ou "Avulso · Personalizado · PLACA"
// no check list avulso. É um grupo comum do cadastro de itens, mas a janela de associação o trata à parte: ele não aparece na lista de grupos de
// outros veículos ou equipamentos, é reaberto e editado no bloco "Personalizar itens" e os que sobram de edições antigas são removidos.
const PREFIXO_AVULSO = "Avulso · ";
const MARCA = "Personalizado · ";

export const nomeGrupoPersonalizado = (rotulo: string, avulso = false): string => `${avulso ? PREFIXO_AVULSO : ""}${MARCA}${rotulo}`;

export const ehGrupoPersonalizado = (nome: string): boolean => nome.startsWith(MARCA) || nome.startsWith(`${PREFIXO_AVULSO}${MARCA}`);

// Aceita também o sufixo " (2)", " (3)"... que versões antigas criavam a cada edição.
export const ehPersonalizadoDe = (nome: string, rotulo: string): boolean =>
  [false, true].some((avulso) => {
    const base = nomeGrupoPersonalizado(rotulo, avulso);
    return nome === base || (nome.startsWith(`${base} (`) && /^\(\d+\)$/.test(nome.slice(base.length + 1)));
  });
