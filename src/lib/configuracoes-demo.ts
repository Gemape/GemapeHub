// Configurações do sistema no modo demonstração (só teste): aparência, segurança, notificações, integrações, backup e auditoria. Tudo fica no armazenamento
// do navegador (`gemape-demo-config`), nunca no Supabase. Só a aparência (tema, cores, fonte, densidade e ícone da aba) é aplicada de verdade na tela; o resto
// (senhas, 2FA, e-mail, WhatsApp, chaves, backup) é simulado. Quem usa confere o modo demonstração (`VITE_DEMO_MODE !== "false"`) no ponto de uso.

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const CHAVE_CONFIG = "gemape-demo-config";
export const EVENTO_CONFIG = "gemape-config";
// Sobe quando o formato muda: os dados são refeitos sozinhos.
export const VERSAO_CONFIG = 1;

// Onde fica o menu (a barra com logotipo, "Voltar ao início" e filtros). "cima" é como o sistema já é.
export type PosicaoMenu = "cima" | "esquerda" | "direita";
export const POSICOES_MENU: readonly { id: PosicaoMenu; nome: string }[] = [
  { id: "cima", nome: "Em cima" }, { id: "esquerda", nome: "Esquerda" }, { id: "direita", nome: "Direita" },
];
export type Tema = "claro" | "escuro" | "auto";
export type Densidade = "compacta" | "padrao" | "confortavel";
export type Canal = "app" | "email" | "whatsapp" | "slack";
export type Frequencia = "diario" | "semanal" | "mensal";

export const CANAIS: readonly { id: Canal; nome: string }[] = [
  { id: "app", nome: "No sistema (sininho)" },
  { id: "email", nome: "E-mail" },
  { id: "whatsapp", nome: "WhatsApp" },
  { id: "slack", nome: "Slack" },
];
export const ALERTAS: readonly { id: string; nome: string }[] = [
  { id: "estoque-baixo", nome: "Estoque abaixo do mínimo" },
  { id: "validade-epi", nome: "EPI ou certificado perto de vencer" },
  { id: "manutencao", nome: "Manutenção de veículo ou equipamento vencendo" },
  { id: "ocorrencia", nome: "Nova ocorrência ou prazo de tratativa" },
  { id: "documentos", nome: "Documento do veículo vencendo (licenciamento, seguro)" },
  { id: "viagem", nome: "Viagem aberta ou prestação de contas pendente" },
];

export type Token = { id: string; nome: string; prefixo: string; criadoEm: string; ativo: boolean };
export type Webhook = { id: string; url: string; evento: string; ativo: boolean };
export type Registro = { id: string; quando: string; quem: string; acao: string; detalhe: string; critica: boolean };

export type Config = {
  versao: number;
  aparencia: {
    tema: Tema; corPrimaria: string; corSecundaria: string; corMenu: string;
    logo: string | null; logoReduzido: string | null; favicon: string | null;
    densidade: Densidade; menu: PosicaoMenu; fonte: number;
  };
  usuarios: { inativos: string[]; escopo: Record<string, "todas" | string[]>; convites: { email: string; perfil: string; quando: string }[] };
  seguranca: {
    doisFatores: boolean; google: boolean; microsoft: boolean; sso: boolean;
    senhaMin: number; exigeNumero: boolean; exigeSimbolo: boolean; trocaDias: number; inatividadeMin: number;
    emailRecuperacao: string; bloquearAoDemitir: boolean; encerrarSessoesAoBloquear: boolean;
  };
  notificacoes: { alertas: Record<string, Record<Canal, boolean>>; resumo: Frequencia; emailAlertaImediato: boolean; destinos: Record<Exclude<Canal, "app">, string[]> };
  integracoes: { tokens: Token[]; webhooks: Webhook[]; backupAtivo: boolean; backupFrequencia: Frequencia; backupHora: string; ultimoBackup: string | null; manutencao: boolean };
  auditoria: Registro[];
};

