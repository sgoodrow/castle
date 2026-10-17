import { Badge, Group, Stack, Text } from "@mantine/core";
import { NOW, SELLER_COLORS, WINDOW_DAYS, type Item } from "../data";

const VERDICT = {
  solid: <Badge color="green" variant="light">Steady market</Badge>,
  thin: <Badge color="yellow" variant="light">Thin data</Badge>,
  none: <Badge color="gray" variant="light">No sales in 6 months</Badge>,
};

// One dot per Green WTS listing over the last six months, colored by seller,
// so a single flipper relisting looks different from many sellers.
export function AuctionChart({ it }: { it: Item }) {
  const a = it.auc;
  if (!a.hasTracker) return <Text fz="sm" c="dimmed">The P99 wiki has no Green auction data for this item.</Text>;
  const W = 520, H = 170, L = 44, R = 10, T = 10, B = 26;
  const start = new Date(+NOW - WINDOW_DAYS * 864e5);
  const recent = a.recent;
  const order = [...a.sellers.entries()].sort((x, y) => y[1] - x[1]).map(x => x[0]);
  const color = (s: string) => SELLER_COLORS[order.indexOf(s) % SELLER_COLORS.length];
  const maxP = Math.max(10, ...recent.map(r => r.price));
  const step = Math.pow(10, Math.floor(Math.log10(maxP)));
  const top = Math.ceil(maxP / step) * step;
  const x = (d: Date) => L + (W - L - R) * ((+d - +start) / (+NOW - +start));
  const y = (p: number) => T + (H - T - B) * (1 - p / top);
  const months = Array.from({ length: 7 }, (_, m) => new Date(NOW.getFullYear(), NOW.getMonth() - m, 1)).filter(d => d >= start);
  const last = a.rows[0];
  const ago = last ? Math.round((+NOW - +last.d) / 864e5) : null;
  const prices = recent.map(r => r.price);

  return (
    <Stack gap="xs">
      <Group gap="xs" fz="sm">
        {VERDICT[a.level]}
        {recent.length ? (
          <>
            <Text span fz="sm"><b>{a.median}pp</b> median</Text>
            <Text span fz="sm" c="dimmed">· {Math.min(...prices)}–{Math.max(...prices)}pp</Text>
            <Text span fz="sm" c="dimmed">· {recent.length} listing{recent.length === 1 ? "" : "s"} from {a.sellers.size} seller{a.sellers.size === 1 ? "" : "s"}</Text>
            <Text span fz="sm" c="dimmed">· last seen {ago === 0 ? "today" : `${ago}d ago`}</Text>
          </>
        ) : (
          <Text span fz="sm" c="dimmed">{last ? `Last listed ${last.d.toISOString().slice(0, 10)} for ${last.price}pp` : "Never listed"}</Text>
        )}
      </Group>
      {recent.length > 0 && (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Green auction prices over the last six months" style={{ width: "100%", height: "auto", fontSize: 10 }}>
            {[0, 1, 2, 3, 4].map(i => {
              const v = (top * i) / 4, yy = y(v);
              return (
                <g key={i}>
                  <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="var(--mantine-color-default-border)" />
                  <text x={L - 6} y={yy + 3} textAnchor="end" fill="var(--mantine-color-dimmed)">{Math.round(v)}pp</text>
                </g>
              );
            })}
            {months.map(d => (
              <g key={+d}>
                <line x1={x(d)} x2={x(d)} y1={H - B} y2={H - B + 4} stroke="var(--mantine-color-dimmed)" />
                <text x={x(d)} y={H - 8} textAnchor="middle" fill="var(--mantine-color-dimmed)">{d.toLocaleString("en-US", { month: "short" })}</text>
              </g>
            ))}
            {a.median != null && <line x1={L} x2={W - R} y1={y(a.median)} y2={y(a.median)} stroke="var(--mantine-color-yellow-6)" strokeDasharray="3 4" />}
            {recent.map((r, i) => (
              <circle key={i} cx={x(r.d)} cy={y(r.price)} r={5} fill={color(r.seller)} stroke="var(--mantine-color-body)" strokeWidth={1.5}>
                <title>{`${r.d.toISOString().slice(0, 10)} · ${r.seller} · ${r.price}pp`}</title>
              </circle>
            ))}
          </svg>
          <Group gap="sm" fz="xs">
            {order.map(s => (
              <Group key={s} gap={6} wrap="nowrap">
                <span style={{ width: 10, height: 10, borderRadius: 5, background: color(s) }} />
                <span>{s} ×{a.sellers.get(s)}</span>
              </Group>
            ))}
          </Group>
        </>
      )}
      <Text fz="xs" c="dimmed">
        One dot per WTS listing. The wiki keeps only the last 20 listings
        {a.older ? `; ${a.older} older one${a.older === 1 ? " is" : "s are"} outside this 6-month window` : ""}.
      </Text>
    </Stack>
  );
}
