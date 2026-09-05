import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * Composable line chart: <LineChart><Grid /><Line /><XAxis /><ChartTooltip /></LineChart>
 * Pure SVG, token-driven colors, animated clip-path reveal, pointer crosshair tooltip.
 */

export type ChartDatum = { date: Date } & Record<string, number | Date>;

type Margin = { top: number; right: number; bottom: number; left: number };
const DEFAULT_MARGIN: Margin = { top: 24, right: 24, bottom: 28, left: 40 };

type LineSpec = {
  dataKey: string;
  stroke: string;
  strokeWidth: number;
  fadeEdges: boolean;
  animate: boolean;
};

type ChartCtx = {
  data: ChartDatum[];
  width: number;
  height: number;
  margin: Margin;
  xDataKey: string;
  xOf: (d: ChartDatum) => number;
  yOf: (key: string, v: number) => number;
  yMax: number;
  lines: LineSpec[];
  hoverIndex: number | null;
  setHoverIndex: (i: number | null) => void;
  reducedMotion: boolean;
};

const Ctx = createContext<ChartCtx | null>(null);

function useChart(): ChartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Chart components must be rendered inside <LineChart>");
  return ctx;
}

/** Hook for custom children (e.g. annotations) that need live chart state. */
export function useLineChart(): ChartCtx {
  return useChart();
}

function niceCeil(v: number): number {
  if (v <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const rounded = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return rounded * pow;
}

function collectLines(children: ReactNode): LineSpec[] {
  const out: LineSpec[] = [];
  const walk = (node: ReactNode) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object" && "props" in node) {
      const el = node as { type: unknown; props: Record<string, unknown> };
      if (el.type === Line) {
        out.push({
          dataKey: String(el.props["dataKey"]),
          stroke: (el.props["stroke"] as string) ?? "var(--primary)",
          strokeWidth: (el.props["strokeWidth"] as number) ?? 2.5,
          fadeEdges: (el.props["fadeEdges"] as boolean) ?? true,
          animate: (el.props["animate"] as boolean) ?? true,
        });
        return;
      }
      if (el.props["children"]) walk(el.props["children"] as ReactNode);
    }
  };
  walk(children);
  return out;
}

