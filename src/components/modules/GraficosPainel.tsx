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

export function QuadroGrafico({
  titulo,
  descricao,
  vazio,
  larga = false,
  altura = "h-[clamp(9rem,24vh,15rem)]",
  children,
}: {
  titulo: string;
  descricao?: string;
  vazio?: boolean;
  larga?: boolean;
  altura?: string;
  children: ReactNode;
}) {
  return (
    <figure className={`panel space-y-1 p-3 ${larga ? "lg:col-span-2" : ""}`}>
      <figcaption>
        <p className="text-sm font-semibold">{titulo}</p>
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
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
}: {
  dados: Record<string, string | number>[];
  categoria: string;
  series: SerieBarras[];
  empilhado?: boolean;
  cores?: string[];
  meta?: { valor: number; rotulo: string };
  sufixo?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
        <XAxis dataKey={categoria} tick={eixo} interval={0} tickLine={false} />
        <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} unit={sufixo} />
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