// Cada canal aceita vários destinos. Configuração antiga guardava um texto só: vira lista de um item.
export function destinosLidos(bruto: unknown): Config["notificacoes"]["destinos"] {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const lista = (v: unknown): string[] => [...new Set((Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean))];
  return { email: lista(b["email"]), whatsapp: lista(b["whatsapp"]), slack: lista(b["slack"]) };
}

// Destino de cada canal de alerta. WhatsApp: número com DDD (10 a 13 dígitos, com ou sem +55). Slack: endereço do webhook de entrada ou um canal (#alertas).
export const whatsappValido = (t: string): boolean => /^\d{10,13}$/.test(t.replace(/\D/g, "")) && /^[\d\s()+.-]+$/.test(t);
export const slackValido = (t: string): boolean => /^https:\/\/hooks\.slack\.com\/\S+$/.test(t) || /^#[\w-]{1,80}$/.test(t);

// Tamanhos mínimos de senha que o Administrador pode escolher.
export const OPCOES_SENHA_MIN = [4, 6, 8] as const;
export const emailValido = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const CORES_PADRAO = { primaria: "#0A007C", secundaria: "#01073D", menu: "#0A007C" } as const;
export const TETO_IMAGEM = 300 * 1024;
const MAX_AUDITORIA = 300;

const agora = () => new Date().toISOString();
const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// Alguns registros fictícios para a tela de auditoria não abrir vazia.
function auditoriaInicial(): Registro[] {
  const base: [number, string, string, string, boolean][] = [
    [0.1, "Administrador Demo", "Permissões alteradas", "Perfil de Teste Usuário 2 mudou de Padrão para RH", true],
    [0.6, "Administrador Demo", "Registro excluído", "Veículo ABC-1D23 removido do cadastro (baixa)", true],
    [1.2, "Teste Usuário 1", "Configuração alterada", "Política de senha: mínimo de 8 caracteres", true],
    [2.5, "Administrador Demo", "Usuário desativado", "Teste Usuário 3 passou para inativo", true],
    [3.1, "Teste Usuário 2", "Exportação", "Relatório de estoque de EPIs exportado em CSV", false],
    [4.8, "Administrador Demo", "Chave de API criada", "Chave 'Automação n8n' criada", true],
    [6.4, "Administrador Demo", "Backup", "Backup completo gerado (JSON)", false],
  ];
  return base.map(([d, quem, acao, detalhe, critica], i) => ({ id: `ini-${i}`, quando: dias(d), quem, acao, detalhe, critica }));
}

export function configPadrao(): Config {
  const alertas: Record<string, Record<Canal, boolean>> = {};
  for (const a of ALERTAS) alertas[a.id] = { app: true, email: a.id === "estoque-baixo" || a.id === "manutencao", whatsapp: false, slack: false };
  return {
    versao: VERSAO_CONFIG,
    aparencia: { tema: "claro", corPrimaria: CORES_PADRAO.primaria, corSecundaria: CORES_PADRAO.secundaria, corMenu: CORES_PADRAO.menu, logo: null, logoReduzido: null, favicon: null, densidade: "padrao", menu: "cima", fonte: 100 },
    usuarios: { inativos: [], escopo: {}, convites: [] },
    seguranca: { doisFatores: false, google: false, microsoft: false, sso: false, senhaMin: 8, exigeNumero: true, exigeSimbolo: true, trocaDias: 90, inatividadeMin: 30, emailRecuperacao: "", bloquearAoDemitir: true, encerrarSessoesAoBloquear: true },
    notificacoes: { alertas, resumo: "diario", emailAlertaImediato: true, destinos: { email: [], whatsapp: [], slack: [] } },
    integracoes: { tokens: [], webhooks: [], backupAtivo: true, backupFrequencia: "diario", backupHora: "02:00", ultimoBackup: dias(0.4), manutencao: false },
    auditoria: auditoriaInicial(),
  };
}

