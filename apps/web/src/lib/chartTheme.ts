/** Цвета линий графиков — синхронно с :root --chart-* в index.css */
export const chartLineColors = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#7c3aed",
] as const;

export const chartStroke = {
  grid: "var(--border)",
  tick: "var(--muted-foreground)",
  tooltipBorder: "var(--border)",
  tooltipBg: "var(--card)",
} as const;

/** Плавные кривые и скруглённые концы линии (Recharts), как в дизайн-системе */
export const chartLineCurveProps = {
  type: "monotone" as const,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Только горизонтальные линии сетки, сплошные и лёгкие */
export const chartGridProps = {
  vertical: false,
  stroke: chartStroke.grid,
  strokeOpacity: 0.4,
} as const;
