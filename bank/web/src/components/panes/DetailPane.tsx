import { Alert, Badge, CloseButton, Divider, Group, Paper, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconGavel } from "@tabler/icons-react";
import { useRef } from "react";
import { bankRequest, prettyLoc, priceText, type ClassId, type Holder, type Item } from "../../data";
import { BuyPane } from "./BuyPane";
import { BuyCardPane } from "./BuyCardPane";
import { AuctionPane } from "./AuctionPane";
import { MarketWarningText } from "../texts/MarketWarningText";
import { CollapsibleLayout } from "../CollapsibleLayout";
import { StatPane } from "./StatPane";

interface Props {
  it: Item | null;
  canUse: boolean;
  cls: ClassId | null; // prices depend on the member's class
  qty: number; // how many are on the tab
  onAdd: (it: Item, el: HTMLElement) => void;
  onRemove: (it: Item) => void;
  onClose?: () => void; // wide screens: clear the selection
  bare?: boolean; // inside the details drawer, which has its own header
}

// One entry per character; their spots go in the tooltip.
function byChar(holders: Holder[]) {
  const m = new Map<string, Holder[]>();
  for (const h of holders) m.set(h.char, [...(m.get(h.char) ?? []), h]);
  return [...m];
}

const HolderBadges = ({ holders }: { holders: Holder[] }) => (
  <Group gap={6}>
    {byChar(holders).map(([char, spots]) => (
      <Tooltip key={char} multiline label={spots.map(h => <div key={h.loc}>{prettyLoc(h.loc)}{h.count > 1 ? ` · ×${h.count}` : ""}</div>)}>
        <Badge variant="default" size="lg" radius="sm" tt="none" fw={500} style={{ cursor: "help" }}>
          {char}{spots.length > 1 || spots.some(h => h.count > 1) ? <Text span c="dimmed" inherit> ×{spots.reduce((n, h) => n + h.count, 0)}</Text> : null}
        </Badge>
      </Tooltip>
    ))}
  </Group>
);
const count = (holders: Holder[]) => holders.reduce((n, h) => n + h.count, 0);

// The heading style every part of the details shares.
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Title order={3} fz="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>{children}</Title>
);

const Section = ({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <Stack gap={6}>
    <Group justify="space-between" wrap="nowrap">
      <SectionTitle>{title}</SectionTitle>
      {aside}
    </Group>
    {children}
  </Stack>
);

// The product page: everything about one item.
export function DetailPane({ it, canUse, cls, qty, onAdd, onRemove, onClose, bare }: Props) {
  const buy = useRef<HTMLDivElement>(null);
  if (!it) {
    return (
      <CollapsibleLayout id="details" title="Details">
        <Text c="dimmed" fz="sm" p="md">Click an item in the bank to see its stats, who holds it and Green prices. Double-click it to add it to your tab.</Text>
      </CollapsibleLayout>
    );
  }
  const req = bankRequest(it, cls);
  const inBank = it.holders.filter(h => !h.mq);
  const mq = it.holders.filter(h => h.mq);
  const auction = req.price.kind === "auction";
  const guild = req.price.kind === "ask" ? "Ask a banker" : priceText(req.price, 1);
  const priceCard = (
    <BuyCardPane ref={buy} tint={auction ? "auction" : "price"} title={auction ? "DKP auction" : "Guild price"}
      icon={auction && <IconGavel size={14} style={{ flex: "none" }} />}
      action={<BuyPane it={it} qty={qty} onAdd={() => buy.current && onAdd(it, buy.current)} onRemove={() => onRemove(it)} />}>
      {auction ? req.cost : guild}
    </BuyCardPane>
  );
  const cantUse = !canUse && (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} p="xs">
      Your character can't use this.
    </Alert>
  );
  const body = (
      <Stack gap="md" p={bare ? 0 : "md"}>
        <Paper withBorder p="sm" radius="md" style={{ background: "var(--surface-head)", boxShadow: "none" }}>
          <StatPane it={it} />
        </Paper>
        {priceCard}
        {cantUse}
        <Divider />
        {it.holders.length > 0 && (
          <Section title={`Bank location · ${count(it.holders)}`}>
            <HolderBadges holders={[...inBank, ...mq]} />
            {inBank.length === 0 && <Text fz="sm" c="dimmed">Held for multiquesting. Request it, and a banker will tell you how to set it up.</Text>}
          </Section>
        )}
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