// A tela relê a configuração a cada renderização: o resultado fica guardado enquanto o texto gravado não muda (logotipos e auditoria deixam o JSON grande).
let ultimoBruto: string | null = null;
let ultimaConfig: Config | null = null;
export function lerConfig(storage: Armazenamento): Config {
  try {
    const bruto = storage.getItem(CHAVE_CONFIG);
    if (bruto && bruto === ultimoBruto && ultimaConfig) return ultimaConfig;
    if (bruto) {
      const lido = JSON.parse(bruto) as Config;
      if (lido?.versao === VERSAO_CONFIG) {
        // Mescla com o padrão: campos novos em versões futuras não quebram dados antigos.
        const p = configPadrao();
        const mesclada: Config = { ...p, ...lido, aparencia: { ...p.aparencia, ...lido.aparencia }, seguranca: { ...p.seguranca, ...lido.seguranca }, usuarios: { ...p.usuarios, ...lido.usuarios }, notificacoes: { ...p.notificacoes, ...lido.notificacoes, alertas: { ...p.notificacoes.alertas, ...lido.notificacoes?.alertas }, destinos: destinosLidos(lido.notificacoes?.destinos) }, integracoes: { ...p.integracoes, ...lido.integracoes } };
        // Valor guardado fora das opções atuais (ex.: 12 de uma versão anterior) volta ao padrão.
        // "lateral", "superior" e "baixo" saíram: valor fora das posições atuais volta para em cima.
        if (!POSICOES_MENU.some((p) => p.id === mesclada.aparencia.menu)) mesclada.aparencia.menu = "cima";
        if (mesclada.aparencia.tema === "auto") mesclada.aparencia.tema = "claro"; // a opção automático saiu da tela
        if (!(OPCOES_SENHA_MIN as readonly number[]).includes(mesclada.seguranca.senhaMin)) mesclada.seguranca.senhaMin = p.seguranca.senhaMin;
        ultimoBruto = bruto;
        ultimaConfig = mesclada;
        return mesclada;
      }
    }
  } catch { /* armazenamento indisponível ou texto corrompido: volta ao padrão */ }
  return configPadrao();
}

// Devolve false quando o navegador não gravou (cota cheia ou armazenamento bloqueado): a tela lê de volta o que está gravado, então quem chama avisa o usuário.
export function salvarConfig(storage: Armazenamento, config: Config): boolean {
  let gravou = true;
  try { storage.setItem(CHAVE_CONFIG, JSON.stringify(config)); } catch { gravou = false; }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_CONFIG));
  return gravou;
}

export const restaurarConfig = (storage: Armazenamento): Config => {
  try { storage.removeItem(CHAVE_CONFIG); } catch { /* idem */ }
  const c = configPadrao();
  salvarConfig(storage, c);
  return c;
};

