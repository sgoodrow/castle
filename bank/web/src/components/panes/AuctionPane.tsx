import { Group, Modal, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { NOW, type Item } from "../../data";


function stdev(xs: number[]) {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

type Row = { d: Date; price: number; seller: string };

const SVG = { role: "img", "aria-label": "Green auction listings over the last year", style: { width: "100%", height: "auto", fontSize: 10, display: "block" } } as const;

// Distinct, theme-safe colours; sellers past the tenth reuse them.
const SELLER_HUES = ["blue", "orange", "teal", "grape", "lime", "red", "cyan", "violet", "pink", "indigo"];
const YEAR = 365 * 864e5;

// Busiest seller first, so the main seller always gets the first colour.
function sellerColors(rows: Row[]) {
  const counts = new Map<string, number>();
  for (const q of rows) counts.set(q.seller, (counts.get(q.seller) || 0) + 1);
  const order = [...counts].sort((p, q) => q[1] - p[1]).map(([seller]) => seller);
  return (s: string) => `var(--mantine-color-${SELLER_HUES[order.indexOf(s) % SELLER_HUES.length]}-5)`;
}

// The last year of listings, on the same span for every item: when it sold, for how much,
// and by whom. Each seller gets their own colour, so one seller flooding the market is obvious.
function Timeline({ rows, median, big }: { rows: Row[]; median: number | null; big?: boolean }) {
  // Inline it is drawn at its real width, so dots stay dots in the narrow pane.
  const W = big ? 520 : 320, H = big ? 200 : 96, L = big ? 44 : 6, R = 6, T = 6, B = 16, r = big ? 4.5 : 3.5;
  const start = new Date(+NOW - YEAR);
  const shown = rows.filter(q => q.d >= start);
  const x = (d: Date) => L + (W - L - R) * ((+d - +start) / YEAR);
  const top = Math.max(10, ...shown.map(q => q.price)) * 1.05;
  const y = (p: number) => T + (H - T - B) * (1 - p / top);
  const color = sellerColors(shown);
  // Every listing sits at its exact date and price. Dots are see-through, so repeats overlay
  // and read darker rather than being nudged somewhere they didn't happen.
  const placed = [...shown].sort((p, o) => +p.d - +o.d).map(q => ({ q, cx: Math.min(W - R - r, Math.max(L + r, x(q.d))), cy: y(q.price) }));
  const months = Array.from({ length: 12 }, (_, m) => new Date(NOW.getFullYear(), NOW.getMonth() - 11 + m, 1)).filter(d => d >= start);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} {...SVG}>
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--mantine-color-default-border)" />
      {big && [0, 0.5, 1].map(f => <text key={f} x={L - 6} y={y(top / 1.05 * f) + 3} textAnchor="end" fill="var(--mantine-color-dimmed)">{Math.round(top / 1.05 * f)}pp</text>)}
      {months.map((d, i) => (
        <g key={+d}>
          <line x1={x(d)} x2={x(d)} y1={T} y2={H - B + 3} stroke="var(--mantine-color-default-border)" strokeDasharray={d.getMonth() === 0 ? undefined : "2 3"} />
          {(big || i % 2 === 1) && <text x={x(d)} y={H - 3} textAnchor="middle" fill="var(--mantine-color-dimmed)">{d.toLocaleString("en-US", { month: "short" })}</text>}
        </g>
      ))}
      {median != null && <line x1={L} x2={W - R} y1={y(median)} y2={y(median)} stroke="var(--mantine-color-yellow-6)" strokeDasharray="3 3" />}
      {placed.map(({ q, cx, cy }, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color(q.seller)} fillOpacity={0.55}>
          <title>{`${q.d.toISOString().slice(0, 10)} · ${q.price}pp · ${q.seller}`}</title>
        </circle>
      ))}
    </svg>
  );
}

// A year of Green WTS listings on a timeline; click it for a bigger copy.
export function AuctionPane({ it }: { it: Item }) {
  const a = it.auc;
  const [big, setBig] = useState(false);
  const last = a.latest;
  if (!a.hasTracker || !last) return <Text fz="sm" c="dimmed">None</Text>;
  const recent = a.recent;
  const prices = recent.map(r => r.price);
  const spread = recent.length
    ? <Text span fz="sm"><b>{a.median}pp</b> <Text span inherit c="dimmed">± {Math.round(stdev(prices))}pp</Text></Text>
    : <Text span fz="sm" c="dimmed">No sales in 6 months</Text>;
  const n = <Text span fz="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>N={recent.length}</Text>;

  return (
    <Stack gap="xs">
      <Group gap="xs" fz="sm" justify="space-between">
        {recent.length ? <>{spread}{n}</> : (
          <Text span fz="sm" c="dimmed">Last listed {last.d.toISOString().slice(0, 10)} for {last.price}pp</Text>
        )}
      </Group>
      {a.rows.some(q => +q.d >= +NOW - YEAR) && (
        <>
          <UnstyledButton aria-label="Show a bigger chart" onClick={() => setBig(true)} style={{ display: "block", width: "100%", cursor: "zoom-in" }}>
            <Timeline rows={a.rows} median={a.median} />
          </UnstyledButton>
          <Modal opened={big} onClose={() => setBig(false)} size={720} centered title={<Text fw={600} truncate>{it.name}</Text>}
            styles={{ content: { background: "var(--surface)" }, header: { background: "var(--surface)" } }}>
            <Group gap="md" wrap="nowrap" mb="xs">{spread}{n}</Group>
            <Timeline rows={a.rows} median={a.median} big />
          </Modal>
        </>
      )}
    </Stack>
  );
}