export function LineChart({
  data,
  xDataKey = "date",
  margin,
  animationDuration = 1100,
  aspectRatio = "2 / 1",
  className = "",
  style,
  children,
}: {
  data: ChartDatum[];
  xDataKey?: string;
  margin?: Partial<Margin>;
  animationDuration?: number;
  aspectRatio?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 320 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const m = { ...DEFAULT_MARGIN, ...margin };

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0) {
        setSize((prev) =>
          Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
            ? { width: rect.width, height: rect.height }
            : prev,
        );
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const lines = useMemo(() => collectLines(children), [children]);
  const valueKeys = lines.map((l) => l.dataKey);

  const yMax = useMemo(() => {
    let max = 0;
    for (const d of data) {
      for (const k of valueKeys) {
        const v = Number(d[k] ?? 0);
        if (v > max) max = v;
      }
    }
    return niceCeil(max);
  }, [data, valueKeys]);

  const innerW = Math.max(10, size.width - m.left - m.right);
  const innerH = Math.max(10, size.height - m.top - m.bottom);
  const n = data.length;

  const xOf = (d: ChartDatum) => {
    const i = data.indexOf(d);
    return m.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  };
  const yOf = (_key: string, v: number) => m.top + innerH - (v / yMax) * innerH;

  function onMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (n === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const t = Math.min(Math.max((px - m.left) / (n <= 1 ? innerW : innerW), 0), 1);
    const i = n <= 1 ? 0 : Math.round(t * (n - 1));
    setHoverIndex(i);
  }

  return (
    <div
      ref={boxRef}
      className={`relative w-full ${className}`}
      style={{ aspectRatio, ...style }}
      role="figure"
      aria-label="Line chart of progress over time"
      onPointerLeave={() => setHoverIndex(null)}
    >
      <Ctx.Provider
        value={{
          data,
          width: size.width,
          height: size.height,
          margin: m,
          xDataKey,
          xOf,
          yOf,
          yMax,
          lines,
          hoverIndex,
          setHoverIndex,
          reducedMotion,
        }}
      >
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          className="block h-full w-full overflow-visible"
          onPointerMove={onMove}
          style={{ ["--chart-anim-ms" as string]: `${animationDuration}ms` }}
        >
          {children}
        </svg>
      </Ctx.Provider>
    </div>
  );
}

function linePath(ctx: ChartCtx, key: string): string {
  const pts = ctx.data.map(
    (d) => [ctx.xOf(d), ctx.yOf(key, Number(d[key] ?? 0))] as [number, number],
  );
  const first = pts[0];
  if (!first) return "";
  if (pts.length === 1) {
    const [x, y] = first;
    return `M ${x - 6} ${y} L ${x + 6} ${y}`;
  }
  // Catmull-Rom → bezier for a smooth natural curve.
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)] ?? first;
    const p1 = pts[i] ?? first;
    const p2 = pts[i + 1] ?? first;
    const p3 = pts[Math.min(pts.length - 1, i + 2)] ?? first;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function Line({
  dataKey,
  stroke = "var(--primary)",
  strokeWidth = 2.5,
  fadeEdges = true,
  animate = true,
}: {
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  fadeEdges?: boolean;
  animate?: boolean;
}) {
  const ctx = useChart();
  const d = linePath(ctx, dataKey);
  const gradId = `fade-${dataKey.replace(/[^a-z0-9]/gi, "")}`;
  const clipId = `reveal-${gradId}`;
  const innerW = ctx.width - ctx.margin.left - ctx.margin.right;
  const animateCls = animate && !ctx.reducedMotion ? "chart-line-reveal" : "";

  return (
    <g>
      <defs>
        {fadeEdges ? (
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={stroke} stopOpacity="0.15" />
            <stop offset="0.06" stopColor={stroke} stopOpacity="1" />
            <stop offset="0.94" stopColor={stroke} stopOpacity="1" />
            <stop offset="1" stopColor={stroke} stopOpacity="0.15" />
          </linearGradient>
        ) : null}
        <clipPath id={clipId}>
          <rect
            x={ctx.margin.left}
            y={0}
            width={innerW + ctx.margin.right}
            height={ctx.height}
            className={animateCls}
          />
        </clipPath>
      </defs>
      <g clipPath={animateCls ? `url(#${clipId})` : undefined}>
        <path
          d={d}
          fill="none"
          stroke={fadeEdges ? `url(#${gradId})` : stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {ctx.hoverIndex !== null && ctx.data[ctx.hoverIndex] ? (
        <circle
          cx={ctx.xOf(ctx.data[ctx.hoverIndex] as ChartDatum)}
          cy={ctx.yOf(dataKey, Number((ctx.data[ctx.hoverIndex] as ChartDatum)[dataKey] ?? 0))}
          r={5}
          fill="var(--background)"
          stroke={stroke}
          strokeWidth={2.5}
          style={{ pointerEvents: "none" }}
        />
      ) : null}
    </g>
  );
}

export function Grid({
  horizontal = true,
  vertical = false,
  numTicksRows = 5,
  stroke = "var(--border)",
  strokeDasharray = "4,4",
}: {
  horizontal?: boolean;
  vertical?: boolean;
  numTicksRows?: number;
  stroke?: string;
  strokeDasharray?: string;
}) {
  const ctx = useChart();
  const { margin: m, width, height, yMax } = ctx;
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  return (
    <g aria-hidden="true">
      {horizontal
        ? Array.from({ length: numTicksRows }, (_, i) => {
            const v = (yMax / (numTicksRows - 1)) * i;
            const y = m.top + innerH - (v / yMax) * innerH;
            return (
              <g key={`h-${i}`}>
                <line
                  x1={m.left}
                  x2={m.left + innerW}
                  y1={y}
                  y2={y}
                  stroke={stroke}
                  strokeDasharray={strokeDasharray}
                  strokeWidth={1}
                />
                <text
                  x={m.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={11}
                >
                  {Math.round(v)}
                </text>
              </g>
            );
          })
        : null}
      {vertical && ctx.data.length > 1
        ? ctx.data.map((d, i) => {
            const x = ctx.xOf(d);
            return (
              <line
                key={`v-${i}`}
                x1={x}
                x2={x}
                y1={m.top}
                y2={m.top + innerH}
                stroke={stroke}
                strokeDasharray={strokeDasharray}
                strokeWidth={1}
              />
            );
          })
        : null}
    </g>
  );
}

export function XAxis({ numTicks = 5, format }: { numTicks?: number; format?: (d: Date) => string }) {
  const ctx = useChart();
  const { data, margin: m, height, xDataKey } = ctx;
  const n = data.length;
  if (n === 0) return null;
  const fmt =
    format ?? ((d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  const indexes: number[] = [];
  const step = Math.max(1, Math.ceil((n - 1) / Math.max(1, numTicks - 1)));
  for (let i = 0; i < n; i += step) indexes.push(i);
  if (indexes[indexes.length - 1] !== n - 1) indexes.push(n - 1);
  return (
    <g aria-hidden="true">
      {indexes.map((i) => {
        const datum = data[i];
        if (!datum) return null;
        const x = ctx.xOf(datum);
        const raw = datum[xDataKey];
        const date = raw instanceof Date ? raw : new Date(String(raw));
        return (
          <text
            key={i}
            x={x}
            y={height - m.bottom + 18}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={11}
          >
            {fmt(date)}
          </text>
        );
      })}
    </g>
  );
}

export function ChartTooltip({
  content,
}: {
  content?: (point: ChartDatum, lines: LineSpec[]) => ReactNode;
}) {
  const ctx = useChart();
  const { hoverIndex, data, margin: m, height, lines } = ctx;
  if (hoverIndex === null || !data[hoverIndex]) return null;
  const point = data[hoverIndex];
  const x = ctx.xOf(point);
  const innerH = height - m.top - m.bottom;
  const flip = x > ctx.width - 190;
  const date = point.date instanceof Date ? point.date : new Date(String(point.date));

  return (
    <g style={{ pointerEvents: "none" }}>
      <line
        x1={x}
        x2={x}
        y1={m.top - 8}
        y2={m.top + innerH}
        stroke="var(--muted-foreground)"
        strokeOpacity={0.5}
        strokeWidth={1}
      />
      <foreignObject x={flip ? x - 188 : x + 12} y={m.top} width={176} height={120}>
        <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-popover-foreground">
            {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </p>
          {content
            ? content(point, lines)
            : lines.map((l) => (
                <p key={l.dataKey} className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: l.stroke }}
                    aria-hidden="true"
                  />
                  {l.dataKey}: {Number(point[l.dataKey] ?? 0)}
                </p>
              ))}
        </div>
      </foreignObject>
    </g>
  );
}