export function assinarConfig(aoMudar: () => void): () => void {
  window.addEventListener(EVENTO_CONFIG, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => { window.removeEventListener(EVENTO_CONFIG, aoMudar); window.removeEventListener("storage", aoMudar); };
}
export const fotografiaConfig = (storage: Armazenamento): string => { try { return storage.getItem(CHAVE_CONFIG) ?? ""; } catch { return ""; } };

// Anota uma ação na auditoria (as mais novas primeiro, até MAX_AUDITORIA).
export function comRegistro(config: Config, quem: string, acao: string, detalhe: string, critica = true): Config {
  const r: Registro = { id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, quando: agora(), quem, acao, detalhe, critica };
  return { ...config, auditoria: [r, ...config.auditoria].slice(0, MAX_AUDITORIA) };
}

// Desligamento de empregado: o que a configuração de segurança manda fazer fica anotado na auditoria.
// Neste teste os usuários não estão ligados aos empregados, então bloqueio e encerramento de sessões são simulados.
export const MOTIVOS_DESLIGAMENTO = ["Demissão sem justa causa", "Demissão por justa causa", "Pedido de demissão", "Término de contrato", "Outro"] as const;
export function comDesligamento(config: Config, quem: string, d: { nome: string; motivo: string; data: string; pendentes: number }): { config: Config; efeitos: string[] } {
  const efeitos: string[] = [];
  let c = comRegistro(config, quem, "Empregado desligado", `${d.nome}: ${d.motivo}, em ${d.data.split("-").reverse().join("/")}`);
  if (config.seguranca.bloquearAoDemitir) {
    efeitos.push("acesso ao sistema bloqueado");
    c = comRegistro(c, quem, "Acesso bloqueado", `${d.nome}: bloqueio imediato por desligamento`);
    if (config.seguranca.encerrarSessoesAoBloquear) {
      efeitos.push("sessões encerradas");
      c = comRegistro(c, quem, "Sessões encerradas", `${d.nome}: todas as sessões ativas derrubadas`);
    }
  }
  if (d.pendentes > 0) {
    efeitos.push(`alerta ao almoxarifado (${d.pendentes} ${d.pendentes === 1 ? "ferramenta pendente" : "ferramentas pendentes"})`);
    c = comRegistro(c, quem, "Alerta ao almoxarifado", `${d.nome}: ${d.pendentes} ${d.pendentes === 1 ? "ferramenta" : "ferramentas"} para recolher no Termo de Encerramento`);
  }
  return { config: c, efeitos };
}

// Bloqueio manual de um usuário, que vai e volta: bloqueia na hora (e derruba as sessões, se a configuração mandar) ou libera de novo.
// Usa a mesma lista de inativos da tela de Usuários, então os dois lugares sempre concordam.
export function comBloqueio(config: Config, quem: string, usuario: { id: string; nome: string }, bloquear: boolean): Config {
  const inativos = config.usuarios.inativos.filter((x) => x !== usuario.id);
  let c: Config = { ...config, usuarios: { ...config.usuarios, inativos: bloquear ? [...inativos, usuario.id] : inativos } };
  c = comRegistro(c, quem, bloquear ? "Usuário bloqueado" : "Usuário desbloqueado", usuario.nome);
  if (bloquear && config.seguranca.encerrarSessoesAoBloquear) c = comRegistro(c, quem, "Sessões encerradas", `${usuario.nome}: todas as sessões ativas derrubadas`);
  return c;
}

// ---- Aparência: único trecho que mexe no documento ----
const HEX = /^#[0-9a-f]{6}$/i;
export const corValida = (c: string): boolean => HEX.test(c);

const luminancia = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Tira do documento o que a aparência escolhida colocou (ao sair do sistema, a tela de login volta ao visual de marca).
export function limparAparencia(raiz: HTMLElement = document.documentElement): void {
  for (const p of ["--primary", "--primary-foreground", "--secondary", "--sidebar", "font-size"]) raiz.style.removeProperty(p);
  raiz.removeAttribute("data-densidade");
  raiz.removeAttribute("data-menu");
}

export function aplicarAparencia(a: Config["aparencia"], raiz: HTMLElement = document.documentElement, prefereEscuro = false): void {
  const escuro = a.tema === "escuro" || (a.tema === "auto" && prefereEscuro);
  raiz.classList.toggle("dark", escuro);
  const cor = (nome: string, valor: string, padrao: string) => {
    if (valor.toLowerCase() === padrao.toLowerCase() || !corValida(valor)) raiz.style.removeProperty(nome);
    else raiz.style.setProperty(nome, valor);
  };
  // Só troca a cor quando difere da cor da marca: assim o padrão (inclusive o modo escuro) fica exatamente como o CSS define.
  cor("--primary", a.corPrimaria, CORES_PADRAO.primaria);
  // Texto sobre a cor primária: claro ou escuro conforme a luminância, para cor clara (ex.: amarelo) não deixar botão ilegível.
  if (a.corPrimaria.toLowerCase() === CORES_PADRAO.primaria.toLowerCase() || !corValida(a.corPrimaria)) raiz.style.removeProperty("--primary-foreground");
  else raiz.style.setProperty("--primary-foreground", luminancia(a.corPrimaria) > 0.5 ? "#111111" : "#ffffff");
  cor("--secondary", a.corSecundaria, CORES_PADRAO.secundaria);
  cor("--sidebar", a.corMenu, CORES_PADRAO.menu);
  if (a.fonte === 100) raiz.style.removeProperty("font-size"); else raiz.style.fontSize = `${a.fonte}%`;
  if (a.menu === "cima") raiz.removeAttribute("data-menu"); else raiz.setAttribute("data-menu", a.menu);
  if (a.densidade === "padrao") raiz.removeAttribute("data-densidade"); else raiz.setAttribute("data-densidade", a.densidade);
  const icone = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icone) {
    if (!icone.dataset["original"]) icone.dataset["original"] = icone.href;
    icone.href = a.favicon ?? icone.dataset["original"] ?? icone.href;
  }
}

