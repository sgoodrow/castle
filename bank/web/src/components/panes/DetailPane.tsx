import { Alert, Badge, CloseButton, Divider, Group, Paper, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { bankRequest, prettyLoc, type Holder, type Item } from "../../data";
import { AuctionPane } from "./AuctionPane";
import { MarketWarningText } from "../texts/MarketWarningText";
import { CollapsibleLayout } from "../CollapsibleLayout";
import { StatPane } from "./StatPane";

interface Props {
  it: Item | null;
  canUse: boolean;
  onClose?: () => void; // wide screens: clear the selection
  bare?: boolean; // inside the details drawer, which has its own header
}

// One entry per banker; their spots go in the tooltip.
function byChar(it: Item) {
  const m = new Map<string, Holder[]>();
  for (const h of it.holders) m.set(h.char, [...(m.get(h.char) ?? []), h]);
  return [...m];
}

// Whether a spell only goes to DKP auction. The bankers' list doesn't depend on the member's class.
const isAuction = (it: Item) => {
  const req = bankRequest(it, null);
  return req.text != null && req.price.kind === "auction";
};

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
export function DetailPane({ it, canUse, onClose, bare }: Props) {
  if (!it) {
    return (
      <CollapsibleLayout id="details" title="Details">
        <Text c="dimmed" fz="sm" p="md">Click an item in the bank to see its stats, who holds it and Green prices. Double-click it to add it to your tab.</Text>
      </CollapsibleLayout>
    );
  }
  const body = (
      <Stack gap="md" p={bare ? 0 : "md"}>
        <Paper withBorder p="sm" radius="md" style={{ background: "var(--surface-head)", boxShadow: "none" }}>
          <StatPane it={it} />
        </Paper>
        {isAuction(it) && (
          <Alert color="yellow" variant="light" p="xs" title="DKP auction only">
            A banker starts a DKP auction for it.
          </Alert>
        )}
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
                  {char}{spots.length > 1 || spots.some(h => h.count > 1) ? <Text span c="dimmed" inherit> ×{spots.reduce((n, h) => n + h.count, 0)}</Text> : null}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        </Section>
        <Divider />
        <Section title="Market data" aside={<MarketWarningText it={it} />}>
          <AuctionPane it={it} />
        </Section>
      </Stack>
  );
  if (bare) return body;
  return (
    <CollapsibleLayout id="details" title="Details"
      actions={<CloseButton aria-label="Close details" onClick={onClose} style={{ visibility: onClose ? "visible" : "hidden" }} />}>
      {body}
    </CollapsibleLayout>
  );
}
