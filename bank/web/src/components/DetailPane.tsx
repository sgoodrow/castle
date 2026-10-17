import { Alert, Anchor, Button, Divider, Group, NumberInput, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconArrowLeft, IconExternalLink, IconShoppingBagPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { bankRequest, prettyLoc, type Item } from "../data";
import { AuctionChart } from "./AuctionChart";
import { StatBlock } from "./StatBlock";

interface Props {
  it: Item | null;
  cls: number;
  banker: string | null;
  inTab: number;
  canUse: boolean;
  onSetQty: (qty: number) => void;
  onBack?: () => void; // phones: details replace the list
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Stack gap={6}>
    <Title order={3} fz="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: "0.06em" }}>{title}</Title>
    {children}
  </Stack>
);

// The product page: everything about one item, and the button that puts it on the tab.
export function DetailPane({ it, cls, banker, inTab, canUse, onSetQty, onBack }: Props) {
  const [qty, setQty] = useState(1);
  useEffect(() => setQty(Math.max(1, inTab)), [it?.id, inTab]);

  if (!it) {
    return (
      <Paper withBorder p="md" radius="md">
        <Title order={2} fz="md" mb="xs">Details</Title>
        <Text c="dimmed" fz="sm">Pick an item from the bank to see its stats, who holds it, Green prices, and to add it to your tab.</Text>
      </Paper>
    );
  }
  const req = bankRequest(it, cls, banker);
  const forSale = req.text != null;
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        {onBack && <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={onBack} style={{ alignSelf: "flex-start" }}>Back to the bank</Button>}
        <StatBlock it={it} />
        {!canUse && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} p="xs">
            Your character can't use this.
          </Alert>
        )}
        <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-default-hover)">
          <Stack gap="xs">
            <Text fz="sm">{req.cost}</Text>
            {forSale ? (
              <Group gap="sm" align="flex-end">
                {it.total > 1 && <NumberInput label="Quantity" w={80} min={1} max={it.total} value={qty} onChange={v => setQty(Math.min(it.total, Math.max(1, Number(v) || 1)))} />}
                <Button w={130} leftSection={<IconShoppingBagPlus size={18} />} onClick={() => onSetQty(qty)} disabled={inTab === qty}>
                  {inTab ? (inTab === qty ? "On tab" : "Update tab") : "Add to tab"}
                </Button>
                <Button variant="subtle" color="red" onClick={() => onSetQty(0)} style={{ visibility: inTab > 0 ? "visible" : "hidden" }}>Remove</Button>
              </Group>
            ) : null}
            <Text fz="xs" c="dimmed">{it.total} in the bank</Text>
          </Stack>
        </Paper>
        <Divider />
        <Section title={`In the bank · ${it.total}`}>
          <Stack gap={2} fz="sm">
            {it.holders.map((h, i) => (
              <div key={i}>{h.char} <Text span c="dimmed" fz="sm">· {prettyLoc(h.loc)}{h.count > 1 ? ` · ×${h.count}` : ""}</Text></div>
            ))}
          </Stack>
        </Section>
        <Section title="Green auctions · last 6 months">
          <AuctionChart it={it} />
        </Section>
        {it.wiki && (
          <Anchor href={it.wiki} target="_blank" rel="noopener" fz="sm">
            <Group gap={4} component="span">Open on the P99 wiki <IconExternalLink size={14} /></Group>
          </Anchor>
        )}
      </Stack>
    </Paper>
  );
}