// Lê a configuração guardada e aplica; chamada ao abrir o sistema e a cada mudança (inclusive do tema automático, que segue o sistema operacional).
export function aplicarAparenciaSalva(): () => void {
  const m = window.matchMedia("(prefers-color-scheme: dark)");
  const aplicar = () => aplicarAparencia(lerConfig(localStorage).aparencia, document.documentElement, m.matches);
  aplicar();
  const fim = assinarConfig(aplicar);
  m.addEventListener("change", aplicar);
  return () => { fim(); m.removeEventListener("change", aplicar); limparAparencia(); };
}

// ---- Segurança ----
export type RegrasSenha = Pick<Config["seguranca"], "senhaMin" | "exigeNumero" | "exigeSimbolo">;
export function problemasDaSenha(senha: string, r: RegrasSenha): string[] {
  const p: string[] = [];
  if (senha.length < r.senhaMin) p.push(`Pelo menos ${r.senhaMin} caracteres`);
  if (r.exigeNumero && !/\d/.test(senha)) p.push("Pelo menos um número");
  if (r.exigeSimbolo && !/[^\p{L}\d\s]/u.test(senha)) p.push("Pelo menos um símbolo");
  return p;
}

// ---- Integrações ----
// Chave fictícia (aparece inteira só na hora de criar; depois só o início). Nada aqui autentica em lugar nenhum.
export function novaChave(): { chave: string; prefixo: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chave = `gmp_demo_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  return { chave, prefixo: `${chave.slice(0, 13)}…` };
}
export const urlDeWebhookValida = (u: string): boolean => { try { return new URL(u).protocol === "https:"; } catch { return false; } };

export const EVENTOS_WEBHOOK = ["ocorrencia.criada", "estoque.baixo", "manutencao.vencendo", "viagem.encerrada", "usuario.alterado"] as const;

// ---- Exportações ----
// Texto que começa com = + - @ viraria fórmula ao abrir no Excel: ganha um apóstrofo na frente.
const aspas = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
export function auditoriaEmCsv(linhas: readonly Registro[]): string {
  return ["Data;Quem;Ação;Detalhe;Crítica", ...linhas.map((r) => [r.quando, r.quem, r.acao, r.detalhe, r.critica ? "sim" : "não"].map(aspas).join(";"))].join("\r\n");
}
// Todos os dados de teste do navegador (chaves `gemape-demo-*`), para o backup completo em JSON.
export function copiaDosDadosDeTeste(storage: Pick<Storage, "length" | "key" | "getItem">): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k?.startsWith("gemape-demo-") || k === CHAVE_CONFIG) continue;
    const v = storage.getItem(k);
    try { saida[k] = v === null ? null : JSON.parse(v); } catch { saida[k] = v; }
  }
  return saida;
}
export function baixarArquivo(nome: string, conteudo: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob(["﻿" + conteudo], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}
