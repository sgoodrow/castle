import { Alert, Badge, Button, CloseButton, Divider, Group, Paper, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconArrowLeft } from "@tabler/icons-react";
import { prettyLoc, type Holder, type Item } from "../data";
import { AuctionChart, MarketWarning } from "./AuctionChart";
import { Pane } from "./Pane";
import { StatBlock } from "./StatBlock";

interface Props {
  it: Item | null;
  canUse: boolean;
  onBack?: () => void; // phones: details replace the list
  onClose?: () => void; // wide screens: clear the selection
}

// One entry per banker; their spots go in the tooltip.
function byChar(it: Item) {
  const m = new Map<string, Holder[]>();
  for (const h of it.holders) m.set(h.char, [...(m.get(h.char) ?? []), h]);
  return [...m];
}

const Section = ({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <Stack gap={6}>
    <Group justify="space-between" wrap="nowrap">
      <Title order={3} fz="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>{title}</Title>
      {aside}
    </Group>
    {children}
  </Stack>
);

// The product page: everything about one item.
export function DetailPane({ it, canUse, onBack, onClose }: Props) {
  if (!it) {
    return (
      <Pane id="details" title="Details">
        <Text c="dimmed" fz="sm" p="md">Click an item in the bank to see its stats, who holds it and Green prices. Double-click it to add it to your tab.</Text>
      </Pane>
    );
  }
  return (
    <Pane id="details" title="Details"
      actions={<CloseButton aria-label="Close details" onClick={onClose} style={{ visibility: onClose ? "visible" : "hidden" }} />}>
      <Stack gap="md" p="md">
        {onBack && <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={onBack} style={{ alignSelf: "flex-start" }}>Back to the bank</Button>}
        <Paper withBorder p="sm" radius="md" style={{ background: "var(--surface-head)", boxShadow: "none" }}>
          <StatBlock it={it} />
        </Paper>
        {!canUse && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} p="xs">
            Your character can't use this.
          </Alert>
        )}
        <Divider />
        <Section title={`Count · ${it.total}`}>
          <Group gap={6}>
            {byChar(it).map(([char, spots]) => (
              <Tooltip key={char} multiline label={spots.map(h => <div key={h.loc}>{prettyLoc(h.loc)}{h.count > 1 ? ` · ×${h.count}` : ""}</div>)}>
                <Badge variant="default" size="lg" radius="sm" tt="none" fw={500} style={{ cursor: "help" }}>
                  {char}{spots.length > 1 || spots[0].count > 1 ? <Text span c="dimmed" inherit> ×{spots.reduce((n, h) => n + h.count, 0)}</Text> : null}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        </Section>
        <Divider />
        <Section title="Market data" aside={<MarketWarning it={it} />}>
          <AuctionChart it={it} />
        </Section>
      </Stack>
    </Pane>
  );
}
