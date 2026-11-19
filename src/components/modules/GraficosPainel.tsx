import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Tooltip as Balao, TooltipContent as BalaoConteudo, TooltipProvider as BalaoProvider, TooltipTrigger as BalaoGatilho } from "@/components/ui/tooltip";

// Peças dos relatórios gráficos (estilo painel de BI) que ficam abaixo dos cards (decisão 325): um quadro com título e comparações, e os gráficos de barras e de rosca.
export const COR_GRAFICO = {
  azul: "#3b2fc9",
  verde: "#059669",
  amarelo: "#f59e0b",
  vermelho: "#dc2626",
  cinza: "#94a3b8",
  roxo: "#7c3aed",
} as const;
export const COR_DA_FAIXA = {
  verde: COR_GRAFICO.verde,
  amarelo: COR_GRAFICO.amarelo,
  vermelho: COR_GRAFICO.vermelho,
} as const;

// Os resultados cabem numa tela só, sem rolar (decisão 332): o título fica só para leitor de tela, os quadros são baixos e a altura dos gráficos acompanha a da janela.
export function PainelGraficos({
  titulo = "Comparativos",
  colunas = 2,
  compacto = false,
  children,
}: {
  titulo?: string;
  colunas?: 2 | 3;
  // Dentro de uma coluna estreita: um gráfico embaixo do outro e só lado a lado quando a tela é larga (xl).
  compacto?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo}>
      <h2 className="sr-only">{titulo}</h2>
      <div className={`grid gap-3 ${compacto ? "xl:grid-cols-2" : colunas === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {children}
      </div>
    </section>
  );
}

// Altura dos gráficos nos quadros baixos (enxuto), igual nas telas que cabem numa janela só: Frota, Ferramentas e Equipamentos.
export const ALTURA_GRAFICO_COMPACTA = "h-[clamp(4.5rem,9.5vh,6rem)]";

export function QuadroGrafico({
  titulo,
  descricao,
  vazio,
  formula,
  formulaDetalhe,
  alerta,
  larga = false,
  altura = "h-[clamp(9rem,24vh,15rem)]",
  enxuto = false,
  children,
}: {
  titulo: string;
  descricao?: string;
  // Como o número do card é calculado, numa linha só; `formulaDetalhe` é a explicação completa, no balão ao passar o mouse.
  formula?: string;
  formulaDetalhe?: string;
  // Aviso ao gestor, em vermelho, quando o gráfico mostra algo fora do limite.
  alerta?: string;
  vazio?: boolean;
  larga?: boolean;
  altura?: string;
  // Quadro baixo: menos folga e a fórmula vai para a dica do quadro e o aviso fica em uma linha (texto inteiro na dica), para a lista caber na mesma tela.
  enxuto?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className={`panel ${enxuto ? "min-w-0 space-y-0.5 p-2" : "space-y-1 p-3"} ${larga ? "lg:col-span-2" : ""}`}>
      <figcaption>
        {enxuto && formula ? (
          <BalaoProvider delayDuration={100}>
            <Balao>
              <BalaoGatilho asChild>
                <p tabIndex={0} aria-label={`${titulo}. Fórmula: ${formula} ${formulaDetalhe ?? ""}`} className="cursor-help text-sm font-semibold">{titulo}</p>
              </BalaoGatilho>
              <BalaoConteudo className="max-w-xs"><strong>Fórmula:</strong> {formula} {formulaDetalhe}</BalaoConteudo>
            </Balao>
          </BalaoProvider>
        ) : (
          <p className="text-sm font-semibold">{titulo}</p>
        )}
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
        {formula && !enxuto && (
          <BalaoProvider delayDuration={100}>
            <Balao>
              <BalaoGatilho asChild>
                {/* Focável, para o balão abrir também com o teclado e com o toque. */}
                <p {...(formulaDetalhe ? { tabIndex: 0, "aria-label": `Fórmula: ${formula} ${formulaDetalhe}` } : {})} className={`text-xs text-muted-foreground ${formulaDetalhe ? "cursor-help" : ""}`}>
                  <strong className="font-medium text-foreground">Fórmula:</strong> {formula}
                </p>
              </BalaoGatilho>
              {formulaDetalhe && <BalaoConteudo className="max-w-xs">{formulaDetalhe}</BalaoConteudo>}
            </Balao>
          </BalaoProvider>
        )}
        {alerta && (
          <p role="alert" {...(enxuto ? { title: alerta } : {})} className={`flex items-start gap-1 text-xs font-semibold text-red-700 dark:text-red-300 ${enxuto ? "min-w-0" : ""}`}>
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span className={enxuto ? "line-clamp-2" : ""}>{alerta}</span>
          </p>
        )}
      </figcaption>
      {vazio ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sem dados para comparar.</p>
      ) : (
        <div className={`${altura} w-full`}>{children}</div>
      )}
    </figure>
  );
}

export type SerieBarras = { chave: string; nome: string; cor: string };
const eixo = { fontSize: 11, fill: "currentColor" } as const;

// Barras (colunas) comparando categorias: uma série por cor, lado a lado ou empilhadas. `cores` pinta cada categoria (uma série só); `meta` desenha a linha de referência.
export function GraficoBarras({
  dados,
  categoria,
  series,
  empilhado = false,
  cores,
  meta,
  sufixo = "",
  maximo,
}: {
  dados: Record<string, string | number>[];
  categoria: string;
  series: SerieBarras[];
  empilhado?: boolean;
  cores?: string[];
  meta?: { valor: number; rotulo: string };
  sufixo?: string;
  // Teto fixo do eixo (gráfico de 100%): sem ele o eixo se estica além dos 100%.
  maximo?: number;
}) {
  // Muitas categorias de nome longo (ex.: 18 patrimônios): o rótulo do eixo vai na diagonal, com altura pelo maior nome, para os textos não se sobreporem nem serem cortados.
  const maiorRotulo = Math.max(0, ...dados.map((d) => String(d[categoria] ?? "").length));
  const inclinar = dados.length > 6 && maiorRotulo > 5;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: inclinar ? 8 : -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
        <XAxis dataKey={categoria} tick={inclinar ? { ...eixo, textAnchor: "end" } : eixo} interval={0} tickLine={false} {...(inclinar ? { angle: -45, height: Math.min(96, 16 + Math.round(maiorRotulo * 4.4)) } : {})} />
        <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} unit={sufixo} {...(maximo !== undefined ? { domain: [0, maximo] as [number, number] } : {})} />
        <Tooltip
          formatter={(v) => `${Number(v).toLocaleString("pt-BR")}${sufixo}`}
          cursor={{ opacity: 0.12 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {meta && (
          <ReferenceLine
            y={meta.valor}
            stroke={COR_GRAFICO.verde}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{
              value: meta.rotulo,
              fontSize: 11,
              fill: COR_GRAFICO.verde,
              position: "insideTopRight",
            }}
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            name={s.nome}
            fill={s.cor}
            radius={empilhado ? 0 : [4, 4, 0, 0]}
            {...(empilhado ? { stackId: "pilha" } : {})}
            maxBarSize={44}
          >
            {cores &&
              series.length === 1 &&
              dados.map((_, i) => <Cell key={i} fill={cores[i] ?? s.cor} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Linha no tempo (tendência): um valor por categoria (mês); `formatar` escreve o valor no eixo e na dica; categoria sem valor deixa a linha com um vão.
export function GraficoLinha({
  dados,
  categoria,
  chave,
  nome,
  cor,
  formatar,
}: {
  dados: Record<string, string | number | null>[];
  categoria: string;
  chave: string;
  nome: string;
  cor: string;
  formatar: (n: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
        <XAxis dataKey={categoria} tick={eixo} interval={0} tickLine={false} />
        <YAxis tick={eixo} tickLine={false} axisLine={false} width={52} tickFormatter={formatar} />
        <Tooltip formatter={(v) => formatar(Number(v))} />
        <Line type="monotone" dataKey={chave} name={nome} stroke={cor} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Rosca com a parte de cada fatia no total.
export function GraficoRosca({ dados }: { dados: { nome: string; valor: number; cor: string }[] }) {
  const total = dados.reduce((t, d) => t + d.valor, 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={dados}
          dataKey="valor"
          nameKey="nome"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          label={({ value }) => (total ? `${Math.round((Number(value) / total) * 100)}%` : "")}
        >
          {dados.map((d) => (
            <Cell key={d.nome} fill={d.cor} />
          ))}
        </Pie>
        <Tooltip formatter={(v, nome) => [`${v} de ${total}`, String(nome)]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
